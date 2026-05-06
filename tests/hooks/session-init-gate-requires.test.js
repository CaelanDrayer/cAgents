/**
 * Regression test for session-init-gate.cjs metadata.requires advisory check.
 * cAgents V11.1.10
 *
 * Verifies the v1 advisory gate for `metadata.requires` declared on agent SKILL.md
 * frontmatter. The hook MUST emit a systemMessage warning when a bin/env/file is
 * missing, but MUST NOT block the spawn (advisory only).
 *
 * Three cases:
 *   1. Missing bin -> warning emitted, continue:true (advisory only)
 *   2. All deps present -> no warning, continue:true
 *   3. No metadata.requires declared -> ignored, continue:true
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'session-init-gate.cjs');

function runHook(input, env = {}) {
  const inputStr = JSON.stringify(input).replace(/'/g, "'\\''");
  const result = execSync(
    `printf '%s' '${inputStr}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

/**
 * Build a minimal cAgents-shaped project at tmpDir with:
 *   - cagents-memory/sessions/<sessionId>/status.yaml (so session presence check passes)
 *   - <agentRelDir>/SKILL.md with the supplied frontmatter
 *   - .claude-plugin/plugin.json listing that SKILL.md
 */
function setupProject({ tmpDir, sessionId, agentRelDir, agentName, skillContent }) {
  // Session directory
  const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
  mkdirSync(sessionDir, { recursive: true });
  writeFileSync(
    join(sessionDir, 'status.yaml'),
    'phase: executing\ncreated_at: "2026-05-05T10:00:00Z"\n'
  );

  // Agent SKILL.md
  const agentDir = join(tmpDir, agentRelDir);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, 'SKILL.md'), skillContent);

  // Plugin manifest
  const pluginDir = join(tmpDir, '.claude-plugin');
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    join(pluginDir, 'plugin.json'),
    JSON.stringify({
      name: 'cagents-test',
      version: '0.0.0',
      agents: [`./${agentRelDir}/SKILL.md`]
    }, null, 2)
  );
}

describe('session-init-gate.cjs metadata.requires advisory (V11.1.10)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'cagents-test-sig-req-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('emits advisory warning when declared bin is missing', () => {
    const sessionId = 'run_test-req-missing_260505_001';
    const agentName = 'test-agent-needs-fakemissingbin';
    const skillContent = [
      '---',
      `name: ${agentName}`,
      'archetype: developer',
      'branch: backend',
      'description: "Test agent for missing-bin advisory"',
      'metadata:',
      '  tier: execution',
      '  requires:',
      '    bins:',
      '      - fakemissingbinxyz123',
      '    env: []',
      'allowed-tools: Read',
      '---',
      '# Test',
      ''
    ].join('\n');

    setupProject({
      tmpDir,
      sessionId,
      agentRelDir: `developer/test/${agentName}`,
      agentName,
      skillContent
    });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${agentName}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage.toLowerCase()).toContain('fakemissingbinxyz123');
    expect(result.systemMessage.toLowerCase()).toContain('missing');
    // Must NOT have set permissionDecision: deny
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('passes through cleanly when all declared deps are present', () => {
    const sessionId = 'run_test-req-allpresent_260505_002';
    const agentName = 'test-agent-needs-node';
    const skillContent = [
      '---',
      `name: ${agentName}`,
      'archetype: developer',
      'branch: backend',
      'description: "Test agent with present-only deps"',
      'metadata:',
      '  tier: execution',
      '  requires:',
      '    bins:',
      '      - node',
      '    env: []',
      'allowed-tools: Read',
      '---',
      '# Test',
      ''
    ].join('\n');

    setupProject({
      tmpDir,
      sessionId,
      agentRelDir: `developer/test/${agentName}`,
      agentName,
      skillContent
    });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${agentName}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    // No advisory message expected when all deps satisfied
    if (result.systemMessage) {
      expect(result.systemMessage.toLowerCase()).not.toContain('missing');
    }
  });

  it('ignores agents that do not declare metadata.requires', () => {
    const sessionId = 'run_test-req-norequires_260505_003';
    const agentName = 'test-agent-no-requires';
    const skillContent = [
      '---',
      `name: ${agentName}`,
      'archetype: developer',
      'branch: backend',
      'description: "Test agent without metadata.requires"',
      'metadata:',
      '  tier: execution',
      'allowed-tools: Read',
      '---',
      '# Test',
      ''
    ].join('\n');

    setupProject({
      tmpDir,
      sessionId,
      agentRelDir: `developer/test/${agentName}`,
      agentName,
      skillContent
    });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${agentName}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    // No advisory message expected — agent doesn't declare requires
    if (result.systemMessage) {
      expect(result.systemMessage.toLowerCase()).not.toContain('missing');
    }
  });
});

/**
 * REC-7: metadata.data_access_level advisory check (V12.0.6+)
 *
 * Verifies that session-init-gate.cjs emits an advisory systemMessage when
 * a `trusted` (or `verified`) parent agent spawns an `unverified` child,
 * but NEVER blocks the spawn (advisory only, mirrors v11.1.10 metadata.requires).
 *
 * Test matrix:
 *   1. trusted parent  -> unverified child  : warning emitted
 *   2. verified parent -> unverified child  : warning emitted
 *   3. trusted parent  -> trusted child     : no warning
 *   4. no data_access_level on either       : no warning (back-compat default)
 *   5. permissionDecision unchanged (advisory only — must never deny)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'session-init-gate.cjs');

function runHook(input, env = {}) {
  const inputStr = JSON.stringify(input).replace(/'/g, "'\\''");
  const result = execSync(
    `printf '%s' '${inputStr}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, ...env } }
  );
  return JSON.parse(result.trim());
}

/**
 * Build a project fixture with:
 *  - cagents-memory/sessions/<sessionId>/status.yaml
 *  - cagents-memory/sessions/<sessionId>/workflow/agent_tree.yaml (records the parent)
 *  - parent SKILL.md + child SKILL.md
 *  - .claude-plugin/plugin.json registering both
 */
function setupProject({ tmpDir, sessionId, parent, child }) {
  const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
  mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
  writeFileSync(
    join(sessionDir, 'status.yaml'),
    'phase: executing\ncreated_at: "2026-05-20T10:00:00Z"\n'
  );
  // Record parent in agent_tree.yaml (no stopped_at = still active)
  if (parent) {
    writeFileSync(
      join(sessionDir, 'workflow', 'agent_tree.yaml'),
      [
        'agents:',
        `  - agent_type: cagents:${parent.name}`,
        '    started_at: "2026-05-20T10:00:01Z"',
        ''
      ].join('\n')
    );
  }

  const agents = [];

  function writeAgent(agent) {
    const relDir = `developer/test/${agent.name}`;
    const agentDir = join(tmpDir, relDir);
    mkdirSync(agentDir, { recursive: true });
    const metaLines = ['metadata:', '  tier: execution'];
    if (agent.dataAccessLevel) {
      metaLines.push(`  data_access_level: ${agent.dataAccessLevel}`);
    }
    const skillContent = [
      '---',
      `name: ${agent.name}`,
      'archetype: developer',
      'branch: backend',
      `description: "Test agent ${agent.name}"`,
      ...metaLines,
      'allowed-tools: Read',
      '---',
      '# Test',
      ''
    ].join('\n');
    writeFileSync(join(agentDir, 'SKILL.md'), skillContent);
    agents.push(`./${relDir}/SKILL.md`);
  }

  if (parent) writeAgent(parent);
  writeAgent(child);

  const pluginDir = join(tmpDir, '.claude-plugin');
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    join(pluginDir, 'plugin.json'),
    JSON.stringify({ name: 'cagents-test', version: '0.0.0', agents }, null, 2)
  );
}

describe('REC-7: metadata.data_access_level advisory (V12.0.6)', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `cagents-dal-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('emits trust-downgrade warning when trusted parent spawns unverified child', () => {
    const sessionId = 'run_dal-trusted-unverified_260520_001';
    const parent = { name: 'dal-parent-trusted', dataAccessLevel: 'trusted' };
    const child = { name: 'dal-child-unverified', dataAccessLevel: 'unverified' };
    setupProject({ tmpDir, sessionId, parent, child });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${child.name}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage.toLowerCase()).toContain('trust-tier downgrade');
    expect(result.systemMessage).toContain(`cagents:${parent.name}`);
    expect(result.systemMessage).toContain(`cagents:${child.name}`);
    expect(result.systemMessage).toContain('trusted');
    expect(result.systemMessage).toContain('unverified');
    // Advisory only — must NOT deny
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('emits trust-downgrade warning when verified parent spawns unverified child', () => {
    const sessionId = 'run_dal-verified-unverified_260520_002';
    const parent = { name: 'dal-parent-verified', dataAccessLevel: 'verified' };
    const child = { name: 'dal-child-unverified2', dataAccessLevel: 'unverified' };
    setupProject({ tmpDir, sessionId, parent, child });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${child.name}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeDefined();
    expect(result.systemMessage.toLowerCase()).toContain('trust-tier downgrade');
    expect(result.systemMessage).toContain('verified');
    expect(result.systemMessage).toContain('unverified');
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('emits no warning when trusted parent spawns trusted child', () => {
    const sessionId = 'run_dal-trusted-trusted_260520_003';
    const parent = { name: 'dal-parent-trusted2', dataAccessLevel: 'trusted' };
    const child = { name: 'dal-child-trusted', dataAccessLevel: 'trusted' };
    setupProject({ tmpDir, sessionId, parent, child });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${child.name}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    if (result.systemMessage) {
      expect(result.systemMessage.toLowerCase()).not.toContain('trust-tier downgrade');
    }
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('emits no warning when neither agent declares data_access_level (back-compat)', () => {
    const sessionId = 'run_dal-neither_260520_004';
    const parent = { name: 'dal-parent-none' }; // no data_access_level
    const child = { name: 'dal-child-none' };
    setupProject({ tmpDir, sessionId, parent, child });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${child.name}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    if (result.systemMessage) {
      expect(result.systemMessage.toLowerCase()).not.toContain('trust-tier downgrade');
    }
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('emits no warning when child has no data_access_level even if parent is trusted', () => {
    const sessionId = 'run_dal-child-undeclared_260520_005';
    const parent = { name: 'dal-parent-trusted3', dataAccessLevel: 'trusted' };
    const child = { name: 'dal-child-undeclared' }; // no field — default behavior
    setupProject({ tmpDir, sessionId, parent, child });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${child.name}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    expect(result.continue).toBe(true);
    if (result.systemMessage) {
      expect(result.systemMessage.toLowerCase()).not.toContain('trust-tier downgrade');
    }
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('NEVER sets permissionDecision: deny across all scenarios', () => {
    // Exhaustive deny-check using the strongest downgrade case
    const sessionId = 'run_dal-deny-check_260520_006';
    const parent = { name: 'dal-deny-parent', dataAccessLevel: 'trusted' };
    const child = { name: 'dal-deny-child', dataAccessLevel: 'unverified' };
    setupProject({ tmpDir, sessionId, parent, child });

    const result = runHook(
      {
        tool_name: 'Agent',
        tool_input: { subagent_type: `cagents:${child.name}` },
        session_id: sessionId
      },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );

    // continue must be true; permissionDecision must not be deny under any branch
    expect(result.continue).toBe(true);
    expect(result.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });
});

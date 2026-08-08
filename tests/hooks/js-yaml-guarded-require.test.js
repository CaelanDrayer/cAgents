import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');

// ---------------------------------------------------------------------------
// WI-2 (run_improve-skills-hooks_260703_001): js-yaml guarded-require contract.
//
// js-yaml is the sole declared external runtime dependency of the hook system,
// but node_modules is git-ignored — a plugin install without `npm install`
// must NOT crash any hook at load time (run-hook.cjs's require(hookPath) is
// unwrapped, so a bare top-level require('js-yaml') throws before the
// createHook() factory's try/catch can help). Every hook that references
// js-yaml must therefore wrap the require in try/catch and degrade gracefully
// when the module is absent (mirroring team-stop.cjs's proven pattern).
// ---------------------------------------------------------------------------

/**
 * A require('js-yaml') occurrence is "guarded" when:
 *  - the require line itself opens a try block (single-line form:
 *      try { yaml = require('js-yaml'); } catch { yaml = null; }
 *    ), OR
 *  - one of the 3 preceding non-empty, non-comment lines opens a try block
 *    (multi-line form used by session-init-gate.cjs / post-write-validator.cjs).
 */
function isGuardedAt(lines, idx) {
  if (/\btry\b/.test(lines[idx])) return true;
  let seen = 0;
  for (let i = idx - 1; i >= 0 && seen < 3; i--) {
    const t = lines[i].trim();
    if (t === '' || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) continue;
    seen++;
    if (/\btry\s*\{/.test(t)) return true;
  }
  return false;
}

function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

describe('js-yaml guarded require — static contract (WI-2)', () => {
  const hookFiles = readdirSync(HOOKS_DIR).filter(f => f.endsWith('.cjs'));

  it('scans a hooks directory that includes both trackers', () => {
    expect(hookFiles).toContain('subagent-tracker.cjs');
    expect(hookFiles).toContain('subagent-stop-tracker.cjs');
  });

  it('both trackers actually reference js-yaml (meaningfulness guard)', () => {
    for (const f of ['subagent-tracker.cjs', 'subagent-stop-tracker.cjs']) {
      expect(readFileSync(join(HOOKS_DIR, f), 'utf8')).toContain("require('js-yaml')");
    }
  });

  it("every .claude/hooks/*.cjs referencing require('js-yaml') wraps it in try/catch", () => {
    const offenders = [];
    for (const f of hookFiles) {
      const content = readFileSync(join(HOOKS_DIR, f), 'utf8');
      if (!content.includes("require('js-yaml')")) continue;
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (!line.includes("require('js-yaml')")) return;
        if (isCommentLine(line)) return;
        if (!isGuardedAt(lines, idx)) offenders.push(`${f}:${idx + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Functional: invoking each tracker with js-yaml resolution BLOCKED must still
// emit valid single-JSON output on stdout ({continue: true} shape) and exit 0.
// Blocking approach: a --require preload that intercepts Module._resolveFilename
// and throws MODULE_NOT_FOUND for 'js-yaml' — simulating a plugin install
// without `npm install` (hook-utils.cjs itself does not use js-yaml).
// ---------------------------------------------------------------------------
describe('js-yaml guarded require — functional degradation (WI-2)', () => {
  const TEST_SESSION = 'act_wi2-yaml-guard_260703_001';
  let tmpRoot;
  let sessionDir;
  let preloadPath;

  const TREE_CONTENT = `# Agent Tree
agents:
  - id: agent-wi2-stop-1
    type: general-purpose
    parent: pipeline
    depth: 1
    spawned_at: '2026-07-03T10:00:00Z'
    stopped_at: null
`;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-wi2-guard-'));
    sessionDir = join(tmpRoot, 'cagents-memory', 'sessions', TEST_SESSION);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    mkdirSync(join(tmpRoot, 'cagents-memory', '_system', 'logs'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), 'phase: executing\npipeline_state: COORDINATED\n');
    preloadPath = join(tmpRoot, 'block-js-yaml.cjs');
    writeFileSync(preloadPath, [
      "const Module = require('module');",
      'const orig = Module._resolveFilename;',
      'Module._resolveFilename = function (request) {',
      "  if (request === 'js-yaml') {",
      '    const err = new Error("Cannot find module \'js-yaml\' (blocked by test)");',
      "    err.code = 'MODULE_NOT_FOUND';",
      '    throw err;',
      '  }',
      '  return orig.apply(this, arguments);',
      '};',
      '',
    ].join('\n'));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  function runBlocked(hookName, input) {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot };
    delete env.CAGENTS_ACTIVE_SESSION;
    return spawnSync('node', ['--require', preloadPath, join(HOOKS_DIR, hookName)], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      timeout: 8000,
      env,
    });
  }

  it('subagent-tracker.cjs degrades gracefully: exit 0, single {continue:true} JSON, audit log written, tree skipped', () => {
    const agentId = `agent_wi2start_${Date.now()}`;
    const result = runBlocked('subagent-tracker.cjs', {
      agent_type: 'cagents:backend-developer',
      agent_id: agentId,
      session_id: TEST_SESSION,
      tool_input: { prompt: `SESSION DIR: ${TEST_SESSION}\nDo work.`, subagent_type: 'cagents:backend-developer' },
    });

    expect(result.status).toBe(0);
    // Single valid JSON object on stdout ({continue:true} shape)
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.continue).toBe(true);
    // Degradation is announced on stderr, not stdout
    expect(result.stderr).toContain('js-yaml unavailable');
    // Tree mutation skipped — no agent_tree.yaml created
    expect(existsSync(join(sessionDir, 'workflow', 'agent_tree.yaml'))).toBe(false);
    // Global audit log still recorded the spawn
    const auditLog = readFileSync(join(tmpRoot, 'cagents-memory', '_system', 'logs', 'agent_spawns.log'), 'utf8');
    expect(auditLog).toContain(agentId);
  });

  it('subagent-stop-tracker.cjs degrades gracefully: exit 0, single {continue:true} JSON, tree untouched', () => {
    const treeFile = join(sessionDir, 'workflow', 'agent_tree.yaml');
    writeFileSync(treeFile, TREE_CONTENT);

    const result = runBlocked('subagent-stop-tracker.cjs', {
      agent_type: 'cagents:backend-developer',
      agent_id: 'agent-wi2-stop-1',
      session_id: TEST_SESSION,
      last_assistant_message: 'Completed the work item.',
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout.trim());
    expect(parsed.continue).toBe(true);
    expect(result.stderr).toContain('js-yaml unavailable');
    // Tree mutation skipped — file byte-identical (stopped_at still null)
    expect(readFileSync(treeFile, 'utf8')).toBe(TREE_CONTENT);
    // Stop event still recorded in the global audit log
    const auditLog = readFileSync(join(tmpRoot, 'cagents-memory', '_system', 'logs', 'agent_spawns.log'), 'utf8');
    expect(auditLog).toContain('agent-wi2-stop-1');
  });
});

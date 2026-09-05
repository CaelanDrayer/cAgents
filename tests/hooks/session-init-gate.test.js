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

describe('session-init-gate.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    // Isolated project root with no cagents-memory — findActiveSession returns null
    tmpDir = join(tmpdir(), 'cagents-test-sig-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should allow non-Agent tool calls', () => {
    const result = runHook(
      { tool_name: 'Write', tool_input: {} },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.continue).toBe(true);
  });

  it('should deny Agent spawn when no active session exists', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('deny message includes expected session directory path with status.yaml', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: {} },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    const reason = result.hookSpecificOutput?.permissionDecisionReason || '';
    expect(reason).toContain('sessions');
    expect(reason).toContain('status.yaml');
  });

  it('should allow Agent spawn when active session with status.yaml exists', () => {
    const sessionId = 'act_test-gate_260320_999';
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-20T10:00:00Z"\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: {}, session_id: sessionId },
      { CLAUDE_PROJECT_DIR: tmpDir }
    );
    expect(result.continue).toBe(true);
  });

  it('should bypass gate when CAGENTS_SESSION_ID env var is set', () => {
    // No session dir exists — but CAGENTS_SESSION_ID signals skill is creating it now
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: 'act_test_260320_001' }
    );
    expect(result.continue).toBe(true);
  });

  it('should allow Agent spawn when CAGENTS_SESSION_ID is set and session dir already exists with valid status.yaml', () => {
    // Dir exists with valid status — standard findActiveSession check finds it, so spawn is allowed
    const sessionId = 'act_test-gate-env_260322_001';
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      'phase: executing\ncreated_at: "2026-03-22T10:00:00Z"\n'
    );

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' }, session_id: sessionId },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: sessionId }
    );
    expect(result.continue).toBe(true);
  });

  it('should deny Agent spawn when CAGENTS_SESSION_ID is set and session dir exists but findActiveSession finds no active session', () => {
    // Dir exists but findActiveSession cannot find any non-terminal session —
    // no session_id hint is passed in the tool input, and the dir has no status.yaml
    // or any other recognisable session file, so the gate denies the spawn.
    const sessionId = 'act_test-gate-env-deny_260322_002';
    const sessionDir = join(tmpDir, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(sessionDir, { recursive: true });
    // No status.yaml, instruction.yaml, or agent_tree.yaml — only the bare directory

    // Note: no session_id in the hook input — without a hint, findActiveSession falls
    // through all three passes and returns null for an empty dir outside the grace window.
    // We set mtime to the past to ensure the session is outside the grace period.
    const pastTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const { utimesSync } = require('fs');
    utimesSync(sessionDir, pastTime, pastTime);

    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
      { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: sessionId }
    );
    expect(result.hookSpecificOutput).toBeDefined();
    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });
});

describe('session-init-gate.cjs — Phase 2 registered-agent advisory (v12.62.2 regression)', () => {
  // v12.68.0: the catalog source moved from .claude-plugin/plugin.json's
  // `agents` array to the flat agents/ directory (Claude Code discovers plugin
  // agents with a non-recursive scan of agents/). The regression this block
  // pins is unchanged — only the thing that can go missing is now agents/.
  //
  // Root cause (v12.62.2): loadRegisteredAgents() returned an EMPTY Set — not a
  // distinct "cannot verify" signal — whenever the catalog source could not be
  // read at PROJECT_ROOT. That is exactly what happens inside a /team
  // worktree-isolated subagent, because `.claude-plugin/` was missing from
  // `worktree.sparsePaths` in .claude/settings.json (only `.claude/`,
  // `cagents-memory/_system/`, `agents/`, `scripts/`, `tests/`, `docs/` were
  // checked out). An empty Set made aliasLookup() treat EVERY `cagents:<name>`
  // spawn — including fully valid, currently-registered agents such as
  // architect/scholar/product-owner (and, empirically, all 60 catalog agents)
  // — as "not a registered agent", because it could not distinguish "the
  // catalog is empty" from "the catalog could not be read".
  //
  // BEFORE FIX: a PROJECT_ROOT with no catalog on disk (this test's empty
  // tmpDir, mirroring the worktree's incomplete sparse checkout) makes every
  // one of these names — including architect/scholar/product-owner — receive
  // the false "is not a registered agent" advisory. Verified via git-stash:
  // reverting session-init-gate.cjs to HEAD~1 (pre-fix) and re-running this
  // block fails both catalog assertions below with non-empty falsePositives.
  // AFTER FIX: loadRegisteredAgents() returns `null` (not an empty Set) when
  // the catalog is unreadable, and aliasLookup() treats `null` as "cannot
  // verify — stay silent" instead of "confirmed unregistered".
  let tmpDir;

  beforeEach(() => {
    tmpDir = join(tmpdir(), 'cagents-test-sig-catalog-absent-' + Date.now());
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('does NOT flag cagents:architect / cagents:scholar / cagents:product-owner as unregistered when the catalog is absent (worktree-sparse-checkout simulation)', () => {
    for (const name of ['architect', 'scholar', 'product-owner']) {
      const result = runHook(
        { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
        { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: `act_test-catalog-absent-${name}_260801_001` }
      );
      expect(result.continue).toBe(true);
      expect(result.systemMessage || '').not.toMatch(/is not a registered agent/);
    }
  });

  it('does NOT flag ANY agent from the live catalog as unregistered when the catalog is absent (whole-catalog guard, catches future catalog drift)', () => {
    // 60 agents x one spawnSync'd node process each ⇒ needs more than the 5s
    // vitest default. Timeout raised via the third `it()` argument below.
    const agentsDir = join(process.cwd(), 'agents');
    const names = require('fs')
      .readdirSync(agentsDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.slice(0, -'.md'.length));
    // Sanity: the live catalog should have a substantial number of agents —
    // if this drops to 0 the test below would vacuously pass, so guard it.
    expect(names.length).toBeGreaterThan(0);

    const falsePositives = [];
    for (const name of names) {
      const result = runHook(
        { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
        { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: `act_test-catalog-absent-catalog-${name}_260801_001` }
      );
      if ((result.systemMessage || '').includes('is not a registered agent')) {
        falsePositives.push(name);
      }
    }
    expect(falsePositives).toEqual([]);
  }, 30000);

  it('does NOT flag cagents:architect / cagents:scholar / cagents:product-owner as unregistered at the real project root (catalog present)', () => {
    for (const name of ['architect', 'scholar', 'product-owner']) {
      const result = runHook(
        { tool_name: 'Agent', tool_input: { subagent_type: `cagents:${name}` } },
        { CLAUDE_PROJECT_DIR: process.cwd(), CAGENTS_SESSION_ID: `act_test-real-root-${name}_260801_001` }
      );
      expect(result.continue).toBe(true);
      expect(result.systemMessage || '').not.toMatch(/is not a registered agent/);
    }
  });

  it('still emits a legitimate advisory for a genuinely unknown name when the catalog IS present (no over-correction)', () => {
    const result = runHook(
      { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:totally-made-up-agent-xyz' } },
      { CLAUDE_PROJECT_DIR: process.cwd(), CAGENTS_SESSION_ID: 'act_test-unknown-agent_260801_001' }
    );
    expect(result.continue).toBe(true);
    expect(result.systemMessage || '').toMatch(/not a registered agent|Did you mean/);
  });

  it('worktree.sparsePaths in .claude/settings.json includes .claude-plugin/ (data-completeness root cause)', () => {
    const settingsPath = join(process.cwd(), '.claude', 'settings.json');
    const settings = JSON.parse(require('fs').readFileSync(settingsPath, 'utf8'));
    const sparsePaths = (settings.worktree && settings.worktree.sparsePaths) || [];
    expect(sparsePaths).toContain('.claude-plugin/');
  });
});

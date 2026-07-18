/**
 * P0-2 (v12.7.x self-improvement): wire v12-aliases.yaml to runtime via
 * session-init-gate.cjs PreToolUse[Agent] hook.
 *
 * Bug:
 *   scripts/migration/v12-aliases.yaml is a static doc — no hook reads it,
 *   so an Agent spawn referencing a renamed name (e.g. cagents:engineering-manager,
 *   cagents:chief-legal-officer) silently fails with no actionable hint.
 *
 * Fix:
 *   .claude/hooks/session-init-gate.cjs gains an aliasLookup({type}) block.
 *   When the spawned subagent_type is `cagents:<name>` and the agent is NOT
 *   registered in .claude-plugin/plugin.json:
 *     - If <name> is in v12-aliases.yaml as an `old:` key, emit a systemMessage
 *       naming the new target AND mutate tool_input.subagent_type to the new
 *       name (so the spawn retries under the new name). Set
 *       hookSpecificOutput.permissionDecisionReason to mention the rename.
 *     - Otherwise, emit a Levenshtein-distance-≤3 suggestion in
 *       permissionDecisionReason.
 *   Unaliased valid (registered) names pass through unchanged.
 *
 * This test is the failing-before / passing-after regression contract.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'session-init-gate.cjs');

/**
 * Spawn the session-init-gate hook with a fake CAGENTS_SESSION_ID so the
 * session-presence check bypasses (no real session directory required).
 * The hook will reach the Phase 2 logic (alias lookup) without denying on
 * the session gate.
 */
function runHook(input, extraEnv = {}) {
  const payload = JSON.stringify(input);
  const fakeSessionId = `test_aliases_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const proc = spawnSync('node', [HOOK_PATH], {
    input: payload,
    encoding: 'utf8',
    // 60000 (was 5000): spawnSync does NOT throw on timeout — it returns
    // status:null/empty-stdout, and the parse below silently yielded null. The
    // per-test `expect(proc.status).toBe(0)` already fails loud on a timeout, but
    // a 5s budget under full-core CI saturation could be crossed → red under load.
    // Raise the budget and FAIL LOUD (with diagnostics) on abnormal termination.
    timeout: 60000,
    env: {
      ...process.env,
      CAGENTS_SESSION_ID: fakeSessionId,
      ...extraEnv,
    },
  });
  // session-init-gate.cjs (PreToolUse[Agent] via createHook) ALWAYS exits 0 with
  // one JSON line on stdout, so any abnormal termination is a spawn misfire.
  const diag = () => `status=${proc.status} signal=${proc.signal} error=${proc.error ? proc.error.message : 'none'} stdout=${JSON.stringify((proc.stdout || '').slice(0, 200))} stderr=${JSON.stringify((proc.stderr || '').slice(0, 500))}`;
  if (proc.error) throw new Error(`aliases runHook: spawnSync errored — ${diag()}`);
  if (proc.status === null) throw new Error(`aliases runHook: hook killed (timeout/signal) — ${diag()}`);
  if (proc.status !== 0) throw new Error(`aliases runHook: hook exited non-zero — ${diag()}`);
  if (!proc.stdout || !proc.stdout.trim()) throw new Error(`aliases runHook: empty stdout — ${diag()}`);
  let parsed;
  try {
    parsed = JSON.parse(proc.stdout.trim());
  } catch (e) {
    throw new Error(`aliases runHook: stdout not valid JSON — ${e.message} — ${diag()}`);
  }
  return { proc, parsed };
}

describe('P0-2: v12-aliases.yaml runtime resolution via session-init-gate.cjs', () => {
  it('hook source exists at .claude/hooks/session-init-gate.cjs', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  it('spawning a renamed agent (cagents:engineering-manager) emits an alias notice mentioning tech-lead', () => {
    const { proc, parsed } = runHook({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:engineering-manager' },
    });
    expect(proc.status, `hook exited with non-zero: ${proc.stderr}`).toBe(0);
    expect(parsed, 'hook did not emit parseable JSON').not.toBeNull();

    // The alias notice can land in either systemMessage OR
    // permissionDecisionReason — accept either, but both should mention
    // tech-lead (the canonical v12 rename target).
    const systemMessage = parsed.systemMessage || '';
    const reason = parsed.hookSpecificOutput?.permissionDecisionReason || '';
    const combined = `${systemMessage}\n${reason}`;

    expect(
      combined,
      `expected an alias notice mentioning 'tech-lead', got systemMessage=${JSON.stringify(systemMessage)} reason=${JSON.stringify(reason)}`,
    ).toMatch(/tech-lead/);

    // Should also reference the old name so the user knows what was rewritten.
    expect(combined).toMatch(/engineering-manager/);
  });

  it('spawning another renamed agent (cagents:chief-legal-officer) maps to general-counsel (clo deleted in Wave 8)', () => {
    const { proc, parsed } = runHook({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:chief-legal-officer' },
    });
    expect(proc.status).toBe(0);
    expect(parsed).not.toBeNull();
    const systemMessage = parsed.systemMessage || '';
    const reason = parsed.hookSpecificOutput?.permissionDecisionReason || '';
    const combined = `${systemMessage}\n${reason}`;
    expect(combined).toMatch(/general-counsel/);
    expect(combined).toMatch(/chief-legal-officer/);
  });

  it('an absorbed agent (cagents:task-decomposer) maps to planner', () => {
    const { proc, parsed } = runHook({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:task-decomposer' },
    });
    expect(proc.status).toBe(0);
    expect(parsed).not.toBeNull();
    const systemMessage = parsed.systemMessage || '';
    const reason = parsed.hookSpecificOutput?.permissionDecisionReason || '';
    const combined = `${systemMessage}\n${reason}`;
    expect(combined).toMatch(/\bplanner\b/);
    expect(combined).toMatch(/task-decomposer/);
  });

  it('unaliased valid name (cagents:planner) passes through without alias notice', () => {
    const { proc, parsed } = runHook({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:planner' },
    });
    expect(proc.status).toBe(0);
    expect(parsed).not.toBeNull();
    const systemMessage = parsed.systemMessage || '';
    const reason = parsed.hookSpecificOutput?.permissionDecisionReason || '';
    // No alias-notice phrasing should appear for a registered, current name.
    expect(systemMessage).not.toMatch(/renamed in v12/);
    expect(reason).not.toMatch(/renamed in v12/);
    // And the hook MUST NOT deny the spawn.
    expect(parsed.hookSpecificOutput?.permissionDecision).not.toBe('deny');
  });

  it('unknown unaliased name (cagents:tech-leed typo) emits a Levenshtein suggestion', () => {
    const { proc, parsed } = runHook({
      tool_name: 'Agent',
      tool_input: { subagent_type: 'cagents:tech-leed' },
    });
    expect(proc.status).toBe(0);
    expect(parsed).not.toBeNull();
    const systemMessage = parsed.systemMessage || '';
    const reason = parsed.hookSpecificOutput?.permissionDecisionReason || '';
    const combined = `${systemMessage}\n${reason}`;
    // Should suggest a close registered name within Levenshtein distance 3
    // — for `tech-leed`, `tech-lead` is distance 1.
    expect(
      combined,
      `expected a 'did you mean' / suggestion mentioning 'tech-lead' for 'tech-leed', got: ${combined}`,
    ).toMatch(/tech-lead/);
  });

  it('non-Agent tool calls (e.g. Bash) pass through untouched', () => {
    const { proc, parsed } = runHook({
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
    });
    expect(proc.status).toBe(0);
    expect(parsed).not.toBeNull();
    // continue:true with no alias message
    expect(parsed.continue !== false).toBe(true);
    const systemMessage = parsed.systemMessage || '';
    expect(systemMessage).not.toMatch(/renamed in v12/);
  });

  it('v12-aliases.yaml has a header comment pointing at session-init-gate.cjs', () => {
    const aliasPath = path.join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');
    expect(fs.existsSync(aliasPath)).toBe(true);
    const content = fs.readFileSync(aliasPath, 'utf8');
    // Per the brief, add a header comment pointing to the runtime consumer so
    // future editors know the file is read at hook time, not just docs.
    expect(content).toMatch(/session-init-gate\.cjs/);
  });
});

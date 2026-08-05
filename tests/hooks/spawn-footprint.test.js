import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import os from 'os';
import yaml from 'js-yaml';

/**
 * Regression test for WO-01 (session team_load-cut-program_260804_001):
 * .claude/hooks/spawn-footprint.cjs — the spawn-footprint measurement instrument.
 *
 * Contract being pinned:
 *   1. The hook exists and is registered exactly once, on PostToolUse[Agent].
 *   2. token_count.input is the SUM of the three input components. `usage.input_tokens`
 *      alone is the uncached slice (observed: 1-2 tokens) and is recorded separately
 *      as input_uncached so the aggregate can never be mistaken for a raw API field.
 *   3. Footprints are appended to workflow/spawn_footprints.yaml.
 *   4. Footprints reconcile onto the implementation_tasks entry with a matching
 *      agent_id, per controllers.md "Task Result Metadata". Reconcile is idempotent
 *      and back-fills entries whose agent_id appeared after the spawn returned.
 *   5. The hook NEVER creates coordination_log.yaml (so it cannot make an
 *      uncoordinated session look coordinated).
 *   6. DIAGNOSTIC ONLY — it never blocks, denies, or gates, on ANY input.
 *   7. NIS-1: the instrument contains no threshold, gate, or pass/fail comparison.
 *
 * Failing-before / passing-after: before WO-01 the hook file does not exist, so
 * tests 1-2 fail immediately.
 *
 * The `usage` fixtures below are VERBATIM from real PostToolUse[Agent] payloads
 * captured by a throwaway probe during WO-01, not invented shapes.
 */

const HOOK = join(process.cwd(), '.claude/hooks/spawn-footprint.cjs');
const SETTINGS = join(process.cwd(), '.claude/settings.json');

const require_ = createRequire(import.meta.url);
process.env.CAGENTS_DISPATCH_IMPORT = '1';
const { buildFootprint, reconcile } = require_(HOOK);

/** Real captured usage object (Explore spawn that touched no files). */
const REAL_USAGE_NO_TOUCH = {
  input_tokens: 2,
  cache_creation_input_tokens: 462,
  cache_read_input_tokens: 9518,
  output_tokens: 1079,
  service_tier: 'standard',
};

/** Real captured usage object (same agent type, after reading one workflow file). */
const REAL_USAGE_AFTER_TOUCH = {
  input_tokens: 1,
  cache_creation_input_tokens: 24619,
  cache_read_input_tokens: 9712,
  output_tokens: 1555,
  service_tier: 'standard',
};

function realToolResponse(agentId, usage, totalTokens) {
  return {
    status: 'completed',
    agentId,
    agentType: 'Explore',
    resolvedModel: 'claude-opus-5[1m]',
    totalDurationMs: 22162,
    totalTokens,
    totalToolUseCount: 1,
    usage,
    content: [{ type: 'text', text: 'done' }],
  };
}

/**
 * Run the hook as a real child process (the production path: run-hook.cjs
 * require()s it and createHook reads stdin / writes stdout).
 * Generous timeout: this box has chronic ambient load; a tight timeout produces
 * misleading reds rather than real signal.
 */
function runHook(input, env = {}) {
  const childEnv = { ...process.env, ...env };
  // MUST NOT propagate the parent's import-suppression flag, or the child would
  // never self-register and would produce no stdout.
  delete childEnv.CAGENTS_DISPATCH_IMPORT;
  const out = execSync(`node "${HOOK}"`, {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 60000,
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(out.trim());
}

describe('spawn-footprint.cjs — WO-01 measurement instrument', () => {
  let tmpRoot;
  let sessionId;
  let sessionDir;

  beforeEach(() => {
    tmpRoot = join(os.tmpdir(), `cagents-spawn-fp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionId = 'run_test-spawn-footprint_260804_001';
    sessionDir = join(tmpRoot, 'cagents-memory', 'sessions', sessionId);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      `session_id: ${sessionId}\npipeline_state: COORDINATED\nphase: coordinating\n`
    );
  });

  afterEach(() => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // --- 1. existence + registration ----------------------------------------

  it('hook file exists', () => {
    expect(existsSync(HOOK)).toBe(true);
  });

  it('is registered exactly once, on PostToolUse[Agent]', () => {
    const settings = JSON.parse(readFileSync(SETTINGS, 'utf8'));
    // Count registrations only — NOT the human-readable $comment, which also
    // names the hook. Reverting the instrument = deleting this one registration.
    const serialized = JSON.stringify(settings.hooks);
    const occurrences = serialized.split('spawn-footprint').length - 1;
    expect(occurrences).toBe(1);

    const agentEntries = (settings.hooks.PostToolUse || []).filter(
      (e) => typeof e.matcher === 'string' && e.matcher.includes('Agent')
    );
    expect(agentEntries.length).toBe(1);
    expect(JSON.stringify(agentEntries[0])).toContain('spawn-footprint');
  });

  // --- 2. field semantics ---------------------------------------------------

  it('returns null when the payload carries no usage object', () => {
    expect(buildFootprint(null)).toBeNull();
    expect(buildFootprint({})).toBeNull();
    expect(buildFootprint({ agentId: 'a1' })).toBeNull();
    expect(buildFootprint({ usage: 'not-an-object' })).toBeNull();
  });

  it('token_count.input is the SUM of uncached + cache_read + cache_creation', () => {
    const fp = buildFootprint(realToolResponse('a803e2df0430e7bb0', REAL_USAGE_NO_TOUCH, 11061));
    expect(fp.token_count.input).toBe(2 + 9518 + 462); // 9982
    expect(fp.token_count.input_uncached).toBe(2);
    expect(fp.token_count.cache_read).toBe(9518);
    expect(fp.token_count.cache_creation).toBe(462);
    expect(fp.token_count.output).toBe(1079);
    expect(fp.token_count.total).toBe(11061);
    expect(fp.agent_id).toBe('a803e2df0430e7bb0');
  });

  it('distinguishes a no-touch spawn from a rule-injecting spawn', () => {
    const noTouch = buildFootprint(realToolResponse('a1', REAL_USAGE_NO_TOUCH, 11061));
    const afterTouch = buildFootprint(realToolResponse('a2', REAL_USAGE_AFTER_TOUCH, 35887));
    expect(noTouch.token_count.input).toBe(9982);
    expect(afterTouch.token_count.input).toBe(34332);
    // The instrument must be able to see the difference at all — that is its purpose.
    expect(afterTouch.token_count.input).toBeGreaterThan(noTouch.token_count.input);
  });

  it('tolerates missing/garbage numeric fields without throwing', () => {
    const fp = buildFootprint({ usage: {}, agentId: 'a1' });
    expect(fp.token_count.input).toBe(0);
    expect(fp.tool_uses).toBe(0);
    expect(fp.duration_seconds).toBe(0);
  });

  // --- 3. reconcile ---------------------------------------------------------

  it('attaches metadata to the implementation_tasks entry with a matching agent_id', () => {
    const log = {
      implementation_tasks: [
        { task_id: 'WI-1', agent_id: 'aAAA' },
        { task_id: 'WI-2', agent_id: 'aBBB' },
        { task_id: 'WI-3' }, // no agent_id -> untouched
      ],
    };
    const fps = [buildFootprint(realToolResponse('aBBB', REAL_USAGE_NO_TOUCH, 11061))];
    const changed = reconcile(log, fps);
    expect(changed).toBe(1);
    expect(log.implementation_tasks[1].token_count.input).toBe(9982);
    expect(log.implementation_tasks[0].token_count).toBeUndefined();
    expect(log.implementation_tasks[2].token_count).toBeUndefined();
  });

  it('reconcile is idempotent (re-running attaches nothing new)', () => {
    const log = { implementation_tasks: [{ task_id: 'WI-1', agent_id: 'aAAA' }] };
    const fps = [buildFootprint(realToolResponse('aAAA', REAL_USAGE_NO_TOUCH, 11061))];
    expect(reconcile(log, fps)).toBe(1);
    expect(reconcile(log, fps)).toBe(0);
  });

  it('reconcile is a no-op on a log with no implementation_tasks', () => {
    expect(reconcile({}, [])).toBe(0);
    expect(reconcile(null, [])).toBe(0);
    expect(reconcile({ implementation_tasks: 'nope' }, [])).toBe(0);
  });

  // --- 4. end-to-end through the real child process -------------------------

  it('appends the footprint to workflow/spawn_footprints.yaml', () => {
    const res = runHook(
      {
        tool_name: 'Agent',
        session_id: sessionId,
        tool_response: realToolResponse('aCCC', REAL_USAGE_AFTER_TOUCH, 35887),
      },
      { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId }
    );
    expect(res.continue).toBe(true);

    const fpPath = join(sessionDir, 'workflow', 'spawn_footprints.yaml');
    expect(existsSync(fpPath)).toBe(true);
    const doc = yaml.load(readFileSync(fpPath, 'utf8'));
    expect(doc.spawn_footprints).toHaveLength(1);
    expect(doc.spawn_footprints[0].agent_id).toBe('aCCC');
    expect(doc.spawn_footprints[0].token_count.input).toBe(34332);
  });

  it('back-fills token_count.input into an existing coordination_log.yaml', () => {
    const logPath = join(sessionDir, 'workflow', 'coordination_log.yaml');
    writeFileSync(
      logPath,
      'schema_version: "1"\nimplementation_tasks:\n  - task_id: WI-1\n    agent_id: aDDD\n    status: completed\n'
    );

    runHook(
      {
        tool_name: 'Agent',
        session_id: sessionId,
        tool_response: realToolResponse('aDDD', REAL_USAGE_NO_TOUCH, 11061),
      },
      { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId }
    );

    const log = yaml.load(readFileSync(logPath, 'utf8'));
    expect(log.implementation_tasks[0].token_count).toBeDefined();
    expect(log.implementation_tasks[0].token_count.input).toBe(9982);
    expect(log.implementation_tasks[0].token_count.input).not.toBeNull();
    expect(log.implementation_tasks[0].tool_uses).toBe(1);
  });

  it('NEVER creates coordination_log.yaml when one does not already exist', () => {
    runHook(
      {
        tool_name: 'Agent',
        session_id: sessionId,
        tool_response: realToolResponse('aEEE', REAL_USAGE_NO_TOUCH, 11061),
      },
      { CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: sessionId }
    );
    expect(existsSync(join(sessionDir, 'workflow', 'coordination_log.yaml'))).toBe(false);
    // ...but the durable record was still written.
    expect(existsSync(join(sessionDir, 'workflow', 'spawn_footprints.yaml'))).toBe(true);
  });

  // --- 5. DIAGNOSTIC ONLY: never blocks -------------------------------------

  it.each([
    ['empty input', {}],
    ['non-Agent tool', { tool_name: 'Write', tool_response: {} }],
    ['Agent with no tool_response', { tool_name: 'Agent' }],
    ['Agent with null tool_response', { tool_name: 'Agent', tool_response: null }],
    ['Agent with string tool_response', { tool_name: 'Agent', tool_response: 'oops' }],
    ['Agent with usage but no resolvable session', {
      tool_name: 'Agent',
      session_id: 'run_does-not-exist_260804_999',
      tool_response: { usage: REAL_USAGE_NO_TOUCH, agentId: 'aX' },
    }],
  ])('never blocks: %s', (_label, input) => {
    const res = runHook(input, { CLAUDE_PROJECT_DIR: tmpRoot });
    expect(res.continue).toBe(true);
    expect(res.decision).toBeUndefined();
    expect(res.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });

  // --- 6. NIS-1: no gate, no threshold, anywhere ----------------------------

  it('contains no gate, threshold, or pass/fail comparison (NIS-1)', () => {
    const raw = readFileSync(HOOK, 'utf8');
    // Strip comments — the header prose deliberately NAMES the things it forbids.
    const code = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    expect(code).not.toMatch(/permissionDecision/);
    expect(code).not.toMatch(/\bdeny\b/);
    expect(code).not.toMatch(/decision\s*:/);
    expect(code).not.toMatch(/\bthreshold\b/i);
    expect(code).not.toMatch(/\bMAX_[A-Z_]*(TOKEN|SIZE|LIMIT|BUDGET)/);
    expect(code).not.toMatch(/process\.exit\s*\(\s*[1-9]/);
  });
});

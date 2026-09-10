/**
 * denied-spawn recording — a DENIED Agent spawn must leave a trace on disk.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `subagent-tracker.cjs` is registered for `SubagentStart` ONLY, and
 * `SubagentStart` never fires for a spawn that was denied at `PreToolUse|Agent`.
 * So before this wiring a denial left NO record anywhere: `agent_tree.yaml`
 * could only ever contain SUCCESSES. The user-reported symptom ("sub agent
 * spawning is getting blocked a lot") was invisible BY CONSTRUCTION — the one
 * event you most need to count was the one event nothing counted.
 *
 * `agent-dispatch.cjs` is the single chokepoint for every Agent-spawn deny
 * (session-init-gate's own deny branch was removed in RF-1; the dispatcher's
 * fail-CLOSED logic-throw branch remains, and `isDeny(gateVerdict)` still
 * catches any deny branch a future change reintroduces). The record is wired
 * at all three deny returns there.
 *
 * THE INVARIANTS
 *   1. Every deny path writes a `spawn_failures:` record naming the attempted
 *      agent type and a reason.
 *   2. A denial is EVIDENCE, NOT CREDIT: it must never appear under `agents:`,
 *      so it can never fake delegation or satisfy a child-count / stall probe.
 *   3. Recording is OBSERVABILITY, NOT POLICY: when recording is made
 *      impossible, the deny verdict is returned BYTE-IDENTICALLY and nothing
 *      throws. A failure to record a denial must never become a second failure.
 *   4. The ALLOW path never spawns the recorder (zero added latency where it
 *      would actually matter).
 *   5. (LOW-1, review round 1) Recording NEVER BLOCKS the deny path. The
 *      recorder is a detached, `unref()`ed fire-and-forget child, so the hook
 *      returns its verdict without waiting for it. The record still lands — it
 *      just lands AFTER the verdict. Every assertion below that reads the record
 *      therefore polls via `waitForFile` instead of reading synchronously.
 *
 * WHY THE POLLING IS NOT A WEAKENING
 * ----------------------------------
 * `waitForFile` FAILS LOUDLY on timeout (it throws naming the path and the
 * budget), so "the record lands" is still pinned exactly as hard as a sync read
 * pinned it. It additionally pins a LATENCY CEILING the sync read never did: a
 * recorder that silently stopped landing, or took longer than RECORD_BUDGET_MS,
 * now fails this suite. The invariants are unchanged; only the write's timing is.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, chmodSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import childProcess from 'child_process';

const require = createRequire(import.meta.url);

/**
 * The detached recorder costs one node cold start. 10s is ~60x the observed
 * ~150ms and is generous for a loaded shared box, while still being a real
 * ceiling: a recorder that never lands fails rather than hangs.
 */
const RECORD_BUDGET_MS = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Poll until `predicate(contents)` holds, or throw naming the path + budget. */
async function waitForFile(file, predicate = () => true, budgetMs = RECORD_BUDGET_MS) {
  const deadline = Date.now() + budgetMs;
  let last = '(file never appeared)';
  for (;;) {
    if (existsSync(file)) {
      last = readFileSync(file, 'utf8');
      if (predicate(last)) return last;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `waitForFile TIMED OUT after ${budgetMs}ms: ${file} never satisfied the predicate. ` +
        `Last contents:\n${last}`
      );
    }
    await sleep(25);
  }
}

const REPO_ROOT = process.cwd();
const HOOKS_DIR = join(REPO_ROOT, '.claude', 'hooks');
const DISPATCH = join(HOOKS_DIR, 'agent-dispatch.cjs');

const createdRoots = [];

/** A temp PROJECT_ROOT holding one live session, so the tracker resolves there. */
function freshProject(label) {
  const root = mkdtempSync(join(tmpdir(), `cagents-deny-${label}-`));
  createdRoots.push(root);
  const sessionDir = join(root, 'cagents-memory', 'sessions', 'act_denytest_260909_001');
  mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
  writeFileSync(join(sessionDir, 'status.yaml'), 'phase: executing\npipeline_state: PLANNED\n');
  writeFileSync(join(sessionDir, 'workflow', 'agent_tree.yaml'), 'agents: []\n');
  return { root, sessionDir, tree: join(sessionDir, 'workflow', 'agent_tree.yaml') };
}

/** Re-require the dispatcher so it binds to the temp-rooted hook-utils. */
function factory(projectRoot) {
  process.env.CLAUDE_PROJECT_DIR = projectRoot;
  process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  delete require.cache[require.resolve(DISPATCH)];
  const mod = require(DISPATCH);
  delete process.env.CAGENTS_DISPATCH_TEST_IMPORT;
  return mod;
}

function spawnInput(type = 'cagents:backend-developer') {
  return {
    tool_name: 'Agent',
    session_id: 'act_denytest_260909_001',
    tool_input: { subagent_type: type, description: 'deny-recording test' },
  };
}

const LOGIC_THROW = () => { throw new TypeError('cannot read properties of undefined'); };
const GATE_DENY = async () => ({ deny: true, reason: 'GENUINE-ORPHAN: no session dir' });

afterEach(() => {
  delete process.env.CLAUDE_PROJECT_DIR;
  while (createdRoots.length) {
    const r = createdRoots.pop();
    try { chmodSync(join(r, 'cagents-memory', 'sessions', 'act_denytest_260909_001', 'workflow'), 0o755); } catch { /* best effort */ }
    try { rmSync(r, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

describe('denied Agent spawns are recorded (WI-B6 integration)', () => {
  const DENY_PATHS = [
    ['fail-CLOSED logic throw', LOGIC_THROW, /logic throw|cannot read properties/i],
    ['gate-returned deny', GATE_DENY, /GENUINE-ORPHAN/],
  ];

  it.each(DENY_PATHS)('%s writes a spawn_failures record', async (label, gate, reasonRe) => {
    const proj = freshProject('rec');
    const { makeDispatchHandler } = factory(proj.root);
    const verdict = await makeDispatchHandler({ sessionGate: gate, modelAdvisor: async () => null })(spawnInput());

    expect(verdict.deny, `${label} must still DENY`).toBe(true);

    // The recorder is fire-and-forget (LOW-1), so the record lands after the
    // verdict. waitForFile throws on timeout — "it lands" is still pinned.
    const tree = await waitForFile(proj.tree, (c) => /spawn_failures:/.test(c));
    expect(tree, `${label} left no trace on disk`).toMatch(/spawn_failures:/);
    expect(tree).toMatch(/attempted_type:\s*cagents:backend-developer/);
    expect(tree).toMatch(/status:\s*denied/);
    expect(tree).toMatch(reasonRe);
  });

  it('a denial is EVIDENCE, not CREDIT — it never becomes a spawned child', async () => {
    const proj = freshProject('credit');
    const { makeDispatchHandler } = factory(proj.root);
    const h = makeDispatchHandler({ sessionGate: GATE_DENY, modelAdvisor: async () => null });
    await h(spawnInput());
    await h(spawnInput());

    // BOTH records must land before the shape is judged — otherwise this could
    // pass vacuously on a tree that only ever got one of them.
    const tree = await waitForFile(proj.tree, (c) => (c.match(/^\s*- attempt_id:/gm) || []).length === 2);
    // The child-counting probes key on `- id:`; records use `- attempt_id:`.
    expect(tree.match(/^\s*- id:/gm) || []).toHaveLength(0);
    expect(tree.match(/^\s*- attempt_id:/gm) || []).toHaveLength(2);
  });

  it('the denial also reaches the global audit log (survives a missing session)', async () => {
    const proj = freshProject('audit');
    const { makeDispatchHandler } = factory(proj.root);
    await makeDispatchHandler({ sessionGate: GATE_DENY, modelAdvisor: async () => null })(spawnInput());

    const log = join(proj.root, 'cagents-memory', '_system', 'logs', 'agent_spawns.log');
    const contents = await waitForFile(log, (c) => /SPAWN_DENIED/.test(c));
    expect(contents).toMatch(/SPAWN_DENIED \| attempt_id=.*type=cagents:backend-developer/);
  });

  it('recording is OBSERVABILITY, not POLICY — an unwritable tree does not change the verdict', async () => {
    const writable = freshProject('policy-a');
    const blocked = freshProject('policy-b');
    chmodSync(join(blocked.sessionDir, 'workflow'), 0o000);

    const okVerdict = await factory(writable.root)
      .makeDispatchHandler({ sessionGate: LOGIC_THROW, modelAdvisor: async () => null })(spawnInput());
    const blockedVerdict = await factory(blocked.root)
      .makeDispatchHandler({ sessionGate: LOGIC_THROW, modelAdvisor: async () => null })(spawnInput());

    // Identical deny verdicts: recording succeeded in one case and could not in
    // the other, and the POLICY outcome is indistinguishable.
    expect(blockedVerdict.deny).toBe(true);
    expect(blockedVerdict.reason).toBe(okVerdict.reason);
  });

  it('the ALLOW path never invokes the recorder', async () => {
    const proj = freshProject('allow');
    const { makeDispatchHandler } = factory(proj.root);
    const verdict = await makeDispatchHandler({
      sessionGate: async () => null,
      modelAdvisor: async () => null,
    })(spawnInput());

    expect(verdict === null || verdict.deny === undefined).toBe(true);
    // SETTLE: the recorder is now asynchronous, so asserting absence
    // immediately would pass vacuously (nothing has had time to write yet).
    // Wait well past the observed ~150ms record latency, then assert absence.
    await sleep(1500);
    expect(readFileSync(proj.tree, 'utf8')).not.toMatch(/spawn_failures:/);
    expect(existsSync(join(proj.root, 'cagents-memory', '_system', 'logs', 'agent_spawns.log'))).toBe(false);
  });

  // ── LOW-1 (review round 1): the recorder must not be a BLOCKING WAIT ──
  describe('recording never blocks the deny verdict (LOW-1)', () => {
    /**
     * The previous implementation used `spawnSync(..., { timeout: 3000 })`,
     * measured at ~146ms of in-hook stall per denied spawn with a 3000ms
     * ceiling. The deny verdict must now be produced without waiting for the
     * recorder at all.
     *
     * The threshold is deliberately far below the OLD implementation's measured
     * cost (~146ms) rather than near the new one (~4ms): that makes the test a
     * regression detector for "someone reintroduced a synchronous process
     * round-trip", not a flaky latency micro-benchmark on a loaded box.
     */
    const SYNC_SPAWN_FLOOR_MS = 100;

    it('returns the deny verdict without waiting for the recorder', async () => {
      const proj = freshProject('nonblock');
      const { makeDispatchHandler } = factory(proj.root);
      const h = makeDispatchHandler({ sessionGate: GATE_DENY, modelAdvisor: async () => null });

      const t0 = process.hrtime.bigint();
      const verdict = await h(spawnInput());
      const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;

      expect(verdict.deny).toBe(true);
      expect(
        elapsedMs,
        `deny path took ${elapsedMs.toFixed(1)}ms — at or above the cost of a synchronous ` +
        `node round-trip. A blocking recorder (spawnSync) has likely been reintroduced.`
      ).toBeLessThan(SYNC_SPAWN_FLOOR_MS);

      // Non-blocking is only acceptable because the record STILL LANDS.
      const tree = await waitForFile(proj.tree, (c) => /spawn_failures:/.test(c));
      expect(tree).toMatch(/status:\s*denied/);
    });

    it('the detached recorder survives the hook process exiting', async () => {
      // The strongest available proof: run the deny path in a SEPARATE node
      // process that exits immediately after the verdict (exactly what a real
      // hook process does), then check the record from out here.
      const proj = freshProject('detached');
      const driver = join(proj.root, 'driver.cjs');
      writeFileSync(driver, `
        process.env.CLAUDE_PROJECT_DIR = ${JSON.stringify(proj.root)};
        process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
        const { makeDispatchHandler } = require(${JSON.stringify(DISPATCH)});
        makeDispatchHandler({
          sessionGate: async () => ({ deny: true, reason: 'DETACHED-PROBE deny' }),
          modelAdvisor: async () => null,
        })(${JSON.stringify(spawnInput())}).then((v) => {
          process.stdout.write(JSON.stringify(v));
          process.exit(0);   // hook processes do not linger
        });
      `);
      const res = childProcess.spawnSync(process.execPath, [driver], { encoding: 'utf8', timeout: 30000 });
      expect(res.status, `driver failed: ${res.stderr}`).toBe(0);
      expect(JSON.parse(res.stdout).deny).toBe(true);

      // The parent is GONE; the record must still arrive.
      const tree = await waitForFile(proj.tree, (c) => /DETACHED-PROBE deny/.test(c));
      expect(tree).toMatch(/spawn_failures:/);
      expect(tree).toMatch(/status:\s*denied/);
    });

    it('a recorder that cannot be spawned at all is swallowed — verdict byte-identical', async () => {
      const realSpawn = childProcess.spawn;
      const verdicts = [];
      try {
        // (a) healthy baseline
        verdicts.push(await runDeny(freshProject('sab-a').root));

        // (b) spawn() throws SYNCHRONOUSLY (EACCES-on-exec shape)
        childProcess.spawn = () => { throw new Error('synthetic: spawn refused'); };
        verdicts.push(await runDeny(freshProject('sab-b').root));

        // (c) spawn() fails ASYNCHRONOUSLY with ENOENT (binary missing). Without
        //     the 'error' listener this emits an UNHANDLED 'error' event, which
        //     would crash the hook process — i.e. turn one failure into two.
        childProcess.spawn = (_cmd, args, opts) =>
          realSpawn(join(tmpdir(), 'definitely-not-node-' + Date.now()), args, opts);
        verdicts.push(await runDeny(freshProject('sab-c').root));
      } finally {
        childProcess.spawn = realSpawn;
      }

      // Byte-identical policy outcome across all three.
      expect(new Set(verdicts.map((v) => JSON.stringify(v))).size, `verdicts diverged: ${JSON.stringify(verdicts)}`).toBe(1);
      expect(verdicts[0].deny).toBe(true);

      // Give an unhandled 'error' event every chance to surface and crash us.
      await sleep(500);
    });

    async function runDeny(root) {
      const { makeDispatchHandler } = factory(root);
      return makeDispatchHandler({ sessionGate: GATE_DENY, modelAdvisor: async () => null })(spawnInput());
    }
  });
});

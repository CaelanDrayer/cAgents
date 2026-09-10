/**
 * Session resolution: OWNERSHIP vs LIVENESS (ENG-OBS-2, second half).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * ENG-OBS-5 established a writer/reader SCHEMA mismatch in agent_tree.yaml, which
 * explains why READERS saw nothing. It did NOT explain why the tracker appeared to
 * WRITE nothing in session act_subagent-token-budget_260909_001 while it had
 * written 1291 lines in designer_census-postcut_260805_001.
 *
 * The answer: it wrote plenty — INTO THE WRONG SESSION. Evidence captured live
 * before the fix (cagents-memory/_system/logs/agent_spawns.log):
 *
 *   2026-09-10T01:04:24Z | agent_id=a911f86b4a6e24875 | type=cagents:backend-developer
 *     | parent=astrandb-diag-83eb7dbf7256824d
 *     | session=designer_census-postcut_260805_001 | sdk_uuid=16b4e111
 *
 * `sdk_uuid=16b4e111` is the tail of 03cff3d7-3c4e-4a8b-81fd-843d16b4e111 — the
 * LIVE transcript — yet the record was filed under a five-week-stale session. The
 * stale session's workflow/agent_tree.yaml mtime tracked the live session's spawns
 * minute for minute while the live session's own tree sat frozen at `agents: []`.
 *
 * TWO INDEPENDENT DEFECTS COMBINED:
 *
 *   (1) DIVERGENT PHASE READING. `_tryResolveCandidate` used key PRECEDENCE
 *       (pipeline_state > phase > current_phase, `^`-anchored) while
 *       `findMostRecentSessionDir` used `/(?:phase|pipeline_state):\s*(\S+)/` —
 *       POSITIONAL (earlier LINE wins, whichever key it is) and UNANCHORED (an
 *       indented `- phase:` under `state_history:` matches too). The live session
 *       opens `pipeline_state: incomplete` => precedence called it terminal and
 *       REFUSED it. The stale session carried `phase: EXECUTING` on an earlier line
 *       than its own `pipeline_state: incomplete` => position called it live and
 *       ACCEPTED it. Exactly inverted, on the same field, in the same file.
 *
 *   (2) OWNERSHIP ANSWERED WITH LIVENESS. The SDK-UUID pointer map held the
 *       CORRECT answer the whole time, but `resolveSdkUuidToSession` gates it
 *       behind the same terminal check, so a pessimistic label on a still-running
 *       session turned a deterministic hit into a miss — collapsing resolution onto
 *       the newest-session GUESS, which then picked a stranger's directory and
 *       refreshed its mtime, making it win again on the next spawn.
 *       Self-reinforcing: 116 agents deep before anyone noticed.
 *
 * These tests pin the fix at the level the bug actually lived at: not "does the
 * tracker write", but "does it write WHERE IT BELONGS" when a live session wears a
 * pessimistic label and a stale sibling is sitting there looking newer.
 *
 * EVERYTHING HERE IS ADVISORY/FAIL-OPEN: no assertion expects a deny, a block, or
 * a non-zero exit. A resolution failure must degrade to a VISIBLE guess or an
 * honest no-op, never to a blocked spawn.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import { spawnSync } from 'child_process';

const require = createRequire(import.meta.url);

const REPO_ROOT = process.cwd();
const HOOKS_DIR = join(REPO_ROOT, '.claude', 'hooks');
const HOOK_UTILS = join(HOOKS_DIR, 'hook-utils.cjs');
const TRACKER = join(HOOKS_DIR, 'subagent-tracker.cjs');

// A real SDK transcript UUID shape (8-4-4-4-12) — the resolvers shape-guard on it.
const UUID = '03cff3d7-3c4e-4a8b-81fd-843d16b4e111';

const createdRoots = [];

/**
 * The exact on-disk shape that produced the bug:
 *   - owner: the LIVE session this transcript belongs to, wearing the pessimistic
 *     `pipeline_state: incomplete` label the engine writes onto sessions that are
 *     still progressing.
 *   - stale: a five-week-old abandoned session whose status.yaml puts a
 *     non-terminal `phase:` on an EARLIER LINE than its own terminal
 *     `pipeline_state:` — and which is the NEWEST directory on disk, so it wins any
 *     mtime race.
 */
function fixture(label) {
  const root = mkdtempSync(join(tmpdir(), `cagents-ownership-${label}-`));
  createdRoots.push(root);
  const sessions = join(root, 'cagents-memory', 'sessions');

  const owner = join(sessions, 'act_owner_260909_001');
  mkdirSync(join(owner, 'workflow'), { recursive: true });
  writeFileSync(
    join(owner, 'status.yaml'),
    'session_id: act_owner_260909_001\npipeline_state: incomplete\ndomain: engineering\n'
  );
  writeFileSync(join(owner, 'workflow', 'agent_tree.yaml'), 'agents: []\n');

  // `phase: EXECUTING` BEFORE `pipeline_state: incomplete` — the line order is the
  // whole point: a positional reader stops at the first match and calls it live.
  const stale = join(sessions, 'designer_stale_260805_001');
  mkdirSync(join(stale, 'workflow'), { recursive: true });
  writeFileSync(
    join(stale, 'status.yaml'),
    'session_id: designer_stale_260805_001\n' +
    'phase: EXECUTING\n' +
    'pipeline_state: incomplete\n' +
    'state_history:\n' +
    '  - phase: INIT\n' +
    '    entered_at: "2026-08-05T23:45:00Z"\n'
  );
  writeFileSync(join(stale, 'workflow', 'agent_tree.yaml'), 'agents: []\n');

  // The pointer map holds the CORRECT owner all along — the bug was never a
  // missing pointer, it was a pointer that the liveness gate threw away.
  const mapDir = join(root, 'cagents-memory', '_system', 'sdk_session_map');
  mkdirSync(mapDir, { recursive: true });
  writeFileSync(join(mapDir, UUID), 'act_owner_260909_001');

  // Make the stale session the newest thing on disk so it WOULD win the guess.
  const future = Date.now() / 1000 + 60;
  utimesSync(stale, future, future);

  return {
    root,
    ownerTree: join(owner, 'workflow', 'agent_tree.yaml'),
    staleTree: join(stale, 'workflow', 'agent_tree.yaml'),
    sessions,
  };
}

/** Load hook-utils bound to a temp PROJECT_ROOT (it resolves paths at load time). */
function utilsFor(projectRoot) {
  process.env.CLAUDE_PROJECT_DIR = projectRoot;
  delete process.env.CAGENTS_ACTIVE_SESSION;
  delete require.cache[require.resolve(HOOK_UTILS)];
  const mod = require(HOOK_UTILS);
  mod._resetActiveSessionCache?.();
  return mod;
}

/**
 * Drive the real SubagentStart hook as the harness does: a child process fed JSON
 * on stdin. Timeout is deliberately generous (60s) — this box carries chronic
 * ambient load, and a tight timeout here would produce a MISLEADING red rather
 * than a real one. A timeout FAILS LOUD instead of being read as a result.
 */
function runTracker(projectRoot, input) {
  const env = { ...process.env, CLAUDE_PROJECT_DIR: projectRoot };
  delete env.CAGENTS_ACTIVE_SESSION;
  const r = spawnSync(process.execPath, [TRACKER], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    timeout: 60000,
    env,
  });
  if (r.error) throw new Error(`tracker spawn failed (not a verdict): ${r.error.message}`);
  if (r.signal) throw new Error(`tracker killed by ${r.signal} — inconclusive, not a result. stderr: ${r.stderr}`);
  let verdict = null;
  try { verdict = JSON.parse(String(r.stdout).trim()); } catch { /* non-JSON handled by callers */ }
  return { verdict, stdout: r.stdout, stderr: r.stderr, status: r.status };
}

function agentIds(treePath) {
  const raw = readFileSync(treePath, 'utf8');
  return [...raw.matchAll(/^\s*-\s+id:\s*(\S+)/gm)].map(m => m[1]);
}

afterEach(() => {
  delete process.env.CLAUDE_PROJECT_DIR;
  while (createdRoots.length) {
    const r = createdRoots.pop();
    try { rmSync(r, { recursive: true, force: true }); } catch { /* best effort */ }
  }
});

describe('statusPhase() — one reader, so two readers cannot disagree (ENG-OBS-2 defect 1)', () => {
  it('pipeline_state wins by PRECEDENCE, not by line POSITION', () => {
    const { statusPhase } = utilsFor(mkdtempSync(join(tmpdir(), 'cagents-sp-')));
    const stateFirst = 'session_id: x\npipeline_state: incomplete\nphase: EXECUTING\n';
    const phaseFirst = 'session_id: x\nphase: EXECUTING\npipeline_state: incomplete\n';
    // Identical facts, opposite line order => the SAME answer. The old positional
    // regex returned `incomplete` for one and `EXECUTING` for the other.
    expect(statusPhase(stateFirst)).toBe('incomplete');
    expect(statusPhase(phaseFirst)).toBe('incomplete');
  });

  it('ignores INDENTED history keys — a session is judged by its state, not its past', () => {
    const { statusPhase } = utilsFor(mkdtempSync(join(tmpdir(), 'cagents-sp2-')));
    const nested = 'session_id: x\nstate_history:\n  - phase: INIT\n  - phase: PLANNED\npipeline_state: COORDINATED\n';
    expect(statusPhase(nested)).toBe('COORDINATED');
  });

  it('falls back phase -> current_phase, and returns null when nothing is present', () => {
    const { statusPhase } = utilsFor(mkdtempSync(join(tmpdir(), 'cagents-sp3-')));
    expect(statusPhase('phase: EXECUTING\n')).toBe('EXECUTING');
    expect(statusPhase('current_phase: validating\n')).toBe('validating');
    expect(statusPhase('session_id: x\n')).toBeNull();
    expect(statusPhase(null)).toBeNull();
  });

  it('findMostRecentSessionDir SKIPS the stale session that the positional regex accepted', () => {
    const fx = fixture('heur');
    const { findMostRecentSessionDir } = utilsFor(fx.root);
    // The stale dir is the newest on disk AND leads with `phase: EXECUTING`, so the
    // old reader returned it. Its governing `pipeline_state` is terminal.
    const got = findMostRecentSessionDir();
    expect(got === null || !got.includes('designer_stale_260805_001')).toBe(true);
  });
});

describe('ownership vs liveness (ENG-OBS-2 defect 2)', () => {
  it('resolveSdkUuidOwner returns the owner that the liveness gate throws away', () => {
    const fx = fixture('own');
    const { resolveSdkUuidOwner, resolveSdkUuidToSession } = utilsFor(fx.root);
    // Same UUID, same pointer, same directory — two different questions.
    expect(resolveSdkUuidToSession(UUID), 'liveness gate still refuses a terminal label').toBeNull();
    expect(resolveSdkUuidOwner(UUID)).toContain('act_owner_260909_001');
  });

  it('a pointer to a DELETED session is still a miss (GC invariant preserved)', () => {
    const fx = fixture('gone');
    rmSync(join(fx.sessions, 'act_owner_260909_001'), { recursive: true, force: true });
    const { resolveSdkUuidOwner } = utilsFor(fx.root);
    expect(resolveSdkUuidOwner(UUID)).toBeNull();
  });

  it('refuses a corrupted pointer body instead of escaping the sessions dir', () => {
    const fx = fixture('esc');
    writeFileSync(join(fx.root, 'cagents-memory', '_system', 'sdk_session_map', UUID), '../../../etc');
    const { resolveSdkUuidOwner } = utilsFor(fx.root);
    expect(resolveSdkUuidOwner(UUID)).toBeNull();
  });

  it('never throws on junk input — ownership lookup is evidence-gathering', () => {
    const fx = fixture('junk');
    const { resolveSdkUuidOwner } = utilsFor(fx.root);
    for (const bad of [undefined, null, '', 'not-a-uuid', 42, {}]) {
      expect(() => resolveSdkUuidOwner(bad)).not.toThrow();
      expect(resolveSdkUuidOwner(bad)).toBeNull();
    }
  });
});

describe('the tracker files records in the OWNING session (the observed regression)', () => {
  it('writes to the owner, NOT the newer stale sibling', () => {
    const fx = fixture('e2e');
    const agentId = 'a911f86b4a6e24875'; // shape of a real id; `test_`-prefixed ids are filtered
    const { verdict, stderr } = runTracker(fx.root, {
      session_id: UUID,
      agent_type: 'cagents:backend-developer',
      agent_id: agentId,
    });

    expect(agentIds(fx.ownerTree), `owner tree got nothing. stderr: ${stderr}`).toContain(agentId);
    expect(agentIds(fx.staleTree), 'record leaked into a session this transcript does not own').toEqual([]);
    // Fail-open: a SubagentStart verdict never blocks.
    expect(verdict === null || verdict.continue !== false).toBe(true);
  });

  it('names the OWNER in the context it hands the model', () => {
    const fx = fixture('ctx');
    const { verdict } = runTracker(fx.root, {
      session_id: UUID,
      agent_type: 'cagents:reviewer',
      agent_id: 'a59ae131ebfdaf5f1',
    });
    const ctx = verdict?.hookSpecificOutput?.additionalContext || '';
    expect(ctx).toContain('act_owner_260909_001');
    expect(ctx).not.toContain('designer_stale_260805_001');
    // Ownership resolution is deterministic, so it must NOT be flagged as a guess.
    expect(ctx).not.toMatch(/GUESSED/);
  });

  it('an explicit SESSION_DIR prompt hint outranks the newest-session guess', () => {
    const fx = fixture('hint');
    // No pointer at all => the hint is the only evidence left. Before the reorder
    // the guess ran FIRST and always won, making this pass dead code.
    rmSync(join(fx.root, 'cagents-memory', '_system', 'sdk_session_map', UUID), { force: true });
    const agentId = 'a8d652ec730190efa';
    runTracker(fx.root, {
      session_id: UUID,
      agent_type: 'cagents:technical-writer',
      agent_id: agentId,
      tool_input: { prompt: 'SESSION_DIR: cagents-memory/sessions/act_owner_260909_001\nDo the work.' },
    });
    expect(agentIds(fx.ownerTree)).toContain(agentId);
    expect(agentIds(fx.staleTree)).toEqual([]);
  });

  it('a GUESSED resolution is declared to the model, not presented as fact', () => {
    const fx = fixture('guess');
    // Strip every deterministic signal: no pointer, no hint. Leave ONE non-terminal
    // session so the guess has something to land on.
    rmSync(join(fx.root, 'cagents-memory', '_system', 'sdk_session_map', UUID), { force: true });
    writeFileSync(
      join(fx.sessions, 'act_owner_260909_001', 'status.yaml'),
      'session_id: act_owner_260909_001\npipeline_state: PLANNED\n'
    );
    const { verdict } = runTracker(fx.root, {
      session_id: 'ffffffff-0000-4000-8000-ffffffffffff',
      agent_type: 'general-purpose',
      agent_id: 'a2ed46c696985762c',
    });
    const ctx = verdict?.hookSpecificOutput?.additionalContext || '';
    expect(ctx, 'a guess must never masquerade as a resolution').toMatch(/GUESSED/);
    expect(ctx).toMatch(/SESSION_DIR/); // carries the remediation, not just the complaint
  });

  it('resolves nothing rather than guessing wildly when no session exists at all', () => {
    const root = mkdtempSync(join(tmpdir(), 'cagents-empty-'));
    createdRoots.push(root);
    mkdirSync(join(root, 'cagents-memory', 'sessions'), { recursive: true });
    const { verdict, status } = runTracker(root, {
      session_id: UUID,
      agent_type: 'cagents:planner',
      agent_id: 'a0000000000000001',
    });
    // Honest no-op, still fail-open: advisory context, exit 0, never a block.
    expect(status).toBe(0);
    expect(verdict === null || verdict.continue !== false).toBe(true);
  });
});

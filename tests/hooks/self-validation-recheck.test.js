/**
 * C1 (advisory-first) regression test: verify-completion.cjs WARN-only
 * self-validation recheck (recheckSelfValidation).
 *
 * Background:
 *   .claude/rules/core/resources/execution-self-validation.md defines 5 executor
 *   self-validation checks. Two of them are DETERMINISTICALLY mechanizable —
 *   Check 2 (file existence) and Check 3 (guard exit codes). C1 graduates JUST
 *   those two to a real hook, but as a WARN-ONLY, additive extension of the
 *   EXISTING Stop hook (verify-completion.cjs): no new .cjs file, no hook-count
 *   change. The recheck gathers `self_validation` claims from
 *   workflow/coordination_log.yaml (implementation_tasks[].self_validation) and
 *   from outputs/**\/self-validation.yaml, runs fs.existsSync on claimed-existing
 *   paths (Check 2) and inspects guard_results[].exit_code (Check 3), then logs
 *   mismatches to stderr and writes workflow/self_validation_recheck.yaml.
 *
 * CRITICAL INVARIANT under test: the recheck is PURELY ADVISORY. It runs AFTER
 * the Stop hook's block/allow/warn verdict is computed and NEVER feeds back into
 * it. So the hook's returned decision must be byte-identical whether the
 * self_validation claims are all valid (good case) or contain a missing file +
 * a non-zero guard exit (bad case). This test builds two sessions that are
 * IDENTICAL for every existing verify-completion check and differ ONLY in the
 * VALIDITY of the self_validation claims (a file path + a guard exit_code that
 * no existing check inspects). It asserts:
 *   (1) recheck reports correctly — good: 0 mismatches; bad: file_missing +
 *       guard_nonzero_exit — via the persisted workflow/self_validation_recheck.yaml.
 *   (2) the hook's returned decision is byte-identical (good vs bad baseline),
 *       neither blocks, and the completion_summary warning/issue counts match —
 *       proving the recheck did not leak into the verdict.
 *   (3) a session with NO self_validation blocks is a pure no-op (no recheck
 *       file written, hook still returns a valid non-block decision).
 *
 * Test pattern mirrors tests/hooks/verify-completion-active-wait.test.js:
 * spawnSync the hook .cjs over stdin with a synthetic Stop payload, bind it to a
 * fabricated terminal (`pipeline_state: complete`) session via input.session_id
 * (a cAgents-shaped `run_...` hint resolves through verify-completion's explicit
 * terminal-inclusive hint path), and parse the stdout JSON decision. The dedup
 * guard self-bypasses under VITEST=true (inherited via ...process.env).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import yaml from 'js-yaml';
// Isolation (see materialize.mjs): SESSIONS_DIR points at a per-process temp
// project root, NOT the real <repo>/cagents-memory/sessions/. These fixtures are
// `pipeline_state: complete` — TERMINAL — so they are invisible to
// fallbackHeuristic, but verify-completion.cjs's last-resort
// findMostRecentSessionDir({includeTerminal: true}) DOES pick them up, so an
// unhinted sibling Stop-hook spawn could bind to one. hookEnv() also seeds
// pipeline_config.yaml into the temp root, which verify-completion.cjs reads.
import { hookEnv, SESSIONS_DIR } from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const HOOK = join(PROJECT_ROOT, '.claude', 'hooks', 'verify-completion.cjs');

const NOW_ISO = new Date().toISOString();
const TS = Date.now().toString(36);
const created = [];

/**
 * Fabricate a terminal (`complete`) `run_` session whose EXISTING-check content
 * is fixed. The ONLY knobs are the self_validation file path + guard exit_code.
 *
 * @param {string} slug
 * @param {object} opts
 * @param {string|null} opts.svFilePath  claimed-existing path in the coord self_validation
 *                                        (null => omit the self_validation block entirely)
 * @param {number|null} opts.svExitCode  guard exit_code in the coord self_validation
 * @param {boolean} [opts.outputsBlock=true]  also write a clean outputs/task-2/self-validation.yaml
 */
function makeSession(slug, { svFilePath, svExitCode, outputsBlock = true }) {
  const sid = `act_c1recheck-${slug}_${TS}`;
  const dir = join(SESSIONS_DIR, sid);
  created.push(dir);
  mkdirSync(join(dir, 'workflow'), { recursive: true });

  // status.yaml — terminal `complete`, fresh heartbeat (< 24h so no staleness skip).
  writeFileSync(
    join(dir, 'status.yaml'),
    [
      `session_id: ${sid}`,
      `pipeline_state: complete`,
      `phase: complete`,
      `last_updated_at: "${NOW_ISO}"`,
      `started_at: "${NOW_ISO}"`,
      `state_history:`,
      `  - state: complete`,
      `    entered_at: "${NOW_ISO}"`,
      `    duration_ms: 1000`,
      ``,
    ].join('\n')
  );

  // plan.yaml — satisfies Check C schema (mission/objectives/controller_assignment).
  writeFileSync(
    join(dir, 'workflow', 'plan.yaml'),
    [
      `mission: "Ship the feature"`,
      `domain: engineering`,
      `tier: 2`,
      `objectives:`,
      `  - id: OBJ-1`,
      `    description: "Ship it"`,
      `controller_assignment:`,
      `  primary: "cagents:tech-lead"`,
      ``,
    ].join('\n')
  );

  // validation_report.yaml — PASS (no Check 6 warning).
  writeFileSync(
    join(dir, 'workflow', 'validation_report.yaml'),
    [`overall_status: PASS`, `status: PASS`, ``].join('\n')
  );

  // execution_summary.yaml — satisfies Check 7 (session_id/final_state/status),
  // no `generated_by: *safety-net*` so Check 7b stays silent.
  writeFileSync(
    join(dir, 'workflow', 'execution_summary.yaml'),
    [
      `session_id: "${sid}"`,
      `final_state: complete`,
      `status: completed`,
      ``,
    ].join('\n')
  );

  // agent_tree.yaml — a depth-1 controller AND a depth-2 executor so the
  // "controller self-handling" check (depth>=2 executors present) stays silent.
  writeFileSync(
    join(dir, 'workflow', 'agent_tree.yaml'),
    [
      `root:`,
      `  agent: cagents:act`,
      `  depth: 0`,
      `  spawned_at: "${NOW_ISO}"`,
      `  stopped_at: null`,
      `agents:`,
      `  - id: agent-tl-1`,
      `    type: cagents:tech-lead`,
      `    depth: 1`,
      `    spawned_at: "${NOW_ISO}"`,
      `    stopped_at: "${NOW_ISO}"`,
      `  - id: agent-be-1`,
      `    type: cagents:backend-developer`,
      `    depth: 2`,
      `    spawned_at: "${NOW_ISO}"`,
      `    stopped_at: "${NOW_ISO}"`,
      ``,
    ].join('\n')
  );

  // coordination_log.yaml — schema_version/controller/status (Check C), a
  // completed WI-1 with file:line evidence (Check A score 3), pre_execution +
  // mid_execution checkpoints (Check E), and self_validation presence (Check D).
  // The self_validation block is the ONLY thing that differs good vs bad.
  const svBlock = svFilePath == null
    ? ''
    : [
        `    self_validation:`,
        `      schema_version: "2"`,
        `      file_existence:`,
        `        files_claimed_to_exist:`,
        `          - path: "${svFilePath}"`,
        `            exists: true`,
        `        missing_files: []`,
        `      guard_results:`,
        `        - name: "npm test"`,
        `          command: "npx vitest run"`,
        `          exit_code: ${svExitCode}`,
        `      checks_passed: 5`,
        `      checks_failed: 0`,
      ].join('\n') + '\n';

  writeFileSync(
    join(dir, 'workflow', 'coordination_log.yaml'),
    [
      `schema_version: "1"`,
      `controller: "cagents:tech-lead"`,
      `status: completed`,
      `objectives:`,
      `  - id: OBJ-1`,
      `    description: "Ship it"`,
      `validation_checkpoints:`,
      `  pre_execution:`,
      `    passed: true`,
      `    checks_run: 7`,
      `  mid_execution_checkpoints:`,
      `    - round: 1`,
      `      passed: true`,
      `implementation_tasks:`,
      `  - task_id: WI-1`,
      `    assigned_to: "cagents:backend-developer"`,
      `    status: completed`,
      `    evidence: "src/auth.ts:15 - bcrypt hashing verified"`,
    ].join('\n') + '\n' + svBlock,
  );

  // outputs/task-2/self-validation.yaml — clean, identical in every session.
  if (outputsBlock) {
    mkdirSync(join(dir, 'outputs', 'task-2'), { recursive: true });
    writeFileSync(
      join(dir, 'outputs', 'task-2', 'self-validation.yaml'),
      [
        `status: DONE`,
        `summary: "task 2 complete"`,
        `self_validation:`,
        `  schema_version: "2"`,
        `  file_existence:`,
        `    files_claimed_to_exist:`,
        `      - path: "workflow/coordination_log.yaml"`,
        `        exists: true`,
        `    missing_files: []`,
        `  guard_results:`,
        `    - name: "npm run lint"`,
        `      exit_code: 0`,
        ``,
      ].join('\n')
    );
  }

  return { sid, dir };
}

/** spawnSync the Stop hook over stdin; returns parsed stdout JSON. */
function runHook(sid) {
  const payload = JSON.stringify({
    session_id: sid,
    stop_hook_active: false,
    hook_event_name: 'Stop',
  });
  const result = spawnSync('node', [HOOK], {
    input: payload,
    encoding: 'utf8',
    timeout: 15000,
    env: { ...process.env, ...hookEnv(), CAGENTS_ACTIVE_SESSION: '' },
  });
  if (result.status !== 0 && result.status !== null) {
    throw new Error(
      `Hook exited non-zero: status=${result.status}\nstdout=${result.stdout}\nstderr=${result.stderr}`
    );
  }
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(`Hook stdout not valid JSON: "${result.stdout}"\nstderr: ${result.stderr}`);
  }
}

function readRecheck(dir) {
  const p = join(dir, 'workflow', 'self_validation_recheck.yaml');
  if (!existsSync(p)) return null;
  return yaml.load(readFileSync(p, 'utf8'));
}

function readSummaryCounts(dir) {
  const p = join(dir, 'completion_summary.yaml');
  const doc = yaml.load(readFileSync(p, 'utf8'));
  return {
    issues: doc.verification_result.issues_count,
    warnings: doc.verification_result.warnings_count,
  };
}

describe('verify-completion.cjs self-validation recheck (C1 — advisory / WARN-only)', () => {
  afterEach(() => {
    while (created.length) {
      const d = created.pop();
      try {
        if (existsSync(d)) rmSync(d, { recursive: true, force: true });
      } catch {}
    }
  });

  it('good case — all claimed files exist and guards exit 0 => recheck reports 0 mismatches', () => {
    // svFilePath resolves relative to the session dir (workflow/plan.yaml exists);
    // guard exit_code 0. The outputs block also claims an existing file + exit 0.
    const { sid, dir } = makeSession('good', {
      svFilePath: 'workflow/plan.yaml',
      svExitCode: 0,
    });
    runHook(sid);

    const recheck = readRecheck(dir);
    expect(recheck).not.toBeNull();
    expect(recheck.advisory).toBe(true);
    expect(recheck.blocks_checked).toBe(2); // coord block + outputs block
    expect(recheck.file_claims_checked).toBe(2);
    expect(recheck.guard_claims_checked).toBe(2);
    expect(recheck.mismatch_count).toBe(0);
    // js-yaml renders `mismatches: []` as an empty array.
    expect(recheck.mismatches || []).toEqual([]);
  });

  it('bad case — a claimed file is missing and a guard exits 1 => recheck reports BOTH', () => {
    // svFilePath is a path that exists neither under the session dir nor the
    // project root => file_missing. guard exit_code 1 => guard_nonzero_exit.
    const { sid, dir } = makeSession('bad', {
      svFilePath: 'outputs/task-1/DOES_NOT_EXIST_c1recheck.ts',
      svExitCode: 1,
    });
    runHook(sid);

    const recheck = readRecheck(dir);
    expect(recheck).not.toBeNull();
    expect(recheck.blocks_checked).toBe(2);
    expect(recheck.mismatch_count).toBe(2);

    const types = recheck.mismatches.map((m) => m.type).sort();
    expect(types).toEqual(['file_missing', 'guard_nonzero_exit']);

    const fileMiss = recheck.mismatches.find((m) => m.type === 'file_missing');
    expect(fileMiss.path).toBe('outputs/task-1/DOES_NOT_EXIST_c1recheck.ts');
    expect(fileMiss.source).toBe('workflow/coordination_log.yaml');

    const guardMiss = recheck.mismatches.find((m) => m.type === 'guard_nonzero_exit');
    expect(guardMiss.exit_code).toBe(1);
    expect(guardMiss.guard).toBe('npm test');
    expect(guardMiss.source).toBe('workflow/coordination_log.yaml');
  });

  it('decision-unchanged — good (baseline) and bad sessions return a byte-identical, non-blocking decision', () => {
    const good = makeSession('baseline', { svFilePath: 'workflow/plan.yaml', svExitCode: 0 });
    const bad = makeSession('mismatch', {
      svFilePath: 'outputs/task-1/DOES_NOT_EXIST_c1recheck.ts',
      svExitCode: 1,
    });

    const goodDecision = runHook(good.sid);
    const badDecision = runHook(bad.sid);

    // Neither blocks (the recheck mismatches did NOT create a block).
    expect(goodDecision.decision).toBeUndefined();
    expect(badDecision.decision).toBeUndefined();

    // Byte-identical returned decision (recheck is purely additive; both sessions
    // are identical for every existing check, so the verdict is the same object).
    expect(badDecision).toEqual(goodDecision);

    // completion_summary warning/issue counts are identical — the recheck never
    // fed into issues[]/warnings[].
    const goodCounts = readSummaryCounts(good.dir);
    const badCounts = readSummaryCounts(bad.dir);
    expect(badCounts.issues).toBe(goodCounts.issues);
    expect(badCounts.warnings).toBe(goodCounts.warnings);

    // No recheck-derived text leaked into the decision-bearing output.
    const decisionJson = JSON.stringify(badDecision);
    expect(decisionJson).not.toMatch(/self_validation_recheck|DOES_NOT_EXIST|guard_nonzero_exit/);

    // Sanity: the recheck DID differ between the two (0 vs 2 mismatches) even
    // though the decision did not.
    expect(readRecheck(good.dir).mismatch_count).toBe(0);
    expect(readRecheck(bad.dir).mismatch_count).toBe(2);
  });

  it('no-op — a session with NO self_validation blocks writes no recheck file and does not block', () => {
    // No coord self_validation block and no outputs self-validation.yaml =>
    // recheck gathers 0 blocks => it is a pure no-op (writes nothing).
    const { sid, dir } = makeSession('noop', {
      svFilePath: null,
      svExitCode: null,
      outputsBlock: false,
    });
    const decision = runHook(sid);

    expect(decision.decision).toBeUndefined(); // not a block
    expect(existsSync(join(dir, 'workflow', 'self_validation_recheck.yaml'))).toBe(false);
  });
});

/**
 * REC-15 (v12.51.0) regression: session-catchup.cjs must sort candidate
 * incomplete sessions newest-first by DIRECTORY MTIME (not lexicographically by
 * dir name, where the slug dominated the date) AND skip test-fixture sessions so
 * stale vitest fixtures never pollute the resume offer / newest-active
 * resolution (the prompt-router consolidation footgun flake).
 *
 * Failing-before:
 *   - Ordering: `.sort().reverse()` ranked `team_zzz_260101` above the genuinely
 *     newer `run_aaa_260716` (reverse-lexicographic: 't' > 'r').
 *   - Fixture skip: there was no fixture filter, so `run_test-*` sessions appeared.
 *
 * The assertions read the untruncated `_system/incomplete_sessions.json` that
 * the hook writes (the additionalContext is char-budget-truncated), giving a
 * deterministic ordered session list.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'session-catchup.cjs');
const LIVENESS_MS = '200';

let TMP;
let SESSIONS_DIR;

/**
 * Create a resumable (non-terminal, non-live) session.
 * @param dirMtimeOffsetMs  offset applied to the DIRECTORY mtime (ranking key)
 */
function makeSession(sid, dirMtimeOffsetMs) {
  const dir = join(SESSIONS_DIR, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  writeFileSync(
    join(dir, 'instruction.yaml'),
    `session_id: ${sid}\nraw_request: "req ${sid}"\ncreated_at: "${new Date().toISOString()}"\ncommand: "/run"\n`
  );
  // status.yaml mtime old (>> liveness threshold) so the session is NOT live.
  const statusT = (Date.now() - 5000) / 1000;
  utimesSync(join(dir, 'status.yaml'), statusT, statusT);
  // DIRECTORY mtime = the ranking key (set LAST so file writes don't bump it).
  const dirT = (Date.now() + dirMtimeOffsetMs) / 1000;
  utimesSync(dir, dirT, dirT);
  return dir;
}

function runCatchup() {
  const res = spawnSync('node', [HOOK_PATH], {
    input: '{}',
    encoding: 'utf8',
    timeout: 8000,
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: TMP,
      VITEST: 'true',
      CAGENTS_HOOK_DEDUP_DISABLE: '1',
      CAGENTS_SESSION_LIVENESS_MS: LIVENESS_MS,
    },
  });
  expect(res.status, `hook stderr: ${res.stderr}`).toBe(0);
  const stateFile = join(TMP, 'cagents-memory', '_system', 'incomplete_sessions.json');
  expect(existsSync(stateFile), 'incomplete_sessions.json should be written').toBe(true);
  return JSON.parse(readFileSync(stateFile, 'utf8')).sessions.map((s) => s.session_id);
}

describe('REC-15: session-catchup mtime sort + fixture skip', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'rec15-'));
    SESSIONS_DIR = join(TMP, 'cagents-memory', 'sessions');
    mkdirSync(SESSIONS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('ranks the mtime-newer session first even when its name sorts lexicographically lower', () => {
    // team_zzz_* would win a reverse-lexicographic sort, but run_aaa_* is newer.
    // The `run_` prefix here is DELIBERATE and load-bearing on two counts: it is
    // the standing proof that the hook-utils SESSION_PREFIXES legacy-reader
    // carve-out still discovers pre-/act sessions (which are never renamed on
    // disk), and the historical REC-15 framing above depends on 't' > 'r'.
    // Do not sweep it to act_.
    makeSession('run_aaa_260716', -1000); // newer dir mtime
    makeSession('team_zzz_260101', -100000); // older dir mtime

    const order = runCatchup();
    expect(order).toContain('run_aaa_260716');
    expect(order).toContain('team_zzz_260101');
    expect(order.indexOf('run_aaa_260716')).toBeLessThan(order.indexOf('team_zzz_260101'));
  });

  it('skips test-fixture sessions but keeps legit slugs that merely contain "test"', () => {
    makeSession('act_test-demo_abc', -1000); // fixture token → skipped
    makeSession('team_fixture-seed_def', -1000); // fixture token → skipped
    makeSession('act_latest-report_260715', -2000); // "latest" ⊃ "test" but NOT a token → kept

    const order = runCatchup();
    expect(order).not.toContain('act_test-demo_abc');
    expect(order).not.toContain('team_fixture-seed_def');
    expect(order).toContain('act_latest-report_260715');
  });
});

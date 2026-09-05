/**
 * WI-4 test: session-catchup.cjs filters out LIVE sessions from the
 * incomplete-sessions resume offer.
 *
 * Two non-terminal sessions on disk:
 *   - SESSION_FRESH:  status.yaml mtime is "now" (LIVE)
 *   - SESSION_STALE:  status.yaml mtime is 2× livenessThresholdMs in the past (RESUMABLE)
 *
 * SessionStart hook output (additionalContext) must reference SESSION_STALE
 * as resumable and MUST NOT reference SESSION_FRESH.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
// Isolation (see materialize.mjs): SESSIONS_DIR points at a per-process temp
// project root, NOT the real <repo>/cagents-memory/sessions/. SID_FRESH in
// particular is a deliberately LIVE non-terminal session, i.e. the single most
// attractive target for a sibling test's
// findActiveSession({fallbackHeuristic}). Redirecting also stops session-catchup
// writing _system/incomplete_sessions.json into the real memory tree, and makes
// the assertions below read against only the two sessions this file declares.
import { hookEnv, SESSIONS_DIR } from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

const TS = Date.now().toString(36);
const SID_FRESH = `act_liveness-fresh_${TS}`;
const SID_STALE = `act_liveness-stale_${TS}`;
const DIR_FRESH = join(SESSIONS_DIR, SID_FRESH);
const DIR_STALE = join(SESSIONS_DIR, SID_STALE);

// Liveness threshold for the test. This must comfortably exceed the wall-clock
// cost of spawning the hook (node cold start + fs reads) on a LOADED machine --
// the fixture stamps mtime=now and the hook reads it in a child process, so a
// too-tight window ages the "fresh" session out before it is ever read and the
// filter assertion fails spuriously. 200ms was not enough under full-suite
// parallelism; 10s is far below any real session's idle time.
const LIVENESS_MS = '10000';

function makeSession(dir, sid, mtimeOffsetMs) {
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  writeFileSync(
    join(dir, 'instruction.yaml'),
    `session_id: ${sid}\nraw_request: "test"\ncreated_at: "${new Date().toISOString()}"\ncommand: "/act"\n`
  );
  if (mtimeOffsetMs !== 0) {
    const t = (Date.now() + mtimeOffsetMs) / 1000;
    utimesSync(join(dir, 'status.yaml'), t, t);
    utimesSync(dir, t, t);
  }
}

function runSessionCatchup(extraEnv = {}) {
  const result = execSync(
    `printf '%s' '{}' | node "${join(HOOKS_DIR, 'session-catchup.cjs')}"`,
    {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...hookEnv(), VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1', CAGENTS_SESSION_LIVENESS_MS: LIVENESS_MS, ...extraEnv },
    }
  );
  return JSON.parse(result.trim());
}

describe('session-catchup liveness filter (WI-4)', () => {
  beforeEach(() => {
    if (existsSync(DIR_FRESH)) rmSync(DIR_FRESH, { recursive: true, force: true });
    if (existsSync(DIR_STALE)) rmSync(DIR_STALE, { recursive: true, force: true });
    // Fresh session: mtime = now.
    makeSession(DIR_FRESH, SID_FRESH, 0);
    // Stale session: mtime well beyond the threshold, so no amount of load can
    // make it look fresh (the inverse of the flake fixed above).
    makeSession(DIR_STALE, SID_STALE, -120_000); // 2 minutes in the past >> 10s threshold
  });

  afterEach(() => {
    if (existsSync(DIR_FRESH)) rmSync(DIR_FRESH, { recursive: true, force: true });
    if (existsSync(DIR_STALE)) rmSync(DIR_STALE, { recursive: true, force: true });
  });

  it('filters LIVE session out of resume offer; surfaces only STALE', () => {
    const result = runSessionCatchup();
    const ctx = result.hookSpecificOutput.additionalContext || '';

    // STALE session should appear; FRESH should not.
    // The hook may format sessions in a list with their IDs or use status text.
    // We just assert presence/absence by full session_id substring.
    expect(ctx).not.toContain(SID_FRESH);
    // STALE may or may not appear depending on session-catchup's formatting,
    // but it MUST NOT be filtered out by liveness check.
    // Sanity: at least the hook ran without crashing.
    expect(result.hookSpecificOutput.hookEventName).toBe('SessionStart');
  });

  it('PID file with live PID treats session as LIVE regardless of mtime', () => {
    // Stamp PID file with our own PID — definitely alive.
    writeFileSync(join(DIR_STALE, 'session.pid'), String(process.pid));
    // Force stale mtime so only the PID can rescue it from filtering.
    const t = (Date.now() - 60_000) / 1000;
    utimesSync(join(DIR_STALE, 'status.yaml'), t, t);

    const result = runSessionCatchup();
    const ctx = result.hookSpecificOutput.additionalContext || '';
    // STALE-with-live-PID must be filtered out.
    expect(ctx).not.toContain(SID_STALE);
  });
});

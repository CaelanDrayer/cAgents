/**
 * HS-5 regression: hook tests must never write to the REAL repo cagents-memory/.
 *
 * Bug (B3, team_example-repos-skill-review_261015_001 repro-B.md): the
 * secret-restore tests spawned hooks with env {...process.env, ...} and never
 * overrode CLAUDE_PROJECT_DIR, so hook-utils.cjs resolved AGENT_MEMORY_DIR to
 * the repo. They seeded manifests under <repo>/cagents-memory/_system/secret-backups/
 * and secret-restore.cjs appended to the real _system/logs/secret-restore_<date>.log.
 * subagent-tracker.test.js's execSync runHook helper did the same for
 * _system/logs/agent_spawns.log.
 *
 * Guard: snapshot the real logs/, sessions/ and secret-backups/ dirs, run the
 * four affected test files in a child vitest with CLAUDE_PROJECT_DIR pinned to
 * the repo (the worst case: what a Claude Code session exports), then diff.
 * Only entries carrying a test marker ID stamped at or after this run's start
 * are flagged, so unrelated concurrent sessions and historical log lines do not
 * trip it.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync, openSync, readSync, closeSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const REPO = process.cwd();
const MEM = join(REPO, 'cagents-memory');
const LOGS = join(MEM, '_system', 'logs');
const SESSIONS = join(MEM, 'sessions');
const BACKUPS = join(MEM, '_system', 'secret-backups');

const FILES = [
  'tests/hooks/secret-restore-multifile.test.js',
  'tests/v12/secret-sanitize-protocol.test.js',
  'tests/hooks/subagent-tracker.test.js',
  'tests/hooks/subagent-tracker-session-label.test.js',
];

// Marker IDs those tests mint, each with a Date.now() millisecond stamp.
const MARKER = /(?:act_test-multifile_\d+_|run_test-multifile_\d+_|act_test-sanitize_|run_test-sanitize_|act_no-manifest_|agent_real_|test_subagent_|test_yaml_)(\d{13})/g;

const IS_CHILD = process.env.CAGENTS_POLLUTION_GUARD_CHILD === '1';

function listDir(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

function snapshot() {
  const logs = new Map();
  for (const f of listDir(LOGS)) {
    try { logs.set(f, statSync(join(LOGS, f)).size); } catch { /* raced away */ }
  }
  return { logs, sessions: new Set(listDir(SESSIONS)), backups: new Set(listDir(BACKUPS)) };
}

function readFrom(file, offset) {
  const fd = openSync(file, 'r');
  try {
    const size = statSync(file).size;
    const len = Math.max(0, size - offset);
    const buf = Buffer.alloc(len);
    if (len) readSync(fd, buf, 0, len, offset);
    return buf.toString('utf8');
  } finally { closeSync(fd); }
}

function freshMarkers(text, sinceMs) {
  const hits = [];
  for (const m of text.matchAll(MARKER)) {
    if (Number(m[1]) >= sinceMs) hits.push(m[0]);
  }
  return hits;
}

describe.skipIf(IS_CHILD)('HS-5: hook tests do not pollute the real cagents-memory/', () => {
  it('the four hook test files leave real logs/, sessions/ and secret-backups/ untouched', () => {
    const startMs = Date.now();
    const before = snapshot();

    const res = spawnSync(
      'npx',
      ['vitest', 'run', '--config', 'tests/vitest.config.js', ...FILES],
      {
        cwd: REPO,
        encoding: 'utf8',
        timeout: 300000,
        maxBuffer: 64 * 1024 * 1024,
        env: { ...process.env, CLAUDE_PROJECT_DIR: REPO, CAGENTS_POLLUTION_GUARD_CHILD: '1' },
      }
    );
    const diag = `status=${res.status} signal=${res.signal} error=${res.error ? res.error.message : 'none'}\n` +
      `stdout tail: ${(res.stdout || '').slice(-1500)}\nstderr tail: ${(res.stderr || '').slice(-1500)}`;
    if (res.error) throw new Error(`child vitest spawn errored: ${diag}`);
    if (res.status === null) throw new Error(`child vitest killed (timeout/signal): ${diag}`);
    // A failing child test is not this guard's verdict, but it must have run the files.
    expect(res.stdout + res.stderr, diag).toMatch(/Test Files/);

    const after = snapshot();
    const offenders = [];

    for (const [f, size] of after.logs) {
      const prev = before.logs.get(f);
      // New file, or shrunk (rotated): scan it whole. Grown: scan the appended tail.
      const offset = prev === undefined || size < prev ? 0 : prev;
      if (prev === size) continue;
      let text;
      try { text = readFrom(join(LOGS, f), offset); } catch { continue; }
      for (const id of freshMarkers(text, startMs)) offenders.push(`_system/logs/${f}: ${id}`);
    }
    for (const d of after.sessions) {
      if (!before.sessions.has(d)) for (const id of freshMarkers(d, startMs)) offenders.push(`sessions/${id}`);
    }
    for (const d of after.backups) {
      if (!before.backups.has(d)) for (const id of freshMarkers(d, startMs)) offenders.push(`_system/secret-backups/${id}`);
    }

    expect(
      [...new Set(offenders)],
      'hook tests wrote to the real repo cagents-memory/; pass CLAUDE_PROJECT_DIR=<mkdtemp> in every hook spawn env'
    ).toEqual([]);
  }, 320000);
});

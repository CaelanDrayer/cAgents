/**
 * Review round 1 on FU-9 (v12.77.0 follow-up).
 *
 * #3 readSessionState: handover_to null / ~ / empty is ABSENT, not a handover.
 * #4 session-catchup and team-stop use readSessionState, so a /designer session
 *    carrying handover_to is closed: never offered for resume, never idle.
 * #7 findActiveSession: a non-terminal sibling idle > 24 h no longer beats a
 *    brand-new session that has no status.yaml yet (grace window).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_UTILS = join(HOOKS_DIR, 'hook-utils.cjs');
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

function utilsFor(projectRoot) {
  process.env.CLAUDE_PROJECT_DIR = projectRoot;
  delete process.env.CAGENTS_ACTIVE_SESSION;
  delete require.cache[require.resolve(HOOK_UTILS)];
  const mod = require(HOOK_UTILS);
  mod._resetActiveSessionCache?.();
  return mod;
}

function session(root, id, files) {
  const dir = join(root, 'cagents-memory', 'sessions', id);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) writeFileSync(join(dir, rel), body);
  return dir;
}

let root;
const savedProj = process.env.CLAUDE_PROJECT_DIR;
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'cagents-rr1-')); });
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  if (savedProj === undefined) delete process.env.CLAUDE_PROJECT_DIR; else process.env.CLAUDE_PROJECT_DIR = savedProj;
});

describe('review r1 #3: readSessionState handover_to null-ish values', () => {
  it.each(['null', '~', '""', "''", ''])('handover_to: %s is absent (state stays non-terminal)', (v) => {
    const { readSessionState } = utilsFor(root);
    expect(readSessionState(`session_id: d\nphase: exploring\nhandover_to: ${v}\n`)).toBe('exploring');
  });
  it('a real handover_to id still closes the session', () => {
    const { readSessionState } = utilsFor(root);
    expect(readSessionState('session_id: d\nphase: exploring\nhandover_to: act_x_261016_001\n')).toBe('complete');
  });
});

describe('review r1 #4: handover-aware readers in session-catchup and team-stop', () => {
  const designerStatus = 'session_id: designer_rr1-ho_261016_001\nphase: exploring\nhandover_to: act_rr1-target_261016_001\n';
  const inst = (sid) => `session_id: ${sid}\nraw_request: "design a thing"\ncreated_at: "${iso(3 * 3600e3)}"\ncommand: "/designer"\n`;

  function runCatchup() {
    const env = { ...process.env, CLAUDE_PROJECT_DIR: root, VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1', CAGENTS_SESSION_LIVENESS_MS: '1' };
    delete env.CAGENTS_ACTIVE_SESSION;
    const r = spawnSync('node', [join(HOOKS_DIR, 'session-catchup.cjs')], { input: '{}', encoding: 'utf8', timeout: 60000, env });
    if (r.error || r.status === null) throw new Error(`hook did not finish: ${r.error && r.error.message}`);
    JSON.parse(r.stdout.trim()); // valid hook output
    // The resume offer the hook detected (additionalContext may be truncated).
    return readFileSync(join(root, 'cagents-memory', '_system', 'incomplete_sessions.json'), 'utf8');
  }

  it('session-catchup does not offer a handed-over designer session for resume', () => {
    session(root, 'designer_rr1-ho_261016_001', { 'status.yaml': designerStatus, 'instruction.yaml': inst('designer_rr1-ho_261016_001') });
    session(root, 'designer_rr1-open_261016_002', {
      'status.yaml': 'session_id: designer_rr1-open_261016_002\nphase: exploring\nhandover_to: null\n',
      'instruction.yaml': inst('designer_rr1-open_261016_002'),
    });
    const out = runCatchup();
    expect(out).not.toContain('designer_rr1-ho_261016_001');
    expect(out).toContain('designer_rr1-open_261016_002'); // control: null handover is still resumable
  });

  it('team-stop teamIdleBetweenWaves: handover_to closes the session (not idle)', () => {
    const sid = 'team_rr1-ho_261016_001';
    const dir = session(root, sid, { 'status.yaml': `session_id: ${sid}\nphase: executing\nhandover_to: act_rr1_261016_001\n` });
    mkdirSync(join(dir, 'workflow', 'gate_validations'), { recursive: true });
    writeFileSync(join(dir, 'workflow', 'gate_validations', 'wave_1.yaml'), 'overall: PASS\n');
    writeFileSync(join(dir, 'workflow', 'work_meta.yaml'), 'waves:\n  - wave: 1\n  - wave: 2\n');
    const prior = process.env.CAGENTS_DISPATCH_IMPORT;
    process.env.CAGENTS_DISPATCH_IMPORT = '1';
    try {
      utilsFor(root);
      delete require.cache[require.resolve(join(HOOKS_DIR, 'team-stop.cjs'))];
      const { teamIdleBetweenWaves } = require(join(HOOKS_DIR, 'team-stop.cjs'));
      // Control: without handover_to the same fixture IS idle between waves.
      expect(teamIdleBetweenWaves(dir, `session_id: ${sid}\nphase: executing\n`)).toBeTruthy();
      expect(teamIdleBetweenWaves(dir, `session_id: ${sid}\nphase: executing\nhandover_to: act_rr1_261016_001\n`)).toBe(false);
    } finally {
      if (prior === undefined) delete process.env.CAGENTS_DISPATCH_IMPORT; else process.env.CAGENTS_DISPATCH_IMPORT = prior;
    }
  });
});

describe('review r1 #7: findActiveSession prefers a grace-window session over an abandoned sibling', () => {
  it('abandoned PLANNED sibling (>24 h idle) loses to a fresh session with no status.yaml', () => {
    session(root, 'act_rr1-abandoned_261016_009', {
      'status.yaml': `session_id: a\npipeline_state: PLANNED\nstarted_at: "${iso(50 * 3600e3)}"\nlast_updated_at: "${iso(30 * 3600e3)}"\n`,
    });
    const fresh = session(root, 'act_rr1-fresh_261016_001', { 'instruction.yaml': 'session_id: f\nraw_request: "x"\n' });
    const u = utilsFor(root);
    expect(u.findActiveSession({ fallbackHeuristic: true })).toBe(fresh);
  });

  it('with no grace-window session, the abandoned sibling is still returned (fallback kept)', () => {
    const old = session(root, 'act_rr1-abandoned_261016_009', {
      'status.yaml': `session_id: a\npipeline_state: PLANNED\nstarted_at: "${iso(50 * 3600e3)}"\nlast_updated_at: "${iso(30 * 3600e3)}"\n`,
    });
    const u = utilsFor(root);
    expect(u.findActiveSession({ fallbackHeuristic: true })).toBe(old);
  });

  it('a recently active non-terminal session still wins the first pass', () => {
    const live = session(root, 'act_rr1-live_261016_001', {
      'status.yaml': `session_id: l\npipeline_state: PLANNED\nlast_updated_at: "${iso(3600e3)}"\n`,
    });
    session(root, 'act_rr1-fresh_261016_002', { 'instruction.yaml': 'session_id: f\nraw_request: "x"\n' });
    const u = utilsFor(root);
    expect(u.findActiveSession({ fallbackHeuristic: true })).toBe(live);
  });
});

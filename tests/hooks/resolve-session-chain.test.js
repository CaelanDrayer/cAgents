/**
 * HS-1 (team_hook-session-fixes_261015_001, WI-7): ONE session resolver.
 *
 * hook-utils resolveSession(input, {purpose}) chain:
 *   (1) the session the transcript UUID OWNS (map pointer, then marker)
 *   (2) an explicit SESSION_DIR in tool_input.prompt (claimed when claimHint)
 *   (3) CAGENTS_ACTIVE_SESSION (or an explicit non-UUID session_id pin)
 *   (4) null. Never the newest session when 2+ sessions are live.
 * Plus claimFromAnyWrite: PostToolUse Bash `cat > sessions/<id>/status.yaml`
 * claims the session (the circular-bootstrap fix), and the PostToolUse
 * matcher includes Bash in both settings.json and hooks.json.
 *
 * Isolation: CLAUDE_PROJECT_DIR points at a per-test mkdtemp dir before
 * hook-utils loads. Nothing touches the real cagents-memory/.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

const UUID_A = 'aaaaaaaa-1111-2222-3333-444444444444';
const UUID_B = 'bbbbbbbb-1111-2222-3333-444444444444';

function freshHookUtils() {
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

function makeSession(sessionsDir, sid, { terminal = false, owner, mtimeOffsetSec = 0 } = {}) {
  const dir = join(sessionsDir, sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), terminal
    ? `session_id: ${sid}\nphase: completed\npipeline_state: VALIDATED\n`
    : `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATED\n`);
  if (owner) writeFileSync(join(dir, 'session.sdk_id'), owner);
  if (mtimeOffsetSec) {
    const t = Date.now() / 1000 + mtimeOffsetSec;
    utimesSync(dir, t, t);
  }
  return dir;
}

describe('resolveSession chain (HS-1)', () => {
  let utils;
  let tmpRoot;
  let sessionsDir;
  let prevProjectDir;
  let prevEnv;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-resolve-chain-'));
    sessionsDir = join(tmpRoot, 'cagents-memory', 'sessions');
    mkdirSync(sessionsDir, { recursive: true });
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
    prevEnv = process.env.CAGENTS_ACTIVE_SESSION;
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;
    delete process.env.CAGENTS_ACTIVE_SESSION;
    utils = freshHookUtils();
    utils._resetActiveSessionCache();
  });

  afterEach(() => {
    if (prevEnv === undefined) delete process.env.CAGENTS_ACTIVE_SESSION;
    else process.env.CAGENTS_ACTIVE_SESSION = prevEnv;
    if (prevProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  function writePointer(uuid, sid) {
    const mapDir = utils._sdkMapDir();
    mkdirSync(mapDir, { recursive: true });
    writeFileSync(join(mapDir, uuid), sid);
  }

  it('exports the HS-1/HS-6 helpers', () => {
    for (const k of ['resolveSession', 'claimFromAnyWrite', 'statusPhase', 'updateYamlLocked', 'writeFileAtomic', 'fallbackAgentId']) {
      expect(typeof utils[k], k).toBe('function');
    }
  });

  it('(1) owned pointer beats prompt SESSION_DIR and env', () => {
    const owned = makeSession(sessionsDir, 'act_owned_261015_001', { owner: UUID_A });
    writePointer(UUID_A, 'act_owned_261015_001');
    const hinted = makeSession(sessionsDir, 'act_hinted_261015_002');
    makeSession(sessionsDir, 'act_env_261015_003');
    process.env.CAGENTS_ACTIVE_SESSION = 'act_env_261015_003';
    const input = { session_id: UUID_A, tool_input: { prompt: `SESSION_DIR=${hinted}\ngo` } };
    expect(utils.resolveSession(input)).toBe(owned);
  });

  it('(1) a marker alone (no pointer) is ownership', () => {
    const owned = makeSession(sessionsDir, 'act_marker_261015_001', { owner: UUID_A });
    expect(utils.resolveSession({ session_id: UUID_A })).toBe(owned);
  });

  it('(2) prompt SESSION_DIR beats env, and the hint is claimed', () => {
    const hinted = makeSession(sessionsDir, 'team_hinted_261015_002');
    makeSession(sessionsDir, 'act_env_261015_003');
    process.env.CAGENTS_ACTIVE_SESSION = 'act_env_261015_003';
    const input = { session_id: UUID_A, tool_input: { prompt: `SESSION_DIR=${hinted}\ngo` } };
    expect(utils.resolveSession(input)).toBe(hinted);
    expect(readFileSync(join(hinted, 'session.sdk_id'), 'utf8').trim()).toBe(UUID_A);
  });

  it('(2) claimHint:false resolves the hint without claiming it', () => {
    const hinted = makeSession(sessionsDir, 'team_noclaim_261015_002');
    const input = { session_id: UUID_A, tool_input: { prompt: `SESSION_DIR=${hinted}` } };
    expect(utils.resolveSession(input, { claimHint: false })).toBe(hinted);
    expect(existsSync(join(hinted, 'session.sdk_id'))).toBe(false);
  });

  it('(2) a prompt hint outside AGENT_MEMORY_DIR/sessions is rejected (absolute-root rule)', () => {
    const elsewhere = join(tmpRoot, 'other', 'act_rogue_261015_001');
    mkdirSync(elsewhere, { recursive: true });
    writeFileSync(join(elsewhere, 'status.yaml'), 'phase: executing\n');
    const input = { session_id: UUID_A, tool_input: { prompt: `SESSION_DIR=${elsewhere}` } };
    expect(utils.resolveSession(input)).toBeNull();
  });

  it('(2) a prompt hint naming a foreign-owned session is ignored', () => {
    const foreign = makeSession(sessionsDir, 'team_theirs_261015_001', { owner: UUID_B });
    const input = { session_id: UUID_A, tool_input: { prompt: `SESSION_DIR=${foreign}` } };
    expect(utils.resolveSession(input)).toBeNull();
    expect(readFileSync(join(foreign, 'session.sdk_id'), 'utf8').trim()).toBe(UUID_B);
  });

  it('(3) env is used when nothing is owned or hinted', () => {
    const envDir = makeSession(sessionsDir, 'act_env_261015_003');
    process.env.CAGENTS_ACTIVE_SESSION = 'act_env_261015_003';
    expect(utils.resolveSession({ session_id: UUID_A })).toBe(envDir);
  });

  it('(3) an env session owned by another transcript is dropped', () => {
    makeSession(sessionsDir, 'act_env-foreign_261015_003', { owner: UUID_B });
    process.env.CAGENTS_ACTIVE_SESSION = 'act_env-foreign_261015_003';
    expect(utils.resolveSession({ session_id: UUID_A })).toBeNull();
  });

  it('(4) null with no owner, hint or env', () => {
    makeSession(sessionsDir, 'act_lonely_261015_001');
    expect(utils.resolveSession({ session_id: UUID_A })).toBeNull();
  });

  it('(4) two live sessions, nothing owned: null, never the newest one', () => {
    makeSession(sessionsDir, 'team_older_261015_001', { mtimeOffsetSec: -600 });
    makeSession(sessionsDir, 'team_newer_261015_002', { mtimeOffsetSec: 0 });
    expect(utils.resolveSession({ session_id: UUID_A })).toBeNull();
    expect(utils.resolveSession({})).toBeNull();
    expect(utils.resolveSession({ session_id: UUID_A }, { purpose: 'gate' })).toBeNull();
    // findTeamSession's unpinned last resort also refuses to pick one of two.
    expect(utils.findTeamSession({})).toBeNull();
  });

  it("purpose 'record' files into a terminal owned session; 'gate' does not count it", () => {
    const owned = makeSession(sessionsDir, 'act_done_261015_001', { owner: UUID_A, terminal: true });
    writePointer(UUID_A, 'act_done_261015_001');
    expect(utils.resolveSession({ session_id: UUID_A }, { purpose: 'record' })).toBe(owned);
    expect(utils.resolveSession({ session_id: UUID_A }, { purpose: 'gate' })).toBeNull();
  });

  it('claimFromAnyWrite: a Bash `cat >` of status.yaml claims the session (circular-bootstrap fix)', () => {
    const dir = makeSession(sessionsDir, 'team_bash-made_261015_001');
    expect(utils.resolveSession({ session_id: UUID_A })).toBeNull();
    const claimed = utils.claimFromAnyWrite({
      session_id: UUID_A, tool_name: 'Bash', cwd: tmpRoot,
      tool_input: { command: `S=${dir}; cat > $S/status.yaml <<'EOF'\nphase: executing\nEOF` },
    });
    expect(claimed).toEqual([dir]);
    expect(utils.resolveSession({ session_id: UUID_A })).toBe(dir);
  });

  it('claimFromAnyWrite: a plain `cat` read does not claim; a foreign session is never taken', () => {
    const dir = makeSession(sessionsDir, 'team_read-only_261015_001');
    expect(utils.claimFromAnyWrite({ session_id: UUID_A, tool_name: 'Bash', tool_input: { command: `cat ${dir}/status.yaml` } })).toEqual([]);
    const foreign = makeSession(sessionsDir, 'team_foreign_261015_002', { owner: UUID_B });
    expect(utils.claimFromAnyWrite({ session_id: UUID_A, tool_name: 'Bash', tool_input: { command: `echo x >> ${foreign}/status.yaml` } })).toEqual([]);
    expect(readFileSync(join(foreign, 'session.sdk_id'), 'utf8').trim()).toBe(UUID_B);
  });

  // WI-7 review F1: only a write TARGET claims, never a path that is only read.
  const bash = (command) => utils.claimFromAnyWrite({ session_id: UUID_A, tool_name: 'Bash', cwd: tmpRoot, tool_input: { command } });
  it.each([
    ['2>/dev/null on a read', (S) => `cat ${S}/status.yaml 2>/dev/null`],
    ['>/dev/null on a grep', (S) => `grep phase ${S}/status.yaml > /dev/null`],
    ['diff output redirected elsewhere', (S) => `diff ${S}/status.yaml /tmp/a > out.txt`],
    ['tee to another file', (S) => `cat ${S}/status.yaml | tee other.log`],
    ['cp with the yaml as SOURCE', (S) => `cp ${S}/status.yaml backup/`],
    ['&> to another file', (S) => `cat ${S}/instruction.yaml &> log.txt`],
  ])('Bash negative (F1): %s does not claim', (_name, mk) => {
    const dir = makeSession(sessionsDir, 'team_neg-claim_261015_001');
    expect(bash(mk(dir))).toEqual([]);
    expect(existsSync(join(dir, 'session.sdk_id'))).toBe(false);
  });

  it.each([
    ['> redirect target', (S) => `S=${S}; printf 'phase: x\\n' > $S/status.yaml`],
    ['>> append target', (S) => `echo 'phase: x' >> ${S}/status.yaml`],
    ['tee target', (S) => `echo 'phase: x' | tee ${S}/status.yaml`],
    ['tee -a target after another file', (S) => `echo x | tee -a other.log ${S}/instruction.yaml`],
    ['cp destination', (S) => `cp /tmp/x ${S}/status.yaml`],
    ['mv destination', (S) => `mv -f /tmp/x ${S}/status.yaml`],
  ])('Bash positive (F1): %s claims', (_name, mk) => {
    const dir = makeSession(sessionsDir, 'team_pos-claim_261015_001');
    // PostToolUse runs after the write, so the target must exist (R2-1).
    writeFileSync(join(dir, 'instruction.yaml'), 'request: x\n');
    expect(bash(mk(dir))).toEqual([dir]);
  });

  it('Bash claim honors SESSION_PREFIXES (F2)', () => {
    const odd = join(sessionsDir, 'scratch_not-a-session');
    mkdirSync(odd, { recursive: true });
    writeFileSync(join(odd, 'status.yaml'), 'phase: x\n');
    expect(bash(`echo y > ${odd}/status.yaml`)).toEqual([]);
  });

  it('allowEnv:false skips the CAGENTS_ACTIVE_SESSION rung (F4, SessionEnd)', () => {
    const envDir = makeSession(sessionsDir, 'act_env-only_261015_003');
    process.env.CAGENTS_ACTIVE_SESSION = 'act_env-only_261015_003';
    expect(utils.resolveSession({ session_id: UUID_A })).toBe(envDir);
    expect(utils.resolveSession({ session_id: UUID_A }, { allowEnv: false })).toBeNull();
  });

  it('withFileLock runs fn once under the lock; a throw is not re-run unlocked (F5)', () => {
    const f = join(tmpRoot, 'lock-target.txt');
    let calls = 0;
    expect(() => utils.withFileLock(f, () => { calls++; throw new Error('boom'); })).toThrow('boom');
    expect(calls).toBe(1);
    expect(existsSync(`${f}.lock`)).toBe(false);
  });

  it('claimFromAnyWrite: Write of instruction.yaml and an Agent prompt SESSION_DIR both claim', () => {
    const a = makeSession(sessionsDir, 'act_write-made_261015_001');
    expect(utils.claimFromAnyWrite({ session_id: UUID_A, tool_name: 'Write', tool_input: { file_path: join(a, 'instruction.yaml') } })).toEqual([a]);
    const b = makeSession(sessionsDir, 'team_prompt-made_261015_002');
    expect(utils.claimFromAnyWrite({ session_id: UUID_B, tool_name: 'Agent', tool_input: { prompt: `SESSION_DIR=${b}` } })).toEqual([b]);
  });

  it('post-write-validator claims on PostToolUse Bash end to end', () => {
    const dir = makeSession(sessionsDir, 'team_hook-claim_261015_001');
    const r = spawnSync('node', [join(HOOKS_DIR, 'post-write-validator.cjs')], {
      input: JSON.stringify({ hook_event_name: 'PostToolUse', session_id: UUID_A, tool_name: 'Bash', cwd: tmpRoot,
        tool_input: { command: `printf 'phase: executing\\n' > ${dir}/status.yaml` } }),
      encoding: 'utf8', timeout: 60000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot, TMPDIR: tmpRoot, CAGENTS_ACTIVE_SESSION: '' },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(join(dir, 'session.sdk_id'), 'utf8').trim()).toBe(UUID_A);
  });
});

describe('PostToolUse matcher includes Bash (HS-1)', () => {
  for (const rel of ['.claude/settings.json', '.claude/hooks.json']) {
    it(`${rel}: a PostToolUse Bash matcher runs post-write-validator`, () => {
      const j = JSON.parse(readFileSync(join(PROJECT_ROOT, rel), 'utf8'));
      const groups = (j.hooks || j).PostToolUse || [];
      const bash = groups.filter(g => typeof g.matcher === 'string' && g.matcher.split('|').includes('Bash'));
      expect(bash.length).toBeGreaterThan(0);
      expect(bash.some(g => g.hooks.some(h => /post-write-validator/.test(h.command)))).toBe(true);
    });
  }
});

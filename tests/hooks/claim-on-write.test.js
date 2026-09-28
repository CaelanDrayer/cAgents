/**
 * Claim-on-write (act_concurrent-session-hooks_260927_001, WI-2).
 *
 * A PostToolUse Write|Edit of sessions/{sid}/status.yaml or instruction.yaml
 * claims an unclaimed session for the payload UUID. A session owned by another
 * UUID is never stolen. upsertSdkSessionMap follows the same rule.
 *
 * Isolation: CLAUDE_PROJECT_DIR points at a per-test temp dir, for both the
 * spawned hook and the in-process hook-utils.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'post-write-validator.cjs');

const UUID_A = 'aaaaaaaa-1111-2222-3333-444444444444';
const UUID_B = 'bbbbbbbb-1111-2222-3333-444444444444';
const SID = 'act_x_260927_001';

function freshHookUtils() {
  delete require.cache[require.resolve(join(HOOKS_DIR, 'hook-utils.cjs'))];
  return require(join(HOOKS_DIR, 'hook-utils.cjs'));
}

describe('claim-on-write (WI-2)', () => {
  let tmpRoot;
  let sessionDir;
  let markerPath;
  let mapDir;
  let prevProjectDir;

  function fire(uuid, filePath) {
    const res = spawnSync('node', [HOOK_PATH], {
      input: JSON.stringify({
        hook_event_name: 'PostToolUse',
        session_id: uuid,
        cwd: tmpRoot,
        tool_name: 'Write',
        tool_input: { file_path: filePath },
      }),
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot, CAGENTS_ACTIVE_SESSION: '' },
    });
    if (res.error) throw res.error;
    expect(res.status).toBe(0);
    expect(JSON.parse(res.stdout.trim()).continue).toBe(true);
  }

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-claim-'));
    sessionDir = join(tmpRoot, 'cagents-memory', 'sessions', SID);
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
    writeFileSync(join(sessionDir, 'status.yaml'), `session_id: ${SID}\nphase: coordinating\npipeline_state: COORDINATED\n`);
    writeFileSync(join(sessionDir, 'instruction.yaml'), `session_id: ${SID}\nrequest: test\n`);
    writeFileSync(join(sessionDir, 'workflow', 'plan.yaml'), 'objectives: []\n');
    markerPath = join(sessionDir, 'session.sdk_id');
    mapDir = join(tmpRoot, 'cagents-memory', '_system', 'sdk_session_map');
    prevProjectDir = process.env.CLAUDE_PROJECT_DIR;
  });

  afterEach(() => {
    if (prevProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
    else process.env.CLAUDE_PROJECT_DIR = prevProjectDir;
    if (tmpRoot && existsSync(tmpRoot)) rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('(a) a status.yaml write claims an unclaimed session and seeds the map pointer', () => {
    fire(UUID_A, join(sessionDir, 'status.yaml'));
    expect(readFileSync(markerPath, 'utf8').trim()).toBe(UUID_A);
    expect(readFileSync(join(mapDir, UUID_A), 'utf8').trim()).toBe(SID);
  });

  it('(b) a later write by another UUID does not steal the session', () => {
    fire(UUID_A, join(sessionDir, 'status.yaml'));
    fire(UUID_B, join(sessionDir, 'status.yaml'));
    expect(readFileSync(markerPath, 'utf8').trim()).toBe(UUID_A);
    expect(existsSync(join(mapDir, UUID_B))).toBe(false);
  });

  it('(c) an instruction.yaml write also claims', () => {
    fire(UUID_A, join(sessionDir, 'instruction.yaml'));
    expect(readFileSync(markerPath, 'utf8').trim()).toBe(UUID_A);
    expect(readFileSync(join(mapDir, UUID_A), 'utf8').trim()).toBe(SID);
  });

  it('(c2) a relative file_path resolves against the payload cwd', () => {
    fire(UUID_A, join('cagents-memory', 'sessions', SID, 'status.yaml'));
    expect(readFileSync(markerPath, 'utf8').trim()).toBe(UUID_A);
  });

  it('(d) a write to workflow/plan.yaml does not claim', () => {
    fire(UUID_A, join(sessionDir, 'workflow', 'plan.yaml'));
    expect(existsSync(markerPath)).toBe(false);
    expect(existsSync(join(mapDir, UUID_A))).toBe(false);
  });

  it('(e) upsertSdkSessionMap with another UUID leaves an owned marker unchanged', () => {
    process.env.CLAUDE_PROJECT_DIR = tmpRoot;
    const utils = freshHookUtils();
    writeFileSync(markerPath, UUID_A);
    utils.upsertSdkSessionMap(UUID_B, sessionDir);
    expect(readFileSync(markerPath, 'utf8').trim()).toBe(UUID_A);
    expect(existsSync(join(mapDir, UUID_B))).toBe(false);

    // The owner still refreshes its own map pointer.
    utils.upsertSdkSessionMap(UUID_A, sessionDir);
    expect(readFileSync(join(mapDir, UUID_A), 'utf8').trim()).toBe(SID);
  });
});

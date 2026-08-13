/**
 * REC-14 (v12.51.0) regression: model-routing-advisor.cjs must (a) stamp each
 * delegation_audit.log line with the resolving session id, (b) rotate the log at
 * 1MB like the other cAgents logs, and (c) skip no-signal rows (empty desc AND
 * default model) that previously bloated the un-rotated log.
 *
 * Failing-before: the pre-fix line had NO `session=` field and the log never
 * rotated (it was the only un-rotated cAgents log — 756K / 6911 lines and
 * growing) and logged every spawn regardless of diagnostic value.
 *
 * Isolation: CLAUDE_PROJECT_DIR → temp so AGENT_MEMORY_DIR / the logs dir are
 * isolated from the real repo cagents-memory/.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'model-routing-advisor.cjs');
const SDK_UUID = 'abcdef12-3456-7890-abcd-ef1234567890';

let TMP;
let LOGS_DIR;
let LOG_FILE;

function makeSession(root, sid) {
  const dir = join(root, 'cagents-memory', 'sessions', sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  return dir;
}

function fire(toolInput, extraEnv) {
  return spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify({ tool_name: 'Task', tool_input: toolInput, session_id: SDK_UUID }),
    encoding: 'utf8',
    timeout: 8000,
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: TMP,
      VITEST: 'true',
      CAGENTS_HOOK_DEDUP_DISABLE: '1',
      ...extraEnv,
    },
  });
}

describe('REC-14: delegation_audit.log rotation + session stamp + no-signal skip', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'rec14-'));
    LOGS_DIR = join(TMP, 'cagents-memory', '_system', 'logs');
    LOG_FILE = join(LOGS_DIR, 'delegation_audit.log');
  });

  afterEach(() => {
    if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('stamps the resolving session id (session=<basename>)', () => {
    const sid = `act_rec14sess_${Date.now().toString(36)}`;
    makeSession(TMP, sid);
    const res = fire(
      { subagent_type: 'cagents:backend-developer', model: 'sonnet', description: 'implement the auth module' },
      { CAGENTS_ACTIVE_SESSION: sid }
    );
    expect(res.status, `hook stderr: ${res.stderr}`).toBe(0);

    expect(existsSync(LOG_FILE)).toBe(true);
    const log = readFileSync(LOG_FILE, 'utf8').trim();
    const last = log.split('\n').pop();
    expect(last).toContain(`session=${sid}`);
    expect(last).toContain('agent=backend-developer');
  });

  it('rotates the log when it exceeds 1MB', () => {
    // Pre-seed an oversized log (>1MB).
    mkdirSync(LOGS_DIR, { recursive: true });
    writeFileSync(LOG_FILE, 'x'.repeat(1024 * 1024 + 100));
    const beforeSize = statSync(LOG_FILE).size;
    expect(beforeSize).toBeGreaterThan(1024 * 1024);

    const sid = `act_rec14rot_${Date.now().toString(36)}`;
    makeSession(TMP, sid);
    const res = fire(
      { subagent_type: 'cagents:backend-developer', model: 'sonnet', description: 'trigger rotation' },
      { CAGENTS_ACTIVE_SESSION: sid }
    );
    expect(res.status, `hook stderr: ${res.stderr}`).toBe(0);

    // A dated rotated file now exists, and the live log is small (just the new line).
    const rotated = readdirSync(LOGS_DIR).filter((f) => /^delegation_audit_\d{4}-\d{2}-\d{2}\.log$/.test(f));
    expect(rotated.length).toBe(1);
    expect(statSync(join(LOGS_DIR, rotated[0])).size).toBeGreaterThan(1024 * 1024);
    expect(statSync(LOG_FILE).size).toBeLessThan(1024 * 1024);
    expect(readFileSync(LOG_FILE, 'utf8')).toContain(`session=${sid}`);
  });

  it('skips no-signal rows (empty desc AND default model)', () => {
    const sid = `act_rec14skip_${Date.now().toString(36)}`;
    makeSession(TMP, sid);
    // Empty description, no model → no diagnostic signal → skipped.
    const res = fire(
      { subagent_type: 'cagents:backend-developer', description: '' },
      { CAGENTS_ACTIVE_SESSION: sid }
    );
    expect(res.status, `hook stderr: ${res.stderr}`).toBe(0);

    const lines = existsSync(LOG_FILE)
      ? readFileSync(LOG_FILE, 'utf8').split('\n').filter((l) => l.includes('SPAWN'))
      : [];
    expect(lines.length).toBe(0);

    // A subsequent signal-bearing spawn IS logged.
    const res2 = fire(
      { subagent_type: 'cagents:backend-developer', model: 'sonnet', description: 'real work' },
      { CAGENTS_ACTIVE_SESSION: sid }
    );
    expect(res2.status).toBe(0);
    const lines2 = readFileSync(LOG_FILE, 'utf8').split('\n').filter((l) => l.includes('SPAWN'));
    expect(lines2.length).toBe(1);
  });
});

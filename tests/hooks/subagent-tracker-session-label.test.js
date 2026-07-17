/**
 * REC-10 (v12.51.0) regression: subagent-tracker.cjs must log the RESOLVED
 * session basename (a human-readable run_slug_date) in the global
 * agent_spawns.log, plus a short SDK-UUID tail for correlation — NOT the raw
 * full SDK transcript UUID that arrives as input.session_id.
 *
 * Failing-before: the pre-fix line was `session=<full-uuid>` with no sdk_uuid
 * field, so `session=run_...` was absent and the audit trail was un-greppable
 * by cAgents session id.
 *
 * Isolation: CLAUDE_PROJECT_DIR is pointed at a fresh temp dir so AGENT_MEMORY_DIR
 * (and thus the sessions dir + agent_spawns.log) is fully isolated from the real
 * repo cagents-memory/.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'subagent-tracker.cjs');

const SDK_UUID = 'abcdef12-3456-7890-abcd-ef1234567890';
const SDK_TAIL = SDK_UUID.slice(-8); // ef1234567890 -> last 8 = "34567890"

let TMP;
let SID;

function makeSession(root, sid) {
  const dir = join(root, 'cagents-memory', 'sessions', sid);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(
    join(dir, 'status.yaml'),
    `session_id: ${sid}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  writeFileSync(join(dir, 'workflow', 'agent_tree.yaml'), `schema_version: "1"\nagents: []\n`);
  return dir;
}

function fire(input, extraEnv) {
  return spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(input),
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

describe('REC-10: subagent-tracker global audit log session label', () => {
  beforeEach(() => {
    TMP = mkdtempSync(join(tmpdir(), 'rec10-'));
    SID = `run_rec10sess_${Date.now().toString(36)}`;
    makeSession(TMP, SID);
  });

  afterEach(() => {
    if (TMP && existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('logs session=<basename> + sdk_uuid=<tail>, never the raw full UUID', () => {
    const agentId = `agent_rec10_${Date.now().toString(36)}`;
    const res = fire(
      { session_id: SDK_UUID, agent_type: 'cagents:backend-developer', agent_id: agentId },
      // env resolves the UUID payload to the real session via CAGENTS_ACTIVE_SESSION.
      { CAGENTS_ACTIVE_SESSION: SID }
    );
    expect(res.status, `hook stderr: ${res.stderr}`).toBe(0);

    const logFile = join(TMP, 'cagents-memory', '_system', 'logs', 'agent_spawns.log');
    expect(existsSync(logFile)).toBe(true);
    const log = readFileSync(logFile, 'utf8');
    const line = log.split('\n').find((l) => l.includes(agentId));
    expect(line, 'audit line for the agent should exist').toBeTruthy();

    // RESOLVED session basename present.
    expect(line).toContain(`session=${SID}`);
    // Short SDK-UUID tail present for correlation.
    expect(line).toContain(`sdk_uuid=${SDK_TAIL}`);
    // The raw full UUID must NOT be the session label (the pre-fix behavior).
    expect(line).not.toContain(`session=${SDK_UUID}`);
  });

  it('falls back to the raw session_id when no session resolves (never bare unknown)', () => {
    // No CAGENTS_ACTIVE_SESSION and a non-resolvable session dir → sessionDir null.
    // With no session dirs at all the fallback label is the UUID, tail still short.
    const emptyRoot = mkdtempSync(join(tmpdir(), 'rec10-empty-'));
    mkdirSync(join(emptyRoot, 'cagents-memory', 'sessions'), { recursive: true });
    const agentId = `agent_rec10b_${Date.now().toString(36)}`;
    const res = spawnSync('node', [HOOK_PATH], {
      input: JSON.stringify({ session_id: SDK_UUID, agent_type: 'cagents:reviewer', agent_id: agentId }),
      encoding: 'utf8',
      timeout: 8000,
      env: { ...process.env, CLAUDE_PROJECT_DIR: emptyRoot, VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1' },
    });
    expect(res.status).toBe(0);
    const log = readFileSync(join(emptyRoot, 'cagents-memory', '_system', 'logs', 'agent_spawns.log'), 'utf8');
    const line = log.split('\n').find((l) => l.includes(agentId));
    expect(line).toBeTruthy();
    // Fallback: session label is the UUID (no cAgents session to resolve), tail still present.
    expect(line).toContain(`sdk_uuid=${SDK_TAIL}`);
    rmSync(emptyRoot, { recursive: true, force: true });
  });
});

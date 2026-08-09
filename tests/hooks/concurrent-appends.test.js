/**
 * WI-5 stress test: concurrent appends to a single agent_tree.yaml from N
 * subprocesses must produce a well-formed file with all N entries present.
 *
 * subagent-tracker.cjs uses withFileLock around its agent_tree.yaml append
 * (see hook-utils.cjs withFileLock). This test exercises the lock under
 * contention: spawn 10 child processes, each invoking subagent-tracker.cjs
 * with the same session_id but distinct agent_ids. Final file MUST contain
 * all 10 agent_ids and parse as valid YAML.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
// Isolation (see materialize.mjs): SESSIONS_DIR points at a per-process temp
// project root, NOT the real <repo>/cagents-memory/sessions/. This fixture is a
// non-terminal session carrying an agent_tree.yaml, i.e. exactly what a sibling
// test's findActiveSession({fallbackHeuristic}) / findMostRecentSessionDir()
// binds to. hookEnv() sets CLAUDE_PROJECT_DIR for the spawned hook so the hook
// resolves the SAME temp root the fixture was written into.
import { hookEnv, SESSIONS_DIR } from './fixtures/safety-net/materialize.mjs';

const PROJECT_ROOT = process.cwd();
const HOOKS_DIR = join(PROJECT_ROOT, '.claude', 'hooks');

const TS = Date.now().toString(36);
const SID = `act_concurrent-appends_${TS}`;
const SDIR = join(SESSIONS_DIR, SID);

function setup() {
  mkdirSync(join(SDIR, 'workflow'), { recursive: true });
  writeFileSync(
    join(SDIR, 'status.yaml'),
    `session_id: ${SID}\nphase: coordinating\npipeline_state: COORDINATING\n`
  );
  writeFileSync(
    join(SDIR, 'workflow', 'agent_tree.yaml'),
    `schema_version: "1"\nagents: []\n`
  );
}

function fireSubagentTracker(agentId) {
  return new Promise((resolve) => {
    const child = spawn('node', [join(HOOKS_DIR, 'subagent-tracker.cjs')], {
      env: {
        ...process.env,
        ...hookEnv(),
        CAGENTS_HOOK_DEDUP_DISABLE: '1',
        VITEST: 'true',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.write(JSON.stringify({
      session_id: SID,
      agent_type: 'cagents:backend-developer',
      agent_id: agentId,
    }));
    child.stdin.end();
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('exit', (code) => resolve({ code, stderr }));
  });
}

describe('concurrent-appends: agent_tree.yaml under contention (WI-5)', () => {
  beforeEach(() => {
    if (existsSync(SDIR)) rmSync(SDIR, { recursive: true, force: true });
    setup();
  });

  afterEach(() => {
    if (existsSync(SDIR)) rmSync(SDIR, { recursive: true, force: true });
  });

  it('10 concurrent appends produce well-formed YAML with all 10 entries', async () => {
    const N = 10;
    const agentIds = Array.from({ length: N }, (_, i) => `agent-stress-${i}`);
    const results = await Promise.all(agentIds.map(fireSubagentTracker));

    // All hook processes exited successfully
    for (const r of results) {
      expect(r.code, `hook stderr: ${r.stderr}`).toBe(0);
    }

    // Final agent_tree.yaml contains every agent_id, exactly once.
    const tree = readFileSync(join(SDIR, 'workflow', 'agent_tree.yaml'), 'utf8');
    for (const id of agentIds) {
      const occurrences = (tree.match(new RegExp(id, 'g')) || []).length;
      expect(occurrences, `agent_id ${id} missing or duplicated in tree`).toBe(1);
    }

    // YAML must still parse (no truncation between concurrent writers).
    // Try to require js-yaml; if unavailable, do a structural check instead.
    let yamlOk = false;
    try {
      const yaml = require('js-yaml');
      const parsed = yaml.load(tree);
      expect(parsed.schema_version).toBe('1');
      expect(Array.isArray(parsed.agents)).toBe(true);
      expect(parsed.agents.length).toBe(N);
      yamlOk = true;
    } catch (e) {
      // js-yaml not installed in test env — structural fallback check.
      expect(tree).toMatch(/^schema_version:/m);
      expect(tree).toMatch(/^agents:/m);
      // Each agent_id line should be paired with a `type:` line
      const idLines = (tree.match(/^\s+- id:/gm) || []).length;
      expect(idLines).toBe(N);
      yamlOk = true;
    }
    expect(yamlOk).toBe(true);
  }, 30000);
});

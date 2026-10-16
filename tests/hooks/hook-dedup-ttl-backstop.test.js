/**
 * HS-2 / A2 regression test: dedupGuard TTL backstop in createHook.
 *
 * Before A2 the dedup marker was unlinked when the first hook process exited.
 * Claude Code launches the plugin copy and the project copy of a hook with a
 * 6-60 ms skew, and a handler finishes in ~10 ms, so the second copy usually
 * started AFTER the marker was gone and ran the handler a second time.
 *
 * A2 keeps the marker for DEDUP_TTL_MS (5 s, judged by mtime). A second
 * identical run inside the window is skipped and replays the first copy's
 * verdict. A marker older than 5 s never suppresses.
 *
 * Isolation: TMPDIR points at a per-test temp dir (os.tmpdir() honours it), so
 * markers never land in the shared /tmp. The subprocess cases also set
 * CLAUDE_PROJECT_DIR to a temp project, so the real cagents-memory/ is never
 * written. Stale markers are made with fs.utimesSync, not by sleeping.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readdirSync, existsSync, utimesSync, writeFileSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const UTILS = join(HOOKS_DIR, 'hook-utils.cjs');

function freshUtils() {
  delete require.cache[require.resolve(UTILS)];
  return require(UTILS);
}

function markers(dir, hookName) {
  return readdirSync(dir).filter(f => f.startsWith(`cagents-dedup-${hookName}-`));
}

function backdate(file, ms) {
  const t = (Date.now() - ms) / 1000;
  utimesSync(file, t, t);
}

describe('dedupGuard TTL backstop (HS-2 / A2), in-process', () => {
  let utils, tmp;
  const saved = {};

  beforeEach(() => {
    for (const k of ['VITEST', 'NODE_ENV', 'CAGENTS_HOOK_DEDUP_DISABLE', 'TMPDIR']) saved[k] = process.env[k];
    tmp = mkdtempSync(join(tmpdir(), 'cagents-dedup-ttl-'));
    process.env.TMPDIR = tmp;
    // Turn off the test-mode bypass so the real dedup logic runs.
    delete process.env.VITEST;
    delete process.env.NODE_ENV;
    delete process.env.CAGENTS_HOOK_DEDUP_DISABLE;
    utils = freshUtils();
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    }
    rmSync(tmp, { recursive: true, force: true });
  });

  it('a second identical run inside the window is skipped, and the marker persists', () => {
    const hookName = 'TtlWithin';
    const input = { tool_name: 'Bash', tool_use_id: 'toolu_within', tool_input: { command: 'ls' } };
    expect(utils.dedupGuard(hookName, input)).toBe(false);
    const files = markers(tmp, hookName);
    expect(files).toHaveLength(1);
    expect(utils.dedupGuard(hookName, JSON.parse(JSON.stringify(input)))).toBe(true);
    // A2: the marker is kept for the TTL instead of being unlinked at exit.
    expect(existsSync(join(tmp, files[0]))).toBe(true);
  });

  it('a marker just inside 5 s still suppresses', () => {
    const hookName = 'TtlEdge';
    const input = { tool_name: 'Bash', tool_use_id: 'toolu_edge', tool_input: { command: 'ls' } };
    expect(utils.dedupGuard(hookName, input)).toBe(false);
    const [f] = markers(tmp, hookName);
    backdate(join(tmp, f), 4000);
    expect(utils.dedupGuard(hookName, input)).toBe(true);
  });

  it('a marker older than 5 s does NOT suppress and is replaced by a fresh one', () => {
    const hookName = 'TtlStale';
    const input = { tool_name: 'Bash', tool_use_id: 'toolu_stale', tool_input: { command: 'ls' } };
    expect(utils.dedupGuard(hookName, input)).toBe(false);
    const [f] = markers(tmp, hookName);
    const p = join(tmp, f);
    backdate(p, 6000);
    expect(Date.now() - statSync(p).mtimeMs).toBeGreaterThan(5000);

    expect(utils.dedupGuard(hookName, input)).toBe(false);
    // The stale marker was unlinked and re-created, so it is fresh again.
    expect(existsSync(p)).toBe(true);
    expect(Date.now() - statSync(p).mtimeMs).toBeLessThan(5000);
  });

  it('a stale marker left by a crash (no JSON body) does not suppress', () => {
    const hookName = 'TtlCrash';
    const input = { tool_name: 'Write', tool_use_id: 'toolu_crash', tool_input: { file_path: 'a', content: 'b' } };
    expect(utils.dedupGuard(hookName, input)).toBe(false);
    const [f] = markers(tmp, hookName);
    writeFileSync(join(tmp, f), '');
    backdate(join(tmp, f), 60 * 1000);
    expect(utils.dedupGuard(hookName, input)).toBe(false);
  });
});

describe('createHook TTL backstop (HS-2 / A2), subprocess', () => {
  let tmp, project, script, counter;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cagents-dedup-ttl-sp-'));
    project = join(tmp, 'project');
    require('fs').mkdirSync(project, { recursive: true });
    counter = join(tmp, 'handler-runs.txt');
    script = join(tmp, 'probe-hook.cjs');
    // Minimal hook: counts handler runs and returns a deny, so the replayed
    // verdict is distinguishable from the {"continue":true} fallback.
    writeFileSync(script, `
const fs = require('fs');
const { createHook } = require(${JSON.stringify(UTILS)});
createHook('TtlProbe', async () => {
  fs.appendFileSync(${JSON.stringify(counter)}, 'run\\n');
  return { deny: true, reason: 'ttl-probe-deny' };
});
`);
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function runHook(payload) {
    const env = { ...process.env, TMPDIR: tmp, CLAUDE_PROJECT_DIR: project };
    delete env.VITEST;
    delete env.NODE_ENV;
    delete env.CAGENTS_HOOK_DEDUP_DISABLE;
    const r = spawnSync(process.execPath, [script], { input: JSON.stringify(payload), env, encoding: 'utf8', timeout: 60000 });
    if (r.error) throw r.error;
    expect(r.status).toBe(0);
    return r.stdout.trim();
  }

  function handlerRuns() {
    return existsSync(counter) ? readFileSync(counter, 'utf8').split('\n').filter(Boolean).length : 0;
  }

  it('a second identical run after the first has EXITED is skipped and replays the same verdict', () => {
    const payload = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'toolu_sp_1', tool_input: { command: 'echo hi' } };
    const out1 = runHook(payload);
    const out2 = runHook(payload);
    expect(handlerRuns()).toBe(1);
    expect(JSON.parse(out1).hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out2).toBe(out1);
  });

  it('a dedup marker older than 5 s does not suppress the next run', () => {
    const payload = { hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'toolu_sp_2', tool_input: { command: 'echo hi' } };
    runHook(payload);
    const files = markers(tmp, 'TtlProbe');
    expect(files).toHaveLength(1);
    backdate(join(tmp, files[0]), 6000);
    const out = runHook(payload);
    expect(handlerRuns()).toBe(2);
    expect(JSON.parse(out).hookSpecificOutput.permissionDecisionReason).toBe('ttl-probe-deny');
  });

  it('writes nothing under the temp project cagents-memory (and so nothing to the real one)', () => {
    runHook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_use_id: 'toolu_sp_3', tool_input: { command: 'ls' } });
    expect(existsSync(join(project, 'cagents-memory', 'sessions'))).toBe(false);
  });
});

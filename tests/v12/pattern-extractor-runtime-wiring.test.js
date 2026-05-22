/**
 * P1-4 regression test: pattern-extractor runtime wiring into team-stop.cjs.
 *
 * Backlog source: cagents-memory/sessions/run_self-improvement_260522_001/EXECUTE-FIXES.md
 *
 * Bug: pattern-extractor.cjs has been present as a CLI for >1 year but no
 * production hook invokes it -- so the `_knowledge/patterns/*.yaml` files
 * stagnate. This test asserts that:
 *
 *   (a) On a fake team session with a terminal status.yaml, invoking
 *       team-stop.cjs schedules a `node scripts/knowledge/pattern-extractor.cjs
 *       extract --save` spawn (verified via a stub binary that records its
 *       invocation in a log file).
 *
 *   (b) When the `_knowledge/patterns/.last-extracted` sentinel was touched
 *       <24h ago, the next team-stop invocation SKIPS the extractor and
 *       logs "throttled" (verified by the absence of a fresh log entry).
 *
 *   (c) When the sentinel is >24h old (mtime in the past), team-stop
 *       triggers the extractor normally.
 *
 *   (d) Extractor failures are swallowed -- team-stop.cjs MUST always exit 0
 *       so SessionEnd never blocks. (Verified by setting the extractor stub
 *       to exit 1 and asserting team-stop.cjs still returns clean JSON.)
 *
 * If this test fails, the wiring in team-stop.cjs has regressed.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const TEAM_STOP = path.join(REPO_ROOT, '.claude/hooks/team-stop.cjs');
const PATTERN_EXTRACTOR = path.join(REPO_ROOT, 'scripts/knowledge/pattern-extractor.cjs');

/**
 * Run team-stop.cjs in an isolated sandbox by setting CAGENTS_TEST_ROOT
 * (the wiring respects this env var when computing paths). The hook itself
 * gets stdin: { session_id }.
 *
 * Returns { stdout, stderr, exitCode, sentinelExisted, extractorLogContents }.
 */
function runTeamStop({ sessionDir, sandboxRoot, extractorStubPath }) {
  const stdin = JSON.stringify({ session_id: path.basename(sessionDir) });
  const env = {
    ...process.env,
    // The hook reads CAGENTS_TEST_ROOT to redirect cagents-memory + sentinel paths
    CAGENTS_TEST_ROOT: sandboxRoot,
    // hook-utils.cjs reads CLAUDE_PROJECT_DIR to locate cagents-memory/sessions
    CLAUDE_PROJECT_DIR: sandboxRoot,
    // Path to the stub script that masquerades as pattern-extractor.cjs
    CAGENTS_PATTERN_EXTRACTOR_OVERRIDE: extractorStubPath,
  };

  const result = spawnSync('node', [TEAM_STOP], {
    input: stdin,
    env,
    encoding: 'utf8',
    timeout: 10000,
  });

  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    exitCode: result.status,
  };
}

function setupFakeTeamSession(sandboxRoot, sessionId = 'team_test_p1-4_001') {
  const sessionsDir = path.join(sandboxRoot, 'cagents-memory/sessions');
  const sessionDir = path.join(sessionsDir, sessionId);
  fs.mkdirSync(path.join(sessionDir, 'workflow'), { recursive: true });
  fs.mkdirSync(path.join(sessionDir, 'team/metrics'), { recursive: true });

  // Terminal status.yaml
  fs.writeFileSync(
    path.join(sessionDir, 'status.yaml'),
    [
      `session_id: "${sessionId}"`,
      'pipeline_state: COMPLETED',
      'phase: completed',
      'created_at: "2026-05-22T08:00:00Z"',
      'completed_at: null',
      'result: null',
    ].join('\n') + '\n'
  );

  fs.writeFileSync(
    path.join(sessionDir, 'team/task_list.yaml'),
    'completed: 5\ntotal: 5\n'
  );

  fs.writeFileSync(
    path.join(sessionDir, 'team/metrics/timing.yaml'),
    'started_at: "2026-05-22T08:00:00Z"\n'
  );

  return sessionDir;
}

function createExtractorStub(sandboxRoot, { exitCode = 0 } = {}) {
  // The stub writes its argv and timestamp to a log file the test can grep.
  const stubPath = path.join(sandboxRoot, 'extractor-stub.cjs');
  const logPath = path.join(sandboxRoot, 'extractor-invocations.log');
  const script = `#!/usr/bin/env node
const fs = require('fs');
const entry = JSON.stringify({
  argv: process.argv.slice(2),
  ts: new Date().toISOString(),
}) + '\\n';
fs.appendFileSync(${JSON.stringify(logPath)}, entry);
process.exit(${exitCode});
`;
  fs.writeFileSync(stubPath, script);
  fs.chmodSync(stubPath, 0o755);
  return { stubPath, logPath };
}

function readLog(logPath) {
  if (!fs.existsSync(logPath)) return [];
  const content = fs.readFileSync(logPath, 'utf8');
  return content
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-p1-4-'));
  fs.mkdirSync(path.join(dir, 'cagents-memory/_knowledge/patterns'), { recursive: true });
  return dir;
}

describe('P1-4: pattern-extractor wiring into team-stop.cjs', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = makeSandbox();
  });

  afterEach(() => {
    try {
      fs.rmSync(sandbox, { recursive: true, force: true });
    } catch {}
  });

  it('pattern-extractor.cjs exists with extract --save subcommand', () => {
    // Sanity precondition (P1-4 step 3): if missing, all wiring is moot.
    expect(fs.existsSync(PATTERN_EXTRACTOR)).toBe(true);
    const content = fs.readFileSync(PATTERN_EXTRACTOR, 'utf8');
    expect(content).toMatch(/case 'extract':/);
    expect(content).toMatch(/--save/);
  });

  it('terminal team session triggers pattern-extractor invocation', () => {
    const sessionDir = setupFakeTeamSession(sandbox);
    const { stubPath, logPath } = createExtractorStub(sandbox);

    // No sentinel yet → should invoke
    const result = runTeamStop({
      sessionDir,
      sandboxRoot: sandbox,
      extractorStubPath: stubPath,
    });

    expect(result.exitCode).toBe(0);

    // The hook spawns extractor as detached child. Give it a moment to write.
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && !fs.existsSync(logPath)) {
      // busy-wait briefly; spawn is async
      execSync('sleep 0.1');
    }

    const entries = readLog(logPath);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].argv).toContain('extract');
    expect(entries[0].argv).toContain('--save');

    // Sentinel should now exist
    const sentinel = path.join(sandbox, 'cagents-memory/_knowledge/patterns/.last-extracted');
    expect(fs.existsSync(sentinel)).toBe(true);
  });

  it('sentinel <24h old throttles the next invocation', () => {
    const sessionDir = setupFakeTeamSession(sandbox);
    const { stubPath, logPath } = createExtractorStub(sandbox);

    // Pre-touch sentinel to NOW (i.e., <24h old).
    const sentinel = path.join(sandbox, 'cagents-memory/_knowledge/patterns/.last-extracted');
    fs.writeFileSync(sentinel, '');

    const result = runTeamStop({
      sessionDir,
      sandboxRoot: sandbox,
      extractorStubPath: stubPath,
    });

    expect(result.exitCode).toBe(0);

    // Give any (incorrect) spawn time to surface.
    execSync('sleep 0.5');

    // No invocation should have happened
    const entries = readLog(logPath);
    expect(entries.length).toBe(0);

    // stderr should mention throttled OR systemMessage should include it
    const combined = result.stderr + result.stdout;
    expect(combined).toMatch(/throttl/i);
  });

  it('sentinel >24h old triggers normal invocation', () => {
    const sessionDir = setupFakeTeamSession(sandbox);
    const { stubPath, logPath } = createExtractorStub(sandbox);

    // Pre-touch sentinel to 25h ago.
    const sentinel = path.join(sandbox, 'cagents-memory/_knowledge/patterns/.last-extracted');
    fs.writeFileSync(sentinel, '');
    const past = Date.now() / 1000 - 25 * 3600;
    fs.utimesSync(sentinel, past, past);

    const result = runTeamStop({
      sessionDir,
      sandboxRoot: sandbox,
      extractorStubPath: stubPath,
    });

    expect(result.exitCode).toBe(0);

    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && !fs.existsSync(logPath)) {
      execSync('sleep 0.1');
    }

    const entries = readLog(logPath);
    expect(entries.length).toBeGreaterThanOrEqual(1);
    expect(entries[0].argv).toContain('extract');
  });

  it('extractor failure does NOT block team-stop (always exit 0)', () => {
    const sessionDir = setupFakeTeamSession(sandbox);
    const { stubPath } = createExtractorStub(sandbox, { exitCode: 1 });

    const result = runTeamStop({
      sessionDir,
      sandboxRoot: sandbox,
      extractorStubPath: stubPath,
    });

    // team-stop must always exit 0 -- SessionEnd hooks never block
    expect(result.exitCode).toBe(0);
    // stdout should still be valid JSON
    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});

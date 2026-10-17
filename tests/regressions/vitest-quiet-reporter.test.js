/**
 * Regression (v12.78.0, ITEM-5): tests/vitest.config.js picks the reporter from
 * the environment. CAGENTS_TEST_REPORTER wins; CLAUDECODE=1 selects 'dot';
 * otherwise 'default'. The dot reporter must still print the full failure
 * (assertion message + file:line), so agents lose no diagnostic detail.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CONFIG = path.join(ROOT, 'tests', 'vitest.config.js');
const VITEST_BIN = path.join(ROOT, 'node_modules', 'vitest', 'vitest.mjs');

function baseEnv(overrides) {
  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.CAGENTS_TEST_REPORTER;
  return { ...env, ...overrides };
}

function loadReporters(overrides) {
  const script =
    `import(${JSON.stringify(pathToFileURL(CONFIG).href)})` +
    `.then(m => process.stdout.write(JSON.stringify(m.default.test.reporters)))`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: ROOT,
    env: baseEnv(overrides),
    encoding: 'utf8',
    timeout: 60000,
  });
  expect(r.status, r.stderr).toBe(0);
  return JSON.parse(r.stdout);
}

describe('vitest.config.js reporter selection', () => {
  it("CLAUDECODE=1 selects ['dot']", () => {
    expect(loadReporters({ CLAUDECODE: '1' })).toEqual(['dot']);
  }, 60000);

  it("no CLAUDECODE selects ['default']", () => {
    expect(loadReporters({})).toEqual(['default']);
  }, 60000);

  it("CAGENTS_TEST_REPORTER=verbose wins, even with CLAUDECODE=1", () => {
    expect(loadReporters({ CAGENTS_TEST_REPORTER: 'verbose' })).toEqual(['verbose']);
    expect(loadReporters({ CAGENTS_TEST_REPORTER: 'verbose', CLAUDECODE: '1' })).toEqual(['verbose']);
  }, 60000);
});

describe('dot reporter keeps full failure details', () => {
  let tmp;
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vitest-dot-'));
  });
  afterAll(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('prints the assertion message and fixture file:line', () => {
    // Fixture lives in an mkdtemp dir, outside the tests/**/*.test.js include glob.
    const fixture = path.join(tmp, 'dot-fixture.test.js');
    fs.writeFileSync(
      fixture,
      [
        "it('fails on purpose', () => {",
        "  expect('dot-sentinel-actual').toBe('dot-sentinel-expected');", // line 2
        '});',
        '',
      ].join('\n')
    );
    const r = spawnSync(
      process.execPath,
      [VITEST_BIN, 'run', '--root', tmp, '--globals', '--reporter=dot', '--no-color'],
      { cwd: ROOT, env: baseEnv({ CLAUDECODE: '1', NO_COLOR: '1' }), encoding: 'utf8', timeout: 60000 }
    );
    const out = `${r.stdout}\n${r.stderr}`;
    expect(r.status, out).not.toBe(0);
    expect(out).toContain('dot-sentinel-expected');
    expect(out).toContain('dot-sentinel-actual');
    expect(out).toMatch(/dot-fixture\.test\.js:2(:\d+)?/);
  }, 60000);
});

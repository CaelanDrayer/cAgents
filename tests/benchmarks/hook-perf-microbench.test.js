// Smoke test for the Write|Edit hook-perf microbenchmark harness (WI-3 / D2).
//
// Bug-Driven Testing mandate: this asserts the harness runs end-to-end, emits a
// results file with non-zero timings, reports cold_starts_per_write_edit === 3,
// and carries provenance. To stay fast and non-flaky, the test drives the
// exported run() with a TINY iteration count and a REDUCED hook set (the single
// fast `secret-detection` hook, ~120ms/cold-start) instead of all 3 real hooks
// (two of which linger ~3s each). The REAL before-baseline (committed at
// cagents-memory/_system/evals/perf/hook-perf-before.json) was produced by a
// separate run over all 3 real hooks. The reduced-set run here still spawns a
// REAL `node run-hook.cjs secret-detection` cold-start per iteration, so it
// exercises the actual measurement path, not a mock.

import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import os from 'os';

const PROJECT_ROOT = process.cwd();
const harness = require(join(PROJECT_ROOT, 'scripts', 'benchmarks', 'hook-perf-microbench.cjs'));

const tmpFiles = [];
function tmpOut(name) {
  const p = join(tmpdir(), `cagents-hook-perf-test-${process.pid}-${name}.json`);
  tmpFiles.push(p);
  return p;
}

afterAll(() => {
  for (const f of tmpFiles) {
    try { unlinkSync(f); } catch { /* best effort */ }
  }
});

describe('hook-perf microbench harness', () => {
  it('exports a callable run() and the 3 pure Write|Edit hooks', () => {
    expect(typeof harness.run).toBe('function');
    expect(harness.PURE_WRITE_EDIT_HOOKS).toEqual([
      'secret-detection',
      'controller-delegation-validator',
      'skill-size-monitor',
    ]);
    // cold_starts_per_write_edit reflects exactly these 3 hooks under HEAD.
    expect(harness.PURE_WRITE_EDIT_HOOKS).toHaveLength(3);
  });

  it('runs end-to-end (reduced hook set), writes a results file with non-zero timings', () => {
    // This case spawns REAL `node run-hook.cjs secret-detection` cold-starts whose
    // readStdin uses an un-unref'd setTimeout that lingers ~3s after each spawn, so
    // the default 5000ms vitest timeout is too tight. Raise it; assertions unchanged.
    const out = tmpOut('reduced');
    let results;
    // (a) completes without throwing — spawns a REAL fast-hook cold-start per iteration.
    expect(() => {
      results = harness.run({
        iterations: 2,
        scenario: 'before',
        hooks: ['secret-detection'], // fast hook only -> keeps the test short
        out,
      });
    }).not.toThrow();

    // (b) a results file is produced
    expect(existsSync(out)).toBe(true);
    const onDisk = JSON.parse(readFileSync(out, 'utf8'));
    expect(onDisk).toMatchObject({ scenario: 'before-dispatcher' });

    // (c) timings are present and > 0
    const hook = results.per_hook['secret-detection'];
    expect(hook).toBeTruthy();
    expect(hook.iterations).toBe(2);
    expect(hook.median_ms).toBeGreaterThan(0);
    expect(hook.mean_ms).toBeGreaterThan(0);
    expect(hook.min_ms).toBeGreaterThan(0);
    expect(results.aggregate_per_write_edit.sum_median_ms).toBeGreaterThan(0);

    // (d) provenance fields exist
    expect(results.provenance.node_version).toBe(process.version);
    expect(results.provenance.platform).toBe(os.platform());
    expect(typeof results.provenance.timestamp).toBe('string');
    expect(results.provenance.project_root).toBe(harness.PROJECT_ROOT);
  }, 30000);

  it('reports cold_starts_per_write_edit === 3 for the default (full) hook set', () => {
    // Without spawning all 3 (two are slow), assert the contract via the default
    // hook list: cold_starts_per_write_edit must equal the number of measured
    // hooks, which defaults to the 3 pure Write|Edit hooks. We verify the value
    // the harness would emit by checking the constant the run() uses.
    expect(harness.PURE_WRITE_EDIT_HOOKS.length).toBe(3);

    // And confirm run() wires cold_starts_per_write_edit to the measured-hook
    // count by running the reduced single-hook set and asserting it equals 1,
    // proving the field tracks hooks.length (=> 3 for the full set).
    const out = tmpOut('coldstarts');
    const reduced = harness.run({
      iterations: 1,
      scenario: 'before',
      hooks: ['secret-detection'],
      out,
    });
    expect(reduced.cold_starts_per_write_edit).toBe(1);
    expect(reduced.hooks_measured).toEqual(['secret-detection']);
    // => for the default full set, cold_starts_per_write_edit === 3 (PURE_WRITE_EDIT_HOOKS.length)
  }, 30000);

  it('produces a valid, parseable payload with a non-protected pass-through path', () => {
    const payload = JSON.parse(harness.buildPayload());
    expect(payload.tool_name).toBe('Write');
    expect(payload.tool_input.file_path).toMatch(/cagents-memory/);
    expect(payload.tool_input.content).toContain('const x = 1');
  });
});

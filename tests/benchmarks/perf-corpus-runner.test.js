// End-to-end test for the perf-corpus runner (WI-4 / D2 part ii, v12.19.0).
//
// Bug-Driven Testing mandate: this drives the runner end-to-end (the exported
// run()), asserts it executes, emits a results file, and that the results carry
// the expected shape — both measured targets (hook-perf + secret-scan-time) and
// provenance. To stay fast and non-flaky it uses a REDUCED secret-scan iteration
// count and a SMALL size matrix (the 600KB windowed case is kept because it is
// the cheap-but-important branch coverage). The hook-perf target defaults to the
// "artifact" path (reads the committed WI-3 hook-perf-before.json — no slow
// child spawns), so the whole test runs in well under a second.
//
// HONESTY NOTE: this test asserts the runner MEASURES real numbers (timings > 0,
// provenance pinned to the live process), NOT specific magic values — the
// numbers are machine/run-dependent. It does not bake any fabricated figure.

import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import os from 'os';

const PROJECT_ROOT = process.cwd();
const runner = require(join(
  PROJECT_ROOT,
  'cagents-memory',
  '_system',
  'evals',
  'perf',
  'perf-corpus-runner.cjs'
));

const tmpFiles = [];
function tmpOut(name) {
  const p = join(tmpdir(), `cagents-perf-corpus-test-${process.pid}-${name}.json`);
  tmpFiles.push(p);
  return p;
}

afterAll(() => {
  for (const f of tmpFiles) {
    try { unlinkSync(f); } catch { /* best effort */ }
  }
});

describe('perf-corpus runner', () => {
  it('exports a callable run() plus the measurement helpers', () => {
    expect(typeof runner.run).toBe('function');
    expect(typeof runner.collectHookPerf).toBe('function');
    expect(typeof runner.collectSecretScanTime).toBe('function');
    expect(typeof runner.buildBenignContent).toBe('function');
    expect(runner.SECRET_SCAN_MAX_BYTES).toBe(512 * 1024);
  });

  it('generates benign content of the requested size with zero secrets', () => {
    const content = runner.buildBenignContent(10 * 1024);
    expect(Buffer.byteLength(content, 'utf8')).toBeGreaterThanOrEqual(10 * 1024);
    // Sanity: content is benign code, not a token shape.
    expect(content).toMatch(/const x0 = 0;/);
  });

  it('runs end-to-end, writes a results file, and emits both measured targets', () => {
    const out = tmpOut('e2e');
    let results;

    // (a) completes without throwing. Reduced secret-scan iters + a small size
    // matrix incl. the windowed 600KB branch. hook-perf defaults to the
    // artifact-read path (no slow spawns).
    expect(() => {
      results = runner.run({
        iterations: 3,
        sizes: [
          { label: '10KB', bytes: 10 * 1024 },
          { label: '600KB', bytes: 600 * 1024 }, // > 512KB cap => windowed branch
        ],
        out,
      });
    }).not.toThrow();

    // (b) a results file is produced and parses
    expect(existsSync(out)).toBe(true);
    const onDisk = JSON.parse(readFileSync(out, 'utf8'));
    expect(onDisk.corpus).toBe('perf-corpus');
    expect(onDisk.targets).toEqual(['hook-perf', 'secret-scan-time']);
    expect(results._out_path).toBe(out);

    // (c) TARGET 1 — hook-perf present with the real measured aggregate.
    const hp = results.hook_perf;
    expect(hp).toBeTruthy();
    expect(['artifact', 'live']).toContain(hp.source);
    // Default path reads the committed WI-3 artifact; assert it surfaced the
    // real before number + cold-start count (not fabricated here — read verbatim
    // from hook-perf-before.json).
    if (hp.source === 'artifact' && hp.available) {
      expect(hp.cold_starts_per_write_edit).toBe(3);
      expect(hp.aggregate_per_write_edit.sum_median_ms).toBeGreaterThan(0);
      expect(hp.artifact_path).toMatch(/hook-perf-before\.json$/);
    }

    // (d) TARGET 2 — secret-scan-time with real, positive, per-size timings.
    const ss = results.secret_scan_time;
    expect(ss).toBeTruthy();
    expect(ss.iterations).toBe(3);
    expect(Array.isArray(ss.by_size)).toBe(true);
    expect(ss.by_size).toHaveLength(2);
    for (const entry of ss.by_size) {
      expect(entry.bytes).toBeGreaterThan(0);
      expect(entry.median_ms).toBeGreaterThan(0);
      expect(entry.mean_ms).toBeGreaterThan(0);
      expect(entry.min_ms).toBeGreaterThan(0);
      expect(entry.iterations).toBe(3);
    }
    // The 600KB entry must be flagged windowed (> 512KB cap); 10KB must not be.
    const small = ss.by_size.find((e) => e.label === '10KB');
    const big = ss.by_size.find((e) => e.label === '600KB');
    expect(small.windowed).toBe(false);
    expect(big.windowed).toBe(true);
    expect(big.bytes).toBeGreaterThan(runner.SECRET_SCAN_MAX_BYTES);

    // (e) provenance is pinned to THIS live process (proves it was measured here,
    // not copied from a stale artifact).
    expect(results.provenance.node_version).toBe(process.version);
    expect(results.provenance.platform).toBe(os.platform());
    expect(typeof results.provenance.timestamp).toBe('string');
    expect(results.provenance.project_root).toBe(runner.PROJECT_ROOT);

    // (f) the honesty note about unmeasured CLAUDE.md estimate rows is present.
    expect(results.notes.join('\n')).toMatch(/UNMEASURED design-target ESTIMATES/);
  });
});

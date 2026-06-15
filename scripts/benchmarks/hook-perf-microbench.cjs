#!/usr/bin/env node
/**
 * Hook Performance Microbenchmark (cAgents v12.19.0, WI-3 / D2)
 *
 * Measures Write|Edit PreToolUse hook overhead. Under HEAD (un-consolidated,
 * "before-dispatcher"), each Write|Edit tool call fires 3 SEPARATE pure
 * Write|Edit hooks, each launched as its own cold-start `node run-hook.cjs <name>`
 * child process:
 *   - secret-detection
 *   - controller-delegation-validator
 *   - skill-size-monitor
 * (approval-gate, matched on Bash|Write|Edit, is a 4th cold-start in production
 *  but is excluded from the per-Write|Edit aggregate here because it also fires
 *  for Bash; the 3 measured hooks are the pure Write|Edit set the D1b dispatcher
 *  consolidates. cold_starts_per_write_edit reflects the 3 pure hooks.)
 *
 * This captures the BEFORE baseline that WI-5 (the D1b dispatcher) re-runs with
 * --scenario after to validate the consolidation win. AFTER, a single dispatcher
 * cold-start invokes the 3 hooks in-process => cold_starts_per_write_edit drops
 * from 3 to 1.
 *
 * Usage:
 *   node scripts/benchmarks/hook-perf-microbench.cjs [--scenario before|after]
 *       [--iterations N] [--out <path>]
 *
 * Env overrides (CLI flags win):
 *   BENCH_SCENARIO, BENCH_ITERATIONS, BENCH_OUT
 *
 * Programmatic:
 *   const { run } = require('./hook-perf-microbench.cjs');
 *   const results = run({ iterations: 3, scenario: 'before' });
 *
 * Output: machine-readable JSON written to
 *   cagents-memory/_system/evals/perf/hook-perf-{scenario}.json  (default)
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const RUN_HOOK = path.join(PROJECT_ROOT, '.claude', 'hooks', 'run-hook.cjs');
const DEFAULT_OUT_DIR = path.join(PROJECT_ROOT, 'cagents-memory', '_system', 'evals', 'perf');

// The 3 pure Write|Edit PreToolUse hooks consolidated by the D1b dispatcher.
const PURE_WRITE_EDIT_HOOKS = [
  'secret-detection',
  'controller-delegation-validator',
  'skill-size-monitor',
];

// Representative pass-through payload: innocuous content + a non-protected,
// non-controller-tripping path so timing reflects the allow path (not a deny).
function buildPayload() {
  return JSON.stringify({
    tool_name: 'Write',
    tool_input: {
      file_path: path.join('cagents-memory', '_system', 'evals', 'perf', '_bench_probe.ts'),
      content: 'const x = 1;\n',
    },
    session_id: 'bench',
    cwd: PROJECT_ROOT,
  });
}

function median(sorted) {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

/**
 * Time a single cold-start invocation of one hook via run-hook.cjs.
 * Returns elapsed wall-clock ms. Throws if the child exits non-zero or
 * fails to emit valid JSON (defends against measuring a broken hook).
 */
function timeOneInvocation(hookName, payload) {
  const start = process.hrtime.bigint();
  const res = spawnSync('node', [RUN_HOOK, hookName], {
    input: payload,
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: PROJECT_ROOT },
  });
  const end = process.hrtime.bigint();
  const ms = Number(end - start) / 1e6;

  if (res.error) {
    throw new Error(`Hook ${hookName} spawn failed: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`Hook ${hookName} exited ${res.status}: ${res.stderr || ''}`);
  }
  // Validate the hook emitted JSON (pass-through path => {"continue":true}).
  const out = (res.stdout || '').trim();
  try {
    JSON.parse(out.split('\n').filter(Boolean).pop() || '{}');
  } catch (e) {
    throw new Error(`Hook ${hookName} emitted non-JSON stdout: ${out.slice(0, 120)}`);
  }
  return ms;
}

/**
 * Run the microbenchmark.
 * @param {object} opts
 * @param {number} [opts.iterations=20] iterations per hook
 * @param {string} [opts.scenario='before'] scenario label
 * @param {string[]} [opts.hooks] hook list (defaults to the 3 pure Write|Edit hooks)
 * @param {string} [opts.out] output file path
 * @param {boolean} [opts.write=true] whether to write the results file
 * @returns {object} results object (also written to disk when write !== false)
 */
function run(opts = {}) {
  const iterations = Math.max(1, opts.iterations || 20);
  const scenario = opts.scenario || 'before';
  const hooks = opts.hooks && opts.hooks.length ? opts.hooks : PURE_WRITE_EDIT_HOOKS;
  const payload = buildPayload();

  // One warm-up invocation per hook (excluded from stats) to fault in the
  // module cache for run-hook.cjs resolution; cold-start of the node binary
  // itself still happens per child, which is exactly what we want to measure.
  for (const h of hooks) {
    try { timeOneInvocation(h, payload); } catch (_) { /* surfaced below */ }
  }

  const perHook = {};
  for (const hookName of hooks) {
    const samples = [];
    for (let i = 0; i < iterations; i++) {
      samples.push(timeOneInvocation(hookName, payload));
    }
    const sorted = [...samples].sort((a, b) => a - b);
    perHook[hookName] = {
      iterations,
      min_ms: round3(sorted[0]),
      median_ms: round3(median(sorted)),
      mean_ms: round3(mean(samples)),
      max_ms: round3(sorted[sorted.length - 1]),
    };
  }

  // Aggregate "per Write|Edit" = sum of the per-hook medians (each hook is a
  // separate cold-start fired on every Write|Edit under HEAD).
  const sumMedian = hooks.reduce((acc, h) => acc + perHook[h].median_ms, 0);
  const sumMean = hooks.reduce((acc, h) => acc + perHook[h].mean_ms, 0);

  const results = {
    scenario: scenario === 'after' ? 'after-dispatcher' : 'before-dispatcher',
    scenario_label: scenario,
    cold_starts_per_write_edit: hooks.length, // 3 under HEAD; WI-5 AFTER => 1
    hooks_measured: hooks,
    iterations,
    per_hook: perHook,
    aggregate_per_write_edit: {
      // sum of medians: the latency a single Write|Edit pays across all hooks
      sum_median_ms: round3(sumMedian),
      sum_mean_ms: round3(sumMean),
    },
    provenance: {
      node_version: process.version,
      platform: os.platform(),
      os_release: os.release(),
      arch: os.arch(),
      cpus: (os.cpus()[0] || {}).model || 'unknown',
      cpu_count: os.cpus().length,
      project_root: PROJECT_ROOT,
      timestamp: new Date().toISOString(),
    },
    notes: [
      'Each measurement is one cold-start `node run-hook.cjs <hook>` child via spawnSync,',
      'piping the representative Write|Edit pass-through payload on stdin. Wall-clock ms.',
      'OBSERVED under HEAD: secret-detection returns in ~120ms, but',
      'controller-delegation-validator and skill-size-monitor each linger ~3000ms before',
      'process exit. Root cause: the un-unref()\'d setTimeout(...,3000) in',
      'hook-utils.cjs readStdin() keeps the Node event loop alive after the hook has already',
      'printed its JSON, so the spawned process does not exit until that timer fires. This is',
      'a genuine per-Write|Edit cost Claude Code pays today (3 separate lingering processes).',
      'The D1b dispatcher (WI-5) collapses these 3 cold-starts into 1, which both removes 2',
      'of the 3 process spawns AND the redundant lingering timers. Re-run with --scenario',
      'after for the AFTER baseline.',
    ],
  };

  if (opts.write !== false) {
    const outPath = opts.out
      ? path.resolve(opts.out)
      : path.join(DEFAULT_OUT_DIR, `hook-perf-${scenario}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2) + '\n');
    results._out_path = outPath;
  }

  return results;
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--scenario') out.scenario = argv[++i];
    else if (a === '--iterations') out.iterations = parseInt(argv[++i], 10);
    else if (a === '--out') out.out = argv[++i];
  }
  // Env fallbacks (CLI flags win).
  if (out.scenario == null && process.env.BENCH_SCENARIO) out.scenario = process.env.BENCH_SCENARIO;
  if (out.iterations == null && process.env.BENCH_ITERATIONS) {
    out.iterations = parseInt(process.env.BENCH_ITERATIONS, 10);
  }
  if (out.out == null && process.env.BENCH_OUT) out.out = process.env.BENCH_OUT;
  return out;
}

// Runnable main
if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2));
  const results = run(opts);
  // Human-readable summary to stderr; machine-readable JSON to stdout.
  const agg = results.aggregate_per_write_edit;
  process.stderr.write(
    `[hook-perf] scenario=${results.scenario} iterations=${results.iterations} ` +
    `cold_starts/Write|Edit=${results.cold_starts_per_write_edit} ` +
    `sum_median=${agg.sum_median_ms}ms -> ${results._out_path}\n`
  );
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

module.exports = { run, PURE_WRITE_EDIT_HOOKS, buildPayload, PROJECT_ROOT };

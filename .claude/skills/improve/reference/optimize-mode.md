# /improve --mode optimize Reference

Per-state specification for `--mode optimize`. Companion to
`.claude/skills/improve/SKILL.md` and `reference/state-machine.md`.

## Per-State Delivery Schedule

| State | Version | Status |
|-------|---------|--------|
| SCOPING | V10.26.27 | implemented (parser stub creates session) |
| MEASURING | V10.26.30 | implemented |
| DETECTING | V10.26.28 | implemented |
| PLANNING | V10.26.31 | implemented |
| EXECUTING | V10.26.31 | implemented |
| VALIDATING | V10.26.31 | implemented |
| REPORTING | V10.26.31 | implemented |

## DETECTING — Opportunity Scanners (V10.26.28)

DETECTING enumerates optimization opportunities across three specialist
groups. Groups run in parallel since they are independent scans. Canonical
phase spec now lives at
[`reference/phase-details.md`](phase-details.md) (ported from the legacy
`/optimize` skill; source of truth as of V11.0).

### Agent Groups

All groups spawn concurrently via the Agent tool — they are read-only
scans with no cross-group dependencies.

- **Group 1: Performance Scanner** (parallel, independent)
  - `cagents:performance-analyzer` — CPU hot paths, N+1 queries, blocking
    I/O, render thrash, bundle bloat
- **Group 2: Size Scanner** (parallel, independent)
  - `cagents:performance-analyzer` (second instance, `focus: size`) —
    dead code, duplicate deps, unused imports, oversized assets
- **Group 3: Efficiency Scanner** (parallel, independent)
  - `cagents:code-standards-auditor` (`focus: efficiency`) — algorithmic
    waste, repeated computation, memory churn, lint-surfaced inefficiencies

Each scanner writes to
`workflow/detection/{group}/{agent}.yaml` with schema:

```yaml
opportunities:
  - opp_id: OPP-001
    file: src/bundle.ts
    line: 42
    category: performance | size | efficiency
    impact: high | medium | low
    confidence: 0.0-1.0
    effort: low | medium | high
    description: "..."
    fix_hint: "..."
```

### Dry-Run Mode

When `IMPROVE_DRY_AGENTS=1` is set, DETECTING does NOT spawn agents.
Instead it writes a planned-spawn record to
`workflow/detection/planned_spawns.yaml` listing the three scanner
groups and skips to PLANNING with an empty opportunities set. Used by
regression tests.

### Aggregation

After all scanners complete, `/improve` aggregates into
`workflow/opportunities.yaml`:

```yaml
opportunities:
  - opp_id: OPP-001
    scanner: performance-analyzer
    group: performance
    # ... per-opportunity fields above
counts:
  performance: 4
  size: 7
  efficiency: 3
  total: 14
```

Deduplication rule: opportunities with identical `(file, line, category)`
are merged; the highest-confidence variant wins.

## MEASURING — Baseline + Benchmarks (V10.26.30)

See `reference/state-machine.md` for general MEASURING state contract and
`reference/baseline-migration.md` for the shared hash/lookup rule used by
both review and optimize modes.

### Optimize-Specific Baseline

Baseline metrics for `--mode optimize` are written to
`Agent_Memory/_projects/{hash}/improve/baselines/{timestamp}.yaml` with
schema:

```yaml
captured_at: "2026-04-21T10:15:00Z"
tool: auto | lighthouse | k6 | hyperfine
target: "src/"
metrics:
  # lighthouse:
  fcp_ms: 1200
  lcp_ms: 2400
  cls: 0.04
  tbt_ms: 150
  si_ms: 1800
  # or k6:
  p95_latency_ms: 120
  rps: 1500
  error_rate: 0.001
  # or hyperfine:
  mean_time_ms: 340
  stddev_ms: 12
```

### Benchmark Tool Selection

`--benchmark <tool>` values:

| Value | Tool | When Used |
|-------|------|-----------|
| `auto` | Auto-detect | Default. Picks lighthouse if web project, k6 if API, hyperfine if CLI |
| `lighthouse` | Chrome Lighthouse | Web performance (FCP, LCP, CLS, TBT, SI) |
| `k6` | Grafana k6 | API load test (p95 latency, RPS, error rate) |
| `hyperfine` | hyperfine | CLI command timing (mean, stddev) |

Benchmark execution is delegated to `.claude/hooks/benchmark-runner.cjs`
(planned) so the runner stays out of SKILL.md.

## Pattern Effectiveness Migration

See `reference/pattern-effectiveness-migration.md`.

Summary: read from `_projects/{hash}/improve/pattern_effectiveness.yaml`
(primary), fall back to `_projects/{hash}/optimize/pattern_effectiveness.yaml`
(legacy). On first successful legacy read, copy forward to the primary
path using atomic write. Writes go to `improve/` only. Legacy file is
never modified after migration.

## EXECUTING — ROI Ranking + Atomic Apply (V10.26.31)

ROI formula: `roi = (impact_weight × confidence) / effort_weight`

- `impact_weight`: `{high: 3, medium: 2, low: 1}`
- `effort_weight`: `{low: 1, medium: 2, high: 3}`
- `confidence`: 0.0–1.0 (adjusted by pattern_effectiveness on matching patterns)

Select top-N opportunities (configurable via `--top-n`, default 10).
Apply each via the atomic-rollback primitive
(`reference/atomic-rollback.md`). Results written to
`workflow/execution_summary.yaml` incrementally.

### Delta Thresholds

An optimization is kept only when:

- Test suite passes (regression guard)
- Target metric improved by ≥ 5% or absolute threshold (e.g., ≥ 50ms
  for latency, ≥ 10KB for bundle)
- No metric regressed by > 2%

Otherwise the change is rolled back via the atomic helper.

## VALIDATING — Re-Measure + Delta (V10.26.31)

Re-runs the baseline benchmark with the same tool and compares per
metric. Writes `workflow/validation_report.yaml`:

```yaml
verdict: PASS | FAIL | REVISE
metrics_before: { ... }
metrics_after:  { ... }
deltas:
  lcp_ms: { before: 2400, after: 1900, delta_pct: -20.8, kept: true }
  bundle_kb: { before: 480, after: 450, delta_pct: -6.25, kept: true }
```

## REPORTING — Optimization Report (V10.26.31)

Writes `outputs/optimization_report.md` with:

- Executive summary: total opportunities, applied, rolled-back
- Per-optimization detail: file, category, impact, before/after metric, verdict
- Appends run entry to `_projects/{hash}/improve/history.yaml` with
  `mode: optimize` and the verdict.

### Report Schema (summary section)

```yaml
# embedded YAML block at top of optimization_report.md
session_id: improve_src_260421_001
mode: optimize
verdict: PASS
opportunities_scanned: 14
opportunities_applied: 4
opportunities_rolled_back: 1
metrics_delta:
  lcp_ms_pct: -20.8
  bundle_kb_pct: -6.25
```

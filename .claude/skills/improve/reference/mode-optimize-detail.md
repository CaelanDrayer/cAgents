# Optimize-Mode Detail

Full per-state behavior, scanner groups, ROI ranking, and exit messaging for `/improve --mode optimize`.

## Parser Branch

When `--mode optimize` is parsed:

1. Resolve target (first positional token that is not a flag; default `.`).
2. Build slug from target basename (kebab-case, max 32 chars).
3. Build session ID: `improve_{slug}_{YYMMDD}_{NNN}` — reuse the SCOPING
   counter rule from `--mode review`.
4. `mkdir -p cagents-memory/sessions/{session_id}/`.
5. Write `instruction.yaml` with `mode: optimize` and the raw arguments.
6. Write `status.yaml` with `phase: scoped`, `state: DETECTING_PENDING`,
   and an ISO8601 `created_at` timestamp.

No specialist agents are spawned during the parser branch. Scanner spawns happen in DETECTING.

## DETECTING — Parallel Opportunity Scanners

Spawn three opportunity scanner groups in parallel via the Agent tool
(independent, read-only scans):

- **Group 1: Performance Scanner** — `cagents:performance-analyzer` for
  CPU hot paths, N+1 queries, blocking I/O, render thrash, bundle bloat.
- **Group 2: Size Scanner** — `cagents:performance-analyzer` (`focus: size`)
  for dead code, duplicate deps, unused imports, oversized assets.
- **Group 3: Efficiency Scanner** — `cagents:code-standards-auditor`
  (`focus: efficiency`) for algorithmic waste, repeated computation,
  memory churn.

Each scanner writes to `workflow/detection/{group}/{agent}.yaml`. After
all three return, `/improve` deduplicates by `(file, line, category)`
and writes aggregated `workflow/opportunities.yaml` keyed by `opp_id`.

**Dry-run mode**: With `IMPROVE_DRY_AGENTS=1`, DETECTING does NOT spawn
agents. It writes `workflow/detection/planned_spawns.yaml` listing the
three scanner groups and advances to PLANNING with an empty
opportunities set.

**Source of truth**: `phase-details.md` (ported from the legacy `/optimize`
skill and now canonical). See `optimize-mode.md` for the full opportunity
schema and per-scanner scope.

## MEASURING — Baseline + Pattern Effectiveness

After DETECTING, `--mode optimize` captures a baseline and loads pattern
effectiveness before PLANNING.

### Baseline Capture

1. Detect benchmark tool from `--benchmark <tool>` or `auto` default:
   - `lighthouse` for web projects (writes FCP, LCP, CLS, TBT, SI)
   - `k6` for API projects (writes p95 latency, RPS, error rate)
   - `hyperfine` for CLI projects (writes mean time, stddev)
2. Invoke `.claude/hooks/benchmark-runner.cjs` (planned) with the
   detected tool. Fall back to `auto` heuristic scan when no tool is
   specified.
3. Write captured metrics to
   `cagents-memory/_projects/{hash}/improve/baselines/{timestamp}.yaml`.
4. Update `status.yaml.phase = measured`, `status.yaml.state = MEASURING`.

### Pattern Effectiveness Storage

Load historical pattern effectiveness for confidence adjustment during
PLANNING. Canonical path:

1. **Primary**: `cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml`
2. If the primary exists, read it; otherwise treat as an empty pattern
   table (new project).
3. All writes go to `improve/` only.

V11.0 removed the V10.26.30–V10.26.35 read-only legacy fallback; the
canonical `improve/` path is the single source of truth. See
`pattern-effectiveness-migration.md` for the historical migration record.

## EXECUTING — ROI Rank + Atomic Apply

Compute ROI per opportunity, select top N, apply via the shared
atomic helper:

```
roi = (impact_weight × confidence) / effort_weight
impact_weight: {high: 3, medium: 2, low: 1}
effort_weight: {low: 1, medium: 2, high: 3}
```

Confidence is adjusted for known patterns via
`_projects/{hash}/improve/pattern_effectiveness.yaml`. Each opportunity
is applied through `apply_atomic(opp)` from `atomic-rollback.md`.
Outcomes (`kept | rolled_back | dead_letter`) append to
`workflow/execution_summary.yaml` incrementally.

## VALIDATING — Before/After Delta Verification

Re-run the same benchmark tool used in MEASURING. Compute per-metric
`delta_pct = (after - before) / before × 100`. Keep rule:

- Tests pass (regression guard) AND
- Target metric improved ≥ 5% (or configured absolute threshold) AND
- No metric regressed > 2%.

Otherwise roll back via atomic helper. Write
`workflow/validation_report.yaml` with `verdict`, `metrics_before`,
`metrics_after`, and per-metric `deltas` (each with `kept: bool`).

## REPORTING — Optimization Report

Write `outputs/optimization_report.md` with executive summary +
per-opportunity detail. Append a run entry to
`_projects/{hash}/improve/history.yaml`:

```yaml
runs:
  - session_id: improve_src_260421_001
    mode: optimize
    verdict: PASS
    opportunities_scanned: 14
    opportunities_applied: 4
    opportunities_rolled_back: 1
    metrics_delta:
      lcp_ms_pct: -20.8
```

Update `_projects/{hash}/improve/pattern_effectiveness.yaml` with
success/failure increments. Update `status.yaml.phase = complete`.
Print the final exit message listing `session_id`,
`opportunities_scanned`, `opportunities_applied`,
`opportunities_rolled_back`, `verdict: PASS|FAIL`, and report path.
`/improve --mode optimize` is the canonical optimization entry point as
of V11.0.

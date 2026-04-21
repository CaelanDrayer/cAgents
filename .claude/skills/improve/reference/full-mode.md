# /improve --mode full Reference

`--mode full` runs review-then-optimize with a shared baseline and a
synthesis step that produces a unified `improve_report.md`. This is the
headline capability of the unified `/improve` engine — one command that
audits AND measurably improves with a single report.

## Pipeline

```
SCOPING
  ↓ capture baseline ONCE (shared between both modes)
MEASURING (review baseline + optimize baseline)
  ↓
DETECTING (review)     — 3 review groups → findings.yaml
  ↓
PLANNING (review)      — rank findings
  ↓
EXECUTING (review)     — optional auto-fix via atomic-rollback
  ↓
FILTER findings        — select perf-relevant subset (see predicate below)
  ↓
DETECTING (optimize)   — opportunity scanners seeded by filtered findings
  ↓
PLANNING (optimize)    — ROI rank, include seeded opportunities
  ↓
EXECUTING (optimize)   — apply top-N via atomic-rollback
  ↓
VALIDATING (both)      — quality gate (review) + delta verification (optimize)
  ↓
REPORTING (synthesis)  — unified improve_report.md
```

## Shared Baseline Contract

`--mode full` captures the baseline EXACTLY ONCE at mode-full start. The
same baseline is used by:

- Review MEASURING (quality score baseline)
- Optimize MEASURING (benchmark metrics baseline)

Storage: `Agent_Memory/_projects/{hash}/improve/baselines/{timestamp}.yaml`
with a `shared: true` marker. Neither review nor optimize re-measures.

**Why**: Double-measurement wastes time and introduces jitter. The shared
baseline is read by VALIDATING for both the quality gate and the
before/after delta.

## Perf-Relevant Filter Predicate

After review EXECUTING, filter `findings.yaml` to the subset that
optimize can act on. Predicate:

```python
def is_perf_relevant(finding):
  return (
    finding.category in {"performance", "perf", "efficiency", "bundle-size"}
    OR finding.tags ⊇ {"performance"}
    OR finding.tags ⊇ {"slow"}
    OR finding.tags ⊇ {"n+1"}
    OR finding.tags ⊇ {"memory"}
    OR finding.tags ⊇ {"cpu"}
    OR re.search(r"\b(slow|latency|bundle|memory|cpu|perf)\b", finding.message, re.I)
  )
```

Filtered findings are fed to optimize DETECTING as **seed opportunities**:
each review finding becomes a pre-identified opportunity with
`source: review_finding` and an inherited `confidence` from the review
step.

## Synthesis Step

After both VALIDATING passes, synthesize into
`outputs/improve_report.md`:

```markdown
# /improve Unified Report — {session_id}

**Mode**: full
**Verdict**: PASS | FAIL
**Duration**: {start_ts}..{end_ts}

## Review Findings

{rendered from reports/aggregate.yaml, grouped by severity}

- Critical: {N}
- High: {N}
- Medium: {N}
- Low: {N}

### Auto-Fixes Applied
{rendered from reports/auto_fixes.yaml}

## Optimizations Applied

{rendered from workflow/execution_summary.yaml}

| Opportunity | File | Metric Before | Metric After | Delta | Verdict |
|---|---|---|---|---|---|
| {opp_id} | {file} | {before} | {after} | {delta_pct}% | {kept|rolled_back} |

### Seeded from Review
{opportunities whose source == "review_finding"}

## Quality Gate

{rendered from reports/quality_gates.yaml}

## Baseline

**Shared baseline captured at**: {baseline_timestamp}
```

## Synthesis Schema

The synthesis step writes `outputs/improve_report.md` AND appends a
synthesized entry to `_projects/{hash}/improve/history.yaml`:

```yaml
runs:
  - session_id: improve_src_260421_001
    mode: full
    verdict: PASS
    review:
      findings_count: 18
      auto_fixes_applied: 3
      quality_score: 87
    optimize:
      opportunities_scanned: 14
      opportunities_applied: 4
      opportunities_rolled_back: 1
      seeded_from_review: 2
    baseline_shared: true
    duration_seconds: 420
```

## Exit Message

```
/improve --mode full: all 7 states complete (both sub-pipelines).
  session_id: {session_id}
  review_findings: {N}
  review_fixes_applied: {M}
  optimizations_applied: {K}
  optimizations_rolled_back: {R}
  seeded_from_review: {S}
  quality_gate: {PASS|FAIL}
  benchmark_delta: {summary}
  report: Agent_Memory/sessions/{session_id}/outputs/improve_report.md
```

## Safety

See `reference/full-mode.md#safety-gate` (V10.26.34) for the `--scope`
requirement and `--dry-run` semantics. V10.26.33 ships the synthesis
pipeline; V10.26.34 adds the safety rails.

## See Also

- `reference/state-machine.md` — 7-state machine per mode
- `reference/optimize-mode.md` — per-opportunity mechanics
- `reference/atomic-rollback.md` — shared snapshot/apply/rollback helper

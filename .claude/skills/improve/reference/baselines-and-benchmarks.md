# Baselines, Benchmarks, and Suppression

Detail for `--baseline`, `--benchmark`, and `--suppress` flags. Companion to `flags.md`, `baseline-migration.md`, and `baseline-suppression.md`.

## Baseline Storage

Both review and optimize modes store baselines under
`cagents-memory/_projects/{hash}/improve/`:

| Mode | File |
|------|------|
| review | `baseline.yaml` (latest snapshot — quality_score, last_measured) |
| optimize | `baselines/{timestamp}.yaml` (per-run benchmark metrics) |
| full | shared baseline (single capture, both modes read it) |

Project hash derivation lives in `baseline-migration.md`. The legacy
`review/baseline.yaml` read-only fallback was removed in V11.0; the
canonical `improve/` path is the single source of truth.

## `--baseline <path>` Flag

Override the auto-discovered baseline path. The override file must
match the schema of the mode-specific baseline (review snapshot or
benchmark metrics). Use cases:

- Compare against a known-good historical baseline
- Run review against a baseline from a different branch
- Pin optimize VALIDATING to a release-tagged benchmark

## `--benchmark <tool>` Flag

Pick the benchmark runner for optimize MEASURING + VALIDATING:

| Tool | Default for | Metrics |
|------|-------------|---------|
| `lighthouse` | web projects | FCP, LCP, CLS, TBT, SI |
| `k6` | API projects | p95 latency, RPS, error rate |
| `hyperfine` | CLI projects | mean time, stddev |
| `auto` | (default) | heuristic detection from project layout |

The runner is invoked through `.claude/hooks/benchmark-runner.cjs`
(planned). When no tool fits the project, optimize falls back to a
heuristic scan and writes a `benchmark_source: auto` marker in
`status.yaml`.

## `--suppress <pattern>` Flag

Mark findings matching the pattern as `suppressed: true` in
`workflow/findings.yaml`. Suppressed findings:

- Do NOT count toward the quality-gate score
- Do NOT trigger auto-fix in EXECUTING
- Still appear in the report under a `## Suppressed` section
- Are tracked in `_projects/{hash}/improve/suppressions.yaml` for audit

Pattern semantics, conflict resolution between project-level and
session-level suppressions, and the re-surfacing rule (D11) are
documented in `baseline-suppression.md`.

## Pattern Effectiveness Adjustment

Optimize PLANNING adjusts opportunity confidence using
`_projects/{hash}/improve/pattern_effectiveness.yaml`. Patterns with
high historical success rates get a confidence bump; patterns that
have rolled back repeatedly get penalized. See `pattern-effectiveness.md`
for the scoring math and update cadence.

## Quality-Gate Score Math

Review VALIDATING computes:

```
score = max(0, 100 - 20*critical - 10*high - 5*medium - 1*low)
verdict = PASS if score >= max(baseline_score - 5, threshold) else FAIL
```

The 5-point tolerance against baseline is intentional: it allows
small surface-area changes without flipping verdict. Override the
absolute threshold via `--threshold <0-100>` (default 70).

# Full-Mode Detail

Combined review-then-optimize pipeline, perf-relevant filter, shared baseline contract, safety gates, and unified report synthesis for `/improve --mode full`.

`--mode full` runs review-then-optimize with a single shared baseline
and a synthesis step that produces a unified `improve_report.md`. This
is the headline capability of `/improve`.

## Order of Operations

1. SCOPING + MEASURING: capture baseline ONCE (shared between both
   modes). Storage: `_projects/{hash}/improve/baselines/{timestamp}.yaml`
   with `shared: true`.
2. Run `--mode review` DETECTING → PLANNING → EXECUTING. Produces
   `workflow/findings.yaml` and `workflow/auto_fixes_applied.yaml`.
3. **Filter findings** for perf-relevant subset using the predicate
   below. Write `workflow/filtered_findings.yaml`.
4. Run `--mode optimize` DETECTING with the filtered findings seeded as
   pre-identified opportunities (`source: review_finding`). Continue
   through PLANNING → EXECUTING against the shared baseline.
5. VALIDATING runs BOTH gate sets: quality gate (review) AND delta
   verification (optimize). Both must PASS for the overall verdict to
   be PASS.
6. REPORTING synthesizes `outputs/improve_report.md` with dedicated
   `## Review Findings` and `## Optimizations Applied` sections.

## Perf-Relevant Filter Predicate

A finding feeds optimize if ANY of these holds:

```
finding.category ∈ {performance, perf, efficiency, bundle-size}
finding.tags ⊇ {performance, slow, n+1, memory, cpu}
finding.message matches /\b(slow|latency|bundle|memory|cpu|perf)\b/i
```

Security-only, standards-only, accessibility-only findings do NOT feed
optimize. They remain in `findings.yaml` and appear in the Review
Findings section of the unified report.

## Shared-Baseline Contract

The baseline is captured ONCE at mode-full start. Both review
MEASURING and optimize MEASURING read the same baseline file; neither
re-measures. This prevents double-measurement waste.

## Synthesized Report

`outputs/improve_report.md` contains:

- `## Review Findings` (severity counts, auto-fixes applied)
- `## Optimizations Applied` (opportunity table with before/after
  deltas, seeded-from-review subset called out)
- `## Quality Gate` (12 directives verdict)
- `## Baseline` (shared baseline reference)

Append a synthesized entry to `_projects/{hash}/improve/history.yaml`
with `mode: full`, `baseline_shared: true`, and per-sub-pipeline
counts.

See `full-mode.md` for the full predicate, synthesis schema, and exit message.

## Safety Gate

`--mode full` has the largest blast radius of any `/improve` mode (it
can rewrite files across review auto-fix AND optimize EXECUTING in one
run). Two safety rails apply.

### Required `--scope <path>`

`--mode full` REFUSES to run without an explicit `--scope <path>`
argument. Un-scoped full-mode runs are rejected with:

```
/improve --mode full requires explicit --scope <path>.
       Refusing to run against an implicit whole-repo scope.
       Example: /improve --mode full --scope src/auth/
```

Rejection exits cleanly: no session directory created, no files
written. The intent is to prevent accidental whole-repo rewrites.

### `--dry-run` Semantics

`--dry-run` is first-class for `--mode full`:

- Review DETECTING + PLANNING run normally (produces findings).
- Review EXECUTING runs in planning-only mode: auto-fixes are listed
  but NOT applied. `workflow/auto_fixes_applied.yaml` has
  `status: dry_run` on every entry.
- Optimize DETECTING + PLANNING run normally (produces opportunities,
  ROI ranking).
- Optimize EXECUTING runs in planning-only mode: opportunities are
  listed with `applied: false`. No `apply_atomic()` calls; no git
  stash operations.
- VALIDATING still runs: it compares the baseline against itself
  (delta = 0) and marks verdict as `DRY_RUN`.
- REPORTING writes the unified report with `applied: false` on every
  optimization row. Zero git writes; zero file modifications outside
  `cagents-memory/sessions/{session_id}/`.

Example:

```
/improve --mode full --scope src/ --dry-run
```

### Invariants

- No `--scope`: BLOCKED before any work begins.
- `--dry-run`: Zero git writes; every applied row is `applied: false`;
  baseline is not re-measured.
- Both: VALID. Use `--dry-run` to preview against a constrained scope.

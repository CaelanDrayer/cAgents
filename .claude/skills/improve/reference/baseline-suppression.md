# /improve Baseline Suppression

Wrapper around the legacy `/review` baseline suppression reference, adapted
for the new `_projects/{hash}/improve/` baseline path.

## Source of Truth

Full spec: `.claude/skills/review/reference/baseline-suppression.md`.

## Path Differences

| Legacy (/review) | New (/improve) |
|------------------|----------------|
| `_projects/{hash}/review/baseline.yaml` | `_projects/{hash}/improve/baseline.yaml` |
| `suppressed_findings: []` (in baseline) | `suppressed_findings: []` (identical schema) |
| `--suppress FIND-42` | `--suppress FIND-42` (same flag) |
| `--baseline` (compare to) | `--baseline` (same flag, reads new path) |

## Migration Behavior

`/improve --mode review` reads suppressed-finding lists from the baseline
discovered by the two-path lookup rule
(see [`baseline-migration.md`](baseline-migration.md)).

- If baseline loaded from primary path: use its `suppressed_findings` verbatim.
- If baseline loaded from legacy path: copy-forward already happened in
  MEASURING; the primary-path copy has the legacy suppression list.
- If placeholder was created: `suppressed_findings` is empty.

## Suppression Semantics

A finding is "suppressed" when its stable ID
(`{file}:{line}:{category}:{rule_id}` hash) appears in
`baseline.suppressed_findings`. Suppressed findings:

- Are included in `workflow/findings.yaml` with `suppressed: true`
- Are NOT counted toward quality-gate severity counts
- Surface in `reports/final_report.md` under a "Suppressed" section
- Still trigger D11 logging (no silent disappearance)

## Adding Suppressions

Run with `--suppress FIND-42` to add `FIND-42` to
`_projects/{hash}/improve/baseline.yaml.suppressed_findings` for future
runs. The next run will treat `FIND-42` as suppressed.

## Removing Suppressions

Edit `_projects/{hash}/improve/baseline.yaml` directly, or run
`--unsuppress FIND-42` (lands alongside EXECUTING in V10.26.25).

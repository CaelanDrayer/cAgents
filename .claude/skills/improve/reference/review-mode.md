# /improve --mode review — Flow Reference

This document describes the review-mode pipeline step-by-step as it lands
across V10.26.23–V10.26.25.

## Step 1: SCOPING (V10.26.23 — implemented)

Resolve target, create session dir, write `instruction.yaml` + `status.yaml`.

## Step 2: MEASURING (V10.26.23 — implemented)

Compute project hash, read/create baseline at `_projects/{hash}/improve/baseline.yaml`.
Falls back to legacy `_projects/{hash}/review/baseline.yaml` (copy-forward on
first read). See `baseline-migration.md`.

## Step 3: DETECTING (V10.26.24 — implemented)

Spawn 3 parallel specialist groups (correctness, security, quality) per the
shared `agent-groups.md`. Each group writes per-agent findings to
`workflow/detection/{group}/{agent}.yaml`.

## Step 4: PLANNING (V10.26.24 — implemented)

Aggregate per-agent findings, dedupe, rank by severity × confidence. Attach
baseline-suppression status (see `baseline-suppression.md`). Write
`workflow/findings.yaml`.

## Step 5: EXECUTING (V10.26.25 — implemented)

Only if `--auto-fix` is set. Port of `/review`'s atomic engine:

- Snapshot: `git stash push -u` or session backup if not a git repo
- Apply: run the fix
- Test: run guard command chain (npm test, lint, type-check as applicable)
- Keep if all green, else `git reset HEAD~1` / restore snapshot
- Max 3 per-fix retry rounds; dead-letter on exceed
- Write `workflow/auto_fixes_applied.yaml` with per-fix status

## Step 6: VALIDATING (V10.26.25 — implemented)

- 12 prime directives from `@reference/directives.md`
- Quality gate formula: `score = (1 - critical*0.2 - high*0.1 - med*0.05) * 100`
- Compare against baseline; fail if score delta < threshold

Write `reports/quality_gates.yaml`.

## Step 7: REPORTING (V10.26.25 — implemented)

Artifact set (identical to legacy `/review`):

- `reports/aggregate.yaml` — merged findings with severity, confidence, file:line
- `reports/auto_fixes.yaml` — applied/failed auto-fixes (empty if `--auto-fix` unset)
- `reports/quality_gates.yaml` — gate results, score, delta
- `reports/final_report.md` — human-readable summary

Append run entry to `_projects/{hash}/improve/history.yaml`.

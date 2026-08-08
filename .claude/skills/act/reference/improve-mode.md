# Improve Mode (Keyword Router)

In v12.1.2, the standalone `/improve` skill was folded into `/act` via a
keyword router. Users no longer invoke `/improve` directly; instead, `/act`
detects an improve-family keyword as the first token of the request and
sets an internal `mode` that the controller carries through coordination.

## Keyword Router Contract

When `/act` parses `$ARGUMENTS`, BEFORE flag parsing and BEFORE domain
routing, it checks whether the first whitespace-separated token of the
request is one of the four improve-family keywords:

| First-word keyword | Inferred `mode` | Behavior |
|--------------------|-----------------|----------|
| `improve` | `full` | Review-then-optimize with single shared baseline |
| `review` | `review` | Audit for correctness, security, quality |
| `audit` | `review` | Synonym for review (alias) |
| `optimize` | `optimize` | Measure, change, verify with ROI ranking |

The match is case-insensitive on the first token. If the first token matches,
the keyword is stripped from the request, the internal `mode` is set, and
`/act` proceeds with the standard 5-state pipeline (INIT -> ORCHESTRATED ->
PLANNED -> COORDINATED -> VALIDATED).

If the first token does not match, `/act` proceeds as before with no
improve-mode behavior.

### Keyword stripping example

Input: `/act improve src/auth/ --scope changed`
After router:
- mode = `full`
- request = `src/auth/`
- flags = `--scope changed`

Input: `/act review the auth module for security issues`
After router:
- mode = `review`
- request = `the auth module for security issues`
- flags = (none)

Input: `/act optimize src/api/queries.ts`
After router:
- mode = `optimize`
- request = `src/api/queries.ts`
- flags = (none)

### Explicit override

The router can be bypassed in two ways:

1. **Use `--mode` flag explicitly**: `/act review X --mode standard` forces
   `standard` mode and treats `review` as a regular word in the request.
2. **Keyword as non-first word**: `/act audit the review process` does
   NOT trigger improve-mode because `audit` is not the first token, but
   wait — `audit` IS first here. To embed a keyword as the second word
   onward, simply structure the request so the keyword does not lead.
   Example: `/act check audit logs for anomalies` -> no match (first word
   is `check`).

## Mode-Specific Controller Behavior

The keyword router collapses improve's 7-state machine (SCOPING ->
MEASURING -> DETECTING -> PLANNING -> EXECUTING -> VALIDATING ->
REPORTING) into `/act`'s 5-state machine. The improve-specific work is
carried by the controller selected during the PLANNED state:

### `mode: review`

- Controller spawns specialist groups (structural, security, quality)
  to scan the target.
- Findings ranked by `severity x confidence`.
- Optional `--auto-fix` flag delegates to atomic-rollback pattern in
  EXECUTING (handled inside the controller's reviewer loop).
- Output artifact: `outputs/final_report.md` with findings + quality
  gate verdict.

### `mode: optimize`

- Controller measures baseline via guard commands (test suite, bundle
  size, etc.) and stores in `cagents-memory/_projects/{hash}/improve/`.
- Specialist groups scan for ROI-ranked opportunities.
- Top-N changes applied atomically (snapshot, apply, test, keep or
  rollback) inside the controller's executor loop.
- Output artifact: `outputs/optimization_report.md` with before/after
  delta.

### `mode: full`

- Single shared baseline captured once during the MEASURING-equivalent
  step inside the planner/controller handoff.
- Review findings filtered for perf-relevance, seeded into optimize as
  opportunities.
- Both gate sets must PASS in the validator.
- Output artifact: `outputs/improve_report.md` with merged review +
  optimize sections.

## Atomic Rollback Pattern

For `mode: review` (when `--auto-fix` is set) and `mode: optimize`, the
controller's executor loop uses a snapshot / apply / test / keep-or-
rollback helper:

1. `git stash` (snapshot)
2. Apply the change via Edit/Write
3. Run guard chain (npm test, tsc --noEmit, etc.)
4. If guard PASSES: keep the change, commit
5. If guard FAILS: `git checkout -- {files}` (rollback to snapshot),
   mark opportunity as `rolled_back`

The helper runs a single attempt per call. Retry policy (max 2 attempts)
lives at the controller's call site, with the third failed attempt
moving the opportunity to `dead_letter` status.

## Cross-Session Artifacts

Improve modes write cross-session state under
`cagents-memory/_projects/{hash}/improve/`:

| Path | Purpose |
|------|---------|
| `baseline.yaml` | Quality baseline (review mode) |
| `baselines/` | Per-metric baselines (optimize mode) |
| `history.yaml` | All improve runs across sessions |
| `pattern_effectiveness.yaml` | Opportunity pattern success rates |
| `suppressions.yaml` | Findings suppressed from gate |

These survive session boundaries so subsequent improve invocations can
compare against historical state.

## Pattern Effectiveness Adjustment

Optimize PLANNING adjusts opportunity confidence using historical
pattern data:

- High historical success rate -> confidence bump (multiplier > 1.0)
- Repeated rollbacks -> confidence penalty (multiplier < 1.0)
- Exponential smoothing prevents single bad runs from over-correcting.

The controller reads `pattern_effectiveness.yaml` during its synthesis
step and adjusts the opportunity ranking before spawning executor agents.

## Output Contract Summary

| Mode | Primary artifact | Session location |
|------|------------------|------------------|
| review | `final_report.md` | `cagents-memory/sessions/{session_id}/outputs/` |
| optimize | `optimization_report.md` | `cagents-memory/sessions/{session_id}/outputs/` |
| full | `improve_report.md` | `cagents-memory/sessions/{session_id}/outputs/` |

All modes append to `cagents-memory/_projects/{hash}/improve/history.yaml`.

## Migration Note (v12.1.2)

The standalone `/improve` skill was removed in v12.1.2. The 7-state
state machine, mode-specific reference docs, and per-mode controller
behavior were collapsed into `/act`'s keyword-router flow. The
`scripts/migration/v12-aliases.yaml` file documents the removal so
historical session references resolve gracefully.

Users who previously typed `/improve X --mode review` now type
`/act review X`. The `--mode` flag remains valid as an explicit
override, but the first-word keyword is the canonical invocation.

## Related Reference

- `improve-optimization-types.md` - 8 optimization domains (code, content,
  process, infrastructure, data, campaign, creative, sales)
- `improve-risk-classification.md` - Risk tiers for auto-fix changes
- `improve-pattern-effectiveness.md` - Scoring math and modifier update
  rule
- `state-machine-detail.md` - /act's 5-state machine (which carries
  improve modes through the controller)

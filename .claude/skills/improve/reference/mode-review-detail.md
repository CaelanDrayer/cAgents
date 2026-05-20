# Review-Mode Detail

Full per-state behavior, dry-run mode, and exit messaging for `/improve --mode review`.

## SCOPING

Resolve target (`$ARGUMENTS[0]` if not a flag, else `.`). Build slug
(lowercase-hyphenated, max 32 chars from basename). Build session ID
`improve_{slug}_{YYMMDD}_{NNN}` (NNN = next unused counter under
`cagents-memory/sessions/`). Create
`cagents-memory/sessions/{session_id}/` and write `instruction.yaml`:

```yaml
skill: improve
mode: review
target: "{resolved_target_path}"
raw_arguments: "{$ARGUMENTS verbatim}"
created_at: "{ISO8601 UTC timestamp}"
session_id: "{session_id}"
```

Write `status.yaml` with `phase: scoped`, `state: SCOPING`, timestamp.

## MEASURING — Baseline Discovery Rule

Compute project hash (see `baseline-migration.md` for the hashing rule).
Baseline lookup:

1. **Canonical**: `cagents-memory/_projects/{hash}/improve/baseline.yaml`

If it exists, read it; set
`status.yaml.baseline_source = "primary"`. If it does not exist:
create it as a placeholder with `{quality_score: null,
last_measured: null}`; set `baseline_source = "placeholder"`.
Update `phase = measured`, `state = MEASURING`.

V11.0 removed the V10.26.23–V10.26.35 read-only `review/baseline.yaml`
fallback; the canonical `improve/` path is the single source of truth.

## DETECTING — Parallel Specialist Groups

Spawn the 3 review groups from `agent-groups.md` (canonical spec
as of V11.0). Groups run in dependency order (Group 1 parallel; Group 2
after Group 1; Group 3 after Group 2):

- **Group 1: Structural Analysis** (parallel, independent)
  - `cagents:architect` (invoked with `--review`)
  - `cagents:code-standards-auditor`
  - `cagents:technical-writer`
- **Group 2: Security & Performance** (parallel within group, after Group 1)
  - `cagents:security-engineer`
  - `cagents:performance-analyzer`
  - `cagents:test-coverage-validator`
- **Group 3: Specialized Analysis** (parallel within group, after Group 2)
  - `cagents:senior-developer`
  - `cagents:accessibility-checker`
  - `cagents:compliance-specialist`

Each agent writes findings to `workflow/detection/{group}/{agent}.yaml` with
schema: `{file, line, severity, confidence, category, message, suggestion}`.

**Dry-run mode**: When the environment variable `IMPROVE_DRY_AGENTS=1` is
set, DETECTING does NOT spawn agents. Instead, it writes a planned-spawn
record to `workflow/detection/planned_spawns.yaml` listing the agents that
would be spawned, and skips to PLANNING with an empty findings set. Used
by regression tests.

## PLANNING — Aggregate, Dedupe, Rank

Read all `workflow/detection/*/*.yaml` files. Deduplicate findings with
identical `(file, line, category)` tuples (highest confidence wins).
Rank by `severity_weight × confidence` where
`severity_weight = {critical: 4, high: 3, medium: 2, low: 1}`. Attach
baseline-suppression status per finding ID. Write
`workflow/findings.yaml`:

```yaml
findings:
  - id: FIND-001
    file: src/auth.ts
    line: 15
    severity: critical
    confidence: 0.9
    category: security
    message: "..."
    rank: 3.6
    suppressed: false
counts: {critical: 2, high: 5, medium: 8, low: 3, total: 18}
```

Update `status.yaml.phase = planned`, `state = PLANNING`.

## EXECUTING — Atomic Auto-Fix Loop

Only runs when `--auto-fix` is set. Canonical spec: `auto-fix-engine.md`.
Per-fix algorithm:

```
for fix in planned_fixes (sorted by confidence desc):
  snapshot = git_stash_push("improve-autofix-{fix.id}")  // or file backup
  apply(fix)
  guard_result = run_guard_chain(npm test, tsc --noEmit, lint)
  if guard_result == PASS:
    git_stash_drop(snapshot)
    record(fix, status=applied)
  else:
    restore(snapshot)
    record(fix, status=rolled_back, reason=guard_result.failure)
    retry_count += 1
    if retry_count < 3:
      feedback_loop(fix, guard_result.failure)
      continue
    else:
      record(fix, status=dead_letter)
```

Writes `workflow/auto_fixes_applied.yaml` with per-fix status
(`applied | rolled_back | dead_letter`) and the guard output.

## VALIDATING — 12 Prime Directives + Quality Gate

Read the 12 prime directives from `directives.md` (canonical as of
V11.0; formula and thresholds in `quality-gates.md`):

1. No critical findings unresolved
2. No high-severity security findings unresolved
3. Test suite passes (if tests exist)
4. Type check passes (if applicable)
5. Lint passes (if applicable)
6. No new file:line regressions vs baseline
7. Quality score does not drop more than 5 points vs baseline
8. Applied fixes did not introduce new findings
9. Rolled-back fixes are documented with reason
10. Dead-letter items escalated in the report
11. Baseline-suppressed findings not re-surfaced silently
12. Evidence chain complete (every finding has file:line)

Quality gate formula:

```
score = max(0, 100 - 20*critical_count - 10*high_count - 5*medium_count - 1*low_count)
verdict = PASS if score >= max(baseline_score - 5, threshold) else FAIL
```

Write `reports/quality_gates.yaml` with `directives[]` (D1..D12 with
`passed` + `evidence`), `quality_score` (current, baseline, delta,
threshold), and `verdict: PASS|FAIL`.

## REPORTING — Canonical Artifact Set

Writes the four canonical review artifacts:

- `reports/aggregate.yaml` — merged findings with severity, confidence, file:line
- `reports/auto_fixes.yaml` — applied/rolled-back/dead-letter fixes
- `reports/quality_gates.yaml` — 12 directives + score + verdict
- `reports/final_report.md` — human-readable summary

Appends a run entry to `_projects/{hash}/improve/history.yaml`:

```yaml
runs:
  - session_id: improve_src-auth_260421_001
    mode: review
    started_at: "2026-04-21T14:00:00Z"
    finished_at: "2026-04-21T14:04:32Z"
    verdict: PASS
    findings_count: 18
    auto_fixes_applied: 3
    quality_score_delta: -2
```

Update `status.yaml.phase = complete`, `status.yaml.state = REPORTING`.

## Exit Message

```
/improve --mode review: all 7 states complete.
  session_id: {session_id}
  baseline_source: {placeholder|primary|legacy_review_migrated}
  findings_count: {N}
  auto_fixes_applied: {M}
  quality_gate: {PASS|FAIL}
  quality_score: {0-100}
  report: cagents-memory/sessions/{session_id}/reports/final_report.md
```

`/improve --mode review` is the canonical review entry point as of V11.0.
It writes `baseline.yaml`, `history.yaml`, and the full `reports/*` set.

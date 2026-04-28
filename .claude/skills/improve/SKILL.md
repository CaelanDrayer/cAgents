---
name: improve
description: "Unified quality improvement engine for review and measurable optimization. Use for auditing code, documentation, content, infrastructure, or performance. TRIGGER: improve, review, audit, optimize. Mode selection via --mode review|optimize|full. NOT for: new implementation (/run) or design exploration (/designer)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "11.0.2"
  argument-hint: "[target] [--mode review|optimize|full] [flags]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TodoWrite
---

# /improve — Unified Review + Optimize Engine

`/improve` is the unified quality engine: a single 7-state state
machine — **SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING →
VALIDATING → REPORTING** — with mode selection via `--mode
review|optimize|full`. V11.0 removed the legacy `/review`, `/optimize`,
`/context`, and `/debug` slash commands after a two-version deprecation
window (V10.26.19–V10.26.35); `/improve` is now the canonical entry
point for review, optimization, and the unified full pipeline.

## Argument Handling (V10.26.21)

Parse `$ARGUMENTS` as a whitespace-separated token list. Extract the first
`--mode <value>` pair and validate it against the accepted set:

| Mode | Accepted value | V10.26.21 behavior |
|------|----------------|--------------------|
| review | `--mode review` | Accepted. Handler lands V10.26.23–25. |
| optimize | `--mode optimize` | Accepted. Handler lands in Cluster 5. |
| full | `--mode full` | Accepted. Handler lands after Cluster 5. |
| default (no flag) | — | Accepted. Defaults to `review`. |
| unknown | anything else | Rejected with usage message below. |

### Rejection message for unknown modes

```
/improve: unknown --mode value "{value}". Accepted: review, optimize, full.
         Default: review. See .claude/skills/improve/reference/flags.md.
```

Exit cleanly after printing. Do NOT spawn agents, create sessions, or write any
files. V10.26.21 is a parser-only patch.

### V10.26.23 handler status

- `--mode review`: SCOPING + MEASURING implemented. See
  [Review-Mode SCOPING + MEASURING](#review-mode-scoping--measuring-v102623)
  below. Exits with status `measured` after MEASURING; DETECTING lands in
  V10.26.24.
- `--mode optimize`: Parser branch wired (V10.26.27). SCOPING creates the
  session (`mode: optimize`) and writes `status.yaml` with
  `state: DETECTING_PENDING`, then exits with a
  `handler not yet implemented` notice. Full pipeline lands
  V10.26.28–V10.26.31.
- `--mode full`: Implemented in V10.26.33. Runs review-then-optimize
  with a shared baseline and synthesizes a unified `improve_report.md`.
  See [Full-Mode Pipeline](#full-mode-pipeline-v102633) below and
  [`reference/full-mode.md`](reference/full-mode.md).

See [`reference/flags.md`](reference/flags.md) for the flag catalog
structure that downstream patches will flesh out.

### Optimize-Mode Parser Branch (V10.26.27)

When `--mode optimize` is parsed:

1. Resolve target (first positional token that is not a flag; default `.`).
2. Build slug from target basename (kebab-case, max 32 chars).
3. Build session ID: `improve_{slug}_{YYMMDD}_{NNN}` — reuse the SCOPING
   counter rule from `--mode review`.
4. `mkdir -p Agent_Memory/sessions/{session_id}/`.
5. Write `instruction.yaml` with `mode: optimize` and the raw arguments.
6. Write `status.yaml` with `phase: scoped`, `state: DETECTING_PENDING`,
   and an ISO8601 `created_at` timestamp.
7. Print the following one-time notice and exit cleanly:

   ```
   /improve --mode optimize: parser branch live (V10.26.27).
     session_id: {session_id}
     state: DETECTING_PENDING
     note: DETECTING + MEASURING + EXECUTING land V10.26.28–V10.26.31.
   ```

No specialist agents are spawned. No `opportunities.yaml` is written. This
patch isolates argument-parsing churn from state-machine churn; every
later patch adds handler logic without revisiting the entry point.

## Optimize-Mode DETECTING (V10.26.28)

After SCOPING, `--mode optimize` advances to DETECTING. Spawn three
opportunity scanner groups in parallel via the Agent tool (independent,
read-only scans):

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

**Source of truth**: [`reference/phase-details.md`](reference/phase-details.md)
(ported from the legacy `/optimize` skill and now canonical). See
[`reference/optimize-mode.md`](reference/optimize-mode.md) for the full
opportunity schema and per-scanner scope.

## Optimize-Mode MEASURING (V10.26.30)

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
   `Agent_Memory/_projects/{hash}/improve/baselines/{timestamp}.yaml`.
4. Update `status.yaml.phase = measured`, `status.yaml.state = MEASURING`.

### Pattern Effectiveness Storage

Load historical pattern effectiveness for confidence adjustment during
PLANNING. Canonical path (see
[`reference/pattern-effectiveness-migration.md`](reference/pattern-effectiveness-migration.md)
for the historical migration record):

1. **Primary**: `Agent_Memory/_projects/{hash}/improve/pattern_effectiveness.yaml`
2. If the primary exists, read it; otherwise treat as an empty pattern
   table (new project).
3. All writes go to `improve/` only.

V11.0 removed the V10.26.30–V10.26.35 read-only legacy fallback; the
canonical `improve/` path is the single source of truth.

## Optimize-Mode EXECUTING + VALIDATING + REPORTING (V10.26.31)

`--mode optimize` is feature-complete after this patch. Full per-state
spec lives at [`reference/optimize-mode.md`](reference/optimize-mode.md).

### EXECUTING — ROI Rank + Atomic Apply

Compute ROI per opportunity, select top N, apply via the shared
atomic helper:

```
roi = (impact_weight × confidence) / effort_weight
impact_weight: {high: 3, medium: 2, low: 1}
effort_weight: {low: 1, medium: 2, high: 3}
```

Confidence is adjusted for known patterns via
`_projects/{hash}/improve/pattern_effectiveness.yaml`. Each opportunity
is applied through `apply_atomic(opp)` from
[`reference/atomic-rollback.md`](reference/atomic-rollback.md). Outcomes
(`kept | rolled_back | dead_letter`) append to
`workflow/execution_summary.yaml` incrementally.

### VALIDATING — Before/After Delta Verification

Re-run the same benchmark tool used in MEASURING. Compute per-metric
`delta_pct = (after - before) / before × 100`. Keep rule:

- Tests pass (regression guard) AND
- Target metric improved ≥ 5% (or configured absolute threshold) AND
- No metric regressed > 2%.

Otherwise roll back via atomic helper. Write
`workflow/validation_report.yaml` with `verdict`, `metrics_before`,
`metrics_after`, and per-metric `deltas` (each with `kept: bool`).

### REPORTING — Optimization Report

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

## Full-Mode Pipeline (V10.26.33)

`--mode full` runs review-then-optimize with a single shared baseline
and a synthesis step that produces a unified `improve_report.md`. This
is the headline capability of `/improve`.

### Order of Operations

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

### Perf-Relevant Filter Predicate

A finding feeds optimize if ANY of these holds:

```
finding.category ∈ {performance, perf, efficiency, bundle-size}
finding.tags ⊇ {performance, slow, n+1, memory, cpu}
finding.message matches /\b(slow|latency|bundle|memory|cpu|perf)\b/i
```

Security-only, standards-only, accessibility-only findings do NOT feed
optimize. They remain in `findings.yaml` and appear in the Review
Findings section of the unified report.

### Shared-Baseline Contract

The baseline is captured ONCE at mode-full start. Both review
MEASURING and optimize MEASURING read the same baseline file; neither
re-measures. This prevents double-measurement waste.

### Synthesized Report

`outputs/improve_report.md` contains:

- `## Review Findings` (severity counts, auto-fixes applied)
- `## Optimizations Applied` (opportunity table with before/after
  deltas, seeded-from-review subset called out)
- `## Quality Gate` (12 directives verdict)
- `## Baseline` (shared baseline reference)

Append a synthesized entry to `_projects/{hash}/improve/history.yaml`
with `mode: full`, `baseline_shared: true`, and per-sub-pipeline
counts.

See [`reference/full-mode.md`](reference/full-mode.md) for the full
predicate, synthesis schema, and exit message.

## Full-Mode Safety Gate (V10.26.34)

`--mode full` has the largest blast radius of any `/improve` mode (it
can rewrite files across review auto-fix AND optimize EXECUTING in one
run). V10.26.34 adds two safety rails.

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
  `Agent_Memory/sessions/{session_id}/`.

Example:

```
/improve --mode full --scope src/ --dry-run
```

### Invariants

- No `--scope`: BLOCKED before any work begins.
- `--dry-run`: Zero git writes; every applied row is `applied: false`;
  baseline is not re-measured.
- Both: VALID. Use `--dry-run` to preview against a constrained scope.

## Atomic Rollback Primitive (V10.26.29)

Both `--mode review` (auto-fix EXECUTING) and `--mode optimize`
(EXECUTING) share a single snapshot / apply / test / keep-or-rollback
helper, documented at
[`reference/atomic-rollback.md`](reference/atomic-rollback.md). The helper
owns: git_stash_push snapshot, apply, guard chain, and byte-exact
rollback on failure (`git diff --exit-code` post-condition).

Callers do NOT inline git-snapshot logic. They invoke `apply_atomic(change)`
and branch on the returned outcome (`kept | rolled_back | dead_letter`).
Retry policy and dead-letter cap live at the call site — the primitive
itself runs a single attempt.

## Review-Mode SCOPING + MEASURING (V10.26.23)

### SCOPING

Resolve target (`$ARGUMENTS[0]` if not a flag, else `.`). Build slug
(lowercase-hyphenated, max 32 chars from basename). Build session ID
`improve_{slug}_{YYMMDD}_{NNN}` (NNN = next unused counter under
`Agent_Memory/sessions/`). Create
`Agent_Memory/sessions/{session_id}/` and write `instruction.yaml`:

```yaml
skill: improve
mode: review
target: "{resolved_target_path}"
raw_arguments: "{$ARGUMENTS verbatim}"
created_at: "{ISO8601 UTC timestamp}"
session_id: "{session_id}"
```

Write `status.yaml` with `phase: scoped`, `state: SCOPING`, timestamp.

### MEASURING — Baseline Discovery Rule

Compute project hash (see
[`reference/baseline-migration.md`](reference/baseline-migration.md)
for the hashing rule). Baseline lookup:

1. **Canonical**: `Agent_Memory/_projects/{hash}/improve/baseline.yaml`

If it exists, read it; set
`status.yaml.baseline_source = "primary"`. If it does not exist:
create it as a placeholder with `{quality_score: null,
last_measured: null}`; set `baseline_source = "placeholder"`.
Update `phase = measured`, `state = MEASURING`.

V11.0 removed the V10.26.23–V10.26.35 read-only `review/baseline.yaml`
fallback; the canonical `improve/` path is the single source of truth.

### Exit Behavior (V10.26.25 — feature complete)

After REPORTING writes `reports/final_report.md`, the skill exits cleanly.
Prints:

```
/improve --mode review: all 7 states complete.
  session_id: {session_id}
  baseline_source: {placeholder|primary|legacy_review_migrated}
  findings_count: {N}
  auto_fixes_applied: {M}
  quality_gate: {PASS|FAIL}
  quality_score: {0-100}
  report: Agent_Memory/sessions/{session_id}/reports/final_report.md
```

`/improve --mode review` is the canonical review entry point as of V11.0.
It writes `baseline.yaml`, `history.yaml`, and the full `reports/*` set.

## Review-Mode DETECTING + PLANNING (V10.26.24)

### DETECTING — Parallel Specialist Groups

Spawn the 3 review groups from
[`reference/agent-groups.md`](reference/agent-groups.md) (canonical spec
as of V11.0). Groups run in dependency order (Group 1 parallel; Group 2
after Group 1; Group 3 after Group 2):

- **Group 1: Structural Analysis** (parallel, independent)
  - `cagents:architecture-reviewer`
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

### PLANNING — Aggregate, Dedupe, Rank

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

## Review-Mode EXECUTING + VALIDATING + REPORTING (V10.26.25)

### EXECUTING — Atomic Auto-Fix Loop

Only runs when `--auto-fix` is set. Canonical spec:
[`reference/auto-fix-engine.md`](reference/auto-fix-engine.md). Per-fix
algorithm:

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

### VALIDATING — 12 Prime Directives + Quality Gate

Read the 12 prime directives from
[`reference/directives.md`](reference/directives.md) (canonical as of
V11.0; formula and thresholds in
[`reference/quality-gates.md`](reference/quality-gates.md)):

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

### REPORTING — Canonical Artifact Set

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

## State Machine (V10.26.22)

The unified pipeline is a 7-state linear machine with per-mode behavior
markers. States are visited in order; a mode determines which work runs
inside each state. Full per-state artifacts and transition rules live in
[`reference/state-machine.md`](reference/state-machine.md).

```
SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING
```

### Per-State Mode Branches

Per-state review/optimize/full behavior summary:

| State | review | optimize | full |
|-------|--------|----------|------|
| SCOPING | session dir + instruction.yaml | same | same |
| MEASURING | quality baseline (improve/baseline.yaml) | perf baseline (improve/baselines/) | shared baseline captured ONCE |
| DETECTING | 3 review groups (correctness, security, quality) | 3 scanners (perf, size, efficiency) | review groups, then seeded optimize scanners |
| PLANNING | rank severity × confidence → findings.yaml | ROI rank → opportunities.yaml | unified plan: findings → fixes, opportunities → optimizations |
| EXECUTING | optional --auto-fix via atomic helper | atomic apply top-N | review auto-fix first, then optimize patches |
| VALIDATING | 12 prime directives + quality gate | before/after metric delta | both gate sets must pass |
| REPORTING | reports/*.yaml + final_report.md | optimization_report.md | merged improve_report.md with review + optimize sections |

All modes append to `_projects/{hash}/improve/history.yaml`.

### Artifact Locations

| Scope | Path |
|-------|------|
| Per-session | `Agent_Memory/sessions/improve_{slug}_{YYMMDD}_{NNN}/` |
| Cross-session baseline | `Agent_Memory/_projects/{hash}/improve/baseline.yaml` |
| Cross-session history | `Agent_Memory/_projects/{hash}/improve/history.yaml` |
| Cross-session pattern data | `Agent_Memory/_projects/{hash}/improve/pattern_effectiveness.yaml` |

### Transition Triggers

Transitions are strict: a state completes when its required output files exist
on disk. See `reference/state-machine.md` for per-state entry/exit conditions
and the error-recovery table.

## See Also

- `/run` — canonical workflow engine (implements features; also handles
  `/run context ...` and `/run --mode debug`)
- `/team` — parallel N-wave execution for tier 3+ work
- `/designer` — structured design Q&A
- `/helper` — command catalog and migration guidance
- `docs/MIGRATION-V11.md` — V11.0 removal migration guide
- `reference/state-machine.md`, `reference/review-mode.md`,
  `reference/optimize-mode.md`, `reference/full-mode.md`,
  `reference/agent-groups.md`, `reference/auto-fix-engine.md`,
  `reference/quality-gates.md`, `reference/phase-details.md`,
  `reference/risk-classification.md`, `reference/atomic-rollback.md`,
  `reference/baseline-migration.md`,
  `reference/pattern-effectiveness-migration.md`

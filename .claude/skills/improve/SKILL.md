---
name: improve
description: "Unified quality improvement engine combining /review auditing and /optimize measurable improvement. Use for auditing code, documentation, content, infrastructure, or performance. TRIGGER: improve, review, audit, optimize. Mode selection via --mode review|optimize|full. NOT for: new implementation (/run) or design exploration (/designer)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "10.26.32"
  argument-hint: "[target] [--mode review|optimize|full] [flags]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TodoWrite
---

# /improve — Unified Review + Optimize Engine (Preview)

**Status**: Preview in V10.26.19. Mode handlers land across V10.26.20–V10.26.26.
Until V10.26.23 lands the review-mode SCOPING+MEASURING implementation, this
skill is inert and prints a "handler not yet implemented" notice.

`/improve` consolidates the `/review` and `/optimize` skills into a single
7-state state machine. The cut-over lands in V10.26.26 (`/review` becomes a
shim → `/improve --mode review`). The `/optimize` shim follows in Cluster 5.

## Coming Soon

| Version | Delivery |
|---------|----------|
| V10.26.19 | Skeleton SKILL.md + helper catalog slot (this patch) |
| V10.26.20 | Register in `.claude-plugin/plugin.json` description |
| V10.26.21 | `--mode` flag parser (review/optimize/full, no-op handlers) |
| V10.26.22 | 7-state unified machine documented (SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING) |
| V10.26.23 | `--mode review` SCOPING + MEASURING with baseline migration |
| V10.26.24 | `--mode review` DETECTING + PLANNING (3 parallel specialist groups) |
| V10.26.25 | `--mode review` EXECUTING + VALIDATING + REPORTING (feature complete) |
| V10.26.26 | `/review` → shim over `/improve --mode review` |

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
- `--mode full`: Still a stub. Prints
  `mode=full; handler lands after Cluster 5.` and exits.

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

**Ported from**: `.claude/skills/optimize/reference/phase-details.md`
(legacy `/optimize` DETECTING phase). See
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

### Pattern Effectiveness Migration

Load historical pattern effectiveness for confidence adjustment during
PLANNING. Migration rule (see
[`reference/pattern-effectiveness-migration.md`](reference/pattern-effectiveness-migration.md)):

1. **Primary**: `Agent_Memory/_projects/{hash}/improve/pattern_effectiveness.yaml`
2. **Legacy fallback**: `Agent_Memory/_projects/{hash}/optimize/pattern_effectiveness.yaml`
3. If primary exists, read it. If absent but legacy exists, read legacy
   AND copy forward to primary (atomic write, legacy untouched). If
   neither exists, treat as empty pattern table.
4. All writes go to `improve/` only — the legacy `optimize/` path is
   never written after V10.26.30.

V11.0 removes the legacy-fallback read branch.

## Optimize-Mode EXECUTING + VALIDATING + REPORTING (V10.26.31)

`--mode optimize` is feature-complete after this patch. The remaining
three states wire ROI ranking, before/after delta verification, and
report generation.

### EXECUTING — ROI Rank + Atomic Apply

1. Read `workflow/opportunities.yaml` (produced by DETECTING).
2. For each opportunity, compute ROI:

   ```
   roi = (impact_weight × confidence) / effort_weight
   impact_weight: {high: 3, medium: 2, low: 1}
   effort_weight: {low: 1, medium: 2, high: 3}
   ```

3. Adjust `confidence` for known patterns using
   `_projects/{hash}/improve/pattern_effectiveness.yaml`
   (read via the migration rule in
   `reference/pattern-effectiveness-migration.md`).
4. Sort descending by `roi` and select top N (default 10,
   configurable via `--top-n <N>`).
5. For each selected opportunity, call `apply_atomic(opp)` from
   [`reference/atomic-rollback.md`](reference/atomic-rollback.md).
   Outcomes: `kept | rolled_back | dead_letter`.
6. Append each outcome to `workflow/execution_summary.yaml`
   incrementally (do not batch).

### VALIDATING — Before/After Delta Verification

1. Re-run the benchmark tool used in MEASURING (same tool for parity).
2. Read `Agent_Memory/_projects/{hash}/improve/baselines/{timestamp}.yaml`
   and compare per-metric.
3. Compute deltas: `delta_pct = (after - before) / before × 100`.
4. Apply kept/rolled-back rules per metric:
   - **Kept** only when: tests pass AND target metric improved ≥ 5%
     (or absolute threshold) AND no regressed metric > 2%.
   - Otherwise roll back via atomic helper.
5. Write `workflow/validation_report.yaml`:

   ```yaml
   verdict: PASS | FAIL | REVISE
   metrics_before: { ... }
   metrics_after:  { ... }
   deltas:
     lcp_ms: { before: 2400, after: 1900, delta_pct: -20.8, kept: true }
   ```

### REPORTING — Optimization Report

1. Write `outputs/optimization_report.md` with:
   - Executive summary (scanned, applied, rolled-back counts)
   - Per-opportunity detail (file, category, impact, before/after,
     verdict)
   - Appendix: pattern effectiveness updates
2. Append a run entry to `_projects/{hash}/improve/history.yaml`:

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

3. Update `_projects/{hash}/improve/pattern_effectiveness.yaml` with
   success/failure increments per applied pattern.
4. Update `status.yaml.phase = complete`, `status.yaml.state = REPORTING`.
5. Print the final exit message:

   ```
   /improve --mode optimize: all 7 states complete.
     session_id: {session_id}
     opportunities_scanned: {N}
     opportunities_applied: {M}
     opportunities_rolled_back: {K}
     verdict: {PASS|FAIL}
     report: Agent_Memory/sessions/{session_id}/outputs/optimization_report.md
   ```

`/improve --mode optimize` is now artifact-equivalent to legacy
`/optimize`. The `/optimize` shim lands in V10.26.32.

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

1. Resolve target (`$ARGUMENTS[0]` if not a flag, else `.`).
2. Build slug: lowercase-hyphenated short description (derived from target
   path basename, max 32 chars).
3. Build session ID: `improve_{slug}_{YYMMDD}_{NNN}` where NNN is the next
   unused 3-digit counter under `Agent_Memory/sessions/`.
4. Create session directory `Agent_Memory/sessions/{session_id}/`.
5. Write `instruction.yaml`:

   ```yaml
   skill: improve
   mode: review
   target: "{resolved_target_path}"
   raw_arguments: "{$ARGUMENTS verbatim}"
   created_at: "{ISO8601 UTC timestamp}"
   session_id: "{session_id}"
   ```

6. Write `status.yaml` with `phase: scoped`, `state: SCOPING`, timestamp.

### MEASURING — Baseline Discovery Rule

1. Compute project hash (see
   [`reference/baseline-migration.md`](reference/baseline-migration.md)).
   Use the same hashing rule as `/review` and `/optimize` so the hash is
   stable across skills.
2. Look for baseline in this order:
   a. **Primary**: `Agent_Memory/_projects/{hash}/improve/baseline.yaml`
   b. **Legacy fallback**: `Agent_Memory/_projects/{hash}/review/baseline.yaml`
3. If (a) exists, read it.
4. If (a) does not exist but (b) exists: read (b), copy it forward to (a)
   using atomic write (write to `{path}.tmp` then `rename`). The legacy
   file is left untouched for back-compat with any still-running `/review`
   shim. Set `status.yaml.baseline_source = "legacy_review_migrated"`.
5. If neither exists: create (a) as a placeholder with
   `{quality_score: null, last_measured: null}` and set
   `status.yaml.baseline_source = "placeholder"`.
6. Update `status.yaml.phase = measured`, `status.yaml.state = MEASURING`.

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

`/improve --mode review` is now artifact-equivalent to legacy `/review`:
baseline.yaml, history.yaml, and the full `reports/*` set are written, with
the `/review` shim landing in V10.26.26.

## Review-Mode DETECTING + PLANNING (V10.26.24)

### DETECTING — Parallel Specialist Groups

Spawn the 3 review groups from
[`reference/agent-groups.md`](reference/agent-groups.md), which includes the
canonical definitions from `.claude/skills/review/reference/agent-groups.md`.
Groups run in dependency order (Group 1 parallel; Group 2 after Group 1;
Group 3 after Group 2):

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

1. Read all `workflow/detection/*/*.yaml` files produced by DETECTING.
2. Deduplicate findings with identical `(file, line, category)` tuples;
   keep the highest-confidence variant.
3. Rank each finding by `severity_weight × confidence` where
   `severity_weight = {critical: 4, high: 3, medium: 2, low: 1}`.
4. Attach baseline-suppression status by checking if the finding ID matches
   a suppressed entry in the baseline.
5. Write `workflow/findings.yaml`:

   ```yaml
   findings:
     - id: FIND-001
       file: src/auth.ts
       line: 15
       severity: critical
       confidence: 0.9
       category: security
       message: "..."
       suggestion: "..."
       rank: 3.6
       suppressed: false
   counts:
     critical: 2
     high: 5
     medium: 8
     low: 3
     total: 18
   ```

6. Update `status.yaml.phase = planned`, `status.yaml.state = PLANNING`.

## Review-Mode EXECUTING + VALIDATING + REPORTING (V10.26.25)

### EXECUTING — Atomic Auto-Fix Loop

Only runs when `--auto-fix` is set. Ported directly from
`.claude/skills/review/reference/auto-fix-engine.md`. Per-fix algorithm:

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
[`reference/directives.md`](reference/directives.md) (ported from
`.claude/skills/review/reference/quality-gates.md`):

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

Write `reports/quality_gates.yaml`:

```yaml
directives:
  - id: D1
    passed: true
    evidence: "0 critical findings"
  # ... D2-D12
quality_score:
  current: 87
  baseline: 89
  delta: -2
  threshold: 70
verdict: PASS
```

### REPORTING — Legacy Artifact Set

Writes all four files that legacy `/review` produced:

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

| State | review | optimize | full |
|-------|--------|----------|------|
| **SCOPING** | Resolve target, create `sessions/improve_*/`, write `instruction.yaml` | Same | Same |
| **MEASURING** | Read/init quality baseline from `_projects/{hash}/improve/baseline.yaml` (fallback: legacy `_projects/{hash}/review/baseline.yaml`) | Read/init perf/size baseline metrics | Both review + optimize baselines |
| **DETECTING** | Spawn 3 parallel review groups (correctness, security, quality) | Spawn optimize scanners (8 optimization types) | Review groups, then optimize scanners |
| **PLANNING** | Aggregate findings, rank severity × confidence, write `findings.yaml` | Rank opportunities by ROI, write `opportunities.yaml` | Unified plan: findings → fixes, opportunities → optimizations |
| **EXECUTING** | Optional `--auto-fix` snapshot→apply→test→rollback loop | `--dry-run` or snapshot→apply→remeasure→keep-or-rollback | Review auto-fix first, then optimize patches |
| **VALIDATING** | 12 prime directives + quality gate thresholds | Before/after metric comparison, regression guards | Both gate sets must pass |
| **REPORTING** | Write `reports/aggregate.yaml`, `reports/auto_fixes.yaml`, `reports/quality_gates.yaml`, `reports/final_report.md`, append `_projects/{hash}/improve/history.yaml` | Write `optimization_report.md`, append `_projects/{hash}/improve/history.yaml` | Merged report with review section + optimize section |

### Artifact Locations

| Scope | Path |
|-------|------|
| Per-session | `Agent_Memory/sessions/improve_{slug}_{YYMMDD}_{NNN}/` |
| Cross-session baseline | `Agent_Memory/_projects/{hash}/improve/baseline.yaml` |
| Cross-session history | `Agent_Memory/_projects/{hash}/improve/history.yaml` |
| Migration fallback (read-only) | `Agent_Memory/_projects/{hash}/review/baseline.yaml` |

### Transition Triggers

Transitions are strict: a state completes when its required output files exist
on disk. See `reference/state-machine.md` for per-state entry/exit conditions
and the error-recovery table.

## Cross-Session Baseline Location

Baselines persist at `Agent_Memory/_projects/{hash}/improve/baseline.yaml`.
During the migration window (V10.26.23+), `/improve --mode review` falls back
to reading `Agent_Memory/_projects/{hash}/review/baseline.yaml` if the new
location is absent and copies the legacy file forward on first read.

## See Also

- `/review` — legacy review skill (becomes shim in V10.26.26)
- `/optimize` — legacy optimize skill (becomes shim in Cluster 5)
- `/run` — canonical workflow engine
- `Agent_Memory/sessions/team_consolidation-tiny-bumps_260421_001/outputs/cluster_4_roadmap.md` — full patch schedule

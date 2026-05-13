---
name: improve
description: "Unified quality improvement engine for review and measurable optimization. Use for auditing code, documentation, content, infrastructure, or performance. TRIGGER: improve, review, audit, optimize. Mode selection via --mode review|optimize|full. NOT for: new implementation (/run) or design exploration (/designer)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "11.2.11"
  argument-hint: "[target] [--mode review|optimize|full] [flags]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet
---

# /improve — Unified Review + Optimize Engine

`/improve` is the unified review + optimize engine: a single 7-state state
machine — **SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING →
VALIDATING → REPORTING** — with mode selection via `--mode
review|optimize|full`. V11.0 removed the legacy `/review`, `/optimize`,
`/context`, and `/debug` slash commands; `/improve` is now the canonical
entry point for review, optimization, and the unified full pipeline.

## STOP Rule for Session Init

If a session has not been initialized for this skill (no
`cagents-memory/sessions/improve_*` directory matching the resolved
target), STOP and run SCOPING first. Do NOT spawn DETECTING agents,
write `findings.yaml`, or modify any file outside the session directory
until `instruction.yaml` and `status.yaml` exist on disk.

## Mode Selection

Parse `$ARGUMENTS` as a whitespace-separated token list. Extract the first
`--mode <value>` pair and validate:

| Mode | Accepted value | Behavior |
|------|----------------|----------|
| review | `--mode review` | Audit + optional auto-fix. Quality-gate verdict. |
| optimize | `--mode optimize` | Measure, scan, ROI-rank, atomic-apply, before/after delta. |
| full | `--mode full` | Review-then-optimize with shared baseline + unified report. |
| default (no flag) | — | Defaults to `review`. |
| unknown | anything else | Rejected with usage message. |

### Rejection message for unknown modes

```
/improve: unknown --mode value "{value}". Accepted: review, optimize, full.
         Default: review. See reference/flags.md.
```

Exit cleanly after printing. Do NOT spawn agents, create sessions, or write any
files when the mode is rejected.

See [`reference/flags.md`](reference/flags.md) for the full flag catalog.

## State Machine

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
| SCOPING | session dir + instruction.yaml | same | same |
| MEASURING | quality baseline (improve/baseline.yaml) | perf baseline (improve/baselines/) | shared baseline captured ONCE |
| DETECTING | 3 review groups (correctness, security, quality) | 3 scanners (perf, size, efficiency) | review groups, then seeded optimize scanners |
| PLANNING | rank severity × confidence → findings.yaml | ROI rank → opportunities.yaml | unified plan: findings → fixes, opportunities → optimizations |
| EXECUTING | optional --auto-fix via atomic helper | atomic apply top-N | review auto-fix first, then optimize patches |
| VALIDATING | 12 prime directives + quality gate | before/after metric delta | both gate sets must pass |
| REPORTING | reports/*.yaml + final_report.md | optimization_report.md | merged improve_report.md with review + optimize sections |

All modes append to `_projects/{hash}/improve/history.yaml`.

### Transition Triggers

Transitions are strict: a state completes when its required output files exist
on disk. See [`reference/state-machine.md`](reference/state-machine.md) for
per-state entry/exit conditions and the error-recovery table.

## Mode: Review

Audit a target for correctness, security, and quality. Spawns three
parallel specialist groups (structural, security/perf, specialized),
deduplicates findings, ranks by `severity × confidence`, optionally
runs atomic auto-fix, then evaluates 12 prime directives and produces
a quality-gate verdict.

Canonical artifacts: `reports/aggregate.yaml`, `reports/auto_fixes.yaml`,
`reports/quality_gates.yaml`, `reports/final_report.md`. Full per-state
behavior, dry-run mode, and exit messaging live in
[`reference/mode-review-detail.md`](reference/mode-review-detail.md).
Specialist group spec: [`reference/agent-groups.md`](reference/agent-groups.md).
Quality-gate formula: [`reference/quality-gates.md`](reference/quality-gates.md).
12 directives: [`reference/directives.md`](reference/directives.md).

## Mode: Optimize

Measure a baseline, scan for ROI-ranked opportunities, atomically
apply the top N, verify the before/after delta, and roll back any
opportunity that regresses tests or metrics.

Canonical artifact: `outputs/optimization_report.md`. Full per-state
behavior, scanner groups, ROI math, and exit messaging live in
[`reference/mode-optimize-detail.md`](reference/mode-optimize-detail.md).
Opportunity schema and per-scanner scope:
[`reference/optimize-mode.md`](reference/optimize-mode.md). Phase
contract source-of-truth: [`reference/phase-details.md`](reference/phase-details.md).

## Mode: Full

Review-then-optimize with a single shared baseline. Filters review
findings for perf relevance, seeds them as opportunities into
optimize, runs both gate sets in VALIDATING, and synthesizes a
unified report.

Canonical artifact: `outputs/improve_report.md` with `## Review
Findings`, `## Optimizations Applied`, `## Quality Gate`, and
`## Baseline` sections. Full pipeline, perf-relevant filter predicate,
shared-baseline contract, safety gate (`--scope` required), and
`--dry-run` semantics live in
[`reference/mode-full-detail.md`](reference/mode-full-detail.md) and
[`reference/full-mode.md`](reference/full-mode.md).

## Atomic Rollback Primitive

Both `--mode review` (auto-fix EXECUTING) and `--mode optimize`
(EXECUTING) share a single snapshot / apply / test / keep-or-rollback
helper. The helper owns: git stash snapshot, apply, guard chain, and
byte-exact rollback on failure (`git diff --exit-code` post-condition).

Callers do NOT inline git-snapshot logic. They invoke
`apply_atomic(change)` and branch on the returned outcome
(`kept | rolled_back | dead_letter`). Retry policy and dead-letter
cap live at the call site — the primitive itself runs a single attempt.
Full helper contract: [`reference/atomic-rollback.md`](reference/atomic-rollback.md).

## Baselines, Benchmarks, and Suppression

The `--baseline <path>`, `--benchmark <tool>`, and `--suppress
<pattern>` flags govern how `/improve` measures and gates. Baselines
live at `cagents-memory/_projects/{hash}/improve/`. Benchmarks
default to `auto` heuristic detection (lighthouse for web, k6 for
APIs, hyperfine for CLI). Suppression marks findings as
non-counting toward the quality gate while keeping them visible in
the report. Full flag detail and gate math:
[`reference/baselines-and-benchmarks.md`](reference/baselines-and-benchmarks.md),
[`reference/baseline-suppression.md`](reference/baseline-suppression.md),
[`reference/baseline-migration.md`](reference/baseline-migration.md).

## Pattern Effectiveness Tracking

Optimize PLANNING adjusts opportunity confidence using cross-session
pattern data at
`cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml`.
Patterns with high historical success rates get a confidence bump;
patterns that have rolled back repeatedly get penalized. Modifier
update uses exponential smoothing to prevent single bad runs from
over-correcting. Full scoring math, modifier update rule, and
inspection commands: [`reference/pattern-effectiveness.md`](reference/pattern-effectiveness.md).
Historical migration record: [`reference/pattern-effectiveness-migration.md`](reference/pattern-effectiveness-migration.md).

## Output Contract

| Mode | Primary report | Cross-session artifacts |
|------|----------------|-------------------------|
| review | `cagents-memory/sessions/{session_id}/reports/final_report.md` | `_projects/{hash}/improve/{baseline.yaml,history.yaml,suppressions.yaml}` |
| optimize | `cagents-memory/sessions/{session_id}/outputs/optimization_report.md` | `_projects/{hash}/improve/{baselines/,history.yaml,pattern_effectiveness.yaml}` |
| full | `cagents-memory/sessions/{session_id}/outputs/improve_report.md` | shared baseline + both per-mode artifact sets |

`improve_report.md` (full mode) is the headline artifact: it merges
review findings, applied optimizations (with seeded-from-review subset
called out), the quality-gate verdict, and the shared baseline
reference into a single human-readable summary.

## Artifact Locations

| Scope | Path |
|-------|------|
| Per-session | `cagents-memory/sessions/improve_{slug}_{YYMMDD}_{NNN}/` |
| Cross-session baseline | `cagents-memory/_projects/{hash}/improve/baseline.yaml` |
| Cross-session history | `cagents-memory/_projects/{hash}/improve/history.yaml` |
| Cross-session pattern data | `cagents-memory/_projects/{hash}/improve/pattern_effectiveness.yaml` |

## See Also

- `/run` — canonical workflow engine (implements features; also handles
  `/run context ...` and `/run --mode debug`)
- `/team` — parallel N-wave execution for tier 3+ work
- `/designer` — structured design Q&A
- `/helper` — command catalog and migration guidance
- `docs/MIGRATION-V11.md` — V11.0 removal migration guide
- Reference catalog: `reference/state-machine.md`,
  `reference/mode-review-detail.md`, `reference/mode-optimize-detail.md`,
  `reference/mode-full-detail.md`, `reference/baselines-and-benchmarks.md`,
  `reference/pattern-effectiveness.md`, `reference/agent-groups.md`,
  `reference/auto-fix-engine.md`, `reference/atomic-rollback.md`,
  `reference/quality-gates.md`, `reference/directives.md`,
  `reference/phase-details.md`, `reference/risk-classification.md`,
  `reference/baseline-migration.md`, `reference/baseline-suppression.md`,
  `reference/pattern-effectiveness-migration.md`,
  `reference/review-mode.md`, `reference/optimize-mode.md`,
  `reference/full-mode.md`, `reference/flags.md`,
  `reference/framework-patterns.md`, `reference/optimization-types.md`,
  `reference/cross-file-analysis.md`, `reference/report-formats.md`

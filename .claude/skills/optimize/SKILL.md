---
name: optimize
description: "Detect and fix performance, size, and efficiency issues with rollback safety. Use when you need measurable improvements with before/after metrics. TRIGGER: optimize, speed up, reduce size, improve performance. NOT for: review-only (/review) or new features (/run)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "10.26.35"
  argument-hint: "[<target>] [--type <type>] [--dry-run] [--interactive] [--rollback]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TodoWrite, Skill
---

# /optimize — Deprecation Shim (V10.26.32+)

**`/optimize` is now a thin shim over `/improve --mode optimize`.** The
state machine (DETECTING → MEASURING → PLANNING → EXECUTING →
VALIDATING → REPORTING), risk classification, atomic rollback, and
ROI ranking still run — they are delivered by the unified `/improve`
engine (V10.26.27–V10.26.31) with identical artifact output
(baseline_metrics.yaml, opportunities.yaml, optimization_report.md,
history.yaml). This shim preserves the `/optimize` user surface while
removing the duplicated state machine.

## Deprecation Notice

Emit this notice EXACTLY ONCE per session, on the first `/optimize`
invocation:

```
NOTE: /optimize is a shim as of V10.26.32. It forwards to /improve --mode optimize.
      /optimize will be removed in V11.0.0 — `/improve --mode optimize` is the
      canonical form. See .claude/skills/improve/SKILL.md for the unified
      7-state pipeline, .claude/skills/improve/reference/optimize-mode.md
      for the per-state spec, and
      https://github.com/CaelanDrayer/cAgents/blob/main/docs/RELEASE_NOTES.md
      for the migration guide.
```

The notice MUST NOT block execution. After printing it once, suppress it
for the rest of the session. Idempotency key: `session_id`. Log the
emission to `Agent_Memory/_system/logs/deprecations_{date}.log`.

## Shim Behavior

1. **Parse arguments**: Accept the same surface as pre-V10.26.32
   `/optimize`. All flags are forwarded verbatim to
   `/improve --mode optimize`:
   - Positional: `<target>` (path or natural-language goal)
   - `--type <type>` (`code|content|process|infrastructure|data|campaign|creative|sales`)
   - `--focus <area>` (performance|cost|quality)
   - `--safety <level>` (safe|medium|all)
   - `--dry-run` (plan but do not apply)
   - `--incremental` (apply opportunities in small batches)
   - `--parallel` (launch independent optimizations in parallel)
   - `--rollback automatic` (auto-rollback on any failure)
   - `--cross-file` / `--no-cross-file` / `--cross-file-only` / `--dependency-graph`
   - `--plan-only` / `--explore-first` / `--review-after`
   - `--validation comprehensive` / `--require-tests-pass`
   - `--interactive` (ask user preferences)
   - `--history` (show past session outcomes)
   - `--benchmark auto|lighthouse|k6|hyperfine`
2. **Build the forward request**: Prefix `--mode optimize` is added; all
   other flags pass through untouched. Positional target stays in
   position.
3. **Invoke `/improve` via the Skill tool**:
   ```
   Skill({ skill: "improve", args: "<target> --mode optimize <all other flags verbatim>" })
   ```
   Do NOT spawn any agents directly from this shim. `/improve` owns
   session initialization, opportunity scanning, MEASURING, EXECUTING
   (atomic apply), VALIDATING (before/after delta), and REPORTING.
4. **Return `/improve`'s output verbatim** to the user. The shim adds no
   post-processing beyond the one-time deprecation notice.

## What the Shim Preserves

- **Back-compat surface**: `/optimize src/` still works.
- **All flags pass through**: every legacy flag reaches the /improve
  pipeline, including `--dry-run`, `--benchmark`, `--safety`, `--type`,
  `--cross-file`, `--rollback automatic`, and the 8 optimization types.
- **Session creation**: `/improve --mode optimize` creates a session in
  `Agent_Memory/sessions/improve_*` (instead of the legacy
  `sessions/optimize_*` directory). Baselines and pattern effectiveness
  copy forward automatically on first read from
  `_projects/{hash}/optimize/` to `_projects/{hash}/improve/` (see
  `.claude/skills/improve/reference/baseline-migration.md` and
  `.claude/skills/improve/reference/pattern-effectiveness-migration.md`).
- **Artifact set**: identical — `baseline_metrics.yaml`,
  `opportunities.yaml`, `optimization_report.md`, and appended
  `history.yaml` are produced exactly as legacy `/optimize` produced
  them.
- **Atomic rollback**: preserved identically via the shared helper at
  `.claude/skills/improve/reference/atomic-rollback.md`.
- **ROI ranking, risk classification, learning data**: unchanged.

## What the Shim Does NOT Do

- Create session directories (that lives in `/improve` SCOPING).
- Spawn specialist agents directly (performance-analyzer,
  code-standards-auditor).
- Write `instruction.yaml`, `status.yaml`, or `opportunities.yaml`.
- Apply changes (that lives in `/improve` EXECUTING).
- Compute deltas (that lives in `/improve` VALIDATING).

## Removal Schedule

- **V10.26.32 (this patch)**: Shim active, notice emitted once per
  session.
- **V10.26.33–V10.26.35**: Shim remains; deprecation notice upgraded to
  include removal date V11.0.0 in V10.26.35.
- **V11.0.0**: Shim file removed entirely. `/improve --mode optimize`
  is the only entry point. The `optimize/reference/` files (source of
  truth for flags, optimization-types, cross-file-analysis, etc.) move
  to `improve/reference/` at that time.

## Reference

- Unified /improve pipeline: `.claude/skills/improve/SKILL.md`
- /improve --mode optimize spec:
  `.claude/skills/improve/reference/optimize-mode.md`
- Shared atomic-rollback helper:
  `.claude/skills/improve/reference/atomic-rollback.md`
- Baseline migration rule:
  `.claude/skills/improve/reference/baseline-migration.md`
- Pattern effectiveness migration rule:
  `.claude/skills/improve/reference/pattern-effectiveness-migration.md`
- Legacy /optimize reference files (still source of truth until V11.0):
  `.claude/skills/optimize/reference/flags.md`,
  `.claude/skills/optimize/reference/optimization-types.md`,
  `.claude/skills/optimize/reference/phase-details.md` (ported banner
  added V10.26.28),
  `.claude/skills/optimize/reference/risk-classification.md` (migrated
  banner added V10.26.29),
  `.claude/skills/optimize/reference/cross-file-analysis.md`,
  `.claude/skills/optimize/reference/session-management.md`

## See Also

- `/improve --mode optimize` — canonical optimize invocation (V10.26.31+)
- `/improve --mode review` — canonical review invocation (V10.26.25+)
- `/improve --mode full` — combined review+optimize (V10.26.33+)
- `/run` — general-purpose workflow engine

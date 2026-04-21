---
name: review
description: "Quality review with parallel specialist agents and optional auto-fix. Use for reviewing code, docs, content, or infrastructure. TRIGGER: review, audit, check quality, code review. NOT for: optimization (/optimize) or new implementation (/run)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "10.26.32"
  argument-hint: "<target> [--focus <area>] [--auto-fix] [--severity <level>] [--format <type>] [--profile <name>] [--baseline] [--suppress <id>]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TodoWrite, Skill
---

# /review — Deprecation Shim (V10.26.26+)

**`/review` is now a thin shim over `/improve --mode review`.** The 3-group
parallel specialist pipeline still runs; it is delivered by the unified
`/improve` engine (V10.26.19–V10.26.25) with identical artifact output
(`baseline.yaml`, `history.yaml`, `reports/aggregate.yaml`,
`reports/auto_fixes.yaml`, `reports/quality_gates.yaml`,
`reports/final_report.md`). This shim preserves the `/review` user surface
while removing the duplicated state machine.

## Deprecation Notice

Emit this notice EXACTLY ONCE per session, on the first `/review`
invocation:

```
NOTE: /review is a shim as of V10.26.26. It forwards to /improve --mode review.
      /review will be removed in V11.0 — `/improve --mode review` is the
      canonical form. See .claude/skills/improve/SKILL.md for the unified
      7-state pipeline.
```

The notice MUST NOT block execution. After printing it once, suppress it
for the rest of the session.

## Shim Behavior

1. **Parse arguments**: Accept the same surface as pre-V10.26.26 `/review`.
   All flags are forwarded verbatim to `/improve --mode review`:
   - Positional: `<target>` (path or file; required if no flags)
   - `--focus <area>` (security, performance, accessibility, standards, etc.)
   - `--auto-fix` / `--auto-fix safe`
   - `--severity <level>` (critical, high, medium, low)
   - `--mode paranoid|quick|security|pre-merge` (legacy review sub-modes;
     forwarded as-is under `/improve --mode review`)
   - `--baseline`
   - `--suppress <finding-id>`
   - `--profile <name>` (pre-merge, etc.)
   - `--show-confidence`
   - `--run-tests`
   - `--rollback-on-failure`
   - `--critical-first`
   - `--pr-context`
   - `--git-hotspots`
   - `--format <type>` / `--output <format>`
   - `--scope <target>` / `--scope changed`
   - `--framework <name>`
   - `--quality-gate <level>`
   - `--parallel` (default)
   - `--apply-safe-fixes`
   - `--save-report <path>`
2. **Build the forward request**: Prefix `--mode review` is added; all other
   flags pass through untouched. Positional target (if any) stays in position.
3. **Invoke `/improve` via the Skill tool**:
   ```
   Skill({ skill: "improve", args: "<target> --mode review <all other flags verbatim>" })
   ```
   Do NOT spawn any agents directly from this shim. `/improve` owns session
   initialization, parallel agent groups, auto-fix, quality gates, and
   report writing.
4. **Return `/improve`'s output verbatim** to the user. The shim adds no
   post-processing beyond the one-time deprecation notice.

## What the Shim Preserves

- **Back-compat surface**: `/review src/auth/` still works.
- **All flags pass through**: every legacy flag reaches the /improve pipeline.
- **Session creation**: `/improve --mode review` creates a session in
  `Agent_Memory/sessions/improve_*` (instead of the legacy `sessions/review_*`
  directory). Baselines copy-forward automatically on first read from
  `_projects/{hash}/review/baseline.yaml` to
  `_projects/{hash}/improve/baseline.yaml` (see
  `.claude/skills/improve/reference/baseline-migration.md`).
- **Artifact set**: identical — `baseline.yaml`, `history.yaml`, and the
  full `reports/*` set are produced exactly as legacy `/review` produced them.
- **Parallel specialist groups**: the 3-group execution plan (structural,
  security/performance, specialized) runs via the agent-groups reference
  that `/improve` includes from `/review`.
- **12 prime directives + quality gate**: preserved identically.

## What the Shim Does NOT Do

- Create session directories (that lives in `/improve` SCOPING).
- Spawn specialist agents directly.
- Write `instruction.yaml`, `status.yaml`, or findings files.
- Apply auto-fixes (that lives in `/improve` EXECUTING).
- Compute quality gates (that lives in `/improve` VALIDATING).

## Removal Schedule

- **V10.26.26 (this patch)**: Shim active, notice emitted once per session.
- **V10.27.x–V10.28.x**: Shim remains; notice may become more insistent.
- **V11.0.0**: Shim file removed entirely. `/improve --mode review` is the
  only entry point. The `review/reference/` files (source of truth for
  agent-groups, auto-fix-engine, quality-gates, etc.) move to
  `improve/reference/` at that time.

## Reference

- Unified /improve pipeline: `.claude/skills/improve/SKILL.md`
- /improve state machine: `.claude/skills/improve/reference/state-machine.md`
- Baseline migration rule: `.claude/skills/improve/reference/baseline-migration.md`
- 12 prime directives: `.claude/skills/improve/reference/directives.md`
- Legacy /review reference files (still source of truth until V11.0):
  `.claude/skills/review/reference/agent-groups.md`,
  `.claude/skills/review/reference/auto-fix-engine.md`,
  `.claude/skills/review/reference/quality-gates.md`,
  `.claude/skills/review/reference/baseline-suppression.md`,
  `.claude/skills/review/reference/flags.md`,
  `.claude/skills/review/reference/framework-patterns.md`,
  `.claude/skills/review/reference/report-formats.md`

## See Also

- `/improve --mode review` — canonical review invocation (V10.26.25+)
- `/improve --mode optimize` — canonical optimize invocation (Cluster 5)
- `/improve --mode full` — combined review+optimize (post-Cluster 5)
- `/run` — general-purpose workflow engine

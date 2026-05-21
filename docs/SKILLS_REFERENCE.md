# Skills Reference

**Version**: V12.2.0 current

Complete reference for the 4 user-invocable skills shipped with cAgents (v12.2.0+): `/designer`, `/helper`, `/run`, `/team`. Use `/helper` for interactive, in-terminal guidance, or read this document end-to-end to understand the full skill ecosystem.

_V11.0 removed `/review`, `/optimize`, `/context`, and `/debug` — see [MIGRATION-V11.md](./MIGRATION-V11.md). v12.1.2 folded `/improve` into `/run` via a first-word keyword router. v12.2.0 removed `/org` and absorbed cross-domain coordination into `/team` strategic mode. A summary of removed skills and migration paths is at the [end of this document](#removed-in-v110-and-v12)._

---

## Overview

cAgents v12.2.0+ ships exactly 4 user-invocable skills: `designer`, `helper`, `run`, `team`. Every skill lives under `.claude/skills/{name}/SKILL.md` and is registered through `.claude-plugin/plugin.json`. All four skills run through the same event-driven pipeline architecture; they differ in scope, interactivity, and parallelism. The `/improve` skill was folded into `/run` (v12.1.2 keyword router); the `/org` skill was absorbed into `/team` strategic mode (v12.2.0).

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/designer` | `none` | `false` | Guided design exploration that produces implementation-ready documents through structured Q&A |
| `/helper` | `none` | `false` | Explains cAgents commands and recommends the right one for your task |
| `/run` | `none` | `true` | Executes any single-domain task through auto-routed controller and specialist agents; also handles review/optimize/full modes via the v12.1.2 keyword router (`run review …`, `run optimize …`, `run improve …`) |
| `/team` | `fork` | `true` | Parallel multi-agent execution with wave-based quality gates; strategic mode (auto-enabled when `universal-router.domain_count >= 2`, or via `--strategic`) handles the cross-domain C-suite work previously done by `/org` |

`Context` values are the literal `metadata.context` frontmatter values: `none` runs the skill inline in the main conversation; `fork` spawns the skill in an isolated subagent context. `Agent` indicates whether the skill spawns subagents to do its work.

---

## Choosing a Skill

Use the table below to pick the right skill at a glance. For a deeper interactive walkthrough, run `/helper` or `/helper --compare`.

| Task | Skill |
|------|-------|
| Build, fix, write, or implement single-domain work | `/run` |
| Run 3+ work items in parallel with quality gates | `/team` |
| Coordinate strategy across 2+ business domains | `/team` (strategic mode auto-enables, or `--strategic` to force) |
| Plan or design before building | `/designer` |
| Audit code, content, or infrastructure (review only) | `/run review <target>` (or `/run --mode review`) |
| Apply measurable performance, cost, or quality improvements | `/run optimize <target>` (or `/run --mode optimize`) |
| Combine review and optimization in one pass | `/run improve <target>` (or `/run --mode full`) |
| Decide which skill to use | `/helper` |

### Decision tree

```
Need a strategic, multi-domain initiative (engineering + marketing, etc.)?
  YES -> /team (strategic mode auto-enables; force with --strategic) [v12.2.0+]
         (Pre-v12.2.0 this was /org, now absorbed into /team strategic mode.)
  NO  v

Want to clarify requirements through Q&A before building?
  YES -> /designer  (then /run --from-designer to build)
  NO  v

Want to audit, optimize, or both for existing work?
  YES -> /improve --mode review|optimize|full
  NO  v

Have 3+ independent work items that can run in parallel?
  YES -> /team
  NO  v

-> /run   (single-domain work, standard pipeline)
```

---

## Per-Skill Reference

Each section below covers one skill. Skills are listed alphabetically: `/designer`, `/helper`, `/run`, `/team`. (Pre-v12.2.0 also included `/improve` and `/org` — both removed; their replacements are documented in the [removed-skills section](#removed-in-v110-and-v12).)

### /designer

**Purpose**: Transforms vague ideas into implementation-ready design documents through structured Q&A. Research subagents pre-build context-rich question lists; the designer acts as an inline controller, presenting and adapting questions based on user responses. This is the only interactive skill in cAgents — auto-proceed rules do not apply, and `AskUserQuestion` is mandatory at each step.

**When to use**:
- Clarifying requirements before implementation
- Exploring architectural options for a new system
- Iterating on a partially-formed feature spec
- Pre-populating an implementation pipeline (`/run --from-designer`)

**Key flags**:

| Flag | Purpose |
|------|---------|
| `--deep` | Enable research subagents in all 6 design phases |
| `--resume <session_id>` | Resume a paused design session |
| `--iterate <session_id>` | Load a completed design and apply targeted modifications |
| `--template <name>` | Start from a built-in design template |
| `--brief <path>` | Pre-populate from a strategic brief (produced by `/team` strategic mode in v12.2.0+, or pre-v12.2.0 `/org`) |

**Example invocation**:

```bash
/designer Authentication system with OAuth2
/designer --deep API gateway architecture
```

**Session artifacts**:
- `workflow/design_document.yaml` — Implementation-ready spec (consumed by `/run --from-designer`)
- `workflow/decision_log.yaml` — Design decisions with rationale

---

### /helper

**Purpose**: Explains cAgents commands and recommends the right one for your task. `/helper` does not execute work — it teaches the skill ecosystem, offers natural-language recommendations, and shows side-by-side comparisons.

**When to use**:
- Choosing between `/run`, `/team` (with or without strategic mode), and `/designer`
- Looking up flags or examples for a specific skill
- Diagnosing why a skill is not behaving as expected (`--troubleshoot`)
- Onboarding a new user to cAgents

**Key flags**:

| Flag | Purpose |
|------|---------|
| `--compare` | Side-by-side comparison of all skills |
| `--flags <command>` | Show all flags for a specific skill |
| `--examples` | Real-world examples across all skills |
| `--quick` | Brief summary only |
| `--topic <topic>` | Focus on `flags`, `integration`, `domains`, or `workflow` |
| `--troubleshoot <command>` | Diagnose issues with a specific skill |

**Example invocation**:

```bash
/helper
/helper how do I fix a bug
/helper --flags improve
```

---

### /improve

**Purpose**: A unified quality engine that runs a single 7-state state machine — `SCOPING -> MEASURING -> DETECTING -> PLANNING -> EXECUTING -> VALIDATING -> REPORTING` — with mode selection via `--mode review|optimize|full`. `/improve` is the V11 successor to the legacy `/review` and `/optimize` skills; it covers code, documentation, content, infrastructure, and performance.

**When to use**:
- Running a code review with parallel specialist agents (`--mode review`)
- Applying measurable performance, cost, or quality improvements with before/after metrics (`--mode optimize`)
- Running review and optimization back-to-back, with a unified report (`--mode full`)
- Replacing legacy `/review` or `/optimize` invocations after the V11 migration

**Key flags**:

| Flag | Purpose |
|------|---------|
| `--mode review\|optimize\|full` | Select review-only, optimize-only, or combined pipeline |
| `--focus <area>` | Scope the run to `security`, `performance`, `style`, or `docs` |
| `--auto-fix` | Apply high-confidence fixes automatically (review mode) |
| `--severity <level>` | Filter findings to `critical`, `high`, `medium`, or `low` |
| `--baseline` | Save current findings as a baseline for future runs |
| `--suppress <id>` | Suppress a specific finding ID |
| `--benchmark <tool>` | Pick a benchmark integration (`auto`, `lighthouse`, `k6`, `hyperfine`) |
| `--dry-run` | Preview opportunities without applying changes |
| `--rollback` | Roll back the last optimization session |

**Example invocation**:

```bash
/improve src/auth/ --mode review --focus security
/improve src/api/ --mode optimize --benchmark auto
/improve . --mode full
```

**Session artifacts**:
- `workflow/improve_report.md` — Unified report (mode `full`)
- `workflow/review_report.yaml` — Findings with evidence (consumed by `/run --from-review`)
- `workflow/optimization_report.yaml` — Before/after metrics for every change
- `workflow/rollback_manifest.yaml` — Git snapshots for safe rollback

---

### /org — REMOVED in v12.2.0

`/org` was removed in v12.2.0 and absorbed into `/team` strategic mode. Cross-domain coordination — CEO + C-suite deliberation, strategic brief, dependency-ordered per-domain dispatch — now runs inside `/team` when `universal-router.domain_count >= 2`. The 12 leadership agents are preserved at their existing locations and act as Wave 0/1 teammates inside `/team` strategic mode.

**Migration**:

| Pre-v12.2.0 (/org) | v12.2.0+ (/team strategic mode) |
|--------------------|---------------------------------|
| `/org <request>` | `/team <request>` (strategic mode auto-enables for multi-domain) |
| `/org <request> --quick` | `/team <request> --strategic` (force-enable for single-domain) |
| `/org <request> --dry-run` | `/team <request> --dry-run` |
| `/org <request> --domains <d1,d2>` | `/team <request>` (universal-router infers domains from request keywords) |
| `/org --resume <session_id>` | `/team --resume <session_id>` |

See `.claude/skills/team/reference/strategic-mode.md` for the full protocol, brief schema, escalation behavior, and examples.

---

### /run

**Purpose**: Executes any single-domain task through a config-driven state machine. `/run` reads `pipeline_config.yaml`, routes to the right domain controller, and coordinates specialist execution agents. The pipeline progresses automatically through orchestration, planning, decomposition, coordination, and validation.

**When to use**:
- Building, fixing, writing, or implementing single-domain work
- Consuming output from `/designer` (`--from-designer`) or `/improve --mode review` (`--from-review`)
- Resuming a paused session (`--resume`)
- Previewing routing without execution (`--dry-run`)

**Key flags**:

| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview the routing decision without executing |
| `--quiet` / `-q` | Minimal output |
| `--team` | Run as `/team` (parallel execution) |
| `--analytics` | Show pipeline analytics dashboard |
| `--from-review` | Read `review_report.yaml` and create fix work items |
| `--from-designer` | Read a design document and use it as the implementation spec |
| `--resume <session_id>` | Resume a previous session from the last checkpoint |
| `--brief <path>` | Load a strategic brief (produced by `/team` strategic mode in v12.2.0+, or pre-v12.2.0 `/org`) |
| `--interactive` | Pause at decision points for user input |

**Example invocation**:

```bash
/run Fix auth token expiry bug
/run Implement user profile page --from-designer
```

**Session artifacts**:
- `workflow/enriched_context.yaml` — Orchestrator context enrichment
- `workflow/plan.yaml` — Domain, tier, controller, objectives
- `workflow/work_items.yaml` — Decomposed work items with acceptance criteria
- `workflow/coordination_log.yaml` — Controller Q&A and synthesis
- `workflow/validation_report.yaml` — `PASS` / `FAIL` / `REVISE` verdict

---

### /team

**Purpose**: Creates a real agent team via `TeamCreate` and executes work in parallel waves with quality gates between waves. Each wave spawns fresh teammate agents (controllers) that delegate to execution specialists, producing 40-60% execution-time reduction for tier 3+ work. Maximizes wave count for stronger gating.

**When to use**:
- Tier 3+ tasks with 3+ parallelizable work items
- Time-sensitive delivery requiring speedup
- Large features composed of distinct components
- Running `/run` work in parallel via `/run --team`

**Key flags**:

| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview wave structure without executing |
| `--waves <n>` | Force a minimum number of waves |
| `--members <n>` | Override default team size |
| `--teammate-mode tmux\|auto\|in-process` | Display mode for teammate panes |
| `--no-template` | Skip auto-template selection |

**Example invocation**:

```bash
/team Implement OAuth2 authentication
/team Build user dashboard with charts and tables --waves 8
```

**Session artifacts**:
- `workflow/plan.yaml`, `workflow/work_items.yaml`
- `team/task_list.yaml` — Status overlay for all work items
- `team/team_manifest.yaml` — Team composition and display mode
- `workflow/coordination_log.yaml` — Per-wave coordination output

---

## Comparison Summary

| Aspect | `/designer` | `/helper` | `/run` | `/team` |
|--------|-------------|-----------|--------|---------|
| Interactive | Yes (mandatory) | Yes | No | No |
| Spawns subagents | Yes (research) | No | Yes | Yes (teammates; C-suite teammates in strategic mode) |
| Parallel execution | No | No | No (use `--team` to upgrade) | Yes (waves) |
| Scope | Single design | Documentation | Single domain (incl. review/optimize/full via keyword router) | Single or cross-domain (strategic mode for 2+ domains) |
| Context mode | `none` | `none` | `none` | `fork` |
| Output | Design document | Recommendations | Implementation + validation (and/or review/optimization report when run in review/optimize/full mode) | Implementation + per-wave coordination (plus strategic brief in strategic mode) |

---

## Skill Chaining

Skills can be composed by passing structured output from one to the next.

### Design then build

```bash
/designer Authentication system with OAuth2
/run Implement auth system --from-designer
```

`/designer` writes `workflow/design_document.yaml`; `/run --from-designer` reads it and uses the design as the implementation spec.

### Review then fix

```bash
/improve src/auth/ --mode review --focus security
/run Fix review findings --from-review
```

`/improve --mode review` writes `workflow/review_report.yaml`; `/run --from-review` reads it and auto-creates fix work items.

### Strategic mode (cross-domain, automatic — v12.2.0+ replacement for the old /org -> /team chain)

`/team` strategic mode auto-enables when `universal-router.domain_count >= 2`. The wave-0/1/2 C-suite deliberation produces `workflow/strategic_brief.yaml`, then waves 3..N execute per-domain (replacing the old `/org` -> sequential `/team --brief` chain with a single nested-wave run). You do not invoke this chain manually.

### Optimize then validate

`/improve --mode full` runs review and optimization back-to-back in a single state machine, producing a unified `improve_report.md`.

---

## Session Artifacts Summary

All skills write artifacts to `cagents-memory/sessions/{session_id}/`. Session IDs follow the pattern `{command}_{slug}_{YYMMDD}_{NNN}` (for example, `run_fix-auth_260317_001`).

| Artifact | Written by | Consumed by |
|----------|-----------|-------------|
| `workflow/enriched_context.yaml` | `/run` orchestrator | planner, controller |
| `workflow/plan.yaml` | `/run` planner | controller, executor |
| `workflow/work_items.yaml` | `/run` decomposer | controller, validator |
| `workflow/coordination_log.yaml` | controller | validator |
| `workflow/validation_report.yaml` | validator | `/run` state machine |
| `workflow/improve_report.md` | `/improve` (mode `full`) | user |
| `workflow/review_report.yaml` | `/improve --mode review` | `/run --from-review` |
| `workflow/optimization_report.yaml` | `/improve --mode optimize` | user |
| `workflow/design_document.yaml` | `/designer` | `/run --from-designer` |
| `workflow/strategic_brief.yaml` | `/team` strategic mode (Wave 0/1/2 deliberation) — pre-v12.2.0 produced by `/org` | downstream per-domain waves; `/run --brief` for ad-hoc consumers |
| `team/task_list.yaml` | `/team` | teammates, lead |

---

## Quick Flag Reference

| Skill | Flags |
|-------|-------|
| `/designer` | `--deep`, `--resume <id>`, `--iterate <id>`, `--template <name>`, `--brief <path>` |
| `/helper` | `--compare`, `--flags <cmd>`, `--examples`, `--quick`, `--topic <topic>`, `--troubleshoot <cmd>` |
| `/improve` | `--mode review\|optimize\|full`, `--focus <area>`, `--auto-fix`, `--severity <level>`, `--baseline`, `--suppress <id>`, `--benchmark <tool>`, `--dry-run`, `--rollback` |
| ~~`/org`~~ (removed v12.2.0; use `/team --strategic`) | n/a — flags migrated: `--dry-run` -> `/team --dry-run`; `--quick` -> `/team --strategic`; `--domains` -> auto-inferred by universal-router; `--resume` -> `/team --resume <team_session_id>` |
| `/run` | `--dry-run`, `--quiet`, `--team`, `--analytics`, `--from-review`, `--from-designer`, `--resume <id>`, `--brief <path>`, `--interactive` |
| `/team` | `--dry-run`, `--waves <n>`, `--members <n>`, `--teammate-mode tmux\|auto\|in-process`, `--no-template` |

---

## Removed in V11.0 and V12

V11.0 removed four skills after a two-version deprecation window (V10.26.19–V10.26.35). The functionality has migrated to `/improve` or built-in Claude Code memory commands. **Do not invoke the removed skills** — they are not registered in `plugin.json` and will fall through to no-op or unrecognized-command handling.

| Removed skill | Replacement | Migration notes |
|---------------|-------------|-----------------|
| `/review` | `/improve --mode review` | Same review modes (`security`, `paranoid`, `quick`, `pre-merge`) reachable via `--focus` and `--mode` flags |
| `/optimize` | `/improve --mode optimize` | Same optimization types and benchmark integrations; `--rollback` and `--benchmark` flags preserved |
| `/context` | Built-in `/memory` plus the `cagents-memory/_projects/{hash}/product_context.yaml` file | Manual or `/memory`-driven persistence replaces the auto-init flow |
| `/debug` | `/run` with explicit reproduction steps | The standard `/run` pipeline now handles root-cause investigation through controller question delegation |
| `/improve` (v12.1.2) | `/run review`, `/run optimize`, `/run improve` (or `/run --mode review\|optimize\|full`) | First-word keyword router; all `/improve` flags (`--baseline`, `--suppress`, `--benchmark`, `--auto-fix`, `--severity`, etc.) remain available on `/run` |
| `/org` (v12.2.0) | `/team` strategic mode | Auto-enables when `universal-router.domain_count >= 2`; force-enable with `--strategic`; force-disable with `--no-strategic`. The 12 leadership agents are preserved at their existing locations and act as Wave 0/1 teammates |

For full migration details, see [MIGRATION-V11.md](./MIGRATION-V11.md) (V11 removals) and the v12.1.2 / v12.2.0 entries in [CHANGELOG.md](../CHANGELOG.md).

---

## Related Documentation

- `CLAUDE.md` — Pipeline architecture, agent catalog, and quick reference
- [ARCHITECTURE.md](./ARCHITECTURE.md) — System architecture and agent tiers
- [COMMANDS.md](./COMMANDS.md) — Compact skill comparison
- [COMMAND_SELECTION.md](./COMMAND_SELECTION.md) — Decision tree for picking a skill
- [GETTING_STARTED.md](./GETTING_STARTED.md) — Onboarding walkthrough
- [MIGRATION-V11.md](./MIGRATION-V11.md) — Full V11 migration guide

For interactive guidance, run `/helper`.

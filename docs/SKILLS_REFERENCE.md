# Skills Reference

**Last verified**: v12.43.0

Complete reference for the 4 user-invocable skills shipped with cAgents (v12.2.0+): `/designer`, `/helper`, `/act`, `/team`. Use `/helper` for interactive, in-terminal guidance, or read this document end-to-end to understand the full skill ecosystem.

_V11.0 removed `/review`, `/optimize`, `/context`, and `/debug` — see [MIGRATION-V11.md](./MIGRATION-V11.md). v12.1.2 folded `/improve` into `/act` via a first-word keyword router. v12.2.0 removed `/org` and absorbed cross-domain coordination into `/team` strategic mode. A summary of removed skills and migration paths is at the [end of this document](#removed-in-v110-and-v12). Dated entries name the execution skill `/act`; it was called `/run` before the rename._

---

## Overview

cAgents v12.2.0+ ships exactly 4 user-invocable skills: `designer`, `helper`, `act`, `team`. Every skill lives under `.claude/skills/{name}/SKILL.md` and is registered through `.claude-plugin/plugin.json`. All four skills run through the same event-driven pipeline architecture; they differ in scope, interactivity, and parallelism. The `/improve` skill was folded into `/act` (v12.1.2 keyword router); the `/org` skill was absorbed into `/team` strategic mode (v12.2.0).

| Skill | Context | Agent | Description |
|-------|---------|-------|-------------|
| `/designer` | `none` | `false` | Guided design exploration that produces implementation-ready documents through structured Q&A |
| `/helper` | `none` | `false` | Explains cAgents commands and recommends the right one for your task |
| `/act` | `none` | `true` | Executes any single-domain task through auto-routed controller and specialist agents; also handles review/optimize/full modes via the v12.1.2 keyword router (`act review …`, `act optimize …`, `act improve …`) |
| `/team` | `fork` | `true` | Parallel multi-agent execution with wave-based quality gates; strategic mode (auto-enabled when `router.domain_count >= 2`, or via `--strategic`) handles the cross-domain C-suite work previously done by `/org` |

`Context` values are the literal `metadata.context` frontmatter values: `none` runs the skill inline in the main conversation; `fork` spawns the skill in an isolated subagent context. `Agent` indicates whether the skill spawns subagents to do its work.

---

## Choosing a Skill

Use the table below to pick the right skill at a glance. For a deeper interactive walkthrough, run `/helper` or `/helper --compare`.

| Task | Skill |
|------|-------|
| Build, fix, write, or implement single-domain work | `/act` |
| Run 3+ work items in parallel with quality gates | `/team` |
| Coordinate strategy across 2+ business domains | `/team` (strategic mode auto-enables, or `--strategic` to force) |
| Plan or design before building | `/designer` |
| Audit code, content, or infrastructure (review only) | `/act review <target>` (or `/act --mode review`) |
| Apply measurable performance, cost, or quality improvements | `/act optimize <target>` (or `/act --mode optimize`) |
| Combine review and optimization in one pass | `/act improve <target>` (or `/act --mode full`) |
| Decide which skill to use | `/helper` |

### Decision tree

```
Need a strategic, multi-domain initiative (engineering + marketing, etc.)?
  YES -> /team (strategic mode auto-enables; force with --strategic) [v12.2.0+]
         (Pre-v12.2.0 this was /org, now absorbed into /team strategic mode.)
  NO  v

Want to clarify requirements through Q&A before building?
  YES -> /designer  (then /act --from-designer to build)
  NO  v

Want to audit, optimize, or both for existing work?
  YES -> /act review|optimize|improve  (= --mode review|optimize|full)
  NO  v

Have 3+ independent work items that can run in parallel?
  YES -> /team
  NO  v

-> /act   (single-domain work, standard pipeline)
```

---

## Per-Skill Reference

Each section below covers one skill, in the order `/designer`, `/helper`, `/act`, `/team`. (Pre-v12.2.0 also included `/improve` and `/org` — both removed; their replacements are documented in the [removed-skills section](#removed-in-v110-and-v12).)

### /designer

**Purpose**: Transforms vague ideas into implementation-ready design documents through structured Q&A. Research subagents pre-build context-rich question lists; the designer acts as an inline controller, presenting and adapting questions based on user responses. This is the only interactive skill in cAgents — auto-proceed rules do not apply, and `AskUserQuestion` is mandatory at each step.

**When to use**:
- Clarifying requirements before implementation
- Exploring architectural options for a new system
- Iterating on a partially-formed feature spec
- Pre-populating an implementation pipeline (`/act --from-designer`)

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
- `workflow/design_document.yaml` — Implementation-ready spec (consumed by `/act --from-designer`)
- `workflow/decision_log.yaml` — Design decisions with rationale

---

### /helper

**Purpose**: Explains cAgents commands and recommends the right one for your task. `/helper` does not execute work — it teaches the skill ecosystem, offers natural-language recommendations, and shows side-by-side comparisons.

**When to use**:
- Choosing between `/act`, `/team` (with or without strategic mode), and `/designer`
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

### /improve — REMOVED in v12.1.2

`/improve` was folded into `/act` via a first-word keyword router in v12.1.2. Use `/act improve|review|audit|optimize <request>` instead: `improve` → `--mode full`, `review`/`audit` → `--mode review`, `optimize` → `--mode optimize`. All prior flags (`--focus`, `--auto-fix`, `--severity`, `--baseline`, `--suppress`, `--benchmark`, `--dry-run`, `--rollback`) remain available as flags on `/act`. See `.claude/skills/act/reference/improve-mode.md` for the keyword router contract.

---

### /org — REMOVED in v12.2.0

`/org` was removed in v12.2.0 and absorbed into `/team` strategic mode. Cross-domain coordination — CEO + C-suite deliberation, strategic brief, dependency-ordered per-domain dispatch — now runs inside `/team` when `router.domain_count >= 2`. The 9 leadership agents are preserved at their existing locations and act as Wave 0/1 teammates inside `/team` strategic mode.

**Migration**:

| Pre-v12.2.0 (/org) | v12.2.0+ (/team strategic mode) |
|--------------------|---------------------------------|
| `/org <request>` | `/team <request>` (strategic mode auto-enables for multi-domain) |
| `/org <request> --quick` | `/team <request> --strategic` (force-enable for single-domain) |
| `/org <request> --dry-run` | `/team <request> --dry-run` |
| `/org <request> --domains <d1,d2>` | `/team <request>` (router infers domains from request keywords) |
| `/org --resume <session_id>` | `/team --resume <session_id>` |

See `.claude/skills/team/reference/strategic-mode.md` for the full protocol, brief schema, escalation behavior, and examples.

---

### /act

**Purpose**: Executes any single-domain task through a config-driven state machine. `/act` reads `pipeline_config.yaml`, routes to the right domain controller, and coordinates specialist execution agents. The pipeline progresses automatically through orchestration, planning (with inline decomposition), coordination, and validation.

**When to use**:
- Building, fixing, writing, or implementing single-domain work
- Consuming output from `/designer` (`--from-designer`) or `/act review` (`--from-review`)
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
/act Fix auth token expiry bug
/act Implement user profile page --from-designer
```

**Session artifacts**:
- `workflow/enriched_context.yaml` — Orchestrator context enrichment
- `workflow/plan.yaml` — Domain, tier, controller, objectives
- `workflow/work_items.yaml` — Decomposed work items with acceptance criteria
- `workflow/coordination_log.yaml` — Controller Q&A and synthesis
- `workflow/validation_report.yaml` — `PASS` / `FAIL` / `REVISE` verdict

---

### /team

**Purpose**: Executes work in parallel waves with quality gates between waves. For each wave the lead spawns its teammate controllers as concurrent `Agent()` calls in one message (teams are implicit — the `TeamCreate`/`TeamDelete` tools were removed in CC v2.1.178, so cleanup is automatic), and each teammate delegates to execution specialists, producing 40-60% execution-time reduction for tier 3+ work. Maximizes wave count for stronger gating.

**When to use**:
- Tier 3+ tasks with 3+ parallelizable work items
- Time-sensitive delivery requiring speedup
- Large features composed of distinct components
- Running `/act` work in parallel via `/act --team`

**Key flags**:

| Flag | Purpose |
|------|---------|
| `--dry-run` | Preview wave structure without executing |
| `--waves <n>` | Force a minimum number of waves |
| `--members <n>` | Override default team size |
| `--teammate-mode in-process\|auto\|tmux` | Display mode (default `in-process`; `tmux`/`auto` panes are experimental-path only) |
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

| Aspect | `/designer` | `/helper` | `/act` | `/team` |
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
/act Implement auth system --from-designer
```

`/designer` writes `workflow/design_document.yaml`; `/act --from-designer` reads it and uses the design as the implementation spec.

### Review then fix

```bash
/act review src/auth/ --focus security
/act Fix review findings --from-review
```

`/act review` writes `workflow/review_report.yaml`; `/act --from-review` reads it and auto-creates fix work items.

### Strategic mode (cross-domain, automatic — v12.2.0+ replacement for the old /org -> /team chain)

`/team` strategic mode auto-enables when `router.domain_count >= 2`. The wave-0/1/2 C-suite deliberation produces `workflow/strategic_brief.yaml`, then waves 3..N execute per-domain (replacing the old `/org` -> sequential `/team --brief` chain with a single nested-wave run). You do not invoke this chain manually.

### Optimize then validate

`/act improve` (= `--mode full`) runs review and optimization back-to-back in a single state machine, producing a unified `improve_report.md`.

---

## Session Artifacts Summary

All skills write artifacts to `cagents-memory/sessions/{session_id}/`. Session IDs follow the pattern `{command}_{slug}_{YYMMDD}_{NNN}` (for example, `act_fix-auth_260317_001`).

| Artifact | Written by | Consumed by |
|----------|-----------|-------------|
| `workflow/enriched_context.yaml` | `/act` orchestrator | planner, controller |
| `workflow/plan.yaml` | `/act` planner | controller, executor |
| `workflow/work_items.yaml` | `/act` planner | controller, validator |
| `workflow/coordination_log.yaml` | controller | validator |
| `workflow/validation_report.yaml` | validator | `/act` state machine |
| `workflow/improve_report.md` | `/act` (full mode) | user |
| `workflow/review_report.yaml` | `/act` (review mode) | `/act --from-review` |
| `workflow/optimization_report.yaml` | `/act` (optimize mode) | user |
| `workflow/design_document.yaml` | `/designer` | `/act --from-designer` |
| `workflow/strategic_brief.yaml` | `/team` strategic mode (Wave 0/1/2 deliberation) — pre-v12.2.0 produced by `/org` | downstream per-domain waves; `/act --brief` for ad-hoc consumers |
| `team/task_list.yaml` | `/team` | teammates, lead |

---

## Quick Flag Reference

| Skill | Flags |
|-------|-------|
| `/designer` | `--deep`, `--resume <id>`, `--iterate <id>`, `--template <name>`, `--brief <path>` |
| `/helper` | `--compare`, `--flags <cmd>`, `--examples`, `--quick`, `--topic <topic>`, `--troubleshoot <cmd>` |
| ~~`/improve`~~ (folded into `/act` v12.1.2; use `/act review\|optimize\|improve`) | flags now on `/act`: `--mode review\|optimize\|full`, `--focus <area>`, `--auto-fix`, `--severity <level>`, `--baseline`, `--suppress <id>`, `--benchmark <tool>`, `--dry-run`, `--rollback` |
| ~~`/org`~~ (removed v12.2.0; use `/team --strategic`) | n/a — flags migrated: `--dry-run` -> `/team --dry-run`; `--quick` -> `/team --strategic`; `--domains` -> auto-inferred by router; `--resume` -> `/team --resume <team_session_id>` |
| `/act` | `--dry-run`, `--quiet`, `--team`, `--analytics`, `--from-review`, `--from-designer`, `--resume <id>`, `--brief <path>`, `--interactive` |
| `/team` | `--dry-run`, `--waves <n>`, `--members <n>`, `--teammate-mode tmux\|auto\|in-process`, `--no-template` |

---

## Removed in V11.0 and V12

V11.0 removed four skills after a two-version deprecation window (V10.26.19–V10.26.35). The functionality has migrated to `/act` review/optimize modes or built-in Claude Code memory commands. **Do not invoke the removed skills** — they are not registered in `plugin.json` and will fall through to no-op or unrecognized-command handling. (Note: V11.0 originally migrated `/review` and `/optimize` to `/improve`, which was itself folded into `/act` in v12.1.2 — the current target is `/act review` / `/act optimize`.)

| Removed skill | Replacement | Migration notes |
|---------------|-------------|-----------------|
| `/review` | `/act review` | Same review modes (`security`, `paranoid`, `quick`, `pre-merge`) reachable via `--focus` and `--mode` flags |
| `/optimize` | `/act optimize` | Same optimization types and benchmark integrations; `--rollback` and `--benchmark` flags preserved |
| `/context` | Built-in `/memory` plus the `cagents-memory/_projects/{hash}/product_context.yaml` file | Manual or `/memory`-driven persistence replaces the auto-init flow |
| `/debug` | `/act` with explicit reproduction steps | The standard `/act` pipeline now handles root-cause investigation through controller question delegation |
| `/improve` (v12.1.2) | `/act review`, `/act optimize`, `/act improve` (or `/act --mode review\|optimize\|full`) | First-word keyword router; all `/improve` flags (`--baseline`, `--suppress`, `--benchmark`, `--auto-fix`, `--severity`, etc.) remain available on `/act` |
| `/org` (v12.2.0) | `/team` strategic mode | Auto-enables when `router.domain_count >= 2`; force-enable with `--strategic`; force-disable with `--no-strategic`. The 9 leadership agents are preserved at their existing locations and act as Wave 0/1 teammates |

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

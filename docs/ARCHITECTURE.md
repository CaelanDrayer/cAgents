# cAgents Architecture

> This document provides detailed architecture design for cAgents. For a quick overview, see CLAUDE.md.

> See [12-FACTOR-COMPLIANCE.md](./12-FACTOR-COMPLIANCE.md) for cAgents' compliance map against the humanlayer 12-Factor Agents methodology (6 YES · 4 PARTIAL · 2 deliberate DIVERGENCE).

## v12.0.0 — Architecture Changes

cAgents v12.0.0 is the major consolidation release. Architectural changes:

- **Pipeline state-machine reduction (7 -> 5 states)**: The `/run` event-driven pipeline
  collapses from 7 states to 5 by folding `task-decomposer` and `prompt-engineer` into
  the `planner`. The new sequence is `INIT -> ORCHESTRATED -> PLANNED ->
  COORDINATED -> VALIDATED`. Decomposition becomes a planner sub-responsibility;
  prompt-engineering becomes controller-side prompt assembly. The previously separate
  DECOMPOSED and PROMPTS_READY states are eliminated.
- **Controller merge (engineering-manager -> tech-lead)**: The two engineering
  controllers consolidated into a single fullstack `tech-lead`. All 222 active
  references were swept across SKILL.md files, rules, tests, and config; the
  `engineering-manager -> tech-lead` alias is preserved via
  `scripts/migration/v12-aliases.yaml` for backward compatibility with archived
  session artifacts.
- **Planner-fold**: `task-decomposer` and `prompt-engineer` are absorbed into the
  planner. Their output schemas (`work_items.yaml`, `delegation_prompts.yaml`) remain
  but are written by the planner directly, eliminating two pipeline transitions and
  two agent spawns per /run invocation.
- **Architecture-reviewer mode flag**: `architecture-reviewer` is removed as a standalone
  agent and becomes `architect --review` mode flag, reducing agent-catalog duplication.
- **Marketing-sales consolidation (38 -> 25)**: 13 marketing-sales agents absorbed across
  6 groups (G1-G6). Aliases preserved for all 13 fold sources.
- **chief-legal-officer -> clo**: Standardized leadership naming. Alias preserved.
- **vp-engineering moved**: Relocated to `leadership/` in v12.0.0; subsequently folded into `cto` (no standalone SKILL.md — resolves via `v12-aliases.yaml`).
- **devops-lead renamed**: Now `infrastructure-lead`, moved to
  `developer/infrastructure/`.
- **max_revision_cycles 5 -> 3**: Tightened revision budget in
  `pipeline_config.yaml` per audit recommendation. Validator REVISE/FAIL routing
  capped at 3 cycles instead of 5.
- **Execution self-validation (15 -> 5 hook-verifiable checks)**: The aspirational
  15-check protocol in @.claude/rules/core/resources/execution-self-validation.md
  replaced with 5 mechanically-verifiable checks: evidence freshness, file
  existence, guard exit codes, git state, file:line accuracy.
- **Legacy directory cleanup**: 11 of 13 legacy domain dirs removed
  (`engineering/`, `creative/`, `business/`, `growth/`, `service/`, `science/`,
  `health/`, `education/`, `personal/`, `arts/`, `trades/`). `people/` and
  `shared/` retained as routing-config-only overlays.
- **`cagents-memory/_communication/` removed**: Unused agent-messaging
  inbox/broadcast directory deleted.

Net effect: total agents 251 -> 58, pipeline transitions 7 -> 5, agent
self-validation noise floor reduced from 15 to 5 checks. Cross-reference:
`_archive/v12-migration/migration-state.yaml` tracks per-wave progress against
locked decisions Q1..Q8.

## Overview

cAgents is a universal multi-domain agent system with controller-centric coordination. Features CSV-based task inventory for large-scale workflows, progressive skill disclosure, CJS-only hooks system, Agent Teams for parallel execution, and Skills system.

## Core Architecture

### Agent Tiers

| Tier | Role | Count | Purpose |
|------|------|-------|---------|
| **1: Core** | Infrastructure | 17 | Workflow orchestration |
| **2: Controller** | Coordination | ~55 | Question-based delegation |
| **3: Execution** | Specialists | ~175 | Answer questions, execute tasks |
| **4: Support** | Operations | ~16 | Foundational services |

### Archetypes (9, canonical since v11.1.0)

| Archetype | Dir | Agents | Capability |
|-----------|-----|-------:|------------|
| **Developer** | `developer/` | 8 | Backend, frontend, fullstack, infrastructure, quality (5 branches) |
| **Operator** | `operator/` | 7 | Support, business-ops, people-ops, marketing-sales, content (5 branches) |
| **Advisor** | `advisor/` | 4 | Legal, health, education, personal (4 branches) |
| **Analyst** | `analyst/` | 5 | Data, BI, research, social-science |
| **Creator** | `creator/` | 2 | Visual artists, audiovisual creators |
| **Writer** | `writer/` | 4 | Narrative, editorial |
| **Strategist** | `strategist/` | 3 | Product owners, portfolio managers, planners |
| **Core** | `core/` | 16 | Pipeline infrastructure (trigger, orchestrator, planner, reviewer, etc.) |
| **Leadership** | `leadership/` | 9 | C-suite executives (used by /team strategic mode, not directly routable) |

**Total: 58 agents across 9 archetypes (post-v12.20.0 catalog consolidation — 42 routable + 16 core)**

### Legacy domain overlay (config-only)

Since v12.0.0, only `people/` and `shared/` legacy domain dirs remain on
disk — both retained as routing-config-only overlays holding
`config/domain_overrides.yaml` (controller_catalog + router_keywords). The
11 other legacy dirs (`engineering/`, `creative/`, `business/`, `growth/`,
`service/`, `science/`, `health/`, `education/`, `personal/`, `arts/`,
`trades/`) were deleted in W4.2; their routing keywords are absorbed by the
archetype-level routing tables in `core/` and `leadership/`.

## Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
   |          |           |            |           |
  /run      /run      Controller    /run        /run
(inline)  (inline)   (Agent tool)  (monitors)  (inline)
```

### Phase Details

1. **Routing**: Classify complexity (tier 2-4), detect domain
2. **Planning**: Define objectives, select controllers
3. **Coordinating**: Controller asks questions, synthesizes answers, coordinates work
4. **Executing**: Monitor controller progress via coordination_log.yaml
5. **Validating**: Quality gates, regression checks, completion verification

## Controller-Centric Pattern

Controllers use question-based delegation:

```
Controller receives objectives from plan.yaml
    ↓
Controller breaks into questions
    ↓
Questions delegated to execution agents
    ↓
Execution agents provide answers
    ↓
Controller synthesizes into solution
    ↓
Controller coordinates implementation
    ↓
Controller writes coordination_log.yaml
```

## File Structure

```
cagents-memory/
├── _system/              # System configs
│   ├── domains/          # 5 config files per domain
│   └── commands/         # Command-specific configs
├── sessions/             # Runtime sessions
│   └── {command}_{id}/
│       ├── instruction.yaml
│       ├── status.yaml
│       └── workflow/
│           ├── plan.yaml
│           ├── coordination_log.yaml
│           └── execution_summary.yaml
```

## Key Files

- `plan.yaml`: Objectives + controller assignment (WHAT)
- `coordination_log.yaml`: Q&A + synthesis + tasks (HOW)
- `execution_summary.yaml`: Aggregated outputs

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project memory
- [WORKFLOW_AGENT_INTERACTIONS.md](WORKFLOW_AGENT_INTERACTIONS.md) - Agent interaction patterns

---

**Version**: 10.26.0
**Last Updated**: 2026-06-18


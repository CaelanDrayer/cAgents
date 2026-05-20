# cAgents Architecture

> This document provides detailed architecture design for cAgents. For a quick overview, see CLAUDE.md.

## v12.0.0 (in progress) — Architecture Changes

The cAgents codebase is mid-flight on the v11.3.0 -> v12.0.0 revamp on branch
`revamp/v12-rc`. Major architectural changes coming in v12:

- **Pipeline state-machine reduction (7 -> 5 states)**: The `/run` event-driven pipeline
  collapses from 7 states to 5 by folding `task-decomposer` and `prompt-engineer` into
  the planner. The new sequence is `INIT -> ORCHESTRATED -> PLANNED -> COORDINATED ->
  VALIDATED`. Decomposition becomes a planner sub-responsibility; prompt-engineering
  becomes controller-side prompt assembly.
- **Controller merge (engineering-manager -> tech-lead) [v12.0.0]**: The two engineering
  controllers consolidated into a single fullstack `tech-lead` in W2.4. All active
  references were swept; the `engineering-manager -> tech-lead` alias is preserved via
  `scripts/migration/v12-aliases.yaml` for backward compatibility.
- **Planner-fold**: `task-decomposer` and `prompt-engineer` are absorbed into the
  planner. Their output schemas (`work_items.yaml`, `delegation_prompts.yaml`) remain
  but are written by the planner directly, eliminating two pipeline transitions.
- **Architecture-reviewer mode flag**: `architecture-reviewer` is removed as a standalone
  agent and becomes `architect --review` mode flag, reducing agent-catalog duplication.

Cross-reference: `revamp-design-v2.md` and `outputs/v12-migration/migration-state.yaml`
track per-wave progress against locked decisions Q1..Q8.

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

### Domains (15)

| Domain | Dir | Agents | Capability |
|--------|-----|--------|------------|
| Engineering | `engineering/` | 31 | Software engineering, infrastructure, security, QA, game programming |
| Creative | `creative/` | 30 | Creative writing, narrative design, literary criticism, game art, audio |
| Business | `business/` | 28 | Strategy, product, operations, finance |
| Growth | `growth/` | 34 | Marketing, sales, revenue operations |
| People | `people/` | 17 | HR, talent acquisition, culture |
| Service | `service/` | 28 | Customer support, CX, legal, compliance, governance |
| Leadership | `leadership/` | 11 | C-suite executives + general-counsel |
| Core | `core/` | 17 | Infrastructure (trigger, orchestrator, planner, validator, etc.) |
| Shared | `shared/` | 12 | Cross-domain intelligence (BI, data science, market research) |
| Science | `science/` | 10 | STEM research, scientific analysis |
| Health | `health/` | 5 | Medical, wellness, fitness, nutrition |
| Education | `education/` | 5 | Teaching, tutoring, academic support |
| Personal | `personal/` | 5 | Career, life coaching, personal finance |
| Arts | `arts/` | 5 | Visual arts, music, film, performing arts |
| Trades | `trades/` | 5 | Culinary, construction, automotive, agriculture |

**Total: 243 agents across 15 domains**

> **Integration**: cAgents shares `cagents-memory/sessions/` with its sister project AgentPath, a web-based session visualization and management platform. AgentPath watches the sessions directory via FileWatcher and streams workflow state changes to the UI over WebSocket. See the workspace-level [CLAUDE.md](../../CLAUDE.md) for the integration overview.

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
**Last Updated**: 2026-04-15


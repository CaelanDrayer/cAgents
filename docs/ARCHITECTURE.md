# cAgents Architecture

> This document provides detailed architecture design for cAgents. For a quick overview, see CLAUDE.md.

## Overview

cAgents is a universal multi-domain agent system with controller-centric coordination. Features CSV-based task inventory for large-scale workflows, progressive skill disclosure, CJS-only hooks system, Agent Teams for parallel execution, and Skills system.

## Core Architecture

### Agent Tiers

| Tier | Role | Count | Purpose |
|------|------|-------|---------|
| **1: Core** | Infrastructure | 16 | Workflow orchestration |
| **2: Controller** | Coordination | ~55 | Question-based delegation |
| **3: Execution** | Specialists | ~175 | Answer questions, execute tasks |
| **4: Support** | Operations | ~16 | Foundational services |

### Domains (15)

| Domain | Dir | Agents | Capability |
|--------|-----|--------|------------|
| Engineering | `engineering/` | 32 | Software engineering, infrastructure, security, QA, game programming |
| Creative | `creative/` | 30 | Creative writing, narrative design, literary criticism, game art, audio |
| Business | `business/` | 31 | Strategy, product, operations, finance |
| Growth | `growth/` | 39 | Marketing, sales, revenue operations |
| People | `people/` | 19 | HR, talent acquisition, culture |
| Service | `service/` | 32 | Customer support, CX, legal, compliance, governance |
| Leadership | `leadership/` | 11 | C-suite executives + general-counsel |
| Core | `core/` | 16 | Infrastructure (trigger, orchestrator, planner, validator, etc.) |
| Shared | `shared/` | 12 | Cross-domain intelligence (BI, data science, market research) |
| Science | `science/` | 10 | STEM research, scientific analysis |
| Health | `health/` | 6 | Medical, wellness, fitness, nutrition |
| Education | `education/` | 6 | Teaching, tutoring, academic support |
| Personal | `personal/` | 6 | Career, life coaching, personal finance |
| Arts | `arts/` | 6 | Visual arts, music, film, performing arts |
| Trades | `trades/` | 6 | Culinary, construction, automotive, agriculture |

**Total: 262 agents across 15 domains**

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
Agent_Memory/
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


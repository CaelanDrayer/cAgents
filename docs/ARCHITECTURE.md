# cAgents Architecture

> This document provides detailed architecture design for cAgents. For a quick overview, see CLAUDE.md.

## Overview

cAgents is a universal multi-domain agent system with controller-centric coordination. V7.5.1 features CSV-based task inventory for large-scale workflows.

## Core Architecture

### Agent Tiers

| Tier | Role | Count | Purpose |
|------|------|-------|---------|
| **1: Core** | Infrastructure | 12 | Workflow orchestration |
| **2: Controller** | Coordination | ~53 | Question-based delegation |
| **3: Execution** | Specialists | ~166 | Answer questions, execute tasks |

### Super-Domains (5)

1. **Make** (108 agents): Creation - engineering, creative, product, game dev
2. **Grow** (37 agents): Acquisition - marketing, sales
3. **Operate** (13 agents): Operations - finance, operations
4. **People** (19 agents): Talent - HR, culture
5. **Serve** (28 agents): Support & Governance - customer experience, legal

## Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
   |          |           |            |           |
  Router   Planner   Controller   Executor   Validator
```

### Phase Details

1. **Routing**: Classify complexity (tier 0-4), detect domain
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
- [workflow_agent_interactions.md](../workflow_agent_interactions.md) - Agent interaction patterns

---

**Version**: V7.5.1
**Last Updated**: 2026-01-22

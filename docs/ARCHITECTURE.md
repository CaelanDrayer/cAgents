# cAgents Architecture

> This document provides detailed architecture design for cAgents. For a quick overview, see CLAUDE.md.

## Overview

cAgents is a universal multi-domain agent system with controller-centric coordination. Features CSV-based task inventory for large-scale workflows, progressive skill disclosure, CJS-only hooks system, Agent Teams for parallel execution, and Skills system.

## Core Architecture

### Agent Tiers

| Tier | Role | Count | Purpose |
|------|------|-------|---------|
| **1: Core** | Infrastructure | 14 | Workflow orchestration |
| **2: Controller** | Coordination | ~53 | Question-based delegation |
| **3: Execution** | Specialists | ~149 | Answer questions, execute tasks |
| **4: Support** | Operations | ~19 | Foundational services |

### Super-Domains (5)

1. **Make** (111 agents): Creation - engineering, creative, product, game dev
2. **Grow** (38 agents): Acquisition - marketing, sales
3. **Operate** (13 agents): Operations - finance, operations
4. **People** (20 agents): Talent - HR, culture
5. **Serve** (28 agents): Support & Governance - customer experience, legal

## Workflow Phases

```
routing -> planning -> coordinating -> executing -> validating
   |          |           |            |           |
  /run      /run      Controller    /run        /run
(inline)  (inline)   (Task tool)  (monitors)  (inline)
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
- [workflow_agent_interactions.md](../workflow_agent_interactions.md) - Agent interaction patterns

---

**Version**: V9.20.0
**Last Updated**: 2026-02-27

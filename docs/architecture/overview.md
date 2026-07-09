# Architecture Overview

## System Architecture

cAgents is a multi-domain agent orchestration system built as a Claude Code plugin. It coordinates 58 agents across 9 builder-role archetypes (developer, operator, advisor, analyst, creator, writer, strategist, core, leadership) using a controller-centric delegation pattern. The 9-archetype layout has been canonical since v11.1.0; the v12.20.0 catalog consolidation reduced the catalog from 141 to 57 (41 routable + 16 core) via mode-flag absorption.

## Key Concepts

### Agent Tiers
| Tier | Role | Count | Examples |
|------|------|-------|---------|
| Core Infrastructure | Pipeline agents | 15 | trigger, orchestrator, planner, reviewer, validator |
| Controller (Tier 2) | Coordination | ~25 | tech-lead, marketing-strategist |
| Execution (Tier 3) | Implementation | ~95 | backend-developer, copywriter |
| Support (Tier 4) | Services | ~10 | scribe, data-extractor |

### Delegation Chain (5-state pipeline since v12.0.0)
```
User Request -> /run (state machine)
  -> orchestrator (context enrichment)
  -> planner (objectives + controller selection + decomposition + prompt assembly)
  -> controller (coordination + reviewer loops)
  -> validator (quality gates)
```

Decomposition and prompt-engineering are sub-responsibilities of the planner since v12.0.0 (task-decomposer + prompt-engineer were folded into the planner; architecture-reviewer was absorbed into `architect --review`).

### Progressive Pipeline
Three execution paths based on complexity scoring:
- **Minimal** (< 0.25): Fast path — planner skips internal decomposition step
- **Medium** (0.25 - 0.65): Adaptive — planner runs decomposition but skips delegation-prompt assembly
- **Full** (>= 0.65): Full planner pipeline (decomposition + delegation prompts)

### Controller Pattern
Controllers never do direct work. They:
1. Receive objectives from the planner
2. Break objectives into specific questions
3. Delegate questions to execution agents via Agent tool
4. Synthesize answers into implementation plan
5. Coordinate execution with reviewer loops

### Revision Routing
- **FAIL**: Route back to controller (re-execute)
- **REVISE**: Route back to planner (re-plan)
- Maximum 5 revision cycles before user escalation

## Domain Structure

See [domains.md](domains.md) for the 15-domain breakdown.

## Configuration

- Pipeline: `cagents-memory/_system/config/pipeline_config.yaml`
- Domains: `{domain}/config/domain_overrides.yaml`
- Hooks: `.claude/settings.json`
- Rules: `.claude/rules/` (26 files)

## File-Based State

All workflow state persists to `cagents-memory/sessions/{session_id}/`:
- `instruction.yaml` - User request
- `status.yaml` - Current phase
- `workflow/plan.yaml` - Objectives
- `workflow/coordination_log.yaml` - Q&A exchanges
- `workflow/events/` - State machine events
- `validation/validation_report.yaml` - Quality results

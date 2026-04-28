# Architecture Overview

## System Architecture

cAgents is a multi-domain agent orchestration system built as a Claude Code plugin. It coordinates 243 specialized agents across 15 domains using a controller-centric delegation pattern.

## Key Concepts

### Agent Tiers
| Tier | Role | Count | Examples |
|------|------|-------|---------|
| Core Infrastructure | Pipeline agents | 17 | trigger, orchestrator, planner, validator |
| Controller (Tier 2) | Coordination | ~30 | engineering-manager, campaign-manager |
| Execution (Tier 3) | Implementation | ~150 | backend-developer, copywriter |
| Support (Tier 4) | Services | ~10 | scribe, data-extractor |

### Delegation Chain
```
User Request -> /run (state machine)
  -> orchestrator (context enrichment)
  -> planner (objectives + controller selection)
  -> decomposer (work items)
  -> prompt-engineer (delegation prompts)
  -> controller (coordination + reviewer loops)
  -> validator (quality gates)
```

### Progressive Pipeline
Three execution paths based on complexity scoring:
- **Minimal** (< 0.25): Skip decomposer + prompt-engineer
- **Medium** (0.25 - 0.65): Skip prompt-engineer only
- **Full** (>= 0.65): All pipeline agents

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

- Pipeline: `Agent_Memory/_system/config/pipeline_config.yaml`
- Domains: `{domain}/config/domain_overrides.yaml`
- Hooks: `.claude/settings.json`
- Rules: `.claude/rules/` (26 files)

## File-Based State

All workflow state persists to `Agent_Memory/sessions/{session_id}/`:
- `instruction.yaml` - User request
- `status.yaml` - Current phase
- `workflow/plan.yaml` - Objectives
- `workflow/coordination_log.yaml` - Q&A exchanges
- `workflow/events/` - State machine events
- `validation/validation_report.yaml` - Quality results

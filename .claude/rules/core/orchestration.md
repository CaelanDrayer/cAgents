# Orchestration Patterns

Workflow orchestration guidelines for cAgents.

## CRITICAL: Automatic Phase Transitions

**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN PHASES**

Phase transitions are AUTOMATIC. Proceed to next phase immediately when current phase completes.

### Automatic Transition Rules

- routing -> planning: AUTOMATIC (no user permission needed)
- planning -> coordinating: AUTOMATIC (no user permission needed)
- coordinating -> validating: AUTOMATIC (no user permission needed)
- validating -> complete: AUTOMATIC if PASS (no user permission needed)

### Only Ask User When

- Tier 4 HITL approval gates (specified in plan.yaml)
- Unrecoverable errors or blockers
- Ambiguous requirements that cannot be inferred
- Validation BLOCKED status (not FIXABLE)

**If requirements are clear and phase is complete, PROCEED automatically.**

## Flattened Architecture (V9.18)

The `/run` command now performs routing, planning, and orchestration **inline** instead of delegating to separate agents. Only the controller (coordination) and execution agents are spawned as subagents.

**Previous** (5 levels -- unreliable):
```
/run -> trigger -> orchestrator -> controller -> execution_agents
```

**Current** (2 levels -- reliable, V9.22 `context: none`):
```
/run (inline, no fork: routing + planning + orchestration) -> controller -> execution_agents
```

V9.22 changed /run from `context: fork` to `context: none`. Since Claude Code subagents cannot spawn other subagents, running /run inline means the controller is a direct subagent (level 1) rather than a sub-subagent. For /team, teammates now spawn controllers directly instead of invoking /run as a nested Skill fork.

### What /run Does Inline
- **Routing**: Domain detection, tier classification (previously trigger + universal-router)
- **Planning**: Objective definition, controller selection, work items (previously orchestrator + universal-planner)
- **Orchestration**: Phase management, session initialization (previously orchestrator)
- **Validation**: Basic output verification (previously universal-validator)

### What Gets Delegated (via Task tool)
- **Controller**: Question-based coordination, specialist delegation, synthesis
- **Execution agents**: Actual implementation work (spawned by controller)

## Workflow Phases

All tier 2+ workflows follow this pattern:

```
routing -> planning -> [PLAN DISPLAY] -> coordinating -> validating
   |          |              |              |               |
  /run      /run         /run output    Controller       /run
(inline)  (inline)      (show plan)    (Task tool)     (inline)
```

**Plan Display**: After planning, /run shows the plan to the user, then immediately proceeds to coordinating. This is visibility, not a checkpoint.

## Phase Responsibilities

### Routing (inline in /run)
- Classify complexity tier (2-4, auto-upgrades from 0/1)
- Domain detection via keyword matching
- Set controller requirement (always true, minimum tier 2)

### Planning (inline in /run)
- Define objectives (WHAT needs to be done)
- Select controllers from planner_config.yaml
- Write plan.yaml and decomposition.yaml

### Coordinating (Controller via Task tool)
- Break objectives into questions
- Delegate questions to execution agents (via Task tool)
- Synthesize answers into solutions
- Create implementation tasks
- Write coordination_log.yaml

### Validating (inline in /run)
- Check coordination_log.yaml exists and is complete
- Verify outputs match plan objectives
- Write execution_summary.yaml

## Plan Display Phase

After planning completes (plan.yaml written), display the plan before coordinating:

1. **Format** plan summary (objectives, work breakdown, controllers)
2. **Output** to user (unless `--quiet` flag)
3. **Proceed** immediately to coordinating (do NOT wait)

**Plan Display by Tier**:
- **Tier 2-4**: Full plan with work breakdown (all tiers, since minimum is tier 2)

**IMPORTANT**: Showing plan does not equal asking permission. Display then proceed.

## Key Principle

**Controllers coordinate, don't execute directly**. Use question-based delegation to specialists.

## Context for Existing Agents

The trigger, orchestrator, universal-router, universal-planner, universal-executor, and universal-validator agents still exist in `core/agents/` and can be used by the team-trigger and other workflows. However, the standard `/run` command no longer spawns them as separate subagents -- their logic is performed inline by `/run` for reliability.

---

## See Also

- **controllers.md** - Question-based delegation patterns
- **execution.md** - Execution agent patterns (tier 3)
- **completion.md** - Task completion protocol
- **validation-framework.md** - End-to-end completion traceability

# Orchestration Patterns

Workflow orchestration guidelines for cAgents.

## CRITICAL: Automatic State Transitions

**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN STATES**

State transitions are AUTOMATIC. Proceed to next state immediately when current state completes.

### Automatic Transition Rules

- INIT -> ORCHESTRATED: AUTOMATIC (no user permission needed)
- ORCHESTRATED -> PLANNED: AUTOMATIC (no user permission needed)
- PLANNED -> DECOMPOSED: AUTOMATIC (no user permission needed)
- DECOMPOSED -> PROMPTS_READY: AUTOMATIC (no user permission needed)
- PROMPTS_READY -> COORDINATED: AUTOMATIC (no user permission needed)
- COORDINATED -> VALIDATED: AUTOMATIC if PASS (no user permission needed)
- FAIL -> PROMPTS_READY: AUTOMATIC (revision routing)
- REVISE -> PLANNED: AUTOMATIC (revision routing)

### Only Ask User When

- Tier 4 HITL approval gates (specified in plan.yaml)
- Unrecoverable errors or blockers
- Ambiguous requirements that cannot be inferred
- Max revision cycles (5) exhausted

**If requirements are clear and state is complete, PROCEED automatically.**

## Event-Driven Pipeline Architecture (V9.23.0)

`/run` is now a state machine engine that reads `pipeline_config.yaml` and executes agents sequentially. Each agent writes a completion event file that /run reads to advance the state machine.

### State Machine

```
INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED -> COMPLETE
                                                                                     |
                                                                              FAIL -> PROMPTS_READY (retry)
                                                                              REVISE -> PLANNED (re-plan)
```

### Nesting Model

```
/run (state machine loop -- level 0)
  |
  Phase 1: Sequential enrichment (all level 1, spawned by /run)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  |
  Phase 2: Nested execution (level 1 + 2)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
       +-> revision loop (level 2, max 3 rounds)
  |
  Phase 3: Validation (level 1)
  +-> validator (level 1)       -> validation_report.yaml
  |
  Revision loop (max 5 rounds):
    FAIL   -> back to Phase 2 (PROMPTS_READY)
    REVISE -> back to Phase 1 (PLANNED)
```

### What /run Does (State Machine Engine)
- **State management**: Read/write status.yaml, track state transitions
- **Agent spawning**: Spawn pipeline agents at level 1 via Task tool
- **Event reading**: Read completion events from workflow/events/ to advance state
- **Revision routing**: Route FAIL to PROMPTS_READY, REVISE to PLANNED
- **Pre-enrichment detection**: Skip completed states for /team teammate flows
- **Domain/tier classification**: Inline routing before pipeline starts

### What Gets Delegated (Pipeline Agents at Level 1)
- **Orchestrator** (INIT): Context enrichment -> enriched_context.yaml
- **Universal-planner** (ORCHESTRATED): Objectives + controller selection -> plan.yaml
- **Task-decomposer** (PLANNED): Work item decomposition -> work_items.yaml
- **Prompt-engineer** (DECOMPOSED): Optimized delegation prompts -> delegation_prompts.yaml
- **Controller** (PROMPTS_READY): Question-based coordination with reviewer loop -> coordination_log.yaml
- **Universal-validator** (COORDINATED): Quality validation -> validation_report.yaml (PASS/FAIL/REVISE)

### What Gets Delegated (Level 2, by Controller)
- **Execution agents**: Actual implementation work
- **Reviewer**: Evaluates executor output against acceptance criteria (max 3 internal rounds)

## Pipeline Configuration

The state machine is defined in `Agent_Memory/_system/config/pipeline_config.yaml`:

```yaml
states:
  INIT:
    agent: cagents:orchestrator
    next: ORCHESTRATED
    outputs: [enriched_context.yaml]
  ORCHESTRATED:
    agent: cagents:universal-planner
    next: PLANNED
    inputs: [enriched_context.yaml]
    outputs: [plan.yaml]
  # ... (see pipeline_config.yaml for full definition)

revision:
  max_cycles: 5
  on_fail: PROMPTS_READY
  on_revise: PLANNED
  escalation: user_hitl
```

## Event Files

Each pipeline agent writes a completion event to `workflow/events/EVT-{N}.yaml`:

```yaml
event_id: EVT-1
state: ORCHESTRATED
agent: cagents:orchestrator
timestamp: "{ISO_TIMESTAMP}"
inputs_consumed: [instruction.yaml]
outputs_produced: [workflow/enriched_context.yaml]
next_state: ORCHESTRATED
```

/run reads these events to determine the next state transition.

## Revision Routing

### FAIL (Re-execute with feedback)
When validator classifies output as FAIL:
1. /run routes back to PROMPTS_READY state
2. Controller re-runs with feedback from validation_report.yaml
3. Revision counter incremented (max 5 total cycles)

### REVISE (Re-plan with feedback)
When validator classifies output as REVISE:
1. /run routes back to PLANNED state
2. Planner and subsequent agents re-run with feedback
3. Revision counter incremented (max 5 total cycles)

### Escalation
After max_cycles (5) exhausted:
1. Escalate to user (HITL)
2. Report what completed and what failed
3. Suggest `/run --resume {SESSION_ID}`

## /team Integration (5-Wave Model)

```
Wave 0 (Lead): orchestrator -> planner -> decomposer (all enrichment)
Wave 1-3 (Teammates): Each runs /run --session (prompt-engineer -> controller+reviewer -> validator)
Wave 4 (Lead): Integration controller -> final validator
```

- Wave 0 always runs all enrichment stages (consistency over speed)
- Teammates detect pre-enrichment via --session flag and skip completed states
- File-based handoffs between dependent work items
- Teammate autonomy: flag issues but continue working

## Key Principles

1. **Config-driven**: State machine reads pipeline_config.yaml, not hardcoded steps
2. **Event-based**: Agents write completion events, /run reads them to advance
3. **Revision-capable**: Both controller-level (3 rounds) and pipeline-level (5 cycles) revision loops
4. **Controllers coordinate, don't execute directly**: Question-based delegation to specialists
5. **Prompt-engineer optimizes delegation**: Between decomposition and controller execution

## Context for Existing Agents

The trigger, universal-router, and universal-executor agents still exist in `core/agents/` and can be used by other workflows. However, the standard `/run` command now uses the event-driven pipeline where their roles are performed by the state machine engine (routing/execution monitoring) or by other pipeline agents (orchestrator for enrichment, planner for objectives).

---

## See Also

- **controllers.md** - Question-based delegation patterns with reviewer loop
- **execution.md** - Execution agent patterns (tier 3)
- **completion.md** - Task completion protocol
- **validation-framework.md** - End-to-end completion traceability

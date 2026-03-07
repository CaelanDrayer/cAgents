# Orchestration Patterns

Workflow orchestration guidelines for cAgents.

## CRITICAL: Automatic State Transitions

**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN STATES**

All state transitions are AUTOMATIC: INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED. FAIL routes to PROMPTS_READY, REVISE routes to PLANNED.

**Only ask user when**: Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, max revision cycles (5) exhausted.

**Exception**: /designer is EXEMPT from auto-proceed. It MUST use AskUserQuestion at every step.

### Task Cleanup at Terminal States

At VALIDATED/COMPLETE: call TaskList, mark completed work via TaskUpdate, delete obsolete tasks. Never leave stale tasks.

## Event-Driven Pipeline Architecture (V9.23.0)

`/run` is a state machine engine reading `pipeline_config.yaml`. Each agent writes a completion event to `workflow/events/EVT-{N}.yaml` that /run reads to advance state.

### State Machine

```
INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED
                                                                        FAIL -> PROMPTS_READY
                                                                        REVISE -> PLANNED
```

### Nesting Model

```
/run (level 0) -> orchestrator, planner, decomposer, prompt-engineer (level 1)
              -> controller (level 1) -> executor + reviewer (level 2, max 3 rounds)
              -> validator (level 1) -> PASS/FAIL/REVISE
```

### Pipeline Agents (Level 1)
- **Orchestrator** (INIT): enriched_context.yaml
- **Universal-planner** (ORCHESTRATED): plan.yaml
- **Task-decomposer** (PLANNED): work_items.yaml
- **Prompt-engineer** (DECOMPOSED): delegation_prompts.yaml
- **Controller** (PROMPTS_READY): coordination_log.yaml (with executor+reviewer loops)
- **Universal-validator** (COORDINATED): validation_report.yaml

### Handoff Documents (V10.6.0)

Each stage writes a handoff document to `workflow/handoffs/{STATE}.md` — concise summary (<500 tokens) of outputs, decisions, and context for the next stage. Append-only; survives compaction.

See `orchestration-reference.md` for format and schemas.

## Revision Routing

- **FAIL**: Route to PROMPTS_READY, controller re-runs with validation feedback
- **REVISE**: Route to PLANNED, planner and subsequent agents re-run
- **Escalation**: After 5 cycles, escalate to user with `/run --resume` suggestion

## /team Integration

Wave 0 (Lead): all enrichment. Waves 1-N (Teammates): each runs `/run --session` detecting pre-enrichment. Final wave (Lead): integration + final validation.

## Signal File Intervention

Pipeline checks for PAUSE/STOP/RESUME signal files at `sessions/{id}/signals/` before each state transition. See `orchestration-reference.md` for details.

## Key Principles

1. **Config-driven**: State machine reads pipeline_config.yaml
2. **Event-based**: Agents write completion events, /run reads them
3. **Revision-capable**: Controller-level (3 rounds) and pipeline-level (5 cycles)
4. **Controllers coordinate, don't execute**: Question-based delegation
5. **Signal-interruptible**: PAUSE/STOP signals before each transition

---

## See Also

- **orchestration-reference.md** - Schemas, event files, handoff format, signal protocol (path-conditional)
- **controllers.md** - Question-based delegation patterns
- **completion.md** - Task completion protocol

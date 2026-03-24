---
paths:
  - ".claude/skills/run/**"
  - ".claude/skills/org/**"
  - ".claude/skills/team/**"
  - "Agent_Memory/_system/config/pipeline_config.yaml"
  - "core/agents/**"
---

# Orchestration Patterns

Workflow orchestration guidelines for cAgents.

## CRITICAL: Automatic State Transitions

**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN STATES**

All state transitions are AUTOMATIC: INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED. FAIL routes to PROMPTS_READY, REVISE routes to PLANNED.

**Only ask user when**: Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, max revision cycles (5) exhausted.

**Exception**: /designer is EXEMPT from auto-proceed. It MUST use AskUserQuestion at every step.

### CRITICAL: Session Initialization First (V10.22.0)

**Every skill (/run, /team, /org, /review, /optimize, /designer, /debug) MUST create its session directory and write status.yaml BEFORE any other work.** No codebase exploration, no agent spawning, no analysis, no research — session directory first.

**Rationale**: Without a session directory, hooks cannot track the session, agent_tree.yaml has no home, and artifacts have nowhere to be written. Session init is a prerequisite for all other operations.

**Order**: Parse flags -> Create session dir -> Write metadata files -> THEN begin work.

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
- **Controller** (PROMPTS_READY): coordination_log.yaml with `schema_version: "1"` (with executor+reviewer loops)
- **Universal-validator** (COORDINATED): validation_report.yaml

### Canonical File Roles
- `workflow/work_items.yaml`: Canonical source for work item definitions (IDs, descriptions, acceptance criteria, dependencies)
- `team/task_list.yaml`: Status-only overlay (IDs + status + assigned_to)

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

## Plan Quality Requirements (V10.10.0)

Every plan.yaml MUST include these mandatory sections:

### Temporal Interrogation
Plans must include implementation friction analysis:
```yaml
temporal_analysis:
  hour_1_foundations: "What does the implementer need to know immediately?"
  hour_2_3_core: "What ambiguities will they hit during core implementation?"
  hour_4_5_integration: "What will surprise them during integration?"
  hour_6_plus_polish: "What will they wish they had planned for?"
```

### NOT In Scope (Mandatory)
Every plan MUST explicitly document what is deferred:
```yaml
not_in_scope:
  - item: "{deferred work item}"
    rationale: "{why deferred}"
    future_consideration: "{when/if to revisit}"
```
This prevents scope creep and documents decisions. An empty `not_in_scope` section is acceptable but must be explicitly present.

### Diagrams
For any non-trivial flow, plans MUST include ASCII diagrams:
- Data flows
- State machines
- Decision trees
- Dependency graphs
Diagrams are **deliverables**, not optional. They force externalized thinking and catch edge cases.

### What Already Exists
Plans MUST identify existing code that partially solves sub-problems:
```yaml
existing_code:
  - path: "{file_path}"
    relevance: "{what it already does}"
    action: "reuse|extend|replace"
```
This prevents redundant implementation and builds on existing work.

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

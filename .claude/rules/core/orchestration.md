---
paths:
  - ".claude/skills/run/**"
  - ".claude/skills/team/**"
  - "cagents-memory/_system/config/pipeline_config.yaml"
  - "agents/core/**"
---

# Orchestration Patterns

Workflow orchestration guidelines for cAgents.

## v12.0.0 State-Machine Collapse

**v12.0.0 collapsed the pipeline from 7 states to 5 states.** The `DECOMPOSED` and `PROMPTS_READY` states were removed and their work absorbed into `cagents:planner`, which now handles decomposition inline. Controllers fall back to standard delegation prompts. The post-v12 state machine is:

```
INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED
```

See `cagents-memory/sessions/team_v12-revamp-phase-abc_260520_002/outputs/v12-migration/revamp-design-v2.md` Q1 for the rationale. Historical references to `DECOMPOSED` / `PROMPTS_READY` in archived sessions remain valid for pre-v12 artifacts; new sessions use the 5-state machine.

## CRITICAL: Automatic State Transitions

**NEVER ASK USER FOR PERMISSION TO PROCEED BETWEEN STATES**

All state transitions are AUTOMATIC: INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED. FAIL and REVISE both route back to PLANNED (the controller and/or planner re-runs with validator feedback).

**Only ask user when**: Tier 4 HITL gates, unrecoverable errors, ambiguous requirements, max revision cycles (3) exhausted.

**Exception**: /designer is EXEMPT from auto-proceed. It MUST use AskUserQuestion at every step.

### CRITICAL: Session Initialization First (V10.22.0)

> **DEPRECATED in V11.0**: The /review, /optimize, /context, /debug skills were removed in V11.0.
> The `/review`, `/optimize`, `/debug` entries in the skill enumeration below are PRESERVED for
> archived-session back-compat — hooks consume session_type prefixes from historical session
> directories on disk. Do NOT remove these values.
> Use `/run review`, `/run optimize`, `/run improve` (v12.1.2+ keyword router) or `/run --mode debug` for V12+ workflows. (`/improve` was folded into `/run` via the keyword router in v12.1.2; the historical `/improve --mode review|optimize|full` syntax no longer exists.)
> See [docs/MIGRATION-V11.md](../../../docs/MIGRATION-V11.md) for migration guidance.

**Every skill (/run, /team, /designer; legacy /org, /review, /optimize, /debug session prefixes preserved for archived-session back-compat) MUST create its session directory and write status.yaml BEFORE any other work.** No codebase exploration, no agent spawning, no analysis, no research — session directory first.

**Rationale**: Without a session directory, hooks cannot track the session, agent_tree.yaml has no home, and artifacts have nowhere to be written. Session init is a prerequisite for all other operations.

**Order**: Parse flags -> Create session dir -> Write metadata files -> THEN begin work.

### Task Cleanup at Terminal States

At VALIDATED/COMPLETE: call TaskList, mark completed work via TaskUpdate, delete obsolete tasks. Never leave stale tasks.

## Event-Driven Pipeline Architecture (V9.23.0)

`/run` is a state machine engine reading `pipeline_config.yaml`. Each agent writes its **primary output file** (`enriched_context.yaml`, `plan.yaml`, `coordination_log.yaml`, `validation_report.yaml`), which `/run` reads at level 0 to advance state.

> **v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed.** Pre-v12.6 sessions wrote per-state completion events to `workflow/events/EVT-{N}.yaml` plus an `index.yaml`. These were external-UI-only signals — no cAgents hook or agent consumed them — so v12.6.0 dropped the emission entirely (both `/run` and `/team`; `/run` no longer creates `workflow/events/` at session init). State advancement is now driven solely by each agent's primary output file. Archived pre-v12.6 sessions retain `workflow/events/` on disk for record. See `.claude/skills/run/reference/state-machine-detail.md` (Historical note) and `orchestration-reference.md` § Event Files (historical).

### State Machine (v12.0.0)

```
INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED
                                            FAIL -> PLANNED
                                          REVISE -> PLANNED
```

### Nesting Model

```
/run (level 0) -> orchestrator, planner (level 1)
              -> controller (level 1) -> executor + reviewer (level 2, max 2 rounds, LP-27: 3→2)
              -> validator (level 1) -> PASS/FAIL/REVISE
```

### Pipeline Agents (Level 1)
- **Orchestrator** (INIT): enriched_context.yaml
- **Universal-planner** (ORCHESTRATED): plan.yaml AND work_items.yaml. (v12.0.0: task-decomposer and prompt-engineer were absorbed into planner. The planner now produces decomposition inline; controllers fall back to standard delegation prompts.)
- **Controller** (PLANNED): coordination_log.yaml with `schema_version: "1"` (with executor+reviewer loops)
- **Universal-validator** (COORDINATED): validation_report.yaml

### Canonical File Roles
- `workflow/work_items.yaml`: Canonical source for work item definitions (IDs, descriptions, acceptance criteria, dependencies)
- `team/task_list.yaml`: Status-only overlay (IDs + status + assigned_to)

### Handoff Documents (V10.6.0)

Each stage writes a handoff document to `workflow/handoffs/{STATE}.md` — concise summary (<500 tokens) of outputs, decisions, and context for the next stage. Append-only; survives compaction.

See `orchestration-reference.md` for format and schemas.

## Revision Routing

- **FAIL**: Route to PLANNED. The controller re-runs with validation feedback. (v12.0.0: PROMPTS_READY removed — FAIL no longer has a dedicated re-prompt stage; the controller picks up validation feedback directly from the existing plan.)
- **REVISE**: Route to PLANNED, planner re-decomposes and the controller re-runs.
- **Escalation**: After 3 cycles (lowered from 5 in v12.0.0), escalate to user with `/run --resume` suggestion.

## /team Integration

Wave 0 (Lead): all enrichment. Waves 1-N (subagents): each runs `/run --session` detecting pre-enrichment. Final wave (Lead): integration + final validation.

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
2. **Output-file-driven**: Agents write their primary output file (`enriched_context.yaml`, `plan.yaml`, `coordination_log.yaml`, `validation_report.yaml`); /run reads it at level 0 to advance state. (v12.6.0: the former `workflow/events/EVT-*.yaml` emission was removed — see Event-Driven Pipeline Architecture above.)
3. **Revision-capable**: Controller-level (2 rounds, LP-27) and pipeline-level (3 cycles)
4. **Controllers coordinate, don't execute**: Question-based delegation
5. **Signal-interruptible**: PAUSE/STOP signals before each transition

---

## See Also

- **orchestration-reference.md** - Schemas, event files, handoff format, signal protocol (path-conditional)
- **controllers.md** - Question-based delegation patterns
- **completion.md** - Task completion protocol

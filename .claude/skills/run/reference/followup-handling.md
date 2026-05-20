# Follow-Up Handling (Post-Completion)

After /run reports results, the pipeline enters a listening state. If the user provides follow-up feedback in the same conversation, the pipeline re-enters execution within the SAME session rather than starting a new one.

## Follow-Up Type Classification (v12.0.0)

| Type | Trigger Keywords | Pipeline Re-entry Point | Scope |
|------|-----------------|------------------------|-------|
| **adjustment** | "change", "tweak", "update", "modify", "rename", "move" | PLANNED (controller only) | Targeted change to specific files/functions |
| **rework** | "redo", "rewrite", "start over", "wrong approach", "rethink" | ORCHESTRATED (re-plan + re-execute) | Significant rework of one or more work items |
| **extension** | "also add", "now add", "extend", "include", "plus" | ORCHESTRATED (re-plan to add work items, then execute) | New scope added to existing deliverable |
| **fix** | "bug", "broken", "doesn't work", "error", "failing" | PLANNED (controller only) | Bug fix in delivered code |
| **review** | "check", "review", "verify", "test", "validate" | COORDINATED (validator only) | Re-validate without re-executing |

**v12.0.0 change**: Pre-v12 used `PROMPTS_READY` for adjustment/fix (controller re-entry) and `DECOMPOSED` for extension (add work items via decomposer). With those states removed, adjustment/fix now re-enter at `PLANNED` (controller picks up the existing plan + work_items and applies the targeted change), and extension re-enters at `ORCHESTRATED` (universal-planner re-decomposes inline to add new work items).

## Re-Entry Procedure

1. Update status.yaml:
   - Set pipeline_state back to the re-entry point
   - Append state_history entry: `{ state: "FOLLOWUP_{TYPE}", entered_at, duration_ms: null }`
   - Increment `followup_round: {N}`

2. Write followup event to `workflow/events/EVT-{N}.yaml`:
   ```yaml
   event_id: EVT-{N}
   type: "followup"
   agent_id: "pipeline"
   agent_type: "cagents:run"
   timestamp: "{ISO_TIMESTAMP}"
   payload:
     followup_type: adjustment|rework|extension|fix|review
     user_feedback: "{user's follow-up message}"
     re_entry_state: PLANNED|ORCHESTRATED|COORDINATED
     previous_state: VALIDATED
   ```

3. Update tasks (TaskUpdate) to show the follow-up:
   ```
   TodoWrite([
     ...all_previous_completed...,
     {"content": "[run] Follow-up #{N}: {type} -- \"{feedback_summary}\"\n[run > {controller}] Coordinating {type}\n  [{controller} > {executor}] {action_description}\n  [{controller}] {type} synthesized", "status": "in_progress", "id": "followup_{N}"},
     {"content": "[run > validator] Re-validating", "status": "pending", "id": "revalidate_followup_{N}"},
     {"content": "[run] Follow-up #{N} complete", "status": "pending", "id": "validated_followup_{N}"}
   ])
   ```

4. Resume the state machine loop from the re-entry point:
   - For adjustment/fix: spawn controller with the follow-up as a targeted sub-request (re-enter at PLANNED)
   - For rework/extension: re-invoke universal-planner with feedback context (re-enter at ORCHESTRATED). The planner re-produces plan.yaml + work_items.yaml; extensions add new work items, reworks revise existing ones.
   - For review: re-invoke validator (re-enter at COORDINATED)

5. After follow-up completes:
   - Update execution_summary.yaml with followup_rounds count
   - Append followup details to state_history
   - Report follow-up results to user
   - Return to listening state (allows chained follow-ups)

## Follow-Up Limits

- No limit on follow-up rounds -- the session stays alive as long as the user keeps providing feedback
- Each follow-up is tracked in `state_history` as `FOLLOWUP_{TYPE}_{N}`

## Session Schema Additions for Follow-Ups

```yaml
# status.yaml additions
followup_round: {N}  # 0 = no follow-ups, incremented on each
state_history:
  - state: VALIDATED
    entered_at: "..."
    duration_ms: 120000
  - state: FOLLOWUP_ADJUSTMENT_1
    entered_at: "..."
    duration_ms: null

# execution_summary.yaml additions
followup_rounds_used: {N}
followup_history:
  - round: 1
    type: adjustment
    feedback: "change the auth to use JWT"
    re_entry_state: PLANNED
    outcome: completed
```

## Controller Receives Follow-Up Context

When re-entering at PLANNED (controller), the controller prompt includes:
- Original request + completion context from coordination_log.yaml
- The user's follow-up feedback
- Instruction to treat this as a scoped modification, not a full re-implementation

```
FOLLOW-UP CONTEXT:
Original request completed. User follow-up: "{feedback}"
Type: {adjustment|rework|extension|fix|review}
Scope: {targeted change -- only modify what the user specified}
Previous coordination_log: {path}
```

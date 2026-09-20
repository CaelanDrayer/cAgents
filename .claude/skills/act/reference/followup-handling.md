# Follow-Up Handling (Post-Completion)

After /act reports its results, the pipeline enters a listening state. Sometimes the user gives follow-up feedback in the same conversation. The pipeline then re-enters execution inside the same session, and it does not start a new session.

## Follow-Up Type Classification (v12.0.0)

| Type | Trigger Keywords | Pipeline Re-entry Point | Scope |
|------|-----------------|------------------------|-------|
| **adjustment** | "change", "tweak", "update", "modify", "rename", "move" | PLANNED (controller only) | Targeted change to specific files/functions |
| **rework** | "redo", "rewrite", "start over", "wrong approach", "rethink" | ORCHESTRATED (re-plan + re-execute) | Significant rework of one or more work items |
| **extension** | "also add", "now add", "extend", "include", "plus" | ORCHESTRATED (re-plan to add work items, then execute) | New scope added to existing deliverable |
| **fix** | "bug", "broken", "doesn't work", "error", "failing" | PLANNED (controller only) | Bug fix in delivered code |
| **review** | "check", "review", "verify", "test", "validate" | COORDINATED (validator only) | Re-validate without re-executing |

**v12.0.0 change**: the pre-v12 pipeline used `PROMPTS_READY` for an adjustment and for a fix, so the controller re-entered there. It used `DECOMPOSED` for an extension, so the decomposer added the new work items there. Both of those states are gone. An adjustment and a fix now re-enter at `PLANNED`. The controller picks up the existing plan and work_items, and it applies the targeted change. An extension now re-enters at `ORCHESTRATED`, where the planner re-decomposes inline to add the new work items.

## Re-Entry Procedure

1. Update status.yaml:
   - Set pipeline_state back to the re-entry point
   - Append a state_history entry: `{ state: "FOLLOWUP_{TYPE}", entered_at }`
   - v12.6.0 note: do not write duration_ms any more. Track the follow-up
     round count in the working state of `/act`, and not in `followup_round`
     on disk.

2. v12.6.0 note: the pipeline no longer emits the workflow/events/EVT-*.yaml
   files. The re-entry state advance and the status.yaml history entry are
   enough. The `coordination_log.yaml` or the `validation_report.yaml` that
   the follow-up produces is the canonical signal for the next stage.

3. Update tasks (TaskUpdate) to show the follow-up:
   ```
   TodoWrite([
     ...all_previous_completed...,
     {"content": "[act] Follow-up #{N}: {type} -- \"{feedback_summary}\"\n[act > {controller}] Coordinating {type}\n  [{controller} > {executor}] {action_description}\n  [{controller}] {type} synthesized", "status": "in_progress", "id": "followup_{N}"},
     {"content": "[act > validator] Re-validating", "status": "pending", "id": "revalidate_followup_{N}"},
     {"content": "[act] Follow-up #{N} complete", "status": "pending", "id": "validated_followup_{N}"}
   ])
   ```

4. Resume the state machine loop from the re-entry point:
   - For an adjustment or a fix: spawn the controller with the follow-up as a
     targeted sub-request, and re-enter at PLANNED
   - For a rework or an extension: re-invoke the planner with the feedback
     context, and re-enter at ORCHESTRATED. The planner then re-produces
     plan.yaml and work_items.yaml. An extension adds new work items, and a
     rework revises the existing ones.
   - For a review: re-invoke the validator, and re-enter at COORDINATED

5. After the follow-up completes:
   - v12.6.0 note: do not write followup_rounds_used to execution_summary.yaml.
     That field served an external UI only.
   - Append the follow-up details to state_history. Write the state and the
     entered_at value only.
   - Report the follow-up results to the user
   - Return to the listening state, which allows chained follow-ups

## Follow-Up Limits

- There is no limit on the number of follow-up rounds. The session stays alive
  for as long as the user keeps giving feedback.
- The pipeline tracks each follow-up in `state_history` as `FOLLOWUP_{TYPE}_{N}`

## Session Schema Additions for Follow-Ups (v12.6.0)

```yaml
# status.yaml additions
state_history:
  - state: VALIDATED
    entered_at: "..."
  - state: FOLLOWUP_ADJUSTMENT_1
    entered_at: "..."

# execution_summary.yaml additions
followup_history:
  - round: 1
    type: adjustment
    feedback: "change the auth to use JWT"
    re_entry_state: PLANNED
    outcome: completed
```

v12.6.0 note: the pipeline no longer writes three fields. They are `followup_round` in status.yaml, `followup_rounds_used` in execution_summary.yaml, and `state_history[].duration_ms`. Track the follow-up count with `length(followup_history)` in place of them.

## Controller Receives Follow-Up Context

When the pipeline re-enters at PLANNED, the controller prompt holds these three parts:
- The original request, plus the completion context from coordination_log.yaml
- The follow-up feedback of the user
- An instruction to treat the work as a scoped change, and not as a full re-implementation

```
FOLLOW-UP CONTEXT:
Original request completed. User follow-up: "{feedback}"
Type: {adjustment|rework|extension|fix|review}
Scope: {targeted change -- only modify what the user specified}
Previous coordination_log: {path}
```

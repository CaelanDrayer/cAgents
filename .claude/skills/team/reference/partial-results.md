# Partial Results on Failure

How /team reports partial completion when not every wave finishes, and how to resume.

## Partial Results on Failure

If the pipeline cannot complete all waves, report partial results instead of a binary failure. This ensures users always get value from completed work.

### Partial Results Report Format

```
Team execution partially complete:
  Wave 1 (Research):       COMPLETE - 3/3 items done
  Wave 2 (Implementation): COMPLETE - 4/4 items done
  Wave 3 (Testing):        PARTIAL  - 2/3 items done, 1 blocked
  Wave 4 (Documentation):  NOT STARTED (blocked by Wave 3 gap)

Completed outputs: cagents-memory/sessions/{id}/outputs/
  - task-01/ through task-07/: COMPLETE
  - task-08/ and task-09/:     COMPLETE
  - task-10/:                 BLOCKED (test framework incompatibility)
  - task-11/ through task-12/: NOT STARTED

Recovery:
  - Fix task-10 manually, then: /team --resume {session_id}
  - Or accept partial results and continue from outputs/
```

### When to Report Partial Results

- A wave has blocked items after recovery attempts
- A gate fails and fix-up attempts are exhausted
- Context exhaustion occurs mid-pipeline
- Final validation returns FAIL but some waves completed successfully

### Storage Location

Partial results are stored in `workflow/partial_results.yaml`:

```yaml
status: partial
completed_waves: [1, 2]
partial_waves:
  3: {completed: [TASK-08, TASK-09], blocked: [TASK-10], reason: "test framework incompatibility"}
not_started_waves: [4]
total_items: 12
completed_items: 9
blocked_items: 1
not_started_items: 2
completion_rate: 0.75
output_locations:
  - outputs/task-01/ through outputs/task-09/
resume_command: "/team --resume {session_id}"
```

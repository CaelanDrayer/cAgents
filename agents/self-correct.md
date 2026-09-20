---
name: self-correct
archetype: core
description: "Use when an agent is stuck, when 3+ tool failures occur in sequence, or when the 6-step recovery ladder needs activation."
metadata:
  version: "1.0.0"
  vibe: Fixes what the validators flagged before anyone has to ask
  tier: infrastructure
  effort: high
  model: opus
  color: bright_magenta
  capabilities:
    - validation_fix
    - coordination_correction
    - auto_recovery
    - pattern_learning
    - subagent_recovery
  maxTurns: 40
allowed-tools: Read Grep Glob Write Edit Bash Agent TaskCreate TaskUpdate TaskList TaskGet
---

# Universal Self-Correct

This agent is an adaptive recovery specialist. It serves all of the domains.

## Core Responsibilities

1. Fix the validation failures that carry the FIXABLE classification
2. Fix the coordination quality issues
3. Re-validate the work after the corrections
4. Learn from the correction patterns
5. Escalate when you are blocked

## Issue Types

### Coordination Issues
| Issue | Severity | Strategy |
|-------|----------|----------|
| Missing coordination_log | CRITICAL | Re-spawn controller |
| Incomplete synthesis | MAJOR | Prompt controller to complete |
| Vague answers | MINOR | Request clarification from agents |
| Unanswered questions | MAJOR | Re-delegate questions |
| Circular delegation | CRITICAL | BLOCKED - escalate to HITL |
| Weak synthesis | MAJOR | Prompt controller to strengthen |

### Output Quality Issues
| Issue | Strategy |
|-------|----------|
| test_coverage_low | Add test cases |
| linting_errors | Auto-fix (eslint, prettier) |
| missing_documentation | Generate docs |
| format_violations | Restructure to template |

## Workflow

1. **Load**: read validation_report.yaml, then identify the FIXABLE issues
2. **Load /goal evaluator signal (V11.3.0)**: If `workflow/goal_evaluator_log.yaml` exists in the active session, read the most recent 3-5 `entries[].evaluator_reason` values. Treat them as an additional FIXABLE signal, alongside the validation_report findings. The evaluator runs Haiku against the transcript on every turn while `/goal` is active. Its reasons therefore surface ambiguity, missing evidence, or unfinished work. The file-based validator may not have flagged those problems. When self-correct dispatches a fix, include the latest evaluator reason in the dispatched prompt as "Goal evaluator noted: {reason}".
3. **Analyze**: categorize the issues, then check the correction strategies
4. **Verify Fixability**: the estimated time is 60 min or less, and a strategy exists
5. **Execute Fixes**: invoke the agents, or run the auto-fix
6. **Re-Validate**: invoke the validator
7. **Handle Result**: PASS means done. FIXABLE means retry. BLOCKED means escalate.

## Retry Logic

- The per-issue limit is 1 or 2 retries, and it depends on the type.
- The global limit is 3 correction cycles in total.
- A coordination issue gets a maximum of 2 retries. A circular delegation gets 0 retries.

## Key Principles

1. **Verify before fix**: check whether the issue is truly fixable
2. **Track progress**: document every attempt
3. **Learn from patterns**: update the calibration data
4. **Graceful escalation**: when you are blocked, provide the full context

## Subagent Incomplete Recovery

When a subagent fails to complete its assigned work:

### Detection Signals
- The subagent returns with incomplete work, such as a partial output or a missing deliverable
- A checkpoint file or a waypoint file exists with `type: pre_compact`
- coordination_log.yaml still holds work items that are `in_progress` or `pending`
- The Agent tool returns a truncated result, or it returns no result

### Recovery Workflow

1. **Load checkpoint**: read `waypoints/` from the session of the failed agent
2. **Assess remaining work**: compare the completed work items against the pending ones in the checkpoint
3. **Split remaining work**: invoke the task-consolidator. It breaks the remaining items into micro-tasks of about 8K tokens each
4. **Spawn micro-tasks**: launch each micro-task as an independent subagent through the Agent tool
5. **Consolidate results**: merge the micro-task outputs into one unified deliverable
6. **Re-validate**: send the consolidated output back through the validation

### Micro-Task Sizing

Target **8K tokens per micro-task**. That size fits comfortably in any context window:
- 1 file edit = 1 micro-task
- 1 test suite = 1 micro-task
- 1 section of documentation = 1 micro-task
- Never combine unrelated work in a single micro-task

Small micro-tasks keep each respawned subagent near the advisory per-subagent
context aim.

Aim for about 100k input tokens in a spawned subagent's own context.
The figure is advisory, and it is absolute. It is a per-subagent input-token
count, and it is not a fraction of a context window. A context window varies
between 200k and 1M. The same fraction therefore means very different absolute
sizes.

Past about 200k input tokens in a single subagent, treat the aim as missed and
delegate harder. This outer bound is advisory, not enforced.

Give each micro-task its checkpoint path and the file paths it needs, not the file
contents. See @.claude/rules/playbooks/pat-context-budget-tiers.md for the aim and
its levers.

### Continuation Limits

- **Max continuations per task**: 5
- **Max micro-tasks per split**: 20
- **If exceeded**: escalate to HITL with the full checkpoint and a progress summary
- **Each continuation inherits**: the checkpoint, the partial outputs, and the remaining acceptance criteria

## When-Stuck Protocol (V10.18.0)

This protocol gives a structured escalation. Use it when repeated failures occur on the same work item.

### Stuck Detection

An agent is **stuck** when it has 3 or more consecutive failures on the same work item. Those failures share an error class, a file, or an operation. These are the detection signals:
- The same tool fails 3 or more times in `workflow/tool_failures.yaml`
- The same work item returns REVISE 3 or more times from the reviewer
- An execution agent repeatedly reports "unable to complete"

### Recovery Ladder (execute in order)

| Step | Action | Rationale |
|------|--------|-----------|
| 1. **Re-read everything** | Re-read ALL relevant files from scratch (not from memory) | Context drift causes stale assumptions |
| 2. **Review execution log** | Read full `workflow/tool_failures.yaml` and coordination_log | Pattern in failures reveals root cause |
| 3. **Combine successes** | Identify what DID work across attempts, merge those approaches | Partial successes contain signal |
| 4. **Try the opposite** | If all attempts used approach A, try approach B | Fixation on one strategy is the #1 stuck cause |
| 5. **Radical simplification** | Strip the work item to absolute minimum viable scope | Complexity is often the blocker, not the approach |
| 6. **Escalate** | Mark as BLOCKED with full context, escalate to HITL | Know when to stop |

### Stuck Recovery Prompt Template

When you spawn a recovery agent after a stuck detection:
```
STUCK RECOVERY for {work_item_id}:
Previous {N} attempts failed. Failure pattern: {pattern_summary}
What worked: {partial_successes}
What failed: {failure_summary}
TRY: {next_step_from_ladder}
DO NOT repeat: {failed_approaches}
```

## Rule-of-Three: Architecture-Question Escalation

Stuck-detection covers the *same* failure that recurs. This signal is a different one: it is the whack-a-mole signal. You make 2-3 consecutive fixes. Each fix resolves the reported failure, and each fix surfaces a *new* problem elsewhere.

A relocating failure is a design smell, not a code bug. The fixes are treating the symptoms of a structural mismatch. More rounds of fixes therefore just move the failure around.

When you detect this signal, stop fixing. Do not silently promote the item to dead_letter either:

1. **Trigger**: You make 2-3 fixes in a row. Each fix closes the prior failure, and each fix spawns a fresh downstream one. The failure set moves rather than shrinks.
2. **Action**: Stop the fix and re-validate loop for that item. Set `architecture_question: true` in the coordination_log record of the session, or in the validation record. Summarize the pattern for the user: give the sequence of fixes, and say where each new failure appeared. Then ask the user for an architecture-level decision. The user can change the interface, re-scope the acceptance criteria, or accept a documented tradeoff.
3. **Why**: one escalation is cheaper than the alternative. The alternative exhausts all 3 of the correction cycles on a moving target that only the user can re-scope. An escalation here is a considered decision, and it is not a failure.

## Crash Recovery Taxonomy (V10.18.0)

This taxonomy is a typed failure classification. It gives a specific recovery strategy for each failure type.

| Failure Type | Detection | Recovery Strategy | Retry Limit |
|-------------|-----------|-------------------|-------------|
| `syntax_error` | Parse/compile error in output | Fix immediately using error message | Unlimited (deterministic fix) |
| `runtime_error` | Execution fails after valid syntax | Analyze stack trace, fix logic | Max 3 attempts |
| `resource_exhaustion` | OOM, context overflow, disk full | Revert changes + try smaller approach | Max 1 (then simplify) |
| `timeout` | Operation exceeds time limit | Kill operation, revert partial changes | Max 1 (then decompose smaller) |
| `external_dependency` | Network, API, service unavailable | Skip work item + log for later | 0 (skip immediately) |

### Recovery Decision Tree

```
Failure detected
  -> Classify type (syntax/runtime/resource/timeout/external)
  -> Check retry count for this type
  -> If under limit: apply type-specific recovery
  -> If at limit:
     - syntax_error: should not happen (always fixable)
     - runtime_error: escalate with stack traces
     - resource_exhaustion: revert + radical simplification
     - timeout: decompose into sub-tasks
     - external_dependency: skip + log + continue
```

### Failure Classification in coordination_log

```yaml
failed_items:
  - task_id: WI-3
    failure_type: runtime_error
    attempts: 3
    error_summary: "TypeError: Cannot read property 'id' of undefined at handler.ts:45"
    recovery_actions_taken: ["stack trace analysis", "null check addition", "input validation"]
    final_status: blocked
    escalation_context: "Handler receives undefined user object from upstream middleware"
```

See @self-correct/resources/self-correct-patterns.md for correction strategies.

## Worked Examples

- See @docs/example-store/ex-verification-feedback-loop-first-debugging.md. Establish a tight red-capable reproduction loop before you form a hypothesis. When a work item keeps failing, write a ranked list of hypotheses that you can falsify.

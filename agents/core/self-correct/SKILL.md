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

Adaptive recovery specialist for all domains.

## Core Responsibilities

1. Fix validation failures (FIXABLE classification)
2. Fix coordination quality issues
3. Re-validate after corrections
4. Learn from correction patterns
5. Escalate when blocked

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

1. **Load**: Read validation_report.yaml, identify FIXABLE issues
2. **Load /goal evaluator signal (V11.3.0)**: If `workflow/goal_evaluator_log.yaml` exists in the active session, read the most recent 3-5 `entries[].evaluator_reason` values. Treat them as additional FIXABLE signal alongside validation_report findings. The evaluator runs Haiku against the transcript every turn while `/goal` is active, so its reasons surface ambiguity, missing evidence, or unfinished work that the file-based validator may not have flagged. When self-correct dispatches a fix, include the latest evaluator reason in the dispatched prompt as "Goal evaluator noted: {reason}".
3. **Analyze**: Categorize issues, check correction strategies
4. **Verify Fixability**: Est. time <= 60 min, strategies exist
5. **Execute Fixes**: Invoke agents or auto-fix
6. **Re-Validate**: Invoke validator
7. **Handle Result**: PASS (done), FIXABLE (retry), BLOCKED (escalate)

## Retry Logic

- Per-issue limits: 1-2 retries depending on type
- Global limit: 3 total correction cycles
- Coordination issues: max 2 retries (except circular: 0)

## Key Principles

1. **Verify before fix**: Check if truly fixable
2. **Track progress**: Document all attempts
3. **Learn from patterns**: Update calibration data
4. **Graceful escalation**: When blocked, provide full context

## Subagent Incomplete Recovery

When a subagent fails to complete its assigned work:

### Detection Signals
- Subagent returns with incomplete work (partial outputs, missing deliverables)
- Checkpoint/waypoint file exists with `type: pre_compact`
- coordination_log.yaml has work items still `in_progress` or `pending`
- Agent tool returns truncated or missing results

### Recovery Workflow

1. **Load checkpoint**: Read `waypoints/` from failed agent's session
2. **Assess remaining work**: Compare completed vs. pending work items from checkpoint
3. **Split remaining work**: Invoke task-consolidator to break remaining items into micro-tasks (~8K tokens each)
4. **Spawn micro-tasks**: Launch each micro-task as independent subagent via Agent tool
5. **Consolidate results**: Merge micro-task outputs into unified deliverable
6. **Re-validate**: Send consolidated output back through validation

### Micro-Task Sizing

Target **8K tokens per micro-task** (fits comfortably in any context window):
- 1 file edit = 1 micro-task
- 1 test suite = 1 micro-task
- 1 section of documentation = 1 micro-task
- Never combine unrelated work in a single micro-task

### Continuation Limits

- **Max continuations per task**: 5
- **Max micro-tasks per split**: 20
- **If exceeded**: Escalate to HITL with full checkpoint and progress summary
- **Each continuation inherits**: checkpoint, partial outputs, remaining acceptance criteria

## When-Stuck Protocol (V10.18.0)

Structured escalation when repeated failures occur on the same work item.

### Stuck Detection

An agent is **stuck** when it has 3+ consecutive failures on the same work item (same error class, same file, or same operation). Detection signals:
- Same tool failing 3+ times in `workflow/tool_failures.yaml`
- Same work item returning REVISE 3+ times from reviewer
- Execution agent reporting "unable to complete" repeatedly

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

When spawning a recovery agent after stuck detection:
```
STUCK RECOVERY for {work_item_id}:
Previous {N} attempts failed. Failure pattern: {pattern_summary}
What worked: {partial_successes}
What failed: {failure_summary}
TRY: {next_step_from_ladder}
DO NOT repeat: {failed_approaches}
```

## Rule-of-Three: Architecture-Question Escalation

Distinct from stuck-detection (the *same* failure recurring), this is the whack-a-mole signal: 2-3 consecutive fixes where each one resolves the reported failure but surfaces a *new* problem elsewhere. A relocating failure is a design smell, not a code bug — the fixes are treating symptoms of a structural mismatch, so more rounds just move the failure around.

When you detect it, do not keep fixing and do not silently promote to dead_letter:

1. **Trigger**: 2-3 fixes in a row, each closing the prior failure but spawning a fresh downstream one (the failure set moves rather than shrinks).
2. **Action**: Stop the fix/re-validate loop for that item. Set `architecture_question: true` in the session's coordination_log / validation record, summarize the pattern for the user (the sequence of fixes and where each new failure appeared), and ask for an architecture-level decision — change the interface, re-scope the acceptance criteria, or accept a documented tradeoff.
3. **Why**: One escalation is cheaper than exhausting the 3 correction cycles on a moving target only the user can re-scope. Escalating here is a considered decision, not a failure.

## Crash Recovery Taxonomy (V10.18.0)

Typed failure classification with specific recovery strategies per failure type.

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

See @resources/self-correct-patterns.md for correction strategies.

## Worked Examples

- See @docs/example-store/ex-verification-feedback-loop-first-debugging.md — establish a tight red-capable reproduction loop before hypothesizing, and write falsifiable, ranked hypotheses when a work item keeps failing.

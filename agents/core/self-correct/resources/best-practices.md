# Best Practices: Universal Self-Correct

> Design principles, patterns, and frameworks that guide high-quality adaptive recovery, failure classification, and intelligent retry coordination.

## Design Principles

- **Verify Before Fix**: Confirm that an issue is actually fixable within the 60-minute window before attempting — unrecoverable issues escalate immediately rather than consuming retry budget on futile attempts
- **Type Before Strategy**: Classify the failure type (syntax_error, runtime_error, resource_exhaustion, timeout, external_dependency) before selecting a recovery strategy — each type has a specific playbook
- **Never Repeat the Same Approach**: If attempt N failed, attempt N+1 must use a different strategy — repeating the same prompt, same approach, or same scope guarantees the same outcome
- **Split Before Retry**: Context exhaustion requires splitting remaining work into smaller micro-tasks before re-dispatch — same scope retries always exhaust context again
- **Track Progress Meticulously**: Every correction attempt is logged with what was tried, what succeeded, and what failed — the log drives the recovery ladder and prevents cycling back to failed approaches
- **Escalate with Full Context**: When blocked, provide HITL with everything: failure type, all prior attempts, what worked partially, and what prevented resolution — partial escalation wastes human attention
- **Learn from Patterns**: After each correction cycle, write a calibration entry — recurring correction patterns reveal systemic issues that should inform future agent selection or prompt quality

## Key Patterns & Frameworks

- **6-Step Recovery Ladder (When-Stuck Protocol)**: Step 1 (Re-read everything from scratch) → Step 2 (Review full execution log for patterns) → Step 3 (Combine partial successes from all attempts) → Step 4 (Try the opposite approach) → Step 5 (Radical simplification to minimum viable scope) → Step 6 (Escalate to HITL with full context) — execute in order, skip no steps
- **Crash Recovery Taxonomy**: syntax_error (fix immediately, unlimited retries since deterministic) → runtime_error (analyze stack trace, fix logic, max 3 retries) → resource_exhaustion (revert + try smaller approach, max 1 retry then simplify) → timeout (kill + revert + decompose smaller, max 1 retry) → external_dependency (skip item + log, 0 retries — dependency unavailability is not fixable by the agent)
- **Micro-Task Sizing for Recovery**: Target 8K tokens per micro-task — 1 file edit = 1 micro-task, 1 test suite = 1 micro-task, 1 documentation section = 1 micro-task; never combine unrelated work in a single micro-task
- **Stuck Detection Threshold**: 3+ consecutive failures on the same work item with the same error class, same file, or same operation — not just any 3 failures but the same failure repeating
- **Subagent Incomplete Recovery Flow**: Load checkpoint from waypoints/ → assess remaining items → invoke task-consolidator to split into micro-tasks → spawn micro-tasks in parallel → consolidate results → re-validate
- **Fixability Assessment**: Before attempting recovery, estimate: Is the issue fixable in <60 minutes? Does a recovery strategy exist for this type? Is the failure deterministic (same input → same output) or stochastic? — proceed only if all three pass
- **Coordination Issue Correction**: For missing coordination_log (CRITICAL) → re-spawn controller; for incomplete synthesis (MAJOR) → prompt controller to complete; for vague answers (MINOR) → request clarification from specific execution agents
- **Pattern Learning Pipeline**: After each correction cycle, write a calibration entry to `_knowledge/calibration/` with the failure type, correction applied, outcome, and whether the pattern should influence future routing or prompt engineering

## Domain Concepts & Terminology

### Failure Types
- **syntax_error**: Parse or compilation failure in agent output — deterministic fix using the error message; unlimited retries because the fix path is known
- **runtime_error**: Code or logic fails after syntactically valid output is produced — requires stack trace analysis and logic correction; max 3 retries before escalation
- **resource_exhaustion**: Out of memory, context overflow, disk full — revert changes, try a smaller scope; max 1 retry then apply radical simplification
- **timeout**: Operation exceeds time limit before completing — kill partial changes, revert, decompose into smaller sub-tasks; max 1 retry at smaller scope
- **external_dependency**: Network unavailable, API down, required service unreachable — skip the work item immediately and log for later; no retries because the agent cannot control external availability

### Coordination Issue Severity
- **CRITICAL**: Missing coordination_log, circular delegation — immediate re-spawn of controller; cannot proceed without resolution
- **MAJOR**: Incomplete synthesis, unanswered questions, weak synthesis — active prompting to complete; blocks proceeding but is recoverable
- **MINOR**: Vague answers, thin evidence — targeted clarification requests; can proceed to review with noted concerns

### Recovery State Tracking
- **correction_cycle**: Counter tracking how many self-correct rounds have been applied — global limit is 3 cycles across all issues in one validation report
- **per_issue_retry_limit**: Maximum retries for a specific issue type (1-2 depending on coordination issue type, per the crash taxonomy for output quality issues)
- **correction_log**: Append-only record of all recovery attempts — includes what was tried, what succeeded or failed, and what the next step is
- **calibration_entry**: A pattern extracted from a correction cycle — written to `_knowledge/calibration/` for future routing and prompt engineering improvements

### Micro-Task Recovery
- **checkpoint_path**: Path to the waypoint file from the failed agent's session — the starting point for recovery assessment
- **remaining_work_items**: Work items not yet completed at checkpoint time — the input to task-consolidator for splitting
- **max_continuations**: 5 per original task — after this, HITL escalation with full checkpoint context is mandatory
- **max_micro_tasks_per_split**: 20 — beyond this, coordination overhead exceeds the recovery benefit

## Anti-Patterns to Avoid

- **Same Approach Re-Dispatch**: Sending the same prompt to the same agent after a failure — this is the most common stuck pattern and the reason step 4 ("try the opposite") exists in the recovery ladder
- **Ignoring NEEDS_CONTEXT Status**: When an execution agent reports NEEDS_CONTEXT, re-dispatching without providing the missing context — the agent cannot succeed without the specific information it flagged as missing
- **Treating BLOCKED as DONE**: Silently skipping a work item that is BLOCKED without documenting it in the coordination log — partial work presented as complete output causes validation failures
- **Full Scope Re-Retry After Context Exhaustion**: Re-spawning a context-exhausted agent at the exact same scope — the agent will exhaust context in the same place for the same reason; scope splitting is mandatory
- **Exceeding Per-Type Retry Limits**: Attempting a 4th retry on a runtime_error (max 3) hoping for a different outcome — at the limit, the pattern has become established; escalate with evidence instead of continuing
- **Skipping Recovery Ladder Steps**: Jumping from step 1 (re-read) directly to step 6 (escalate) because the first re-read didn't help — each step has been designed to address a specific category of stuck condition; skipping means missing the recovery it was designed for
- **Incomplete Escalation Context**: Escalating to HITL with "agent failed" and no detail — HITL needs failure type, all prior attempts, partial successes, and what specifically prevented resolution to make an informed decision

## Quality Indicators

- **First-Attempt Recovery Rate**: Percentage of correction invocations where the first recovery strategy succeeds — target >60%; lower rates indicate the recovery ladder is reaching step 4+ frequently
- **Escalation Rate**: Percentage of correction cycles that escalate to HITL — target <15%; high rates suggest systemic issues in agent scoping or prompt quality
- **Retry Limit Exhaustion Rate**: Percentage of issues where the per-type retry limit is reached — should be rare for syntax_error (0%); acceptable for runtime_error (<20%)
- **Calibration Entry Production Rate**: Percentage of correction cycles that produce a calibration entry — target 100%; every recovery yields a learning opportunity
- **False Recovery Rate**: Cases where self-correct reports success but the validator subsequently finds the same issue — indicates insufficient re-validation after correction
- **Stuck Detection Latency**: How many tool failures occur before stuck detection triggers (target: exactly 3) — too early causes false positives, too late wastes retry budget

## Collaboration Touchpoints

- **With validator**: Validator identifies FIXABLE/BLOCKED classifications; self-correct receives the FIXABLE issues, applies the crash recovery taxonomy, and returns a corrected output for re-validation — this creates the FAIL → self-correct → re-validate loop
- **With task-consolidator**: When a subagent context-exhausts, self-correct invokes task-consolidator to split remaining work items into micro-tasks before re-dispatch — consolidator handles the splitting strategy; self-correct handles the overall recovery orchestration
- **With hitl**: Self-correct is the last automated step before HITL escalation — after the recovery ladder reaches step 6 or continuations are exhausted, self-correct prepares the full escalation packet for HITL review
- **With orchestrator**: Orchestrator invokes self-correct when it detects incomplete subagent returns (missing output files, in-progress coordination logs after Task returns) — orchestrator coordinates at phase level; self-correct handles work-item level recovery

# Best Practices: Universal Executor

> Design principles, patterns, and frameworks that guide high-quality controller monitoring, blocker detection, and execution phase coordination.

## Design Principles

- **Monitor, Don't Manage**: The executor watches controller progress at the phase level — it does not assign tasks, spawn execution agents, or make work-item decisions; those belong to the controller
- **Trust Controllers**: Controllers are domain experts — the executor verifies completion signals, not intermediate decisions; second-guessing controllers mid-coordination creates interference
- **Detect, Don't Prevent**: Identify blockers early and trigger recovery, but do not pre-emptively restrict what controllers do — early detection + auto-recovery is more effective than pre-flight restrictions
- **Aggregate, Don't Synthesize**: When a controller signals completion, the executor collects outputs without re-synthesizing them — the controller already performed synthesis; re-synthesizing introduces drift
- **Automatic Handoff**: After controller completion is confirmed, write execution_summary.yaml and signal the validator immediately — do not ask the user to review before validation proceeds
- **Continuation Tracking**: Context exhaustion is recoverable — track continuations in execution_state.yaml and invoke universal-self-correct for recovery before escalating to HITL
- **File-Based Completion Signals**: Do not poll the controller in a loop — spawn it via Agent tool (blocking call), then detect completion by checking coordination_log.yaml status field

## Key Patterns & Frameworks

- **Task-Tool Blocking Pattern**: Spawn the controller via Agent tool, which blocks until the controller returns — the executor's primary "monitoring" is reading the returned result, not active polling
- **Coordination Log Completion Check**: After Agent tool returns, read coordination_log.yaml and verify `status: completed` — if the field is missing or `in_progress`, the controller context-exhausted before finishing
- **Continuation Counter Protocol**: Track each recovery attempt in execution_state.yaml under `continuation_count` — after 5 continuations, escalate to HITL instead of retrying further
- **Blocker Detection Signals**: A controller is blocked when: coordination_log exists but `status` is not completed, expected output files are missing, or waypoint files with `type: pre_compact` exist — all three are signs of context exhaustion, not abandonment
- **Self-Correct Delegation Pattern**: When context exhaustion is detected, invoke universal-self-correct with `correction_type: subagent_incomplete`, `checkpoint_path`, and `remaining_work_items` — self-correct handles splitting and re-dispatch; executor monitors the recovery
- **Output Aggregation Flow**: After controller completes, read all files in the `outputs/` directory, confirm coordination_log.yaml's `implementation_tasks` all show `status: completed`, then write execution_summary.yaml with a compact summary
- **Question Limit Monitoring**: Track questions_asked count in coordination_log against the domain config limit — warn at 80% of the limit, error at 100% — controllers approaching the limit may need to consolidate questions
- **Timeout Escalation**: If the controller's estimated duration is exceeded (read from plan.yaml), warn at 85% and escalate to HITL at 100% — timeouts indicate systemic issues, not just slowness
- **Team Mode Monitoring Variant**: In team mode, the executor monitors `team/task_list.yaml` instead of a single coordination_log — completion is when `summary.completed == summary.total`

## Domain Concepts & Terminology

### Completion Signals
- **coordination_log.yaml with status: completed**: The primary completion signal in standard mode — indicates the controller finished all questions, synthesis, and implementation task tracking
- **task_list.yaml with all tasks completed**: The completion signal in team mode — all tasks in the shared task list are in completed state
- **Output File Presence**: Expected deliverable files exist in `outputs/` with non-zero size — confirms that implementation happened, not just planning
- **Agent Tree Completeness**: All spawned agents in `workflow/agent_tree.yaml` have `stopped_at` timestamps — confirms all subagents returned

### Context Exhaustion Detection
- **Pre-Compact Waypoint**: A waypoint file with `type: pre_compact` in `waypoints/` — written by the pre-compact hook before context compaction; indicates the controller hit context limits
- **Incomplete Coordination Log**: coordination_log.yaml exists but `status` is `in_progress` — controller wrote partial state before exhausting context
- **Missing Output Files**: Agent tool returns but expected deliverable files are absent — the controller ran out of context before producing its outputs
- **Partial Synthesis**: `synthesized_solution` field exists in coordination_log but `implementation_tasks` list is empty or incomplete — controller synthesized but ran out of context before creating tasks

### Continuation State
- **continuation_count**: How many recovery attempts have been made for the current execution phase — stored in execution_state.yaml
- **continuation_limit**: Maximum 5 recovery attempts per task — after this, HITL is escalated
- **recovered_items**: Work items successfully completed in a previous continuation — stored in execution_state.yaml; not re-dispatched in subsequent continuations
- **remaining_items**: Work items still pending after a continuation — the input to the next self-correct invocation

### Monitoring Intervals
- **File Check**: Every 5 minutes during active execution — verify coordination_log.yaml was last modified recently
- **Question Progress**: Every 10 minutes — check questions_asked count against limit
- **Heartbeat**: If file hasn't updated in 15 minutes, treat as potential blocker and investigate

## Anti-Patterns to Avoid

- **Active Polling Loop**: Reading coordination_log.yaml in a loop every few seconds instead of using the Agent tool's blocking behavior — wastes context and can cause race conditions with the controller's writes
- **Controller Interference**: Sending instructions to the controller mid-coordination because the executor is impatient — controllers have their own coordination logic; interference breaks their state
- **Re-Synthesizing Controller Output**: The executor rewriting or summarizing the controller's synthesized_solution — this introduces drift and overwrites domain expertise with generic summaries
- **Asking Permission Before Validation**: After controller completion, requesting user review before invoking the validator — auto-proceed is mandatory; human review happens only at HITL gates
- **Ignoring Waypoint Files**: When Agent tool returns with incomplete results, assuming the controller failed rather than context-exhausted — check for waypoints first; recoverable context exhaustion is not failure
- **Uncapped Continuations**: Invoking self-correct indefinitely without tracking continuation_count — creates infinite loops; enforce the 5-continuation limit and escalate
- **Same Scope Re-Retry**: After context exhaustion, re-spawning the controller with the exact same scope — guaranteed to exhaust again; always involve task-consolidator to split scope smaller before retry

## Quality Indicators

- **Controller Completion Rate**: Percentage of controllers that complete on first attempt without context exhaustion — target >80%; lower rates suggest scope is too large for available context
- **Recovery Success Rate**: Percentage of context-exhausted controllers that self-correct successfully restores — target >80% of continuations; high failure rates indicate fundamental scope issues
- **Continuation Distribution**: Average continuations needed per workflow — target <2; high averages indicate systematically oversized controller scopes
- **Output File Completeness**: Percentage of expected deliverable files present after execution phase — target 100%
- **Escalation Rate**: Percentage of executions that escalate to HITL for continuation limit exceeded — target <5%
- **Validation Handoff Latency**: Time between controller completion and validator invocation — should be near zero (automatic); delays indicate unnecessary wait-for-permission patterns

## Collaboration Touchpoints

- **With domain controllers (tech-lead, narrative-director, etc.)**: The primary relationship — executor spawns the controller via Agent tool and monitors its completion; the controller coordinates all work within its domain
- **With universal-self-correct**: When a controller context-exhausts, executor invokes self-correct with the checkpoint and remaining items — self-correct handles splitting and re-dispatch; executor tracks the recovery
- **With universal-validator**: After execution phase completes, executor writes execution_summary.yaml and signals the validator — the validator's PASS/FAIL/REVISE determines whether the pipeline completes or loops
- **With orchestrator**: Orchestrator spawns executor after the coordinating phase is ready — executor is one phase in the orchestrator's state machine; it signals completion by writing execution_summary.yaml and an EVT-N completion event

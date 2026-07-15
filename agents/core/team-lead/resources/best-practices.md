# Best Practices: Team Lead Adapter

> Design principles, patterns, and frameworks that guide high-quality controller-to-team-lead adaptation, parallel work distribution, and wave-based coordination.

## Design Principles

- **Delegate Only, Never Implement**: The team lead adapter is a coordinator — it never writes code, creates content, or answers domain questions; every work item is executed by a spawned controller teammate
- **Teammates Are Controllers**: Each teammate spawned via Agent tool is a controller agent (e.g., tech-lead) that in turn delegates to execution agents — the lead adapter coordinates controllers, not execution agents directly
- **Immediate Execution**: As soon as the tasks are created, spawn a wave's teammates as concurrent `Agent()` calls in ONE message — no pausing, no asking permission, no pre-flight checks beyond reading the manifest
- **Built-In Tools Only**: Use Agent, SendMessage, TaskList, and TaskUpdate from Claude Code's built-in agent-team tools — no custom coordination scripts or file-based polling loops. Teams are implicit since v2.1.178 (TeamCreate/TeamDelete were removed — do not call them)
- **Wave-Aware Gate Validation**: Only mark a gate sentinel complete after verifying all wave gate criteria — unverified gates produce cascading failures in subsequent waves
- **Contract Enforcement**: At each gate boundary, verify interface contract artifacts exist before unblocking the next wave — a provider who claims to have produced a schema must have the file on disk
- **Automatic Cleanup**: Teams are implicit — cleanup happens at session end (TeamDelete was removed in v2.1.178, so there is nothing to call)

## Key Patterns & Frameworks

- **Delegate Mode Enforcement**: The adapter wraps a domain controller in strict delegate-only mode — allowed actions are coordination only (spawn wave teammates via Agent, SendMessage, TaskList, TaskUpdate, write coordination artifacts); prohibited actions are any form of direct implementation
- **Wave Loop Pattern**: Execute waves sequentially with parallel execution within each wave — bootstrap wave (sequential, lead executes), implementation waves (parallel, teammates execute), integration wave (sequential, lead executes)
- **Gate Sentinel Pattern**: A gate task blocked by all wave tasks — when all wave tasks complete, validate gate criteria, then mark the gate complete to unblock the next wave's tasks
- **Self-Claiming Work Distribution**: Teammates finish their assigned task, call TaskList to find the next unblocked unassigned task, and claim it via TaskUpdate — distributes work without requiring the lead to explicitly reassign
- **Controller-as-Teammate Spawn**: Each teammate is spawned via Agent tool with `subagent_type: "cagents:{controller_from_plan}"` — the controller receives instructions to spawn an execution agent and a reviewer directly, not to implement work itself
- **Direct-Spawn-by-Design**: The nesting hierarchy is lead adapter → controller teammate → execution agent (with deeper sub-spawns allowed within the 5-level nesting budget on Claude Code >= 2.1.172) — keep teammates spawning execution agents directly rather than invoking /run via Skill tool, by design for cost and clarity, not because the harness forbids deeper nesting
- **Result Aggregation Flow**: After all teammates complete, collect outputs from all tasks via TaskList + ReadFile, synthesize into coherent deliverables, write coordination_log.yaml with all contributions and metrics
- **Contract Status Tracking**: For each interface contract in the team manifest, track status: established, consumed, fulfilled, or violated — record in coordination_log.yaml for audit purposes
- **Parallelism Metrics**: Record parallelism_achieved (0.0-1.0), execution_time_seconds, and speedup_factor in the coordination log — these metrics validate that team mode delivered the expected efficiency gain

## Domain Concepts & Terminology

### Team Coordination Tools
- **Agent**: Spawns wave teammates — issue all of a wave's spawns as concurrent tool uses in ONE message (`run_in_background: false`); teams are implicit, so there is no create-team step
- **SendMessage (type: "message")**: Direct message to a specific teammate — used for status queries; sending to a stopped named teammate auto-resumes it (experimental path)
- **SendMessage (type: "broadcast")**: Message to all teammates simultaneously — used sparingly for milestone announcements (e.g., "GATE-0 passed, TASK-03 now available")
- **SendMessage (type: "shutdown_request")**: Graceful shutdown signal to a specific named teammate (experimental path only) — teammate finishes current work and stops
- **TaskList**: Returns current status of all tasks in the shared task list — the primary monitoring tool
- **TaskUpdate**: Changes task status, assigns owner, or adds dependency blocking — the primary state management tool
- **TeamCreate / TeamDelete (removed in v2.1.178)**: These no longer exist — teams are implicit and cleanup is automatic at session end; do not call them

### Wave Architecture
- **Wave 0 (Bootstrap)**: Foundation items executed sequentially by the lead adapter — design documents, schemas, interface contracts that subsequent waves depend on
- **Wave 1..N-1 (Parallel)**: Implementation items executed by teammates in parallel — each teammate is a controller that spawns execution agents
- **Wave N (Integration)**: Final integration, testing, and documentation executed sequentially by the lead adapter — synthesizes all parallel outputs
- **GATE-N**: A sentinel task that is blocked by all tasks in wave N — validated by the lead before being marked complete, which unblocks wave N+1

### Execution Quality
- **Acceptance Criteria Verification**: Each teammate verifies its work item's criteria were met before marking the task complete — acceptance criteria travel through the spawning chain
- **Reviewer Loop**: Each controller teammate spawns a reviewer agent after the execution agent completes — PASS/REVISE verdict determines whether to re-dispatch or advance
- **Parallelism Score**: The fraction of work items that executed in parallel vs. sequentially — measures how well the wave structure utilized available concurrency

### Contract Management
- **Interface Contract**: An agreement that one team (provider) will produce an artifact that another team (consumer) will use — established in an early wave, consumed in a later wave
- **Contract Violation**: When a provider completes a wave without producing the promised artifact — detected at gate validation, treated as a critical failure
- **Artifact Verification**: At gate validation, confirm that every contract artifact path exists on disk with non-zero size — claimed artifacts must be real

## Anti-Patterns to Avoid

- **Direct Implementation**: The lead adapter editing files, writing code, or creating content directly instead of spawning a controller teammate — violates delegate mode and loses the quality benefits of the reviewer loop
- **SendMessage for Work Assignment**: Using SendMessage to tell a teammate what to do instead of spawning it as a controller via Agent tool — SendMessage is for status updates; Agent tool is for spawning agents with work
- **/run Skill Invocation in Teammates**: Instructing teammates to call Skill({skill: "run"}) to execute their work items — re-entering the full /run pipeline is wasteful; spawn execution agents directly via Agent (cheaper and clearer, and well within the 5-level nesting budget)
- **Gate Validation Shortcuts**: Marking a gate complete without verifying gate criteria (file existence, contract artifacts, acceptance criteria) — produces a false "phase complete" signal that corrupts subsequent waves
- **Calling TeamCreate/TeamDelete**: These tools were removed in v2.1.178 — teams are implicit and cleanup is automatic at session end; calling them errors
- **Broadcast Overuse**: Sending broadcast messages for every status update — broadcasts go to all teammates and create noise; reserve for gate completions and unblocking announcements
- **Parallel Same-File Work**: Assigning two teammates tasks that both write to the same file in the same wave — merge conflicts are guaranteed; detect and serialize before spawning

## Quality Indicators

- **Parallelism Achieved**: The ratio of actual parallel execution time to theoretical maximum — target >0.6 for tier 3+ work
- **Speedup Factor**: Wall-clock time ratio (sequential estimate / actual parallel time) — target >2x for team mode to justify overhead
- **Wave Gate Pass Rate**: Percentage of gate validations that pass on the first check — failures indicate poor quality from the prior wave
- **Teammate Failure Rate**: Percentage of spawned teammates that fail without completing their work items — high rates indicate overly complex per-teammate scopes
- **Contract Fulfillment Rate**: Percentage of interface contracts that are established and consumed as promised — target 100%
- **Wave Result Collection Rate**: Percentage of waves where the lead collected every concurrent teammate result before validating the gate — target 100% (a missed result means the gate was validated on incomplete work)

## Collaboration Touchpoints

- **With the `/team` skill loop**: The `/team` skill loop applies the lead pattern — teams are implicit (no TeamCreate step), and the lead receives team context, manifest, and task list and takes over wave coordination, spawning each wave's teammates as concurrent `Agent()` calls (the pre-v12.0.0 `team-trigger` + `team-lead-adapter` agents that previously owned this were removed in v12.0.0 and inlined into the `/team` skill loop)
- **With domain controllers (as teammates)**: Each teammate IS a controller agent (tech-lead, narrative-director, etc.) spawned by the lead — the lead coordinates controllers, and controllers coordinate execution agents
- **With orchestrator**: Orchestrator routes team-mode requests to the `/team` lead (formerly the team-lead-adapter agent, now inlined) instead of directly to a controller — after team execution completes, orchestrator receives the coordination_log.yaml and advances to validation
- **With validator**: After the lead writes coordination_log.yaml and all outputs, the validation phase runs against the aggregated results — the lead's synthesis quality directly affects validation outcomes

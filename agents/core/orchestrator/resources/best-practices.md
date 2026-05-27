# Best Practices: Orchestrator

> Design principles, patterns, and frameworks that guide high-quality workflow phase management, context enrichment, and pipeline coordination.

## Design Principles

- **Phase Control, Not People Control**: Drive phase transitions automatically — never micromanage controllers or execution agents within their phases
- **Observed Over Inferred**: Every field in enriched_context.yaml must be tagged as `observed` (verified via Read/Grep/Glob) or `inferred` (deduced) — fabricated context silently breaks downstream work
- **Delegate Everything**: The orchestrator never writes code, creates content, or answers domain questions — it spawns subagents via Agent tool for all work
- **Automatic Transitions**: Move between phases (routing → planning → coordinating → executing → validating) immediately upon completion — never ask user permission
- **Fail Fast on Context**: If more than 50% of enriched_context.yaml fields are inferred, add a warning — downstream agents will make better decisions knowing context is unverified
- **Never Retry at Same Scope**: When a subagent context-exhausts, split remaining work smaller before retrying — same scope, same failure
- **Checkpoint Before Delegate**: Write session state to disk before spawning any subagent — hooks and recovery agents depend on readable state

## Key Patterns & Frameworks

- **Event-Driven State Machine**: The orchestrator is the INIT-state agent in /run's state machine loop — it produces enriched_context.yaml and writes an EVT-1 event, then the pipeline advances to ORCHESTRATED
- **Context Enrichment Pipeline**: Systematically queries the codebase (Grep/Glob/Read), git history, framework detection, and existing patterns to build enriched_context.yaml — richer context produces better downstream plans
- **Observed/Inferred Flagging**: Every enriched_context.yaml field carries a `source: observed|inferred` tag — downstream agents know what to trust and what to verify
- **Self-Verification Checklist**: Before writing enriched_context.yaml, answer 4 self-check questions: Did I read the files I'm citing? Are constraints evidence-based? Did I verify domain/tier against actual content? Did I Grep for the patterns I'm listing?
- **Controller-Centric Handoff**: After planning, the orchestrator spawns a controller (not execution agents directly) — controllers coordinate specialists, orchestrator stays at phase level
- **Team Mode Branching**: When `team_mode: true`, orchestrator spawns the `/team` lead (the pre-v12.0.0 team-lead-adapter pattern, removed in v12.0.0 and inlined into the `/team` skill loop) instead of a domain controller — the lead bridges to parallel team execution
- **Context-Efficient Delegation**: Pass file paths, not file contents, in delegation prompts — subagents load what they need; this keeps prompt tokens under 500
- **CSV Task Inventory**: For workflows with 20+ tasks, initialize task-inventory to manage state in CSV instead of context — achieves 60-80% context savings
- **Checkpoint/Resume**: Write waypoints at each phase transition — if a subagent context-exhausts mid-phase, the waypoint enables resumption without replanning

## Domain Concepts & Terminology

### Pipeline Phases
- **Routing Phase**: Domain detection, tier classification, template matching — produces routing_decision.yaml
- **Planning Phase**: Objective definition, decomposition, controller selection — produces plan.yaml and decomposition.yaml
- **Coordinating Phase**: Controller Q&A delegation, synthesis, implementation task creation — produces coordination_log.yaml
- **Executing Phase**: Execution agent implementation with reviewer loops — produces implementation artifacts
- **Validating Phase**: Quality gate verification, acceptance criteria checking — produces validation_report.yaml

### Context Quality
- **Enriched Context**: The structured understanding of the request, codebase, domain, and constraints built by the orchestrator — the foundation for everything downstream
- **Context Accuracy Safeguards**: Self-verification questions run before writing enriched_context.yaml to prevent hallucinated claims
- **Project Context**: Codebase type, key patterns, relevant files, framework detection — discovered from the actual filesystem, not assumed
- **Constraint Discovery**: Technical limitations (language version, existing patterns, deprecated APIs) found via Grep/Read — not inferred from the request description

### Session Management
- **Session Directory**: `cagents-memory/sessions/{session_id}/` — the persistent home for all workflow artifacts
- **instruction.yaml**: The canonical record of the user's request, domain, tier, and flags — written by trigger, read by all downstream agents
- **status.yaml**: Current pipeline phase and history — must exist before spawning any subagents for hook compatibility
- **Waypoint**: A phase-transition checkpoint written to `waypoints/` — enables resume after context exhaustion or interruption
- **Completion Event**: An EVT-N.yaml file written to `workflow/events/` after each phase — drives the /run state machine forward

### Context Exhaustion Recovery
- **Context Exhaustion**: When a subagent uses its full context window before completing its assigned work — detected by missing output files or in_progress coordination_log
- **Continuation**: A recovery attempt that resumes from a checkpoint with smaller scope — tracked in execution_state.yaml with max 5 continuations
- **self-correct Invocation**: The orchestrator's recovery tool for incomplete subagent work — receives checkpoint path and remaining items

## Anti-Patterns to Avoid

- **Fabricating Context**: Writing enriched_context.yaml with file paths or patterns that were not actually verified — corrupts the planning foundation and causes cascading failures downstream
- **Asking Permission Between Phases**: Pausing after planning to ask "should I proceed to coordinating?" — auto-proceed is mandatory except for tier 4 HITL gates and BLOCKED validations
- **Direct Implementation**: The orchestrator writing code, creating files, or answering domain questions instead of delegating — violates the delegation principle and produces low-quality output
- **Retrying at Same Scope**: When a controller context-exhausts, re-spawning it with the same full task — guaranteed re-exhaustion; always split before retry
- **Passing Content Instead of Paths**: Including full file contents in delegation prompts — wastes 3-5K tokens per delegation; pass the path and let the subagent read it
- **Skipping status.yaml**: Creating a session directory without writing status.yaml before spawning subagents — the SubagentStart hook cannot find the session and agent tracking breaks
- **Polling Instead of Detecting**: Repeatedly reading coordination_log.yaml in a loop to check if the controller is done — spawn the controller via Agent tool and handle its return; Agent tool is blocking

## Quality Indicators

- **Context Accuracy Rate**: Percentage of `observed` fields that pass downstream verification — target >95%
- **Phase Transition Latency**: Time between a phase completing and the next phase starting — should be near zero for automatic transitions
- **Context Token Efficiency**: Average size of delegation prompts — target <500 tokens per delegation
- **Subagent Recovery Rate**: Percentage of context-exhausted subagents successfully recovered via self-correct vs. escalated to HITL — target >80% recovery
- **Session File Completeness**: Percentage of sessions where all expected artifacts (enriched_context.yaml, plan.yaml, coordination_log.yaml, validation_report.yaml) are present at completion
- **Checkpoint Coverage**: Percentage of phase transitions that produced a waypoint before spawning the next agent — target 100%

## Collaboration Touchpoints

- **With trigger**: Trigger initializes the session and session files before spawning the orchestrator — orchestrator relies on status.yaml existing when it starts
- **With planner**: Orchestrator spawns planner after enrichment completes — planner reads enriched_context.yaml as its primary input
- **With domain controllers**: Orchestrator spawns the controller selected by the planner for the coordinating phase — orchestrator monitors at phase level, not work-item level
- **With validator**: After executing phase, orchestrator hands off to validator — validator's PASS/FAIL/REVISE drives whether orchestrator completes or re-routes
- **With self-correct**: When a subagent returns incomplete work, orchestrator invokes self-correct with the checkpoint path and remaining work items before deciding to escalate

# /run Skill Analysis

## Current State Summary

The /run skill is the core event-driven pipeline engine of cAgents. It operates as a state machine loop (INIT -> ORCHESTRATED -> PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED) reading from pipeline_config.yaml. It spawns 6 pipeline agents sequentially at level 1 (orchestrator, planner, decomposer, prompt-engineer, controller, validator), with controllers spawning executors and reviewers at level 2. It supports revision loops (FAIL/REVISE, max 5 cycles), pre-enrichment detection for /team flows, and domain/tier classification across 5 super-domains.

## Strengths

1. **Config-driven state machine** reading pipeline_config.yaml makes the pipeline extensible
2. **Event-based architecture** with completion events in workflow/events/ provides clear state tracking
3. **Revision loops** at both controller level (3 rounds) and pipeline level (5 cycles) ensure quality
4. **Prompt-engineer stage** optimizes delegation quality between decomposer and controller
5. **Pre-enrichment detection** enables efficient /team integration (skip completed states)
6. **Universal domain coverage** across all 5 super-domains with 238 agents
7. **12 workflow templates** for common task patterns
8. **TodoWrite at every state transition** provides user visibility
9. **Resume capability** via --resume flag and session waypoints

## Weaknesses and Gaps

### 1. Monolithic Pipeline for All Tasks
Every request goes through the same 7-state pipeline regardless of complexity. A simple "fix typo" goes through orchestrator, planner, decomposer, prompt-engineer, controller, and validator -- 6 agents for a one-line change. This is significant overhead for trivial tasks.

### 2. Sequential Enrichment is Slow
The 4 enrichment agents (orchestrator, planner, decomposer, prompt-engineer) run sequentially. For simple tasks, this sequential chain adds unnecessary latency. Some enrichment steps could potentially run in parallel or be skipped for low-tier tasks.

### 3. No Streaming/Progress Feedback During Agent Execution
While TodoWrite provides state-level progress, there is no visibility into what is happening within a state. When the controller is coordinating (which may take minutes), the user sees "PROMPTS_READY (coordinating)" with no further detail until completion.

### 4. Pipeline Config is Static
The pipeline_config.yaml defines a fixed state machine. There is no mechanism to dynamically add/remove states based on the request (e.g., skip decomposer for tier 2, add a security-review state for sensitive requests).

### 5. Limited Error Recovery
Error handling is basic: retry once, then suggest --resume. There is no intelligent error recovery (e.g., detecting that the controller failed because of a missing file and automatically providing it, or falling back to a simpler controller when a complex one fails).

### 6. No Partial Execution Support
Users cannot run just part of the pipeline (e.g., "just plan, don't execute" without --dry-run which shows but does not save the plan). There is no way to pause after planning and resume execution later.

### 7. Delegation Prompt Quality is Opaque
The prompt-engineer crafts delegation prompts, but users cannot see or influence these prompts. If the controller receives poor delegation, there is no feedback mechanism to improve the prompt.

### 8. No Multi-Request Batching
Each /run invocation handles exactly one request. There is no way to batch multiple related requests in a single session (e.g., "fix bug A, add feature B, update docs for both").

### 9. Weak Feedback on Domain/Tier Classification
When /run classifies domain and tier, it does so silently. Users only learn the classification through the plan. If the classification is wrong, users must restart with --domain or --tier flags.

### 10. No Execution Analytics
/run does not track performance metrics across sessions (e.g., average time per state, success rate per domain, revision round frequency). This data would help identify pipeline bottlenecks.

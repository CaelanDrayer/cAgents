# Architecture Improvements

Structural and systemic improvements to cAgents' pipeline, memory, coordination, and error handling architecture.

---

## Table of Contents

- [Memory and Persistence](#memory-and-persistence)
- [Pipeline Architecture](#pipeline-architecture)
- [Agent Coordination](#agent-coordination)
- [Context Management](#context-management)
- [Error Handling](#error-handling)

---

## Memory and Persistence

### 1. Cross-Session Compound Learning

- **Source repo(s)**: loki-mode, everything-claude-code
- **Priority**: P0 (critical)
- **Effort**: High
- **Description**: Automatically extract patterns, anti-patterns, and reusable solutions from completed sessions and persist them in `_knowledge/` for future use. After a successful VALIDATED/COMPLETE state, a consolidation agent reads coordination_log.yaml, identifies novel insights (bug fixes, non-obvious solutions, reusable patterns), and writes structured solution files to `_knowledge/procedural/` and `_knowledge/semantic/`.
- **Current gap**: cAgents sessions are completely isolated. Knowledge from one `/run` session does not carry forward to the next. The `_knowledge/` directory exists but is not systematically populated. The same mistakes get re-investigated, the same patterns get re-discovered.
- **Implementation notes**:
  1. Add a `post-session-consolidator` agent to the /run pipeline (after VALIDATED)
  2. Extract findings from coordination_log.yaml, reviewer feedback, and validation reports
  3. Categorize as: pattern (reusable approach), anti-pattern (what failed), solution (specific fix)
  4. Write to `Agent_Memory/_knowledge/procedural/{category}/{slug}.yaml` with YAML frontmatter (title, tags, symptoms, root_cause, prevention)
  5. Load relevant knowledge during orchestrator enrichment phase using tag-based lookup
  6. Start simple (file-based YAML) before investing in database-backed storage

### 2. Searchable Memory Kernel (SQLite + FTS5)

- **Source repo(s)**: purple-directive-violet, claude-mem
- **Priority**: P1 (high)
- **Effort**: High
- **Description**: Replace or supplement flat-file `Agent_Memory/_knowledge/` with a SQLite database using FTS5 full-text search. Each observation gets typed (fact/preference/experience/correction/procedural/pattern), tagged, and optionally embedded for semantic search. A consolidator detects near-duplicates (cosine similarity > 0.92), stale memories (90+ days), and orphans.
- **Current gap**: cAgents uses flat file memory with no search capability beyond path-based lookup. Agents cannot query for relevant past knowledge semantically. When the orchestrator enriches context, it relies on file-path-based lookups only.
- **Implementation notes**:
  - Short-term: Add an index file to `_knowledge/` with tagged summaries that agents can grep
  - Medium-term: Build a lightweight SQLite store (zero external dependencies, built-in Node.js sqlite3 or better-sqlite3)
  - Long-term: Consider an MCP memory server for remote access and multi-machine sharing
  - The compiler pattern from purple-directive (extract -> classify -> embed -> store) could run as a SessionEnd hook

### 3. Project-Level Persistent Memory

- **Source repo(s)**: memory-bank-mcp, marketingskills, ccpm
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Add a project-level memory layer above session-scoped memory that persists across `/run` invocations on the same codebase. Contains architectural decisions, system patterns, tech stack context, and active working state. Read at session start, updated incrementally.
- **Current gap**: Agent_Memory/ is session-scoped. Knowledge from one /run session does not automatically carry forward. The enriched_context.yaml is rebuilt from scratch every time.
- **Implementation notes**:
  - Create `Agent_Memory/_projects/{project_hash}/` directory with:
    - `project-context.md` (user-maintained, read by orchestrator)
    - `system-patterns.yaml` (auto-populated from completed sessions)
    - `tech-context.yaml` (auto-populated from codebase analysis)
    - `active-context.yaml` (current focus, updated per session)
  - Orchestrator reads these during enrichment before creating enriched_context.yaml
  - Add `/context` skill for user management (create, update, prime)

### 4. Append-Only Decision and Correction Logs

- **Source repo(s)**: purple-directive-violet
- **Priority**: P2 (medium)
- **Effort**: Low
- **Description**: Maintain append-only `DECISIONS.md` and `CORRECTIONS.md` files at the project level that persist across sessions. All entries require timestamps, agent signatures, and session IDs. This creates a reliable audit trail that agents can reference to avoid repeating past mistakes.
- **Current gap**: cAgents coordination_log.yaml is written once by the controller. There is no append-only decision log or correction log that persists across sessions.
- **Implementation notes**:
  - Create `Agent_Memory/_projects/{project}/DECISIONS.md` (append-only, never rewritten)
  - Create `Agent_Memory/_projects/{project}/CORRECTIONS.md` (append-only)
  - Controllers append decisions with rationale during coordination
  - Validators append corrections when REVISE is triggered
  - Orchestrator reads these during enrichment to avoid known anti-patterns

### 5. Memory Consolidation Pipeline

- **Source repo(s)**: purple-directive-violet, loki-mode
- **Priority**: P2 (medium)
- **Effort**: High
- **Description**: Implement a consolidation pipeline that promotes episodic session memories to semantic patterns over time. Detect near-duplicates, find stale memories, identify orphans, and generate health reports. Based on MemEvolve research showing 17% improvement over static memory weights.
- **Current gap**: cAgents has sessions (episodic) and `_knowledge/` (roughly semantic), but no procedural memory and no consolidation pipeline. The key gap is that cAgents does not automatically extract patterns from completed sessions and promote them to reusable knowledge.
- **Implementation notes**:
  - Implement a periodic consolidation script (can run as SessionEnd hook or scheduled)
  - Detect similar coordination_log entries across sessions
  - Promote repeated patterns to semantic knowledge
  - Flag stale knowledge (not referenced in 90+ days)
  - Generate memory health reports for maintainers

---

## Pipeline Architecture

### 6. Pre-Execution Confidence Scoring

- **Source repo(s)**: SuperClaude_Framework
- **Priority**: P0 (critical)
- **Effort**: Medium
- **Description**: Add a 5-check confidence assessment (0.0-1.0) between planning and controller execution: (1) no duplicate implementations (25%), (2) architecture compliance (25%), (3) official docs verified (20%), (4) existing solutions found (15%), (5) root cause identified (15%). Score >= 0.9 proceed; 0.7-0.89 present alternatives; < 0.7 stop and investigate. ROI: 100-200 tokens spent saves 5,000-50,000 tokens on wrong-direction work.
- **Current gap**: cAgents planner does tier classification but no formal confidence scoring before execution begins. Underspecified work items proceed to controller execution and waste tokens before failing at validation.
- **Implementation notes**:
  - Add confidence check to the prompt-engineer agent or create a dedicated `pre-execution-check` agent
  - Run between DECOMPOSED and PROMPTS_READY states
  - The 5-check rubric is directly adaptable to cAgents' work items
  - On low confidence: route to planner for refinement (REVISE) instead of proceeding

### 7. Ambiguity Gating with Mathematical Scoring

- **Source repo(s)**: oh-my-claudecode
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Score clarity across weighted dimensions (Goal 30%, Constraints 25%, Success Criteria 25%, Context 20%) and refuse to auto-proceed when ambiguity exceeds a configurable threshold (default 20%). Uses rotating challenge agent modes (Contrarian, Simplifier, Ontologist) to shift questioning perspectives.
- **Current gap**: cAgents always auto-proceeds (except /designer). The orchestrator enriches context but cannot measure how well it understands the request. Vague requests proceed to planning and produce poor decompositions.
- **Implementation notes**:
  - Add ambiguity scoring to the orchestrator agent (during enrichment)
  - If ambiguity > threshold and not in auto-mode: generate clarifying questions
  - If ambiguity > threshold and in auto-mode: flag in enriched_context.yaml and proceed with caveats
  - This replaces the blanket auto-proceed with intelligent auto-proceed

### 8. Step-File Micro-Architecture for Sequential Loading

- **Source repo(s)**: BMAD-METHOD
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Decompose complex workflows into individual step files loaded one at a time with strict just-in-time loading. Each step has its own frontmatter, execution rules, success/failure metrics, and context boundaries. Prevents the model from looking ahead and creating mental todo lists.
- **Current gap**: cAgents loads entire plan.yaml and work_items.yaml into context at once, which risks attention drift. Controllers receive all work items simultaneously rather than one at a time.
- **Implementation notes**:
  - For controllers with 5+ sequential work items, generate individual step files
  - Controller loads step-N.yaml, executes it, then loads step-N+1.yaml
  - Each step file contains only: the current work item, its acceptance criteria, and output from completed dependencies
  - State tracking via frontmatter `stepsCompleted` array enables pause/resume

### 9. Event Bus for Cross-Process Communication

- **Source repo(s)**: loki-mode
- **Priority**: P3 (low)
- **Effort**: High
- **Description**: Expand the event system beyond pipeline state transitions (EVT-N.yaml) to cover agent spawns, task completions, memory operations, errors, and user interactions. Events survive process crashes and can be replayed for debugging.
- **Current gap**: cAgents uses workflow/events/ files only for pipeline state machine transitions. No broader event system for monitoring, debugging, or external integration.
- **Implementation notes**:
  - Extend the existing EVT-N.yaml pattern to cover more event types
  - Add event types: agent_spawn, agent_stop, task_complete, error, memory_update, user_interaction
  - Store in `workflow/events/` with typed schemas
  - Enable external tools (dashboards, monitoring) to watch the events directory

---

## Agent Coordination

### 10. Blind Review with Anti-Sycophancy

- **Source repo(s)**: loki-mode
- **Priority**: P0 (critical)
- **Effort**: Medium
- **Description**: Multiple reviewers evaluate independently without seeing each other's findings. If all reviewers unanimously approve, an additional Devil's Advocate reviewer specifically tries to find problems. Based on CONSENSAGENT (ACL 2025) research showing 30% reduction in false positives.
- **Current gap**: cAgents uses a single reviewer per work item in the controller loop. The reviewer sees the full implementation and previous review rounds, which can introduce confirmation bias. No anti-sycophancy mechanism exists.
- **Implementation notes**:
  1. Modify controller reviewer loop to spawn 2-3 independent reviewers (for tier 3+ work items)
  2. Each reviewer receives only acceptance criteria and implementation output (not other reviewers' findings)
  3. Aggregate findings (union of all issues, not intersection)
  4. If all PASS: spawn one more reviewer with explicit "find what is wrong" anti-sycophancy prompt
  5. Update coordination_log.yaml with multi-reviewer results

### 11. Structured 2-Round Deliberation Protocol

- **Source repo(s)**: purple-directive-violet
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Three advisory agents with structurally differentiated cognitive perspectives deliberate in exactly 2 rounds: Round 1 independent parallel analysis (no cross-visibility), Round 2 cross-response (each reads others' Round 1 output). Hard stop after Round 2. Output includes consensus, divergence with evidence, and confidence tiers.
- **Current gap**: cAgents /org C-suite deliberation has objection phases but no fixed round limit, risking extended deliberation and budget burn.
- **Implementation notes**:
  - Apply to /org C-suite deliberation (replace open-ended objection phase with 2-round protocol)
  - Apply to /review multi-perspective analysis
  - Round 1: Spawn all reviewers in parallel with no cross-visibility
  - Round 2: Each reviewer reads all Round 1 outputs and responds
  - Hard stop: No Round 3 regardless of disagreement

### 12. Handoff Documents with Decision Rationale

- **Source repo(s)**: oh-my-claudecode, everything-claude-code
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: Each pipeline stage writes a handoff document to `workflow/handoffs/` capturing: context summary, key decisions (with rationale and rejected alternatives), findings, files modified, open questions, and recommendations. Maximum 10-20 lines each.
- **Current gap**: cAgents pipeline stages communicate via event files (state-oriented, not context-oriented). The current system captures what happened but not WHY (rationale for decisions, alternatives rejected).
- **Implementation notes**:
  - Add handoff document writing to each pipeline agent's completion step
  - Structure: `## Decisions` (what was decided, why, what was rejected), `## Open Questions`, `## Recommendations for Next Stage`
  - Store in `workflow/handoffs/STAGE_NAME.md`
  - Next stage reads all prior handoffs before starting
  - Handoffs survive team cancellation for session resume

### 13. Inner Loop Worker for Related Work Items

- **Source repo(s)**: Claude-Code-Workflow
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Process all same-prefix/related tasks sequentially in a single agent instance, maintaining a context accumulator across iterations. This avoids spawning a new agent per task when tasks share context (e.g., implementing 3 related API endpoints).
- **Current gap**: cAgents spawns a new subagent for each work item, losing context between items. Sequential work items with shared context suffer from repeated discovery work.
- **Implementation notes**:
  - Controllers detect work items that share context (same module, same file set, sequential dependencies)
  - Batch related work items into a single agent spawn with instructions to process sequentially
  - Agent maintains a findings accumulator between items
  - Falls back to separate spawns if items are independent

### 14. Defect-Type-Specific Fix Routing

- **Source repo(s)**: oh-my-claudecode
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Route different types of failures to specialized fixers instead of generic re-execution. Defect types: build (compilation errors), test (test failures), logic (incorrect behavior), security (vulnerability), style (formatting/convention).
- **Current gap**: All FAIL revisions go back to the same executor. A build error and a logic error get the same treatment. No defect-type-specific routing.
- **Implementation notes**:
  - Extend validator FAIL output to include `defect_type` field
  - Map defect types to specialized agents: build -> backend-developer, test -> qa-tester, security -> security-specialist, logic -> architect + backend-developer
  - Controller uses defect_type to select the most appropriate executor for the fix
  - Track fix success rate by defect type for continuous improvement

### 15. Cognitive Diversity in Review Perspectives

- **Source repo(s)**: purple-directive-violet
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Define structurally different review lenses rather than generic acceptance-criteria checking. Reviewers with different thinking styles (user impact, technical debt, security implications), risk orientations, and epistemic preferences surface more diverse issues.
- **Current gap**: cAgents reviewer evaluates uniformly against acceptance criteria. No structural differentiation in review perspectives.
- **Implementation notes**:
  - Define 2-3 review perspectives per domain: engineering (user impact, technical debt, security), creative (audience, craft quality, originality)
  - Assign perspective-specific prompts to reviewers
  - Each perspective focuses on different aspects of the same implementation
  - Aggregate findings across perspectives for comprehensive review

---

## Context Management

### 16. Character-Budgeted Context Injection

- **Source repo(s)**: Claude-Code-Workflow
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Enforce strict character limits on context injection: session-start <= 1500 chars, per-prompt attention injection <= 500 chars. Components are assembled within budgets to prevent context bloat as sessions grow complex.
- **Current gap**: cAgents attention-injection.cjs injects plan objectives but does not enforce character budgets. Session-catchup.cjs injects behavioral context without bounds. Both can bloat linearly with session complexity.
- **Implementation notes**:
  - Add `MAX_SESSION_START_CHARS = 1500` and `MAX_ATTENTION_CHARS = 500` constants to hook-utils.cjs
  - Truncate injected content to budget with priority ordering (mission > domain > controller > status)
  - Track injection sizes in metrics for tuning
  - Integrate with KV-cache optimization guidelines already in model-routing.md

### 17. Task-Aware Memory Weighting

- **Source repo(s)**: loki-mode
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Adjust memory/context injection based on current task type. Debugging tasks get more anti-patterns and error history. Implementation tasks get more patterns and reference implementations. Review tasks get more acceptance criteria and quality standards. Based on MemEvolve research showing 17% improvement over static weights.
- **Current gap**: cAgents attention-injection.cjs injects the same plan.yaml context regardless of what the agent is doing. No task-type-based memory adaptation.
- **Implementation notes**:
  - Extend attention-injection.cjs to detect task type from coordination_log.yaml work items
  - Define weight profiles: exploration (60% episodic, 30% semantic), implementation (50% semantic, 35% skills), debugging (40% episodic, 40% anti-patterns), review (50% semantic, 30% episodic)
  - Select relevant knowledge entries from `_knowledge/` based on weights
  - Inject task-appropriate context within character budget

### 18. Strategic Compaction Point Suggestions

- **Source repo(s)**: everything-claude-code
- **Priority**: P2 (medium)
- **Effort**: Low
- **Description**: Track tool call counts and suggest manual /compact at logical workflow boundaries (after research before execution, after debugging before next feature) rather than relying on arbitrary auto-compaction.
- **Current gap**: cAgents pre-compact-save.cjs saves state before compaction but does not proactively suggest optimal compaction points. Mid-task compaction can cause context loss.
- **Implementation notes**:
  - Add a tool call counter to attention-injection.cjs
  - At pipeline state transitions (PLANNED -> DECOMPOSED, COORDINATED -> VALIDATED), suggest compaction
  - Use a decision table mapping phase transitions to compact/no-compact recommendations
  - Integrate with pre-compact-save.cjs waypoint system

### 19. Mode-Based Observation Filtering

- **Source repo(s)**: claude-mem
- **Priority**: P3 (low)
- **Effort**: Medium
- **Description**: Filter what context gets injected based on the current domain/mode. Engineering mode loads code patterns; creative mode loads narrative patterns. Prevents irrelevant context from earlier domain work polluting current domain attention.
- **Current gap**: cAgents uses domain-based routing but does not filter context injection by domain. Switching between engineering and creative workflows can inject irrelevant context.
- **Implementation notes**:
  - Add domain tag to attention-injection.cjs context entries
  - Filter injected context by current session domain
  - When cross-domain references are needed (e.g., engineering context in a business session), load only the interface points

---

## Error Handling

### 20. Dead-Letter Queue for Failed Work Items

- **Source repo(s)**: loki-mode
- **Priority**: P0 (critical)
- **Effort**: Medium
- **Description**: After 3 reviewer rounds fail for a work item, move it to dead-letter status instead of blocking the entire pipeline. Controller continues with next work item in dependency order. Dead-letter items are reported as PARTIAL_PASS with remediation plan.
- **Current gap**: cAgents FAIL routing retries the entire controller phase (up to 5 cycles), then escalates to HITL, blocking the pipeline for all remaining work items. One failed item blocks everything.
- **Implementation notes**:
  1. After 3 reviewer rounds fail, mark work item as `dead_letter` in coordination_log.yaml
  2. Log failure reason, attempted fixes, and root cause analysis
  3. Controller continues with next independent work item
  4. Validator reports dead-letter items as `PARTIAL_PASS` with `dead_letter_items: [...]`
  5. User receives a summary of what completed and what was parked

### 21. Reflexion Error Learning Pattern

- **Source repo(s)**: SuperClaude_Framework
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Record errors in JSONL format with signature-based matching for cross-session reuse. When an error occurs, create an error signature (type + message + context), search solutions_learned.jsonl. Known solutions are applied immediately (0 tokens); new errors trigger investigation and recording.
- **Current gap**: cAgents has `_knowledge/calibration/` and `_knowledge/learnings/` directories but no structured error learning system. The same errors trigger the same investigation process every time.
- **Implementation notes**:
  - Create `Agent_Memory/_knowledge/solutions_learned.jsonl` (append-only)
  - When reviewer or validator reports REVISE/FAIL, record: error_signature, root_cause, fix_applied, prevention_checklist
  - Universal-self-correct agent checks this file before attempting recovery
  - Over time, common errors get instant resolution instead of full revision cycles

### 22. Failure Mode Taxonomy (MAST)

- **Source repo(s)**: purple-directive-violet
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Systematic taxonomy of multi-agent failure modes across four categories: Specification (scope drift, loops, context loss), Inter-Agent (context reset, ambiguity, derailment), Verification (premature termination, incomplete verification), Systemic (groupthink, error propagation, budget burn). Each mode has symptoms and detection triggers.
- **Current gap**: cAgents documents some failure modes in troubleshooting but lacks a systematic taxonomy. No automated detection of specific failure patterns.
- **Implementation notes**:
  - Document the taxonomy in `.claude/rules/quality/failure-modes.md`
  - Add symptom detection to tool-failure-tracker.cjs (e.g., detect repeated identical tool calls = loop, detect increasing error rate = error propagation)
  - Add detection triggers to attention-injection.cjs (e.g., detect context rot by comparing plan objectives to recent actions)
  - Enable proactive self-correction before validator catches the issue

### 23. Automatic CI Failure Recovery

- **Source repo(s)**: continuous-claude
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: When validation fails with concrete test/build errors, fetch actual failure logs (via `gh run view --log-failed` or test runner output), extract the specific error, and create targeted fix instructions rather than re-running the entire controller phase.
- **Current gap**: cAgents FAIL routing re-runs the entire controller phase. No surgical fix capability that targets the specific test/build failure.
- **Implementation notes**:
  - After FAIL validation, parse validation_report.yaml for concrete error information
  - If errors are from test/build output: extract exact failure messages
  - Route to executor with specific fix instructions (not full work item re-execution)
  - Track fix success rate to measure improvement over generic retry

### 24. Multi-Validator Consensus

- **Source repo(s)**: continuous-claude, loki-mode
- **Priority**: P3 (low)
- **Effort**: Medium
- **Description**: Instead of a single universal-validator, spawn 2-3 independent validators and require majority agreement for PASS. Prevents single-validator overconfidence from prematurely marking work as complete.
- **Current gap**: cAgents uses a single universal-validator for PASS/FAIL/REVISE decisions. No consensus mechanism.
- **Implementation notes**:
  - For tier 3+ workflows, spawn 2-3 independent validators
  - Each validator receives the same inputs but operates independently
  - PASS requires majority agreement (2/3 or 3/3)
  - Disagreement triggers Devil's Advocate review on the disagreed items
  - Cost increase is bounded (3x validator cost, which is small relative to total pipeline cost)

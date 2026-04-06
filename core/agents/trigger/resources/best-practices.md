# Best Practices: Trigger

> Design principles, patterns, and frameworks that guide high-quality pipeline entry, domain detection, intent classification, and workflow initialization.

## Design Principles

- **Always Expand, Never Handle**: The trigger routes every request to specialist agents via the orchestrator — it never answers questions, writes code, or generates content itself; the user chose `/run` specifically for agent orchestration
- **Confidence-Scored Detection**: Every domain and intent classification carries a confidence score (0.0-1.0) — low-confidence detections trigger explicit thresholds and may surface disambiguation
- **Multi-Signal Domain Detection**: Use keyword signals, project structure analysis, git history, and framework detection together — single-signal detection is fragile; multi-signal detection is robust
- **Minimum Tier 2 Enforcement**: All requests are tier 2 or higher — even "fix a typo" benefits from specialist review; tier 0 and 1 are deprecated and auto-upgraded
- **Pre-flight Before Delegation**: Validate feasibility, resource availability, and conflict absence before spawning the orchestrator — catch problems at the entry point, not mid-execution
- **Session Files First**: Create status.yaml before spawning any subagent — the SubagentStart hook requires status.yaml to track agents; missing it causes silent audit trail failures
- **Team Planning Only Mode**: When invoked by /team with `mode: team_planning_only`, execute routing and planning then stop — team-trigger takes over for execution

## Key Patterns & Frameworks

- **3-Method Domain Detection**: Method 1 (keyword matching): score request text against domain keyword lists; Method 2 (project context): read project structure, dependencies, and git history; Method 3 (framework detection): identify Next.js, React, Django, FastAPI, etc. — combine all three with weighted averaging
- **4-Level Pre-flight Validation**: Level 1 (context): Is the request understandable? Level 2 (feasibility): Can agents accomplish this? Level 3 (resources): Are required files, APIs, or tools available? Level 4 (conflicts): Are there conflicting active sessions or locked resources?
- **Intent Classification**: Classify the request as bug-fix, feature-addition, question, refactor, audit, migration, or custom — intent drives decomposition patterns and controller selection
- **Workflow Template Matching**: Compare the request against a catalog of common workflow templates (e.g., "fix-bug", "add-feature", "add-auth", "api-integration") — template matches accelerate the planning phase by providing pre-defined decomposition starting points
- **Session Initialization Order**: Create session directory → write instruction.yaml → write status.yaml (phase: routing) → create workflow/ directory → THEN spawn orchestrator — this exact order ensures all hooks can find the session from the first subagent spawn
- **Tier Override Protection**: Even if flags or the request specifies `--tier 0` or `--tier 1`, the trigger enforces a minimum of tier 2 — no exceptions, no user overrides
- **Parent Session Linkage**: When spawned from within a team context (a teammate's /run call), extract the `Parent-Session` from the delegation prompt and write it to instruction.yaml — enables session traceability across team/child session boundaries
- **Qualifier-Based Disambiguation**: Before applying fallback strategies, check whether the ambiguous keyword has qualifying context words within 5 words — qualifiers resolve conflicts deterministically without requiring user input; see `domain-detection.md#qualifier-based-disambiguation` for the full qualifier table covering 8 high-conflict keywords (review, design, write, analyze, plan, manage, pipeline, test)
- **Confidence Threshold Routing**: If domain detection confidence < 0.5, apply the multi-signal fallback strategy: (1) expanded keyword scan across all domain_overrides.yaml router_keywords, (2) capability matching against agent descriptions, (3) user disambiguation with top 3 candidates — never default to a specific domain without exhausting signal-based strategies first
- **Analytics Tracking**: Write a workflow_metrics.jsonl entry for each invocation — captures domain, tier, intent, and template match — enables system-level optimization over time

## Domain Concepts & Terminology

### Detection Signals
- **Keyword Signal**: Words in the request that match a domain's vocabulary — "API", "database", "bug" for engineering; "campaign", "funnel", "conversion" for growth
- **Project Context Signal**: Files, dependencies, and directory structure that indicate the domain — `package.json` with React → engineering; `pyproject.toml` with pytest → engineering; `Dockerfile` → devops
- **Framework Signal**: Detected frameworks inform both domain and constraints — Next.js → engineering + TypeScript/React patterns; Django → engineering + Python patterns
- **Git History Signal**: Recent commits and changed files indicate active work areas — recent changes to `src/auth/` suggest the auth module is relevant
- **Confidence Score**: A 0.0-1.0 value expressing certainty about the detection — below 0.5 triggers fallback handling

### Intent Types
- **Bug Fix**: Address a defect in existing behavior — maps to tier 2, focused decomposition
- **Feature Addition**: Add new capabilities to existing systems — maps to tier 2-3 depending on scope
- **Question**: Answer a question about code, design, or domain — maps to tier 2, research-heavy decomposition
- **Refactor**: Restructure existing code without changing behavior — maps to tier 2-3
- **Audit**: Review existing code or content for issues — maps to tier 2-3
- **Migration**: Move from one technology or structure to another — maps to tier 3-4

### Session Files
- **instruction.yaml**: The canonical request record — includes user request, domain, tier, intent, flags, parent_session (if applicable), and template match
- **status.yaml**: Current pipeline phase — must be written before any subagent is spawned for hook compatibility
- **workflow/**: Directory for all downstream artifacts (enriched_context.yaml, plan.yaml, decomposition.yaml, etc.)
- **workflow_metrics.jsonl**: Append-only analytics log — one JSON line per invocation

### Validation Levels
- **Context Validation**: Is the request parseable and does it have enough information to route?
- **Feasibility Validation**: Can the detected domain agents accomplish this type of request?
- **Resource Validation**: Are the files, APIs, or tools the request requires accessible?
- **Conflict Validation**: Are there other active sessions with overlapping scope that could cause conflicts?

## Anti-Patterns to Avoid

- **Self-Handling**: Answering a question or fixing a bug directly instead of routing to the orchestrator — this defeats the entire purpose of /run and removes specialist quality assurance
- **Tier 1 Requests**: Attempting to process requests without controller coordination because they seem "too simple" — minimum tier 2 exists because every request benefits from specialist expertise and review
- **Missing status.yaml**: Spawning the orchestrator before writing status.yaml — the SubagentStart hook cannot locate the session and the agent audit trail breaks silently
- **Single-Signal Detection**: Routing based on keyword matching alone without checking project structure or framework — a request mentioning "API" in a creative writing project is not an engineering request
- **Skipping Pre-flight**: Delegating to the orchestrator without validating feasibility or resource availability — problems that could be caught at entry point become expensive mid-execution failures
- **Missing Parent Session Linkage**: When invoked from a team context, not writing the parent session to instruction.yaml — child sessions become orphaned in the audit trail
- **Low-Confidence Routing**: Committing to a domain detection with confidence < 0.5 without applying fallback strategies — downstream agents receive incorrect domain context and plan incorrectly

## Quality Indicators

- **Domain Detection Accuracy**: Percentage of detections that downstream agents confirm were correct (measured against coordination_log domain field) — target >95%
- **Intent Classification Accuracy**: Percentage of intents that match the work items actually produced — measures how well classification drives decomposition
- **Pre-flight Catch Rate**: Percentage of requests with feasibility or resource issues caught at pre-flight vs. mid-execution — higher pre-flight catch = fewer expensive mid-run failures
- **Template Match Rate**: Percentage of requests that match a workflow template — template matches accelerate planning; low rates indicate template catalog gaps
- **Session File Completeness**: Percentage of sessions where status.yaml exists before the first subagent spawns — target 100%
- **Minimum Tier Compliance**: Percentage of requests routed at tier 2 or above — target 100%

## Collaboration Touchpoints

- **With orchestrator**: Trigger is orchestrator's sole spawner in the standard pipeline — after creating session files and validating the request, trigger spawns orchestrator via Agent tool with session path and request context
- **With team-trigger**: In `/run --team` mode, trigger routes to team-trigger instead of orchestrator after pre-flight validation — team-trigger handles TeamCreate and parallel execution
- **With universal-router**: Router is the first agent orchestrator spawns — router's tier classification and domain confirmation are informed by trigger's initial detection; they should agree on domain and tier
- **With hooks (subagent-tracker.cjs)**: The SubagentStart hook reads status.yaml to find the active session when the orchestrator spawns — trigger's session file creation order is a hard dependency for the audit trail to work correctly

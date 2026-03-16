# Domain-Specific Improvements

Improvements targeted at specific cAgents domains and cross-domain capabilities.

---

## Table of Contents

- [Engineering Domain](#engineering-domain)
- [Creative Domain](#creative-domain)
- [Business Domain](#business-domain)
- [People Domain](#people-domain)
- [Service Domain](#service-domain)
- [Cross-Domain Improvements](#cross-domain-improvements)

---

## Engineering Domain

### 1. Search-First Research Phase

- **Source repo(s)**: everything-claude-code
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: A systematized "search before implement" pattern using a research agent that runs parallel searches across npm/PyPI, MCP servers, existing codebase, and GitHub. Returns structured comparison with adopt/extend/build recommendation. Prevents reinventing existing solutions.
- **Current gap**: cAgents orchestrator performs context enrichment but does not include a systematic "search for existing solutions" step. Engineering execution agents may implement functionality that already exists in the codebase or as an npm package.
- **Implementation notes**:
  - Add research phase to orchestrator enrichment (for engineering domain only)
  - Before planning, search: (1) existing codebase for similar patterns, (2) package registries for existing solutions, (3) project documentation for architectural constraints
  - Output: `enriched_context.yaml` includes `existing_solutions: [{name, type: adopt|extend|build, rationale}]`
  - Planner uses this to avoid unnecessary work items

### 2. Auto-Format and Type-Check After Edit

- **Source repo(s)**: everything-claude-code
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: PostToolUse hook for Write/Edit that auto-detects Biome, Prettier, or ESLint and formats JS/TS/TSX files after every edit. Companion check runs `tsc --noEmit` after TypeScript edits. A third check warns about `console.log` in production code.
- **Current gap**: cAgents post-write-validator.cjs validates JSON/YAML syntax but does not run formatters or type-checkers on edited code files. Formatting errors and type errors compound if not caught per-edit.
- **Implementation notes**:
  - Extend post-write-validator.cjs or create separate `post-edit-format.cjs`
  - Detection: check for `biome.json`, `.prettierrc`, `tsconfig.json` in project root
  - On `.js`/`.ts`/`.tsx` edit: run detected formatter, report if changes needed
  - On `.ts`/`.tsx` edit: run `tsc --noEmit --pretty`, inject errors as systemMessage
  - Keep under 3-second timeout

### 3. Playwright Testing Integration

- **Source repo(s)**: awesome-claude-skills
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Bundle Playwright testing capabilities for web application testing. Includes a `with_server.py` helper for server lifecycle management, a decision tree for choosing testing approach (static HTML vs dynamic webapp), and a "reconnaissance-then-action" pattern (screenshot/inspect DOM first, then act).
- **Current gap**: cAgents qa-tester agent operates at an abstract level without concrete testing scripts. Cannot actually run browser-based tests or verify UI rendering.
- **Implementation notes**:
  - Add Playwright reference files to qa-tester SKILL.md references/ directory
  - Include: test pattern templates, server lifecycle management, screenshot-based verification
  - qa-tester loads these references only when web testing is needed (progressive disclosure)
  - Engineering controller assigns web testing work items to qa-tester with Playwright flag

### 4. Incident Response Workflow

- **Source repo(s)**: commands (wshobson)
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: A dedicated incident response workflow with phases: (1) diagnostics (gather logs, reproduce), (2) root cause analysis (hypothesis generation, evidence collection), (3) hotfix development (minimal fix, test), (4) deployment verification, (5) post-mortem documentation. Specialized for production emergencies where speed matters.
- **Current gap**: cAgents has no dedicated incident response workflow. When users submit bug fix requests, the standard /run pipeline treats them like feature requests with full planning and decomposition, which is too slow for production incidents.
- **Implementation notes**:
  - Add an `incident-response` agent or skill to the engineering or service domain
  - Fast-path: skip decomposition for single-cause incidents (detected by tier 2 classification)
  - Include log analysis, hypothesis-driven debugging (generate N hypotheses, investigate in parallel)
  - Post-mortem template generates CORRECTIONS.md entries for institutional learning

### 5. Framework-Idiom Awareness

- **Source repo(s)**: claude-skills, ui-ux-pro-max-skill
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Engineering execution agents should provide framework-specific guidance rather than generic patterns. When a project uses React, the frontend-developer should recommend React-idiomatic patterns (hooks, context) rather than generic component patterns. Knowledge stored as CSV or YAML databases with Do/Don't/Good Code/Bad Code columns per framework.
- **Current gap**: cAgents engineering agents provide general guidance without framework-specific best practices. A backend-developer agent gives the same advice whether the project uses Django, Rails, Express, or FastAPI.
- **Implementation notes**:
  - Create framework-specific reference files in execution agent `references/` directories
  - backend-developer: `references/django.md`, `references/express.md`, `references/fastapi.md`
  - frontend-developer: `references/react.md`, `references/vue.md`, `references/svelte.md`
  - Load the appropriate reference based on detected tech stack (from enriched_context.yaml)
  - Include Do/Don't patterns specific to each framework

### 6. Hypothesis-Driven Debugging

- **Source repo(s)**: agents (wshobson)
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: For bug fix requests, generate N competing hypotheses for the root cause, spawn independent investigators for each, collect evidence, and present the most likely root cause with a fix. This parallel investigation pattern is more structured than sequential debugging.
- **Current gap**: cAgents treats bug fixes as standard engineering tasks without a debugging-specific decomposition pattern. No parallel hypothesis investigation.
- **Implementation notes**:
  - Engineering controller detects debugging intent ("fix bug", "debug", "investigate error")
  - Generates 2-4 hypotheses based on error description and codebase context
  - Spawns independent investigators (using business-researcher or backend-developer)
  - Each investigator reports: hypothesis, evidence for/against, confidence level
  - Controller selects highest-confidence hypothesis and routes fix to appropriate executor

---

## Creative Domain

### 7. Adaptive Quality Modes

- **Source repo(s)**: Claude-Code-Novel-Writer
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Four quality modes (Excellence/Standard/Quality Focus/High Performance) that dynamically adjust creative standards based on real-time quality metrics. The system automatically downgrades from perfection-seeking to progress-oriented when quality is good, and escalates to revision mode when quality drops below thresholds.
- **Current gap**: cAgents universal-validator provides binary PASS/FAIL/REVISE. No adaptive quality modes that adjust validation stringency based on accumulated quality scores within a session.
- **Implementation notes**:
  - Add quality mode tracking to creative domain coordination
  - Define quality metrics per creative task type: dialogue ratio, sensory density, paragraph length, readability score
  - Mode switching: if quality > 90% threshold for 3 consecutive items, switch to faster mode; if quality < 70%, switch to revision mode
  - Store current quality mode in coordination_log.yaml
  - Controllers adjust acceptance criteria stringency based on mode

### 8. State Synchronization for Long-Running Creative Work

- **Source repo(s)**: Claude-Code-Novel-Writer
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Automated reconciliation between tracked state (coordination_log.yaml, work item status) and actual filesystem state (generated content files). Detects discrepancies and auto-repairs. Uses content-based heuristics (word count thresholds) to classify completion status.
- **Current gap**: cAgents relies on YAML state files but has no automated reconciliation with actual filesystem state. After crashes or context compaction, tracked state may diverge from reality.
- **Implementation notes**:
  - Add a state-sync check to session-catchup.cjs (SessionStart hook)
  - For each work item marked "completed" in coordination_log, verify the output file exists and has expected content
  - For each output file found, verify a corresponding completed work item exists
  - Auto-repair discrepancies: update status to match filesystem, create backups before sync
  - Particularly important for creative workflows that produce long-form content

### 9. Domain-Specific Quality Hooks for Creative Content

- **Source repo(s)**: Claude-Code-Novel-Writer
- **Priority**: P3 (low)
- **Effort**: Medium
- **Description**: PostToolUse hooks that perform quantitative quality analysis on written creative content (readability scores, tone consistency, length targets, dialogue ratio, sensory density) and feed results back into the orchestration loop via context injection.
- **Current gap**: cAgents post-write-validator.cjs validates file syntax but does not perform domain-specific quality analysis on creative content. No automated creative quality metrics.
- **Implementation notes**:
  - Create `post-write-creative-quality.cjs` hook for creative domain sessions
  - Trigger on Write to files in creative output directories
  - Compute: word count, sentence length distribution, readability score (Flesch-Kincaid), paragraph count
  - Inject results via systemMessage for the controller to consume
  - Feed metrics into adaptive quality mode system (#7)

---

## Business Domain

### 10. SaaS Integration via MCP

- **Source repo(s)**: awesome-claude-skills, marketingskills
- **Priority**: P2 (medium)
- **Effort**: High
- **Description**: Optional MCP integration for common business tools: Jira (project tracking), Slack (communication), GitHub Issues (task management), Google Sheets (data), Mailchimp (email campaigns). Makes business domain agents actionable rather than advisory.
- **Current gap**: cAgents business domain agents (69 agents) produce analysis, plans, and recommendations but cannot take real external actions. The campaign-manager cannot actually create campaigns; the operations-manager cannot actually update project tracking tools.
- **Implementation notes**:
  - Add optional MCP dependency declarations to business domain agents
  - Start with GitHub Issues integration (already partially supported via gh CLI)
  - Document MCP configuration pattern in `docs/MCP_INTEGRATION.md`
  - Business agents detect available MCP tools and use them when present; fall back to recommendations when not
  - This is a strategic decision -- adds external dependency but dramatically increases utility

### 11. PRD Pipeline for Complex Projects

- **Source repo(s)**: ccpm, oh-my-claudecode
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: A formal Product Requirements Document pipeline: brainstorm -> document (executive summary, problem statement, user stories, requirements, success criteria, constraints, out-of-scope, dependencies) -> decompose -> track. Every task traces back to the PRD.
- **Current gap**: cAgents jumps from user request to orchestration. There is no formal requirements gathering phase. For tier 3+ work, the planner creates objectives from a brief user request, missing out-of-scope items, constraints, and dependencies that a structured PRD would capture.
- **Implementation notes**:
  - Add optional PRD phase between orchestration and planning for tier 3+ requests
  - Create `/prd` skill or integrate into orchestrator for complex requests
  - PRD document persists in session directory as `workflow/prd.md`
  - Planner reads PRD for objectives, constraints, and out-of-scope items
  - Decomposer uses PRD user stories as decomposition seeds

### 12. Shared Product Context Document

- **Source repo(s)**: marketingskills
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: A foundational `project-context.md` file that all business domain agents read before operating. Contains brand voice, target audience, competitive landscape, customer language, and objection handling. Created once via guided questionnaire, updated periodically.
- **Current gap**: cAgents has no standardized project context file. The orchestrator enriches context per-session from scratch. Business domain agents lack persistent project knowledge (brand voice, audience, competitive positioning).
- **Implementation notes**:
  - Create `/context` skill that generates `Agent_Memory/_projects/{project}/project-context.md`
  - Sections: Project Overview, Target Audience, Brand Voice, Competitive Landscape, Tech Stack, Constraints, Success Metrics
  - Orchestrator reads this file during enrichment (before creating enriched_context.yaml)
  - Users update via `/context update` (interactive) or direct file editing
  - Also benefits engineering and creative domains (tech stack, coding standards)

### 13. Bidirectional GitHub Issues Sync

- **Source repo(s)**: ccpm
- **Priority**: P3 (low)
- **Effort**: High
- **Description**: Bidirectional sync between cAgents work items and GitHub Issues. Work items created during decomposition are pushed as GitHub Issues with labels (epic, task, priority). Progress updates post as issue comments. GitHub Issues can be imported into cAgents for execution.
- **Current gap**: cAgents has no external project management integration. For teams using cAgents for real projects, non-cAgents team members have no visibility into agent work.
- **Implementation notes**:
  - Add `/pm:sync` skill using `gh` CLI for GitHub Issues interaction
  - Map: work_items.yaml -> GitHub Issues with labels
  - Map: coordination_log.yaml status updates -> GitHub Issue comments
  - Support `/pm:import` to bring existing GitHub Issues into cAgents decomposition
  - Local-first: all management works with local files; GitHub sync is optional

---

## People Domain

### 14. Team Presets for Common Workflows

- **Source repo(s)**: agents (wshobson)
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Pre-configured team compositions for common workflows: review-team (code-reviewer + security-specialist + qa-tester), debug-team (architect + backend-developer + qa-tester), feature-team (architect + backend-developer + frontend-developer + qa-tester), security-team (security-specialist + penetration-tester + compliance auditor). Each preset configures wave count, agent selection, and coordination protocol.
- **Current gap**: cAgents /team supports N-wave parallel execution but does not have pre-configured team presets. Users must understand the wave decomposition model to use /team effectively. This creates a high barrier to entry.
- **Implementation notes**:
  - Add `--preset` flag to /team: `/team --preset review`, `/team --preset debug`
  - Define presets in `Agent_Memory/_system/commands/team/presets.yaml`
  - Each preset specifies: agents, wave count, coordination protocol, file ownership rules
  - Presets encode best practices for team sizing and composition
  - Users can still use free-form /team for custom compositions

### 15. Role-Based Hiring Patterns

- **Source repo(s)**: agents (wshobson), awesome-claude-code-subagents (VoltAgent)
- **Priority**: P3 (low)
- **Effort**: Low
- **Description**: Checklist-driven agent definitions with measurable targets for hiring-related tasks. Each HR agent includes performance criteria (e.g., time-to-hire, quality-of-hire metrics), structured interview frameworks, and competency matrices.
- **Current gap**: cAgents people domain agents (19 agents) have general SKILL.md files but no structured hiring frameworks, interview templates, or measurable performance targets embedded in agent definitions.
- **Implementation notes**:
  - Add reference files to people domain agents: `references/interview-frameworks.md`, `references/competency-matrices.md`
  - Include measurable targets in agent frontmatter (aspirational, used by controllers for delegation decisions)
  - talent-acquisition-manager should have structured hiring workflow: source -> screen -> interview -> evaluate -> offer

---

## Service Domain

### 16. Support Workflow Enhancements

- **Source repo(s)**: oh-my-claudecode, commands (wshobson)
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Enhanced customer support workflows with: defect-type routing (route different issue types to specialized agents), watchdog for stuck tasks (5-minute check, 10-minute dead worker detection with reassignment), and escalation chains with explicit handoff criteria.
- **Current gap**: cAgents service domain has customer support agents but no production incident management flow, no stuck-task watchdog, and no defect-type-specific routing.
- **Implementation notes**:
  - Add defect-type field to service domain work items: billing, technical, account, feature-request
  - Route to appropriate specialist: billing issues -> finance/billing agents, technical -> engineering agents
  - Add watchdog logic to teammate-idle-handler.cjs (for team mode): if task in-progress > 5 min without messages, check status; > 10 min, reassign
  - Define escalation chains in service domain config: L1 (chatbot) -> L2 (specialist) -> L3 (controller) -> L4 (human)

### 17. Compliance Automation

- **Source repo(s)**: loki-mode, purple-directive-violet
- **Priority**: P3 (low)
- **Effort**: Medium
- **Description**: Automated compliance checking against frameworks (SOC2, GDPR, HIPAA). The compliance-director and legal-counsel agents use structured checklists with evidence requirements. Audit trail generation from coordination_log.yaml entries with timestamps and agent signatures.
- **Current gap**: cAgents service domain has compliance-director and legal-counsel agents but no automated compliance checking framework. Compliance work is treated as generic advisory tasks.
- **Implementation notes**:
  - Add compliance framework reference files to compliance-director: `references/soc2-checklist.md`, `references/gdpr-checklist.md`
  - Each checklist item maps to an evidence type (file_exists, config_check, test_result)
  - Compliance-director generates audit-ready reports from coordination_log.yaml
  - Audit trail includes: timestamp, agent name, action taken, evidence reference

---

## Cross-Domain Improvements

### 18. Searchable Agent/Capability Knowledge Base

- **Source repo(s)**: ui-ux-pro-max-skill
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: A searchable index of all 213 agents with capabilities, trigger patterns, domain keywords, and typical use cases. Uses BM25 search (lightweight, zero-dependency pure Python or Node.js) for retrieval. Domain auto-detection matches queries to the right agents based on keyword matching.
- **Current gap**: cAgents uses YAML configs for domain knowledge and router keywords in domain_overrides.yaml for agent routing. These are readable but not searchable. Controller selection relies on keyword matching in planner configs rather than capability-based search.
- **Implementation notes**:
  - Generate `Agent_Memory/_system/agent_catalog.csv` from all SKILL.md frontmatter
  - Columns: name, tier, domain, description, trigger_keywords, related_agents, typical_questions
  - Build lightweight BM25 search in Node.js (or reuse existing CSV inventory pattern)
  - Orchestrator and planner use search to find best-match agents for ambiguous requests
  - Update catalog via `scripts/generate-catalog.sh` (run in CI)

### 19. Industry-Specific Reasoning Rules

- **Source repo(s)**: ui-ux-pro-max-skill
- **Priority**: P2 (medium)
- **Effort**: High
- **Description**: 100+ rules mapping industry categories to specific recommendations, stored as CSV rows. Each rule includes positive recommendations AND anti-patterns. A reasoning engine applies matching rules to generate contextual guidance.
- **Current gap**: cAgents router keywords in domain_overrides.yaml are simple keyword matches without reasoning rules or anti-patterns. No industry-specific guidance.
- **Implementation notes**:
  - Create `Agent_Memory/_system/reasoning_rules.csv` with columns: industry, recommendation, anti_pattern, priority, confidence
  - Orchestrator loads matching rules during enrichment
  - Rules are domain-aware: engineering rules for tech industries, creative rules for media industries
  - Anti-patterns are as valuable as recommendations -- "what NOT to do" prevents common mistakes

### 20. Continuous Loop Execution Mode

- **Source repo(s)**: continuous-claude
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Run the /run pipeline in a loop with file-based handoffs between iterations. Each iteration creates a branch, executes, validates, and merges (or discards). Uses a completion signal consensus (N consecutive completion signals) to prevent premature termination. Supports budget limits (max cost, max duration, max iterations).
- **Current gap**: cAgents /run pipeline executes once and stops. There is no built-in mechanism for multi-session continuation. Large-scale tasks (codebase refactoring, test coverage improvement) require manual re-invocation.
- **Implementation notes**:
  - Add `--loop` flag to /run skill
  - After COMPLETE, check if objective is fully met (via completion signal)
  - If not fully met: start new session inheriting progress.md and findings.md from previous session
  - Termination conditions: budget exhaustion, duration limit, N consecutive completion signals
  - Each iteration is idempotent (creates branch, validates, merges or discards)

### 21. UserPromptSubmit Pre-Routing Hook

- **Source repo(s)**: claude-scholar, Claude-Code-Workflow
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: A UserPromptSubmit hook that pattern-matches domain keywords in user input before orchestration begins. Provides early routing hints as systemMessage, reducing the tokens the orchestrator spends on full routing analysis. Supports natural-language mode keywords ("quick" for tier 2 fast path, "deep" for tier 4, "team" for /team mode).
- **Current gap**: cAgents routing happens inside the orchestrator agent, which must read the full request, domain configs, and planner configs. There is no pre-routing hint. Users must know slash command syntax.
- **Implementation notes**:
  - Create `pre-route.cjs` hook for UserPromptSubmit event
  - Pattern match against domain_overrides.yaml keywords
  - Inject systemMessage: "Likely domain: engineering. Likely tier: 2. Suggested: /run"
  - Support mode keywords: "quick" -> tier 2 fast path, "deep" -> tier 4, "team" -> /team
  - Non-blocking: hints only, orchestrator makes final decision

### 22. Plan-Only / Dry-Run Mode

- **Source repo(s)**: memory-bank-mcp
- **Priority**: P2 (medium)
- **Effort**: Low
- **Description**: A `--dry-run` or `--plan-only` flag for /run that stops after the planning phase (before controller coordination). Users can preview: which domain was detected, which controller was selected, what work items were decomposed, what the estimated token cost would be. No execution happens.
- **Current gap**: cAgents pipeline is always full-execution. There is no lightweight "plan only" mode. Users must run the full pipeline to see what would happen, wasting tokens if the plan is wrong.
- **Implementation notes**:
  - Add `--dry-run` flag to /run SKILL.md
  - Stop after DECOMPOSED state (or optionally after PROMPTS_READY for delegation preview)
  - Display: domain, tier, controller, work items with acceptance criteria, estimated agents, estimated token cost
  - User can then: proceed with `/run --resume {session_id}` or adjust and re-run
  - Already partially supported by /org `--dry-run` flag for routing preview

### 23. Agent Persona Enhancement

- **Source repo(s)**: BMAD-METHOD
- **Priority**: P3 (low)
- **Effort**: Low
- **Description**: Add named personas and communication styles to key controller agents. Each controller has a distinctive communication style that makes coordination logs more readable when multiple agents contribute. Not heavy personality profiles, but light communication style indicators.
- **Current gap**: cAgents agents have tier/domain metadata but no communication style guidance. All controller output reads the same way, making coordination logs harder to parse when multiple controllers are involved.
- **Implementation notes**:
  - Add `communication_style:` field to controller SKILL.md frontmatter
  - Examples: engineering-manager: "direct, action-oriented, uses bullet points", narrative-director: "descriptive, story-focused, uses narrative framing"
  - Keep lightweight (1-2 lines, not full personality profiles)
  - Improves readability of coordination_log.yaml synthesis sections

### 24. User Skill Level Adaptation

- **Source repo(s)**: BMAD-METHOD
- **Priority**: P3 (low)
- **Effort**: Low
- **Description**: A `user_skill_level` setting (beginner/intermediate/expert) that affects controller synthesis verbosity and execution agent output detail. Expert users get terse technical output; beginners get verbose explanations with rationale.
- **Current gap**: cAgents has no concept of user skill level. All agents communicate the same way regardless of audience. Expert users receive unnecessary explanations; beginners receive terse technical output.
- **Implementation notes**:
  - Add `user_skill_level: intermediate` to `CLAUDE.local.md` or `settings.json`
  - Controllers read this during synthesis: beginner -> explain rationale, intermediate -> standard, expert -> terse
  - Execution agents adjust output detail: beginner -> include examples, expert -> code only
  - Orchestrator injects skill level into enriched_context.yaml for downstream agents

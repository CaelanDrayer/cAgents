# Developer Experience Improvements

Improvements to agent creation, plugin distribution, tooling, documentation, and observability for cAgents developers and users.

---

## Table of Contents

- [Agent Creation and Management](#agent-creation-and-management)
- [Plugin Distribution](#plugin-distribution)
- [Tooling](#tooling)
- [Documentation](#documentation)
- [Observability](#observability)

---

## Agent Creation and Management

### 1. Skill/Agent Creator Meta-Skill

- **Source repo(s)**: awesome-claude-skills, claude-scholar
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: A `/create-agent` skill that guides users through creating new agents interactively. Provides a 6-step process: (1) understand requirements with examples, (2) plan reusable components, (3) scaffold via init script, (4) edit SKILL.md with best practices, (5) validate and package, (6) auto-register in plugin.json. Includes validation that frontmatter is complete (tier, domain, name) and that the agent follows cAgents conventions.
- **Current gap**: cAgents has `scripts/init_agent.js` for scaffolding but no interactive meta-skill. Creating an agent requires reading documentation, manually editing multiple files, and understanding the plugin manifest structure. The barrier to extending cAgents is higher than necessary.
- **Implementation notes**:
  - Create `.claude/skills/create-agent/SKILL.md` with guided workflow
  - Include template SKILL.md with all required frontmatter fields pre-populated
  - Auto-register in both domain `plugin.json` and root `plugin.json`
  - Validate output against the same rules as `validate-agents.sh`
  - Include best-practice examples for controller vs execution vs support agents

### 2. Self-Improving Agent Definitions

- **Source repo(s)**: claude-scholar
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: A quality assessment + automated improvement pipeline for agent SKILL.md files. Score on 4 dimensions: description quality (25%, trigger-only format, appropriate length), content organization (30%, clear sections, progressive disclosure), writing style (20%, concise, actionable), structural integrity (25%, valid frontmatter, cross-references resolve). Generate improvement suggestions and optionally auto-apply them.
- **Current gap**: cAgents agent SKILL.md files are static -- written once and manually maintained. Quality varies significantly across domains. The creative domain was overhauled in v10.3.0 but other domains have not received similar treatment.
- **Implementation notes**:
  - Create a `/lint-agents` skill that scores all agents in a domain
  - Use the 4-dimension scoring rubric from claude-scholar
  - Generate a report with per-agent scores and improvement suggestions
  - Optionally apply improvements via Edit tool (with user confirmation)
  - Run as part of CI to prevent quality regression

### 3. Single Source of Truth for Agent Metadata

- **Source repo(s)**: awesome-claude-code (hesreallyhim), claude-skills
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: Generate all `plugin.json` files from SKILL.md frontmatter as the single source of truth. A `scripts/generate-manifests.sh` reads every SKILL.md file, extracts frontmatter (name, tier, domain, description), and generates the root and domain `plugin.json` files. Adding or modifying an agent requires editing only the SKILL.md file.
- **Current gap**: cAgents agent metadata is spread across SKILL.md frontmatter, domain `plugin.json` files, root `plugin.json`, and `domain_overrides.yaml`. No single source of truth. Adding or modifying an agent requires touching 3-4 files. This is documented in MEMORY.md as a known pain point (10 files must stay in sync for version changes).
- **Implementation notes**:
  - SKILL.md frontmatter becomes the canonical source for: name, tier, domain, description, model, tools
  - `scripts/generate-manifests.sh` generates: root `.claude-plugin/plugin.json`, each domain's `.claude-plugin/plugin.json`, agent count in CLAUDE.md
  - Run as pre-commit hook or CI check
  - This eliminates the "10 files must stay in sync" problem documented in MEMORY.md

### 4. Tool Permissions in Agent Frontmatter

- **Source repo(s)**: awesome-claude-code-subagents (VoltAgent), agents (wshobson)
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Add explicit `tools` field to all 213 agent SKILL.md frontmatter files, specifying which Claude Code tools each agent can access. Controllers get `[Read, Glob, Grep, Bash]` (no Edit/Write). Execution agents get the full set. Support agents get `[Read, Grep, Glob, WebFetch, WebSearch]`. This enforces the "controllers never do direct work" rule at the platform level.
- **Current gap**: All 213 agents have unrestricted tool access. The "controllers NEVER do direct work" rule is documented in controllers.md but not enforced at the platform level. Controllers can technically use Edit/Write.
- **Implementation notes**:
  - Define tool permission profiles: `controller_tools`, `execution_tools`, `support_tools`, `readonly_tools`
  - Add `tools:` field to SKILL.md frontmatter for all agents
  - Controllers: `[Read, Glob, Grep, Bash, TaskCreate, TaskUpdate, TaskList, TaskGet]`
  - Execution agents: `[Read, Write, Edit, Glob, Grep, Bash, WebFetch, WebSearch]`
  - Claude Code enforces tool restrictions from frontmatter automatically
  - This is a structural enforcement of an existing rule, not a new rule

### 5. Related-Agents Cross-References in Frontmatter

- **Source repo(s)**: claude-skills, marketingskills
- **Priority**: P2 (medium)
- **Effort**: Low
- **Description**: Add `related-agents` and `scope-boundaries` fields to SKILL.md frontmatter. Related-agents lists other agents that work well together. Scope-boundaries defines "Not My Scope" with references to the correct agent (e.g., "For signup flows, see signup-flow-specialist"). Validate that all cross-references resolve to real agents in CI.
- **Current gap**: cAgents agents do not declare related agents in their frontmatter. Individual agents rarely include explicit scope boundaries. This leads to routing ambiguity and controller selection errors.
- **Implementation notes**:
  - Add to frontmatter: `related-agents: [architect, security-specialist]` and `not-my-scope: "For database schema work, use dba"`
  - Validate in `validate-agents.sh` that all related-agents references resolve
  - Controllers can use related-agents to discover specialists for delegation
  - Improves routing accuracy for cross-domain requests

---

## Plugin Distribution

### 6. Modular Domain Plugin Installation

- **Source repo(s)**: agents (wshobson), awesome-claude-code-subagents (VoltAgent)
- **Priority**: P1 (high)
- **Effort**: High
- **Description**: Make domain sub-plugins independently installable from the Claude Code marketplace. Users install the base cAgents core plugin (15 core agents + pipeline infrastructure) plus whichever domains they need (engineering, creative, business, etc.). Each domain plugin has its own marketplace listing with separate versioning.
- **Current gap**: cAgents loads all 213 agents as a single plugin. Users cannot install just the engineering domain independently. Domain sub-plugins exist (`{domain}/.claude-plugin/plugin.json`) but are not independently installable from the marketplace. Loading 213 agents wastes tokens for users who only need one domain.
- **Implementation notes**:
  - Restructure marketplace publishing: `cagents-core` (15 agents + pipeline), `cagents-engineering` (33 agents), `cagents-creative` (30 agents), etc.
  - Each domain plugin depends on cagents-core
  - Root `cagents` plugin becomes a meta-package that installs all domains
  - Follow Anthropic's recommended 2-8 components per plugin sizing
  - Users compose their setup: `claude plugin add cagents-core cagents-engineering cagents-creative`

### 7. Multi-Platform Template Generation

- **Source repo(s)**: ui-ux-pro-max-skill
- **Priority**: P3 (low)
- **Effort**: High
- **Description**: Generate platform-specific configurations for other AI coding assistants (Cursor, Windsurf, Kiro, Copilot) from cAgents agent definitions. Uses template-based generation where platform configs are produced from a single source of truth.
- **Current gap**: cAgents is currently Claude Code-only. If the market shifts to multi-platform, cAgents has no strategy for cross-platform support.
- **Implementation notes**:
  - Create `templates/` directory with platform-specific templates
  - Generate from SKILL.md frontmatter (which is already structured metadata)
  - Start with Cursor and Windsurf as secondary platforms
  - This is a strategic investment that depends on market demand

### 8. Interactive Agent Selector / Installer

- **Source repo(s)**: awesome-claude-code-subagents (VoltAgent)
- **Priority**: P3 (low)
- **Effort**: Medium
- **Description**: An interactive CLI or TUI for browsing domains, selecting agents, and configuring which agents to load. Supports both local (from cloned repo) and remote (from marketplace) modes. Users can preview agent capabilities before installing.
- **Current gap**: cAgents uses marketplace `plugin add` for installation but does not have an interactive agent browser. Users must read documentation to understand what 213 agents do.
- **Implementation notes**:
  - Could be implemented as a `/browse` skill that lists agents by domain with descriptions
  - Or as a standalone CLI: `npx cagents browse --domain engineering`
  - Show agent name, tier, description, related-agents
  - Enable/disable agents via a config file (rather than removing SKILL.md files)

---

## Tooling

### 9. Auto-Format After Edit Hook

- **Source repo(s)**: everything-claude-code
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: PostToolUse hook that automatically detects Biome, Prettier, or ESLint and formats JS/TS files after every Edit tool use. Companion hook runs `tsc --noEmit` after `.ts`/`.tsx` edits. A third hook warns about `console.log` statements in production code. Creates a tight feedback loop.
- **Current gap**: cAgents post-write-validator.cjs validates JSON/YAML syntax but does not auto-format or type-check edited files. For engineering domain workflows, formatting and type errors compound if not caught immediately.
- **Implementation notes**:
  - Add format detection logic to post-write-validator.cjs (or create a separate `post-edit-format.cjs`)
  - Detect formatter: check for `biome.json`, `.prettierrc`, `.eslintrc` in project root
  - On `.js`/`.ts`/`.tsx` edits: run formatter, report if changes were made
  - On `.ts`/`.tsx` edits: run `tsc --noEmit` and report errors
  - Keep execution fast (< 3 seconds) to avoid slowing down the pipeline

### 10. TDD Workflow Support

- **Source repo(s)**: commands (wshobson), Claude-Code-Workflow
- **Priority**: P2 (medium)
- **Effort**: Medium
- **Description**: A complete TDD suite with red/green/refactor phases decomposed as work items. The engineering controller recognizes TDD-style requests and decomposes into: (1) write failing tests (red), (2) minimal implementation (green), (3) optimization (refactor). Supports 7+ testing frameworks.
- **Current gap**: cAgents has qa-tester and test-automation-specialist but no dedicated TDD workflow. The engineering controller does not offer a test-first development path.
- **Implementation notes**:
  - Add TDD detection to engineering controller's decomposition logic
  - When user says "implement X with tests" or "TDD", decompose as: TASK-01: Write failing tests, TASK-02: Minimal implementation to pass, TASK-03: Refactor
  - Each task has explicit acceptance criteria (red: tests fail, green: tests pass, refactor: tests still pass + code quality improved)
  - This is a decomposition pattern, not a new agent

### 11. Comprehensive Validation Pipeline

- **Source repo(s)**: claude-skills, awesome-claude-code (hesreallyhim)
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: Extend `validate-agents.sh` with deeper checks: frontmatter completeness (tier, domain, name required), trigger-only description format ("Use when [conditions]"), name matches directory name, description length (1-1024 chars), related-agents resolve to real agents, YAML/markdown syntax validation (unclosed code blocks, table column counts, duplicate YAML keys).
- **Current gap**: cAgents has `validate-agents.sh` for basic validation but lacks depth. Some agents have incomplete frontmatter, descriptions that include process steps, and cross-references that do not resolve.
- **Implementation notes**:
  - Add checks to existing `validate-agents.sh`:
    - `tier` field present and valid (controller/execution/support)
    - `domain` field present and matches directory location
    - `description` starts with "Use when" (trigger-only format)
    - `description` length between 10 and 1024 characters
    - If `related-agents` present, all references resolve to existing SKILL.md files
  - Integrate as pre-commit hook via `.claude/settings.json`
  - Run in CI (`scripts/ci/validate-agents.sh`)

### 12. Progressive Test Layers (L0-L3)

- **Source repo(s)**: Claude-Code-Workflow
- **Priority**: P3 (low)
- **Effort**: Medium
- **Description**: A graduated testing approach for engineering domain workflows: L0 (static analysis -- compilation, imports, types), L1 (unit tests -- function/class behavior), L2 (integration tests -- component interactions, API contracts), L3 (E2E tests -- user journeys, critical paths). Each layer is a distinct phase assignable to different execution agents.
- **Current gap**: cAgents qa-tester and test-automation-specialist do not use a layered testing model. Controllers assign "write tests" as a single work item without specifying test layer.
- **Implementation notes**:
  - Define test layer taxonomy in engineering domain config
  - When decomposing test work items, specify layer: L0 (qa-tester), L1 (qa-tester), L2 (test-automation-specialist), L3 (test-automation-specialist)
  - Each layer has different acceptance criteria and verification methods
  - Controllers can assign different test layers to different execution agents for parallel testing

---

## Documentation

### 13. Decision Matrix for Skill Selection

- **Source repo(s)**: awesome-claude-skills-travisvn, commands (wshobson)
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: Create a clear decision matrix comparing /run, /team, /org, /designer, /review, and /optimize with "Best For", "Complexity", "Duration", and "Agent Count" columns. Add a workflow-vs-tool distinction. Include in both docs/ and /helper output.
- **Current gap**: cAgents /helper exists but the comparison between commands is terse. Users frequently choose the wrong command for their task (e.g., using /run for a multi-domain project that needs /org, or using /team for a simple fix that /run handles fine).
- **Implementation notes**:
  - Create `docs/COMMAND_SELECTION.md` with comparison table
  - Integrate into /helper output (add decision tree logic)
  - Example table:
    | Command | Best For | Complexity | Agents | Duration |
    |---------|----------|------------|--------|----------|
    | /run | Single-domain tasks, bug fixes | Tier 2-3 | 5-15 | 1-5 min |
    | /team | Parallelizable multi-step work | Tier 3-4 | 10-30 | 5-15 min |
    | /org | Multi-domain strategic projects | Tier 4 | 20-50 | 15-60 min |

### 14. Common Ground / Assumption Surfacing

- **Source repo(s)**: claude-skills
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: A system that surfaces the orchestrator's and planner's hidden assumptions about the project (tech stack, coding standards, architecture choices), classifies them into confidence tiers (ESTABLISHED/WORKING/OPEN), and stores them in a machine-readable index. Assumptions are typed (stated/inferred/assumed/uncertain) with promotable/demotable confidence tiers.
- **Current gap**: cAgents controllers and orchestrators operate on inferred context without making their assumptions explicit. When assumptions are wrong, the entire pipeline produces misaligned results, caught only at validation.
- **Implementation notes**:
  - Add assumption surfacing to the orchestrator's enrichment phase
  - Write assumptions to `workflow/assumptions.yaml` with confidence tiers
  - Planner reads assumptions before creating plan.yaml
  - Validator checks whether assumptions were validated
  - Users can review and correct assumptions via `/context` command

### 15. Trigger-Only Description Format

- **Source repo(s)**: claude-skills
- **Priority**: P1 (high)
- **Effort**: Low
- **Description**: Enforce that all agent descriptions contain ONLY when-to-trigger information, never process steps. Format: "Use when [triggering conditions]". This prevents models from following the brief description instead of reading the full SKILL.md body -- the single most impactful skill authoring pattern identified.
- **Current gap**: cAgents agent descriptions vary in quality. Some include process steps that cause the model to follow the description instead of the full SKILL.md. This leads to shallow execution that misses detailed instructions.
- **Implementation notes**:
  - Audit all 213 agent descriptions for trigger-only compliance
  - Rewrite non-compliant descriptions to "Use when [conditions]" format
  - Add validation to `validate-agents.sh`: description must start with "Use when"
  - Example: Change "The backend-developer writes server-side code, creates APIs, and handles database interactions" to "Use when implementing server-side logic, API endpoints, database operations, or backend architecture"

### 16. Context Accuracy Safeguards

- **Source repo(s)**: ccpm
- **Priority**: P2 (medium)
- **Effort**: Low
- **Description**: Add self-verification questions to the orchestrator's enrichment process: "Can I point to specific files?", "Have I actually seen this implemented?", "Am I making an assumption or stating an observation?". Mandatory uncertainty flags for inferred vs observed facts.
- **Current gap**: cAgents completion.md requires evidence for validation but does not address hallucination risk during context enrichment. The orchestrator could generate inaccurate context that propagates through the entire pipeline.
- **Implementation notes**:
  - Add self-verification instructions to the orchestrator's SKILL.md
  - Every claim about the codebase must reference a specific file path
  - Distinguish `observed: true` (read from file) vs `inferred: true` (assumed from patterns) in enriched_context.yaml
  - Planner weights observed facts higher than inferred assumptions

### 17. Security Documentation

- **Source repo(s)**: awesome-claude-skills-travisvn
- **Priority**: P2 (medium)
- **Effort**: Low
- **Description**: Create user-facing security documentation explaining cAgents' threat model, what protections exist (secret-detection.cjs, bash-validator.cjs, permission-handler.cjs), and best practices for safe usage. Include sandboxing limitations, prompt injection risks, and vetting guidelines.
- **Current gap**: cAgents has security hooks but no user-facing documentation explaining what is protected, what is not, and how users should evaluate trust decisions.
- **Implementation notes**:
  - Create `docs/SECURITY.md` covering:
    - Threat model (what can go wrong)
    - Built-in protections (which hooks protect what)
    - User responsibilities (review agent output, check before running untrusted code)
    - Best practices for production use
  - Reference existing hook documentation from `.claude/rules/core/hooks.md`

---

## Observability

### 18. Token Economics Tracking

- **Source repo(s)**: claude-mem, continuous-claude
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Track token consumption per agent, per session, and per pipeline state. Compute compression ratios and savings percentages. Users see exactly how many tokens are saved through the three-file pattern, progressive disclosure, and other optimizations. Track discovery tokens (new research) vs read tokens (loading existing state).
- **Current gap**: cAgents claims 60-80% context savings from the three-file pattern but does not measure it. No per-agent or per-session cost tracking. Cannot identify which agents are token-expensive.
- **Implementation notes**:
  - Add token estimation to subagent-stop-tracker.cjs (capture token count from Claude Code output)
  - Accumulate per-agent and per-session totals in `workflow/token_economics.yaml`
  - Report in execution_summary.yaml: total_tokens, tokens_by_agent, tokens_by_state, compression_ratio
  - Add `--analytics` flag to /run for detailed token breakdown (already partially implemented per V9.27)

### 19. Cost/Budget Tracking and Limits

- **Source repo(s)**: continuous-claude
- **Priority**: P1 (high)
- **Effort**: Medium
- **Description**: Track USD cost per session and enforce budget limits. Parse cost data from Claude Code output. Support `max_cost_usd`, `max_duration_seconds`, and `max_agent_spawns` as pipeline_config.yaml parameters. Check limits between state transitions.
- **Current gap**: cAgents has no budget or cost tracking. Complex tier 4 workflows with many subagents can consume significant resources without visibility or guardrails.
- **Implementation notes**:
  - Add cost tracking to subagent-stop-tracker.cjs
  - Accumulate session cost in `status.yaml` or `workflow/cost.yaml`
  - Add to pipeline_config.yaml: `budget: { max_cost_usd: 10.0, max_duration_seconds: 3600, max_agent_spawns: 50 }`
  - Check budget between state transitions in /run state machine
  - On budget exceeded: complete current state, skip remaining states, report what was done

### 20. System Health Score

- **Source repo(s)**: Claude-Code-Novel-Writer
- **Priority**: P2 (medium)
- **Effort**: High
- **Description**: A composite health metric (0-100) aggregating: hook failures (from tool-failure-tracker.cjs), stale sessions (from session-catchup.cjs), agent spawn success rate (from subagent-tracker.cjs), file integrity (YAML/JSON validation), and memory health (from consolidation reports). Orchestrator checks health score and routes to recovery if below threshold.
- **Current gap**: cAgents has individual monitoring hooks but no holistic health score. Problems in one subsystem are detected independently without correlation to system-wide health.
- **Implementation notes**:
  - Create `Agent_Memory/_system/health.yaml` with component scores
  - Update via SessionStart hook (check staleness), PostToolUse hook (check file integrity), SubagentStop hook (check spawn success)
  - Expose via `/status` command for user visibility
  - Orchestrator reads health score during enrichment; degraded health triggers conservative pipeline

### 21. Agent Performance Dashboard

- **Source repo(s)**: Claude-Code-Workflow, ccpm
- **Priority**: P3 (low)
- **Effort**: High
- **Description**: A status dashboard showing: active sessions, agent spawn history, task completion rates, token consumption by domain, revision cycle counts, and pipeline success rates. Can be CLI-based (like ccpm's /pm:status) or web-based (like Claude-Code-Workflow's A2UI dashboard).
- **Current gap**: cAgents has no visibility into aggregate performance across sessions. Users cannot see which domains are most active, which agents have the highest revision rates, or how costs trend over time.
- **Implementation notes**:
  - Start with CLI-based: `/status` skill that reads `_system/metrics/` and aggregates
  - Show: sessions today, total agents spawned, PASS/FAIL/REVISE ratios, top 5 most-used agents
  - Optionally: web dashboard via MCP server or static HTML generation
  - Depends on token economics tracking (#18) being implemented first

### 22. Version Self-Check

- **Source repo(s)**: marketingskills
- **Priority**: P3 (low)
- **Effort**: Low
- **Description**: On first skill use per session, check for cAgents updates by fetching the marketplace version and comparing against local. Non-blocking notification only when 2+ minor versions or any major version behind.
- **Current gap**: cAgents has version in plugin.json but no mechanism for users to know when updates are available. Users may run outdated versions indefinitely.
- **Implementation notes**:
  - Add version check to session-catchup.cjs (SessionStart hook)
  - Fetch latest version from marketplace (with caching to avoid repeated requests)
  - Show non-blocking notification: "cAgents v10.4.0 installed, v10.6.0 available. Run `claude plugin update cagents` to update."
  - Only notify for significant updates (2+ minor or any major)

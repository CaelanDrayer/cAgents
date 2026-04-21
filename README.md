# cAgents

**Your AI Workforce for Claude Code**

Deploy 262 specialized agents across 15 domains through an intelligent pipeline that routes your request, plans execution, decomposes work, coordinates specialists, reviews outputs, and validates quality — automatically.

| Stat | Value |
|------|-------|
| Agents | 262 across 15 domains |
| Skills | 10 slash commands |
| Hooks | 26 unique hooks across 27 registrations, 19 event types |
| Models | Opus 4.6 (controllers) · Sonnet 4.6 (execution) · Haiku 4.5 (support) |

---

## Is cAgents Right for You?

**Use cAgents if you need:**
- Multi-step task orchestration with automatic routing, planning, and coordination
- Cross-domain work (engineering + business + creative + growth in one request)
- Parallel execution with quality-gated waves (40-60% faster for complex tasks)
- Consistent delegation patterns across 15 domains and 262 specialists
- Reviewer loops, confidence scoring, and revision routing built into every run

**cAgents is NOT for you if:**
- You need a quick single-file fix — use Claude Code directly, it is faster and cheaper
- You want minimal token usage — cAgents consumes 10-50x more tokens per request for orchestration overhead
- You only work in a single narrow area — the orchestration overhead may not be worth it for isolated tasks

---

## Usage Warning

cAgents spawns 3-10+ subagents per request. Each consumes API tokens independently. A single `/run` can use 10-50x more tokens than a direct Claude Code interaction. `/team` and `/org` amplify this further. Monitor usage closely.

---

## Requirements

- **Claude Code 2.1.69+** (required)
- **Node.js** (recommended) — powers 26 registered hooks for session management, secret detection, team coordination, and completion verification

| cAgents | Min Claude Code | Highlights |
|---------|----------------|------------|
| 10.6.0+ | 2.1.69+ | Confidence tiers, blind review, handoff documents |
| 10.5.0+ | 2.1.69+ | Clean team lifecycle, hook reliability |
| 10.0–10.4 | 2.1.47+ | Custom model routing in teammates |

---

## Installation

```bash
# From Claude Code Marketplace
/plugin CaelanDrayer/cAgents

# Manual
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents && ./scripts/setup.sh
```

---

## Quick Start

Five commands. Five different capabilities.

```bash
# Route a bug fix to the engineering domain automatically
/run Fix the authentication bug in src/auth.ts

# Build a feature with parallel agent waves
/team Build the user onboarding flow

# Plan strategy with C-suite analysis
/org Plan our Q3 product roadmap

# Review code quality with parallel specialists
/review src/api/ --fix

# Explore a design problem interactively
/designer Redesign the checkout flow
```

The pipeline detects the domain, selects the appropriate controller, decomposes the work into items with acceptance criteria, and coordinates specialist agents — without you specifying a single agent name.

---

## Skills Reference

### `/run` — Task Execution Pipeline

Routes any request through the full pipeline: orchestrator enriches context, planner defines objectives, decomposer breaks work into items with acceptance criteria, prompt-engineer crafts delegation prompts, a controller coordinates specialists, and a validator confirms quality.

```bash
/run Fix the auth bug in src/auth.ts
/run Write a sci-fi short story set on a generation ship
/run Plan Q4 product launch campaign
/run Design onboarding program for new engineers
/run Create knowledge base article on our refund policy
/run Fix auth bug --analytics    # Show execution metrics after run
```

The domain routes automatically based on request content. Engineering requests go to an engineering-manager controller; creative requests go to a narrative-director; business requests go to an operations-manager or strategic-planner.

### `/team` — N-Wave Parallel Execution

Decomposes work into parallel waves. Teammates execute simultaneously within each wave; a quality gate validates before the next wave starts. Tier 3+ defaults to 5-7 waves.

```bash
/team Implement OAuth2 authentication
/team Build user dashboard --waves 8   # Force minimum 8 waves
/team Build feature --dry-run          # Preview wave structure before running
/run Build feature --team              # Team mode via flag on /run
```

Each teammate is a controller that spawns execution agents directly. Wave 0 handles scaffolding and interface contracts; middle waves parallelize implementation; the final wave handles integration and validation.

### `/org` — Corporate Hierarchy Orchestration

Fires the full executive layer. CEO logic runs inline, C-suite agents analyze independently, then deliberate with cross-domain context before producing a unified strategic brief. Domain teams execute sequentially using that brief as shared context.

```bash
/org Launch new product with campaign
/org Fix auth bug                        # Routes to single /run with strategic brief
/org Restructure engineering team
/org Migrate to microservices --dry-run  # Preview routing decision
```

Smart routing applies: a single-domain simple request routes to `/run`, a single-domain complex request routes to `/team`, and multi-domain requests trigger the full C-suite hierarchy.

### `/designer` — Interactive Design Exploration

Guides design exploration through structured Q&A before building anything. Research agents pre-build context-rich question lists per phase. Unlike other skills, `/designer` waits for your responses at each step — it does not auto-proceed.

```bash
/designer Redesign the checkout flow
/designer Plan the data model for a multi-tenant SaaS
/designer Define the API contract for the notifications service
```

A 4-dimension clarity score tracks readiness; implementation does not begin until ambiguity drops below 20%. Phase overlap starts next-phase research during the current phase to reduce wait time.

### `/review` — Quality Review

Runs parallel specialist reviewers — security-engineer, code-reviewer, performance-analyzer — each reporting findings with CRITICAL/HIGH/LOW severity. Add `--fix` to route each CRITICAL finding through an execution agent for patching.

```bash
/review src/auth/
/review src/api/ --fix               # Auto-patch CRITICAL findings
/review . --profile security         # Focus on security-specific checks
/review src/ --baseline              # Establish a quality baseline
/review src/ --suppress baseline     # Show only regressions from baseline
```

Tier 3+ review uses blind review: multiple independent reviewers assess without seeing each other's findings, then a Devil's Advocate round challenges unanimous PASS verdicts.

### `/optimize` — Performance Optimization

Measures before, optimizes, measures after, and provides rollback if the change degrades performance.

```bash
/optimize src/db/queries.ts
/optimize api/search --benchmark    # Run custom benchmark suite
/optimize src/ --history            # Show past optimization attempts and outcomes
```

Optimization history tracks pattern effectiveness across sessions so the same approach is not repeated when it has already failed.

### `/helper` — Command Guidance

Recommends the right skill based on your task description. Use it when you are unsure whether to reach for `/run`, `/team`, or `/org`.

```bash
/helper
/helper I need to refactor the entire auth module
/helper --troubleshoot              # Diagnose why a previous skill run failed
```

### `/context` — Shared Product Context

Writes project context (architecture decisions, coding standards, domain glossary) that persists across all sessions and is injected into agent prompts automatically.

```bash
/context
/context We use PostgreSQL with Drizzle ORM. All queries go through the db package.
/context Our API follows REST conventions with JSON:API response format.
```

### `/debug` — Systematic Debugging

Four-phase debugging for bugs that resist quick fixes: reproduce, isolate, hypothesize, verify. Each phase uses specialist agents before moving to the next.

```bash
/debug The login form silently fails when the email contains a plus sign
/debug Memory usage grows unbounded after 100 API calls
/debug Tests pass locally but fail in CI on the date-formatting module
```

---

## Domain Breakdown

| Domain | Agents | Scope |
|--------|--------|-------|
| **Engineering** | 32 | Backend, frontend, DevOps, QA, security, game dev, accessibility |
| **Creative** | 30 | Writing, narrative design, literary criticism, game art, audio |
| **Business** | 31 | Strategy, product, operations, finance, project management |
| **Growth** | 39 | Marketing, sales, SEO, demand generation, revenue operations |
| **People** | 19 | HR, talent acquisition, culture, compensation, compliance |
| **Service** | 32 | Customer support, CX, legal, compliance, governance |
| **Leadership** | 11 | C-suite executives (CEO, CTO, CPO, CMO, CFO, COO, CRO, CHRO, CCO, CSO, CLO) — used by `/org` |
| **Shared** | 12 | Cross-domain intelligence: BI, data science, market research, social science |
| **Science** | 10 | STEM research, scientific analysis |
| **Health** | 6 | Medical, wellness, fitness, nutrition |
| **Education** | 6 | Teaching, tutoring, academic support |
| **Personal** | 6 | Career, life coaching, personal finance |
| **Arts** | 6 | Visual arts, music, film, performing arts |
| **Trades** | 6 | Culinary, construction, automotive, agriculture |

These 15 domains total 246 user-facing agents. The remaining 16 are Core pipeline infrastructure (orchestrator, planner, decomposer, validator, router) that run automatically and are not directly invoked — bringing the full catalog to 262 agents.

**Engineering (32)** handles the full software stack: backend-developer, frontend-developer, devops-engineer, security-engineer, qa-lead, architect, dba, performance-analyzer, and 24 more. Use `/run Fix the bug` or `/team Build the feature` and the pipeline routes here automatically for software tasks.

**Creative (30)** covers long-form and short-form writing: prose-stylist, dialogue-specialist, plot-developer, narrative-director, character-psychologist, worldbuilder, and 24 more. Use `/run Write a mystery short story` and the narrative-director controller coordinates the right specialists.

**Growth (39)** is the largest domain: copywriter, marketing-strategist, seo-specialist, campaign-manager, demand-generation-manager, sales-strategist, and 33 more. Use `/run Plan the Q4 content calendar` and the marketing-strategist controller coordinates the campaign team.

**Service (32)** covers support and legal: customer-success-manager, general-counsel, compliance-officer, technical-writer, legal-analyst, and 27 more. Use `/run Draft an EULA for our SaaS product` and the general-counsel controller coordinates the legal team.

---

## Architecture

### `/run` — Event-Driven Pipeline

`/run` is a config-driven state machine. Each stage writes a file that triggers the next stage.

```
User Request
  |
  +-> /run  (state machine loop, reads pipeline_config.yaml)
        |
        INIT          -> orchestrator     -> enriched_context.yaml
        ORCHESTRATED  -> planner          -> plan.yaml
        PLANNED       -> decomposer       -> work_items.yaml
        DECOMPOSED    -> prompt-engineer  -> delegation_prompts.yaml
        PROMPTS_READY -> controller
              |
              +-> execution agent  (implements work item)
              |     +-> reviewer   Stage 1: spec compliance
              |                    Stage 2: code quality
              |                    REVISE -> back to execution agent (max 3 rounds)
              |
              +-> (repeat per work item, dependency-ordered)
        COORDINATED   -> validator        -> validation_report.yaml
              PASS   -> complete
              FAIL   -> re-run controller   (max 5 cycles)
              REVISE -> re-run planner      (max 5 cycles)
```

Controllers never implement. They ask questions of specialist agents, synthesize answers, and coordinate work items in dependency order. A two-stage review runs on every work item: Stage 1 checks spec compliance against acceptance criteria; Stage 2 checks code quality only after Stage 1 passes.

### `/team` — N-Wave Parallel Execution

```
/team request
  |
  Wave 0   Lead (sequential)
  |         enrichment, scaffolding, interface contracts
  |
  Wave 1..N-1   Teammates (parallel within each wave)
  |   +-> Teammate A (controller) -> execution agent -> reviewer
  |   +-> Teammate B (controller) -> execution agent -> reviewer
  |   +-> Teammate C (controller) -> execution agent -> reviewer
  |
  |         GATE: quality validated before next wave starts
  |
  Wave N   Lead (sequential)
            integration, final validation, report
```

More waves produce more quality gates. Tier 3+ defaults to 5-7 waves. Use `--waves N` to set a minimum. Each teammate is a controller that spawns execution agents via the Agent tool — teammates never implement directly.

### Complexity Tiers

| Tier | Coordination | When It Applies |
|------|-------------|-----------------|
| **2** (Moderate) | 1 controller | Bug fix, answer a question, single-file change |
| **3** (Complex) | 1 primary + 1-2 supporting | Add a feature, create a subsystem |
| **4** (Expert) | Executive + primary + supporting + HITL | Major refactor, architecture migration |

The pipeline detects tier automatically via 9-signal complexity scoring. Tier 2 uses a fast path that skips 3 enrichment agents to keep simple requests lean.

---

## Key Features

### Goal Drift Prevention

Before every Write, Edit, and Bash operation, the `attention-injection.cjs` hook reads the active `plan.yaml` and injects a concise goal reminder into the model's context window. An agent given 30 work items 40 tool calls ago still acts on the original objectives — not on whatever the most recent subtask left in its attention window.

This fires automatically — no prompt engineering required. It is a no-op when there is no active session, so it does not affect ordinary Claude Code usage.

### 26 Lifecycle Hooks

cAgents registers 26 unique hooks (27 registrations — `elicitation-handler.cjs` covers 2 events) across 19 of Claude Code's 24 event types:

| Event | Hook | Purpose |
|-------|------|---------|
| SessionStart | session-catchup.cjs | Detect incomplete sessions, inject cAgents context |
| SessionEnd | team-stop.cjs | Finalize team metrics and update session status |
| UserPromptSubmit | delegation-enforcer.cjs | Enforce delegation rules for controller agents |
| UserPromptSubmit | magic-keywords.cjs | Natural language routing suggestions |
| PreToolUse[Bash] | bash-validator.cjs | Block dangerous commands and data exfiltration attempts |
| PreToolUse[Write\|Edit] | secret-detection.cjs | Block writes containing API keys, tokens, credentials |
| PreToolUse[Write\|Edit] | controller-delegation-validator.cjs | Warn when controllers write implementation files |
| PreToolUse[Write\|Edit\|Bash] | attention-injection.cjs | Inject plan objectives before every file operation |
| PreToolUse[Write\|Edit\|Bash] | approval-gate.cjs | Enforce approval gates for sensitive operations |
| PreToolUse[Agent] | model-routing-advisor.cjs | Suggest optimal model before agent spawns |
| PreToolUse[Agent] | session-init-gate.cjs | Ensure session init complete before agent spawns |
| PermissionRequest | permission-handler.cjs | Auto-approve safe patterns, HITL gates |
| PostToolUse[Write\|Edit] | post-write-validator.cjs | Validate JSON/YAML syntax after writes |
| PostToolUseFailure | tool-failure-tracker.cjs | Track failures, detect patterns, suggest recovery |
| Notification | notification.cjs | Log notifications to daily files |
| SubagentStart | subagent-tracker.cjs | Log agent spawns to agent_tree.yaml with audit trail |
| SubagentStart | team-start.cjs | Initialize team monitoring directories |
| SubagentStop | subagent-stop-tracker.cjs | Capture completion summaries and duration metrics |
| Stop | verify-completion.cjs | Verify completion criteria before allowing stop |
| StopFailure | stop-failure-handler.cjs | Save recovery state on unclean stop |
| TeammateIdle | teammate-idle-handler.cjs | Find available work or cleanly stop idle teammates |
| TaskCompleted | team-task-complete.cjs | Update task list, unblock dependencies |
| InstructionsLoaded | instructions-loaded.cjs | Validate rules directory, inject session context |
| PreCompact | pre-compact-save.cjs | Save workflow state before context compaction |
| PostCompact | post-compact-restore.cjs | Re-inject workflow context after compaction |
| Elicitation | elicitation-handler.cjs | Log MCP elicitation requests |
| ElicitationResult | elicitation-handler.cjs | Log MCP elicitation responses |

### Confidence Scoring

Every completed work item includes a confidence score (0.0–1.0) and rationale. Items below 0.7 trigger additional scrutiny: the reviewer applies stricter criteria and the controller flags them in the coordination log.

### Two-Stage Review Protocol

The reviewer loop runs two distinct stages in strict order:

1. **Stage 1 — Spec Compliance**: Does the implementation meet every acceptance criterion? Evidence must cite specific file:line. No quality judgments at this stage.
2. **Stage 2 — Code Quality**: Is the implementation well-written and maintainable? Runs only after Stage 1 passes. Findings are severity-tagged (CRITICAL/HIGH/LOW). REVISE triggers only for CRITICAL or two or more HIGH findings.

This prevents marking work complete when it looks clean but misses requirements.

### Aggressive Decomposition

The decomposer breaks even simple requests into 30+ work items with explicit acceptance criteria, dependency graphs, and agent assignments. Work items execute in topological order; independent items execute in parallel.

---

## Domain Routing

cAgents routes your request to the right domain automatically based on keywords. No configuration needed — just describe what you want.

| Request | Routed To | Controller |
|---------|-----------|------------|
| `/run Fix the auth bug` | Engineering | engineering-manager |
| `/run Write a blog post about AI` | Creative | narrative-director |
| `/run Plan Q4 product launch` | Business | operations-manager |
| `/run Build an email campaign` | Growth | marketing-strategist |
| `/run Create onboarding program` | People | hr-manager |
| `/run Draft our privacy policy` | Service | general-counsel |

For cross-domain work that spans multiple areas (e.g., launching a product requires engineering, marketing, and ops), use `/org` — it coordinates C-suite agents across domains automatically.

---

## Performance Benchmarks

| Feature | Measurement |
|---------|-------------|
| Aggressive Decomposition | 30+ work items from a simple request |
| Controller Pattern | 30-40% simpler planning, 20-30% fewer tokens vs direct delegation |
| Parallel Execution | 50x speedup (swarm mode), 80%+ parallelism efficiency |
| Task Inventory | 60-80% context savings for workflows with 20+ tasks |
| Team Mode | 40-60% execution time reduction for tier 3+ |

---

## How cAgents Compares

| Dimension | cAgents | Official feature-dev plugin | Official code-review plugin |
|-----------|---------|----------------------------|----------------------------|
| **Agent count** | 262 | 3–5 | 3–5 |
| **Business domains** | 15 | 1 (engineering) | 1 (engineering) |
| **Pipeline state machine** | Yes — PASS/FAIL/REVISE routing, max 5 cycles | No | No |
| **Parallel team execution** | Yes — N-wave with per-wave quality gates | No | No |
| **Revision loops** | Yes — executor + reviewer, max 3 rounds per work item | No | No |
| **Two-stage review** | Yes — spec compliance then code quality | No | No |
| **Hook lifecycle** | 27 hooks across 19 event types | 1–4 hooks | 1–4 hooks |
| **Goal drift prevention** | Yes — attention injection on every Write/Edit/Bash | No | No |
| **Confidence scoring** | Yes — 0.0–1.0 per work item, low scores trigger scrutiny | No | No |
| **Cross-domain orchestration** | Yes — /org fires full C-suite hierarchy | No | No |

Numbers for cAgents reflect the current release. Official plugin figures are approximate based on publicly available descriptions.

---

## Real Workflow Examples

### Multi-Domain Strategy: `/org Plan Q3 product launch`

The CEO agent fires first and determines which C-suite agents are needed: CTO for technical feasibility, CPO for roadmap fit, CMO for go-to-market.

CTO, CPO, and CMO each analyze the request independently, writing their analyses to separate YAML files. Each then reads the others' analyses before a deliberation phase where they surface conflicts and cross-domain dependencies. The CMO flags that the marketing timeline assumes a launch date the CTO says is unrealistic. The deliberation resolves this with a phased launch plan.

The result is a unified strategic brief. cAgents then runs sequential `/team` executions per domain: the engineering team plans the feature work, the marketing team plans the campaign, each using the strategic brief as shared context.

### Full-Stack Feature: `/team Build user dashboard`

Wave 0 (lead, sequential): scaffolding, interface contracts between frontend and backend, database schema decisions written to a contracts file that all subsequent waves read.

Wave 1 (parallel, 3 teammates): backend-developer builds the API endpoints against the contract, frontend-developer builds the component tree consuming that API contract, dba validates the schema against query patterns.

Wave 2 (parallel, 2 teammates): qa-lead writes integration tests covering the API and UI, accessibility-checker audits the component tree.

Wave 3 (lead, sequential): integration, final test run, validation report. Each wave is gated — the next wave does not start until the current wave's quality criteria pass. Total execution time: 40-60% less than sequential.

### Quality Review: `/review src/auth/ --fix`

Three reviewers run in parallel: security-engineer (injection, auth bypass, token handling), code-reviewer (naming, structure, DRY, complexity), performance-analyzer (N+1 queries, unnecessary allocations). Each reports findings with CRITICAL/HIGH/LOW severity, citing specific file:line evidence.

The lead synthesizes findings, deduplicates overlapping concerns, and produces a prioritized list. Because `--fix` was passed, each CRITICAL finding routes through an execution agent to be patched. The patches re-enter the review pipeline to confirm the finding is resolved before the overall review marks complete.

---

## AgentPath — Session Visualizer

[AgentPath](https://github.com/CaelanDrayer/AgentPath) is a companion web UI for visualizing cAgents session data. It reads from `Agent_Memory/sessions/` and renders agent trees, pipeline timelines, work item DAGs, and file change logs in real time. Useful for understanding what happened in complex `/org` or `/team` runs where dozens of agents executed across multiple waves.

---

## Documentation

| Resource | Content |
|----------|---------|
| `CLAUDE.md` | Complete architecture reference and agent inventory |
| `docs/ARCHITECTURE.md` | Pipeline design, state machine, and domain structure |
| `docs/SKILLS.md` | Full skill reference with all flags and options |
| `docs/TEAM_MODE.md` | N-wave execution, wave types, gate sentinels, templates |
| `docs/GETTING_STARTED.md` | First-run guide and environment setup |
| `docs/RELEASE_NOTES.md` | Detailed version history |
| `.claude/rules/` | 29 modular topic-specific rules loaded by agents |
| `docs/SECURITY.md` | Security policy and vulnerability reporting |

---

## External Resources

Key external tools and libraries that cAgents depends on:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic's CLI for Claude, required runtime for cAgents
- [Node.js](https://nodejs.org/) — JavaScript runtime powering cAgents hooks and scripts
- [Vitest](https://vitest.dev/) — Test framework used by the cAgents test suite
- [tmux](https://github.com/tmux/tmux/wiki) — Terminal multiplexer used for team mode split panes
- [js-yaml](https://github.com/nodeca/js-yaml) — YAML parser used throughout session state management
- [ajv](https://ajv.js.org/) — JSON Schema validator used for configuration validation

---

## Version History

See `docs/RELEASE_NOTES.md` for the complete history. Recent highlights:

- **V10.26.13** — Current release
- **V10.23.0** — 29-check validation framework, regression validation chain, mandatory self-validation protocol for execution agents
- **V10.22.0** — Two-stage review protocol (spec compliance then code quality), 5 pipeline improvements
- **V10.20.0** — 23 agent communication gap fixes, Growth domain expanded from 35 to 39 agents
- **V10.18.0** — Vibe field on all 262 agents, worktree isolation, guard command pattern, skill chaining, commit-before-verify pattern
- **V10.16.0** — Session ID naming overhaul with readable slugs, agent_id linking in coordination_log for AgentPath
- **V10.12.0** — AgentPath plugin integration with 15 session visualization improvements
- **V10.6.0** — Confidence tiers, blind review, dead-letter queue, handoff documents
- **V10.3.0** — Creative domain overhaul (24 to 30 agents, all on Opus 4.6)
- **V10.0.0** — 8 business domains, agent chaining with topological execution

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | 262 agents across 15 domains | Opus 4.6 · Sonnet 4.6 · Haiku 4.5

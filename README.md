# cAgents

**Your AI Workforce for Claude Code**

Deploy 214 specialized agents across 8 business domains through an intelligent pipeline that routes your request, plans execution, decomposes work, coordinates specialists, reviews outputs, and validates quality — automatically. Ship code, launch campaigns, craft narratives, scale teams: one command drives any work to completion.

## Is cAgents Right for You?

**Use cAgents if you need:**
- Multi-step task orchestration with automatic routing, planning, and coordination
- Cross-domain work (engineering + business + creative + growth in one request)
- Parallel execution with quality-gated waves (40-60% faster for complex tasks)
- Consistent delegation patterns across 8 business domains and 214 specialists
- Reviewer loops, confidence scoring, and revision routing built into every run

**cAgents is NOT for you if:**
- You need a quick single-file fix — use Claude Code directly, it's faster and cheaper
- You want minimal token usage — cAgents consumes 10-50x more tokens per request for orchestration overhead (see Usage Warning below)
- You only need one domain — consider a focused plugin like `cagents-engineering` instead of the full platform

## Usage Warning

cAgents spawns multiple subagents per request (3-10+). Each consumes API tokens independently. A single `/run` can use 10-50x more tokens than a direct Claude Code interaction. `/team` and `/org` amplify this further. Monitor usage closely.

## Requirements

- **Claude Code 2.1.69+** (required)
- **Node.js** (recommended) -- powers 21 registered hooks (25 .cjs files) for session management, secret detection, team coordination, and completion verification

| cAgents | Min Claude Code | Highlights |
|---------|----------------|------------|
| 10.6.0+ | 2.1.69+ | Confidence tiers, blind review, handoff documents |
| 10.5.0+ | 2.1.69+ | Clean team lifecycle, hook reliability |
| 10.0-10.4 | 2.1.47+ | Custom model routing in teammates |

## Installation

```bash
# From Claude Code Marketplace
/plugin CaelanDrayer/cAgents

# Manual
git clone https://github.com/CaelanDrayer/cAgents.git
cd cAgents && ./setup.sh
```

## Quick Wins

Three commands. Three different capabilities.

```bash
/run Fix the auth bug in src/auth.ts
```
Routes to the engineering domain automatically. An engineering-manager controller spawns a backend-developer, runs reviewer loops against acceptance criteria, and delivers a validated fix — without you specifying a single agent.

```bash
/team Build the user dashboard
```
Decomposes the work into parallel waves. Multiple specialist agents execute simultaneously across components (data layer, UI, tests), each validated at a quality gate before the next wave starts. 40-60% faster than sequential execution.

```bash
/org Plan our Q3 product roadmap
```
Triggers the full executive layer. CTO, CPO, and CFO each analyze independently, then deliberate with cross-domain context, surface conflicts, and produce a unified strategic brief — before handing off to engineering and business teams for execution.

## Choose Your Entry Point

Load the full platform or a domain-specific sub-plugin depending on your team's needs. Each domain has its own `.claude-plugin/` for independent loading.

| Package | Agents | Skills | Target Audience |
|---------|--------|--------|-----------------|
| **cAgents** (Full Platform) | 214 | 9 | Teams wanting the complete AI workforce across all domains |
| **cagents-engineering** | 32 | 9 | Software development teams: backend, frontend, DevOps, QA, security |
| **cagents-creative** | 30 | 9 | Content and creative teams: writing, narrative, game art, audio |
| **cagents-business** | 42 | 9 | Strategy and product teams: business (31) + leadership (11) agents |
| **cagents-growth** | 39 | 9 | Marketing and sales teams: campaigns, SEO, demand gen, revenue ops |

Each domain sub-plugin loads independently via its own `.claude-plugin/` manifest. Use the full platform to access all 214 agents, or load only the domain(s) your team needs to keep context lean.

## Quick Start

```bash
/run Fix the authentication bug          # Engineering
/run Write a sci-fi short story          # Creative
/run Plan Q4 product launch campaign     # Business
/run Design onboarding program           # People
/run Create knowledge base article       # Service
```

The system automatically detects domain, selects controllers, and orchestrates specialist agents through the full pipeline.

## Commands

| Command | What it does |
|---------|-------------|
| `/run` | Execute any task through auto-routed specialist agents |
| `/team` | Parallel multi-agent execution with wave-based quality gates |
| `/org` | Cross-domain strategy via C-suite agents and sequential teams |
| `/designer` | Interactive design exploration with guided Q&A |
| `/review` | Quality review with parallel specialists and auto-fix |
| `/optimize` | Performance optimization with before/after metrics |
| `/helper` | Command guide that recommends the right skill |
| `/context` | Shared product context that persists across sessions |

## Architecture

### /run — Event-Driven Pipeline

```
User Request
  └─> /run  (config-driven state machine)
        |
        |-> Orchestrator      enrich context, detect domain + tier
        |-> Planner           define objectives, select controller
        |-> Decomposer        break into work items with acceptance criteria
        |-> Prompt Engineer   craft optimized delegation prompts
        |
        └─> Controller        coordinate via question-based delegation
              |
              |-> Execution Agent   implement work item
              |     └─> Reviewer    Stage 1: spec compliance
              |                     Stage 2: code quality
              |                     └─> REVISE --> back to Execution Agent (max 3 rounds)
              |
              └─> (repeat per work item ...)
        |
        └─> Validator
              PASS    -->  complete
              FAIL    -->  re-run controller   (max 5 cycles)
              REVISE  -->  re-run planner      (max 5 cycles)
```

Controllers never implement — they ask questions of specialist agents, synthesize answers, and coordinate work items in dependency order.

### /team — N-Wave Parallel Execution

```
/team request
  |
  └─> Wave 0   Lead (sequential)
  |             enrichment, scaffolding, interface contracts
  |
  └─> Wave 1..N-1   Teammates (parallel within each wave)
  |   |-> Teammate A (controller) -> Execution Agent -> Reviewer
  |   |-> Teammate B (controller) -> Execution Agent -> Reviewer
  |   └─> Teammate C (controller) -> Execution Agent -> Reviewer
  |                  |
  |             GATE: quality validated before next wave starts
  |
  └─> Wave N   Lead (sequential)
                integration, final validation, report
```

More waves = more quality gates. Tier 3+ defaults to 5-7 waves; use `--waves N` to set a minimum.

### Domains

| Domain | Agents | Scope |
|--------|--------|-------|
| **Engineering** | 32 | Software, infrastructure, security, QA, game dev |
| **Creative** | 30 | Writing, narrative, literary criticism, game art, audio |
| **Business** | 31 | Strategy, product, operations, finance |
| **Growth** | 39 | Marketing, sales, revenue operations |
| **People** | 19 | HR, talent acquisition, culture |
| **Service** | 32 | Customer support, CX, legal, compliance |
| **Leadership** | 11 | C-suite executives (used by /org) |
| **Core** | 16 | Pipeline infrastructure agents |
| **Shared** | 4 | Cross-domain intelligence |

### Complexity Tiers

| Tier | Coordination | Example |
|------|-------------|---------|
| 2 (Moderate) | 1 controller | Fix a bug, answer a question |
| 3 (Complex) | 1 primary + 1-2 supporting | Add a feature, create a system |
| 4 (Expert) | Executive + primary + supporting + HITL | Major refactor, architecture migration |

## How cAgents Prevents Goal Drift

Every Write, Edit, and Bash operation is preceded by an attention injection hook. Before the model touches a file, the hook reads the active `plan.yaml` — specifically the mission, domain, and current coordination status — and injects a concise goal reminder into the model's context window.

This is Manus-inspired goal refresh, implemented as a Claude Code `PreToolUse` hook (`attention-injection.cjs`). It fires automatically; no prompt engineering required. The result: agents that were given 30 work items 40 tool calls ago still act on the original objectives, not on whatever the most recent subtask put into their attention window.

The hook is a no-op when there is no active session or no plan.yaml, so it does not affect ordinary Claude Code usage.

## Key Features

- **Event-driven pipeline** -- config-driven state machine with revision routing
- **Controller-centric coordination** -- question-based delegation to specialists
- **Reviewer loops** -- acceptance criteria validation with blind review for tier 3+
- **N-wave parallel teams** -- 40-60% time reduction with per-wave quality gates
- **Confidence scoring** -- 0.0-1.0 per work item, low scores trigger extra scrutiny
- **21 registered hooks** -- session management, secret detection, attention injection, team lifecycle (25 total .cjs files)

## How cAgents Compares

| Dimension | cAgents | Official feature-dev plugin | Official code-review plugin |
|-----------|---------|----------------------------|----------------------------|
| **Agent count** | 214 | 3-5 | 3-5 |
| **Business domains** | 8 (engineering, creative, business, growth, people, service, leadership, shared) | 1 (engineering) | 1 (engineering) |
| **Pipeline state machine** | Yes — config-driven loop with PASS/FAIL/REVISE revision routing (max 5 cycles) | No | No |
| **Team / parallel execution** | Yes — N-wave parallel teams with per-wave quality gates (40-60% time reduction) | No | No |
| **Revision loops** | Yes — executor → reviewer (spec compliance then code quality), max 3 rounds per work item | No | No |
| **Hook lifecycle** | 21 registered hooks across 14 event types (session, secrets, attention, team, completion) | 1-4 hooks | 1-4 hooks |
| **Test coverage** | 351 Vitest tests (hooks + config validation) | CLI validate only | CLI validate only |
| **Controller coordination** | Question-based delegation: controller asks specialists, synthesizes, coordinates | Direct invocation | Direct invocation |

Numbers for cAgents reflect current release. Official plugin figures are approximate based on publicly available descriptions.

## What cAgents Built

Three real workflows that show the platform end-to-end.

**Multi-domain strategy: `/org Plan Q3 product launch`**

The CEO agent fires first and determines which C-suite agents are needed. CTO, CPO, and CMO each analyze the request independently (Wave 1), then read each other's analyses before a deliberation phase where they surface conflicts and cross-domain dependencies (Wave 2). The result is a unified strategic brief. cAgents then runs sequential `/team` executions per domain: the engineering team plans the feature work, the marketing team plans the campaign, both using the strategic brief as shared context.

**Full-stack feature: `/team Build user dashboard`**

Wave 0 (lead): scaffolding, interface contracts between frontend and backend, database schema decisions. Wave 1 (parallel): backend-developer builds the API endpoints, frontend-developer builds the component tree, dba validates the schema. Wave 2 (parallel): qa-lead writes integration tests, accessibility-checker audits the UI. Wave 3 (lead): integration, final test run, validation report. Each wave is gated — the next wave does not start until the current wave's quality criteria are met. Total execution time: 40-60% less than sequential.

**Quality review: `/review src/auth/`**

Three reviewers run in parallel: security-engineer (injection, auth bypass, token handling), code-reviewer (naming, structure, DRY, complexity), performance-analyzer (N+1 queries, unnecessary allocations). Each reports findings with CRITICAL/HIGH/LOW severity. The lead synthesizes findings, deduplicates overlapping concerns, and produces a prioritized list. Add `--fix` and the pipeline routes each CRITICAL finding back through an execution agent to be patched.

## Documentation

| Resource | Content |
|----------|---------|
| `CLAUDE.md` | Complete architecture and agent reference |
| `docs/` | 28 guides and references (architecture, commands, skills, team mode, etc.) |
| `.claude/rules/` | 20 modular topic-specific rules |
| `SECURITY.md` | Security policy and vulnerability reporting |

## Version History

See `docs/RELEASE_NOTES.md` for detailed history. Recent:

- **V10.22.7** -- Hook dedup guard, 4 new hooks (statusline, session-init-gate, model-routing-advisor, approval-gate), production blockers fixed
- **V10.22.6** -- Agent Skills spec compliance: frontmatter aligned with agentskills.io spec
- **V10.22.5** -- Plugin manifest aligned with Anthropic ecosystem patterns
- **V10.22.0** -- Two-stage review protocol (spec compliance then code quality), 5 superpowers-inspired pipeline improvements
- **V10.21.0** -- Stale agent count fixes, plugin audit improvements
- **V10.20.0** -- 23 agent communication gap fixes from system-wide audit, 4 missing growth agents added (Growth 35->39)
- **V10.18.0** -- Vibe field on all 214 agents, agent export script, worktree isolation, guard command pattern, skill chaining, commit-before-verify, when-stuck protocol
- **V10.16.0** -- Session ID naming overhaul with readable slugs, agent_id linking in coordination_log for AgentPath
- **V10.15.0** -- Redesigned TodoWrite templates with hierarchy, indentation, and granularity
- **V10.14.0** -- Post-completion follow-up handling in /run pipeline
- **V10.13.0** -- Standardize session tracking schemas across all 6 skills
- **V10.12.0** -- AgentPath plugin integration with 15 session visualization improvements
- **V10.11.0** -- Agent reorganization (5 consolidations, 11 renames, 3 tier fixes), gstack-inspired improvements
- **V10.9.0** -- Documentation overhaul, concise help text, version-registry rule
- **V10.6.0** -- Confidence tiers, blind review, dead-letter queue, handoff documents, signal file intervention
- **V10.5.0** -- Clean team lifecycle, hook reliability
- **V10.3.0** -- Creative domain overhaul (24->30 agents, all on Opus 4.6)
- **V10.0.0** -- 8 business domains, agent chaining with topological execution

## AgentPath - Session Visualizer

[AgentPath](https://github.com/CaelanDrayer/AgentPath) *(incoming)* is a companion web UI for visualizing cAgents session data. It reads from `Agent_Memory/sessions/` and renders agent trees, pipeline timelines, work item DAGs, and file change logs in real time.

## License

MIT License - See [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | 214 agents across 8 business domains | Powered by Claude Opus 4.6, Sonnet 4.6, and Haiku 4.5

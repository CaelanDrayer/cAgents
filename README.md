# cAgents

**Your AI Workforce for Claude Code**

Deploy 58 specialized agents across 9 builder-role archetypes through an intelligent pipeline that routes your request, plans execution, decomposes work, coordinates specialists, reviews outputs, and validates quality — automatically.

> **cAgents is domain-agnostic — it is NOT a software-engineering tool.** The same pipeline that fixes a bug also drafts a legal contract, plans a marketing campaign, writes a novel chapter, builds a financial model, designs a curriculum, or produces a client SOW with a price quote. It routes on *what you ask for* — across engineering, legal, finance, marketing, sales, HR, health, education, creative, operations, and research. The 58-agent catalog spans all of these; code is one domain among many. If a request looks non-technical, that is not a reason to avoid cAgents — it is exactly what the operator/advisor/analyst/creator/writer/strategist archetypes exist for.

| Stat | Value |
|------|-------|
| Agents | 58 across 9 archetypes (developer/operator/advisor/analyst/creator/writer/strategist/core/leadership) |
| Skills | 4 slash commands (v12.2.0: /org folded into /team strategic mode; v12.1.2: /improve folded into /run) |
| Hooks | 32 .cjs files = 24 unique registered hooks + 5 dispatched sub-validators (run by write-edit-dispatch.cjs + agent-dispatch.cjs) + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs library, across 18 event types |
| Models | Opus 4.8 (controllers) · Sonnet 4.6 (execution) · Haiku 4.5 (support) |

---

## Is cAgents Right for You?

**Use cAgents if you need:**
- Multi-step task orchestration with automatic routing, planning, and coordination
- Cross-domain work (engineering + business + creative + growth in one request)
- Parallel execution with quality-gated waves (40-60% faster for complex tasks)
- Consistent delegation patterns across 9 archetypes (58 agents, 42 routable)
- Reviewer loops, confidence scoring, and revision routing built into every run

**cAgents is NOT for you if:**
- You need a quick single-file fix — use Claude Code directly, it is faster and cheaper
- You want minimal token usage — cAgents consumes 10-50x more tokens per request for orchestration overhead
- You only work in a single narrow area — the orchestration overhead may not be worth it for isolated tasks

---

## Usage Warning

cAgents spawns 3-10+ subagents per request. Each consumes API tokens independently. A single `/run` can use 10-50x more tokens than a direct Claude Code interaction. `/team` (especially strategic mode) amplifies this further. Monitor usage closely.

---

## Requirements

- **Claude Code 2.1.69+** (required)
- **Node.js** (recommended) — powers 24 unique registered hooks + 5 dispatched sub-validators (32 .cjs files = hooks + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs library) for session management, secret detection, team coordination, and completion verification

| cAgents | Min Claude Code | Highlights |
|---------|----------------|------------|
| 12.x (current) | 2.1.69+ (2.1.172+ recommended) | Agent-catalog consolidation, concurrent-Agent team waves, GuardFall bash-guard hardening, curated example store; deep subagent nesting on CC 2.1.172+ |
| 11.x | 2.1.69+ | Builder-role archetype tree, skill consolidation |
| 10.x | 2.1.47+ | Confidence tiers, blind review, agent chaining |

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

Four commands. Four different capabilities. Note how the examples span domains — code is just one of them.

```bash
# Produce a client deliverable (business / sales) — no code involved
/run Draft a statement of work and price quote for a Dropbox-to-SharePoint data migration, with a detailed assumptions list

# Coordinate strategy across domains with C-suite analysis (strategic mode auto-enables)
/team Plan our Q3 product roadmap

# Route a bug fix to the engineering domain automatically
/run Fix the authentication bug in src/auth.ts

# Explore ANY design problem interactively — software or not
/designer Design a 6-week onboarding curriculum
```

The pipeline detects the domain, selects the appropriate controller, decomposes the work into items with acceptance criteria, and coordinates specialist agents — without you specifying a single agent name. The same machinery serves a legal memo, a marketing campaign, a financial model, or a short story just as readily as a code change.

---

## Skills Reference

### `/run` — Task Execution Pipeline

Routes any request through the full pipeline: orchestrator enriches context, planner defines objectives + decomposes work into items with acceptance criteria + assembles delegation prompts, a controller coordinates specialists, and a validator confirms quality. (v12.0.0 folded the standalone task-decomposer and prompt-engineer agents into the planner.)

```bash
/run Fix the auth bug in src/auth.ts
/run Write a sci-fi short story set on a generation ship
/run Plan Q4 product launch campaign
/run Design onboarding program for new engineers
/run Create knowledge base article on our refund policy
/run Fix auth bug --analytics    # Show execution metrics after run
```

The domain routes automatically based on request content. Engineering requests go to a tech-lead controller; creative requests go to a narrative-director; business requests go to an operations-manager or strategic-planner.

### `/team` — N-Wave Parallel Execution

Decomposes work into parallel waves. Teammates execute simultaneously within each wave; a quality gate validates before the next wave starts. Tier 3+ defaults to 5-7 waves.

```bash
/team Implement OAuth2 authentication
/team Build user dashboard --waves 8   # Force minimum 8 waves
/team Build feature --dry-run          # Preview wave structure before running
/run Build feature --team              # Team mode via flag on /run
```

Each teammate is a controller that spawns execution agents directly. Wave 0 handles scaffolding and interface contracts; middle waves parallelize implementation; the final wave handles integration and validation.

### Cross-Domain Strategic Coordination via `/team --strategic` (v12.2.0+)

`/org` was removed in v12.2.0 and absorbed into `/team` strategic mode. The full executive layer — CEO inline logic, parallel C-suite analysis, cross-domain deliberation, unified strategic brief, dependency-ordered per-domain dispatch — now runs inside `/team`. Strategic mode auto-enables when `router.domain_count >= 2`; force-enable with `--strategic` (single-domain executive framing) or force-disable with `--no-strategic` (flat multi-wave).

```bash
/team Launch new product with campaign          # auto-enables strategic mode (multi-domain)
/team Fix auth bug                              # single-domain routes through flat /team
/team Restructure engineering team --strategic  # force-enable for single-domain executive framing
/team Migrate to microservices --dry-run        # preview routing decision
```

Single-domain simple requests still favor `/run`; single-domain complex work runs as flat parallel `/team`; multi-domain requests trigger Wave 0/1/2 C-suite deliberation plus Wave 3..N per-domain dispatch.

### `/designer` — Interactive Design Exploration

Guides design exploration through structured Q&A before building anything. Research agents pre-build context-rich question lists per phase. Unlike other skills, `/designer` waits for your responses at each step — it does not auto-proceed.

```bash
/designer Redesign the checkout flow
/designer Plan the data model for a multi-tenant SaaS
/designer Define the API contract for the notifications service
```

A 4-dimension clarity score tracks readiness; implementation does not begin until ambiguity drops below 20%. Phase overlap starts next-phase research during the current phase to reduce wait time.

### Improve Modes inside `/run` — Quality Review and Optimization

Quality review and measurable optimization are available as modes on `/run`. The standalone `/improve` skill was folded into `/run` in v12.1.2 via a first-word keyword router. Mode selection via the keyword or via `--mode review|optimize|full`.

```bash
/run review src/auth/                              # = --mode review (audit only)
/run audit src/auth/                               # = --mode review (alias for review)
/run review src/api/ --auto-fix                    # Auto-patch CRITICAL findings
/run optimize src/db/queries.ts                    # = --mode optimize (measure, change, verify)
/run improve src/                                  # = --mode full (review then optimize)
/run review src/ --baseline                        # Establish quality baseline
/run review src/ --suppress baseline               # Show only regressions
```

Review mode runs parallel specialist reviewers (security-engineer, code-reviewer, performance-analyzer) and produces severity-tagged findings with file:line evidence. Optimize mode benchmarks before and after, rolls back on regression, and tracks pattern effectiveness across sessions.

V11.0.0 consolidated `/review` and `/optimize` into `/improve`. v12.1.2 folded `/improve` into `/run` via the keyword router. See `.claude/skills/run/reference/improve-mode.md` for the full contract and [docs/MIGRATION-V11.md](docs/MIGRATION-V11.md) for the V11 migration baseline.

### `/helper` — Command Guidance

Recommends the right skill based on your task description. Use it when you are unsure whether to reach for `/run` or `/team` (with or without `--strategic`).

```bash
/helper
/helper I need to refactor the entire auth module
/helper --troubleshoot              # Diagnose why a previous skill run failed
```

---

## Domain Breakdown

### Canonical: 9 Archetypes (V11.1.0+)

Since v11.1.0, the agent catalog (58 agents as of v12.35.0) is organized as a builder-role archetype tree:

| Archetype | Agents | Scope |
|-----------|-------:|-------|
| **Developer** | 8 | Backend, frontend, fullstack, infrastructure, quality (5 branches) |
| **Operator** | 7 | Support, business-ops, people-ops, marketing-sales, content (5 branches) |
| **Advisor** | 4 | Legal, health, education, personal (4 branches) |
| **Analyst** | 5 | Data science, BI, research, social science |
| **Writer** | 4 | Narrative, editorial |
| **Creator** | 2 | Visual artists, audiovisual creators |
| **Strategist** | 3 | Product owners, portfolio managers, planners |
| **Core** | 16 | Pipeline infrastructure (trigger, orchestrator, planner, reviewer, etc.) |
| **Leadership** | 9 | C-suite executives — used by `/team` strategic mode (v12.2.0+; pre-v12.2.0 used by `/org`) |
| **TOTAL** | **58** | |

### Legacy: 13-Domain Routing Overlay (2 dirs on disk + 11 consolidated)

The router and planner still consume legacy domain routing config (controller_catalog + router_keywords). On disk only **2 overlay dirs** survive — `agents/_overlay/people/` and `agents/_overlay/shared/` (config-only, no SKILL.md files); the other **11 legacy domains** were consolidated into `cagents-memory/_system/config/routing.yaml`. Either way, domain-keyworded requests still find the right archetype controller. The table below lists the legacy domains and how they map to the canonical archetypes.

| Legacy Domain | Maps to Archetypes |
|---------------|---------------------|
| **Engineering** (31 routing slots) | Most of `developer/` + parts of `operator/infrastructure` |
| **Creative** (30 routing slots) | `creator/` + parts of `writer/` |
| **Business** (28 routing slots) | `strategist/` + `operator/business-ops` |
| **Growth** (34 routing slots) | `operator/marketing-sales` + parts of `writer/` |
| **People** (17 routing slots) | `operator/people-ops` |
| **Service** (28 routing slots) | `operator/support` + `advisor/legal` |
| **Leadership** | `leadership/` (used by `/team` strategic mode in v12.2.0+; pre-v12.2.0 used by `/org`) |
| **Shared/Science/Health/Education/Personal/Arts/Trades** | `analyst/` + `advisor/{health,education,personal}` + `creator/` |

**Engineering (31)** handles the full software stack: backend-developer, frontend-developer, devops-engineer, security-engineer, qa-lead, architect, dba, performance-analyzer, and 23 more. Use `/run Fix the bug` or `/team Build the feature` and the pipeline routes here automatically for software tasks.

**Creative (30)** covers long-form and short-form writing: prose-stylist, dialogue-specialist, plot-developer, narrative-director, character-psychologist, worldbuilder, and 24 more. Use `/run Write a mystery short story` and the narrative-director controller coordinates the right specialists.

**Growth (34)** is the largest domain: copywriter, marketing-strategist, seo-specialist, demand-generation-manager, sales-strategist, and 29 more. Use `/run Plan the Q4 content calendar` and the marketing-strategist controller coordinates the campaign team.

**Service (28)** covers support and legal: customer-success-manager, general-counsel, compliance-officer, technical-writer, legal-analyst, and 23 more. Use `/run Draft an EULA for our SaaS product` and the general-counsel controller coordinates the legal team.

---

## Architecture

### `/run` — Event-Driven Pipeline

`/run` is a config-driven state machine. Each stage writes a file that triggers the next stage.

```
User Request
  |
  +-> /run  (state machine loop, reads pipeline_config.yaml)
        |
        INIT          -> orchestrator  -> enriched_context.yaml
        ORCHESTRATED  -> planner       -> plan.yaml + work_items.yaml
        PLANNED       -> controller    -> coordination_log.yaml
              |
              +-> execution agent  (implements work item)
              |     +-> reviewer   Stage 1: spec compliance
              |                    Stage 2: code quality
              |                    REVISE -> back to execution agent (max 3 rounds)
              |
              +-> (repeat per work item, dependency-ordered)
        COORDINATED   -> validator     -> validation_report.yaml
        VALIDATED     -> complete
              FAIL   -> re-run controller   (max 3 cycles)
              REVISE -> re-run planner      (max 3 cycles)
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

The pipeline detects tier automatically. Tier-2-clear requests use a `fast` path that skips the orchestrator enrichment agent; tier 3+ runs the full `standard` path.

---

## Key Features

### Goal Drift Prevention

After context compaction, the `post-compact-restore.cjs` hook reads the active `plan.yaml` and re-injects the mission, domain, phase, and work-item progress into the model's context window. An agent given 30 work items 40 tool calls ago still acts on the original objectives — not on whatever survived the compaction.

This fires automatically — no prompt engineering required. It is a no-op when there is no active session, so it does not affect ordinary Claude Code usage.

### Lifecycle Hooks

cAgents ships 32 .cjs files = 24 unique registered hooks + 5 dispatched sub-validators (run in-process by write-edit-dispatch.cjs and agent-dispatch.cjs, the D1b/A2-12 consolidating dispatchers) + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs (GuardFall evaluator library require'd by bash-validator.cjs). The hooks fire across 18 of Claude Code's 24 event types:

| Event | Hook | Purpose |
|-------|------|---------|
| SessionStart | session-catchup.cjs | Detect incomplete sessions, inject cAgents context |
| SessionEnd | team-stop.cjs | Finalize team metrics and update session status |
| UserPromptSubmit | prompt-router.cjs | Enforce delegation rules + natural-language routing suggestions |
| PreToolUse[Bash] | bash-validator.cjs | Block dangerous commands and data exfiltration attempts |
| PreToolUse[Write\|Edit] | secret-detection.cjs | Block writes containing API keys, tokens, credentials |
| PreToolUse[Write\|Edit] | controller-delegation-validator.cjs | Warn when controllers write implementation files |
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
| TeammateIdle | teammate-idle-handler.cjs | Find available work or cleanly stop idle teammates (experimental named-teammate path only) |
| TaskCompleted | team-task-complete.cjs | Update task list, unblock dependencies (experimental named-teammate path only) |
| InstructionsLoaded | instructions-loaded.cjs | Validate rules directory, inject session context |
| PreCompact | pre-compact-save.cjs | Save workflow state before context compaction |
| PostCompact | post-compact-restore.cjs | Re-inject workflow context after compaction |

### Confidence Scoring

Every completed work item includes a confidence score (0.0–1.0) and rationale. Items below 0.7 trigger additional scrutiny: the reviewer applies stricter criteria and the controller flags them in the coordination log.

### Two-Stage Review Protocol

The reviewer loop runs two distinct stages in strict order:

1. **Stage 1 — Spec Compliance**: Does the implementation meet every acceptance criterion? Evidence must cite specific file:line. No quality judgments at this stage.
2. **Stage 2 — Code Quality**: Is the implementation well-written and maintainable? Runs only after Stage 1 passes. Findings are severity-tagged (CRITICAL/HIGH/LOW). REVISE triggers only for CRITICAL or two or more HIGH findings.

This prevents marking work complete when it looks clean but misses requirements.

### Aggressive Decomposition

The planner breaks even simple requests into 30+ work items with explicit acceptance criteria, dependency graphs, and agent assignments. Work items execute in topological order; independent items execute in parallel.

---

## Domain Routing

cAgents routes your request to the right domain automatically based on keywords. No configuration needed — just describe what you want.

| Request | Routed To | Controller |
|---------|-----------|------------|
| `/run Fix the auth bug` | Engineering | tech-lead |
| `/run Write a blog post about AI` | Creative | narrative-director |
| `/run Plan Q4 product launch` | Business | operations-manager |
| `/run Build an email campaign` | Growth | marketing-strategist |
| `/run Create onboarding program` | People | hr-manager |
| `/run Draft our privacy policy` | Service | general-counsel |

For cross-domain work that spans multiple areas (e.g., launching a product requires engineering, marketing, and ops), use `/team` — strategic mode auto-engages when `router` detects 2+ domains and coordinates C-suite agents across domains automatically (v12.2.0+; pre-v12.2.0 this was `/org`).

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
| **Agent count** | 58 | 3–5 | 3–5 |
| **Business domains** | 9 archetypes (2 routing overlays + 11 consolidated) | 1 (engineering) | 1 (engineering) |
| **Pipeline state machine** | Yes — PASS/FAIL/REVISE routing, max 3 cycles | No | No |
| **Parallel team execution** | Yes — N-wave with per-wave quality gates | No | No |
| **Revision loops** | Yes — executor + reviewer, max 3 rounds per work item | No | No |
| **Two-stage review** | Yes — spec compliance then code quality | No | No |
| **Hook lifecycle** | 24 unique registered hooks + 5 dispatched sub-validators across 18 event types | 1–4 hooks | 1–4 hooks |
| **Goal drift prevention** | Yes — attention injection on every Write/Edit/Bash | No | No |
| **Confidence scoring** | Yes — 0.0–1.0 per work item, low scores trigger scrutiny | No | No |
| **Cross-domain orchestration** | Yes — `/team` strategic mode fires full C-suite hierarchy (auto-enabled when `domain_count >= 2`) | No | No |

Numbers for cAgents reflect the current release. Official plugin figures are approximate based on publicly available descriptions.

---

## Real Workflow Examples

### Multi-Domain Strategy: `/team Plan Q3 product launch` (auto-enables strategic mode)

`/team` detects two or more domains in the request (engineering + business + growth) and auto-enables strategic mode. The CEO inline logic fires first and determines which C-suite agents are needed: CTO for technical feasibility, CPO for roadmap fit, CMO for go-to-market.

CTO, CPO, and CMO each analyze the request independently in Wave 0/1, writing their analyses to separate YAML files. Each then reads the others' analyses before a Wave 2 deliberation phase where they surface conflicts and cross-domain dependencies. The CMO flags that the marketing timeline assumes a launch date the CTO says is unrealistic. The deliberation resolves this with a phased launch plan.

The result is a unified strategic brief. `/team` then dispatches Wave 3..N per-domain: the engineering team plans the feature work, the marketing team plans the campaign, each using the strategic brief as shared context. (Pre-v12.2.0 this workflow was `/org` invoking sequential `/team` runs per domain; v12.2.0 fused both steps into a single `/team` session with nested waves.)

### Full-Stack Feature: `/team Build user dashboard`

Wave 0 (lead, sequential): scaffolding, interface contracts between frontend and backend, database schema decisions written to a contracts file that all subsequent waves read.

Wave 1 (parallel, 3 teammates): backend-developer builds the API endpoints against the contract, frontend-developer builds the component tree consuming that API contract, dba validates the schema against query patterns.

Wave 2 (parallel, 2 teammates): qa-lead writes integration tests covering the API and UI, accessibility-checker audits the component tree.

Wave 3 (lead, sequential): integration, final test run, validation report. Each wave is gated — the next wave does not start until the current wave's quality criteria pass. Total execution time: 40-60% less than sequential.

### Quality Review: `/run review src/auth/ --auto-fix`

Three reviewers run in parallel: security-engineer (injection, auth bypass, token handling), code-reviewer (naming, structure, DRY, complexity), performance-analyzer (N+1 queries, unnecessary allocations). Each reports findings with CRITICAL/HIGH/LOW severity, citing specific file:line evidence.

The lead synthesizes findings, deduplicates overlapping concerns, and produces a prioritized list. Because `--fix` was passed, each CRITICAL finding routes through an execution agent to be patched. The patches re-enter the review pipeline to confirm the finding is resolved before the overall review marks complete.

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
| `.claude/rules/` | 43 modular topic-specific rules loaded by agents |
| `docs/SECURITY.md` | Security policy and vulnerability reporting |

---

## External Resources

Key external tools and libraries that cAgents depends on:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic's CLI for Claude, required runtime for cAgents
- [Node.js](https://nodejs.org/) — JavaScript runtime powering cAgents hooks and scripts
- [Vitest](https://vitest.dev/) — Test framework used by the cAgents test suite
- [tmux](https://github.com/tmux/tmux/wiki) — Terminal multiplexer used for team mode split panes (the OPTIONAL experimental named-teammate path; the default concurrent-Agent path needs no tmux)
- [js-yaml](https://github.com/nodeca/js-yaml) — YAML parser used throughout session state management
- [ajv](https://ajv.js.org/) — JSON Schema validator used for configuration validation

---

## Version History

See `docs/RELEASE_NOTES.md` for the complete history. Recent highlights:

- **V12.43.0** — Current release. Bucket-D hook security/performance remediation (session `run_bucket-d-remediation_260614_001`): added a bounded head+tail size cap to `secret-detection.cjs` (`CAGENTS_SECRET_SCAN_MAX_BYTES`, default 512 KB) to prevent a memory/latency blowup on large writes; consolidated the three `Write|Edit` PreToolUse hooks (secret-detection, controller-delegation-validator, skill-size-monitor) into a single deny-first, fail-closed `write-edit-dispatch.cjs` dispatcher (cold-start node spawns per Write|Edit cut 3→1); added a reproducible perf-benchmark corpus runner + Write|Edit hook-perf microbench with committed baselines; and fixed `verify-completion.cjs` to fact-check slash-less filename citations.
- **V12.10.0** — FU-3 bare-prose agent-name sweep: replaced the last bare `universal-*` agent-name mentions in agent prose (the five pipeline agents — router, planner, validator, executor, self-correct) across 25 `agents/**` files, completing the v12.5.0 pipeline-agent rename. Added a `no-bare-universal-prose-refs` regression guard.
- **V12.2.0** — BREAKING: `/org` skill removed; cross-domain coordination folded into `/team` with auto-enabled strategic mode (`router` `domain_count >= 2` triggers Wave 0/1/2 C-suite deliberation + Wave 3..N per-domain dispatch). 12 leadership agents preserved at their existing locations. Plugin skill count 5->4. Migration: `/org X` → `/team X`.
- **V12.1.2** — Folds `/improve` into `/run` via a first-word keyword router and removes the standalone `/improve` skill (`/run review|audit` = `--mode review`, `/run optimize` = `--mode optimize`, `/run improve` = `--mode full`). Plugin skill count 6->5.
- **V12.0.0** — Consolidation release: pipeline collapse 7->5 states (task-decomposer + prompt-engineer folded into planner), engineering-manager merged into tech-lead, architecture-reviewer collapsed into `architect --review` mode flag, 13 marketing-sales agents absorbed (38->25), chief-legal-officer renamed to clo, 11 legacy domain dirs deleted, `cagents-memory/_communication/` removed, max_revision_cycles 5->3, execution self-validation reduced 15->5 hook-verifiable checks. Total agents 251->238.
- **V11.3.0** — Plugin health sweep: archetype-canonical doc alignment (9 archetypes canonical, 15 domains as routing overlay), 109 stale `related_agents` cross-references swept, hook-count assertions corrected (26 unique registered, 29 .cjs total), `sync-agents.sh --check` dry-run flag added, `validate-versions.sh` pruned to 18 canonical slots, regression tests added.
- **V11.1.3** — Removed statusLine hook and status bar integration.
- **V11.0.0** — Removed deprecated skills `/review`, `/optimize`, `/context`, `/debug`. `/review` and `/optimize` consolidated into `/improve` (`--mode review|optimize|full`); `/context` replaced by `/run context …` passthrough; `/debug` replaced by `/run --mode debug`. See [docs/MIGRATION-V11.md](docs/MIGRATION-V11.md) for the migration guide.
- **V10.23.0** — 29-check validation framework, regression validation chain, mandatory self-validation protocol for execution agents
- **V10.22.0** — Two-stage review protocol (spec compliance then code quality), 5 pipeline improvements
- **V10.20.0** — 23 agent communication gap fixes, Growth domain expanded from 35 to 39 agents
- **V10.18.0** — Vibe field on all 243 agents, worktree isolation, guard command pattern, skill chaining, commit-before-verify pattern
- **V10.16.0** — Session ID naming overhaul with readable slugs, agent_id linking in coordination_log
- **V10.12.0** — External session-visualizer integration with 15 session-data improvements (contract dropped in v12.6.0)
- **V10.6.0** — Confidence tiers, blind review, dead-letter queue, handoff documents
- **V10.3.0** — Creative domain overhaul (24 to 30 agents, all on Opus 4.6)
- **V10.0.0** — 8 business domains, agent chaining with topological execution

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | 58 agents across 9 archetypes | Opus 4.8 · Sonnet 4.6 · Haiku 4.5

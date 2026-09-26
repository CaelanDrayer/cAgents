# cAgents

**Your AI Workforce for Claude Code**

Deploy 60 specialized agents across 9 builder-role archetypes. An intelligent pipeline routes your request, plans the execution, and decomposes the work. It then coordinates specialists, reviews outputs, and validates quality automatically.

> **cAgents is domain-agnostic. It is NOT a software-engineering tool.** The same pipeline that fixes a bug also drafts a legal contract or plans a marketing campaign. It writes a novel chapter, builds a financial model, designs a curriculum, or produces a client SOW with a price quote. It routes on *what you ask for*, across engineering, legal, finance, marketing, sales, HR, health, education, creative, operations, and research. The 60-agent catalog spans all of these, and code is one domain among many.
>
> A request that looks non-technical is not a reason to avoid cAgents. It is exactly what the operator/advisor/analyst/creator/writer/strategist archetypes exist for.

| Stat | Value |
|------|-------|
| Agents | 60 across 9 archetypes (developer/operator/advisor/analyst/creator/writer/strategist/core/leadership) |
| Skills | 4 slash commands (v12.2.0: /org folded into /team strategic mode; v12.1.2: /improve folded into /act) |
| Hooks | 32 .cjs files = 24 unique registered hooks + 5 dispatched sub-validators (run by write-edit-dispatch.cjs + agent-dispatch.cjs) + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs library, across 18 event types |
| Models | Opus 4.8 (controllers / high-reasoning) · Sonnet 4.6 (execution). The catalog uses no `model: haiku` / `tier: support`; both remain available via `model_routing.yaml` |

---

## Is cAgents Right for You?

**Use cAgents if you need:**
- Multi-step task orchestration with automatic routing, planning, and coordination
- Cross-domain work (engineering + business + creative + growth in one request)
- Parallel execution with quality-gated waves (40-60% faster for complex tasks)
- Consistent delegation patterns across 9 archetypes (60 agents, 44 routable)
- Reviewer loops, confidence scoring, and revision routing built into every run

**cAgents is NOT for you if:**
- You need a quick single-file fix. Use Claude Code directly, because it is faster and cheaper.
- You want minimal token usage. cAgents consumes 10-50x more tokens per request for orchestration overhead.
- You only work in a single narrow area. The orchestration overhead may not be worth it for isolated tasks.

---

## Usage Warning

cAgents spawns 3-10+ subagents per request. Each consumes API tokens independently. A single `/act` can use 10-50x more tokens than a direct Claude Code interaction. `/team` (especially strategic mode) amplifies this further. Monitor usage closely.

---

## Requirements

- **Claude Code 2.1.69+** (required)
- **Node.js** (recommended). It powers 24 unique registered hooks + 5 dispatched sub-validators (32 .cjs files = hooks + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs library). Those hooks handle session management, secret detection, team coordination, and completion verification.

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

Four commands. Four different capabilities. Note how the examples span domains. Code is just one of them.

```bash
# Produce a client deliverable (business / sales): no code involved
/act Draft a statement of work and price quote for a Dropbox-to-SharePoint data migration, with a detailed assumptions list

# Coordinate strategy across domains with C-suite analysis (strategic mode auto-enables)
/team Plan our Q3 product roadmap

# Route a bug fix to the engineering domain automatically
/act Fix the authentication bug in src/auth.ts

# Explore ANY design problem interactively: software or not
/designer Design a 6-week onboarding curriculum
```

The pipeline detects the domain and selects the appropriate controller. It decomposes the work into items with acceptance criteria. It then coordinates specialist agents, and you never specify a single agent name. The same machinery serves a legal memo, a marketing campaign, a financial model, or a short story just as readily as a code change.

---

## Skills Reference

### `/act` — Task Execution Pipeline

Routes any request through the full pipeline. The orchestrator enriches the context. The planner defines the objectives, decomposes work into items with acceptance criteria, and assembles the delegation prompts. A controller coordinates the specialists, and a validator confirms quality. (v12.0.0 folded the standalone task-decomposer and prompt-engineer agents into the planner.)

```bash
/act Fix the auth bug in src/auth.ts
/act Write a sci-fi short story set on a generation ship
/act Plan Q4 product launch campaign
/act Design onboarding program for new engineers
/act Create knowledge base article on our refund policy
/act Fix auth bug --analytics    # Show execution metrics after run
```

The domain routes automatically based on request content. Engineering requests go to a tech-lead controller; creative requests go to a narrative-director; business requests go to an operations-manager or strategic-planner.

### `/team` — N-Wave Parallel Execution

Decomposes work into parallel waves. Teammates execute simultaneously within each wave; a quality gate validates before the next wave starts. Tier 3+ defaults to 5-7 waves.

```bash
/team Implement OAuth2 authentication
/team Build user dashboard --waves 8   # Force minimum 8 waves
/team Build feature --dry-run          # Preview wave structure before running
/act Build feature --team              # Team mode via flag on /act
```

Each teammate is a controller that spawns execution agents directly. Wave 0 handles scaffolding and interface contracts; middle waves parallelize implementation; the final wave handles integration and validation.

### Cross-Domain Strategic Coordination via `/team --strategic` (v12.2.0+)

`/org` was removed in v12.2.0 and absorbed into `/team` strategic mode. The full executive layer now runs inside `/team`: CEO inline logic, parallel C-suite analysis, cross-domain deliberation, a unified strategic brief, and dependency-ordered per-domain dispatch. Strategic mode auto-enables when `router.domain_count >= 2`; force-enable with `--strategic` (single-domain executive framing) or force-disable with `--no-strategic` (flat multi-wave).

```bash
/team Launch new product with campaign          # auto-enables strategic mode (multi-domain)
/team Fix auth bug                              # single-domain routes through flat /team
/team Restructure engineering team --strategic  # force-enable for single-domain executive framing
/team Migrate to microservices --dry-run        # preview routing decision
```

Single-domain simple requests still favor `/act`. Single-domain complex work runs as flat parallel `/team`. Multi-domain requests trigger Wave 0/1/2 C-suite deliberation plus Wave 3..N per-domain dispatch.

### `/designer` — Interactive Design Exploration

Guides design exploration through structured Q&A before building anything. Research agents pre-build context-rich question lists per phase. Unlike other skills, `/designer` waits for your responses at each step. It does not auto-proceed.

```bash
/designer Redesign the checkout flow
/designer Plan the data model for a multi-tenant SaaS
/designer Define the API contract for the notifications service
```

A 4-dimension clarity score tracks readiness; implementation does not begin until ambiguity drops below 20%. Phase overlap starts next-phase research during the current phase to reduce wait time.

### Improve Modes inside `/act` — Quality Review and Optimization

Quality review and measurable optimization are available as modes on `/act`. The standalone `/improve` skill was folded into `/act` in v12.1.2 via a first-word keyword router. Mode selection via the keyword or via `--mode review|optimize|full`.

```bash
/act review src/auth/                              # = --mode review (audit only)
/act audit src/auth/                               # = --mode review (alias for review)
/act review src/api/ --auto-fix                    # Auto-patch CRITICAL findings
/act optimize src/db/queries.ts                    # = --mode optimize (measure, change, verify)
/act improve src/                                  # = --mode full (review then optimize)
/act review src/ --baseline                        # Establish quality baseline
/act review src/ --suppress baseline               # Show only regressions
```

Review mode runs parallel specialist reviewers (security-engineer, code-reviewer, performance-analyzer) and produces severity-tagged findings with file:line evidence. Optimize mode benchmarks before and after, rolls back on regression, and tracks pattern effectiveness across sessions.

V11.0.0 consolidated `/review` and `/optimize` into `/improve`. v12.1.2 folded `/improve` into `/act` via the keyword router. See `.claude/skills/act/reference/improve-mode.md` for the full contract and [docs/MIGRATION-V11.md](docs/MIGRATION-V11.md) for the V11 migration baseline.

### `/helper` — Command Guidance

Recommends the right skill based on your task description. Use it when you are unsure whether to reach for `/act` or `/team` (with or without `--strategic`).

```bash
/helper
/helper I need to refactor the entire auth module
/helper --troubleshoot              # Diagnose why a previous skill run failed
```

---

## Domain Breakdown

### Canonical: 9 Archetypes (V11.1.0+)

Since v11.1.0, the agent catalog (60 agents as of v12.55.0) is organized as a builder-role archetype tree:

| Archetype | Agents | Scope |
|-----------|-------:|-------|
| **Developer** | 8 | Backend, frontend, fullstack, infrastructure, quality (5 branches) |
| **Operator** | 8 | Support, business-ops, people-ops, marketing-sales, content (5 branches) |
| **Advisor** | 4 | Legal, health, education, personal (4 branches) |
| **Analyst** | 5 | Data science, BI, research, social science |
| **Writer** | 4 | Narrative, editorial |
| **Creator** | 3 | Visual artists, audiovisual creators |
| **Strategist** | 3 | Product owners, portfolio managers, planners |
| **Core** | 16 | Pipeline infrastructure (trigger, orchestrator, planner, reviewer, etc.) |
| **Leadership** | 9 | C-suite executives, used by `/team` strategic mode (v12.2.0+; pre-v12.2.0 used by `/org`) |
| **TOTAL** | **60** | |

### Legacy: 13-Domain Routing Overlay (2 dirs on disk + 11 consolidated)

The router and planner still consume legacy domain routing config (controller_catalog + router_keywords). On disk only **2 overlay dirs** survive: `agents/_overlay/people/` and `agents/_overlay/shared/` (config-only, no SKILL.md files). The other **11 legacy domains** were consolidated into `cagents-memory/_system/config/routing.yaml`. Either way, domain-keyworded requests still find the right archetype controller. The table below lists the legacy domains and how they map to the canonical archetypes.

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

**Engineering (31)** handles the full software stack: backend-developer, frontend-developer, devops-engineer, security-engineer, qa-lead, architect, dba, performance-analyzer, and 23 more. Use `/act Fix the bug` or `/team Build the feature` and the pipeline routes here automatically for software tasks.

**Creative (30)** covers long-form and short-form writing: prose-stylist, dialogue-specialist, plot-developer, narrative-director, character-psychologist, worldbuilder, and 24 more. Use `/act Write a mystery short story` and the narrative-director controller coordinates the right specialists.

**Growth (34)** is the largest domain: copywriter, marketing-strategist, seo-specialist, demand-generation-manager, sales-strategist, and 29 more. Use `/act Plan the Q4 content calendar` and the marketing-strategist controller coordinates the campaign team.

**Service (28)** covers support and legal: customer-success-manager, general-counsel, compliance-officer, technical-writer, legal-analyst, and 23 more. Use `/act Draft an EULA for our SaaS product` and the general-counsel controller coordinates the legal team.

---

## Architecture

### `/act` — Event-Driven Pipeline

`/act` is a config-driven state machine. Each stage writes a file that triggers the next stage.

```
User Request
  |
  +-> /act  (state machine loop, reads pipeline_config.yaml)
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

More waves produce more quality gates. Tier 3+ defaults to 5-7 waves. Use `--waves N` to set a minimum. Each teammate is a controller that spawns execution agents via the Agent tool. Teammates never implement directly.

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

After context compaction, the `post-compact-restore.cjs` hook reads the active `plan.yaml` and re-injects the mission, domain, phase, and work-item progress into the model's context window. An agent given 30 work items 40 tool calls ago still acts on the original objectives. It does not act on whatever survived the compaction.

This fires automatically, and it requires no prompt engineering. It is a no-op when there is no active session, so it does not affect ordinary Claude Code usage.

### Lifecycle Hooks

cAgents ships 32 .cjs files = 24 unique registered hooks + 5 dispatched sub-validators + hook-utils.cjs + run-hook.cjs launcher + bash-guard-evaluator.cjs. The 5 sub-validators run in-process under write-edit-dispatch.cjs and agent-dispatch.cjs, the D1b/A2-12 consolidating dispatchers. bash-guard-evaluator.cjs is the GuardFall evaluator library that bash-validator.cjs requires. The hooks fire across 18 of Claude Code's 24 event types:

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

1. **Stage 1, Spec Compliance**: Does the implementation meet every acceptance criterion? Evidence must cite specific file:line. No quality judgments at this stage.
2. **Stage 2, Code Quality**: Is the implementation well-written and maintainable? Runs only after Stage 1 passes. Findings are severity-tagged (CRITICAL/HIGH/LOW). REVISE triggers only for CRITICAL or two or more HIGH findings.

This prevents marking work complete when it looks clean but misses requirements.

### Aggressive Decomposition

The planner breaks even simple requests into 30+ work items with explicit acceptance criteria, dependency graphs, and agent assignments. Work items execute in topological order; independent items execute in parallel.

---

## Domain Routing

cAgents routes your request to the right domain automatically based on keywords. It needs no configuration. Just describe what you want.

| Request | Routed To | Controller |
|---------|-----------|------------|
| `/act Fix the auth bug` | Engineering | tech-lead |
| `/act Write a blog post about AI` | Creative | narrative-director |
| `/act Plan Q4 product launch` | Business | operations-manager |
| `/act Build an email campaign` | Growth | marketing-strategist |
| `/act Create onboarding program` | People | hr-manager |
| `/act Draft our privacy policy` | Service | general-counsel |

Use `/team` for cross-domain work that spans multiple areas. Launching a product, for example, requires engineering, marketing, and ops. Strategic mode auto-engages when `router` detects 2+ domains. It then coordinates C-suite agents across domains automatically (v12.2.0+; pre-v12.2.0 this was `/org`).

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
| **Agent count** | 60 | 3–5 | 3–5 |
| **Business domains** | 9 archetypes (2 routing overlays + 11 consolidated) | 1 (engineering) | 1 (engineering) |
| **Pipeline state machine** | Yes: PASS/FAIL/REVISE routing, max 3 cycles | No | No |
| **Parallel team execution** | Yes: N-wave with per-wave quality gates | No | No |
| **Revision loops** | Yes: executor + reviewer, max 3 rounds per work item | No | No |
| **Two-stage review** | Yes: spec compliance then code quality | No | No |
| **Hook lifecycle** | 24 unique registered hooks + 5 dispatched sub-validators across 18 event types | 1–4 hooks | 1–4 hooks |
| **Goal drift prevention** | Yes: attention injection on every Write/Edit/Bash | No | No |
| **Confidence scoring** | Yes: 0.0–1.0 per work item, low scores trigger scrutiny | No | No |
| **Cross-domain orchestration** | Yes: `/team` strategic mode fires the full C-suite hierarchy (auto-enabled when `domain_count >= 2`) | No | No |

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

Wave 3 (lead, sequential): integration, final test run, validation report. Each wave is gated. The next wave does not start until the current wave's quality criteria pass. Total execution time: 40-60% less than sequential.

### Quality Review: `/act review src/auth/ --auto-fix`

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
| `.claude/rules/` | 45 modular topic-specific rules loaded by agents |
| `docs/SECURITY.md` | Security policy and vulnerability reporting |

---

## External Resources

Key external tools and libraries that cAgents depends on:

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code): Anthropic's CLI for Claude, and the required runtime for cAgents
- [Node.js](https://nodejs.org/): the JavaScript runtime powering cAgents hooks and scripts
- [Vitest](https://vitest.dev/): the test framework used by the cAgents test suite
- [tmux](https://github.com/tmux/tmux/wiki): the terminal multiplexer used for team mode split panes (the OPTIONAL experimental named-teammate path; the default concurrent-Agent path needs no tmux)
- [js-yaml](https://github.com/nodeca/js-yaml): the YAML parser used throughout session state management
- [ajv](https://ajv.js.org/): the JSON Schema validator used for configuration validation

---

## Version History

See `docs/RELEASE_NOTES.md` for the complete history. Recent highlights (entries name the execution skill `/act` throughout; it was called `/run` before the rename):

- **V12.72.2** — Current release. Fixes headless subagents that failed on guarded Bash commands. `bash-validator.cjs` returned `permissionDecision: ask`, and a `dontAsk` session cannot answer a prompt, so the tool call failed. The hook now drops its `ask` verdicts when the payload has `permission_mode: dontAsk`, and the session's permission policy decides. Deny verdicts still apply in every mode. The force-push guard also stops matching `--force-with-lease`, the safe alternative its own message recommends: the pattern is now `--force(?![\w-])` in both `bash-validator.cjs` and `bash-guard-evaluator.cjs`.
- **V12.72.1** — Fixes a spurious warning that fired in every session of every project with cAgents installed: `.claude-plugin/plugin.json`'s `hooks` field pointed straight at the full `.claude/settings.json`, but Claude Code's plugin hooks manifest schema recognizes only `description` and `hooks` at the top level. The other settings.json keys (`env`, `permissions`, `worktree`, `teammateMode`, `displayOrigin`, `trustProjectMdFiles`, the `$comment` fields) tripped `hooks.json: unknown keys "..." ignored` on load. The hooks themselves still ran; only the warning was spurious. New `scripts/sync-plugin-hooks.cjs` generates `.claude/hooks.json`, a wrapper carrying only the `hooks` block, from `.claude/settings.json`, which stays the single source of truth for hook registration. `plugin.json` now points at the generated wrapper instead, and a regression test pins the two files against drift.
- **V12.72.0** — STE-100 writing standard, plus a judgment rewrite of the load-bearing prose surfaces. The new standard lives at `.claude/rules/quality/ste100-technical-writing.md` and derives from ASD-STE100 Simplified Technical English. A word-choice table sits at `.claude/rules/quality/resources/ste100-word-choices.md`. Ten mandates cover short sentences (20 words procedural, 25 descriptive), active voice and imperative, simple tenses, one term per concept, and flat structure. They also forbid em dashes in repository prose and require "shorten by simplifying, never by deleting". The standard carries `paths:` frontmatter covering `agents/**`, `.claude/rules/**`, `.claude/skills/**`, `.claude/hooks/**`, `docs/**`, `tests/**`, `CLAUDE.md` and `README.md`. Claude Code loads it whenever an agent edits those paths. That is the enforcement mechanism: every future edit is written to the standard by the agent making it. `scripts/ci/validate-ste100.sh` measures any file or file set on demand, backed by `scripts/ste100/rules.cjs`. Measurement tooling adds `scripts/ste100/metrics.sh`, `scripts/ste100/routability.sh` (an 87-case golden routability gate over agent descriptions), `scripts/ste100/invariants.sh`, and fixtures at `tests/fixtures/ste100/`. The release also rewrites 138 files by judgment across four surfaces: `.claude/rules/**`, `.claude/skills/**`, `agents/*.md` bodies, plus `CLAUDE.md` and `README.md`. Measured result across those 138 files: sentences over 25 words fell from 302 to 6, a 98 percent reduction, measured at the sentence level. Words rose from 138,077 to 153,098, a rise of 10.9 percent. That rise is the intended signature. The standard forbids shortening by deletion, so simplified prose gets longer, not shorter. Em dashes fell from 1,189 to 254. Nearly every survivor sits in a heading another file cites, in YAML frontmatter, inside a fenced block, or in a sentence a test asserts byte-identically. The line-based counters `long_lines_20` and `long_lines_25` ROSE. They are line-based proxies for a sentence-level rule, and they invert when short sentences share one physical line. An audit of the 763 long prose lines found 761 of them hold more than one sentence. Only 2 are genuinely one long sentence. The sentence-level rule is the real one. Two regressions are accepted and protected. `.claude/rules/core/hooks.md` went from 19 to 52 on `long_lines_20`, because a test caps that file at 400 lines and forces short sentences onto shared lines. Its sentence-level compliance is zero sentences over 25 words. Character wrapping was measured and is strictly worse on both counts. Do not "fix" either number. `.claude/skills/team/SKILL.md` now sits at 249 lines against a 250-line cap in `tests/v12/team-context-discipline.test.js`. That is one line of headroom. Any future edit to that file must cut a line or raise the cap deliberately. Agent descriptions are deliberately unchanged. The 24 descriptions over 300 characters were NOT rewritten. `tests/agents/description-quality.test.js` requires every `metadata.supported_modes` key to appear verbatim in the description. It also requires a literal `NOT for:` boundary, and it pins the length window at 120 to 1024 characters, not 300. For multi-mode agents the mode list plus the boundary already exceeds 300 characters. Shortening one means deleting a routing keyword. The `description:` field is the router's selection surface. The 87-case golden routability gate ran after every batch and reported `OK 87 cases` with zero drift throughout. NO MECHANICAL TRANSFORM SHIPPED. A deterministic rewrite script was built, reviewed five times by five independent methods, narrowed twice, and then abandoned. The count of NEW blocking defect classes found per independent review method ran 17, then 5, then 4, then 14, then 12. It never converged, so the remaining defect population was unknown rather than small. The final review killed even the two transforms that two earlier methods had certified safe. It found 3,386 manufactured comma splices and a diff that failed to apply on 138 of 718 files. It also found 10 broken test assertions and one broken CI gate. The decisive defect class needs no words changed at all. A counted framework asserts its count through punctuation. So "Porter's Five Forces — a, b, c, d, e" becomes six items and the sentence turns FALSE. No word-level or structural check can catch that. A green structural guard certifies structure and is blind to meaning. The hardened `invariants.sh` returned 1018 of 1018 passing while 152 meaning inversions were live in that same corpus. `scripts/ste100/mechanize.cjs` survives as a MEASUREMENT AND DETECTION harness with 98 passing tests. Its `--apply` path must never run corpus-wide. Coverage is exact: 138 of the 1,018 in-scope files were rewritten in this release. Counting earlier batches, 149 files total. `agents/*/resources/` (447 files) and `docs/**` were NOT rewritten, and neither was `CHANGELOG.md` or `docs/RELEASE_NOTES.md`. Corpus-wide the numbers moved modestly, exactly as that coverage implies: em dashes 6,632 to 5,443, sentences-over-25 proxy 3,472 to 3,166, words 712,547 to 731,755. Those surfaces converge incrementally, through the paths-scoped standard, as agents edit them. There was no corpus-wide sweep and there is no corpus-wide claim. Also in this release: `scripts/ci/validate-counts.sh` mismatches are fixed. All 60 agents moved to `metadata.model`, so the model configuration no longer contradicts the catalog.
- **V12.70.0** — Subagent spawning unblocked on clean machines, and denials made visible. The presence gate demanded `cagents-memory/`, which is **git-ignored**. So that directory does not exist in a fresh clone or plugin install. Dev machines carried stale non-terminal session dirs that kept the gate satisfied. Clean machines had none, so every Agent spawn was denied and the parent absorbed all the work itself. That is the whole "works here, blocked there" asymmetry, and the token blow-up behind it. The gate now self-heals the missing scaffold instead of denying. Non-`cagents:*` agents (`Explore`, `Plan`, `general-purpose`) are never gated. The agent catalog resolves from PLUGIN_ROOT rather than PROJECT_ROOT, which kills a false "not a registered agent" advisory that fired on every spawn. I/O errnos now fail OPEN and loud, because "I could not look" is not "there is nothing there". Genuine logic throws still fail closed. Denials were previously invisible by construction. `subagent-tracker.cjs` is registered for `SubagentStart`, which never fires for a spawn denied at `PreToolUse|Agent`. So `agent_tree.yaml` could only ever contain successes. A denial now writes a `spawn_failures:` record as EVIDENCE, not credit, and the child-count and stall probes cannot match it. Also: this release pins the `agent_tree.yaml` schema, and documents `name` as implying background (it silently overrides `run_in_background: false`). A new advisory per-subagent context aim arrives too: advisory only, no gate, no enforcement.
- **V12.69.0** — Approval-prompt fatigue fixed at the root. Replaying 439 Bash commands from 7 real sessions through the hook gave 417 silent allows, 20 `ask`, and 2 `deny`. With `defaultMode: auto`, those 22 hook verdicts WERE essentially the whole interactive prompt load. Both lexers (`tokenize()` and `extractParen()`) recognized `<<` as a redirect. Neither consumed the heredoc BODY, so body text was lexed as shell. One odd apostrophe in a commit message ("it's", "don't") threw `unterminated single quote` and downgraded a benign command to a prompt. Bodies are now skipped to their terminator, which matches bash exactly. That is sound, because bash feeds a heredoc body to the command on stdin and never executes it. No bypass: a shell reading its script from a heredoc is still recursed through the evaluator and still denies. Shipped alongside, constant propagation resolves `S=/tmp/scratch; rm -rf $S` to the real path. That is sharper both ways: a protected path now denies where it only asked before. 17 of the 22 friction events now pass silently, with no genuine warning removed.
- **V12.68.1** — Test-isolation hardening, with two load-dependent flakes fixed at the root. `team-stop.test.js` built its fixture inside the real shared `cagents-memory/sessions/` store. A concurrently-running live session could then trip team-stop's liveness guard and leave `phase`/`pipeline_state` unstamped. The fixture now uses a per-run temp project dir via `CLAUDE_PROJECT_DIR` + `CAGENTS_TEST_ROOT`. `session-catchup-liveness.test.js` used a 200ms liveness window. That window was narrower than the cost of spawning the hook under full-suite load. It aged its own "fresh" session out before it was read, so it is now widened to 10s. Two consecutive full runs: 2714 passing, 0 failed.
- **V12.68.0** — Flat agent layout, so Claude Code can discover the catalog at all. Claude Code registers plugin agents from a **non-recursive** scan of `agents/`. The nested `agents/{archetype}/[{branch}/]{agent-name}/SKILL.md` tree therefore registered nothing. `claude plugin details cagents` reported `Agents (0)`, and plugin validation reported "No agent files found in specified directories". Definitions moved to `agents/<name>.md`, and resources moved to `agents/<name>/resources/`. The release dropped the `agents` array from `plugin.json`, because its accepted shape differs across Claude Code versions (file paths vs directories). Omitting the array is the only form that works everywhere. The 9 archetypes and their branches are unchanged as a taxonomy. They now live in `archetype:` / `branch:` frontmatter. Discovery verified at `Agents (60)`. Also trims both plugin descriptions under the 500-character validation cap.
- **V12.67.0** — Stale-reference cleanup finishing the `/run` -> `/act` rename. This round swept six present-tense `/run` mentions from the CI scripts, `scripts/handoff/README.md`, and `delegation.md`. Two of those six sat in bare `{run,team}` form that a slash-anchored grep could not see. Three historical build-script comments got an annotation in place rather than a rewrite, so the v12.1.2 record stays true. The round also updated 12 of 13 `cagents:run` test-fixture literals, and kept one as the only back-compat coverage for legacy trees. It adds pins to the existing `act-rename-collision` regression guard. Reclassified as a minor bump: the tiny-bump guard caps a patch at 5 non-sync files, and this round touches 16.
- **V12.66.2** — Test-isolation hardening. Eight test files were creating fixtures inside the real shared `cagents-memory/sessions/` store. A sibling test asserting "there is no active session" could then resolve one of them through `findActiveSession`. The fix routes the fixtures through the existing `CLAUDE_PROJECT_DIR` injection point: no new interface, no hook signature change. Measured 16 leaked fixture directories before the fix and zero after. Pre-existing on `main`, not rename fallout.
- **V12.66.1** — Closing round of the `/run` -> `/act` rename, plus pre-existing defects the same audit surfaced. `validator-evidence-recheck.cjs` never parsed YAML block scalars, so it downgraded correct PASS verdicts on formatting alone. It also emitted duplicate `reason:` keys that dropped every failure explanation but the last. `package.json` still claimed 58 agents against 60 on disk. `docs/MIGRATION_GUIDE.md` plus three redirect stubs now point at `/act`.
- **V12.66.0** — BREAKING: `/run` is gone. Use `/act` instead. Claude Code now ships a built-in `run` skill, and the two names collide with no shim and no alias. Typing `/run` reaches Claude Code's built-in skill rather than the cAgents pipeline, and nothing warns you. Slash commands resolve inside the harness before any cAgents hook observes a tool call, so renaming was the only option. Flags and the keyword router carry over unchanged (`/act review src/`, `/act --mode debug ...`).
- **V12.19.0** — Bucket-D hook security/performance remediation (session `run_bucket-d-remediation_260614_001`). This round added a bounded head+tail size cap to `secret-detection.cjs` (`CAGENTS_SECRET_SCAN_MAX_BYTES`, default 512 KB). The cap prevents a memory and latency blowup on large writes. The round also consolidated the three `Write|Edit` PreToolUse hooks (secret-detection, controller-delegation-validator, skill-size-monitor) into a single deny-first, fail-closed `write-edit-dispatch.cjs` dispatcher. Cold-start node spawns per Write|Edit fell 3→1. It added a reproducible perf-benchmark corpus runner plus a Write|Edit hook-perf microbench with committed baselines. It also fixed `verify-completion.cjs` to fact-check slash-less filename citations.
- **V12.10.0** — FU-3 bare-prose agent-name sweep. This round replaced the last bare `universal-*` agent-name mentions in agent prose across 25 `agents/**` files. Those mentions named the five pipeline agents: router, planner, validator, executor, and self-correct. The sweep completes the v12.5.0 pipeline-agent rename. It also added a `no-bare-universal-prose-refs` regression guard.
- **V12.2.0** — BREAKING: v12.2.0 removes the `/org` skill. Cross-domain coordination folded into `/team` with auto-enabled strategic mode. A `router` `domain_count >= 2` triggers Wave 0/1/2 C-suite deliberation + Wave 3..N per-domain dispatch. 12 leadership agents preserved at their existing locations. Plugin skill count 5->4. Migration: `/org X` → `/team X`.
- **V12.1.2** — Folds `/improve` into `/act` via a first-word keyword router and removes the standalone `/improve` skill (`/act review|audit` = `--mode review`, `/act optimize` = `--mode optimize`, `/act improve` = `--mode full`). Plugin skill count 6->5.
- **V12.0.0** — Consolidation release. The pipeline collapsed 7->5 states, with task-decomposer + prompt-engineer folded into planner. engineering-manager merged into tech-lead, and architecture-reviewer collapsed into an `architect --review` mode flag. The release absorbed 13 marketing-sales agents (38->25) and renamed chief-legal-officer to clo. It deleted 11 legacy domain dirs and dropped `cagents-memory/_communication/`. max_revision_cycles moved 5->3, and execution self-validation fell 15->5 hook-verifiable checks. Total agents 251->238.
- **V11.3.0** — Plugin health sweep. Archetype-canonical doc alignment landed (9 archetypes canonical, 15 domains as routing overlay). The sweep cleared 109 stale `related_agents` cross-references. It corrected the hook-count assertions (26 unique registered, 29 .cjs total). It added a `sync-agents.sh --check` dry-run flag. It pruned `validate-versions.sh` to 18 canonical slots, and it added regression tests.
- **V11.1.3** — Removed statusLine hook and status bar integration.
- **V11.0.0** — Removed deprecated skills `/review`, `/optimize`, `/context`, `/debug`. `/review` and `/optimize` consolidated into `/improve` (`--mode review|optimize|full`). The `/act context …` passthrough replaced `/context`. The `/act --mode debug` flag replaced `/debug`. See [docs/MIGRATION-V11.md](docs/MIGRATION-V11.md) for the migration guide.
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

MIT License. See [LICENSE](LICENSE) for details.

---

**Built with Claude Code** | 60 agents across 9 archetypes | Opus 4.8 · Sonnet 4.6

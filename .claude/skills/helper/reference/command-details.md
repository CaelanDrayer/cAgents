# Command Detail Templates

Detailed help content for each command when the user runs `/helper <command>`.

## /run - Universal Workflow Engine

### What It Does

`/run` is the general-purpose command that handles ANY task in ANY domain. You give it a natural language request, and it automatically detects the domain (engineering, creative, marketing, finance, HR, support), classifies the complexity, creates a plan with objectives, coordinates specialist agents through a controller, and validates the results. Every request goes through a full orchestration pipeline: routing, planning, coordinating, executing, and validating.

### When to Use /run

- **Fix something**: "Fix the authentication bug", "Fix the broken CSS on the homepage"
- **Build something**: "Add OAuth2 login", "Implement the payment gateway"
- **Write something**: "Write a fantasy novel about space pirates", "Write API documentation"
- **Create something**: "Create Q4 budget", "Create a sales forecast"
- **Analyze something**: "Analyze user behavior data", "What is the best auth approach?"
- **Refactor something**: "Refactor the auth module", "Migrate from REST to GraphQL"
- **Any domain**: Engineering, creative writing, marketing, finance, HR, legal -- it routes automatically

### When NOT to Use /run

- **You want to PLAN first**: Use `/designer` to think through the design before building
- **You want to CHECK existing work**: Use `/review` for quality analysis
- **You want to IMPROVE metrics**: Use `/optimize` for measurable improvements
- **You have a LARGE task with parallel parts**: Use `/team` (or `/run --team`)

### How It Works (Simplified)

```
You: /run Fix auth bug
  |
  v
[Trigger] Detects domain: Engineering, Intent: bug_fix, Tier: 2
  |
  v
[Orchestrator] Creates plan with objectives
  |
  v
[Controller: engineering-manager] Asks specialists questions:
  - "What is the current auth implementation?" -> backend-developer
  - "What are the key risks?" -> security-specialist
  - "What tests are needed?" -> qa-lead
  |
  v
[Execution Agents] Implement the fix, write tests, validate
  |
  v
[Validator] Checks all acceptance criteria met
  |
  v
Result: Bug fixed, tests passing, outputs saved
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--interactive` | Ask your preferences before starting | `/run Fix bug --interactive` |
| `--dry-run` | Show the plan without executing | `/run Add feature --dry-run` |
| `--quiet` / `-q` | Skip plan display, go straight to work | `/run Fix bug --quiet` |
| `--team` | Run in parallel team mode | `/run Build dashboard --team` |
| `--domain <name>` | Force a specific domain | `/run Analyze --domain engineering` |
| `--tier <N>` | Force complexity tier (2-4) | `/run Migrate database --tier 4` |
| `--template <name>` | Use a workflow template | `/run Budget --template budget_creation` |
| `--stream` | Real-time progress updates | `/run Deploy app --stream` |
| `--resume <id>` | Resume an interrupted session | `/run --resume run_20260207_143022` |

### Real Examples

```bash
# Simple bug fix
/run Fix the login timeout error

# Feature addition
/run Add user profile page with avatar upload

# Creative writing
/run Write a 3-chapter mystery story set in Victorian London

# Business task
/run Create Q4 marketing campaign plan for product launch

# With flags
/run Implement OAuth2 with Google and GitHub providers --interactive
/run Refactor the authentication module --dry-run
/run Build user dashboard --team
```

### Integration

- **After /designer**: `/designer` creates a design document, then triggers `/run` to build it
- **After /review**: If review finds critical issues, `/run` fixes them
- **After /optimize**: If optimizer finds CRITICAL opportunities, `/run` implements them
- **With /team**: `/run --team` activates parallel team execution

### Tips

1. **Be specific**: "Fix the auth timeout when session expires after 30 minutes" works better than "fix auth"
2. **Use --dry-run first**: Preview the plan before committing to execution
3. **Use --interactive for complex tasks**: Let the system ask clarifying questions
4. **Check the domain**: If it routes to the wrong domain, use `--domain` to override
5. **Use --team for big features**: If the task has 3+ independent components

---

## /designer - Interactive Design Engine

### What It Does

`/designer` is a structured 4-phase design tool that helps you think through a problem before building. It guides you through Discovery (understanding the problem), Ideation (exploring solutions), Refinement (detailing the design), and Specification (generating artifacts). It asks one question at a time, searches your codebase for context, recommends proven design patterns, generates mermaid diagrams, and produces implementation-ready documents. When done, it offers to build via `/run` or `/team`.

### When to Use /designer

- **Planning a new feature**: Before writing code, design the approach
- **System architecture**: Design the overall system before implementation
- **Exploring options**: When unsure which approach to take
- **Creating specs**: Need user stories, tech specs, or design documents
- **Creative projects**: Design story worlds, character arcs, game mechanics
- **Business processes**: Design workflows, RACI matrices, implementation plans

### When NOT to Use /designer

- **You already know what to build**: Go straight to `/run`
- **Quick fixes**: Bug fixes and small changes don't need design sessions
- **You want quality checks**: Use `/review` instead
- **Time-sensitive**: Design sessions take 15-45 minutes

### How It Works (Simplified)

```
Phase 1: Discovery (15% of session)
  "What are you building? Who is it for? What constraints?"
  -> Searches your codebase for context
  -> Gate: Problem + stakeholders + constraints + success criteria

Phase 2: Ideation (25% of session)
  "Here are 3 approaches. Which do you prefer?"
  -> Recommends proven design patterns
  -> Gate: 2+ alternatives explored, one selected

Phase 3: Refinement (35% of session)
  "Let's detail the architecture, data model, user flows..."
  -> Generates mermaid diagrams as design forms
  -> Gate: All major design questions answered

Phase 4: Specification (25% of session)
  -> Generates user stories, tech specs, diagrams, checklists
  -> Validates completeness, consistency, feasibility, quality
  -> Offers: "Build it now (/run)" or "Build with team (/team)"
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--resume {id}` | Resume a previous design session | `/designer --resume designer_20260204_143022` |
| `--template <name>` | Start with a pre-built template | `/designer --template system-architecture` |
| `--focus <area>` | Focus the design on specific areas | `/designer --focus security` |
| `--detail <level>` | Set detail depth (low/medium/high) | `/designer --detail high` |

### Real Examples

```bash
# Start fresh (asks what you want to design)
/designer

# Start with a topic
/designer OAuth2 authentication for our SPA

# Use a template
/designer --template product-feature

# Resume a previous session
/designer --resume designer_20260204_143022

# Focus on specific area
/designer payment gateway integration --focus security
```

### Integration

- **Flows into /run**: After design, select "Build it now" to auto-trigger `/run`
- **Flows into /team**: After design, select "Build with team" to auto-trigger `/team`
- **Standalone**: Save the design document without building

### Tips

1. **Be honest in answers**: The design quality depends on your input quality
2. **Trust the phases**: Don't rush to implementation -- Discovery and Ideation prevent bad decisions
3. **Review synthesis points**: When the designer summarizes, correct any misunderstandings
4. **Use templates**: They ensure comprehensive coverage of important areas
5. **Sessions can resume**: If interrupted, use `--resume` to continue where you left off

---


## Removed in V11.0.0

The following slash commands were removed after the V10.26.19 → V10.26.35
deprecation runway. See [](../../../../docs/MIGRATION-V11.md)
for migration details.

| Removed command | Replacement | First appeared as shim | Removed in |
|-----------------|-------------|------------------------|------------|
| `/review`     | `/improve --mode review`  | V10.26.26 | V11.0.0 |
| `/optimize`   | `/improve --mode optimize`| V10.26.32 | V11.0.0 |
| `/debug`      | `/run --mode debug`       | V10.26.18 | V11.0.0 |
| `/context`    | `/run context show|init|update|clear` | V10.26.9 (passthrough) | V11.0.0 |

Additionally, V10.26.33 introduced `/improve --mode full` — a unified
review → optimize pipeline with a shared baseline and synthesized
`improve_report.md`. No pre-V11 equivalent existed.

---

## /team - Parallel Team Execution

### What It Does

`/team` decomposes a large task into parallelizable work items and runs them simultaneously using Claude Code's built-in agent teams. Each teammate is a separate Claude Code instance that executes its work item via `/run` (full orchestration per item). With tmux split panes, all teammates are visible at once. It provides shared task lists and inter-agent messaging for coordination.

### When to Use /team

- **Large features**: 3+ independent components that can run in parallel
- **Time-sensitive delivery**: Need 40-60% faster execution
- **Tier 3+ workflows**: Complex tasks with multiple work items
- **Multi-part tasks**: Backend + frontend + tests + docs simultaneously

### When NOT to Use /team

- **Simple tasks**: Single work item -- use `/run` instead
- **Sequential dependencies**: If everything depends on the previous step, parallelism won't help
- **Tier 2 tasks**: Simple bug fixes and questions -- use `/run`
- **Quality over speed**: If you want maximum attention per item, `/run` gives sequential focus

### How It Works (Simplified)

```
You: /team Implement OAuth2 with Google, GitHub, and email login
  |
  v
[Team Trigger] Decomposes into work items:
  TASK-01: Implement Google OAuth provider
  TASK-02: Implement GitHub OAuth provider
  TASK-03: Implement email/password login
  TASK-04: Create unified auth middleware
  |
  v
[Team Creation] Creates agent team + shared task list
  |
  v
[Parallel Execution in tmux split panes]
  Pane 0: Team Lead (coordinates, monitors)
  Pane 1: Teammate -> /run "Implement Google OAuth"     -> Complete
  Pane 2: Teammate -> /run "Implement GitHub OAuth"     -> Complete
  Pane 3: Teammate -> /run "Implement email login"      -> Complete
  Pane 4: Teammate -> /run "Create auth middleware"      -> (waits for 1-3, then runs)
  |
  v
[Aggregation] Combine all results into final output
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--dry-run` | Preview team composition | `/team Build feature --dry-run` |
| `--members <N>` | Limit team size | `/team Build system --members 4` |
| `--lead <agent>` | Specify team lead | `/team Build API --lead engineering-manager` |
| `--teammate-mode <mode>` | Display mode (tmux/in-process) | `/team Build app --teammate-mode tmux` |
| `--display` | Show team communication | `/team Build feature --display` |
| `--quiet` / `-q` | Suppress progress output | `/team Build feature --quiet` |
| `--domain <name>` | Force domain | `/team Campaign --domain grow` |
| `--parallel` | Force parallel execution | `/team Build system --parallel` |

### Real Examples

```bash
# Basic team execution
/team Implement OAuth2 authentication

# Preview team without executing
/team Build user dashboard --dry-run

# Limit team size
/team Add payment gateway --members 4

# Show team communication
/team Create API endpoints --display

# Force tmux split pane display
/team Implement search feature --teammate-mode tmux

# Via /run with --team flag (equivalent)
/run Build user dashboard --team
```

### Integration

- **After /designer**: Design a feature, then build with team for speed
- **Uses /run internally**: Every teammate runs `/run` for full orchestration per item
- **Alternative to /run**: For parallelizable tasks, `/team` replaces `/run`
- **Shortcut**: `/run --team` is equivalent to `/team`

### Tips

1. **Check suitability first**: Use `--dry-run` to see the team composition before committing
2. **3+ work items minimum**: Tasks with fewer than 3 items may not benefit from team mode
3. **Independent work is key**: The more independent the items, the better the parallelism
4. **tmux gives best visibility**: Use `--teammate-mode tmux` for visual split pane display
5. **Each item gets full /run quality**: No shortcuts -- every work item goes through full orchestration

---

## /org - Corporate Hierarchy Orchestration

### What It Does

`/org` orchestrates multi-domain tasks through a corporate hierarchy model. A CEO (inline) engages C-suite agents (CTO, CCO, CRO, CFO, COO, CHRO, General Counsel) for parallel domain analysis, conducts deliberation with objection rounds, produces a strategic brief, then delegates to sequential `/team` invocations per domain (dependency-ordered). For single-domain tasks, it shortcuts to `/run` or `/team` with a strategic brief for richer context.

### When to Use /org

- **Multi-domain initiatives**: Engineering + marketing + hiring in one coordinated effort
- **Strategic-level tasks**: Product launches, company restructures, major migrations
- **Cross-domain coordination**: When domains need shared dependencies and risk management
- **When you need a strategic brief**: Risk register, success criteria, cross-domain dependencies

### When NOT to Use /org

- **Single-domain tasks**: Use `/run` or `/team` directly -- /org adds overhead for single domains
- **Simple bug fixes**: Use `/run` -- no need for C-suite analysis
- **Parallel execution within one domain**: Use `/team` -- /org is for cross-domain parallelism
- **Quick tasks**: /org's deliberation phase adds 5-15 minutes of strategic analysis

### How It Works (Simplified)

```
You: /org Launch new product with marketing campaign and hiring plan
  |
  v
[CEO] Analyzes: 3 domains touched (make_eng, grow, people)
  |
  v
[C-Suite Parallel Analysis] CTO, CRO, CHRO each analyze from their domain
  |
  v
[Deliberation] CEO drafts strategic brief -> C-suite objects/approves
  -> CEO resolves conflicts -> Final strategic brief
  |
  v
[Parallel Execution] /team per domain (each runs independently)
  -> /team make_eng: Build product features
  -> /team grow: Create marketing campaign
  -> /team people: Execute hiring plan
  |
  v
[Integration] CEO merges all domain outputs, resolves cross-domain conflicts
  |
  v
Result: All domains complete, integrated deliverable
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--dry-run` | Preview routing decision and C-suite plan | `/org Launch product --dry-run` |
| `--quick` | Skip deliberation for single-domain routing | `/org Fix auth --quick` |
| `--domains <d1,d2,...>` | Force specific domain scope | `/org Task --domains make_eng,grow` |
| `--resume <session_id>` | Resume an interrupted /org session | `/org --resume org_20260227_143022` |

### Domain Detection

| Domain Key | C-Suite | Keywords |
|-----------|---------|----------|
| make_eng | CTO | fix, build, implement, code, api, database, architecture |
| make_cre | CCO | write, story, content, design, creative, brand, UX |
| grow | CRO | campaign, marketing, sales, conversion, SEO, leads |
| operate_fin | CFO | budget, cost, forecast, investment, ROI, financial |
| operate_ops | COO | operations, process, supply chain, logistics, efficiency |
| people | CHRO | hire, recruit, onboard, culture, HR, talent, performance |
| serve | General Counsel | support, legal, compliance, customer, SLA, contract |

### Real Examples

```bash
# Multi-domain: engineering + marketing + hiring
/org Launch new product with marketing campaign and engineering build

# Preview routing without executing
/org Restructure engineering team --dry-run

# Force specific domains
/org Major initiative --domains make_eng,grow,people

# Resume an interrupted session
/org --resume org_20260227_143022

# Single-domain (auto-routes to /run or /team with strategic brief)
/org Fix critical auth bug
```

### Integration

- **Delegates to /team**: Each domain executes via sequential `/team` invocations (dependency-ordered)
- **Delegates to /run**: Single-domain simple tasks route through `/run` with strategic brief
- **After /designer**: Use `/org` when a design spans multiple domains
- **Strategic brief**: All downstream executions receive a strategic brief with mission, success criteria, and risk register

### Tips

1. **Multi-domain is the sweet spot**: /org shines when 2+ domains need coordinated work
2. **Use --dry-run first**: See which domains and C-suite agents will be engaged
3. **Be specific about scope**: "Launch product" is broad -- add specifics for better domain detection
4. **Single-domain auto-routes**: /org smartly delegates to /run or /team when only one domain is needed
5. **Check the strategic brief**: The brief in the session directory shows all decisions and risk analysis

---

## /helper - Interactive Command Guide

### What It Does

`/helper` explains cAgents skills and recommends the right command for your needs. It provides detailed explanations, usage examples, comparison tables, flag references, and guided recommendations. It never executes commands -- it only educates and recommends.

### When to Use /helper

- **New to cAgents**: Get an overview of all available commands
- **Choosing a command**: Not sure which command fits your task
- **Learning flags**: Need to understand what flags a command supports
- **Comparing commands**: Want to see side-by-side differences
- **Quick reference**: Need a one-screen summary of all commands

### When NOT to Use /helper

- **You know which command to use**: Just run it directly
- **You want to execute something**: /helper only explains, never executes

### How It Works (Simplified)

```
/helper                     -> Full overview of all 9 commands
/helper run                 -> Deep dive into /run
/helper how do I fix a bug  -> "Use /run. Here's how..."
/helper --compare           -> Side-by-side comparison table
/helper --flags review      -> All /review flags with examples
/helper --quick             -> One-screen reference card
/helper --topic domains     -> Deep dive into the 15 domains
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--compare` | Side-by-side comparison of all commands | `/helper --compare` |
| `--flags <command>` | Complete flag reference for a command | `/helper --flags run` |
| `--examples` | Real-world usage examples by domain | `/helper --examples` |
| `--quick` | One-screen quick reference card | `/helper --quick` |
| `--topic <topic>` | Deep dive into a topic | `/helper --topic domains` |

### Real Examples

```bash
# Full interactive guide
/helper

# Learn about a specific command
/helper run
/helper designer
/helper review

# Natural language question
/helper how do I review code for security issues
/helper which command should I use to build a feature

# Compare all commands
/helper --compare

# Quick reference
/helper --quick

# Explore topics
/helper --topic workflow
/helper --topic agents
```

### Tips

1. **Start with `/helper --quick`**: Get oriented fast with the one-screen reference
2. **Use natural language**: Ask questions like "how do I..." and get targeted recommendations
3. **Check flags before running**: `/helper --flags run` shows every flag with examples
4. **Compare when unsure**: `/helper --compare` shows exactly when each command is best
5. **Explore topics**: Use `--topic` for deep dives into domains, tiers, agents, teams, etc.

---

## /improve - Unified Review + Optimize Engine (canonical as of V11.0)

### What It Does

`/improve` is the canonical quality engine: a single 7-state state
machine (`SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING →
VALIDATING → REPORTING`) with a `--mode` selector
(`review|optimize|full`). V11.0 removed the legacy `/review`,
`/optimize`, `/context`, and `/debug` slash commands; `/improve` now
owns review, optimization, and the unified full pipeline.

### When to Use /improve

- **Audit code, docs, content, infrastructure, or content quality**:
  `/improve --mode review [target]` (or just `/improve [target]` —
  `review` is the default mode).
- **Measure then optimize**: `/improve --mode optimize [target]` for
  performance / size / efficiency improvements with before/after
  metric deltas and atomic rollback.
- **Do both with a single shared baseline**: `/improve --mode full
  --scope <path>` for review → optimize synthesis with a unified
  `improve_report.md`.

### Modes

| Mode | What it does | Artifacts |
|------|--------------|-----------|
| `review` (default) | 3-group parallel specialist review; optional auto-fix; 12 prime directives | `reports/aggregate.yaml`, `reports/quality_gates.yaml`, `reports/auto_fixes.yaml`, `reports/final_report.md` |
| `optimize` | Opportunity scanners; ROI rank; atomic apply top-N; before/after benchmark delta | `workflow/opportunities.yaml`, `workflow/baseline_metrics.yaml`, `outputs/optimization_report.md`, `_projects/{hash}/improve/history.yaml` |
| `full` | Review → optimize with shared baseline; synthesis step | `improve_report.md` with `## Review Findings` and `## Optimizations Applied` sections |

### Key Flags

| Flag | Description | Modes |
|------|-------------|-------|
| `--mode review\|optimize\|full` | Select pipeline branch | all |
| `--scope <path>` | Required for `--mode full`; optional elsewhere | all |
| `--dry-run` | Plan without applying changes | all |
| `--auto-fix safe` | Apply safe auto-fixes (review only) | review |
| `--baseline` / `--suppress <id>` | Baseline and suppression | review |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Benchmark tool | optimize, full |
| `--history` | Append run to `_projects/{hash}/improve/history.yaml` | all |

### Delivery History

- V10.26.19–26: Cluster 4 landed `--mode review` and the `/review` shim
- V10.26.27–35: Cluster 5 landed `--mode optimize`, `--mode full`, the `/optimize` shim, and uniform deprecation warnings
- V11.0.0: Removed `/review`, `/optimize`, `/context`, `/debug` skills; `/improve` is the canonical entry point

---


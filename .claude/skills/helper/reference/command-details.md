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

## /review - Shim → /improve --mode review (since V10.26.26, deprecated V11.0)

**As of V10.26.26, `/review` is a shim that forwards to `/improve --mode review`.** The unified /improve pipeline (V10.26.19–V10.26.25) now owns the 3-group parallel specialist execution, auto-fix engine, 12 prime directives, and quality gate. `/review` preserves zero behavior change — every flag forwards unchanged — but will be removed in V11.0. New invocations should use `/improve --mode review` directly.



### What It Does

`/review` runs a multi-agent quality review on code, documentation, content, designs, processes, data, or infrastructure. It auto-detects the review type and framework, runs specialist agents in parallel groups, scores findings with confidence levels, generates auto-fix suggestions, and checks quality gates. It covers everything from architecture to accessibility to security.

### When to Use /review

- **Code review**: Check architecture, security, performance, standards, test coverage
- **Pre-merge checks**: Review staged or changed files before committing
- **Security audit**: Focus on vulnerabilities and security patterns
- **Documentation review**: Check clarity, completeness, accuracy
- **Infrastructure review**: Verify security, cost, reliability of infra configs
- **Content review**: Check tone, grammar, messaging, audience fit

### When NOT to Use /review

- **You want to FIX things**: Use `/run` to implement fixes
- **You want measurable improvements**: Use `/optimize` for before/after metrics
- **You want to design**: Use `/designer` for planning

### How It Works (Simplified)

```
[Initialize] Auto-detect review type (code/docs/content/...) + framework (Next.js/React/...)
  |
  v
[Parallel Group 1] architecture-reviewer, code-standards-auditor, documentation-reviewer
  |
  v
[Parallel Group 2] performance-analyzer, security-analyst, test-coverage-validator
  |
  v
[Parallel Group 3] dependency-auditor, accessibility-checker, compliance-officer
  |
  v
[Aggregate] Merge findings, add confidence scores (0.0-1.0), classify severity
  |
  v
[Auto-Fix] Generate fix suggestions with confidence-based safety levels
  |
  v
[Quality Gates] Check thresholds (strict/standard/relaxed)
  |
  v
[Report] Final report with findings, fixes, recommendations
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--focus <area>` | Focus on specific area | `/review --focus security` |
| `--scope changed` | Only review changed files | `/review --scope changed` |
| `--auto-fix safe` | Generate safe auto-fixes | `/review --auto-fix safe` |
| `--framework <name>` | Force framework detection | `/review --framework nextjs` |
| `--quality-gate strict` | Strict quality thresholds | `/review --quality-gate strict` |
| `--run-tests` | Run tests after auto-fix | `/review --auto-fix safe --run-tests` |
| `--output <format>` | Output format | `/review --output summary` |
| `--parallel` | Parallel agent execution (default) | `/review --parallel` |

### Real Examples

```bash
# Review current directory
/review

# Review specific path
/review src/auth/

# Security-focused review
/review --focus security

# Review only changed files with auto-fix
/review --scope changed --auto-fix safe --apply-safe-fixes

# Strict quality gate with test validation
/review --quality-gate strict --run-tests --rollback-on-failure

# Framework-specific review
/review --framework nextjs --focus performance

# Review with detailed report saved to file
/review --output detailed --save-report ./code-review.md
```

### Integration

- **Feeds into /run**: Critical findings can be fixed via `/run`
- **After /optimize**: Verify optimization quality with a review
- **Pre-merge pipeline**: `/review --scope staged --quality-gate strict`

### Tips

1. **Use --scope changed for speed**: Don't review the entire codebase every time
2. **Trust auto-detection**: It detects frameworks and review types accurately
3. **Start with --focus security**: Security issues are the most impactful
4. **Use --auto-fix safe**: Safe fixes are low-risk and save time
5. **Check confidence scores**: Higher confidence = more reliable finding

---

## /optimize - Universal Optimizer

### What It Does

`/optimize` detects improvement opportunities in your code, content, processes, or infrastructure. It measures baselines, plans optimizations by ROI, executes changes atomically (with rollback on failure), and validates with before/after metrics. It supports 8 optimization types and can work across multiple files. Every optimization is measurable -- no vague claims.

### When to Use /optimize

- **Slow code**: Speed up API endpoints, reduce query time, improve FCP/LCP
- **Large bundles**: Reduce bundle size, tree-shake unused code
- **High costs**: Optimize infrastructure spending, reduce resource usage
- **Poor content**: Improve readability scores, SEO rankings, engagement metrics
- **Inefficient processes**: Streamline workflows, reduce manual steps
- **Campaigns**: Improve conversion rates, click-through rates, engagement

### When NOT to Use /optimize

- **Building new features**: Use `/run` for new implementations
- **Checking quality**: Use `/review` for quality analysis
- **Planning**: Use `/designer` for design exploration
- **The code is broken**: Fix bugs with `/run` first, then optimize

### How It Works (Simplified)

```
[Detection] Scan project, detect type (code/content/process/...), classify opportunities
  |
  v
[Analysis] Measure baseline metrics, identify improvement areas, classify risk
  |
  v
[Planning] Prioritize by ROI, group for parallel execution, select specialists
  |
  v
[Execution] For each optimization: snapshot -> apply -> validate -> keep or rollback
  |
  v
[Validation] Re-measure all metrics, compare before/after, check quality gates
  |
  v
[Report] "Bundle size: 2.8MB -> 1.8MB (-36%)", "Query time: 450ms -> 120ms (-73%)"
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--type <type>` | Force optimization type | `/optimize --type code` |
| `--dry-run` | Preview without applying | `/optimize --dry-run` |
| `--safety safe` | Only safe optimizations | `/optimize --safety safe` |
| `--cross-file` | Multi-file dependency analysis | `/optimize --cross-file` |
| `--plan-only` | Generate plan, hand off to /run | `/optimize --plan-only` |
| `--review-after` | Trigger /review after optimizing | `/optimize --review-after` |
| `--explore-first` | Start with /designer exploration | `/optimize --explore-first` |
| `--focus performance` | Focus on specific goal | `/optimize --focus performance` |

### 8 Optimization Types

| Type | What It Optimizes | Example Metrics |
|------|-------------------|-----------------|
| `code` | Performance, bundles, algorithms | FCP, LCP, bundle size, query time |
| `content` | Readability, SEO, engagement | Readability score, SEO score |
| `process` | Workflow efficiency, automation | Cycle time, manual steps, error rate |
| `infrastructure` | Cost, scaling, reliability | Monthly cost, utilization, uptime |
| `data` | Query performance, ETL speed | Query time, ETL duration |
| `campaign` | Conversion, engagement, targeting | Conversion %, CTR, open rate |
| `creative` | Pacing, depth, structure | Engagement score, consistency |
| `sales` | Sales cycle, win rate | Cycle length, win rate % |

### Real Examples

```bash
# Auto-detect and optimize
/optimize

# Natural language goal
/optimize "Make the homepage load faster"

# Specific target and type
/optimize src/ --type code --focus performance

# Safe optimizations only with test validation
/optimize --safety safe --require-tests-pass

# Preview without applying changes
/optimize --dry-run

# Full optimization with post-review
/optimize src/ --cross-file --review-after --validation comprehensive

# Content SEO optimization
/optimize blog/ --type content --focus quality

# Generate plan only, hand off to /run for implementation
/optimize --type code --plan-only
```

### Integration

- **Flows into /review**: Use `--review-after` to verify quality
- **Flows into /run**: Use `--plan-only` to hand off CRITICAL items to /run
- **Flows from /designer**: Use `--explore-first` to design the optimization approach

### Tips

1. **Always start with --dry-run**: See what would change before committing
2. **Use --safety safe first**: Low-risk optimizations are a good starting point
3. **Check before/after metrics**: The report shows measurable impact
4. **Use --cross-file for codebases**: Multi-file analysis catches architecture-level opportunities
5. **Rollback is automatic**: If tests fail, changes are rolled back

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

## /improve - Unified Review + Optimize Engine (canonical since V10.26.26)

### What It Does

`/improve` consolidates the legacy `/review` and `/optimize` skills into a single 7-state state machine (`SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING`) with a `--mode` selector (`review|optimize|full`). As of V10.26.26, `--mode review` is feature-complete and `/review` is a shim forwarding to it. `--mode optimize` lands in Cluster 5; `--mode full` lands after Cluster 5. `/improve` becomes the only entry point in V11.0 when the /review and /optimize shims are removed.

### When to Use /improve

- **Not yet** — preview only. Continue to use `/review` (for auditing) or `/optimize` (for measurable improvement) until V10.26.26.
- **After V10.26.26**: `/improve --mode review` is the canonical form; `/review` still works as a shim.
- **After Cluster 5 lands**: `/improve --mode optimize` replaces `/optimize`, `/improve --mode full` does both.

### Roadmap

- V10.26.19: Skeleton + this catalog entry
- V10.26.20: Registered in plugin.json description
- V10.26.21: `--mode` flag parser
- V10.26.22: 7-state machine documented
- V10.26.23: `--mode review` SCOPING + MEASURING with baseline migration
- V10.26.24: `--mode review` DETECTING + PLANNING
- V10.26.25: `--mode review` EXECUTING + VALIDATING + REPORTING (feature-complete)
- V10.26.26: `/review` → shim over `/improve --mode review`

---

## /debug - Systematic Debugging Methodology (V10.26.18+: shim → /run --mode debug, deprecated V11.0)

### What It Does

`/debug` is a structured 4-phase debugging tool for bugs that resist quick fixes. It guides you through Root Cause Investigation, Pattern Analysis, Hypothesis Testing, and Implementation -- enforcing evidence-based debugging rather than guessing. Think of it as "find the actual root cause, not just the symptom."

**As of V10.26.18, `/debug` is a back-compat shim that forwards to `/run --mode debug`.** The same 4-phase methodology runs; the `/debug` command preserves the user surface (including `--escalate` and `--phase`) but delegates all session creation and coordination to the canonical pipeline. `/debug` will be removed in V11.0 — prefer `/run --mode debug` for new invocations.

### When to Use /debug

- **Bug has resisted 2+ fix attempts**: If you've tried multiple fixes and the bug persists
- **Intermittent or non-deterministic failure**: Flaky tests, works-sometimes bugs
- **Unclear root cause**: Error message exists but cause is unknown
- **Performance regression**: Something got slower but you don't know why
- **"It works on my machine"**: Environment-specific failures

### When NOT to Use /debug

- **Known simple fixes**: Typo, missing import, obvious one-line fix -- use `/run` instead
- **Code quality review**: Use `/review` for quality analysis, not /debug
- **Building features**: Use `/run` for new development

### How It Works (Simplified)

```
Phase 1: Root Cause Investigation
  -> Reproduce the exact bug
  -> Read the full stack trace (not just the message)
  -> Check recent git changes
  -> Trace the data flow

Phase 2: Pattern Analysis
  -> Classify: state mutation? type mismatch? timing/async? data flow? config?
  -> Match patterns to known bug categories

Phase 3: Hypothesis Testing (one at a time)
  -> State hypothesis: "The bug occurs because X causes Y when Z"
  -> Test with minimal reproduction
  -> Record: confirmed or falsified (with evidence)
  -> Max 5 hypotheses before escalation

Phase 4: Implementation
  -> Write a FAILING TEST first (mandatory)
  -> Implement the minimal fix
  -> Run failing test (must now pass)
  -> Run full test suite (no regressions)
  -> Verify original reproduction scenario
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--escalate` | Force escalation report after investigation | `/debug auth bug --escalate` |
| `--phase <1-4>` | Start at specific phase | `/debug known issue --phase 3` |

### Real Examples

```bash
# Debug a complex authentication bug
/debug Auth token expiry causes random logouts after 30 minutes

# Debug intermittent test failures
/debug Payment tests fail 1 in 5 runs with "connection timeout"

# Force escalation if 3+ fixes already tried
/debug Race condition in WebSocket reconnect --escalate

# Start at hypothesis testing (root cause already known)
/debug Memory leak in event listener cleanup --phase 3
```

### Integration

- **After /run fails**: If `/run Fix bug` creates more bugs, escalate to `/debug`
- **Feeds back into /run**: After confirming root cause, use `/run` to implement if simpler
- **CLAUDE.md bug-driven testing**: /debug Phase 4 enforces the mandatory regression test requirement from CLAUDE.md

### Tips

1. **Trust the process**: Phase 1 reproduction is not optional, even if you think you know the cause
2. **One hypothesis at a time**: Testing multiple hypotheses simultaneously invalidates results
3. **Write the test FIRST in Phase 4**: This is not optional -- the test IS the verification
4. **Use --escalate proactively**: If 3+ attempts have already failed, add --escalate at the start
5. **Record falsified hypotheses**: Knowing what is NOT the cause is valuable information

---

## Internal utilities (Claude-invoked)

These skills are not surfaced in the `/` menu. Claude invokes them during
enrichment. Users should not call them directly.

### /context - Product Context Manager (utility)

Claude invokes `/context` automatically during `/run` enrichment to read
`Agent_Memory/_projects/{hash}/product_context.yaml`. Users manage context via
`/run context show|init|update|clear` (V10.26.9) or by editing
`Agent_Memory/_projects/{hash}/product_context.yaml` directly.

Status: demoted to utility in V10.26.6 (frontmatter
`metadata.user-invocable: "false"`). Removed from the /helper public catalog
in V10.26.8. Description tightened in V10.26.10. The `_projects/{hash}/product_context.yaml`
data file path is unchanged throughout the demotion.

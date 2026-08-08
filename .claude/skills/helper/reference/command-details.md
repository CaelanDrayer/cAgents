# Command Detail Templates

Detailed help content for each command when the user runs `/helper <command>`.

## /act - Universal Workflow Engine

### What It Does

`/act` is the general-purpose command that handles ANY task in ANY domain. You give it a natural language request, and it automatically detects the domain (engineering, creative, marketing, finance, HR, support), classifies the complexity, creates a plan with objectives, coordinates specialist agents through a controller, and validates the results. Every request goes through a full orchestration pipeline: routing, planning, coordinating, executing, and validating.

### When to Use /act

- **Fix something**: "Fix the authentication bug", "Fix the broken CSS on the homepage"
- **Build something**: "Add OAuth2 login", "Implement the payment gateway"
- **Write something**: "Write a fantasy novel about space pirates", "Write API documentation"
- **Create something**: "Create Q4 budget", "Create a sales forecast"
- **Analyze something**: "Analyze user behavior data", "What is the best auth approach?"
- **Refactor something**: "Refactor the auth module", "Migrate from REST to GraphQL"
- **Any domain**: Engineering, creative writing, marketing, finance, HR, legal -- it routes automatically

### When NOT to Use /act

- **You want to PLAN first**: Use `/designer` to think through the design before building
- **You want to CHECK existing work**: Use `/act review <target>` (or `/act audit`) for quality analysis
- **You want to IMPROVE metrics**: Use `/act optimize <target>` for measurable improvements
- **You have a LARGE task with parallel parts**: Use `/team` (or `/act --team`)

### How It Works (Simplified)

```
You: /act Fix auth bug
  |
  v
[Trigger] Detects domain: Engineering, Intent: bug_fix, Tier: 2
  |
  v
[Orchestrator] Creates plan with objectives
  |
  v
[Controller: tech-lead] Asks specialists questions:
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
| `--interactive` | Ask your preferences before starting | `/act Fix bug --interactive` |
| `--dry-run` | Show the plan without executing | `/act Add feature --dry-run` |
| `--quiet` / `-q` | Skip plan display, go straight to work | `/act Fix bug --quiet` |
| `--team` | Run in parallel team mode | `/act Build dashboard --team` |
| `--domain <name>` | Force a specific domain | `/act Analyze --domain engineering` |
| `--tier <N>` | Force complexity tier (2-4) | `/act Migrate database --tier 4` |
| `--template <name>` | Use a workflow template | `/act Budget --template budget_creation` |
| `--stream` | Real-time progress updates | `/act Deploy app --stream` |
| `--resume <id>` | Resume an interrupted session | `/act --resume act_20260207_143022` |

### Real Examples

```bash
# Simple bug fix
/act Fix the login timeout error

# Feature addition
/act Add user profile page with avatar upload

# Creative writing
/act Write a 3-chapter mystery story set in Victorian London

# Business task
/act Create Q4 marketing campaign plan for product launch

# With flags
/act Implement OAuth2 with Google and GitHub providers --interactive
/act Refactor the authentication module --dry-run
/act Build user dashboard --team
```

### Integration

- **After /designer**: `/designer` creates a design document, then triggers `/act` to build it
- **After /act review**: If the review finds critical issues, follow up with `/act` to fix them
- **After /act optimize**: If the optimizer finds CRITICAL opportunities, follow up with `/act` to implement them
- **With /team**: `/act --team` activates parallel team execution

### Tips

1. **Be specific**: "Fix the auth timeout when session expires after 30 minutes" works better than "fix auth"
2. **Use --dry-run first**: Preview the plan before committing to execution
3. **Use --interactive for complex tasks**: Let the system ask clarifying questions
4. **Check the domain**: If it routes to the wrong domain, use `--domain` to override
5. **Use --team for big features**: If the task has 3+ independent components

---

## /designer - Interactive Design Engine

### What It Does

`/designer` is a structured 4-phase design tool that helps you think through a problem before building. It guides you through Discovery (understanding the problem), Ideation (exploring solutions), Refinement (detailing the design), and Specification (generating artifacts). It asks one question at a time, searches your codebase for context, recommends proven design patterns, generates mermaid diagrams, and produces implementation-ready documents. When done, it offers to build via `/act` or `/team`.

### When to Use /designer

- **Planning a new feature**: Before writing code, design the approach
- **System architecture**: Design the overall system before implementation
- **Exploring options**: When unsure which approach to take
- **Creating specs**: Need user stories, tech specs, or design documents
- **Creative projects**: Design story worlds, character arcs, game mechanics
- **Business processes**: Design workflows, RACI matrices, implementation plans

### When NOT to Use /designer

- **You already know what to build**: Go straight to `/act`
- **Quick fixes**: Bug fixes and small changes don't need design sessions
- **You want quality checks**: Use `/act review <target>` instead
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
  -> Offers: "Build it now (/act)" or "Build with team (/team)"
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

- **Flows into /act**: After design, select "Build it now" to auto-trigger `/act`
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
| `/debug`      | `/act --mode debug`       | V10.26.18 | V11.0.0 |
| `/context`    | `/act context show|init|update|clear` | V10.26.9 (passthrough) | V11.0.0 |

Additionally, V10.26.33 introduced `/improve --mode full` — a unified
review → optimize pipeline with a shared baseline and synthesized
`improve_report.md`. No pre-V11 equivalent existed.

---

## /team - Parallel Team Execution

### What It Does

`/team` decomposes a large task into parallelizable work items and runs them simultaneously as concurrent-Agent waves. Each subagent is a separate Claude Code instance that executes its work item via `/act` (full orchestration per item). With tmux split panes (experimental named-teammate path only), all subagents are visible at once. It provides shared task lists and inter-agent messaging for coordination.

### When to Use /team

- **Large features**: 3+ independent components that can run in parallel
- **Time-sensitive delivery**: Need 40-60% faster execution
- **Tier 3+ workflows**: Complex tasks with multiple work items
- **Multi-part tasks**: Backend + frontend + tests + docs simultaneously

### When NOT to Use /team

- **Simple tasks**: Single work item -- use `/act` instead
- **Sequential dependencies**: If everything depends on the previous step, parallelism won't help
- **Tier 2 tasks**: Simple bug fixes and questions -- use `/act`
- **Quality over speed**: If you want maximum attention per item, `/act` gives sequential focus

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
[Parallel Execution in tmux split panes -- experimental named-teammate path]
  Pane 0: Team Lead (coordinates, monitors)
  Pane 1: Teammate -> /act "Implement Google OAuth"     -> Complete
  Pane 2: Teammate -> /act "Implement GitHub OAuth"     -> Complete
  Pane 3: Teammate -> /act "Implement email login"      -> Complete
  Pane 4: Teammate -> /act "Create auth middleware"      -> (waits for 1-3, then runs)
  |
  v
[Aggregation] Combine all results into final output
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--dry-run` | Preview team composition | `/team Build feature --dry-run` |
| `--members <N>` | Limit team size | `/team Build system --members 4` |
| `--lead <agent>` | Specify team lead | `/team Build API --lead tech-lead` |
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

# Via /act with --team flag (equivalent)
/act Build user dashboard --team
```

### Integration

- **After /designer**: Design a feature, then build with team for speed
- **Uses /act internally**: Every subagent runs `/act` for full orchestration per item
- **Alternative to /act**: For parallelizable tasks, `/team` replaces `/act`
- **Shortcut**: `/act --team` is equivalent to `/team`

### Tips

1. **Check suitability first**: Use `--dry-run` to see the team composition before committing
2. **3+ work items minimum**: Tasks with fewer than 3 items may not benefit from team mode
3. **Independent work is key**: The more independent the items, the better the parallelism
4. **tmux gives best visibility**: Use `--teammate-mode tmux` for visual split pane display
5. **Each item gets full /act quality**: No shortcuts -- every work item goes through full orchestration

---

## /org - REMOVED in v12.2.0 (absorbed into /team strategic mode)

`/org` was removed in v12.2.0. Cross-domain coordination — CEO + C-suite deliberation, strategic brief, dependency-ordered per-domain dispatch — is now handled by `/team` strategic mode. The 12 leadership agents (CEO, CTO, CCO, CRO, CFO, COO, CHRO, CMO, CSO, CPO, CLO, VP-Engineering) are preserved and act as Wave 0/1 subagents inside `/team` when strategic mode is engaged.

### Migration Table

| Pre-v12.2.0 (/org) | v12.2.0+ (/team strategic mode) |
|--------------------|---------------------------------|
| `/org <request>` | `/team <request>` (strategic mode auto-enables when `router.domain_count >= 2`) |
| `/org <request> --quick` | `/team <request> --strategic` (force-enable for single-domain) |
| `/org <request> --dry-run` | `/team <request> --dry-run` |
| `/org <request> --domains <d1,d2>` | `/team <request>` (router infers domains from keywords) |
| `/org --resume <session_id>` | `/team --resume <session_id>` |

### Trigger for Strategic Mode in /team

`/team` auto-detects cross-domain work via `router.domain_count`. When two or more archetype catalogs match the request, strategic mode engages automatically:

- Wave 0/1: C-suite agents analyze in parallel; CEO drafts strategic brief.
- Wave 2: Deliberation + objection rounds; brief finalized.
- Wave 3..N: Per-domain dispatch (the equivalent of /org's per-domain /team invocations) runs as nested waves within the same `/team` session.

Override flags:
- `--strategic`: force-enable strategic mode for a single-domain request (replaces `/org --quick`).
- `--no-strategic`: force-disable strategic mode and run as a flat multi-wave /team (used when domain-count auto-detect is a false positive).

See `.claude/skills/team/reference/strategic-mode.md` for the full protocol, brief schema, and escalation behavior.

### When to Reach for Strategic Mode

Same situations that previously called for `/org`: multi-domain initiatives, product launches, company restructures, major migrations, anything that needs a strategic brief with risk register, cross-domain success criteria, and dependency-ordered per-domain dispatch. The behavior is the same; the entry point is now `/team`.

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
/helper act                 -> Deep dive into /act
/helper how do I fix a bug  -> "Use /act. Here's how..."
/helper --compare           -> Side-by-side comparison table
/helper --flags review      -> All `/act review` flags (review-mode keyword router) with examples
/helper --quick             -> One-screen reference card
/helper --topic domains     -> Deep dive into the 9 archetypes
```

### Key Flags

| Flag | What It Does | Example |
|------|-------------|---------|
| `--compare` | Side-by-side comparison of all commands | `/helper --compare` |
| `--flags <command>` | Complete flag reference for a command | `/helper --flags act` |
| `--examples` | Real-world usage examples by domain | `/helper --examples` |
| `--quick` | One-screen quick reference card | `/helper --quick` |
| `--topic <topic>` | Deep dive into a topic | `/helper --topic domains` |

### Real Examples

```bash
# Full interactive guide
/helper

# Learn about a specific command
/helper act
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
3. **Check flags before running**: `/helper --flags act` shows every flag with examples
4. **Compare when unsure**: `/helper --compare` shows exactly when each command is best
5. **Explore topics**: Use `--topic` for deep dives into domains, tiers, agents, teams, etc.

---

## review / optimize / audit / improve — Keyword Router on /act (canonical as of v12.1.2)

### What It Does

In v12.1.2, the standalone `/improve` skill was folded into `/act` via a
first-token keyword router. When `/act`'s first request token is one of
`improve`, `review`, `audit`, or `optimize`, `/act` strips the keyword,
sets an internal `mode`, and proceeds through the standard 5-state
pipeline. The same controller-based quality engine that V11.0 `/improve`
shipped — review, optimize, full — is preserved; only the invocation
surface changed.

### When to Use the Keyword Router

- **Audit code, docs, content, infrastructure**: `/act review <target>` or
  `/act audit <target>` (alias). The default review pipeline is the same
  3-group parallel specialist review V11 used.
- **Measure then optimize**: `/act optimize <target>` for performance,
  size, or efficiency improvements with before/after metric deltas and
  atomic rollback.
- **Both with a single shared baseline**: `/act improve <target>` for
  review → optimize synthesis with a unified `improve_report.md`.

### Keyword Router Contract

The match is case-insensitive on the first whitespace-separated token of
`$ARGUMENTS`. If matched, the keyword is stripped from the request and
the inferred mode is set:

| First-word keyword | Inferred mode | Artifacts produced |
|--------------------|---------------|-------------------|
| `review` | review | `reports/aggregate.yaml`, `reports/quality_gates.yaml`, `reports/auto_fixes.yaml`, `reports/final_report.md` |
| `audit` | review (alias) | Same as `review` mode |
| `optimize` | optimize | `workflow/opportunities.yaml`, `workflow/baseline_metrics.yaml`, `outputs/optimization_report.md`, `_projects/{hash}/improve/history.yaml` |
| `improve` | full | `improve_report.md` with `## Review Findings` and `## Optimizations Applied` sections |

### Key Flags

Mode-specific flags from the V11.0 `/improve` surface carry through
unchanged (they bind to the inferred mode after the keyword is stripped).

| Flag | Description | Modes |
|------|-------------|-------|
| `--scope <path>` | Optional positional / explicit scope | all |
| `--dry-run` | Plan without applying changes | all |
| `--auto-fix safe` | Apply safe auto-fixes | review |
| `--baseline <id>` / `--suppress <id>` | Baseline + suppression | review |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Benchmark tool | optimize, full |
| `--history` | Append run to `_projects/{hash}/improve/history.yaml` | all |

### Override Rules

- Explicit `--mode standard` flag bypasses the keyword router — first
  token is treated as part of the request.
- Keyword must be the **first** token. `/act check the audit logs` does
  NOT trigger improve-mode (first word is `check`).

### History

- V10.26.19–26: Cluster 4 landed `--mode review` on the standalone `/improve` skill and the `/review` shim
- V10.26.27–35: Cluster 5 landed `--mode optimize`, `--mode full`, the `/optimize` shim, and uniform deprecation warnings
- V11.0.0: Removed `/review`, `/optimize`, `/context`, `/debug` skills; `/improve` was the canonical V11 entry point
- v12.1.2: `/improve` folded into `/act` via the first-token keyword router; the keyword router is now the canonical entry point

### Canonical Reference

`@.claude/skills/act/reference/improve-mode.md` — full router contract,
override rules, stripping examples, mode-specific controller behavior.

---


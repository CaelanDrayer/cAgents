# Command Detail Templates

This file holds the detailed help content for each command. The `/helper <command>` form shows it to the user.

## /act - Universal Workflow Engine

### What It Does

`/act` is the general-purpose command, and it handles ANY task in ANY domain. You give it a request in natural language. It then detects the domain on its own, and the domains are engineering, creative, marketing, finance, HR, and support. It classifies the complexity, and it creates a plan with objectives. It coordinates the specialist agents through a controller, and it validates the results. Every request goes through a full orchestration pipeline of routing, planning, coordinating, executing, and validating.

### When to Use /act

- **Fix something**: "Fix the authentication bug", "Fix the broken CSS on the homepage"
- **Build something**: "Add OAuth2 login", "Implement the payment gateway"
- **Write something**: "Write a fantasy novel about space pirates", "Write API documentation"
- **Create something**: "Create Q4 budget", "Create a sales forecast"
- **Analyze something**: "Analyze user behavior data", "What is the best auth approach?"
- **Refactor something**: "Refactor the auth module", "Migrate from REST to GraphQL"
- **Any domain**: Engineering, creative writing, marketing, finance, HR, and legal. It routes the request on its own.

### When NOT to Use /act

- **You want to PLAN first**: Use `/designer` to think through the design before you build.
- **You want to CHECK existing work**: Use `/act review <target>`, or use `/act audit`, for a quality analysis.
- **You want to IMPROVE metrics**: Use `/act optimize <target>` for a measurable improvement.
- **You have a LARGE task with parallel parts**: Use `/team`, or use `/act --team`.

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
2. **Use --dry-run first**: Look at the plan before you commit to the execution.
3. **Use --interactive for complex tasks**: Let the system ask clarifying questions
4. **Check the domain**: If it routes to the wrong domain, use `--domain` to override
5. **Use --team for big features**: If the task has 3+ independent components

---

## /designer - Interactive Design Engine

### What It Does

`/designer` is a structured 4-phase design tool. It helps you think through a problem before you build. It guides you through four phases. Discovery makes you understand the problem, and Ideation makes you explore the solutions. Refinement makes you detail the design, and Specification makes you generate the artifacts. It asks one question at a time, and it searches your codebase for context. It recommends proven design patterns, it generates mermaid diagrams, and it produces implementation-ready documents. When it is done, it offers to build the design with `/act` or with `/team`.

### When to Use /designer

- **Planning a new feature**: Design the approach before you write the code.
- **System architecture**: Design the whole system before you implement it.
- **Exploring options**: You are not sure which approach to take.
- **Creating specs**: You need the user stories, the tech specs, or the design documents.
- **Creative projects**: Design story worlds, character arcs, game mechanics
- **Business processes**: Design workflows, RACI matrices, implementation plans

### When NOT to Use /designer

- **You already know what to build**: Go straight to `/act`.
- **Quick fixes**: A bug fix and a small change do not need a design session.
- **You want quality checks**: Use `/act review <target>` instead.
- **Time-sensitive**: A design session takes 15-45 minutes.

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

- **Flows into /act**: After the design, select "Build it now" to trigger `/act`.
- **Flows into /team**: After the design, select "Build with team" to trigger `/team`.
- **Standalone**: Save the design document, and do not build it.

### Tips

1. **Be honest in answers**: The quality of the design depends on the quality of your input.
2. **Trust the phases**: Do not rush to the implementation. Discovery and Ideation prevent a bad decision.
3. **Review synthesis points**: When the designer gives a summary, correct anything that it got wrong.
4. **Use templates**: A template makes sure that you cover every important area.
5. **Sessions can resume**: If the session is interrupted, use `--resume` to continue from the point where you stopped.

---


## Removed in V11.0.0

The slash commands in the table below were removed after the V10.26.19 →
V10.26.35 deprecation runway. See [](../../../../docs/MIGRATION-V11.md)
for the migration details.

| Removed command | Replacement | First appeared as shim | Removed in |
|-----------------|-------------|------------------------|------------|
| `/review`     | `/improve --mode review`  | V10.26.26 | V11.0.0 |
| `/optimize`   | `/improve --mode optimize`| V10.26.32 | V11.0.0 |
| `/debug`      | `/act --mode debug`       | V10.26.18 | V11.0.0 |
| `/context`    | `/act context show|init|update|clear` | V10.26.9 (passthrough) | V11.0.0 |

V10.26.33 also introduced `/improve --mode full`. That mode runs a unified
pipeline of review, and then optimize. It uses one shared baseline, and it
synthesizes `improve_report.md`. No pre-V11 equivalent existed.

---

## /team - Parallel Team Execution

### What It Does

`/team` decomposes a large task into parallelizable work items. It then runs those items at the same time as concurrent-Agent waves. Each subagent is a separate Claude Code instance, and it runs its work item with `/act`. Each item therefore gets the full orchestration. With tmux split panes, you can see all of the subagents at once, and that display belongs to the experimental named-teammate path only. `/team` gives you shared task lists and inter-agent messaging for the coordination.

### When to Use /team

- **Large features**: The task holds 3 or more independent components that can run in parallel.
- **Time-sensitive delivery**: You need the execution to be 40-60% faster.
- **Tier 3+ workflows**: The task is complex, and it holds many work items.
- **Multi-part tasks**: The backend, the frontend, the tests, and the docs all run at the same time.

### When NOT to Use /team

- **Simple tasks**: The task is a single work item. Use `/act` instead.
- **Sequential dependencies**: If every item depends on the step before it, parallelism does not help.
- **Tier 2 tasks**: The task is a simple bug fix or a question. Use `/act`.
- **Quality over speed**: If you want the most attention per item, `/act` gives you a sequential focus.

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

- **After /designer**: Design a feature, and then build it with the team for speed.
- **Uses /act internally**: Every subagent runs `/act`, so each item gets the full orchestration.
- **Alternative to /act**: For a parallelizable task, `/team` replaces `/act`.
- **Shortcut**: `/act --team` is equivalent to `/team`.

### Tips

1. **Check suitability first**: Use `--dry-run` to see the team composition before you commit.
2. **3+ work items minimum**: A task with fewer than 3 items gets little benefit from the team mode.
3. **Independent work is key**: The more independent the items are, the better the parallelism is.
4. **tmux gives best visibility**: Use `--teammate-mode tmux` for the visual split pane display.
5. **Each item gets full /act quality**: There are no shortcuts. Every work item goes through the full orchestration.

---

## /org - REMOVED in v12.2.0 (absorbed into /team strategic mode)

`/org` was removed in v12.2.0. `/team` strategic mode now handles the cross-domain coordination. That coordination covers the CEO and C-suite deliberation, the strategic brief, and the dependency-ordered per-domain dispatch. The 12 leadership agents are preserved. They are the CEO, CTO, CCO, CRO, CFO, COO, CHRO, CMO, CSO, CPO, CLO, and VP-Engineering. They act as Wave 0/1 subagents inside `/team` when strategic mode is engaged.

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

- Wave 0/1: The C-suite agents analyze the request in parallel, and the CEO drafts the strategic brief.
- Wave 2: The deliberation rounds and the objection rounds run, and the brief is finalized.
- Wave 3..N: The per-domain dispatch runs as nested waves inside the same `/team` session. It is the equivalent of the per-domain `/team` invocations of `/org`.

Override flags:
- `--strategic`: force-enable strategic mode for a single-domain request. It replaces `/org --quick`.
- `--no-strategic`: force-disable strategic mode, and run a flat multi-wave /team. Use it when the domain-count auto-detect gives a false positive.

See `.claude/skills/team/reference/strategic-mode.md` for the full protocol, brief schema, and escalation behavior.

### When to Reach for Strategic Mode

Reach for strategic mode in the same situations that called for `/org` earlier. Those situations are a multi-domain initiative, a product launch, a company restructure, and a major migration. Reach for it also for any work that needs a strategic brief. Such a brief carries a risk register, the cross-domain success criteria, and a dependency-ordered per-domain dispatch. The behavior is the same. The entry point is now `/team`.

---

## /helper - Interactive Command Guide

### What It Does

`/helper` explains the cAgents skills, and it recommends the right command for your needs. It gives you detailed explanations, usage examples, comparison tables, and flag references. It also gives you guided recommendations. It never runs a command. It only educates and recommends.

### When to Use /helper

- **New to cAgents**: Get an overview of every command that is available.
- **Choosing a command**: You are not sure which command fits your task.
- **Learning flags**: You need to know which flags a command supports.
- **Comparing commands**: You want to see the differences side by side.
- **Quick reference**: You need a one-screen summary of every command.

### When NOT to Use /helper

- **You know which command to use**: Run it directly.
- **You want to execute something**: /helper only explains, and it never runs a command.

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

1. **Start with `/helper --quick`**: The one-screen reference orients you fast.
2. **Use natural language**: Ask a question such as "how do I...", and get a targeted recommendation.
3. **Check flags before running**: `/helper --flags act` shows every flag with its examples.
4. **Compare when unsure**: `/helper --compare` shows exactly when each command is best.
5. **Explore topics**: Use `--topic` for a deep dive into the domains, the tiers, the agents, and the teams.

---

## review / optimize / audit / improve: Keyword Router on /act (canonical as of v12.1.2)

### What It Does

In v12.1.2, `/act` absorbed the standalone `/improve` skill through a
first-token keyword router. The first request token of `/act` can be
`improve`, `review`, `audit`, or `optimize`. In that case, `/act` strips the
keyword and sets an internal `mode`. It then proceeds through the standard
5-state pipeline. V11.0 `/improve` shipped a controller-based quality engine
with three modes, which are review, optimize, and full. That engine is
preserved, and only the invocation surface changed.

### When to Use the Keyword Router

- **Audit code, docs, content, infrastructure**: `/act review <target>`, or
  the alias `/act audit <target>`. The default review pipeline is the same
  3-group parallel specialist review that V11 used.
- **Measure then optimize**: `/act optimize <target>` improves the
  performance, the size, or the efficiency. It gives you the metric deltas
  from before and after, and it gives you an atomic rollback.
- **Both with a single shared baseline**: `/act improve <target>` runs the
  review, and then the optimize. It synthesizes both into one unified
  `improve_report.md`.

### Keyword Router Contract

The match is case-insensitive, and it runs on the first whitespace-separated
token of `$ARGUMENTS`. If that token matches, `/act` strips the keyword from
the request and sets the inferred mode:

| First-word keyword | Inferred mode | Artifacts produced |
|--------------------|---------------|-------------------|
| `review` | review | `reports/aggregate.yaml`, `reports/quality_gates.yaml`, `reports/auto_fixes.yaml`, `reports/final_report.md` |
| `audit` | review (alias) | Same as `review` mode |
| `optimize` | optimize | `workflow/opportunities.yaml`, `workflow/baseline_metrics.yaml`, `outputs/optimization_report.md`, `_projects/{hash}/improve/history.yaml` |
| `improve` | full | `improve_report.md` with `## Review Findings` and `## Optimizations Applied` sections |

### Key Flags

The mode-specific flags from the V11.0 `/improve` surface carry through
unchanged. They bind to the inferred mode after `/act` strips the keyword.

| Flag | Description | Modes |
|------|-------------|-------|
| `--scope <path>` | Optional positional / explicit scope | all |
| `--dry-run` | Plan without applying changes | all |
| `--auto-fix safe` | Apply safe auto-fixes | review |
| `--baseline <id>` / `--suppress <id>` | Baseline + suppression | review |
| `--benchmark auto\|lighthouse\|k6\|hyperfine` | Benchmark tool | optimize, full |
| `--history` | Append run to `_projects/{hash}/improve/history.yaml` | all |

### Override Rules

- An explicit `--mode standard` flag bypasses the keyword router. The first
  token is then part of the request.
- The keyword must be the **first** token. `/act check the audit logs` does
  NOT trigger improve-mode, because the first word is `check`.

### History

- V10.26.19–26: Cluster 4 landed `--mode review` on the standalone `/improve` skill, and it landed the `/review` shim.
- V10.26.27–35: Cluster 5 landed `--mode optimize`, `--mode full`, the `/optimize` shim, and the uniform deprecation warnings.
- V11.0.0: This version removed the `/review`, `/optimize`, `/context`, and `/debug` skills. `/improve` became the canonical V11 entry point.
- v12.1.2: `/act` absorbed `/improve` through the first-token keyword router. That router is now the canonical entry point.

### Canonical Reference

`@.claude/skills/act/reference/improve-mode.md` holds the full router
contract, the override rules, the stripping examples, and the mode-specific
controller behavior.

---


## /designer covers more than software (v12.7.x scope expansion)

As of v12.7.x, `/designer` is a **"design ANYTHING"** tool. It is not a
software-only design tool. The same 6-phase Q&A workflow now handles the
non-software design domains. It does this with the tracked reference docs in
`.claude/skills/designer/reference/domains/`. These are the non-software
triggers that a user should know about:

- `/designer design a research study on caffeine and sleep latency`
- `/designer design a 6-week curriculum on prompt engineering`
- `/designer design my morning routine`
- `/designer design a board game about supply-chain logistics`
- `/designer design a wedding for 80 people on a $15k budget`
- `/designer design a 3D-printed enclosure for an electronics project`
- `/designer` with no arguments. The novice topic-bootstrap path then asks
  "design what kind of thing: a system, a process, an experience, or an
  artifact?"

The eight domain branches `/designer` now recognizes are: Software, Business,
Creative, Research, Education, Physical/Product, Personal, and Game. The build
menu in Phase 6 now also offers three non-implementation exits. They are Export
PDF/Markdown, Share read-only link, and Manual-execute checklist. These exits
serve the designs that `/act` and `/team` do not "build", such as a wedding, a
curriculum, or a personal routine.

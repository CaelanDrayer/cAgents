# Command Detail Summaries

Per-command summaries used by Mode 2 and Mode 10 of `/helper`. Read this when the user asks for what a specific command does, when to use it, or its key flags.

## /run - Universal Workflow Engine

**What**: The general-purpose command that handles any task. It detects the domain (engineering, creative, business, people, service), classifies complexity via a 9-signal scoring system, selects the optimal pipeline path (minimal/medium/full), coordinates specialist agents, and validates results. Think of it as "do this thing for me."

**When to use**:
- Fix a bug, add a feature, refactor code
- Write content (stories, copy, documentation)
- Create business deliverables (budgets, campaigns, reports)
- Answer complex questions requiring expert analysis
- Any task that needs to get DONE

**Key flags**: `--interactive` (ask preferences), `--dry-run` (preview plan), `--quiet` (skip plan display), `--team` (parallel execution), `--domain` (force domain), `--tier` (force complexity)

**Workflow**: routing -> planning -> coordinating -> executing -> validating

## /designer - Interactive Design Engine

**What**: A structured 4-phase design tool that transforms ideas into implementation-ready documents through guided questioning. It explores your problem, generates alternatives, refines details, and produces artifacts (specs, diagrams, user stories). Think of it as "help me think this through before building."

**When to use**:
- Planning a new feature before writing code
- Designing system architecture
- Exploring options when you are unsure of the approach
- Creating design documents, tech specs, or story bibles
- When you want to THINK before you BUILD

**Key flags**: `--resume {id}` (continue session), `--template <name>` (use template), `--focus <area>` (focus direction), `--detail <level>` (detail depth)

**Workflow**: Discovery (15%) -> Ideation (25%) -> Refinement (35%) -> Specification (25%) -> Build offer

## /improve - Unified Review + Optimize Engine

**What**: A single 7-state state machine (`SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING`) with a `--mode` selector that owns code, docs, and content review plus measurable optimization. Replaces the V10 `/review` and `/optimize` skills with one engine and one shared baseline. Think of it as "audit, improve, and prove the delta."

**When to use**:
- Audit code, docs, content, infrastructure (`/improve --mode review`)
- Speed up slow code, reduce bundle size, cut costs with measured before/after metrics (`/improve --mode optimize`)
- Do both with one shared baseline (`/improve --mode full --scope <path>`)

**Modes**:

| Mode | What it does |
|------|--------------|
| `review` (default) | 3-group parallel specialist review; optional auto-fix; 12 prime directives |
| `optimize` | Opportunity scanners; ROI rank; atomic apply; before/after benchmark delta |
| `full` | Review → optimize with shared baseline; unified `improve_report.md` |

**Key flags**: `--mode review|optimize|full` (select branch), `--scope <path>` (required for `full`), `--baseline` / `--suppress <id>` (review baselines), `--benchmark auto|lighthouse|k6|hyperfine` (optimize benchmark tool), `--dry-run` (preview), `--auto-fix safe` (review only)

**Workflow**: SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING

> _V11.0 removed `/review`, `/optimize`, `/context`, `/debug` — see [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md). Migrate `/review` to `/improve --mode review`, `/optimize` to `/improve --mode optimize`, `/context` to `/run context`, and `/debug` to `/run --mode debug`._

## /team - Parallel Team Execution

**What**: A parallel execution layer that decomposes large tasks into work items and runs them simultaneously using Claude Code's built-in agent teams. Each teammate executes their work item via `/run` in their own context (with optional tmux split pane display). Think of it as "/run but parallel for big tasks."

**When to use**:
- Large features with 3+ independent components
- Tier 3+ complex workflows that benefit from parallelism
- Time-sensitive delivery requiring speedup
- Multi-part tasks where pieces can run independently

**Key flags**: `--dry-run` (preview team composition), `--members <N>` (limit team size), `--lead <agent>` (specify team lead), `--teammate-mode tmux|in-process` (display mode), `--display` (show team communication)

**Workflow**: Decompose -> Create Team -> Spawn Teammates -> Parallel /run per item -> Aggregate Results

## /org - Corporate Hierarchy Orchestration

**What**: A corporate hierarchy orchestrator that coordinates multi-domain initiatives. A CEO (inline) engages C-suite agents for domain analysis, conducts deliberation with objection rounds, produces a strategic brief, then delegates to sequential /team invocations per domain (dependency-ordered). For single-domain tasks, it shortcuts to /run or /team. Think of it as "coordinate across multiple business domains."

**When to use**:
- Multi-domain initiatives (engineering + marketing + hiring)
- Product launches requiring cross-domain coordination
- Strategic-level tasks with risk registers and dependency management
- Company restructures or major migrations spanning domains

**Key flags**: `--dry-run` (preview routing), `--quick` (skip deliberation), `--domains <d1,d2,...>` (force domains), `--resume <id>` (resume session)

**Workflow**: CEO Routing -> C-Suite Analysis -> Deliberation -> Strategic Brief -> Sequential /team per domain -> Integration

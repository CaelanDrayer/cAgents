# Command Selection Decision Matrix

Guide for choosing the right cAgents skill for your task.

_V11.0 removed /review, /optimize, /context, /debug — see [MIGRATION-V11.md](./MIGRATION-V11.md). v12.1.2 folded /improve into /run via a first-word keyword router. v12.2.0 removed /org and absorbed it into /team strategic mode._

This decision matrix routes review and optimization work to `/run review|optimize|improve <target>` (v12.1.2+ keyword router; or `/run --mode review|optimize|full`), product context to `/run context <subcmd>`, systematic debugging to `/run --mode debug`, and cross-domain coordination to `/team --strategic` (v12.2.0+; auto-enabled when `router.domain_count >= 2`).

## Quick Decision Tree

```
Is this a multi-domain strategic initiative?
  YES -> /team (strategic mode auto-enables; force with --strategic) [v12.2.0+]
         (Pre-v12.2.0 this was /org, now absorbed into /team strategic mode.)
  NO  -> Is the work parallelizable with 3+ independent items?
           YES -> /team
           NO  -> Is this an interactive design session?
                    YES -> /designer
                    NO  -> Is this a review of existing code/content?
                             YES -> /run review <target>  (or /run --mode review)
                             NO  -> Is this an optimization of existing work?
                                      YES -> /run optimize <target>  (or /run --mode optimize)
                                      NO  -> Want both review and optimize with one baseline?
                                               YES -> /run improve <target>  (or /run --mode full)
                                               NO  -> /run
```

## Decision Matrix

| Criteria | /run (incl. review/optimize/improve modes) | /team (incl. strategic mode) | /designer | /helper |
|----------|--------------------------------------------|-------------------------------|-----------|---------|
| **Scope** | Single domain (build) or single target (review/optimize/full) | Single domain (flat) or multi-domain (strategic mode) | Single artifact | Any |
| **Work items** | 1-5 (build); varies (review/optimize) | 3+ parallel; 5+ cross-domain (strategic mode) | 1 design | N/A |
| **Execution** | Sequential 5-state pipeline (review/optimize/full run the same 5 states, with improve phases carried controller-internally) | N-wave parallel; Wave 0/1/2 C-suite + 3..N per-domain in strategic mode | Interactive Q&A | Reference only |
| **Speed** | Fastest for simple; fast (parallel review) for review/optimize/full | 40-60% faster for complex; slower with strategic-mode deliberation | User-paced | Instant |
| **Min complexity** | Tier 2 | Tier 2 (3+ items); Tier 3+ for strategic mode | Any | Any |
| **Context mode** | Inline (none) | Fork | Inline (none) | Inline (none) |
| **User interaction** | None (auto-proceed) | None (auto-proceed) | Every step (mandatory) | Interactive (recommendations) |

## When to Use Each

### /run - Default Pipeline
- **Best for**: Bug fixes, single features, simple changes, sequential work
- **Examples**: "Fix auth bug", "Add user endpoint", "Write unit tests"
- **Characteristics**: Event-driven pipeline, single controller, fastest for simple tasks
- **Passthroughs**: `/run context show|init|update|clear` (product context), `/run --mode debug <bug>` (systematic debugging)
- **Avoid when**: Work has 3+ parallelizable items (use /team instead)

### /team - Parallel Team Execution
- **Best for**: Complex features with parallelizable components, time-sensitive delivery
- **Examples**: "Build OAuth2 system", "Implement dashboard with API + UI + tests"
- **Characteristics**: N-wave parallel execution, quality gates between waves, 40-60% faster
- **Avoid when**: Fewer than 3 work items, fully sequential dependencies
- **Falls back to**: /run if <3 items or no parallelism

### /team --strategic - Cross-Domain Coordination (v12.2.0+; replaces /org)
- **Best for**: Strategic initiatives spanning multiple business domains
- **Examples**: "Launch new product", "Restructure engineering team", "Migrate to microservices"
- **Characteristics**: CEO inline + C-suite Wave 0/1/2 analysis and deliberation, per-domain Wave 3..N dispatch — all inside a single `/team` session with nested waves
- **Trigger**: Strategic mode auto-enables when `router.domain_count >= 2`; force-enable with `--strategic`, force-disable with `--no-strategic`
- **Avoid when**: Work fits in a single domain (use /run or flat /team instead)
- **Migration**: Pre-v12.2.0 this was `/org`, which has been removed and absorbed here

### /designer - Interactive Design
- **Best for**: Design documents, architecture specs, creative briefs that need user input
- **Examples**: "Design the API for user management", "Create technical spec for auth system"
- **Characteristics**: 4-phase interactive engine, asks user at every step, endless refinement
- **Avoid when**: You want autonomous execution (designer always asks)

### /run review|optimize|improve - Review + Optimization Modes (v12.1.2+; replaces standalone /improve)
- **Best for**: Reviewing existing code/content, applying optimizations with metrics, or both with a shared baseline
- **Examples**:
  - `/run review src/auth/` — audit auth module for security/quality issues (= `--mode review`)
  - `/run optimize src/api/` — reduce response times with before/after benchmarks (= `--mode optimize`)
  - `/run improve src/checkout/` — review then optimize with one baseline (= `--mode full`)
- **Characteristics**: Runs through `/run`'s standard 5-state machine (INIT → ORCHESTRATED → PLANNED → COORDINATED → VALIDATED); the improve phases (scoping, measuring, detecting, planning, executing, validating, reporting) are carried controller-internally during the PLANNED state rather than as a distinct state machine. Atomic rollback, pattern-effectiveness tracking, unified `improve_report.md`
- **Mode selection**: keyword router (first word `review|audit|optimize|improve`) or explicit `--mode review|optimize|full`
- **Migration**: Pre-v12.1.2 this was the standalone `/improve` skill, which was folded into `/run` via the keyword router
- **Avoid when**: Creating new work (use plain `/run`) or designing before building (use `/designer`)

### /helper - Command Reference
- **Best for**: Choosing between skills, learning what each does, comparing flags
- **Examples**: `/helper`, `/helper --compare`, `/helper improve`
- **Characteristics**: Interactive decision tree, deep dives per command, recommendations
- **Avoid when**: Executing tasks directly — /helper only explains, never runs

## Complexity Tier Reference

| Tier | Description | Recommended Skill |
|------|-------------|-------------------|
| 2 (Moderate) | Single component, clear scope | /run |
| 3 (Complex) | Multiple components, external deps | /team or /run |
| 4 (Expert) | Strategic, company-wide | /team --strategic (v12.2.0+; replaces /org) |

## Flags Reference

| Flag | Skills | Effect |
|------|--------|--------|
| `--dry-run` | /run (incl. review/optimize/full modes), /team (incl. strategic mode) | Preview plan without executing |
| `--team` | /run | Force team mode from /run |
| `--waves N` | /team | Set minimum wave count |
| `--members N` | /team | Max teammates per wave |
| `--analytics` | /run | Show execution analytics |
| `--mode review\|optimize\|full` | /run | Select review, optimize, or chained mode (v12.1.2+: `/run review|optimize|improve` keyword router selects automatically) |
| `--mode debug` | /run | Systematic 4-phase debugging passthrough |
| `--scope <path>` | /run | Restrict scope to a path (for review/optimize modes) |
| `--baseline` | /run | Establish review baseline (for review/optimize modes) |
| `--suppress` | /run | Suppress baselined findings (for review/optimize modes) |
| `--benchmark` | /run | Capture before/after benchmark numbers (for optimize/full modes) |
| `--focus <area>` | /designer, /run | Focus on a specific area (for review/optimize modes on /run) |

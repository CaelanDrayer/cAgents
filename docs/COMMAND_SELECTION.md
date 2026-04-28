# Command Selection Decision Matrix

Guide for choosing the right cAgents skill for your task.

_V11.0 removed /review, /optimize, /context, /debug — see [MIGRATION-V11.md](./MIGRATION-V11.md)._

This decision matrix routes review and optimization work to `/improve --mode review|optimize|full`, product context to `/run context <subcmd>`, and systematic debugging to `/run --mode debug`.

## Quick Decision Tree

```
Is this a multi-domain strategic initiative?
  YES -> /org
  NO  -> Is the work parallelizable with 3+ independent items?
           YES -> /team
           NO  -> Is this an interactive design session?
                    YES -> /designer
                    NO  -> Is this a review of existing code/content?
                             YES -> /improve --mode review
                             NO  -> Is this an optimization of existing work?
                                      YES -> /improve --mode optimize
                                      NO  -> Want both review and optimize with one baseline?
                                               YES -> /improve --mode full
                                               NO  -> /run
```

## Decision Matrix

| Criteria | /run | /team | /org | /designer | /improve | /helper |
|----------|------|-------|------|-----------|----------|---------|
| **Scope** | Single domain | Single domain | Multi-domain | Single artifact | Existing code/content/system | Any |
| **Work items** | 1-5 | 3+ parallel | 5+ cross-domain | 1 design | Varies | N/A |
| **Execution** | Sequential | N-wave parallel | Corporate hierarchy | Interactive Q&A | 7-state state machine | Reference only |
| **Speed** | Fastest for simple | 40-60% faster for complex | Slowest (full hierarchy) | User-paced | Fast (parallel review) to moderate (full mode) | Instant |
| **Min complexity** | Tier 2 | Tier 2 (3+ items) | Tier 3+ | Any | Any | Any |
| **Context mode** | Inline (none) | Fork | Inline (none) | Inline (none) | Fork | Inline (none) |
| **User interaction** | None (auto-proceed) | None (auto-proceed) | None (auto-proceed) | Every step (mandatory) | None | Interactive (recommendations) |

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

### /org - Corporate Hierarchy
- **Best for**: Strategic initiatives spanning multiple business domains
- **Examples**: "Launch new product", "Restructure engineering team", "Migrate to microservices"
- **Characteristics**: CEO + C-suite analysis, cross-domain coordination, sequential /team per domain
- **Avoid when**: Work fits in a single domain (use /run or /team instead)

### /designer - Interactive Design
- **Best for**: Design documents, architecture specs, creative briefs that need user input
- **Examples**: "Design the API for user management", "Create technical spec for auth system"
- **Characteristics**: 4-phase interactive engine, asks user at every step, endless refinement
- **Avoid when**: You want autonomous execution (designer always asks)

### /improve - Unified Review + Optimization Engine
- **Best for**: Reviewing existing code/content, applying optimizations with metrics, or both with a shared baseline
- **Examples**:
  - `/improve --mode review src/auth/` — audit auth module for security/quality issues
  - `/improve --mode optimize src/api/` — reduce response times with before/after benchmarks
  - `/improve --mode full --scope src/checkout/` — review then optimize with one baseline
- **Characteristics**: Single 7-state state machine (SCOPING → MEASURING → DETECTING → PLANNING → EXECUTING → VALIDATING → REPORTING), atomic rollback, pattern-effectiveness tracking, unified `improve_report.md`
- **Mode selection**: `--mode review` (find issues), `--mode optimize` (apply changes), `--mode full` (chained)
- **Avoid when**: Creating new work (use /run instead) or designing before building (use /designer)

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
| 4 (Expert) | Strategic, company-wide | /org or /team |

## Flags Reference

| Flag | Skills | Effect |
|------|--------|--------|
| `--dry-run` | /run, /team, /org, /improve | Preview plan without executing |
| `--team` | /run | Force team mode from /run |
| `--waves N` | /team | Set minimum wave count |
| `--members N` | /team | Max teammates per wave |
| `--analytics` | /run | Show execution analytics |
| `--mode review\|optimize\|full` | /improve | Select review, optimize, or chained mode |
| `--mode debug` | /run | Systematic 4-phase debugging passthrough |
| `--scope <path>` | /improve | Restrict scope to a path |
| `--baseline` | /improve | Establish review baseline |
| `--suppress` | /improve | Suppress baselined findings |
| `--benchmark` | /improve | Capture before/after benchmark numbers |
| `--focus <area>` | /designer, /improve | Focus on a specific area |

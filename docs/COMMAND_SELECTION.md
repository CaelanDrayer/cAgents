# Command Selection Decision Matrix

Guide for choosing the right cAgents skill for your task.

## Quick Decision Tree

```
Is this a multi-domain strategic initiative?
  YES -> /org
  NO  -> Is the work parallelizable with 3+ independent items?
           YES -> /team
           NO  -> Is this an interactive design session?
                    YES -> /designer
                    NO  -> Is this a review of existing code/content?
                             YES -> /review
                             NO  -> Is this an optimization of existing work?
                                      YES -> /optimize
                                      NO  -> /run
```

## Decision Matrix

| Criteria | /run | /team | /org | /designer | /review | /optimize |
|----------|------|-------|------|-----------|---------|-----------|
| **Scope** | Single domain | Single domain | Multi-domain | Single artifact | Existing code/content | Existing system |
| **Work items** | 1-5 | 3+ parallel | 5+ cross-domain | 1 design | Varies | Varies |
| **Execution** | Sequential | N-wave parallel | Corporate hierarchy | Interactive Q&A | Parallel agents | 5-phase pipeline |
| **Speed** | Fastest for simple | 40-60% faster for complex | Slowest (full hierarchy) | User-paced | Fast (parallel) | Moderate |
| **Min complexity** | Tier 2 | Tier 2 (3+ items) | Tier 3+ | Any | Any | Any |
| **Context mode** | Inline (none) | Fork | Inline (none) | Inline (none) | Fork | Fork |
| **User interaction** | None (auto-proceed) | None (auto-proceed) | None (auto-proceed) | Every step (mandatory) | None | None |

## When to Use Each

### /run - Default Pipeline
- **Best for**: Bug fixes, single features, simple changes, sequential work
- **Examples**: "Fix auth bug", "Add user endpoint", "Write unit tests"
- **Characteristics**: Event-driven pipeline, single controller, fastest for simple tasks
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
- **Characteristics**: 6-phase interactive engine, asks user at every step, endless refinement
- **Avoid when**: You want autonomous execution (designer always asks)

### /review - Code/Content Review
- **Best for**: Reviewing existing code, content, or systems for quality issues
- **Examples**: "Review PR #123", "Audit security of auth module"
- **Characteristics**: Parallel agent review, review profiles, baseline suppression
- **Avoid when**: Creating new work (use /run instead)

### /optimize - System Optimization
- **Best for**: Optimizing existing systems, performance tuning, refactoring
- **Examples**: "Optimize database queries", "Reduce bundle size"
- **Characteristics**: 5-phase pipeline with atomic rollback, benchmark integration
- **Avoid when**: Building new features (use /run instead)

## Complexity Tier Reference

| Tier | Description | Recommended Skill |
|------|-------------|-------------------|
| 2 (Moderate) | Single component, clear scope | /run |
| 3 (Complex) | Multiple components, external deps | /team or /run |
| 4 (Expert) | Strategic, company-wide | /org or /team |

## Flags Reference

| Flag | Skills | Effect |
|------|--------|--------|
| `--dry-run` | /run, /team, /org | Preview plan without executing |
| `--team` | /run | Force team mode from /run |
| `--waves N` | /team | Set minimum wave count |
| `--members N` | /team | Max teammates per wave |
| `--analytics` | /run | Show execution analytics |
| `--baseline` | /review | Set review baseline |
| `--profile` | /review | Use review profile |
| `--benchmark` | /optimize | Include benchmark comparison |
| `--history` | /optimize | Show optimization history |

# Migration Guide

How to move from single-purpose plugins (`feature-dev`, `code-review`) to cAgents.

## Why Migrate?

Single-purpose plugins handle one domain with a linear workflow. cAgents handles 15 domains with a config-driven state machine that routes, plans, decomposes, reviews, and revises — automatically.

| Dimension | feature-dev | code-review | cAgents |
|-----------|------------|------------|---------|
| **Agent count** | ~3 | ~3 | 262 |
| **Domains** | Engineering only | Engineering only | 15 (engineering, creative, business, growth, people, service, leadership, shared, science, health, education, personal, arts, trades, core) |
| **Workflow** | Linear, single-pass | Linear, single-pass | State machine: INIT → ORCHESTRATED → PLANNED → DECOMPOSED → COORDINATED → VALIDATED |
| **Revision loops** | None | None | Executor → Reviewer (max 3 rounds per work item), PASS/FAIL/REVISE routing (max 5 cycles) |
| **Parallel execution** | No | No | N-wave parallel teams with per-wave quality gates (40-60% faster) |
| **Cross-domain** | No | No | Yes — single command spans engineering + business + creative |
| **Hook lifecycle** | 1-4 hooks | 1-4 hooks | 21 registered hooks (session init, secret detection, attention injection, team lifecycle, completion verification) |

## Command Equivalents

### feature-dev → /run

`/run` is the direct replacement for `/feature-dev`. It does everything feature-dev does, plus automatic routing, revision loops, and reviewer validation.

```bash
# feature-dev
/feature-dev Add OAuth login to the app

# cAgents equivalent
/run Add OAuth login to the app
```

What changes:
- cAgents auto-detects the engineering domain — no manual domain selection
- An `engineering-manager` controller coordinates the work via question-based delegation instead of direct invocation
- A reviewer validates spec compliance then code quality before the work is marked done
- If validation fails, the pipeline re-runs the controller (up to 5 cycles) instead of stopping

### code-review → /review

`/review` is the direct replacement for code-review plugins. It runs parallel specialist agents instead of a single sequential pass.

```bash
# code-review plugin
/code-review src/auth/

# cAgents equivalent
/review src/auth/
```

What changes:
- Security, code quality, and performance reviewers run in parallel instead of sequentially
- Each reviewer reports findings with CRITICAL/HIGH/LOW severity tiers
- `/review` can auto-fix findings via `--fix` flag
- Review baselines suppress known issues via `--baseline`

### No Equivalent → /team, /org

These have no feature-dev or code-review counterpart. Use them when you need:

```bash
# Parallel execution with 5-7 quality-gated waves
/team Build the user authentication system

# Cross-domain strategy via C-suite agents
/org Plan Q3 product launch
```

## When to Upgrade

### Upgrade from feature-dev if you need:

**Cross-domain work**: feature-dev only handles engineering. If a feature touches backend + marketing copy + content strategy, `/run` routes across domains automatically.

```bash
/run Add a referral program            # engineering + growth in one request
```

**Parallel execution**: feature-dev runs agents sequentially. `/team` runs them in waves with quality gates — 40-60% faster for complex features.

```bash
/team Implement the checkout flow      # frontend + backend + tests in parallel waves
```

**Quality-gated pipelines**: feature-dev has no revision loops. cAgents reviewers catch issues before marking work done, then re-run the executor if anything fails spec compliance.

**Confidence scoring**: Each work item gets a 0.0-1.0 confidence score. Items below 0.7 get extra scrutiny before the pipeline proceeds.

### Upgrade from code-review if you need:

**Parallel specialist review**: `/review` runs security, quality, and performance reviewers simultaneously instead of one reviewer making all calls.

**Auto-fix**: `/review --fix` routes findings back into the pipeline to be fixed, not just reported.

**Review baselines**: `/review --baseline` records known issues so repeat runs only surface new findings.

**Tier 3+ blind review**: For complex work, multiple reviewers evaluate independently and a Devil's Advocate challenges unanimous PASS decisions.

## Migration Path

### 1. Start with /run for single tasks

Replace your `/feature-dev` invocations one-for-one with `/run`. The routing is automatic — you don't need to specify agents, domains, or controllers.

```bash
/run Fix the login page redirect bug
/run Add email notifications for new signups
/run Write documentation for the API endpoints
```

### 2. Move complex features to /team

Any feature with 3+ independent components benefits from parallel wave execution.

```bash
/team Build the user dashboard         # data layer + UI components + test suite in parallel
/team Implement the billing module     # Stripe integration + UI + tests + docs
```

### 3. Use /org for cross-domain strategy

When work spans engineering + business + people or needs executive-level analysis:

```bash
/org Plan the new developer onboarding experience
/org Decide on our API versioning strategy
```

### 4. Replace code-review with /review

```bash
/review src/                           # Full codebase review
/review src/auth/ --fix                # Review auth module and auto-fix findings
/review src/ --baseline                # First run: establish baseline
/review src/ --baseline --suppress     # Subsequent runs: suppress known issues
```

## Token Usage

cAgents uses more tokens than single-purpose plugins. Each subagent in the pipeline consumes tokens independently. Expect:

| Command | Approximate multiplier vs direct Claude |
|---------|----------------------------------------|
| `/run` (tier 2) | 10-20x |
| `/run` (tier 3) | 20-40x |
| `/team` | 30-60x |
| `/org` | 50-100x |

This overhead buys automatic routing, reviewer loops, revision routing, and quality-gated execution. For small single-file fixes, use Claude Code directly — cAgents is optimized for multi-step work that benefits from coordination.

## Troubleshooting

**Wrong domain detected**: Add explicit domain keywords (`engineering`, `marketing`, `legal`, etc.) to your request.

**Too many tokens for simple tasks**: Use Claude Code directly for single-file fixes. cAgents is designed for multi-step, multi-agent work.

**Review finds no issues**: If the codebase is genuinely clean, `/review` will report a passing score. Use `--profile strict` for stricter thresholds.

**Pipeline stalls in coordinating phase**: The controller is waiting for execution agents. Check that the session directory exists under `Agent_Memory/sessions/` and that `coordination_log.yaml` is being written.

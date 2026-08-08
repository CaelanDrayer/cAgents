# Migration Guide

> **Current cAgents version**: v12.20.0 — 58 agents across 9 builder-role archetypes (developer, operator, advisor, analyst, creator, writer, strategist, core, leadership), 4 in-terminal skills (`/run`, `/team`, `/designer`, `/helper`). V10.x commands `/review`, `/optimize`, `/context`, `/debug` were removed in V11.0; `/improve` was folded into `/run` via the keyword router in v12.1.2; `/org` was removed in v12.2.0 and folded into `/team` strategic mode.

How to move from single-purpose plugins (`feature-dev`, `code-review`) to cAgents v12.x.

> **V11.0 Note**: This guide covers migrating from external plugins to cAgents. For users upgrading from cAgents V10.x to V11.0+ (where `/review`, `/optimize`, `/context`, and `/debug` were removed and consolidated under `/improve`), see [docs/MIGRATION-V11.md](MIGRATION-V11.md) for command-by-command replacements. For V11 → V12 migrations (v12.1.2 `/improve` fold, v12.2.0 `/org` removal), see [CHANGELOG.md](../CHANGELOG.md).

## Why Migrate?

Single-purpose plugins handle one domain with a linear workflow. cAgents handles work across 9 builder-role archetypes with a config-driven state machine that routes, plans, decomposes, reviews, and revises — automatically.

| Dimension | feature-dev | code-review | cAgents |
|-----------|------------|------------|---------|
| **Agent count** | ~3 | ~3 | 57 |
| **Archetypes** | Engineering only | Engineering only | 9 builder-role archetypes (developer, operator, advisor, analyst, creator, writer, strategist, core, leadership) |
| **Workflow** | Linear, single-pass | Linear, single-pass | State machine: INIT → ORCHESTRATED → PLANNED → COORDINATED → VALIDATED |
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
- An `tech-lead` controller coordinates the work via question-based delegation instead of direct invocation
- A reviewer validates spec compliance then code quality before the work is marked done
- If validation fails, the pipeline re-runs the controller (up to 5 cycles) instead of stopping

### code-review → /run review

`/run review` is the direct replacement for code-review plugins. It runs parallel specialist agents instead of a single sequential pass. (V11.0 unified the previous `/review` and `/optimize` skills under `/improve`; v12.1.2 folded `/improve` into `/run` via the first-word keyword router. See [docs/MIGRATION-V11.md](MIGRATION-V11.md) for the V10→V11 mapping and CHANGELOG entries for the v12 folds.)

```bash
# code-review plugin
/code-review src/auth/

# cAgents equivalent (v12.1.2+)
/run review src/auth/
```

What changes:
- Security, code quality, and performance reviewers run in parallel instead of sequentially
- Each reviewer reports findings with CRITICAL/HIGH/LOW severity tiers
- `/run optimize` (or `/run improve` = `--mode full`) applies fixes with before/after metrics and atomic rollback
- Review baselines suppress known issues via `--baseline` and `--suppress`

### No Equivalent → /team (with strategic mode for cross-domain)

These have no feature-dev or code-review counterpart. Use them when you need:

```bash
# Parallel execution with 5-7 quality-gated waves
/team Build the user authentication system

# Cross-domain strategy via C-suite agents (strategic mode auto-enables for multi-domain requests)
/team Plan Q3 product launch
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

**Parallel specialist review**: `/run review` runs security, quality, and performance reviewers simultaneously instead of one reviewer making all calls.

**Apply-and-measure pipeline**: `/run optimize` (or `/run improve` = `--mode full`) carries findings through into atomic, rollback-safe changes with before/after metrics — not just a report.

**Review baselines**: `/run review --baseline` records known issues so repeat runs only surface new findings (use `--suppress` to silence baselined findings).

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

### 3. Use /team strategic mode for cross-domain strategy

When work spans engineering + business + people or needs executive-level analysis, `/team` auto-enables strategic mode (Wave 0/1/2 = C-suite deliberation, Wave 3..N = per-domain dispatch) when `router.domain_count >= 2`. Force-enable with `--strategic`:

```bash
/team Plan the new developer onboarding experience
/team Decide on our API versioning strategy --strategic
```

(Pre-v12.2.0 this was `/org Plan ...` — the `/org` skill was removed in v12.2.0 and absorbed into `/team` strategic mode.)

### 4. Replace code-review with /run review (v12.1.2+ keyword router)

```bash
/run review src/                          # Full codebase review
/run improve --scope src/auth/            # Review auth module then apply fixes with metrics (= --mode full)
/run review src/ --baseline               # First run: establish baseline
/run review src/ --baseline --suppress    # Subsequent runs: suppress known issues
```

(Pre-v12.1.2 this was `/improve --mode review|optimize|full` — the `/improve` skill was folded into `/run` in v12.1.2 via the first-word keyword router; all original flags carried over.)

## Token Usage

cAgents uses more tokens than single-purpose plugins. Each subagent in the pipeline consumes tokens independently. Expect:

| Command | Approximate multiplier vs direct Claude |
|---------|----------------------------------------|
| `/run` (tier 2) | 10-20x |
| `/run` (tier 3) | 20-40x |
| `/team` (standard) | 30-60x |
| `/team --strategic` (cross-domain; auto-enables for multi-domain requests, replaces removed `/org`) | 50-100x |

This overhead buys automatic routing, reviewer loops, revision routing, and quality-gated execution. For small single-file fixes, use Claude Code directly — cAgents is optimized for multi-step work that benefits from coordination.

## Troubleshooting

**Wrong domain detected**: Add explicit domain keywords (`engineering`, `marketing`, `legal`, etc.) to your request.

**Too many tokens for simple tasks**: Use Claude Code directly for single-file fixes. cAgents is designed for multi-step, multi-agent work.

**Review finds no issues**: If the codebase is genuinely clean, `/run review` will report a passing score. Use `--focus security` (or another focus area) to narrow scrutiny.

**Pipeline stalls in coordinating phase**: The controller is waiting for execution agents. Check that the session directory exists under `cagents-memory/sessions/` and that `coordination_log.yaml` is being written.

## v12.66.0 — `/run` is now `/act`

> **Read this before running any example above.** Every `/run ...` command in
> this guide predates v12.66.0 and no longer invokes cAgents. Substitute `/act`.

Claude Code now ships a **built-in `run` skill**, and the two names collide.
cAgents renamed its own skill to `/act` in v12.66.0.

There is **no back-compat shim and no alias.** `/run` does not error and does
not fall through to cAgents. It invokes Claude Code's built-in skill, which
launches and drives your project's app. That is a completely different
operation, and nothing warns you that you got the wrong one. This is the one
failure mode to watch for while your muscle memory catches up.

| Before v12.66.0 | Now |
|---|---|
| `/run <request>` | `/act <request>` |
| `/run review src/` | `/act review src/` |
| `/run improve --scope src/auth/` | `/act improve --scope src/auth/` |
| `/run optimize <target>` | `/act optimize <target>` |
| `/run context <request>` | `/act context <request>` |
| `/run --mode debug <request>` | `/act --mode debug <request>` |

Only the command name changed. Flags, modes, the first-word keyword router, the
controller catalog, and the 5-state pipeline all behave exactly as before.
`/team`, `/designer`, and `/helper` are unaffected.

**Why there is no alias.** Slash commands resolve inside the Claude Code harness
before any cAgents hook observes a tool call. No hook, config, or alias file in
this repository can intercept `/run` and forward it to `/act`. Renaming was the
only fix available. (`scripts/migration/v12-aliases.yaml` records the rename
under `skill_aliases` for documentation purposes; that file has no runtime
consumer for skill names.)

**Your existing sessions are safe.** Session directories are **not** renamed.
New sessions are created as `act_*`; the existing `run_*` directories under
`cagents-memory/sessions/` and `cagents-memory/_archive/` keep their names and
continue to resolve, resume, and get garbage-collected, because `run_` is
retained as a legacy prefix. You do not need to migrate anything on disk.

**Historical references in this guide are intentional.** Text above describing
what a command was called in v12.1.2 or v12.2.0 still says `/run`, because that
is what it was called then.

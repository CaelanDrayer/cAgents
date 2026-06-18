# Getting Started with cAgents

Five minutes from install to your first orchestrated result. This guide reflects **v12.20.0 current** — 57 agents across 9 builder-role archetypes (post-v12.20.0 catalog consolidation; 41 routable + 16 core) and 4 user-invocable skills (`/designer`, `/helper`, `/run`, `/team`).

_V11.0 removed `/review`, `/optimize`, `/context`, and `/debug` — see [MIGRATION-V11.md](./MIGRATION-V11.md) for the migration path. v12.1.2 folded `/improve` into `/run` via a first-word keyword router. v12.2.0 removed `/org` and absorbed cross-domain coordination into `/team` strategic mode._

## Prerequisites

| Tool | Version | Official Documentation |
|------|---------|----------------------|
| Claude Code | latest | [docs.anthropic.com](https://docs.anthropic.com/en/docs/claude-code) |
| Node.js | >= 20 | [nodejs.org](https://nodejs.org/) |
| npm | comes with Node.js | [docs.npmjs.com](https://docs.npmjs.com/) |
| git | latest | [git-scm.com](https://git-scm.com/doc) |

## 1. Install

**From the Claude Code Marketplace** (recommended):
```bash
/plugin CaelanDrayer/cAgents
```

**Manual install**:
```bash
git clone https://github.com/CaelanDrayer/cAgents.git
claude --plugin-dir /path/to/cAgents
```

Requires Claude Code 2.1.69+ and Node.js (for hooks).

## 2. Your First Command

```bash
/run Fix the typo in README.md
```

That's it. cAgents handles everything else.

## 3. What Just Happened

Behind the scenes, the pipeline ran automatically:

1. **Router** detected this is an engineering task, tier 2 (moderate complexity)
2. **Orchestrator** enriched context — project structure, file locations, relevant patterns
3. **Planner** defined objectives and selected an `tech-lead` controller
4. **Decomposer** broke the task into work items with acceptance criteria
5. **Prompt Engineer** crafted optimized delegation prompts
6. **Controller** (`tech-lead`) asked a `backend-developer` to locate and fix the typo
7. **Reviewer** validated the fix against acceptance criteria (spec compliance, then code quality)
8. **Validator** confirmed the output meets quality gates — PASS

You got a validated fix without specifying a single agent or writing a single prompt.

## 4. Check the Session Artifacts

Every run writes structured artifacts to `cagents-memory/sessions/`:

```
cagents-memory/sessions/run_fix-typo-readme_YYMMDD_001/
├── workflow/
│   ├── enriched_context.yaml   # What the orchestrator discovered
│   ├── plan.yaml               # Objectives and controller selection
│   ├── work_items.yaml         # Decomposed tasks with acceptance criteria
│   └── coordination_log.yaml  # Controller Q&A, synthesis, and results
└── status.yaml                 # Pipeline state and completion status
```

These are readable YAML files. Inspect them to understand exactly what each agent did and why.

## 5. Next Steps

**Parallel execution** — complex tasks with multiple independent components:
```bash
/team Build a user authentication system
```
Spawns multiple specialist agents in parallel waves, each validated before the next wave starts. 40-60% faster than sequential execution for tier 3+ work.

**Strategic coordination** — work that spans multiple business domains (v12.2.0+):
```bash
/team Plan our Q3 product roadmap
```
Strategic mode auto-enables when `router` detects 2+ domains. Triggers CTO, CPO, and CFO analysis in Wave 0/1, cross-domain deliberation in Wave 2, and per-domain dispatch in Wave 3..N — all inside a single `/team` session. Force-enable for single-domain executive framing with `--strategic`; force-disable with `--no-strategic`. (Pre-v12.2.0 this was `/org`, now absorbed into `/team` strategic mode.)

**Interactive design** — clarify requirements before building:
```bash
/designer Build a payment processing integration
```
Guides you through structured Q&A to produce an implementation-ready design document before any code is written.

**Review existing work** (v12.1.2+: `/improve` was folded into `/run` via the first-word keyword router):
```bash
/run review src/auth/
```
Parallel specialist agents audit for security, correctness, maintainability, and style. Use `/run optimize src/auth/` to apply fixes with before/after metrics, or `/run improve src/auth/` (= `--mode full`) to chain review then optimize with one baseline. See [docs/MIGRATION-V11.md](MIGRATION-V11.md) for V10 `/review` and `/optimize` migration, and [CHANGELOG.md v12.1.2](../CHANGELOG.md) for the keyword-router contract.

**Not sure which command to use?**
```bash
/helper
```

## Token Budget Reminder

cAgents uses 10-50x more tokens than direct Claude Code interaction. `/team` (including strategic mode) amplifies this further. Check your usage in Claude Code's settings if you're on a metered plan.

For quick, single-file fixes, use Claude Code directly — cAgents is optimized for multi-step, multi-agent coordination.

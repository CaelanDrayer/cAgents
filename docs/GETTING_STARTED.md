# Getting Started with cAgents

Five minutes from install to your first orchestrated result. This guide reflects **V11.0.1 current** — 243 agents across 15 domains and 6 user-invocable skills (`/designer`, `/helper`, `/improve`, `/org`, `/run`, `/team`).

_V11.0 removed `/review`, `/optimize`, `/context`, and `/debug` — see [MIGRATION-V11.md](./MIGRATION-V11.md) for the migration path._

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
3. **Planner** defined objectives and selected an `engineering-manager` controller
4. **Decomposer** broke the task into work items with acceptance criteria
5. **Prompt Engineer** crafted optimized delegation prompts
6. **Controller** (`engineering-manager`) asked a `backend-developer` to locate and fix the typo
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

**Strategic coordination** — work that spans multiple business domains:
```bash
/org Plan our Q3 product roadmap
```
Triggers CTO, CPO, and CFO analysis, cross-domain deliberation, and a unified strategic brief — then hands off to engineering and business teams for execution.

**Interactive design** — clarify requirements before building:
```bash
/designer Build a payment processing integration
```
Guides you through structured Q&A to produce an implementation-ready design document before any code is written.

**Review existing work**:
```bash
/improve --mode review src/auth/
```
Parallel specialist agents audit for security, correctness, maintainability, and style. Use `/improve --mode optimize` to apply fixes with before/after metrics, or `/improve --mode full` to chain review then optimize with one baseline. See [docs/MIGRATION-V11.md](MIGRATION-V11.md) for V10 `/review` and `/optimize` migration.

**Not sure which command to use?**
```bash
/helper
```

## Token Budget Reminder

cAgents uses 10-50x more tokens than direct Claude Code interaction. `/team` and `/org` amplify this further. Check your usage in Claude Code's settings if you're on a metered plan.

For quick, single-file fixes, use Claude Code directly — cAgents is optimized for multi-step, multi-agent coordination.

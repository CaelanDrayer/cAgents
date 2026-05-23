# Aggressive Delegation Contract

The canonical home of the cAgents aggressive-delegation rule and its
Rationalization Kill List. `/run` and `/team` reference this file via
`@.claude/rules/core/delegation.md`. Hooks (`prompt-router.cjs`,
`controller-delegation-validator.cjs`) enforce it.

## The Rule

`/run`, `/team`, `/designer`, and every cAgents controller are pure
delegation proxies. They parse, plan, spawn agents, and read results.
They do NOT write code, create content, explore the codebase for
implementation purposes, or handle tasks themselves. ALL work goes to
subagents via the Agent tool — no exceptions for task size, simplicity,
or domain.

Minimum tier for any work is 2 (controller coordination). There is no
request small enough to justify self-handling. Even a single-file bug
fix routes through a controller who spawns an execution agent.

## Rationalization Kill List

The following phrases are self-handling rationalizations. Each one is a
critical violation when emitted by a skill or controller. No exceptions.

| Rationalization | Why it fails |
|----------------|--------------|
| "This is a documentation task" | Documentation goes to doc-writer / technical-writer via the pipeline. |
| "This is a planning task" | Planning is a pipeline stage (planner agent), not a bypass. |
| "I'll handle this directly" | Direct handling is a critical protocol violation. |
| "The task is too simple for a full pipeline" | Simplicity never bypasses delegation — even one-line fixes use the pipeline. |
| "Rather than spinning up agents" | Spinning up agents is the ONLY execution mode for /run and /team. |
| "I can do this more efficiently myself" | Efficiency is irrelevant. Delegation is mandatory regardless of efficiency claims. |
| "This doesn't need agent coordination" | Every /run and /team invocation requires the full agent coordination pipeline. |
| "I'll build/create/fix/write/implement this myself" | ALL implementation goes to execution agents via Agent tool. |
| "Let me just make this change directly" | "Just" is a rationalization word. Agent tool only. |
| "This is a minor edit that doesn't warrant spawning agents" | Size does not determine delegation requirements. |
| "I'll do this inline since it's quick" | Speed never overrides the delegation protocol. |
| "Rather than going through the full pipeline for this" | The full pipeline runs for every invocation without exception. |

If you find yourself reasoning toward any of these conclusions, STOP.
You are rationalizing a violation. Delegate.

## Controller-Side Corollary

Controllers (tier-2 agents like `tech-lead`, `architect`,
`marketing-strategist`) are coordinators, not implementers. They:

- Ask questions of execution agents via Agent tool.
- Synthesize answers into a coherent solution.
- Write `coordination_log.yaml`.
- NEVER Write/Edit implementation files in `src/`, `lib/`, `components/`,
  `app/`, `services/`, or `middleware/`. `controller-delegation-validator.cjs`
  emits `permissionDecision:deny` on those paths when a controller is
  active.

Controllers MAY Write/Edit workflow files (`workflow/*.yaml`,
`coordination_log.yaml`, plan.yaml, status.yaml, agent_tree.yaml) and
session/memory files under `cagents-memory/`.

## Enforcement

| Layer | Mechanism | Effect |
|-------|-----------|--------|
| 1 | `prompt-router.cjs` (UserPromptSubmit) | Detects `/run` or `/team` invocations; injects a 5-line systemMessage referencing this file. Suggests skills for natural-language requests ("build X" → `/run`). Suppressed for conversational mode (≥3 sentences). |
| 2 | `.claude/skills/{run,team}/SKILL.md` | The skill body re-states the rule once and `@`-references this file for the kill list. |
| 3 | `post-compact-restore.cjs` (PostCompact) | Re-injects goal/phase/work-item progress after context compaction (replaced `attention-injection.cjs` in v12.7.0 — see P2-10). |
| 4 | `controller-delegation-validator.cjs` (PreToolUse[Write/Edit]) | DENIES writes to `src/`, `lib/`, `components/`, `app/`, `services/`, `middleware/` while a controller is active; WARNS for other implementation paths. |
| 5 | `verify-completion.cjs` (Stop) | Checks coordination_log + agent_tree for evidence of delegation. |

## Graceful Degradation

When the Agent tool is stripped at depth-1 (a known Claude Code
limitation — see `@.claude/rules/core/teams.md` § Known Harness
Limitation), the spawned agent gracefully degrades to direct execution
and self-validation. This is the ONLY documented exception to the
"never implement directly" rule, and it applies only to subagents
spawned at depth ≥ 1, never to the skill's own depth-0 loop.

## See Also

- `.claude/skills/run/SKILL.md` — /run skill body
- `.claude/skills/team/SKILL.md` — /team skill body
- `.claude/rules/core/controllers.md` — controller patterns
- `.claude/rules/core/teams.md` — team coordination + depth-1 stripping
- `.claude/hooks/prompt-router.cjs` — UserPromptSubmit + PreToolUse[Agent] enforcement
- `.claude/hooks/controller-delegation-validator.cjs` — PreToolUse[Write/Edit] deny

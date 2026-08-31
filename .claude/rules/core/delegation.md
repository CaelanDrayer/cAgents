---
paths:
  - ".claude/rules/core/delegation.md"
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/core/teams.md"
  - "agents/**"
  - ".claude/skills/**"
  - ".claude/hooks/prompt-router.cjs"
  - ".claude/hooks/controller-delegation-validator.cjs"
  - ".claude/hooks/verify-completion.cjs"
  - ".claude/hooks/post-compact-restore.cjs"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/workflow/agent_tree.yaml"
---

# Aggressive Delegation Contract

The canonical home of the cAgents aggressive-delegation rule, its
Rationalization Kill List, and the size rule governing what the main
session may carry. `/act` and `/team` reference this file via
`@.claude/rules/core/delegation.md`. Hooks (`prompt-router.cjs`,
`controller-delegation-validator.cjs`) enforce the delegation rule; the
size rule is doctrine and is not mechanically enforced.

## The Rule

`/act`, `/team`, `/designer`, and every cAgents controller are pure
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
| "Rather than spinning up agents" | Spinning up agents is the ONLY execution mode for /act and /team. |
| "I can do this more efficiently myself" | Efficiency is irrelevant. Delegation is mandatory regardless of efficiency claims. |
| "This doesn't need agent coordination" | Every /act and /team invocation requires the full agent coordination pipeline. |
| "I'll build/create/fix/write/implement this myself" | ALL implementation goes to execution agents via Agent tool. |
| "Let me just make this change directly" | "Just" is a rationalization word. Agent tool only. |
| "This is a minor edit that doesn't warrant spawning agents" | Size does not determine delegation requirements. |
| "I'll do this inline since it's quick" | Speed never overrides the delegation protocol. |
| "Rather than going through the full pipeline for this" | The full pipeline runs for every invocation without exception. |

If you find yourself reasoning toward any of these conclusions, STOP.
You are rationalizing a violation. Delegate.

The zero-exception rule is a deliberate design choice, not an oversight:
coordinating through agents is cheap enough that adding a "small-task"
carve-out would buy little and cost the consistency that makes the
pipeline predictable, so the exception simply does not exist.

## The Size Rule

Delegation moves the work off the main session. This rule states what may
remain there.

> The main session may carry only content whose size does not grow with
> the size of the work — user turns, routing decisions, fixed-size
> reports. It MUST NOT carry design reasoning, artifact bodies, evidence,
> work-product content, or unbounded tool results.

The test is a size class, not a budget. Never ask "how many tokens is
this?" — ask "does this grow when the work grows?" A routing decision is
the same size for a one-file fix and a twelve-wave program, so it may sit
in the main session. Design rationale, an evidence list, and a raw `grep`
result each grow with the work, so they go to disk and the main session
carries a pointer in their place.

`/designer` is a declared exception in one respect only: it carries user
turns, which have no alternative channel, and is bounded by
checkpoint-restart rather than by exclusion. That exception is written
into its own contract — see `.claude/skills/designer/reference/rules.md`
rule 34. No other command has one.

### Why a size class and not a token count

The constraint used to be carried as a token count. A token count was
demonstrably satisfiable three different ways by three different
artifacts, and no one caught the disagreement. A size class cannot be:
an artifact either grows with the work or it does not, and that is a
property of the artifact rather than a number someone can claim to have
met.

Nothing measures this rule and nothing blocks on it — no threshold, no CI
gate, no warning. It holds on instruction quality alone. Any future
proposal to add a size check, a token gate, or a blocking threshold has
already been considered and rejected.

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

### Synchronous Spawning (never background-and-yield)

Controllers and `/team` leads MUST spawn every execution agent
**synchronously** — `Agent({ run_in_background: false, ... })` (explicit,
since subagents are background-by-default in Claude Code 2.1.198+) — and
collect the result in the same turn before yielding. **Never background a
sub-agent and then yield the turn.** A backgrounded child plus a parent that
returns before collecting it leaves a `stopped_at: null` child in
`agent_tree.yaml`: the session *looks* alive but nothing progresses, an
hours-long stall (REC-05, session `run_bash-guard-evaluator_260708_001`). The
Stop-hook stale-child freshness gate (`CAGENTS_STALE_CHILD_MS`, default 30 min)
now discounts such a leaked null-stop child so the stall surfaces, but the
primary rule is behavioral: spawn synchronously, collect, then proceed. The only
exception is the OPTIONAL experimental named-background-teammate path
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`), where a named teammate's result is
still explicitly collected via `SendMessage` — never spawned-and-forgotten. See
`.claude/rules/core/controllers.md` § CRITICAL: Synchronous Spawning.

## Enforcement

| Layer | Mechanism | Effect |
|-------|-----------|--------|
| 1 | `prompt-router.cjs` (UserPromptSubmit) | Layer 1 (always on): detects `/act` or `/team` invocations and injects a 5-line systemMessage referencing this file. Layer 2 (OPT-IN, default OFF via `CAGENTS_ROUTING_SUGGESTIONS`): when enabled, suggests skills for natural-language requests ("build X" → `/act`), suppressed for conversational mode (≥3 sentences). When the env var is unset, no routing suggestions are emitted. |
| 2 | `.claude/skills/{act,team}/SKILL.md` | The skill body re-states the rule once and `@`-references this file for the kill list. |
| 3 | `post-compact-restore.cjs` (PostCompact) | Re-injects goal/phase/work-item progress after context compaction (replaced `attention-injection.cjs` in v12.7.0 — see P2-10). |
| 4 | `controller-delegation-validator.cjs` (PreToolUse[Write/Edit]) | DENIES writes to `src/`, `lib/`, `components/`, `app/`, `services/`, `middleware/` while a controller is active; WARNS for other implementation paths. |
| 5 | `verify-completion.cjs` (Stop) | Checks coordination_log + agent_tree for evidence of delegation. |

## Graceful Degradation (Defensive Fallback)

As of v12.17.0, subagents retain the `Agent` tool and can spawn their own
subagents up to 5 levels deep (Claude Code ≥ 2.1.172). Delegation is the
expected behavior at every level — a controller or subagent spawned at
depth 1 normally still has `Agent` and MUST delegate.

Graceful degradation is a DEFENSIVE FALLBACK, not the expected depth-1
behavior. It triggers ONLY when the `Agent` tool is genuinely absent —
at the actual nesting ceiling (a subagent at depth 5 cannot spawn a
depth-6 child) or if a future/older harness regresses the capability. In
that narrow case the spawned agent gracefully degrades to direct
execution and self-validation. This is the ONLY documented exception to
the "never implement directly" rule, and it never applies to the skill's
own depth-0 loop. Before degrading, an agent MUST verify that `Agent` is
actually absent. See @.claude/rules/playbooks/pat-graceful-degradation-depth1.md
for the canonical fallback pattern and the historical pre-v12.17.0
depth-1 context.

## See Also

- `.claude/skills/act/SKILL.md` — /act skill body
- `.claude/skills/team/SKILL.md` — /team skill body
- `.claude/rules/core/controllers.md` — controller patterns
- `.claude/rules/core/teams.md` — team coordination + nesting model (historical depth-1 stripping note)
- `.claude/hooks/prompt-router.cjs` — UserPromptSubmit + PreToolUse[Agent] enforcement
- `.claude/hooks/controller-delegation-validator.cjs` — PreToolUse[Write/Edit] deny

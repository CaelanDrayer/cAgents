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

This file is the canonical home of three things:

- the cAgents aggressive-delegation rule;
- its Rationalization Kill List;
- the size rule that governs what the main session may carry.

`/act` and `/team` reference this file via
`@.claude/rules/core/delegation.md`. Two hooks
enforce the delegation rule: `prompt-router.cjs` and
`controller-delegation-validator.cjs`. The size rule is doctrine, and
nothing enforces it mechanically.

## The Rule

`/act`, `/team`, `/designer`, and every cAgents controller are pure
delegation proxies. They parse, plan, spawn agents, and read results.
They do NOT write code, create content, explore the codebase for
implementation purposes, or handle tasks themselves. ALL work goes to
subagents via the Agent tool, with no exception for task size, for
simplicity, or for domain.

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
| "The task is too simple for a full pipeline" | Simplicity never bypasses delegation. Even a one-line fix uses the pipeline. |
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

The zero-exception rule is a deliberate design choice, not an oversight.
Coordination through agents is cheap. A "small-task" carve-out would buy
little, and it would cost the consistency that makes the pipeline
predictable. So the exception does not exist.

## The Size Rule

Delegation moves the work off the main session. This rule states what may
remain there.

> The main session may carry only content whose size does not grow with
> the size of the work: user turns, routing decisions, and fixed-size
> reports. It MUST NOT carry design reasoning, artifact bodies, evidence,
> work-product content, or unbounded tool results.

The test is a size class, not a budget. Never ask "how many tokens is
this?" Ask "does this grow when the work grows?" A routing decision is
the same size for a one-file fix and for a twelve-wave program, so it may
sit in the main session. Design rationale, an evidence list, and a raw
`grep` result each grow with the work. They go to disk, and the main
session carries a pointer in their place.

`/designer` is a declared exception in one respect only. It carries user
turns, which have no alternative channel. Checkpoint-restart bounds it,
in place of exclusion. That exception is written
into its own contract. See `.claude/skills/designer/reference/rules.md`
rule 34. No other command has one.

### Why a size class and not a token count

The constraint used to be carried as a token count. A token count was
demonstrably satisfiable three different ways by three different
artifacts, and no one caught the disagreement. A size class cannot be:
an artifact either grows with the work or it does not. That is a property
of the artifact, not a number that someone can claim to have met.

Nothing measures this rule and nothing blocks on it — no threshold, no CI
gate, no warning. It holds on instruction quality alone. Any future
proposal to add a size check, a token gate, or a blocking threshold has
already been considered and rejected.

### Two actors, two rules

Two different actors get two different rules.
`.claude/rules/core/delegation.md` § The Size Rule governs WHAT THE MAIN
SESSION CARRIES: a size class, never a token count. Its rejection of
token gates for that purpose stands unchanged. The per-subagent aim
governs a different thing: HOW LARGE A SPAWNED SUBAGENT'S OWN CONTEXT
GETS. That aim is measured per spawn, advisory, with no gate. Neither
rule is an exception to the other; they describe different actors.

Spawned subagents carry an advisory per-subagent context aim. See
`.claude/rules/playbooks/pat-context-budget-tiers.md` for the figures and
for the delegation levers that hold them. Nothing enforces that aim,
exactly as nothing enforces this rule. It weakens nothing above, because
the per-subagent aim is not about the main session at all.

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
**synchronously**. Call `Agent({ run_in_background: false, ... })`
explicitly, because subagents are background-by-default in Claude Code
2.1.198 and later. Collect the result in the same turn, before you yield.

**Never background a sub-agent and then yield the turn.** A backgrounded
child plus a parent that returns before it collects the child leaves a
`stopped_at: null` child in `agent_tree.yaml`. The session *looks* alive,
yet nothing progresses. That is an hours-long stall (REC-05, session
`run_bash-guard-evaluator_260708_001`). The Stop-hook stale-child
freshness gate (`CAGENTS_STALE_CHILD_MS`, default 30 min) now discounts
such a leaked null-stop child, so the stall surfaces. The primary rule
stays behavioral: spawn synchronously, collect, then proceed.

The one exception is the optional experimental named-background-teammate
path (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). There, a named
teammate's result is still collected explicitly via `SendMessage`. It is
never spawned-and-forgotten. See `.claude/rules/core/controllers.md`
§ CRITICAL: Synchronous Spawning.

**`name` wins over `run_in_background: false`.** Passing `name` to the
Agent tool promotes the spawn to a named background teammate. It silently
overrides an explicit `run_in_background: false`: no error, no warning.
This was CONFIRMED on Claude Code 2.1.221.

The call returns at once. The caller believes it holds a completed
result, so it yields. The child's result is never collected, and the
parent re-does the work inline. The parent then absorbs the whole cost it
meant to delegate. There is no such thing as a named blocking spawn:
`name` implies background, so you cannot combine it with a blocking call.
This is the canonical statement of the precedence, and the other surfaces
that mandate synchronous spawning point here.

| You need | Spawn it as | Where visibility comes from |
|----------|-------------|-----------------------------|
| A result you must collect in this turn (the default for all execution work) | UNNAMED, `run_in_background: false` | A `TaskCreate` whose subject matches the agent's `description` |
| A genuinely resumable conversation you will collect later via `SendMessage` | A named teammate, which is background by definition | `TaskCreate` before the spawn, `TaskUpdate(status: completed)` when you collect it |

`CLAUDE.md` § CRITICAL: Task Lifecycle requires a `TaskCreate` per background
spawn so the user sees each subagent. It does not ask you to pass `name` to the
Agent tool. The two rules are satisfiable together only if you read it
this way: **name the TASK, never the SPAWN.**

**Collect before you yield.** A spawn that is never collected reads the
same as work that was never delegated. It costs the tokens of the child
AND the tokens of the parent, because the parent does the work itself
anyway. If the hand-back of a child is missing, read the session
`outputs/` directory before you re-spawn. A child that wrote its artifact
to disk has already done the work, and a re-run pays for that work a
second time.

## Fully Specified Delegation Prompts

Specify a prompt fully before you send it to an execution-tier model.
Execution models follow instructions well, and they infer scope badly. So
the prompt must carry the scope that the model would otherwise guess at.
A complete prompt names three things.

1. **CONCRETE FILES**: the exact paths to touch, and the paths NOT to
   touch. "The files in this surface" is not a file list.
2. **CONCRETE STEPS**: the transformation, in order. The executing model
   should not have to infer scope, sequence, or syntax.
3. **CONCRETE ACCEPTANCE CRITERIA**: a command to run or a file state to
   observe, not a judgement call.

"Figure it out" and "apply the standard to these files" are not prompts.
They hand the specification work back to the model least equipped to do
it, and the spawning agent pays for that later in rework.

### Considered and REJECTED

cAgents rejected two clauses proposed alongside this rule. Each rejection
below carries its reason. A later reader then meets an argument, not a
bare prohibition, and restores neither clause.

**A 2-agents-at-a-time concurrency cap: REJECTED.** Under-specified
prompts are the defect here, and a prompt fails the same way whether
one agent runs it or five. A cap would slow every wave and buy
nothing. The existing concurrency guidance stands unchanged.

**A "skip agents when delegation costs more" escape hatch: REJECTED.**
This is not a tuning knob on the delegation contract; it is the opposite
of the contract. "I can do this more efficiently myself" already sits on
the Rationalization Kill List above, where cost is not a reason to
self-handle. The hatch would void the zero-exception rule while it
appears to refine it.

## Enforcement

| Layer | Mechanism | Effect |
|-------|-----------|--------|
| 1 | `prompt-router.cjs` (UserPromptSubmit) | Layer 1 (always on): detects `/act` or `/team` invocations and injects a 5-line systemMessage referencing this file. Layer 2 (OPT-IN, default OFF via `CAGENTS_ROUTING_SUGGESTIONS`): when enabled, suggests skills for natural-language requests ("build X" → `/act`), suppressed for conversational mode (≥3 sentences). When the env var is unset, no routing suggestions are emitted. |
| 2 | `.claude/skills/{act,team}/SKILL.md` | The skill body re-states the rule once and `@`-references this file for the kill list. |
| 3 | `post-compact-restore.cjs` (PostCompact) | Re-injects goal, phase, and work-item progress after context compaction. It replaced `attention-injection.cjs` in v12.7.0; see P2-10. |
| 4 | `controller-delegation-validator.cjs` (PreToolUse[Write/Edit]) | DENIES writes to `src/`, `lib/`, `components/`, `app/`, `services/`, `middleware/` while a controller is active; WARNS for other implementation paths. |
| 5 | `verify-completion.cjs` (Stop) | Checks coordination_log + agent_tree for evidence of delegation. |

## Graceful Degradation (Defensive Fallback)

As of v12.17.0, subagents keep the `Agent` tool and can spawn their own
subagents up to 5 levels deep. This needs Claude Code 2.1.172 or later.
Delegation is the expected behavior at every level. A controller or
subagent spawned at depth 1 normally still has `Agent`, and it MUST
delegate.

Graceful degradation is a defensive fallback, not the expected depth-1
behavior. It triggers only when the `Agent` tool is genuinely absent.
That happens at the real nesting ceiling, where a subagent at depth 5
cannot spawn a depth-6 child. It also happens if an older harness or a
future harness loses the capability. In that narrow case the spawned
agent degrades to direct execution and self-validation.

This is the one documented exception to the "never implement directly"
rule, and it never applies to the depth-0 loop of the skill itself.
Before it degrades, an agent MUST make sure that `Agent` is absent. See
@.claude/rules/playbooks/pat-graceful-degradation-depth1.md for the
canonical fallback pattern and for the depth-1 context from before
v12.17.0.

## See Also

- `.claude/skills/act/SKILL.md`: the /act skill body.
- `.claude/skills/team/SKILL.md`: the /team skill body.
- `.claude/rules/core/controllers.md`: controller patterns.
- `.claude/rules/core/teams.md`: team coordination and the nesting model, with
  the historical depth-1 stripping note.
- `.claude/hooks/prompt-router.cjs`: UserPromptSubmit and PreToolUse[Agent]
  enforcement.
- `.claude/hooks/controller-delegation-validator.cjs`: PreToolUse[Write/Edit]
  deny.

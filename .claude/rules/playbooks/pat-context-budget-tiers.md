---
paths:
  - ".claude/rules/playbooks/pat-context-budget-tiers.md"
  - ".claude/rules/core/controllers.md"
  # delegation.md + teams.md point here for the per-subagent aim; either pointer loads the figures
  - ".claude/rules/core/delegation.md"
  - ".claude/rules/core/teams.md"
  - ".claude/rules/memory/agent-memory.md"
  - "agents/**"
  - ".claude/skills/act/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/pre-compact-save.cjs"
  - ".claude/hooks/post-compact-restore.cjs"
  - "cagents-memory/sessions/**/waypoints/**"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
name: pat-context-budget-tiers
description: "ADVISORY pattern (self-reported, not hook-enforced): a long-running controller or /team lead self-monitors its context fill across four bands — PEAK / GOOD / DEGRADING / POOR — changing read-depth and delegation aggressiveness BEFORE forced compaction, checkpointing a waypoint at DEGRADING, and treating vague phrasing in its own output as an early-warning signal. Also the canonical home of the advisory per-subagent context aim, its outer bound, and the delegation levers that hold them."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  version: "1.1.0"
  author: cagents
  audience: "every spawned subagent, including ordinary execution agents; especially controllers and /team leads"
  applies_to:
    - all-controllers
    - all-team-leads
    - all-execution-agents
---

# Pattern: Context-Budget Tiers (proactive, self-monitored)

> **ADVISORY: self-reported, NOT hook-enforced.** No hook measures the context
> fill of an agent, and no hook changes its behavior because of that fill. This
> pattern is a discipline that a long-running controller or a `/team` lead applies
> to *itself*. The PreCompact and PostCompact hooks are *reactive*, and they fire
> only when the harness forces compaction. This pattern complements them, because
> it acts *before* that point is reached.

## The per-subagent context aim (advisory)

Aim for about 100k input tokens in a spawned subagent's own context.
The figure is advisory and absolute. It is a per-subagent input-token count, and
it is not a fraction of a context window. A context window can be 200k or 1M, so
the same fraction gives a different absolute size.

Past about 200k input tokens in a single subagent, treat the aim as missed, and
delegate harder. This outer bound is advisory, not enforced.

Both figures are aims. Nothing measures or enforces them — no hook, no CI check,
no abort — by design. They work the way that the four bands below work. A
spawning agent holds itself to them.

### Two actors, two rules

Two different actors, two different rules. `.claude/rules/core/delegation.md`
§ The Size Rule governs WHAT THE MAIN SESSION CARRIES. That rule is a size class,
never a token count, and its rejection of token gates for that purpose stands
unchanged.

The per-subagent aim governs a different thing. It governs HOW LARGE A SPAWNED
SUBAGENT'S OWN CONTEXT GETS. It is measured per spawn, and it is advisory, with
no gate. Neither rule is an exception to the other, because they describe
different actors.

## The lever that moves the number

Delegation is the lever that moves the number. These are the five levers:

1. Push work down. Spawn a child agent for a unit of work, instead of doing that
   work in your own context.
2. Write artifact bodies and evidence to disk. Pass file paths, not contents.
3. Read targeted ranges with `sed -n 'A,Bp'` or `grep -n ... -A N`. Do not read
   whole files.
4. Hand off through a disk brief that the next agent reads for itself. Do not
   inline its context into your prompt.
5. Collect every spawned child before you yield your turn, with
   `run_in_background: false`. A parent that backgrounds its children and then
   returns leaves their output to collapse back into its own context later. A
   spawn that is never collected is the same as work you never delegated.

### Lever 2 is crash tolerance, not thrift

When you write bodies to disk, you save context. You also make your output
survive a parent that dies:

> Before you return, write your output to disk and return the path. Your summary
> can be lost, because a parent can yield, compact, or die before it collects
> that summary. Your file will not be lost.

In session `act_subagent-token-budget_260909_001` a controller concluded that
"nothing landed", because "both wave-1 agents were backgrounded and never
collected." The controller was wrong about the artifact. 32KB of completed output
was already on disk, it was intact, and it needed zero re-execution.

A parent that yields loses the *collection*, which is the summary hand-back. It
does not lose the work of the child, as long as the child wrote that work down.

**Corollary for parents.** Sometimes a parent finds that the hand-back of a
child is missing. That parent MUST read the session `outputs/` directory BEFORE
it re-spawns the child. A re-run of a child whose artifact is already on disk
burns the full cost twice. That is the exact blowup this aim exists to prevent.

### Lever 5: collect before you yield

Lever 5 fails in silence. A spawn that is never collected costs the tokens of the
child and the tokens of the parent. The parent re-does the work inline, and its
context grows by exactly the amount that the delegation was meant to remove.

The word "delegate" alone is not enough. In
`act_subagent-token-budget_260909_001` the delegation failures were spawns that
ran and were never collected. They were not spawns that never happened.

### `name` silently overrides `run_in_background: false`

CONFIRMED on Claude Code 2.1.221, from a session transcript. When you pass `name`
to the Agent tool, the tool promotes the spawn to a named background teammate. It
also **silently overrides an explicit `run_in_background: false`**. There is no
error, no warning, and no acknowledgement. The call returns at once, the caller
believes that it holds a completed result, and it yields.

The result of the child is never collected. The parent then re-does the work
inline. A subagent context that was tracking the aim ends up several times past
the outer bound.

**Rule:** spawn UNNAMED with `run_in_background: false` for anything you must
collect in-turn. Reserve a named teammate for a genuinely resumable conversation
that you collect explicitly with `SendMessage`. You cannot have both a named
teammate and a blocking call, because `name` wins. Per-subagent visibility comes
from a `TaskCreate` whose subject matches the `description` of the agent. It never
comes from `name`.

## The four bands

Key your behavior to the fraction of the context window that you have used. Scale
your read *depth* to the real window size, which can be 200k or 1M. The fractions
matter, and a fixed token count does not.

The bands and the per-subagent aim above measure different things, and they do
not conflict. The bands track *your own* fill as a fraction of *your* window. The
aim is an absolute input-token count for a subagent that *you spawn*.

| Band | Context used | Behavior |
|------|--------------|----------|
| **PEAK** | 0–30% | Full-body reads, parallel spawns, richest exploration. |
| **GOOD** | 30–50% | Prefer frontmatter / summary reads over full bodies. |
| **DEGRADING** | 50–70% | Frontmatter-only reads; warn the user; stop opening new large files; **checkpoint now**. |
| **POOR** | 70%+ | Checkpoint immediately, NO new reads, finish the current item and stop. |

## Checkpoint at DEGRADING (don't wait for PreCompact)

At the DEGRADING band, write a waypoint before you need it. The waypoint holds
the mission, the completed work items, and the single next action. A POOR-band
forced compaction can then land on a clean resume artifact that is already on
disk. If you wait for `pre-compact-save.cjs` to fire, you risk a checkpoint taken
from a context that is already degraded.

## Early-warning heuristic: watch your own phrasing

Context degradation shows up in your **own output before you reach the hard
threshold**. Treat each signal below as a reason to drop a band early and to
checkpoint:

- Vague filler in place of a specific `file:line` citation. Examples are
  "appropriate handling", "as needed", and "handle accordingly".
- A skipped protocol step, such as no re-read of the plan objectives before
  synthesis.
- Hand-waving such as "this should work", in place of evidence.

When you notice one of these in your own drafting, you are already further into
DEGRADING than the raw fraction suggests. Checkpoint, and delegate more
aggressively. Do not push on.

## See also

- `@docs/example-store/ex-gates-context-budget-tiers.md`: the worked example that
  this playbook distills.
- `.claude/rules/core/hooks.md`: the reactive PreCompact and PostCompact hooks
  that this pattern complements.
- `.claude/rules/memory/agent-memory.md`: the waypoint types and the checkpoint
  contract.
- `.claude/rules/core/controllers.md`: Read-Before-Decide. Re-read the plan
  objectives to combat drift.
- `.claude/rules/core/delegation.md` § The Size Rule: the *other* actor, which is
  what the MAIN SESSION may carry. It is a size class, never a token count. It is
  not the same rule as the per-subagent aim above.

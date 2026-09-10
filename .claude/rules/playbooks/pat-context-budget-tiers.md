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

> **ADVISORY — self-reported, NOT hook-enforced.** No hook measures an agent's
> context fill or changes its behavior based on it. This pattern is a discipline a
> long-running controller or `/team` lead applies to *itself*. It complements the
> *reactive* PreCompact / PostCompact hooks (which fire only when the harness
> forces compaction) by acting *before* that point is reached.

## The per-subagent context aim (advisory)

Aim for about 100k input tokens in a spawned subagent's own context.
The figure is advisory and absolute: a per-subagent input-token count, not a
fraction of a context window. Windows vary (200k, 1M), so the same fraction means
very different absolute sizes.

Past about 200k input tokens in a single subagent, treat the aim as missed and
delegate harder. This outer bound is advisory, not enforced.

Both figures are aims. Nothing measures or enforces them — no hook, no CI check,
no abort — by design. They work the way the four bands below work: a spawning
agent holds itself to them.

### Two actors, two rules

Two different actors, two different rules. `.claude/rules/core/delegation.md`
§ The Size Rule governs WHAT THE MAIN SESSION CARRIES: a size class, never a
token count, and its rejection of token gates for that purpose stands unchanged.
The per-subagent aim governs a different thing — HOW LARGE A SPAWNED SUBAGENT'S
OWN CONTEXT GETS — measured per spawn, advisory, with no gate. Neither rule is an
exception to the other; they describe different actors.

## The lever that moves the number

Delegation is the lever that moves the number. Concretely:
1. Push work down — spawn a child agent for a unit of work instead of doing it in
   your own context.
2. Write artifact bodies and evidence to disk; pass file paths, not contents.
3. Read targeted ranges (`sed -n 'A,Bp'`, `grep -n ... -A N`), not whole files.
4. Hand off via a disk brief the next agent reads itself, rather than inlining its
   context into your prompt.
5. Collect every spawned child before you yield your turn
   (`run_in_background: false`). A parent that backgrounds children and returns
   leaves their output to collapse back into its own context later; a spawn that is
   never collected is indistinguishable from work never delegated.

### Lever 2 is crash tolerance, not thrift

Writing bodies to disk saves context. It also makes your output survive a parent
that dies:

> Before returning, write your output to disk and return the path. Your summary
> may be lost — a parent can yield, compact, or die before collecting it. Your
> file will not be.

In session `act_subagent-token-budget_260909_001` a controller concluded "nothing
landed — both wave-1 agents were backgrounded and never collected." It was wrong
about the artifact: 32KB of completed output was already on disk, intact, and
needed zero re-execution. What a yielding parent loses is the *collection* — the
summary hand-back — not the child's work, provided the child wrote it down.

**Corollary for parents.** A parent that finds a child's hand-back missing MUST
check the session `outputs/` directory BEFORE re-spawning. Re-running a child
whose artifact is already on disk burns the full cost twice — the exact blowup
this aim exists to prevent.

### Lever 5: collect before you yield

Lever 5 fails silently. A spawn that is never collected costs the child's tokens
and the parent's: the parent re-does the work inline, and its context grows by
exactly the amount the delegation was meant to remove. "Delegate" alone is not
enough — the delegation failures in `act_subagent-token-budget_260909_001` were
spawns that ran and were never collected, not spawns that never happened.

### `name` silently overrides `run_in_background: false`

CONFIRMED on Claude Code 2.1.221, from a session transcript. Passing `name` to the
Agent tool promotes the spawn to a named background teammate and **silently
overrides an explicit `run_in_background: false`** — no error, no warning, no
acknowledgement. The call returns immediately, the caller believes it holds a
completed result, and yields. The child's result is never collected, the parent
re-does the work inline, and a subagent context that was tracking the aim ends up
several times past the outer bound.

**Rule:** spawn UNNAMED with `run_in_background: false` for anything you must
collect in-turn. Reserve named teammates for genuinely resumable conversations
collected explicitly via `SendMessage`. You cannot have both a named teammate and
a blocking call — `name` wins. Per-subagent visibility comes from a `TaskCreate`
whose subject matches the agent's `description`, never from `name`.

## The four bands

Key behavior to the fraction of the context window used. Scale read *depth* to the
actual window size (200k vs 1M) — the fractions, not fixed token counts, are what
matter.

The bands and the per-subagent aim above measure different things and do not
conflict: the bands track *your own* fill as a fraction of *your* window, while
the aim is an absolute input-token count for a subagent *you spawn*.

| Band | Context used | Behavior |
|------|--------------|----------|
| **PEAK** | 0–30% | Full-body reads, parallel spawns, richest exploration. |
| **GOOD** | 30–50% | Prefer frontmatter / summary reads over full bodies. |
| **DEGRADING** | 50–70% | Frontmatter-only reads; warn the user; stop opening new large files; **checkpoint now**. |
| **POOR** | 70%+ | Checkpoint immediately, NO new reads, finish the current item and stop. |

## Checkpoint at DEGRADING (don't wait for PreCompact)

At the DEGRADING band, proactively write a waypoint — mission + completed work
items + the single next action — so that if a POOR-band forced compaction lands,
there is already a clean resume artifact on disk. Waiting for
`pre-compact-save.cjs` to fire risks checkpointing from a context that is already
degraded.

## Early-warning heuristic: watch your own phrasing

Context degradation shows up in your **own output before you hit the hard
threshold**. Treat these as a signal to drop a band proactively and checkpoint:

- Vague filler — "appropriate handling", "as needed", "handle accordingly" —
  in place of specific `file:line` citations.
- Skipped protocol steps (e.g. not re-reading plan objectives before synthesis).
- Hand-waving ("this should work") instead of evidence.

When you notice this in your own drafting, you are already further into DEGRADING
than the raw fraction suggests — checkpoint and delegate more aggressively rather
than pushing on.

## See also

- `@docs/example-store/ex-gates-context-budget-tiers.md` — worked example this playbook distills.
- `.claude/rules/core/hooks.md` — the reactive PreCompact / PostCompact hooks this complements.
- `.claude/rules/memory/agent-memory.md` — waypoint types and the checkpoint contract.
- `.claude/rules/core/controllers.md` — Read-Before-Decide (re-read plan objectives to combat drift).
- `.claude/rules/core/delegation.md` § The Size Rule — the *other* actor: what the
  MAIN SESSION may carry. A size class, never a token count. Not the same rule as
  the per-subagent aim above.

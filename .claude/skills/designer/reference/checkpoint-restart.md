# Designer Checkpoint-Restart

/designer carries user turns in its main session because a question cannot be answered on disk. Rule 34 declares that carve-out and names **checkpoint-restart** as its bound. This file states the bound: when the designer restarts, what it writes before it does, what it drops, and how the user's conversation survives the seam.

Without a restart, user turns accumulate for the whole session and the exception has no bound at all. With one, every segment starts from a compact resume artifact and carries only the turns it has taken since.

## The Trigger: ARM, Then FIRE

The trigger has two parts. ARM is what makes it evaluable. FIRE is what decides when the restart lands.

### ARM — the restart becomes pending

Either signal arms the restart, whichever crosses first:

| Signal | Threshold |
|--------|-----------|
| Context band | The designer's own context reaches **DEGRADING** — roughly half the window used — per @.claude/rules/playbooks/pat-context-budget-tiers.md |
| Question count | `question_count - question_count_at_restart` reaches **30**, where `question_count_at_restart` is `0` before the first restart |

The playbook's early-warning heuristic applies to the band signal. Vague filler in place of specifics, skipped protocol steps, or hand-waving in the designer's own drafting mean it is already further into DEGRADING than the raw fraction suggests — treat that drafting as the band being reached.

The 30-question figure is taken from the "approaching context limits" line in @reference/session-resilience.md. Two details differ on purpose: that line fires above 30 and counts the whole session, while this signal fires at 30 and counts from the last restart. Take the figure from there rather than inventing a competing number, and move both files together if it ever changes.

Arming changes nothing the user sees. It marks the next seam as a restart point.

### FIRE — the restart happens

Once armed, the designer restarts at the next natural seam, whichever arrives first:

- the next phase gate (a phase transition already writes a waypoint under rule 27),
- the next return to the continuation gate during endless refinement,
- the next synthesis confirmation.

**Never fire mid-exchange.** The restart happens after the designer has recorded a user answer and before it calls `AskUserQuestion` again — never between asking a question and receiving its answer, and never partway through a batch of 2-4 questions.

**Floor.** If context reaches the **POOR** band (roughly 70% and up) before any seam arrives, the designer fires at the next completed user answer instead of waiting for a distant phase gate. That is still not mid-question; it shortens how long the designer waits for a seam and nothing else.

## Why the Trigger Is Shaped This Way

A single hard number would either fire mid-thought or never fire at all. Splitting the trigger lets the measurable part — context band, question count — arm the restart, and lets the conversational part — a seam — decide when it lands.

Both ARM signals already exist in this repo. The context bands live in the budget-tiers playbook; the 30-question figure lives in `session-resilience.md`. The trigger binds signals the designer already tracks instead of adding a new metric that then has to stay in sync with them.

## The Restart Protocol

### Before the restart, the designer writes

**A `pre_restart` waypoint** at `waypoints/wp-NNN.yaml` — a sibling of the `phase_transition` type. It carries the standard waypoint fields from @reference/session-resilience.md § Phase-Level Checkpointing, plus:

| Field | Contents |
|-------|----------|
| `restart_segment` | `1` for the first restart, incrementing |
| `armed_by` | `context_band` or `question_count` |
| `fired_at` | `phase_gate`, `continuation_gate`, `synthesis_confirmation`, or `poor_band_floor` |
| `open_thread` | The question just answered and the next question the designer was about to ask |
| `answered_index` | Every question already answered, each with the phase file holding its full text and the user's answer |

`open_thread` is what lets the new segment pick the conversation up exactly where it stopped. `answered_index` is what makes rule C1 mechanical instead of hopeful.

A restart that fires at a continuation gate or the POOR-band floor lands mid-phase, where the inherited `phase_from` and `phase_to` have nothing to name. Set both to the current phase rather than omitting them, so anyone reading the waypoint sees where the session stood without having to special-case a missing field.

**A forced flush** of the active phase file, `qa_log.yaml`, and `session.yaml` (`question_count`, `controller_state`, `deferred_questions`, research status). Rule 24 already requires incremental writes; the restart forces them now instead of at the next natural write.

**`restart_count`, `restarted_at`, and `question_count_at_restart`** into `session.yaml`. `question_count_at_restart` is the value `question_count` holds at the moment this restart fires. The next segment subtracts it to evaluate the question-count ARM signal, so it has to be persisted here — nothing else in the session state records where the last restart landed on the counter.

### What the new segment loads

Exactly the seven steps in @reference/session-resilience.md § Session Resume Protocol. Follow that list — this file does not fork it.

One clarification on top of it: `question_count` keeps accumulating across segments for progress reporting, so the question-count ARM signal is the subtraction `question_count - question_count_at_restart >= 30`, with `question_count_at_restart` reading `0` before the first restart.

Evaluate that subtraction, never the raw `question_count`. After the first restart the raw counter already sits at or above 30, so a segment that arms on it directly re-arms on every question and restarts once per question instead of once per 30 — which inverts the bound this file exists to set.

### What the restart deliberately drops

This is what makes the bound a bound:

- the verbatim Q&A transcript of completed phases — it lives in the phase files
- raw research-agent output — it lives in `question_prep/`
- superseded artifact drafts — final versions live in `artifacts/`
- the designer's own prior reasoning about questions already resolved

Every dropped item sits on disk and stays reachable by pointer. Nothing the user said is lost. The designer stops carrying all of it at once.

## Continuity Rules

### C1. Never re-ask an answered question

The `answered_index` in the `pre_restart` waypoint is authoritative. When a question in the restored pool already appears there, the designer applies rule 30 — skip with notification — and never re-presents it. Re-asking a question the user already answered is the single worst failure mode of a restart, and the index exists to prevent it.

### C2. Never restart mid-thought

Restated from FIRE so a reader arriving here does not have to reconstruct it: the restart lands after a recorded answer and before the next `AskUserQuestion` call. Never between a question and its answer. Never partway through a batch.

### C3. The restart rides on the next question

A mid-session restart is not a resume gate. Do not reuse the `--resume` announcement block from @reference/session-resilience.md § Session Resume Protocol. That block asks "Ready to continue?" and offers "Start fresh" — right for a user who deliberately resumes a paused session, wrong and alarming mid-design, where the user never asked to stop and "Start fresh" would discard work in progress.

Instead the designer announces the restart in one line of preamble on the next `AskUserQuestion` call it was going to make anyway:

> Continuing from checkpoint — {phase}, {N} questions answered so far. Nothing lost.

The questions in that call are the next questions from the restored pool. From the user's side the conversation is continuous: one line of context, then the design continues. The restart adds no extra gate, no extra turn, and no decision the user has to make. Rule 1 holds because the restart never replaces an `AskUserQuestion` call — it rides on one.

## Nothing Measures This

This trigger is doctrine the designer evaluates and follows. No hook, script, or CI check measures the designer's context, counts its questions, or blocks when the trigger is missed. It holds on instruction quality alone, exactly as the rule it bounds does — see @.claude/rules/core/delegation.md § The Size Rule ("Nothing measures this rule and nothing blocks on it").

## See Also

- @reference/rules.md rule 34 — the size-rule exception this file bounds
- @reference/session-resilience.md — waypoint schema, resume protocol, context-conscious mode
- @.claude/rules/playbooks/pat-context-budget-tiers.md — the four context bands and the early-warning heuristic
- @.claude/rules/core/delegation.md § The Size Rule — the main-session doctrine /designer is the one exception to

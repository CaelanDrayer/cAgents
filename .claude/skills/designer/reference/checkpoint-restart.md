# Designer Checkpoint-Restart

/designer carries user turns in its main session because a question cannot be answered on disk. Rule 34 declares that carve-out and names **checkpoint-restart** as its bound. This file states the bound. It says when the designer restarts, and what it writes before it does. It says what the designer drops, and how the user's conversation survives the seam.

Without a restart, user turns accumulate for the whole session and the exception has no bound at all. With one, every segment starts from a compact resume artifact and carries only the turns it has taken since.

## The Trigger: ARM, Then FIRE

The trigger has two parts. ARM is what makes it evaluable. FIRE is what decides when the restart lands.

### ARM: the restart becomes pending

Either signal arms the restart, whichever crosses first:

| Signal | Threshold |
|--------|-----------|
| Context band | The designer's own context reaches **DEGRADING**, which is roughly half the window used. The bands are in @.claude/rules/playbooks/pat-context-budget-tiers.md |
| Question count | `question_count - question_count_at_restart` reaches **30**, where `question_count_at_restart` is `0` before the first restart |

The playbook's early-warning heuristic applies to the band signal. Watch the designer's own drafting for three signs: vague filler in place of specifics, skipped protocol steps, and hand-waving. Any of those signs means the designer is further into DEGRADING than the raw fraction suggests. Treat that drafting as a band that the session already reached.

This file takes the 30-question figure from the "approaching context limits" line in @reference/session-resilience.md. Two details differ on purpose. That line fires above 30 and counts the whole session. This signal fires at 30 and counts from the last restart.

Take the figure from there. Do not invent a competing number. If the figure ever changes, move both files together.

Arming changes nothing the user sees. It marks the next seam as a restart point.

### FIRE: the restart happens

Once armed, the designer restarts at the next natural seam, whichever arrives first:

- the next phase gate, where rule 27 already writes a waypoint for the phase transition,
- the next return to the continuation gate during endless refinement,
- the next synthesis confirmation.

**Never fire mid-exchange.** The restart happens after the designer records a user answer. It happens before the designer calls `AskUserQuestion` again. Never fire between a question and its answer. Never fire partway through a batch of 2-4 questions.

**Floor.** Sometimes context reaches the **POOR** band, which is roughly 70% and up, before any seam arrives. The designer then fires at the next user answer that is complete. It does not wait for a distant phase gate. That is still not mid-question. The floor shortens how long the designer waits for a seam, and it changes nothing else.

## Why the Trigger Is Shaped This Way

A single hard number would either fire mid-thought or never fire at all. A split trigger works better. The measurable part is the context band and the question count, and it arms the restart. The conversational part is a seam, and it decides when the restart lands.

Both ARM signals already exist in this repo. The context bands live in the budget-tiers playbook, and the 30-question figure lives in `session-resilience.md`. The trigger binds signals that the designer already tracks. It does not add a new metric that then has to stay in sync with them.

## The Restart Protocol

### Before the restart, the designer writes

**A `pre_restart` waypoint** at `waypoints/wp-NNN.yaml`. This waypoint is a sibling of the `phase_transition` type. It carries the standard waypoint fields from @reference/session-resilience.md § Phase-Level Checkpointing, plus:

| Field | Contents |
|-------|----------|
| `restart_segment` | `1` for the first restart, incrementing |
| `armed_by` | `context_band` or `question_count` |
| `fired_at` | `phase_gate`, `continuation_gate`, `synthesis_confirmation`, or `poor_band_floor` |
| `open_thread` | The question just answered and the next question the designer was about to ask |
| `answered_index` | Every question already answered, each with the phase file holding its full text and the user's answer |

`open_thread` is what lets the new segment pick the conversation up exactly where it stopped. `answered_index` is what makes rule C1 mechanical instead of hopeful.

A restart that fires at a continuation gate or the POOR-band floor lands mid-phase, where the inherited `phase_from` and `phase_to` have nothing to name. Set both fields to the current phase. Do not omit them. A reader of the waypoint then sees where the session stood, and that reader does not have to special-case a missing field.

**A forced flush** of the active phase file, `qa_log.yaml`, and `session.yaml` (`question_count`, `controller_state`, `deferred_questions`, research status). Rule 24 already requires incremental writes; the restart forces them now instead of at the next natural write.

**`restart_count`, `restarted_at`, and `question_count_at_restart`** into `session.yaml`. `question_count_at_restart` is the value `question_count` holds at the moment this restart fires. The next segment subtracts it to evaluate the question-count ARM signal. The designer must persist it here. Nothing else in the session state records where the last restart landed on the counter.

### What the new segment loads

Exactly the seven steps in @reference/session-resilience.md § Session Resume Protocol. Follow that list. This file does not fork it.

One clarification goes on top of it. `question_count` keeps accumulating across segments for progress reporting. The question-count ARM signal is therefore the subtraction `question_count - question_count_at_restart >= 30`. Before the first restart, `question_count_at_restart` reads `0`.

Evaluate that subtraction, never the raw `question_count`. After the first restart, the raw counter is already at 30 or above. A segment that arms on the raw counter re-arms on every question. It then restarts once per question, instead of once per 30 questions. That inverts the bound that this file exists to set.

### What the restart deliberately drops

This is what makes the bound a bound:

- the verbatim Q&A transcript of completed phases. It lives in the phase files.
- raw research-agent output. It lives in `question_prep/`.
- superseded artifact drafts. The final versions live in `artifacts/`.
- the designer's own prior reasoning about questions already resolved

Every dropped item sits on disk and stays reachable by pointer. Nothing the user said is lost. The designer stops carrying all of it at once.

## Continuity Rules

### C1. Never re-ask an answered question

The `answered_index` in the `pre_restart` waypoint is authoritative. Sometimes a question in the restored pool already has an entry there. The designer then applies rule 30, which is skip with notification, and never re-presents that question. A restart can re-ask a question that the user already answered. That is the worst failure mode of a restart, and the index exists to prevent it.

### C2. Never restart mid-thought

This is restated from FIRE, so a reader who arrives here does not have to reconstruct it. The restart lands after a recorded answer and before the next `AskUserQuestion` call. Never restart between a question and its answer. Never restart partway through a batch.

### C3. The restart rides on the next question

A mid-session restart is not a resume gate. Do not reuse the `--resume` announcement block from @reference/session-resilience.md § Session Resume Protocol. That block asks "Ready to continue?" and offers "Start fresh". Those options are right for a user who deliberately resumes a paused session. They are wrong and alarming mid-design. The user never asked to stop, and "Start fresh" would discard work in progress.

Instead the designer announces the restart in one line of preamble on the next `AskUserQuestion` call it was going to make anyway:

> Continuing from checkpoint: {phase}, {N} questions answered so far. Nothing lost.

The questions in that call are the next questions from the restored pool. From the user's side the conversation is continuous: one line of context, then the design continues. The restart adds no extra gate, no extra turn, and no decision the user has to make. Rule 1 holds, because the restart never replaces an `AskUserQuestion` call. The restart rides on one.

## Nothing Measures This

This trigger is doctrine that the designer evaluates and follows. No hook, script, or CI check measures the designer's context, counts its questions, or blocks when the trigger is missed. It holds on instruction quality alone, exactly as the rule it bounds does. See @.claude/rules/core/delegation.md § The Size Rule ("Nothing measures this rule and nothing blocks on it").

## See Also

- @reference/rules.md rule 34: the size-rule exception this file bounds
- @reference/session-resilience.md: waypoint schema, resume protocol, context-conscious mode
- @.claude/rules/playbooks/pat-context-budget-tiers.md: the four context bands and the early-warning heuristic
- @.claude/rules/core/delegation.md § The Size Rule: the main-session doctrine /designer is the one exception to

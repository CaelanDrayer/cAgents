# Personal / Life Domain

Designing a personal routine, habit system, life decision, or solo
project — the unit of work is the designer's own life, NOT a system that
serves users or stakeholders.

## When to pick this domain

Pick this domain when the user is designing something for themselves
(possibly extending to partner, family, household):

- "design my morning routine"
- "design a 90-day diet and exercise plan"
- "design how I handle email"
- "design my career-decision matrix for the next 18 months"
- "design my Saturday — I want focused time without family conflict"

Do NOT pick this domain for: the app that tracks the routine (Software),
the coaching business built around the method (Business), the memoir
about the year of habit change (Creative).

## Phase 1-3 framing

**Empathize**. The standard "stakeholders" framing fails here — the only
stakeholder is the designer themselves, plus possibly a small circle
(partner, kids, roommates). Reframe the question. Instead of "who are
your users", ask: "**Whose life is affected by this design (including
yours)?**" The designer is BOTH the user and the designer. The Empathize
phase should ask the designer to describe:

- Their current state honestly (what do they actually do, not what they
  want to do).
- What they want to change, in observable behavior terms.
- Who else (if anyone) is affected — a partner, a child, a pet, a
  housemate.
- What past attempts at this design have looked like (every personal
  redesign has a graveyard of failed attempts to learn from).

**Define**. The problem statement is a *desired daily / weekly behavior*
stated in measurable terms (e.g. "go to bed by 11pm five nights a week"
not "sleep better"). Constraints include: existing commitments (work
hours, kids' schedule), energy budget across the day, social cost of
the change, money budget, environment (apartment, suburban house, on
the road), and self-trust history (have you stuck to design like this
before? what failed?).

**Conceptualize**. Offer the user 2-4 framings:
- *Habit-stack* (anchor the new behavior to an existing habit)
- *Environment-design* (change the room, not the willpower)
- *Time-block* (carve protected slots on the calendar)
- *Decision-rule* (a simple if-then to remove daily choices)

The framing cascades into Phase 5: habit-stack needs the anchor habit
named; environment-design needs the room changes specified.

## Phase 5 questions

Refinement for this domain centers on realistic implementation and
relapse-resistant design. The designer selects from these question
templates (full set in `../../templates/personal_chunks.yaml`):

- "What is the smallest version of this behavior that still counts as
  success (the two-minute version)?"
- "Where, when, and immediately after what existing behavior does the
  new behavior happen?"
- "What environmental cues invite the new behavior (visible, easy,
  pre-positioned)?"
- "What is the if-then rule for the most common derailment (travel,
  illness, social event, partner conflict)?"
- "How will you measure progress without it turning into a chore
  (subjective rating, weekly review, simple yes/no log)?"
- "What does your partner or household need to know or accommodate?"
- "What is the kill-switch — under what condition do you abandon this
  design and try something else?"

## Phase 6 artifacts

For Personal / Life, Phase 6 emits:

| Artifact | Purpose |
|----------|---------|
| `habit_ledger.md` | The named behaviors, anchors, cues, and minimum-version definitions |
| `weekly_review_template.md` | Five-minute check-in template the designer fills weekly |
| `decision_matrix.md` (life decisions) | Options × axes, with weights and current scores |
| `if_then_protocol.md` | Rules for common derailment scenarios |
| `accountability_checklist.md` | Optional: who you tell, what cadence, what consequence |
| `kill_switch.md` | The condition under which the designer stops and redesigns |

Phase 6 emits a `habit_ledger.md` or `decision_matrix.md` — NOT user
stories, NOT an architecture diagram, NOT a marketing brief.

**Follow-up dispatch agent**: `cagents:life-coach` if it exists, or
`cagents:technical-writer` for clean writeup of the protocol. Fall back
to `cagents:copywriter` for accountable phrasing. NEVER
`cagents:architect` — personal-design questions are not architecture
questions.

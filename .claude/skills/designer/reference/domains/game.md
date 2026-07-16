# Game Domain

Designing a game system — board, card, tabletop RPG, video, or hybrid —
the unit of work is mechanics that produce meaningful play, NOT a
software platform.

## When to pick this domain

Pick this domain when the user is designing a game (the design problem,
not the engineering to build it):

- "design a board game about supply-chain logistics"
- "design a deck-builder where every card has a hidden cost"
- "design the mission structure for a tabletop RPG campaign"
- "design the scoring system for an asymmetric two-player game"
- "design a party game that plays in under 20 minutes for 6 people"

Do NOT pick this domain for: the Unity / Godot codebase implementing the
game (Software), the marketing of the Kickstarter (Business), the box
art and rulebook layout (Creative).

## Phase 1-3 framing

**Empathize**. Players are not "users" in the productivity sense.
Players show up *to be entertained, challenged, or socially engaged*.
Identify the player count range, the skill range (heavy gamer vs.
casual), the time budget (under-30-min party, 60-90-min mid-weight,
3-hour-plus heavy), and the play context (couch, table, online,
asynchronous).

**Define**. The problem statement is the *intended player experience*
(the "feel" of the game): tense bluffing, satisfying combo discovery,
relaxed exploration, laugh-out-loud chaos. Constraints in this domain
include: complexity budget, component cost, learning time, balance
across player counts, and replayability (does it feel different the
second time?).

**Conceptualize**. Offer the user 2-4 framings:
- *Engine-builder* (players grow systems that compound)
- *Resource-management* (scarcity drives decisions)
- *Conflict / area-control* (zero-sum spatial competition)
- *Narrative / role-play* (players construct stories through choice)

The framing cascades into Phase 5: an engine-builder needs combo
guardrails; conflict needs catch-up mechanisms.

## Phase 5 questions

Refinement for this domain centers on mechanics, balance, and
playtesting. The designer selects from these question templates (full
set in `../../templates/game_chunks.yaml`):

- "What is the central mechanic — the decision the player makes on their
  turn that most defines the game?"
- "What is the win condition, and how transparent is the path to it?"
- "What progression do players experience — do options open up, narrow,
  or stay constant?"
- "How does the game handle player counts at the edges (2-player vs.
  max-player rules variants)?"
- "Where is the tension peak, and what mechanic produces it?"
- "What's the catch-up mechanism (or deliberate lack of one)?"
- "How does randomness enter the game (deck draw, dice, hidden info),
  and at what cadence?"
- "What is the playtest protocol — solo, blind, mixed-skill, post-game
  interview?"

## Phase 6 artifacts

For Game, Phase 6 emits:

| Artifact | Purpose |
|----------|---------|
| `mechanics_document.md` | Every mechanic, what it does, why it's in the game |
| `balance_sheet.md` | Numeric balance: card costs, power curves, probability tables |
| `playtest_protocol.md` | Who plays, in what configuration, what data you collect |
| `level_or_encounter_outline.md` | (for RPGs / level-based) The progression structure |
| `rulebook_outline.md` | Section-by-section structure for the eventual rulebook |
| `component_list.md` | Every physical / digital component the game needs |

Phase 6 emits a `mechanics_document.md` — NOT an API spec, NOT a JWT
implementation, NOT a database schema.

**Follow-up dispatch agent**: `cagents:game-designer` if it exists,
otherwise `cagents:narrative-director` for narrative-heavy games or
`cagents:visual-artist` (mode=concept) for thematic sketches. Fall back to
`cagents:technical-writer` for rulebook prose. NEVER
`cagents:backend-developer` — game-mechanics questions are not server
questions.

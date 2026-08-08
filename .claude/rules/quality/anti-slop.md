---
paths:
  - "agents/writer/**"
  - "agents/**/technical-writer/**"
  - "agents/operator/marketing-sales/**"
  - ".claude/skills/*/SKILL.md"
---

# Anti-Slop Writing Rules

Rules for eliminating predictable AI writing patterns from all agent output. Adapted from [stop-slop](https://github.com/hardikpandya/stop-slop) (MIT, Hardik Pandya) for the cAgents framework.

These rules apply to all agent-generated text: coordination logs, validation reports, plans, creative content, documentation, and user-facing output.

## Rule 1: Cut Filler Phrases

Remove throat-clearing openers, emphasis crutches, and unnecessary adverbs. State the point directly.

### Banned Openers
- "Here's the thing"
- "It turns out"
- "The real X is"
- "Let me be clear"
- "Can we talk about"
- "At its core"
- "In today's X"
- "It's worth noting"
- "Let me walk you through"

### Banned Emphasis Crutches
- "Full stop."
- "Let that sink in."
- "This matters because"
- "This is important because"

### Adverbs to Cut
Remove filler adverbs: really, just, literally, genuinely, simply, actually, fundamentally, inherently, essentially, effectively, ultimately, importantly, significantly, arguably.

**Before**: "It's worth noting that the implementation fundamentally changes how authentication works."
**After**: "The implementation changes how authentication works."

## Rule 2: Ban False Agency

Name the human or agent who acts. Do not give inanimate objects human verbs.

### Banned Patterns
- "The system handles" -- name which agent or component handles it
- "The pipeline manages" -- name the orchestrator or controller
- "The workflow produces" -- name the agent that produces output
- "The data tells us" -- describe what the data shows
- "The market rewards" -- name who benefits and how
- "The complaint becomes a fix" -- name who converts the complaint into a fix

### In cAgents Context
- BAD: "The pipeline manages execution flow"
- GOOD: "The /act state machine advances through enrichment, coordination, and validation stages"
- BAD: "The system handles authentication"
- GOOD: "The backend-developer implements JWT validation in the auth middleware"

## Rule 3: Use Active Voice

Every sentence needs a subject doing something. Passive voice hides who acts and weakens claims.

### Banned Passive Patterns
- "X was created" -- say who created it
- "Tests should be written" -- say "qa-tester writes tests"
- "The implementation was completed" -- say who completed it
- "Errors are handled" -- say which component handles errors and how
- "The feature was deployed" -- say who deployed it

### In cAgents Context
- BAD: "The auth module was refactored to improve security"
- GOOD: "The backend-developer refactored the auth module, adding bcrypt with cost=12 and rate limiting at 5 attempts per 15 minutes"

## Rule 4: Be Specific, Not Vague

No vague declaratives. Replace abstractions with concrete facts, numbers, and evidence.

### Banned Vague Declaratives
- "The reasons are structural"
- "The implications are significant"
- "The stakes are high"
- "The implementation is satisfactory"
- "The approach is comprehensive"
- "The solution is robust"
- "The results are promising"

### Specificity Requirements
- Replace "improved performance" with measured metrics: "reduced response time from 450ms to 120ms"
- Replace "enhanced security" with specific changes: "added input validation on 3 API endpoints, parameterized 12 SQL queries"
- Replace "better error handling" with what changed: "added try-catch around database calls in user-service.ts, returning 503 with retry-after header on connection failure"

## Rule 5: Ban Business Jargon

Use plain language. Say what you mean.

### Banned Jargon
| Jargon | Plain Alternative |
|--------|-------------------|
| navigate | work through, fix, handle |
| unpack | explain, break down |
| lean into | focus on, emphasize |
| landscape | situation, market, field |
| game-changer | significant improvement (with specifics) |
| deep dive | detailed analysis |
| circle back | revisit, follow up |
| moving forward | next, from now on |
| leverage | use |
| synergy | cooperation, combined effect |
| holistic | complete, full |
| paradigm shift | major change |
| ecosystem | system, platform |
| streamline | simplify |
| actionable | specific, concrete |
| best-in-class | (cut entirely -- show evidence instead) |

## Rule 6: Trust the Reader

State facts directly. Do not soften, hedge, or announce what you are about to say.

### Banned Meta-Commentary
- "Hint:"
- "Plot twist:"
- "Let me walk you through"
- "The rest of this explains"
- "As we will see"
- "It goes without saying"
- "Needless to say"

### Banned Hedging
- "It should be noted that" -- just state the fact
- "It is important to mention" -- just mention it
- "One could argue that" -- make the argument or do not
- "It might be worth considering" -- state the consideration

## Quick Checks for All Agent Output

Before finalizing any written output, verify:

1. **No filler adverbs** -- search for -ly words, "really", "just", "simply", "actually"
2. **No passive voice** -- every sentence has a named subject performing the action
3. **No false agency** -- inanimate objects do not have human verbs
4. **No throat-clearing** -- the first sentence states the point, not a preamble
5. **No vague declaratives** -- every claim has specific evidence
6. **No business jargon** -- plain language throughout
7. **No meta-commentary** -- no announcements about what the text will say

## Scoring (for Reviewers)

When reviewing prose quality, score on five dimensions (1-10 each):

| Dimension | 1 (Weak) | 10 (Strong) |
|-----------|----------|-------------|
| **Directness** | Announces before stating | States facts immediately |
| **Specificity** | Vague claims without evidence | Concrete facts with file paths, numbers, metrics |
| **Active voice** | Passive constructions hide actors | Named subjects perform actions |
| **Plain language** | Jargon-heavy, buzzword-laden | Clear, direct, no jargon |
| **Density** | Padding, filler, repetition | Every word earns its place |

Total below 30/50 triggers a revision request.

## Applicability by Agent Type

| Agent Type | Primary Rules | Secondary Rules |
|------------|--------------|-----------------|
| **All agents** | Rules 2 (false agency), 3 (active voice), 4 (specificity) | Rule 1 (filler), Rule 6 (trust reader) |
| **Creative agents** | All rules at full strength | Plus: vary rhythm, cut quotables, no formulaic structures |
| **Controllers** | Rules 2, 3, 4 (coordination logs must name agents and cite evidence) | Rule 5 (no jargon in plans) |
| **Reviewers** | Rule 4 (evidence-based findings only) | Rule 3 (active voice in review comments) |

---

## AI-Tell Severity Registry (P0-P3)

The single canonical list of AI-writing tells for every cAgents writer agent. It extends Rules 1-6 above with a severity-tiered catalog distilled from a full-manuscript detection audit. Severity: **P0** = immediate flag, catch every instance; **P1** = fix when found; **P2** = watch frequency, cap rather than eliminate; **P3** = acceptable in moderation, a tell only when it becomes universal.

For narrative and worldbuilding prose the governing override is **reshape, don't cut**: when a tell sits inside load-bearing exposition, vary the cadence, re-embed the idea in scene/action/dialogue, or state a thesis once instead of thrice — never delete the idea itself.

### P0 — Structural and signature tells (zero tolerance)

- **Section-ending resolution**: every `---` or scene break preceded by a neat emotional or intellectual resolution. Human prose leaves threads dangling; let 30-40% of sections end mid-tension, mid-action, or on an unanswered question.
- **Voice bleed**: every POV character thinks in the same "smart narrator" rhythm, vocabulary, and metaphors. Each voice must be distinct — a washerwoman thinks in water and fabric, a bureaucrat in procedure and precedent.
- **Identical repeated tic**: the same multi-word phrase reused as a structural beat (e.g. "I sat with this" as a thinking-pause 7+ times). No human repeats an exact phrase this way.

### P1 — High-frequency patterns (fix on sight)

| Tell | Grep / detection | Fix |
|------|------------------|-----|
| "Which meant" cause-effect opener | `Which meant` | Vary causal connectors or restructure to drop the connector. |
| "I filed this/that/it" | `I filed (this\|that\|it)` | Vary the mental-processing metaphor or cut the beat. |
| "the expression of someone who [clause]" | `the expression of someone who` | Describe the actual expression (tightened jaw, narrowed eyes). |
| "the gap between X and Y" | `the gap between` | Describe the specific contrast concretely. |
| Negative definition stacking ("Not X. Not Y. Just Z.") | `Not [A-Z][^.]+\. Not [A-Z]` | State what it IS directly. |
| Walk-home-and-reflect closer | manual (chapter endings) | End mid-scene, on dialogue, or on a sensory detail. |
| Essay coda (15+ line reflective close) | manual (final section) | Cut the coda or end earlier in the scene. |
| Authority-validation template (demonstrate → validate → reflect) | manual | Let authority push back, stay silent, or validate something unexpected. |
| Thesis recursion (restating the point 2-3x) | manual | State the insight once; trust the reader. |
| Emotional metabolization (emotion analyzed and resolved in one paragraph) | manual | Let emotions persist across scenes without resolution. |
| Policy-paper register creep ("infrastructure", "framework", "protocol", "stakeholder") | grep the vocab | Use era- and character-appropriate words. |

### P2 — Watch frequency (cap, don't eliminate)

| Tell | Grep / detection | Cap / fix |
|------|------------------|-----------|
| "something about/in [the/how/what]" | `something (about\|in) (the\|how\|what)` | Name what the character actually notices. |
| "without [gerund]" (action-by-absence) | `without (looking\|waiting\|thinking\|asking)` | Show what the character does, not what they don't. |
| "weight/gravity/significance of" | `(weight\|gravity\|significance) of (that\|this\|the\|it)` | Show the impact, not the abstraction. |
| Rhetorical-question cascade | 3+ consecutive `?` | Keep 2-3 per chapter; never 3+ in a row. |
| Numbers-as-revelation ("Three. Not two. Three.") | manual | State numbers plainly. |
| Discovery-moment inflation ("this changed everything") | manual | Let most discoveries be noted matter-of-factly. |
| Competence cascade (frictionless mastery) | manual | Let some skills resist the character for a while. |
| Frictionless adoption (everyone accepts every idea) | manual | Let characters resist for real reasons. |
| Perfect-informant dialogue | manual | Let answers be partial, tangential, or wrong. |

### P3 — Acceptable in moderation (a tell only when universal)

- **Interlude/section mirroring**: echoing the preceding section's theme from another angle is fine occasionally; it becomes a tell when *every* section does it. Let some be tangential or set up future material.
- **Positive signals to protect** (their *absence* flags AI): em dashes at 0, semicolons at 3+ per chapter (ZERO is a known tell), contractions present throughout, 2-3 rhetorical questions per chapter, at least one register shift per chapter. Maintain these while editing; do not strip them out chasing concision.

## Hard-Banned Constructions (B1-B10)

Zero tolerance, grep-checkable. Target for every one is **0**. A surviving registry tic (B1-B3) is a hard FAIL of the voice dimension regardless of how good the surrounding prose is.

| # | Banned construction | Detection | Target |
|---|---------------------|-----------|--------|
| B1 | Tic "I filed it / this / that" | `grep -niE "I filed (it\|this\|that)"` | 0 |
| B2 | Tic "I sat with this / that" | `grep -niE "I sat with (this\|that)"` | 0 |
| B3 | Tic "the expression of someone who" | `grep -ni "expression of someone who"` | 0 |
| B4 | "it's not X, it's Y" tic | `grep -niE "it.s not .{1,40} it.s"` | 0 |
| B5 | Essay-coda / reflective-thesis chapter ending (15+ line meaning-summary close) | manual read of final section | 0 |
| B6 | Arc-metadata ("this was a turning point", "everything changed", "Arc X complete") | manual + grep | 0 |
| B7 | Formulaic tricolon / anaphora clusters (3+ consecutive parallel sentence-openers) | manual read | 0 |
| B8 | Rhetorical-question cascade (3+ consecutive RQs) | manual read | 0 |
| B9 | Hedging boilerplate ("it is worth noting", "it bears mentioning", "in many ways") | grep | 0 |
| B10 | Objectless transitive verbs (already fixed; do not re-introduce) | manual | 0 |

## Deep Final Gate: ai-writing-editor

Before returning any prose deliverable, run `cagents:ai-writing-editor` (mode=both) as the deep final gate. It scans for every P0-P3 tell and every B1-B10 hard-ban above, plus the burstiness and perplexity signals a static grep pass misses. This file (`anti-slop.md`) remains the single source of truth for the tell list — `ai-writing-editor` enforces the list defined here and does not maintain a competing one. If the editor and this file ever disagree, this file wins and the editor is updated to match.

---

**Source**: Adapted from [stop-slop](https://github.com/hardikpandya/stop-slop) by Hardik Pandya (MIT License). Severity registry and hard-ban list distilled from the magic-city AI-tell audit (`analysis/ai_tell_registry.md`, `style_tell_spec.md`).

**Part of**: cAgents Quality Framework

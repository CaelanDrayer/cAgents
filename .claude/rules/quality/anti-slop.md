---
paths:
  - "agents/ai-writing-editor.md"
  - "agents/ai-writing-editor/**"
  - "agents/editor.md"
  - "agents/editor/**"
  - "agents/narrative-director.md"
  - "agents/narrative-director/**"
  - "agents/worldbuilder.md"
  - "agents/worldbuilder/**"
  - "agents/technical-writer.md"
  - "agents/technical-writer/**"
  - "agents/marketing-analyst.md"
  - "agents/marketing-analyst/**"
  - "agents/marketing-strategist.md"
  - "agents/marketing-strategist/**"
  - "agents/sales-strategist.md"
  - "agents/sales-strategist/**"
  - ".claude/skills/*/SKILL.md"
---

# Anti-Slop Writing Rules

Rules for eliminating predictable AI writing patterns from all agent output. These rules are adapted from [stop-slop](https://github.com/hardikpandya/stop-slop) (MIT, Hardik Pandya) for the cAgents framework.

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

Every sentence needs a subject that does something. The passive voice hides who acts, and it weakens the claim.

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
- Replace "better error handling" with what changed. Example: "added try-catch around database calls in user-service.ts, returning 503 with retry-after header on connection failure"

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

Before you finalize any written output, check all seven of the points below:

1. **No filler adverbs** -- search for -ly words, "really", "just", "simply", "actually"
2. **No passive voice** -- every sentence has a named subject performing the action
3. **No false agency** -- inanimate objects do not have human verbs
4. **No throat-clearing** -- the first sentence states the point, not a preamble
5. **No vague declaratives** -- every claim has specific evidence
6. **No business jargon** -- plain language throughout
7. **No meta-commentary** -- no announcements about what the text will say

## Scoring (for Reviewers)

When you review prose quality, score the text on five dimensions. Give each dimension a score from 1 to 10:

| Dimension | 1 (Weak) | 10 (Strong) |
|-----------|----------|-------------|
| **Directness** | Announces before stating | States facts immediately |
| **Specificity** | Vague claims without evidence | Concrete facts with file paths, numbers, metrics |
| **Active voice** | Passive constructions hide actors | Named subjects perform actions |
| **Plain language** | Jargon-heavy, buzzword-laden | Clear, direct, no jargon |
| **Density** | Padding, filler, repetition | Every word earns its place |

A total below 30/50 triggers a revision request.

## Applicability by Agent Type

| Agent Type | Primary Rules | Secondary Rules |
|------------|--------------|-----------------|
| **All agents** | Rules 2 (false agency), 3 (active voice), 4 (specificity) | Rule 1 (filler), Rule 6 (trust reader) |
| **Creative agents** | All rules at full strength | Plus: vary rhythm, cut quotables, no formulaic structures |
| **Controllers** | Rules 2, 3, 4 (coordination logs must name agents and cite evidence) | Rule 5 (no jargon in plans) |
| **Reviewers** | Rule 4 (evidence-based findings only) | Rule 3 (active voice in review comments) |

---

## AI-Tell Severity Registry (P0-P3)

The single canonical list of AI-writing tells for every cAgents writer agent. It extends Rules 1-6 above with a severity-tiered catalog. That catalog comes from a full-manuscript detection audit. The four severity levels are:

- **P0** = flag it at once, and catch every instance.
- **P1** = fix it when you find it.
- **P2** = watch the frequency, and cap it rather than eliminate it.
- **P3** = acceptable in moderation, and a tell only when it becomes universal.

Section P3 below has a scope limiter for the em dash signal. Read it before you
apply that signal to a repository file.

For narrative and worldbuilding prose, the governing override is **reshape, don't cut**. If a tell sits inside load-bearing exposition, do one of these three things. Vary the cadence. Re-embed the idea in scene/action/dialogue. State a thesis once instead of thrice. Never delete the idea itself.

### P0 — Structural and signature tells (zero tolerance)

- **Section-ending resolution**: every `---` or scene break preceded by a neat emotional or intellectual resolution. Human prose leaves threads dangling. Let 30-40% of sections end mid-tension, mid-action, or on an unanswered question.
- **Voice bleed**: every POV character thinks in the same "smart narrator" rhythm, vocabulary, and metaphors. Each voice must be distinct. A washerwoman thinks in water and fabric. A bureaucrat thinks in procedure and precedent.
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

- **Interlude/section mirroring**: an echo of the preceding section's theme, from another angle, is fine on occasion. It becomes a tell when *every* section does it. Let some sections be tangential, or let them set up future material.
- **Positive signals to protect**: their *absence* flags AI. Maintain these signals while you edit. Do not strip them out to chase concision. The signals are em dashes at 0, and semicolons at 3+ per chapter. A semicolon count of ZERO is a known tell. The other signals are contractions present throughout, 2-3 rhetorical questions per chapter, and at least one register shift per chapter.

  **Scope limiter: this signal governs runtime-generated user-facing output.**
  It applies to narrative, creative, and marketing prose, and to chat replies
  that an agent writes for a user at run time. It does not apply to repository
  files that hold instructional or reference prose. Those files obey
  `.claude/rules/quality/ste100-technical-writing.md`, which bans the em dash
  and sets its count to 0. The two rules do not conflict, because each one
  governs a different surface. Do not delete either rule to remove a conflict
  that is not there. A file under `agents/`, `.claude/rules/`,
  `.claude/skills/`, `docs/`, `CLAUDE.md`, or `README.md` takes 0 em dashes. A
  reply that an agent writes for a user keeps its em dashes.

## Hard-Banned Constructions (B1-B10)

Zero tolerance, grep-checkable. The target for every one of them is **0**. A surviving registry tic (B1-B3) is a hard FAIL of the voice dimension. The quality of the prose around that tic does not matter.

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

Before you return any prose deliverable, run `cagents:ai-writing-editor` (mode=both) as the deep final gate. It scans for every P0-P3 tell and every B1-B10 hard-ban above. It also scans for the burstiness signals and the perplexity signals that a static grep pass misses. This file (`anti-slop.md`) remains the single source of truth for the tell list. `ai-writing-editor` enforces the list that this file defines, and it does not keep a competing list. If the editor and this file ever disagree, this file wins, and we then update the editor to match.

The authority of `anti-slop.md` covers runtime-generated user-facing output. It
does not cover the instructional and reference prose in repository files. For
repository files, `.claude/rules/quality/ste100-technical-writing.md` is the
source of truth, and its jurisdiction table lists each path in scope. Neither
file overrides the other, because each one governs a different surface.

---

**Source**: Adapted from [stop-slop](https://github.com/hardikpandya/stop-slop) by Hardik Pandya (MIT License). Severity registry and hard-ban list distilled from the magic-city AI-tell audit (`analysis/ai_tell_registry.md`, `style_tell_spec.md`).

**Part of**: cAgents Quality Framework

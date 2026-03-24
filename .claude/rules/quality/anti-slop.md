---
paths:
  - "creative/agents/**"
  - "**/agents/copywriter/**"
  - "**/agents/technical-writer/**"
  - "**/agents/content-*/**"
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
- GOOD: "The /run state machine advances through enrichment, coordination, and validation stages"
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

**Source**: Adapted from [stop-slop](https://github.com/hardikpandya/stop-slop) by Hardik Pandya (MIT License).

**Part of**: cAgents Quality Framework

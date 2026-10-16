---
name: ex-skill-authoring-explain-why-not-allcaps
description: "Example: the Anthropic house-style rule. Replace heavy-handed all-caps MUST and NEVER pressure with the reason behind the rule, keep emphasis only where a test shows it helps, and find the offenders with grep signals. Load when you edit an agent SKILL.md or a rule that leans on 'MUST/NEVER/CRITICAL'."
license: Apache-2.0
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-explain-why-not-allcaps
  category: skill-authoring
  source_repo: anthropics/skills
  source_url: "https://github.com/anthropics/skills"
  source_commit: dbd4588f9e1033efb41dad4bef2f7947c8993d44
  reviewed: "2026-10-15"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "Reframe musty ALL-CAPS MUST/NEVER as reasoned why; reserve caps for load-bearing platform gotchas."
  added: "2026-07-10"
---

# Example: Explain the Why, Avoid Musty MUSTs

## Context
skill-creator calls all-caps ALWAYS or NEVER, and rigid structure, a yellow
flag. Its fix is to explain the reason, so the model knows why the request
matters. Upstream later turned this into an audit for CLAUDE.md, rule files,
skills, and subagent definitions. cAgents uses MUST, NEVER, CRITICAL, and
MANDATORY a lot. That is its largest divergence from Anthropic house style.

## Example

Coercive. It shouts and gives no reason, so the model cannot generalize from it:

```
NEVER write to implementation files. ALWAYS delegate. This is MANDATORY.
Zero tolerance. CRITICAL violation if you don't.
```

Reframed. It states the reason, so the model can apply the boundary to new cases:

```
Delegate implementation to execution agents rather than writing the code yourself.
A controller that edits src/ directly loses the independent-review step that catches
its own blind spots, and its context fills with implementation detail it needs for
coordination. Keep your context on the plan; let a specialist own the diff.
```

**Why the markers fail.** When many instructions are each marked critical, the
markers stop carrying information. An anxious prompt makes a cautious, hedging
model. Say what you mean at normal volume.

**Hedges fail too.** "Try to" or "if possible" on a real requirement now reads
as permission to under-deliver. Remove the hedge, or state the true condition.

**Find the offenders with grep signals:**

- A high density of `MUST|NEVER|ALWAYS|CRITICAL|IMPORTANT` in one file.
- Emphasis with no "because" in the same sentence or the next sentence.

**Apply three tests to each flagged line:**

1. **Does the line change behavior compared to the model's default?** If not,
   remove it. Ask "could the model already know this?"
2. **Keep context, reasons, and fragile exact scripts.** These pass the test
   above even when they are long. Never justify a deletion by length alone.
3. **Is the emphasis tested and scoped?** Emphasis is not banned. It is a fix
   that you scope to one fact and test. A platform gotcha that the model will
   otherwise miss is a good use. Write it as a fact, for example: "The docx
   library defaults to A4 page size. Set US Letter explicitly."

**Exempt the description.** The `description` field is trigger text, not
behavior text. Calibrated urgency is correct there. See
`ex-skill-authoring-pushy-description`. A hook-enforced denial can also stay
firm. Write it as "the hook denies X because Y", not as shouting.

## Why it matters
This guides the sweep of cAgents rule and agent files that use all-caps
pressure. The sweep moves them toward stated reasons and trims context. It
keeps emphasis only for real gotchas, hook-enforced denials, and description
urgency. The "could the model already know this?" test stops the sweep from
deleting load-bearing context. Distilled from anthropics/skills
`skills/skill-creator/SKILL.md` (Writing style) and
`skills/claude-api/shared/prompt-audit.md` (section 1a, Step 3, and the keep list).

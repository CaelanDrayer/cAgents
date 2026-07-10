---
name: ex-skill-authoring-explain-why-not-allcaps
description: "Example: the Anthropic house-style rule — reframe heavy-handed ALL-CAPS MUST/NEVER coercion as reasoned explanation of WHY, and reserve caps for genuinely load-bearing platform gotchas. Load when editing an agent SKILL.md or a rule that leans on 'MUST/NEVER/CRITICAL'."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-skill-authoring-explain-why-not-allcaps
  category: skill-authoring
  source_repo: anthropics/skills
  source_url: "https://github.com/anthropics/skills"
  applies_to:
    - cagents:planner
    - cagents:technical-writer
  demonstrates: "Reframe musty ALL-CAPS MUST/NEVER as reasoned why; reserve caps for load-bearing platform gotchas."
  added: "2026-07-10"
---

# Example: Explain the WHY, Avoid Musty MUSTs

## Context
skill-creator's most emphatic style rule: writing ALWAYS/NEVER in all caps, or using
super-rigid structures, is a *yellow flag* — reframe and explain the reasoning so the
model understands *why* the ask matters. That is "a more humane, powerful, and
effective approach." cAgents leans heavily on MUST/NEVER/CRITICAL/MANDATORY; this is
its single largest divergence from Anthropic house style.

## Example

Coercive (shouting, no reason — the model can't generalize from it):

```
NEVER write to implementation files. ALWAYS delegate. This is MANDATORY.
Zero tolerance. CRITICAL violation if you don't.
```

Reframed (states the why — the model now understands the boundary and can apply it to
novel cases):

```
Delegate implementation to execution agents rather than writing the code yourself.
A controller that edits src/ directly loses the independent-review step that catches
its own blind spots, and its context fills with implementation detail it needs for
coordination. Keep your context on the plan; let a specialist own the diff.
```

Two style tests:
- **Does this line change behavior vs the model's default?** If not, cut it — "keep
  the prompt lean; remove things that aren't pulling their weight."
- **Is the caps genuinely load-bearing?** Reserve caps for platform gotchas the model
  will otherwise miss, phrased as fact:

```
docx-js defaults to A4 — set page size explicitly for US Letter.
Never use Unicode subscripts in PDF text — they render as black boxes.
```

Hook-enforced denials can stay firm, but should read as "the hook denies X because Y",
not as behavioral shouting.

## Why it matters
Guides the sweep of cAgents' ~78 ALL-CAPS-coercion rule/agent files toward reasoned
rationale — aligning with Anthropic's own style and trimming context bloat, while
keeping caps only for real gotchas and hook-enforced denials. Distilled from
anthropics/skills `skills/skill-creator/SKILL.md` (Writing style).

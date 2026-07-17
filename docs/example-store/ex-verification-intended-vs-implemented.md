---
name: ex-verification-intended-vs-implemented
description: "Example: the 'intended vs implemented' audit method — establish documented intent as claims-to-verify, gather cited file:line evidence, compare boundary-by-boundary, and keep only mismatches that cross a trust/cost/data/tenant boundary. Load for security or quality audits against a documented baseline."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-intended-vs-implemented
  category: verification
  source_repo: phuryn/pm-skills
  source_url: "https://github.com/phuryn/pm-skills"
  applies_to:
    - cagents:security-engineer
    - cagents:qa-lead
    - cagents:architect
  demonstrates: "Audit code against documented intent boundary-by-boundary; keep only trust/cost/data/tenant-boundary-crossing drift."
  added: "2026-07-10"
---

# Example: Intended-vs-Implemented Audit

## Context
Generic linters scan code "in a vacuum" — they cannot tell you the code does what you
*meant*, because they have no model of intent. cAgents' `security-engineer` (owasp
mode) and `qa-lead` (code-review mode) can catch this class of bug by first writing
down intent, then auditing the code against it.

## Example

Five-step method (each finding needs both sides cited or it is "a question, not a
finding"):

```
1. Establish intent. Read the docs/spec/acceptance criteria. Treat every stated
   claim as a CLAIM TO VERIFY, not proof. ("admin only", "validated elsewhere" are
   claims until found in code.)
2. Gather implementation evidence as a cited file:line.
   "It's probably handled upstream" is explicitly REJECTED as non-evidence.
3. Compare claim -> code boundary-by-boundary. Distrust reassuring comments.
4. Classify each mismatch: does it cross a TRUST / COST / DATA / TENANT boundary?
   - cosmetic drift (naming, formatting) -> DROP.
   - boundary-crossing drift -> KEEP.
5. Every kept finding names: documented intent (quoted) + implemented reality (cited)
   + attacker/victim + concrete fix. Otherwise it is not reportable.
```

Worked finding:

```
Intent (permissions.md): "Only workspace owners can delete a project."
Reality: src/api/project.ts:74 — DELETE handler checks `req.user != null`, not ownership.
Boundary crossed: TENANT (any authenticated user can delete another tenant's project).
Attacker/victim: any logged-in user -> any project owner.
Fix: add `assertOwner(req.user, project)` before the destructive call.
```

The method only works because intent was written down first — which is exactly why
"commodity scanners can't replicate it."

## Why it matters
Gives cAgents' security/quality agents a named, general-purpose technique for the
"scanner-misses-because-no-model-of-intent" bug class, complementing (not replacing)
sink-level static analysis. Distilled from phuryn/pm-skills
`pm-ai-shipping/skills/intended-vs-implemented/SKILL.md`.

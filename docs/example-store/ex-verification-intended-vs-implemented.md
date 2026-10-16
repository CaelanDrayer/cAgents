---
name: ex-verification-intended-vs-implemented
description: "Example: the 'intended vs implemented' audit method. Write down the documented intent as claims to verify, gather file:line evidence, compare them one boundary at a time, and keep only mismatches that cross a trust, cost, data, or tenant boundary. Includes a check-only mode that reports where the docs and the code disagree. Load for security or quality audits against a documented baseline."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-intended-vs-implemented
  category: verification
  source_repo: phuryn/pm-skills
  source_url: "https://github.com/phuryn/pm-skills"
  source_commit: c68487d721e419ec87af1ae6412a842978eab785
  applies_to:
    - cagents:security-engineer
    - cagents:qa-lead
    - cagents:architect
  demonstrates: "Audit code against documented intent one boundary at a time; keep only drift that crosses a trust, cost, data, or tenant boundary."
  added: "2026-07-10"
  reviewed: "2026-10-15"
---

# Example: Intended-vs-Implemented Audit

## Context
A generic linter scans code with no model of intent. It cannot tell you if the
code does what you *meant*. The cAgents `security-engineer` in owasp-audit mode
and the `qa-lead` in code-review mode can find this class of bug. First they
write down the intent. Then they audit the code against it.

## Example

**Find the intent docs by what they cover, not by their name.** The repo can keep
intent in `docs/`, in an ADR folder, in agent instructions, or in a spec under
another name. Read the agent instructions and the docs folder first. A default
path such as `documentation/permissions.md` applies only if the repo has no
equivalent. If no intent doc exists, that absence is the first finding.

Five-step method. Each finding must cite both sides. If it does not, it is a
question, not a finding.

```
1. Establish the intent. Read the docs, the spec, and the acceptance criteria.
   Treat each stated claim as a CLAIM TO VERIFY, not as proof.
   "Admin only" and "validated elsewhere" stay claims until you find them in code.
2. Gather the implementation evidence as a cited file:line.
   Reject "it is probably handled upstream". It is not evidence.
3. Compare each claim with the code, one boundary at a time.
   Do not trust a comment that only reassures.
4. Classify each mismatch: does it cross a TRUST, COST, DATA, or TENANT boundary?
   - cosmetic drift, such as naming or formatting -> DROP.
   - drift that crosses a boundary -> KEEP.
5. Each kept finding names four things: the documented intent (quoted), the
   implemented reality (cited), the attacker and the victim, and a concrete fix.
   If one is missing, the finding is not reportable.
```

Worked finding:

```
Intent (permissions.md): "Only workspace owners can delete a project."
Reality: src/api/project.ts:74. The DELETE handler checks `req.user != null`, not ownership.
Boundary crossed: TENANT. Any authenticated user can delete the project of another tenant.
Attacker and victim: any logged-in user -> any project owner.
Fix: add `assertOwner(req.user, project)` before the destructive call.
```

**Check-only mode.** Use this mode when the task is to report drift, not to
decide which side is wrong. Write no files. For each disagreement, report "the
doc says X" and "the code does Y", with a file:line citation on BOTH sides. The
owner of the doc or the code then decides which side to change.

```
Doc:  docs/permissions.md:12 "Exports are limited to admins."
Code: src/api/export.ts:30 checks role in ["admin", "editor"].
```

The method works only because the intent was written down first. A commodity
scanner cannot repeat it, because the scanner has no intent to compare with.

## Why it matters
The security and quality agents in cAgents get a named, general technique for one
class of bug. A scanner misses this class because it has no model of intent. It adds to
static analysis at the sink level, and it does not replace it.

Distilled from phuryn/pm-skills
`pm-ai-shipping/skills/intended-vs-implemented/SKILL.md`. The check-only mode
comes from `pm-ai-shipping/commands/document-app.md` in the same repo.

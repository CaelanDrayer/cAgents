---
name: ex-review-safe-careful-risky
description: "Example: risk-tiered auto-apply for code-quality findings — SAFE (auto-apply), CAREFUL (apply + verify per file), RISKY (flag only, never auto-apply) — with file:line-cited findings and a Chesterton's-Fence check before any removal. Load for Stage-2 review design."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-review-safe-careful-risky
  category: review
  source_repo: NousResearch/hermes-agent
  source_url: "https://github.com/NousResearch/hermes-agent"
  applies_to:
    - cagents:reviewer
    - cagents:qa-lead
  demonstrates: "Risk-tiered auto-apply (SAFE / CAREFUL / RISKY) with file:line-cited findings + Chesterton's-Fence check."
  added: "2026-07-10"
---

# Example: SAFE / CAREFUL / RISKY Auto-Apply Tiers

## Context
cAgents' Stage-2 code-quality review (`pat-two-stage-review.md`) tags findings by
severity (CRITICAL/HIGH/LOW) but has no auto-apply mechanism — every fix waits for a
full revision round. This example adds an eligibility tier orthogonal to severity so
mechanical fixes apply immediately while real risks are flagged, not silently changed.

## Example

Three narrow reviewers each receive the **entire** diff (never split — cross-file
issues must stay visible) and may only report a finding with a `file:line` citation.
Each finding carries an auto-apply tier:

| Tier | Rule | Examples |
|------|------|----------|
| **SAFE** | auto-apply, no confirmation | unused imports, dead variables, obvious typos in strings |
| **CAREFUL** | apply, then verify that one file (re-run guard) | rename a *local* variable, extract a private helper |
| **RISKY** | flag ONLY — never auto-apply | public API rename, signature change, behavior-affecting edit |

```yaml
findings:
  - rule: unused-import
    tier: SAFE
    location: "src/auth/session.ts:3"
    action: applied
  - rule: local-rename
    tier: CAREFUL
    location: "src/auth/hash.ts:15"
    action: applied
    verify: "npm test src/auth -> 12/12 pass"
  - rule: public-rename
    tier: RISKY
    location: "src/api/routes.ts:88"
    action: flagged        # left for human/controller decision
    confidence: low
```

**Chesterton's-Fence discipline**: before flagging any code for *removal*, run
`git blame` on it. If the reason it exists can't be determined, mark
`confidence: low` and downgrade to flag-only rather than guessing it's dead.

## Why it matters
Lets a cAgents reviewer distinguish "safe enough to silently fix and note" from
"block / escalate" without spending an extra revision round on mechanical cleanups,
while the Chesterton's-Fence rule stops confident-but-wrong deletions. Distilled from
NousResearch/hermes-agent `skills/software-development/simplify-code/SKILL.md`.

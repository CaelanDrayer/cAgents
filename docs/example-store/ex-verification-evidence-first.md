---
name: ex-verification-evidence-first
description: "Example: completion claims must cite a specific file:line or actual test output. Vague confirmations such as 'looks good', 'handled upstream', or 'agent said success' are not evidence. Load when an execution agent or controller is about to report DONE."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-evidence-first
  category: verification
  source_repo: obra/superpowers
  source_url: "https://github.com/obra/superpowers"
  source_commit: bb92a77741419a4ab5f06e711a283343f1ada0c3
  reviewed: "2026-10-15"
  applies_to:
    - cagents:backend-developer
    - cagents:reviewer
    - all-controllers
  demonstrates: "Completion claims cite specific file:line / test output; 'handled upstream' and 'agent said success' do not count as evidence."
  added: "2026-07-10"
---

# Example: Evidence-First Completion

## Context
Before a DONE report, cAgents wants specific evidence that someone can check
(`pat-evidence-first-execution.md`). This example maps each claim type to the
exact proof that closes it. It also names the phrases that are not evidence.

## Example

Bad. The evidence is vague, so the completion is a phantom:

```yaml
- criterion: "Auth is secure"
  evidence: "Reviewed auth code, looks good"      # not evidence
- criterion: "Tests pass"
  evidence: "Should work now"                     # not evidence
```

Good. Each claim has the command or the citation that proves it:

```yaml
- criterion: "Password hashing uses bcrypt cost>=12"
  evidence: "src/auth/hash.ts:15: bcrypt.hash(pw, 12)"
- criterion: "Token expiry enforced"
  evidence: "src/auth/session.ts:8: verify() rejects exp<now; test at
             tests/session.test.ts:22 asserts 401 on expired token"
- criterion: "Tests pass"
  evidence: "npx vitest run tests/auth -> '23 passed (23)' (re-run at self-validation)"
```

Map from claim type to proof:

| Claim | Proof that closes it |
|-------|----------------------|
| "file exists / created" | `fs.existsSync(path)` is true at self-validation time |
| "tests pass" | the diff contains the test AND you ran it again |
| "bug fixed" | a red-green regression check (see below and feedback-loop-first) |
| "an agent I delegated to succeeded" | check the VCS diff; a success report is a claim |

The red-green regression check for "bug fixed" has six steps. Write the test.
Run it and see it pass. Revert the fix. Run it and see it fail. Restore the fix.
Run it and see it pass. A test that cannot fail proves nothing.

These phrases are not evidence: "looks correct", "probably works", "handled
upstream", "validated elsewhere", "the agent said success".

## Why it matters
A hook (`validator-evidence-recheck.cjs`) can check specific evidence again.
Vague evidence is the only kind that survives a bias toward PASS. Distilled
from obra/superpowers `skills/verification-before-completion/SKILL.md`, and
reinforced by the pm-skills line that "it's probably handled upstream" is not
evidence.

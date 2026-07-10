---
name: ex-verification-evidence-first
description: "Example: completion claims must cite specific file:line / actual test output; vague confirmations ('looks good', 'handled upstream', 'agent said success') are rejected as non-evidence. Load when an execution agent or controller is about to report DONE."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.x"
metadata:
  id: ex-verification-evidence-first
  category: verification
  source_repo: obra/superpowers
  source_url: "https://github.com/obra/superpowers"
  applies_to:
    - cagents:backend-developer
    - cagents:reviewer
    - all-controllers
  demonstrates: "Completion claims cite specific file:line / test output; 'handled upstream' and 'agent said success' are rejected as non-evidence."
  added: "2026-07-10"
---

# Example: Evidence-First Completion

## Context
Before any DONE report, cAgents wants specific, verifiable evidence (`pat-evidence-first-execution.md`).
This example maps each *claim type* to the exact proof that closes it, and names the
phrases that are NOT evidence.

## Example

Bad (vague — phantom completion):

```yaml
- criterion: "Auth is secure"
  evidence: "Reviewed auth code, looks good"      # not evidence
- criterion: "Tests pass"
  evidence: "Should work now"                     # not evidence
```

Good (each claim tied to the command/citation that proves it):

```yaml
- criterion: "Password hashing uses bcrypt cost>=12"
  evidence: "src/auth/hash.ts:15 — bcrypt.hash(pw, 12)"
- criterion: "Token expiry enforced"
  evidence: "src/auth/session.ts:8 — verify() rejects exp<now; test at
             tests/session.test.ts:22 asserts 401 on expired token"
- criterion: "Tests pass"
  evidence: "npx vitest run tests/auth -> '23 passed (23)' (re-run at self-validation)"
```

Claim-type -> proof map:

| Claim | Proof that closes it |
|-------|----------------------|
| "file exists / created" | `fs.existsSync(path)` true at self-validation time |
| "tests pass" | the diff contains the test AND you re-ran it |
| "bug fixed" | a red-capable repro that is now green (see feedback-loop-first) |
| "an agent I delegated to succeeded" | check the VCS diff — a success report is a claim |

Explicitly non-evidence: "looks correct", "probably works", "handled upstream",
"validated elsewhere", "the agent said success".

## Why it matters
Specific evidence is the only kind a hook (`validator-evidence-recheck.cjs`) can
re-verify; vague evidence is the only kind that survives a PASS-bias. Distilled from
obra/superpowers `verification-before-completion` (and reinforced by pm-skills'
"'It's probably handled upstream' is not evidence").

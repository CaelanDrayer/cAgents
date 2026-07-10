---
name: pat-evidence-first-execution
description: "Pattern: controllers require specific, verifiable evidence from execution agents (file paths, line numbers, test output, measured metrics) instead of vague claims like 'looks correct'."
license: MIT
compatibility: "Claude Code 2.x, cAgents 10.10.0+"
metadata:
  version: "1.0.0"
  author: cagents
  audience: "controllers, execution agents, reviewers"
  applies_to:
    - all-controllers
    - all-execution-agents
---

# Pattern: Evidence-First Execution (V10.10.0)

Controllers MUST require specific evidence from execution agents, not vague confirmations.

## Bad (vague)

```yaml
- criterion: "Auth is secure"
  evidence: "Reviewed auth code, looks good"
```

## Good (specific)

```yaml
- criterion: "Auth is secure"
  evidence: |
    - Password hashing: bcrypt with cost=12 at src/auth/hash.ts:15
    - Session tokens: 256-bit random via crypto.randomBytes at src/auth/session.ts:8
    - CSRF protection: double-submit cookie pattern at src/middleware/csrf.ts:22
    - Rate limiting: 5 attempts/15min window at src/auth/rate-limit.ts:30
```

## Execution agent response requirements

When controllers delegate questions, execution agents MUST respond with:

1. **Specific file paths and line numbers** (not "in the auth module")
2. **Actual code snippets** (not "it uses bcrypt")
3. **Measured metrics** (not "performance is good")
4. **Named failure modes** (not "it handles errors")

## Why this matters

Vague evidence creates phantom completions — work items that look done in coordination_log.yaml but have no actual verifiable artifact backing the claim. Hook-based recheck (e.g., `validator-evidence-recheck.cjs`) re-runs the cited verification methods (`fs.existsSync`, `grep`, `Bash` exec) and downgrades verdicts when claimed evidence does not actually verify. Specific evidence is the only kind a hook can verify; vague evidence is the only kind that survives a PASS-bias.

## Distrust the self-report

The executor's own account of its work is an unverified claim, not evidence. A `self_validation` YAML block, a `ponytail:` deliberate-shortcut marker, or a stated rationale like "kept it simple per YAGNI" or "validated elsewhere" should be checked against the actual diff — never taken at face value and never used to lower a finding's severity. If a claim cannot be located in the diff, that is a REVISE. See @.claude/rules/examples/ex-review-distrust-self-report.md.

## See also

- `.claude/rules/core/resources/execution-self-validation.md` — Check 5 (file:line accuracy) enforces this pattern at self-validation time
- `.claude/rules/quality/completion.md` — task completion protocol requiring evidence

---
paths:
  - ".claude/rules/playbooks/pat-evidence-first-execution.md"
  - ".claude/rules/quality/completion.md"
  - ".claude/rules/core/resources/execution-self-validation.md"
  - "agents/**"
  - ".claude/hooks/validator-evidence-recheck.cjs"
  - "cagents-memory/sessions/**/workflow/validation_report.yaml"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/outputs/**"
  - "tests/v12/playbook-extraction-cohesion.test.js"
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

## Mechanical claim-verification pass (D3 — advisory)

`validator-evidence-recheck.cjs` also runs an **additive, advisory** claim-verification pass over every `validation_report.yaml` it sees. It treats the whole report as a set of extractable claims and dispositions each one **mechanically — grep + `fs` + math only, no LLM and no network** — into one of four buckets:

| Disposition | Meaning | Counts toward |
|-------------|---------|---------------|
| `verified` | matches reality | pass |
| `failed` | contradicts reality | fail |
| `unsupported` | checkable-shaped but guarded/unreadable | neither |
| `unverifiable` | out of scope (runtime-only) | neither |

Claim types recognized: `pattern_count` ("N occurrences of X in FILE" → literal count in the cited file), `pattern_exists` / `pattern_absent` (grep boolean), `file_exists` (`fs.existsSync`), `code_snippet` (`FILE:LINE - snippet` → substring search in the cited file), and `arithmetic` (`N% of BASE = RESULT`, `A op B = C` → recompute).

Three guards keep the checker from producing its own false negatives:
- **prose-of-absence** — an absence claim ("no cache headers") with no explicit file citation → `unsupported` (absence needs evidence).
- **snippet_in_wrong_file** — a snippet absent from the cited file but present in a sibling / other cited file → `unsupported` (the claim is close; the file ref is wrong), not `failed`.
- **line-number-as-count** — `foo.ts:42`-style line refs are stripped/skipped when matching count claims so the line number is never read as a count.

The pass computes `passRate = verified / (verified + failed)` (with `checkable_claims = verified + failed`). When **`passRate < 0.8` AND `checkable_claims >= 2`**, it `console.error` a WARN and appends a `claim_verification:` block (pass_rate, per-claim dispositions, `top_failures`) to the report on disk.

This pass is **advisory-first**: it annotates and warns only. It does **not** change the report's `classification`, does **not** route back to PLANNED, and does **not** touch pipeline state (hard re-route is deferred). The existing PASS→FAIL evidence downgrade is untouched. See @docs/example-store/ex-verification-mechanical-claim-check.md for the claim taxonomy, guards, and the passRate gate this pass imports.

## Distrust the self-report

The executor's own account of its work is an unverified claim, not evidence. A `self_validation` YAML block, a `ponytail:` deliberate-shortcut marker, or a stated rationale like "kept it simple per YAGNI" or "validated elsewhere" should be checked against the actual diff — never taken at face value and never used to lower a finding's severity. If a claim cannot be located in the diff, that is a REVISE. See @docs/example-store/ex-review-distrust-self-report.md.

## See also

- `.claude/rules/core/resources/execution-self-validation.md` — Check 5 (file:line accuracy) enforces this pattern at self-validation time
- `.claude/rules/quality/completion.md` — task completion protocol requiring evidence

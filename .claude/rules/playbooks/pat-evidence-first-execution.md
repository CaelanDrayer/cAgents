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

Controllers MUST ask execution agents for specific evidence. A vague confirmation
is not acceptable.

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

When a controller delegates a question, the execution agent MUST answer with all
four of these:

1. **Specific file paths and line numbers.** "In the auth module" is not enough.
2. **Actual code snippets.** "It uses bcrypt" is not enough.
3. **Measured metrics.** "Performance is good" is not enough.
4. **Named failure modes.** "It handles errors" is not enough.

## Why this matters

Vague evidence creates phantom completions. A phantom completion is a work item
that looks done in coordination_log.yaml. No verifiable artifact backs the claim.

A hook-based recheck such as `validator-evidence-recheck.cjs` re-runs the cited
verification methods. Those methods are `fs.existsSync`, `grep`, and a `Bash`
command. The hook downgrades the verdict when the claimed evidence does not
verify.

Specific evidence is the only kind that a hook can check. Vague evidence is the
only kind that survives a PASS-bias.

## Mechanical claim-verification pass (D3, advisory)

`validator-evidence-recheck.cjs` also runs an **additive, advisory**
claim-verification pass. The pass covers every `validation_report.yaml` that the
hook sees. It treats the whole report as a set of claims that it can extract. It
then dispositions each claim into one of the four buckets below.

The pass works **mechanically**. It uses grep, the `fs` module, and arithmetic
only. It calls no LLM, and it uses no network.

| Disposition | Meaning | Counts toward |
|-------------|---------|---------------|
| `verified` | matches reality | pass |
| `failed` | contradicts reality | fail |
| `unsupported` | checkable-shaped, but guarded or unreadable | neither |
| `unverifiable` | out of scope, because it is runtime-only | neither |

The pass recognizes these claim types:

- `pattern_count`: "N occurrences of X in FILE". The pass counts the literal in
  the cited file.
- `pattern_exists` and `pattern_absent`: a grep boolean.
- `file_exists`: an `fs.existsSync` call.
- `code_snippet`: `FILE:LINE - snippet`. The pass does a substring search in the
  cited file.
- `arithmetic`: `N% of BASE = RESULT` or `A op B = C`. The pass recomputes the
  result.

Three guards keep the checker from producing its own false negatives:

- **prose-of-absence**: an absence claim such as "no cache headers", with no
  explicit file citation, gets `unsupported`. An absence needs evidence.
- **snippet_in_wrong_file**: a snippet that is absent from the cited file but
  present in a sibling file or in another cited file gets `unsupported`, not
  `failed`. The claim is close, and only the file reference is wrong.
- **line-number-as-count**: a line reference in the `foo.ts:42` shape is stripped
  before the pass matches a count claim. The line number is therefore never read
  as a count.

The pass computes `passRate = verified / (verified + failed)`. It also computes
`checkable_claims = verified + failed`. If **`passRate < 0.8` AND
`checkable_claims >= 2`**, the pass sends a WARN through `console.error`. It then
appends a `claim_verification:` block to the report on disk. That block holds
`pass_rate`, the disposition of each claim, and `top_failures`.

This pass is **advisory-first**: it annotates and warns only. It does **not**
change the `classification` of the report. It does **not** route the session back
to PLANNED. It does **not** touch pipeline state, because the hard re-route is
deferred. The PASS→FAIL evidence downgrade that already exists stays as it is.

See @docs/example-store/ex-verification-mechanical-claim-check.md for the claim
taxonomy, the guards, and the passRate gate that this pass imports.

## Distrust the self-report

The account that an executor gives of its own work is an unverified claim, not
evidence. Check each of these against the actual diff:

- a `self_validation` YAML block;
- a `ponytail:` deliberate-shortcut marker;
- a stated rationale such as "kept it simple per YAGNI" or "validated elsewhere".

Never take one of them at face value. Never use one of them to lower the severity
of a finding. If you cannot find a claim in the diff, that is a REVISE. See
@docs/example-store/ex-review-distrust-self-report.md.

## See also

- `.claude/rules/core/resources/execution-self-validation.md`: Check 5 covers
  file:line accuracy, and it enforces this pattern at self-validation time.
- `.claude/rules/quality/completion.md`: the task completion protocol, which
  needs evidence.

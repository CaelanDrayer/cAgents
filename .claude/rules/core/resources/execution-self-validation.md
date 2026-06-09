# Execution Agent Self-Validation Protocol

5 agent-self-reported checks (verifier hook deferred to a future bump) for execution agents before reporting DONE or DONE_WITH_CONCERNS status.

## Why 5 (Not 15) — Honesty Reduction (v12.0.0)

The previous version of this file defined fifteen checks grouped into five categories (Acceptance Criteria, Side Effects, Completeness, Evidence Freshness, Regression). Per the v12 trigger doc (`revamp-design-v2.md` Q8 "Validation honesty"), most of those 15 were aspirational — agents were asked to claim them in `self_validation` YAML but no hook ever verified the claims, and `post-write-validator.cjs` / `verify-completion.cjs` only had logic for a small subset. Aspirational checks are worse than honest absence: they create the appearance of rigor without the substance, and they inflate every agent's context.

The v12 contract drops to exactly 5 checks, all of which are *designed to be* mechanically verifiable by a hook. Each check ties to a concrete verification mechanism — timestamps, `fs.existsSync`, exit codes, `git status`, or `grep`/`sed` content checks — not to subjective judgment. **Important honesty note**: no hook currently runs these checks. The checks are agent-self-reported today; the verifier hook that would mechanically enforce them is deferred to a future bump. The "Planned hook verification:" lines below describe how a future hook *would* verify each check, not behavior that runs today. If a future check cannot be verified by a hook, it does not belong in this protocol; it belongs in reviewer/validator prose or a code-quality gate elsewhere.

## The 5 Checks (mechanically-checkable by design; verifier hook deferred)

### Check 1: Acceptance criteria evidence freshness

Every piece of evidence cited in the `self_validation` YAML was gathered AFTER implementation began. Planned hook verification (deferred — not enforced today): compare evidence-collection timestamp against the work item's `started_at` field; reject evidence with a timestamp earlier than the work item start.

- **Verification mechanism**: timestamp comparison (`evidence.collected_at >= work_item.started_at`)
- **Failure**: Report DONE_WITH_CONCERNS with `concerns: ["Stale evidence for criterion N (collected_at predates started_at)"]`

### Check 2: File existence claims

Every file path cited as "exists" or "created" in evidence actually exists on disk at the time of self-validation. Planned hook verification (deferred — not enforced today): for each `file_exists` claim, run `fs.existsSync(path)`; fail if any claimed file is missing.

- **Verification mechanism**: `fs.existsSync(absolute_path)`
- **Failure**: Report NEEDS_CONTEXT with `missing_context: ["Claimed file path does not exist: {path}"]` (the agent likely needs to re-run the create step)

### Check 3: Test/lint/typecheck exit codes

If any guard command (`npm test`, `npx vitest run`, `tsc --noEmit`, `npm run lint`, etc.) was run as part of this work item, its exit code is captured AND equals 0 (PASS). Planned hook verification (deferred — not enforced today): parse the recorded `guard_results[]` array; reject any entry with `exit_code != 0` or `exit_code: null` when a guard was claimed to run.

- **Verification mechanism**: exit-code check on recorded guard command results
- **Failure**: Report DONE_WITH_CONCERNS with `concerns: ["Guard command {cmd} failed with exit_code {N}"]`

### Check 4: Git working-tree state

The staged/unstaged status reported in `git_state` matches the actual `git status --porcelain` output at the time of self-validation. Planned hook verification (deferred — not enforced today): re-run `git status --porcelain` and compare against the agent's reported `files_changed`/`files_staged` lists.

- **Verification mechanism**: `git status --porcelain` diff against reported state
- **Failure**: Report DONE_WITH_CONCERNS with `concerns: ["Git state mismatch: reported {X} but actual is {Y}"]`

### Check 5: Referenced file:line accuracy

Every "src/foo.ts:42" style citation in evidence actually points to the content the agent claims is there. Planned hook verification (deferred — not enforced today): for each `file:line` evidence entry with a `claimed_content` substring, run `sed -n '{line}p' {file}` (or equivalent) and verify the claimed substring appears in the actual line.

- **Verification mechanism**: `sed -n '{N}p' {file}` content match against `claimed_content`
- **Failure**: Report DONE_WITH_CONCERNS with `concerns: ["File:line citation incorrect: {file}:{line} does not contain {claimed_content}"]`

---

## Self-Validation YAML Template

Before reporting DONE or DONE_WITH_CONCERNS, fill this template:

```yaml
self_validation:
  schema_version: "2"   # bumped from "1" (15-check) to "2" (5-check) at v12.0.0

  # Check 1: Acceptance criteria evidence freshness
  evidence_freshness:
    work_item_started_at: "2026-05-20T08:00:00Z"
    evidence:
      - criterion: "{exact text of criterion 1}"
        citation: "src/foo.ts:42"
        collected_at: "2026-05-20T08:15:00Z"
        fresh: true   # collected_at >= work_item_started_at
      - criterion: "{exact text of criterion 2}"
        citation: "npm test output"
        collected_at: "2026-05-20T08:30:00Z"
        fresh: true

  # Check 2: File existence claims
  file_existence:
    files_claimed_to_exist:
      - path: "src/foo.ts"
        exists: true   # verified via fs.existsSync at self-validation time
      - path: "tests/foo.test.js"
        exists: true
    missing_files: []   # if any file_existence entry has exists: false, list here

  # Check 3: Test/lint/typecheck exit codes
  guard_results:
    - name: "npm test"
      command: "npx vitest run tests/v12/validation-honesty-contract.test.js --no-coverage"
      exit_code: 0
      ran_at: "2026-05-20T08:25:00Z"
      output_excerpt: "Tests  4 passed (4)"
    # If no guards were run for this work item, leave list empty:
    # guard_results: []

  # Check 4: Git working-tree state
  git_state:
    branch: "revamp/v12-rc"
    files_staged: []   # files agent staged via `git add` (lead commits, so usually empty)
    files_modified:    # `git status --porcelain` modified lines
      - ".claude/rules/core/resources/execution-self-validation.md"
      - ".claude/rules/quality/completion.md"
      - ".claude/rules/core/controllers.md"
    files_created:
      - "tests/v12/validation-honesty-contract.test.js"
    matches_actual: true   # re-verified at self-validation time

  # Check 5: Referenced file:line accuracy
  file_line_citations:
    - citation: "src/foo.ts:42"
      claimed_content: "validateToken("
      verified: true   # sed -n '42p' src/foo.ts contained "validateToken("
    # All file:line entries from evidence must appear here with verified: true

  # Summary
  checks_passed: 5
  checks_failed: 0
  checks_total: 5
  auto_downgrade: false   # true if ANY 1 of the 5 checks failed
```

---

## Integration with Subagent Status Protocol

Include `self_validation` in your completion response:

```yaml
status: DONE                    # One of: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
summary: "Implemented JWT auth middleware with bcrypt hashing"
evidence:
  - criterion: "Auth middleware validates tokens"
    result: "src/middleware/auth.ts:15 - validateToken() checks expiry, signature, and issuer"
  - criterion: "Tests pass"
    result: "npx vitest run: 23/23 passed"
concerns: []                    # For DONE_WITH_CONCERNS: list specific concerns
missing_context: []             # For NEEDS_CONTEXT: list what is needed
blocker: null                   # For BLOCKED: describe the blocking factor
self_validation:                # REQUIRED for DONE and DONE_WITH_CONCERNS
  schema_version: "2"
  checks_passed: 5
  checks_failed: 0
  checks_total: 5
  auto_downgrade: false
  evidence_freshness: {...}
  file_existence: {...}
  guard_results: [...]
  git_state: {...}
  file_line_citations: [...]
```

---

## Auto-Downgrade Rule

**Any 1 of the 5 checks failing -> DONE becomes DONE_WITH_CONCERNS.**

There is no graded scale — the v12 contract is binary per check. The previous "1-3 vs 4+ failures" matrix was a workaround for the 15-check protocol's noise floor; with 5 honest checks, every failure is material.

| Condition | Status Change |
|-----------|---------------|
| All 5 checks pass (`checks_failed == 0`) | Keep DONE as-is |
| Any 1 of the 5 checks failing | DONE -> DONE_WITH_CONCERNS, list failed check(s) in `concerns[]` |
| `file_existence.missing_files` non-empty | DONE -> NEEDS_CONTEXT, list missing files in `missing_context[]` (the agent likely needs to re-run the create step) |
| `guard_results[]` has any `exit_code != 0` | DONE -> DONE_WITH_CONCERNS, list failing guard in `concerns[]` |

---

## When to Skip Self-Validation

The 5 checks are minimal enough that skipping is rarely justified, but these narrow exceptions apply:

- **Check 3 (guard exit codes)**: skippable when the work item type genuinely has no guard (e.g., pure documentation work with no link-check, design artifacts with no validation tool). Record `guard_results: []` explicitly — don't omit the field.
- **Check 5 (file:line accuracy)**: skippable when evidence contains no `file:line` citations (e.g., evidence is entirely command output). Record `file_line_citations: []` explicitly.

**Checks 1, 2, and 4 (evidence freshness, file existence, git state) are NEVER skippable.** These are the mechanically-checkable core of the v12 honesty contract (the core a future verifier hook would enforce first).

---
paths:
  - ".claude/rules/core/resources/execution-self-validation.md"
  - ".claude/rules/core/execution.md"
  - ".claude/rules/quality/completion.md"
  - ".claude/rules/playbooks/pat-subagent-status-protocol.md"
  - "agents/**"
  - ".claude/skills/act/**"
  - ".claude/skills/team/**"
  - ".claude/hooks/verify-completion.cjs"
  - "cagents-memory/sessions/**/workflow/work_items.yaml"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "cagents-memory/sessions/**/outputs/**"
  - "tests/hooks/self-validation-recheck.test.js"
  - "tests/v12/validation-honesty-contract.test.js"
---

# Execution Agent Self-Validation Protocol

This file defines 5 checks that an execution agent reports about its own work.
The verifier hook is deferred to a future bump. Run these 5 checks before you
report DONE status or DONE_WITH_CONCERNS status.

## Why 5 Checks and Not 15: Honesty Reduction (v12.0.0)

The earlier version of this file defined fifteen checks in five groups. The
groups were Acceptance Criteria, Side Effects, Completeness, Evidence
Freshness, and Regression. The v12 trigger doc is `revamp-design-v2.md` Q8
"Validation honesty". It found that most of those 15 checks were aspirational.
Agents had to claim each check in the `self_validation` YAML, but no hook ever
checked the claims. `post-write-validator.cjs` and `verify-completion.cjs` held
logic for a small subset only. An aspirational check is worse than an honest
absence. It gives the appearance of rigor without the substance, and it
inflates the context of every agent.

The v12 contract drops to exactly 5 checks. A hook can verify each one
mechanically. Each check ties to a concrete verification mechanism, not to a
subjective judgment. The mechanisms are timestamps, `fs.existsSync`, exit
codes, `git status`, and content checks with `grep` or `sed`.

**Important honesty note**: The C1 advisory-first bump changed two of the
checks. `verify-completion.cjs` now WARN-rechecks **Check 2 (file existence)
and Check 3 (guard exit codes)** at Stop. The recheck is advisory only. It runs
`fs.existsSync` again on each path that an agent claims to exist, and it reads
each recorded `guard_results[].exit_code`. It then logs every mismatch to
stderr and writes `workflow/self_validation_recheck.yaml`. It **warns, and it
does not block**. The decision of the Stop hook stays byte-identical when the
recheck finds a mismatch, and when it finds none.

Checks 1, 4, and 5 stay agent-self-reported. Their "Planned hook verification:"
lines tell you how a future hook *would* verify them. They do not describe
behavior that runs today. Check 5 has one partial exception:
`validator-evidence-recheck.cjs` rechecks its file:line citations after a
write. See the ledger in execution.md. If a hook cannot verify a future check,
that check does not belong in this protocol. Put it in reviewer prose, in
validator prose, or in a code-quality gate elsewhere.

## The 5 Checks (Stop WARN-rechecks Check 2 and Check 3; the verifier hook for Checks 1, 4, and 5 is deferred)

### Check 1: Acceptance criteria evidence freshness

The agent gathered every piece of evidence in the `self_validation` YAML after
the implementation began. Planned hook verification, deferred and not enforced
today: Compare the timestamp of the evidence collection against the
`started_at` field of the work item. Reject any evidence with a timestamp
earlier than the start of the work item.

- **Verification mechanism**: timestamp comparison
  (`evidence.collected_at >= work_item.started_at`)
- **Failure**: Report DONE_WITH_CONCERNS with
  `concerns: ["Stale evidence for criterion N (collected_at predates started_at)"]`

### Check 2: File existence claims

Every file path that the evidence cites as "exists" or as "created" is on disk
at the time of the self-validation. **Hook verification (WARN-rechecked at
Stop, advisory since C1)**: `verify-completion.cjs` gathers each
`file_existence.files_claimed_to_exist[].path` from
`workflow/coordination_log.yaml` under
`implementation_tasks[].self_validation`, and from any
`outputs/**/self-validation.yaml`. It then runs `fs.existsSync` on each path,
against the session dir and against the project root. It logs a missing path to
stderr and appends that path to `workflow/self_validation_recheck.yaml` as a
`file_missing` mismatch. This recheck **warns only. It never blocks**, and it
never changes the decision of the Stop hook.

- **Verification mechanism**: `fs.existsSync(absolute_path)`.
  `verify-completion.cjs` now runs this check mechanically at Stop (WARN,
  non-blocking).
- **Failure**: Report NEEDS_CONTEXT with
  `missing_context: ["Claimed file path does not exist: {path}"]`. The agent
  then needs to run the create step again. The recheck at Stop also records the
  mismatch in `workflow/self_validation_recheck.yaml`.

### Check 3: Test/lint/typecheck exit codes

A guard command is a command such as `npm test`, `npx vitest run`,
`tsc --noEmit`, or `npm run lint`. If this work item ran a guard command, the
agent captured its exit code, and that exit code equals 0 (PASS). **Hook
verification (WARN-rechecked at Stop, advisory since C1)**:
`verify-completion.cjs` parses each recorded `guard_results[]` entry from the
same sources as Check 2. An entry with `exit_code != 0` is a
`guard_nonzero_exit` mismatch. A claimed guard with a missing `exit_code`, or
with a `null` `exit_code`, is a `guard_missing_exit_code` mismatch. The hook
logs each mismatch to stderr and appends it to
`workflow/self_validation_recheck.yaml`. This recheck **warns only. It never
blocks**, and it never changes the decision of the Stop hook.

- **Verification mechanism**: exit-code check on the recorded results of the
  guard command. `verify-completion.cjs` now runs this check mechanically at
  Stop (WARN, non-blocking).
- **Failure**: Report DONE_WITH_CONCERNS with
  `concerns: ["Guard command {cmd} failed with exit_code {N}"]`. The recheck at
  Stop also records the mismatch in `workflow/self_validation_recheck.yaml`.

### Check 4: Git working-tree state

The staged status and the unstaged status in `git_state` match the real output
of `git status --porcelain` at the time of the self-validation. Planned hook
verification, deferred and not enforced today: Run `git status --porcelain`
again. Then compare the output against the `files_changed` list and the
`files_staged` list that the agent reported.

- **Verification mechanism**: `git status --porcelain` diff against the
  reported state
- **Failure**: Report DONE_WITH_CONCERNS with
  `concerns: ["Git state mismatch: reported {X} but actual is {Y}"]`

### Check 5: Referenced file:line accuracy

Every citation in the evidence with the "src/foo.ts:42" shape points to the
content that the agent claims. Planned hook verification, deferred and not
enforced today: For each `file:line` evidence entry that carries a
`claimed_content` substring, run `sed -n '{line}p' {file}`. Then make sure that
the claimed substring is in that line.

- **Verification mechanism**: `sed -n '{N}p' {file}` content match against
  `claimed_content`
- **Failure**: Report DONE_WITH_CONCERNS with
  `concerns: ["File:line citation incorrect: {file}:{line} does not contain {claimed_content}"]`

---

## Self-Validation YAML Template

Before you report DONE or DONE_WITH_CONCERNS, fill in this template:

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
  auto_downgrade: false   # true if any 1 of the 5 checks failed
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
self_validation:                # Required for DONE and DONE_WITH_CONCERNS
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

There is no graded scale. The v12 contract is binary for each check. The
earlier "1-3 vs 4+ failures" matrix worked around the noise floor of the
15-check protocol. With 5 honest checks, every failure is material.

| Condition | Status Change |
|-----------|---------------|
| All 5 checks pass (`checks_failed == 0`) | Keep DONE as-is |
| Any 1 of the 5 checks failing | DONE -> DONE_WITH_CONCERNS, list failed check(s) in `concerns[]` |
| `file_existence.missing_files` non-empty | DONE -> NEEDS_CONTEXT, list missing files in `missing_context[]` (the agent then needs to run the create step again) |
| `guard_results[]` has any `exit_code != 0` | DONE -> DONE_WITH_CONCERNS, list failing guard in `concerns[]` |

---

## When to Skip Self-Validation

The 5 checks are small, so a skip is rarely correct. These narrow exceptions
apply:

- **Check 3 (guard exit codes)**: You can skip this check when the type of the
  work item has no guard at all. Pure documentation work with no link check is
  one example. A design artifact with no validation tool is another. Record
  `guard_results: []` explicitly. Do not omit the field.
- **Check 5 (file:line accuracy)**: You can skip this check when the evidence
  holds no `file:line` citation, for example when the evidence is command
  output only. Record `file_line_citations: []` explicitly.

**You can never skip Check 1, Check 2, or Check 4.** They cover evidence
freshness, file existence, and git state. They are the mechanically checkable
core of the v12 honesty contract. A future verifier hook would enforce that
core first.

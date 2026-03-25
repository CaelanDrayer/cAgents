# Execution Agent Self-Validation Protocol

15-check self-validation checklist for execution agents before reporting DONE or DONE_WITH_CONCERNS status.

## The 15 Checks

### Category 1: Acceptance Criteria (3 checks)

**Check 1**: Every acceptance criterion has cited evidence
- List each criterion + evidence
- Failure: Report DONE_WITH_CONCERNS with "missing evidence for criterion N"

**Check 2**: Evidence cites specific file:line or command output
- Check format: "src/auth.ts:15 - validateToken()" not "auth module works"
- Failure: Report DONE_WITH_CONCERNS if any evidence is vague (generic phrases like "looks correct", "seems fine")

**Check 3**: Evidence was gathered AFTER implementation (fresh)
- Evidence should reference current session outputs, not pre-implementation files
- Failure: Report DONE_WITH_CONCERNS if evidence is stale or predates implementation

### Category 2: Side Effects (3 checks)

**Check 4**: No files modified outside stated scope
- Compare modified files vs. work item description
- Failure: Report DONE_WITH_CONCERNS if out-of-scope files changed

**Check 5**: No broken imports/references introduced
- Run: `node -e "require('./index')"` or equivalent language import check
- Failure: Report DONE_WITH_CONCERNS if imports are broken

**Check 6**: No test regressions introduced by changes
- Run test suite if available (npm test, pytest, etc.)
- Failure: Report DONE_WITH_CONCERNS if new test failures found

### Category 3: Completeness (3 checks)

**Check 7**: All files mentioned in acceptance criteria exist on disk
- Use `ls` or `stat` to verify each claimed output file
- Failure: Report NEEDS_CONTEXT with "Expected output files missing: {list}"

**Check 8**: All code changes compile or parse cleanly
- Run: `tsc --noEmit` (TypeScript), `python -m py_compile` (Python), or syntax check for other languages
- Failure: Report DONE_WITH_CONCERNS if compilation errors exist

**Check 9**: No TODO/FIXME/HACK markers in newly added code
- Run: `grep -n "TODO\|FIXME\|HACK" {modified_files}`
- Failure: Report DONE_WITH_CONCERNS if markers found (these indicate incomplete work)

### Category 4: Evidence Freshness (3 checks)

**Check 10**: All evidence gathered AFTER implementation started
- Cross-reference evidence timestamps with implementation order
- Example: If implementation started at 10:00, all evidence must be >= 10:00
- Failure: Report DONE_WITH_CONCERNS if evidence predates changes

**Check 11**: Test outputs are from the current session
- Verify test output includes current-session file paths or timestamps
- Not acceptable: "tests passed earlier" or recycled output from prior context
- Failure: Report DONE_WITH_CONCERNS if test output is recycled

**Check 12**: File paths cited actually contain the claimed content
- Re-read each cited file:line to verify content matches claim
- Example: If claiming "src/auth.ts:15 has bcrypt.hash()", actually read line 15
- Failure: Report DONE_WITH_CONCERNS if content doesn't match claim

### Category 5: Regression (3 checks)

**Check 13**: Existing tests still pass after changes
- Run full test suite (`npm test`, `pytest`, etc.)
- Failure: Report DONE_WITH_CONCERNS if pre-existing tests now fail

**Check 14**: No new linting errors introduced
- Run linter on modified files (`npm run lint`, `ruff check`, etc.)
- Failure: Report DONE_WITH_CONCERNS if new lint errors found

**Check 15**: Type checking passes if applicable
- Run: `tsc --noEmit` or equivalent for your language
- Failure: Report DONE_WITH_CONCERNS if new type errors detected

---

## Self-Validation YAML Template

Before reporting DONE or DONE_WITH_CONCERNS, fill this template:

```yaml
self_validation:
  # Category 1: Acceptance Criteria
  acceptance_criteria_check:
    - criterion: "{exact text of criterion 1}"
      evidence: "{file:line or command output}"
      fresh: true              # Gathered AFTER implementation?
      evidence_valid: true     # Cited location contains claimed content?
    - criterion: "{exact text of criterion 2}"
      evidence: "{file:line or command output}"
      fresh: true
      evidence_valid: true
    # ... one entry per acceptance criterion

  # Category 2: Side Effects
  side_effect_check:
    unintended_modifications: []    # Any unexpected files changed?
    broken_imports: false           # Are any imports now broken?
    test_regressions: false         # Any previously-passing tests now fail?
    out_of_scope_changes: []        # Files changed outside stated scope?

  # Category 3: Completeness
  completeness_check:
    all_files_exist: true           # All claimed output files on disk?
    code_compiles: true             # No compilation/parse errors?
    no_todo_markers: true           # No TODO/FIXME/HACK in new code?
    missing_files: []               # List if all_files_exist: false

  # Category 4: Evidence Freshness
  evidence_freshness:
    all_post_implementation: true   # All evidence after implementation?
    session_current: true           # Evidence from current session?
    file_contents_verified: true    # Each cited file:line verified?
    stale_evidence: []              # List stale items if any

  # Category 5: Regression
  regression_check:
    tests_pass: true                # All tests pass?
    no_new_lint_errors: true        # No new linting errors?
    type_check_pass: true           # Type checking passes?
    test_output: "{actual test command output}"

  # Summary
  checks_passed: 15
  checks_failed: 0
  checks_total: 15
  auto_downgrade: false   # true if DONE should become DONE_WITH_CONCERNS due to failures
```

---

## Integration with Subagent Status Protocol

Include self_validation in your completion response:

```yaml
status: DONE                    # One of: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED
summary: "Implemented JWT auth middleware with bcrypt hashing"
evidence:
  - criterion: "Auth middleware validates tokens"
    result: "src/middleware/auth.ts:15 - validateToken() checks expiry, signature, and issuer"
  - criterion: "Tests pass"
    result: "npm test: 23/23 passed"
concerns: []                    # For DONE_WITH_CONCERNS: list specific concerns
missing_context: []             # For NEEDS_CONTEXT: list what is needed
blocker: null                   # For BLOCKED: describe the blocking factor
self_validation:                # REQUIRED for DONE and DONE_WITH_CONCERNS
  checks_passed: 15
  checks_failed: 0
  checks_total: 15
  auto_downgrade: false
  acceptance_criteria_check: [...]
  side_effect_check: {...}
  completeness_check: {...}
  evidence_freshness: {...}
  regression_check: {...}
```

---

## Auto-Downgrade Rules

| Condition | Status Change |
|-----------|---------------|
| checks_failed == 0 | Keep DONE as-is |
| 1-3 checks failed (Category 3/4 only) | DONE → DONE_WITH_CONCERNS, list failed checks |
| checks_failed >= 4 OR any Category 1/2/5 failure | DONE → DONE_WITH_CONCERNS, list all failures |
| acceptance_criteria_check has evidence_valid: false | DONE → DONE_WITH_CONCERNS: "Evidence verification failed" |
| completeness_check.all_files_exist: false | DONE → NEEDS_CONTEXT: "Expected output files missing: {list}" |
| regression_check.tests_pass: false | DONE → DONE_WITH_CONCERNS: "Test regressions detected" |

---

## When to Skip Self-Validation

Checks 5, 6, 8, 13, 14, 15 (test/compile/lint checks) MAY be skipped with documented justification ONLY if:
- No test suite exists (new project with zero tests)
- Work item type is pure documentation (no code changes)
- Work item type is design artifact only

**Checks 1, 2, 3, 7, 10, 12 (evidence and completeness) are NEVER skippable.**

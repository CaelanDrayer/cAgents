---
paths:
  - "core/universal-validator/**"
  - "core/universal-planner/**"
  - ".claude/skills/run/**"
  - "cagents-memory/sessions/**/workflow/**"
---

# Task Completion Protocol

**MANDATORY**: All tasks must be fully completed with verified evidence before marking as done.

## Core Rule

**100% completion with verified evidence, or it's not complete.**

See `validation-framework.md` for the full traceability chain from planning to validation.

## The Completion Chain

```
Planning Phase:
  ├── Work items have acceptance_criteria
  ├── Criteria have verification_method
  └── Objectives have derived_from (links to work items)

Coordination Phase:
  ├── Controllers track work_item_status
  ├── Evidence captured per criterion
  └── completed_at/completed_by recorded

Validation Phase:
  ├── Verify each criterion using verification_method
  ├── Check evidence chain exists
  └── Confirm all derived_from work items complete
```

## Enforcement Points

### Decomposer/Planner
- Every work item MUST have `acceptance_criteria`
- Every criterion MUST have `verification_method`
- Every objective MUST link to `derived_from` work items

### Controllers
- Track `work_item_status` in coordination_log.yaml
- Capture `evidence` for each completed criterion (file paths, test results, metrics)
- Mark `completed_at` and `completed_by` for every item
- No partial completion - 100% with evidence or in_progress

### Universal-Executor
- Verifies coordination_log completeness before phase transition
- Checks all work items have `status: completed`
- Validates evidence exists for each criterion

### Universal-Validator
- Verifies each objective's success criteria
- Checks evidence chain (criterion → evidence → source)
- Confirms all derived_from work items are complete
- Classifies: PASS (all verified), FIXABLE (evidence missing), BLOCKED (work incomplete)

### Orchestrator
- Validates coordination_log exists and is complete
- Checks phase transitions have evidence
- Ensures no phase skipped

## Evidence Requirements

### Good Evidence (Specific, Verifiable)
```yaml
- criterion: "User model has password_hash"
  evidence: "src/models/user.ts:15 - password_hash: string"
  verification: file_contains

- criterion: "Tests pass"
  evidence: "pytest: 45/45 passed (0.8s)"
  verification: test_result

- criterion: "Bundle size reduced"
  evidence: "2.8MB → 1.8MB (-36%)"
  verification: metric_check
```

### Bad Evidence (Vague, Unverifiable)
```yaml
- "Tests probably pass"
- "File mostly done"
- "Should be faster now"
- "I think it works"
```

## Verification Methods

| Type | How Validator Checks | Example |
|------|---------------------|---------|
| `file_exists` | Check file at path | `migrations/20260122_auth.sql` |
| `file_contains` | Grep for pattern | `password_hash in user.ts` |
| `test_result` | Run test suite | `pytest auth/ - PASS` |
| `scan_result` | Run scan tool | `npm audit - 0 critical` |
| `metric_check` | Compare metric | `coverage: 85% > 80%` |
| `output_exists` | Check output file | `outputs/design.md exists` |
| `manual_review` | HITL verification | Tier 4 approval gate |

## Context Overhead

Add 3K tokens per coordination cycle for evidence tracking (included in planning budget).

## Quick Reference

**At Planning:**
- [ ] Work items have acceptance_criteria
- [ ] Criteria have verification_method
- [ ] Objectives link to derived_from work items

**At Coordination:**
- [ ] work_item_status tracked in coordination_log
- [ ] Evidence captured for each criterion
- [ ] completed_at/completed_by recorded

**At Validation:**
- [ ] Every criterion verified using its method
- [ ] Evidence chain confirmed
- [ ] All derived_from work items complete

**At Session End (Task Cleanup):**
- [ ] All TaskCreate tasks marked completed or deleted via TaskUpdate
- [ ] No stale in_progress tasks left behind
- [ ] TaskList returns no orphaned tasks from this session

## Red Flags: Language Patterns That Indicate Premature Claims

When reviewing completion claims, watch for these language patterns that indicate an agent is claiming completion without sufficient evidence:

| Red Flag Phrase | What It Really Means | Required Instead |
|----------------|----------------------|------------------|
| "should work" | Not verified | Run the verification command and show output |
| "probably" | Not checked | Check definitively and report the result |
| "seems to" | Superficial check | Deep verification with specific evidence |
| "mostly done" | Incomplete | 100% with evidence, or mark as in_progress |
| "I think it works" | Not tested | Run tests, show pass/fail output |
| "looks correct" | Visual scan only | Automated verification (tests, lint, type check) |
| "I believe" | Opinion, not evidence | Cite specific file:line, test output, or metric |
| "as expected" | Assumed, not verified | Show the actual vs expected comparison |
| "no issues found" | Passive non-discovery | Describe what was actively checked and how |
| "should be fine" | Wishful thinking | Provide concrete verification evidence |

**Rule**: If a completion claim contains ANY red flag phrase without accompanying concrete evidence, it MUST be rejected. The agent must re-verify and provide specific evidence.

## Rationalization Counters

Common rationalizations agents use to skip verification rigor, mapped to reality checks:

| Rationalization | Reality Check |
|----------------|---------------|
| "The change is too small to need verification" | Small changes in critical paths cause large failures. Always verify. |
| "I already tested this earlier in the session" | Earlier test results may be stale. Run verification NOW. |
| "The linter/compiler would have caught any issues" | Linters catch syntax, not logic. Run behavioral tests. |
| "This is just a documentation change" | Documentation with incorrect examples misleads users. Verify examples work. |
| "The tests were passing before my change" | Your change may have introduced a regression. Run tests AFTER your change. |
| "I reviewed the code carefully" | Code review catches ~60% of bugs. Automated tests catch the rest. Run both. |
| "This pattern is well-established" | Even established patterns can be misapplied. Verify the specific instance. |
| "It's the same approach used elsewhere" | Same approach in different context may behave differently. Verify in context. |
| "I'll add the test in a follow-up" | Tests written later are tests forgotten. Write the test NOW. |
| "The acceptance criteria are subjective" | Request clarification, don't skip verification. Vague criteria = ask, don't assume. |

## Fresh Evidence Requirement

**IRON LAW: Verification commands MUST be run in the current session, not cited from memory.**

Verification evidence is only valid if:
1. **Executed fresh**: The verification command was run AFTER the implementation was complete, in this session
2. **Output captured**: The actual command output is included in the evidence (not paraphrased)
3. **Timestamp-adjacent**: The verification happened within the same work sequence as the implementation
4. **Full output read**: The ENTIRE output was read, not just the first/last line

**Invalid evidence patterns**:
- "Tests were passing earlier" (stale -- run them again NOW)
- "I ran the tests and they passed" (no output shown -- include the output)
- "The file exists at path X" (use `file_exists` verification -- actually check)
- Citing test results from a previous session or context window
- Paraphrasing output instead of including the actual output

**Enforcement**: The universal-validator MUST reject completion claims that lack fresh evidence. When reviewing validation_report.yaml, check that evidence includes actual command output from the current session, not references to prior runs.

## Comprehensive Validation Checklists (V10.23.0)

Four-phase validation covering 29 checks across the entire workflow lifecycle:
- **Pre-Execution** (8 checks by controller): Plan completeness, work item criteria, dependency acyclicity, agent existence, referenced files, log schema, session directory, delegation prompt quality
- **Mid-Execution** (7 checks by controller after every 3 completions): Evidence capture, stuck item detection, timestamp monotonicity, evidence spot-check, dependency satisfaction, review round budget, subagent status protocol
- **Post-Execution** (9 checks by validator): All items complete, evidence chain, objective traceability, success criteria, log completeness, no red flag language, fresh evidence, guard command results, dead letter accounting
- **Cross-Cutting** (5 checks across agents): Task cleanup, agent tree completeness, file change audit, context drift prevention, YAML/JSON syntax

See @resources/validation-checklist-29.md for full details, failure actions, and run-by assignments per check.

## Protocol Location

`cagents-memory/_system/task_completion_protocol.yaml`

---

## See Also

- **validation-framework.md** - Full traceability chain from planning to validation
- **controllers.md** - Controller coordination and evidence capture
- **orchestration.md** - Phase transitions and workflow management
- **implicit-discovery.md** - Handling abstract requests

---

**Part of**: cAgents Completion Validation Framework

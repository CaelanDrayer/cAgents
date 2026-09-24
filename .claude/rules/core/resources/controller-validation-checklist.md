---
paths:
  - ".claude/rules/core/resources/controller-validation-checklist.md"
  - ".claude/rules/core/controllers.md"
  - ".claude/rules/playbooks/pat-gate-taxonomy.md"
  - "agents/**"
  - ".claude/skills/**"
  - "cagents-memory/sessions/**/workflow/plan.yaml"
  - "cagents-memory/sessions/**/workflow/work_items.yaml"
  - "cagents-memory/sessions/**/workflow/coordination_log.yaml"
  - "scripts/ci/validate-planner-output.cjs"
  - "tests/v12/planner-output-schema.test.js"
---

# Controller Validation Checklist Reference

This file gives the detailed specification of each pre-execution check and each
mid-execution check that a controller runs.

## Pre-Execution Validation Checklist (7 checks)

Run these checks before you spawn any execution agent.

### Check 0: Planner Output Schema

**What**: The planner emits `workflow/plan.yaml` and
`workflow/work_items.yaml`. Before any other check runs, make sure that both
files parse and that both files satisfy the minimum schema. If the planner
output is malformed, every downstream check works on garbage, so Check 0 fails
fast.

**Tool**:
`scripts/ci/validate-planner-output.cjs --plan <plan.yaml> --work-items <work_items.yaml>`
(added in LP-28, v12.7.x).

**Schema contract**: The contract is intentionally minimal. The broader
semantic checks are in Checks 1 to 6.

- `plan.yaml` must contain: `plan_id` (string), `tier` (2|3|4), `domain`
  (string), `mission` (string), `objectives[]` with `{id, description}`,
  `controller_assignment.primary` (string), `success_criteria[]` (at plan root
  OR on every objective).
- `work_items.yaml` must contain `work_items[]` (or legacy `items[]`) where
  every entry has `{id, title, assigned_to, acceptance_criteria}` and
  `acceptance_criteria` is a non-empty list of strings (or
  `{criterion: string}` objects).

**On failure**: BLOCKED. The validator exits 1. The controller must request a
planner re-run. Do not continue to Check 1. Stderr holds the specific schema
violation, for example
`plan.yaml: missing or empty controller_assignment.primary`.

**Why Check 0 and not Check 7**: Check 0 is a structural pre-flight. Checks 1
to 6 assume that the YAML is well formed and that the canonical fields exist.
Check 0 makes that assumption explicit.

### Check 1: Plan Completeness

**What**: Make sure that `workflow/plan.yaml` has every required field.

**Required fields**:
- plan_id (non-empty string)
- tier (2, 3, or 4)
- domain
  (engineering|creative|business|growth|people|service|shared|leadership)
- mission (string, len > 10, not placeholder)
- objectives (array, len >= 1, each has id + description)
- controller_assignment (object with "primary" field = cagents:{name})
- success_criteria (array, len >= 1)

**On failure**: BLOCKED. Report: "plan.yaml missing required field: {field}.
Cannot coordinate without a complete plan."

### Check 2: Work Items Acceptance Criteria

**What**: Every entry in work_items.yaml has specific acceptance criteria, and
the list is not empty.

**Requirements**:
- Every item has: id, title, assigned_to, acceptance_criteria
- acceptance_criteria is array (len >= 1)
- Each criterion is string (len > 5)
- No vague placeholders: "TBD", "TODO", "pending", "TBD later"

**On failure**: BLOCKED. Report: "Work item {WI-N} has no/empty
acceptance_criteria. Request re-decomposition."

### Check 3: Dependency Acyclicity

**What**: The dependency graph of the work items holds no circular dependency.

**Algorithm**: Topological sort (Kahn's algorithm) or DFS cycle detection on
dependencies[] fields.

**On failure**: BLOCKED. Report: "Circular dependency detected: {WI-A} ->
{WI-B} -> {WI-A}. Fix the dependency graph."

### Check 4: Agent Existence

**What**: For every unique `assigned_to` agent in work_items, make sure that a
SKILL.md file exists.

**Check**: File exists at one of:
- `{domain}/agents/{agent-name}/SKILL.md`
- `{domain}/agents/{agent-name}.md`

**Example paths**:
- developer/backend/backend-developer/SKILL.md
- core/reviewer/SKILL.md
- writer/copywriter/SKILL.md

**On failure**: WARN. Report: "Agent cagents:{name} SKILL.md not found. Will
attempt spawn but may fail."

### Check 5: Referenced Files Existence

**What**: A work item description references a file. That file should exist
before execution starts.

**Pattern**: A work item description that holds a phrase such as "Edit {path}",
"Read {path}", or "Modify {path}".

**Check**: `fs.existsSync(path) == true` for each extracted file path.

**On failure**: WARN. Report: "Work item {WI-N} references non-existent file:
{path}. The executor may fail."

### Check 6: Coordination Log Schema Pre-Validation

**What**: The planned structure of coordination_log.yaml has every required
field before the controller writes the file.

**Required fields to populate**:
- schema_version: "1"
- controller: "cagents:{name}"
- objectives: array from plan.yaml
- status: "completed"
- implementation_tasks: array with task_id, assigned_to, status, review_result

**On failure**: AUTO-FIX. Add the missing fields before the write. If a field
cannot be computed, set `status: partial`.

---

## Mid-Execution Validation Checklist (5 checks)

The controller runs these checks after every 3 completed work items, or immediately when the last vertical-slice-tagged item completes, whichever comes first. An item counts as completed only after its bounded reviewer loop resolves, not merely after its executor pass finishes.

### Checkpoint 1: Evidence Capture Verification

**What**: Every completed work item has evidence, and that evidence is neither
null nor empty.

**Check**:
```
For each implementation_tasks entry where status == "completed":
  - evidence field exists
  - evidence is non-empty string
  - evidence is not placeholder text ("TBD", "TODO", "pending")
```

**On failure**: WARN. Report: "Work item {WI-N} completed with empty evidence.
Request re-verification from agent."

### Checkpoint 2: Stuck Item Detection

**What**: No work item stays in_progress for more than 10 minutes.

**Check**: For each in_progress item:
`(now - started_at_timestamp) < 10 minutes`

**On failure**: ESCALATE. Report: "Work item {WI-N} was in_progress for {N}
minutes. Consider re-spawning."

### Checkpoint 3: Progress Timestamp Monotonicity

**What**: For sequential work items, each completed timestamp is later than the
timestamp before it.

**Check**: `completed_at[i+1] >= completed_at[i]` for sequential items.

**On failure**: WARN. Report: "Timestamp ordering anomaly detected. Possible
clock skew or fabricated timestamps. Flag for validator review."

### Checkpoint 4: Evidence Spot-Check

**What**: The evidence of a completed work item matches the file paths that the
work item claims.

**Action**: Pick 1 random completed work item. Then run its verification_method
again:
- For file_exists: `bash: ls {claimed_path}` (expect exit 0)
- For file_contains: `grep '{pattern}' {file}` (expect match)
- For test_result: re-run the test command (expect passing output)

**On failure**: BLOCKED. Report: "Spot-check FAILED for {WI-N}: claimed
evidence does not verify. Evidence may be fabricated. Halt and escalate."

### Checkpoint 5: Dependency Satisfaction

**What**: No pending work item has an unmet dependency.

**Check**: For each pending item with non-empty dependencies[]:
```
Every dep_id in dependencies[] has status == "completed" in coordination_log
```

**On failure**: HOLD. Report: "Cannot start {WI-N}: dependency {dep_id} not yet
completed. Wait for blocking dependencies."

---

## Recording Validation Results

After each validation round, add this block to coordination_log.yaml:

```yaml
validation_checkpoints:
  pre_execution:
    passed: true
    checks_run: 7
    checks_failed: 0
    failures: []
    timestamp: "{ISO_TIMESTAMP}"
  mid_execution_checkpoints:
    - round: 1
      items_checked_at: 3
      checks_run: 5
      issues_found: 0
      spot_checked_item: "WI-2"
      spot_check_result: PASS
      timestamp: "{ISO_TIMESTAMP}"
```

---

## Failure Handling Summary

| # | Check | Severity | Action |
|---|-------|----------|--------|
| 0 | Planner Output Schema | CRITICAL | BLOCKED: re-run planner, do not proceed to Check 1 |
| 1 | Plan Completeness | CRITICAL | BLOCKED: stop coordination, report field |
| 2 | Acceptance Criteria | CRITICAL | BLOCKED: request re-decomposition |
| 3 | Dependency Acyclicity | CRITICAL | BLOCKED: fix dependency graph |
| 4 | Agent Existence | MEDIUM | WARN: flag potential failure, continue |
| 5 | Referenced Files | MEDIUM | WARN: executor may fail, continue |
| 6 | Log Schema | LOW | AUTO-FIX: add missing fields |
| 7 | Evidence Capture | MEDIUM | WARN: request re-verification |
| 8 | Stuck Items | MEDIUM | ESCALATE: re-spawn or report |
| 9 | Timestamp Monotonicity | LOW | WARN: flag for validator |
| 10 | Evidence Spot-Check | CRITICAL | BLOCKED: escalate fabrication |
| 11 | Dependency Satisfaction | MEDIUM | HOLD: wait for dependencies |

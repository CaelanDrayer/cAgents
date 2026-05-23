# Controller Validation Checklist Reference

Detailed specifications for pre-execution and mid-execution validation checks run by controllers.

## Pre-Execution Validation Checklist (7 checks)

Run BEFORE spawning any execution agent.

### Check 0: Planner Output Schema

**What**: Validate that the planner-emitted YAML files (`workflow/plan.yaml` and `workflow/work_items.yaml`) parse and satisfy the minimum schema BEFORE any other check runs. If the planner output is malformed, every downstream check is operating on garbage — so we fail fast here.

**Tool**: `scripts/ci/validate-planner-output.cjs --plan <plan.yaml> --work-items <work_items.yaml>` (added in LP-28, v12.7.x).

**Schema contract** (intentionally minimal — broader semantic checks live in Checks 1–6):
- `plan.yaml` must contain: `plan_id` (string), `tier` (2|3|4), `domain` (string), `mission` (string), `objectives[]` with `{id, description}`, `controller_assignment.primary` (string), `success_criteria[]` (at plan root OR on every objective).
- `work_items.yaml` must contain `work_items[]` (or legacy `items[]`) where every entry has `{id, title, assigned_to, acceptance_criteria}` and `acceptance_criteria` is a non-empty list of strings (or `{criterion: string}` objects).

**On failure**: BLOCKED — exit 1 from the validator. Controller must request planner re-run; do NOT proceed to Check 1. Stderr contains the specific schema violation (e.g., `plan.yaml: missing or empty controller_assignment.primary`).

**Why Check 0 not Check 7**: this is a structural pre-flight. The numeric checks 1–6 assume the YAML is well-formed and the canonical fields exist; Check 0 makes that assumption explicit.

### Check 1: Plan Completeness

**What**: Verify `workflow/plan.yaml` has all required fields.

**Required fields**:
- plan_id (non-empty string)
- tier (2, 3, or 4)
- domain (engineering|creative|business|growth|people|service|shared|leadership)
- mission (string, len > 10, not placeholder)
- objectives (array, len >= 1, each has id + description)
- controller_assignment (object with "primary" field = cagents:{name})
- success_criteria (array, len >= 1)

**On failure**: BLOCKED — "plan.yaml missing required field: {field}. Cannot coordinate without a complete plan."

### Check 2: Work Items Acceptance Criteria

**What**: Every work_items.yaml entry has non-empty, specific acceptance criteria.

**Requirements**:
- Every item has: id, title, assigned_to, acceptance_criteria
- acceptance_criteria is array (len >= 1)
- Each criterion is string (len > 5)
- No vague placeholders: "TBD", "TODO", "pending", "TBD later"

**On failure**: BLOCKED — "Work item {WI-N} has no/empty acceptance_criteria. Request re-decomposition."

### Check 3: Dependency Acyclicity

**What**: No circular dependencies in work_items dependency graph.

**Algorithm**: Topological sort (Kahn's algorithm) or DFS cycle detection on dependencies[] fields.

**On failure**: BLOCKED — "Circular dependency detected: {WI-A} -> {WI-B} -> {WI-A}. Fix the dependency graph."

### Check 4: Agent Existence

**What**: For every unique `assigned_to` agent in work_items, verify SKILL.md exists.

**Check**: File exists at one of:
- `{domain}/agents/{agent-name}/SKILL.md`
- `{domain}/agents/{agent-name}.md`

**Example paths**:
- developer/backend/backend-developer/SKILL.md
- core/reviewer/SKILL.md
- writer/copywriter/SKILL.md

**On failure**: WARN — "Agent cagents:{name} SKILL.md not found. Will attempt spawn but may fail."

### Check 5: Referenced Files Existence

**What**: Work item descriptions reference files that should exist before execution.

**Pattern**: Work item descriptions containing phrases like "Edit {path}", "Read {path}", "Modify {path}".

**Check**: `fs.existsSync(path) == true` for each extracted file path.

**On failure**: WARN — "Work item {WI-N} references non-existent file: {path}. The executor may fail."

### Check 6: Coordination Log Schema Pre-Validation

**What**: Coordination_log.yaml planned structure has all required fields before writing.

**Required fields to populate**:
- schema_version: "1"
- controller: "cagents:{name}"
- objectives: array from plan.yaml
- status: "completed"
- implementation_tasks: array with task_id, assigned_to, status, review_result

**On failure**: AUTO-FIX — "Add missing fields before writing. If fields can't be computed, mark status: partial."

---

## Mid-Execution Validation Checklist (5 checks)

Run by controller AFTER EVERY 3 COMPLETED WORK ITEMS.

### Checkpoint 1: Evidence Capture Verification

**What**: Every completed work item has non-null, non-empty evidence.

**Check**:
```
For each implementation_tasks entry where status == "completed":
  - evidence field exists
  - evidence is non-empty string
  - evidence is not placeholder text ("TBD", "TODO", "pending")
```

**On failure**: WARN — "Work item {WI-N} completed with empty evidence. Request re-verification from agent."

### Checkpoint 2: Stuck Item Detection

**What**: No work item has been in_progress for > 10 minutes.

**Check**: For each in_progress item: `(now - started_at_timestamp) < 10 minutes`

**On failure**: ESCALATE — "Work item {WI-N} has been in_progress for {N} minutes. Consider re-spawning."

### Checkpoint 3: Progress Timestamp Monotonicity

**What**: Completed timestamps are monotonically increasing for sequential work items.

**Check**: `completed_at[i+1] >= completed_at[i]` for sequential items.

**On failure**: WARN — "Timestamp ordering anomaly detected. Possible clock skew or fabricated timestamps. Flag for validator review."

### Checkpoint 4: Evidence Spot-Check

**What**: Randomly verify 1 completed work item's evidence actually matches claimed file paths.

**Action**: Pick 1 random completed work item, re-run its verification_method:
- For file_exists: `bash: ls {claimed_path}` (expect exit 0)
- For file_contains: `grep '{pattern}' {file}` (expect match)
- For test_result: re-run the test command (expect passing output)

**On failure**: BLOCKED — "Spot-check FAILED for {WI-N}: claimed evidence does not verify. Evidence may be fabricated. Halt and escalate."

### Checkpoint 5: Dependency Satisfaction

**What**: No pending work item has unmet dependencies.

**Check**: For each pending item with non-empty dependencies[]:
```
Every dep_id in dependencies[] has status == "completed" in coordination_log
```

**On failure**: HOLD — "Cannot start {WI-N}: dependency {dep_id} not yet completed. Wait for blocking dependencies."

---

## Recording Validation Results

Add to coordination_log.yaml after each validation round:

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

| Check | Severity | Action |
|-------|----------|--------|
| 0 — Planner Output Schema | CRITICAL | BLOCKED: re-run planner, do not proceed to Check 1 |
| 1 — Plan Completeness | CRITICAL | BLOCKED: stop coordination, report field |
| 2 — Acceptance Criteria | CRITICAL | BLOCKED: request re-decomposition |
| 3 — Dependency Acyclicity | CRITICAL | BLOCKED: fix dependency graph |
| 4 — Agent Existence | MEDIUM | WARN: flag potential failure, continue |
| 5 — Referenced Files | MEDIUM | WARN: executor may fail, continue |
| 6 — Log Schema | LOW | AUTO-FIX: add missing fields |
| 7 — Evidence Capture | MEDIUM | WARN: request re-verification |
| 8 — Stuck Items | MEDIUM | ESCALATE: re-spawn or report |
| 9 — Timestamp Monotonicity | LOW | WARN: flag for validator |
| 10 — Evidence Spot-Check | CRITICAL | BLOCKED: escalate fabrication |
| 11 — Dependency Satisfaction | MEDIUM | HOLD: wait for dependencies |

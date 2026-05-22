# Task Consolidation Patterns

## Micro-Task Format

```yaml
micro_task:
  id: {parent_task_id}_micro_{n}
  description: "Focused, single-operation task"
  agent: "{specialist for this operation}"
  context_budget: "<10K tokens"
  inputs: "Minimal (only what's needed)"
  outputs: "Specific artifact or analysis"
  dependencies: []  # None or minimal
```

## Splitting Strategy Examples

### File-Based Split (Code)
```yaml
Task: "Refactor authentication module" (6 files, 25K budget)

micro_tasks:
  - id: task_3_micro_1
    file: auth.js
    agent: backend-developer
    budget: 4K
  - id: task_3_micro_2
    file: login.js
    agent: backend-developer
    budget: 4K
  # ... 4 more files

consolidation:
  - Merge all refactored files
  - Ensure compatibility
  - Run integration tests
  budget: 8K

Total: 32K distributed (vs 25K single, but 6x parallel)
```

### Function-Based Split (Single File)
```yaml
Task: "Optimize database queries" (1 large file, 20K budget)

micro_tasks:
  - id: task_micro_1
    function: getUserById
    agent: backend-developer
    budget: 3K
  - id: task_micro_2
    function: getUsersByRole
    agent: backend-developer
    budget: 4K
  # ... more functions

consolidation:
  - Merge optimizations into single file
  - Verify no conflicts
  - Performance test
  budget: 6K
```

### Operation-Based Split (Analysis)
```yaml
Task: "Security audit of API module" (30K budget)

micro_tasks:
  - id: audit_micro_1
    check: authentication
    agent: security-analyst
    budget: 5K
  - id: audit_micro_2
    check: authorization
    agent: security-analyst
    budget: 5K
  - id: audit_micro_3
    check: input_validation
    agent: security-analyst
    budget: 6K
  # ... more checks

consolidation:
  - Aggregate all findings
  - Deduplicate
  - Prioritize by severity
  - Create report
  budget: 10K
```

## Consolidation Patterns

### Pattern 1: Merge Files
```yaml
Inputs: [file_1_refactored, file_2_refactored, file_3_refactored]

Steps:
  1. Read all refactored files
  2. Check for shared dependencies
  3. Ensure compatibility (imports, exports)
  4. Run integration tests
  5. Create consolidated changeset

Output: Complete refactored module + test results
```

### Pattern 2: Aggregate Analyses
```yaml
Inputs: [analysis_1, analysis_2, analysis_3]

Steps:
  1. Read all analyses
  2. Deduplicate findings
  3. Prioritize by severity (Critical > High > Medium > Low)
  4. Group by category
  5. Create unified report

Output: Comprehensive report + prioritized recommendations
```

### Pattern 3: Merge Content
```yaml
Inputs: [section_1, section_2, section_3]

Steps:
  1. Read all sections
  2. Smooth transitions between sections
  3. Ensure consistency (tone, voice, tense)
  4. Polish unified narrative
  5. Verify flow and pacing

Output: Complete unified content
```

## Error Handling

### Micro-Task Failure
```yaml
On failure:
  1. Retry that specific micro-task (isolated failure)
  2. If retry fails, mark as incomplete
  3. Consolidate remaining micro-tasks
  4. Report partial completion + failed micro-task

Benefit: One failure doesn't block entire task
```

### Consolidation Failure
```yaml
On failure:
  1. All micro-tasks completed (already saved)
  2. Retry consolidation with simplified strategy
  3. If still fails, escalate to HITL with all outputs
  4. Human can manually consolidate if needed

Benefit: Work not lost, can be manually finished
```

## Context Optimization Report

```yaml
consolidation_report:
  original_budget: 25000
  micro_tasks_used: 24000
  consolidation_used: 8000
  total_used: 32000
  efficiency: 128%  # Did more work within safe limits
  parallelism: 6x
  max_agent_context: 8000  # No agent exceeded 8K
```

## When NOT to Use

- Task budget <15K tokens (overhead not worth it)
- Task is atomic (single file, single operation)
- Sub-operations are tightly coupled (need shared context)
- Consolidation would be complex (>15K just to merge)

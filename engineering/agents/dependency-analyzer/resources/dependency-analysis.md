# Dependency Analysis Methodology

## Build Dependency Graph

Read the plan and construct a dependency graph:

```yaml
# Read from Agent_Memory/{instruction_id}/workflow/plan.yaml

tasks:
  task_001:
    dependencies: []
    provides: ["design_spec"]

  task_002:
    dependencies: [task_001]  # Needs design spec
    provides: ["api_implementation"]

  task_003:
    dependencies: [task_001]  # Also needs design spec
    provides: ["frontend_implementation"]

  task_004:
    dependencies: [task_002, task_003]  # Needs both implementations
    provides: ["integration_tests"]
```

## Missing Dependencies

```yaml
issue:
  type: missing_dependency
  task: task_005_deploy
  missing: "database_migration"
  severity: critical
  recommendation: "Add task_004_run_migration with dependency before task_005"
```

## Circular Dependencies

```yaml
issue:
  type: circular_dependency
  cycle: [task_002, task_005, task_007, task_002]
  severity: critical
  recommendation: "Break cycle by removing task_007 -> task_002 dependency"
```

## Parallelization Opportunities

```yaml
optimization:
  type: parallel_execution
  tasks: [task_002, task_003]  # Both depend only on task_001
  current_time: "sequential (8 hours)"
  optimized_time: "parallel (4 hours)"
  time_savings: "50%"
```

## Output Format

```
=== Dependency Analysis Report ===

## Dependency Graph

task_001 (Design)
  |
  +-> task_002 (API) ----+
  |                      v
  +-> task_003 (Frontend) -> task_004 (Integration)
                              |
                            task_005 (Deploy)

## Issues Detected: 2

[CRITICAL] Missing Dependency
  Task: task_005_deploy
  Missing: database_migration
  -> TASK INJECTED: task_004_run_migration (before task_005)

## Critical Path

task_001 -> task_002 -> task_004 -> task_005 (Total: 12 hours)
```

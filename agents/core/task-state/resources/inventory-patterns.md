# Task Inventory Patterns

## Batch Delegation Patterns

### Pattern 1: Parallel Agent Assignment
```yaml
Scenario: 30 build tasks, 3 available agents

Operations:
  - batch_assign:
      agent: backend-developer-1
      criteria: {type: build, limit: 10, dependencies_met: true}
  - batch_assign:
      agent: backend-developer-2
      criteria: {type: build, limit: 10, dependencies_met: true}
  - batch_assign:
      agent: backend-developer-3
      criteria: {type: build, limit: 10, dependencies_met: true}

Result: 30 tasks distributed across 3 agents
Context cost: ~2K (vs 15K loading all tasks)
```

### Pattern 2: Dependency-Ordered Batches
```yaml
Scenario: 50 tasks with complex dependencies

Phase 1: Independent tasks (no dependencies)
  batch_assign: {criteria: {dependencies: [], status: pending}}
  Result: 15 tasks ready immediately

Phase 2: After phase 1 completes
  batch_assign: {criteria: {dependencies_met: true, status: pending}}
  Result: 20 more tasks now unblocked

Phase 3: Continue until all complete
```

### Pattern 3: Priority-Based Execution
```yaml
# Critical first
batch_assign: {criteria: {priority: [critical, high], limit: 20}}

# Medium when capacity available
batch_assign: {criteria: {priority: medium, limit: 10}}

# Low priority background
batch_assign: {criteria: {priority: low}}
```

### Pattern 4: Type-Based Specialist Routing
```yaml
batch_assign:
  - agent: architect
    criteria: {type: design}
  - agent: backend-developer
    criteria: {type: build}
  - agent: qa-lead
    criteria: {type: verify}
  - agent: technical-writer
    criteria: {type: document}
```

## Batch Operations

### batch_assign
```yaml
request:
  operation: batch_assign
  agent: backend-developer
  criteria:
    type: build
    status: pending
    dependencies_met: true
    limit: 10

result:
  assigned: [TASK-03, TASK-04, TASK-05, ...]
  tokens_saved: 4500
```

### batch_complete
```yaml
request:
  operation: batch_complete
  agent: backend-developer
  completions:
    - task_id: TASK-03
      output_path: outputs/task-03/
      notes: "Implemented with tests"
    - task_id: TASK-04
      status: failed
      notes: "Dependency missing"

result:
  completed: [TASK-03]
  failed: [TASK-04]
  unblocked: [TASK-15, TASK-16]  # Tasks that depended on TASK-03
```

### query
```yaml
request:
  operation: query
  filters:
    status: pending
    type: build
    priority: [high, critical]

result:
  matching: 23
  by_priority: {critical: 3, high: 20}
  ready_to_start: 15
  blocked: 8
```

### progress_report
```yaml
request:
  operation: progress_report

result:
  total_tasks: 87
  by_status:
    completed: 42 (48%)
    in_progress: 8 (9%)
    pending: 32 (37%)
    blocked: 3 (3%)
    failed: 2 (2%)
  by_type:
    understand: 5/5 complete
    design: 4/4 complete
    build: 28/45 complete
    verify: 5/25 complete
    document: 0/8 complete
  estimated_remaining: "4-6 hours"
```

## Checkpoint/Resume

### Create Checkpoint
```yaml
request:
  operation: checkpoint
  checkpoint_id: chk_20260122_1300

creates:
  - inventory/checkpoints/chk_20260122_1300/
    - tasks_snapshot.csv
    - assignments_snapshot.csv
    - batch_log_snapshot.csv
```

### Resume from Checkpoint
```yaml
request:
  operation: resume
  checkpoint_id: chk_20260122_1300

result:
  interrupted:
    - task_id: TASK-25
      status_at_checkpoint: in_progress
      assigned_to: backend-developer
      action_needed: restart_or_verify
  completed_preserved: [TASK-01, ..., TASK-24]
  next_batch: "Continue with in_progress tasks"
```

## Error Handling

### Task Failure
```yaml
On failure:
  1. Mark task as failed with reason
  2. Identify dependent tasks
  3. Mark dependents as blocked
  4. Return blocked list to controller
```

### Agent Timeout
```yaml
On stale assignment (>30min no update):
  1. Detect stale tasks
  2. Controller can reassign to different agent
```

### Checkpoint Recovery
```yaml
On resume:
  1. Identify interrupted work (in_progress at checkpoint)
  2. Controller decides: restart or verify completion
  3. Continue from checkpoint state
```

## CLI Interface

```bash
# Initialize
task-inventory init --from decomposition.yaml

# Batch operations
task-inventory assign --agent backend-developer --type build --limit 10
task-inventory complete --tasks "TASK-03,TASK-04" --agent backend-developer

# Query
task-inventory query --status pending --type build
task-inventory progress
task-inventory dependencies TASK-15

# Checkpoint/resume
task-inventory checkpoint --name "pre-validation"
task-inventory resume --checkpoint "pre-validation"

# Export
task-inventory export --format json --output tasks.json
```

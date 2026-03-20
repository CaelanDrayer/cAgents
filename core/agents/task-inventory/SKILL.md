---
name: task-inventory
domain: core
tier: infrastructure
description: "Use when managing CSV-based task state for large-scale workflows with 20+ items, achieving 60-80% context savings over inline tracking."
vibe: "Tracks every task in CSV so nothing falls through the cracks"
model: opus
color: bright_white
capabilities:
  - csv_state_management
  - batch_delegation
  - checkpoint_resume
  - progress_reporting
  - parallel_tracking
allowed-tools: "Read Grep Glob Write Edit Bash Task TodoWrite"
maxTurns: 30
permissionMode: "bypassPermissions"
---

# Task Inventory Manager

External state manager using CSV files for large task inventories.

## Key Benefits

- **60-80% context reduction**: Task state lives in CSV, not context
- **Batch delegation**: Assign 50+ tasks in single operation
- **Resume capability**: Pick up exactly where left off
- **Parallel tracking**: Multiple agents update shared inventory
- **Scale unlimited**: Handle 1000+ tasks without context overflow

## CSV Schema

### tasks.csv
```csv
task_id,parent_id,name,type,status,priority,assigned_to,created_at,started_at,completed_at,dependencies,acceptance_criteria,output_path,notes
```

### batch_log.csv
```csv
batch_id,operation,task_ids,agent,timestamp,result,tokens_saved
```

### assignments.csv
```csv
agent,active_tasks,completed_today,total_completed,current_batch,last_activity
```

## Core Operations

| Operation | Purpose | Context Cost |
|-----------|---------|--------------|
| **init** | Create inventory from decomposition | Once |
| **batch_assign** | Assign multiple tasks to agent | ~200 tokens |
| **batch_complete** | Mark multiple tasks done | ~200 tokens |
| **query** | Get task status summary | ~100 tokens |
| **progress_report** | Full status report | ~500 tokens |
| **checkpoint** | Save state snapshot | ~100 tokens |
| **resume** | Restore from checkpoint | ~200 tokens |

## Context Savings

| Tasks | Without Inventory | With Inventory | Savings |
|-------|-------------------|----------------|---------|
| 20 | 8K tokens | 2K tokens | 75% |
| 50 | 20K tokens | 3K tokens | 85% |
| 100 | 40K tokens | 4K tokens | 90% |

See @resources/inventory-patterns.md for batch delegation and checkpoint patterns.

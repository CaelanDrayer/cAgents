# Best Practices: Task Inventory

> Design principles, patterns, and frameworks that guide high-quality CSV-based task state management for large-scale workflows.

## Design Principles

- **State Lives in Files, Not Context**: Task status, assignments, and progress belong in CSV files on disk — in-context tracking exhausts the model's attention window at scale
- **Single Source of Truth**: The tasks.csv file is the authoritative record — no agent should maintain its own parallel tracking; all reads and writes go through task-inventory
- **Batch Operations Over Individual Updates**: Assign 50 tasks or mark 20 complete in a single operation — individual row updates are expensive; batch operations amortize the cost
- **Resume-Ready at All Times**: Every state change is immediately persisted — a crashed or context-exhausted agent picks up exactly where it left off by reading the CSV
- **Parallel-Safe Updates**: Multiple agents update the same inventory concurrently — file-lock or sequential append patterns prevent race conditions and data corruption
- **Scale Without Limit**: 1000+ tasks are manageable when state lives in CSV — in-context tracking becomes unworkable above ~20 tasks
- **Query-Efficient Progress**: The `query` operation returns a compact summary (counts by status, blocked items, next available) — agents consume ~100 tokens to understand full workflow state

## Key Patterns & Frameworks

- **CSV State Pattern**: Use comma-separated values files for task state instead of YAML or JSON — CSV is compact, human-readable, appendable without parsing the full file, and trivially queryable with standard tools
- **Three-CSV Schema**: `tasks.csv` (full task state), `batch_log.csv` (audit trail of all batch operations), `assignments.csv` (per-agent tracking) — each file has a specific purpose; no overlap
- **Batch Assignment Pattern**: Assign groups of related tasks to an agent in one operation with `batch_assign` — the batch_id links all tasks in the same assignment event for rollback or audit
- **Checkpoint/Resume Pattern**: Write a checkpoint snapshot at each major milestone — on resume, read the checkpoint to determine completed vs. pending tasks without re-executing the entire CSV
- **Progress Report on Demand**: `progress_report` generates a human-readable summary of completed, in-progress, blocked, and pending tasks — used at phase boundaries and in validation
- **Dependency Tracking Column**: The `dependencies` column in tasks.csv stores comma-separated TASK-IDs — batch operations check dependency satisfaction before marking a task as available
- **Token Budget Operations**: Each operation type has a known token cost (init: once, batch_assign: ~200, batch_complete: ~200, query: ~100) — controllers select operations to stay within token budgets
- **Parallel Agent Tracking**: The assignments.csv tracks which agent has which tasks — enables the inventory to detect stalled agents (last_activity timestamp) and reassign abandoned tasks

## Domain Concepts & Terminology

### CSV Schema Fields
- **task_id**: Unique stable identifier — referenced by all other systems
- **parent_id**: Links child tasks to a parent work item for hierarchical tracking
- **name**: Brief task description — kept to <80 characters for CSV readability
- **type**: UNDERSTAND, DESIGN, BUILD, VERIFY, DOCUMENT — matches task-decomposer classifications
- **status**: pending, in_progress, completed, blocked, dead_letter — the five valid states
- **priority**: Numeric or label — drives order of assignment when multiple tasks are available
- **assigned_to**: Agent name currently responsible — blank if unassigned
- **created_at, started_at, completed_at**: ISO timestamps for latency analysis
- **dependencies**: Comma-separated TASK-IDs that must complete before this task is available
- **acceptance_criteria**: Serialized criteria for this task — reviewed at completion
- **output_path**: Where the agent writes its output artifact — consumed by downstream tasks
- **notes**: Free-text field for blockers, context, or issues

### Operations
- **init**: Initialize the inventory from a work_items.yaml or decomposition — runs once at workflow start
- **batch_assign**: Assign a list of task IDs to an agent in one write — produces a batch_id for the assignment group
- **batch_complete**: Mark a list of task IDs as completed in one write — unlocks any tasks that were waiting on these dependencies
- **query**: Return a compact status summary (~100 tokens) — counts by status, list of available tasks, list of blocked tasks
- **progress_report**: Generate full human-readable progress report (~500 tokens) — used at phase boundaries
- **checkpoint**: Snapshot current state to a timestamped file — enables resume without re-reading the full CSV
- **resume**: Load a checkpoint and return pending/in-progress tasks — the starting point for recovery

### Context Savings
- **Token Cost Comparison**: 20 tasks = 8K tokens inline vs. 2K with inventory (75% savings); 100 tasks = 40K tokens inline vs. 4K with inventory (90% savings)
- **Break-Even Point**: Task inventory becomes beneficial at approximately 20 tasks — below this, the initialization overhead exceeds the savings
- **Scale Ceiling**: No practical upper limit on tasks — 1000+ tasks are fully supported because state is entirely on disk

### Concurrency Safety
- **File Lock**: When multiple agents write simultaneously, a file-level lock prevents interleaved writes — implemented via atomic rename or advisory lock
- **Sequential Append**: Batch operations append new rows rather than rewriting the entire file — safe for concurrent agents without a lock
- **Last-Write-Wins Resolution**: For the same task_id, the most recent timestamp wins — agents should complete their update atomically

## Anti-Patterns to Avoid

- **In-Context Task Lists**: Maintaining task state in context (numbered lists, YAML blocks) for workflows with 20+ tasks — context exhaustion is inevitable; use task-inventory
- **Individual Row Updates**: Calling task-inventory once per task for assignment or completion — batch operations exist precisely to avoid this; one call per batch, not per task
- **Missing Dependency Check**: Marking a task as available without checking whether all its dependencies are complete — produces tasks that execute before their inputs exist
- **Parallel CSV Overwrite**: Two agents both reading the full CSV and writing back a modified copy simultaneously — one agent's changes are silently lost; use append-based operations or file locks
- **Stale Checkpoint Reliance**: Using a checkpoint from hours ago without querying current state — checkpoints are snapshots; always verify current state before resuming from a checkpoint
- **Tracking Completed Work**: Re-executing tasks already marked completed in the CSV because the agent lost context — always query inventory first; skip anything already completed
- **Exceeding 20 Micro-Tasks in Assignment**: Assigning more than 20 tasks to a single agent in one batch — agent context will overflow; distribute across agents

## Quality Indicators

- **Context Token Usage Per Task**: Average tokens consumed tracking each task's state — target <200 tokens per task at workflow level
- **Checkpoint Coverage**: Percentage of workflows with 20+ tasks that use task-inventory — target 100%
- **Batch Operation Efficiency**: Average tasks per batch_assign call — target >5; values of 1 indicate missed batching opportunities
- **Resume Success Rate**: Percentage of interrupted workflows that successfully resume from checkpoint — target >95%
- **Stale Assignment Rate**: Percentage of tasks that sit in-progress with no activity for >30 minutes — indicates stuck agents that need reassignment
- **Dependency Accuracy**: Percentage of task completions where dependency-unlocking correctly updates downstream task availability — target 100%

## Collaboration Touchpoints

- **With orchestrator**: Orchestrator initializes task-inventory at the start of workflows with 20+ items — inventory then serves as the state backbone for the entire coordinating and executing phases
- **With controllers**: Controllers use batch_assign and batch_complete to track work item progress — inventory is the controller's external memory when work items exceed manageable in-context tracking
- **With task-consolidator**: When consolidator splits work into micro-tasks, it initializes a sub-inventory for the split — micro-task progress is tracked independently and merged into the parent inventory at completion
- **With executor**: Executor queries the inventory to determine when all work items are complete rather than polling coordination_log.yaml — inventory provides a compact, accurate view of execution state

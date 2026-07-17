---
name: task-state
archetype: core
description: "Manages large task inventories — CSV-based state tracking for 20+ task workflows (60-80% context savings) and splitting/merging of parallel micro-tasks for 15K+ token jobs. Use when a workflow has many tasks to track or consolidate. Modes: state, merge. Set metadata.mode. NOT for: coordinating the work itself (use a controller) or monitoring pipeline progress (use execution-monitor)."
metadata:
  version: "1.0.0"
  tier: infrastructure
  model: opus
  mode: state
  supported_modes:
    state: "CSV-based task inventory for large-scale workflows with 20+ items — batch_assign, batch_complete, query, checkpoint, resume (was: task-state)"
    merge: "Splits oversized tasks into parallel micro-tasks and consolidates results — file/function/operation/chapter/data-based splitting strategies (absorbed from task-merger)"
  capabilities:
    - csv_state_management
    - batch_delegation
    - checkpoint_resume
    - progress_reporting
    - parallel_tracking
    - task_decomposition
    - result_consolidation
    - context_optimization
  color: bright_white
  maxTurns: 30
  vibe: "CSV inventory for scale; splits oversized tasks before they exhaust context"
allowed-tools: Read Grep Glob Write Edit Bash Agent TaskCreate TaskUpdate TaskList TaskGet
---

# Task State & Merger

Pipeline infrastructure for external task management. Handles both CSV-based inventory tracking (state mode, default) and context-saving micro-task splitting (merge mode).

## Mode Selection

| If the request mentions… | Use mode |
|---|---|
| CSV inventory, task state, batch assign, batch complete, checkpoint, resume, 20+ tasks, 60-80% context savings | state (default) |
| split task, micro-task, context exhausted, 15K+ tokens, parallel sub-agents, consolidate results, task-merger | merge |

Fallback: state.

See @resources/state.md for the state mode's full playbook (CSV schema, operations, context savings table).

See @resources/merge.md for the merge mode's full playbook (splitting strategies, workflow, sizing rules).

## Worked Examples

- See @.claude/rules/examples/ex-structured-io-schema-role-contract.md — a role + input_schema + output_schema + instructions contract for transform-shaped work (vague prose vs a schema-constrained, checkable spec).

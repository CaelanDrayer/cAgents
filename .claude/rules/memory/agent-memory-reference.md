---
paths:
  - "cagents-memory/**"
  - ".claude/hooks/**"
  - ".claude/skills/**"
---

# Agent Memory Reference Details

Detailed directory structures, schemas, and examples. See `agent-memory.md` for core concepts.

## Full Directory Structure

```
cagents-memory/
├── _system/
│   ├── config/                       # Global configuration
│   ├── commands/                     # Command-specific configs
│   │   ├── run/                      # domain_detection, workflow_templates, preflight_validation, workflow_analytics
│   │   ├── designer/templates/       # Design templates
│   │   ├── review/                   # framework_patterns
│   │   └── optimize/                 # framework_patterns, scan_patterns
│   ├── domains/{domain}/             # Domain configs (5 files each)
│   ├── metrics/                      # config, sessions/, daily/, aggregates/
│   ├── evals/                        # config, decomposition/, coordination/, regression/
│   └── templates/                    # waypoint.yaml, session_files.yaml
├── _knowledge/                       # semantic/, procedural/, calibration/, analytics/
├── _archive/                         # Completed sessions
├── _communication/                   # inbox/{agent}/, broadcast/
└── sessions/                         # run_*, designer_*, review_*, optimize_*
```

## Session Folder Structure

```
cagents-memory/sessions/{session_id}/
├── instruction.yaml              # User request + metadata
├── status.yaml                   # Current phase, phase history
├── task_plan.md                  # Three-file pattern: work item breakdown
├── findings.md                   # Three-file pattern: discoveries/decisions
├── progress.md                   # Three-file pattern: status/resume
├── workflow/
│   ├── plan.yaml                # Objectives + controller assignment
│   ├── decomposition.yaml       # Work item breakdown
│   ├── coordination_log.yaml    # Q&A exchanges, synthesis
│   ├── execution_summary.yaml   # Aggregated outputs
│   ├── child_sessions.yaml      # Child session IDs (team only)
│   ├── agent_tree.yaml          # Spawned agent hierarchy
│   └── checkpoints/             # State snapshots
├── waypoints/                    # Resume checkpoints
├── tasks/                        # pending/, in_progress/, completed/, blocked/
├── outputs/                      # partial/, final/
├── evals/                        # evaluation_report.yaml
└── validation/                   # validation_report.yaml
```

> **Note**: The three-file pattern (task_plan.md, findings.md, progress.md) is aspirational. Most sessions rely on `workflow/` artifacts instead. These files are shown for completeness but are not required.

## Three-File Pattern Examples

### task_plan.md (500-2000 tokens)

```markdown
# Task Plan: run_20260127_165825

## Objective
Implement user authentication

## Work Items
### Completed
- [x] TASK-01: Analyze existing auth - Evidence: analysis.md
### In Progress
- [ ] TASK-03: Implement user model - Assigned to: backend-developer
### Pending
- [ ] TASK-04: Add auth endpoints - Blocked by: TASK-03
```

### findings.md (1000-5000 tokens)

```markdown
# Findings: run_20260127_165825

## Key Discoveries
- Finding 1: Current auth is session-based
- Finding 2: JWT preferred for API clients

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use JWT | Stateless, better for scaling |
```

### progress.md (200-500 tokens)

```markdown
# Progress: run_20260127_165825

**Phase**: coordinating | **Status**: in_progress
- Work Items: 5/15 completed

## Resume Instructions
1. Read: task_plan.md, findings.md
2. Continue from: TASK-03 implementation
```

## Waypoint Structure

```yaml
id: WP-001
type: phase_transition  # or work_item_complete, periodic, pre_compact
phase: coordinating
created_at: "2026-01-27T17:00:00Z"
work_items:
  completed: [TASK-01, TASK-02]
  in_progress: [TASK-03]
  pending: [TASK-04, TASK-05]
resume_hints:
  next_action: "Continue with TASK-03 implementation"
  context_needed: [task_plan.md, findings.md]
```

## Command-Specific Session Extensions

**/designer** also includes: session.yaml, qa_log.yaml, design_document.md, artifacts/, diagrams/, exports/

**/review** also includes: scope_analysis.yaml, execution_strategy.yaml, reports/ (aggregate, auto_fixes, quality_gates, final_report)

**/optimize** also includes: workflow/detection_report.yaml, workflow/opportunities.yaml, outputs/optimization_report.md

## Config Locations

| Command | Config Path |
|---------|------------|
| `/run` | `cagents-memory/_system/commands/run/` |
| `/designer` | `cagents-memory/_system/commands/designer/` |
| `/review` | `cagents-memory/_system/commands/review/` |
| `/optimize` | `cagents-memory/_system/commands/optimize/` |

Each domain has 5 configs in `_system/domains/{domain}/`: router, planner, executor, validator, self_correct.

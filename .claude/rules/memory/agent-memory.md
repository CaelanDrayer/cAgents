# Agent Memory Structure

File-based memory organization for cAgents.

## Directory Structure

```
Agent_Memory/
├── _system/                          # System-level configs
│   ├── config/                       # Global configuration
│   ├── commands/                     # Command-specific configs
│   │   ├── run/                      # /run command configs
│   │   │   ├── domain_detection.yaml
│   │   │   ├── workflow_templates.yaml
│   │   │   ├── preflight_validation.yaml
│   │   │   └── workflow_analytics.yaml
│   │   ├── explore/                  # /explore command configs
│   │   │   └── templates/            # Design templates
│   │   ├── review/                   # /review command configs
│   │   │   └── framework_patterns.yaml
│   │   └── optimize/                 # /optimize command configs
│   │       ├── framework_patterns.yaml
│   │       └── scan_patterns.yaml
│   ├── domains/{domain}/             # Domain configs (5 files each)
│   ├── metrics/                      # Workflow metrics (V8.0)
│   │   ├── config.yaml               # Metrics configuration
│   │   ├── sessions/                 # Per-session metrics
│   │   ├── daily/                    # Daily aggregates
│   │   └── aggregates/               # Long-term trends
│   ├── evals/                        # Evaluation framework (V8.0)
│   │   ├── config.yaml               # Eval configuration
│   │   ├── decomposition/            # Decomposition quality evals
│   │   ├── coordination/             # Coordination quality evals
│   │   └── regression/               # Regression tracking
│   └── templates/                    # Shared templates
│       ├── waypoint.yaml             # Checkpoint template
│       └── session_files.yaml        # Three-file pattern template
├── _knowledge/                       # Patterns, calibration, learnings
│   ├── semantic/                     # Domain knowledge
│   ├── procedural/                   # Workflow patterns
│   ├── calibration/                  # HITL patterns
│   └── analytics/                    # Metrics tracking
├── _archive/                         # Completed sessions
├── _communication/                   # Agent messaging
│   ├── inbox/{agent}/                # Agent-specific inboxes
│   └── broadcast/                    # System announcements
└── sessions/                         # All command sessions (STANDARDIZED)
    ├── run_{YYYYMMDD_HHMMSS}/        # /run workflow sessions
    ├── explore_{YYYYMMDD_HHMMSS}/    # /explore design sessions
    ├── review_{YYYYMMDD_HHMMSS}/     # /review sessions
    └── optimize_{YYYYMMDD_HHMMSS}/   # /optimize sessions
```

## Session ID Format

All commands use consistent session ID format: `{command}_{YYYYMMDD}_{HHMMSS}`

| Command | Session ID Pattern | Example |
|---------|-------------------|---------|
| `/run` | `run_YYYYMMDD_HHMMSS` | `run_20260121_143022` |
| `/explore` | `explore_YYYYMMDD_HHMMSS` | `explore_20260121_143022` |
| `/review` | `review_YYYYMMDD_HHMMSS` | `review_20260121_143022` |
| `/optimize` | `optimize_YYYYMMDD_HHMMSS` | `optimize_20260121_143022` |

## Session Folder Structure

Each session folder follows a consistent internal structure:

```
Agent_Memory/sessions/{session_id}/
├── instruction.yaml              # User request + metadata
├── status.yaml                   # Current phase, phase history
├── task_plan.md                  # [NEW] Three-file pattern: work item breakdown
├── findings.md                   # [NEW] Three-file pattern: discoveries/decisions
├── progress.md                   # [NEW] Three-file pattern: status/resume
├── workflow/                     # Workflow state
│   ├── plan.yaml                # Objectives + controller assignment
│   ├── decomposition.yaml       # Work item breakdown (detailed)
│   ├── coordination_log.yaml    # Q&A exchanges, synthesis (V7.0)
│   ├── execution_summary.yaml   # Aggregated outputs
│   └── checkpoints/             # State snapshots
├── waypoints/                    # [NEW] Resume checkpoints
│   └── wp-001.yaml              # Waypoint snapshot
├── tasks/                        # Task tracking
│   ├── pending/
│   ├── in_progress/
│   ├── completed/
│   └── blocked/
├── outputs/                      # Deliverables
│   ├── partial/
│   └── final/
├── evals/                        # [NEW] Quality evaluations
│   └── evaluation_report.yaml
└── validation/                   # Validation records
    └── validation_report.yaml
```

## Three-File Pattern (V8.0)

The three-file pattern provides compact, structured session tracking that survives context compaction and enables easy resumption.

### File 1: task_plan.md (500-2000 tokens)
Current task breakdown and execution order.

```markdown
# Task Plan: run_20260127_165825

## Objective
Implement user authentication

## Work Items

### Completed
- [x] WI-001: Analyze existing auth - Evidence: analysis.md
- [x] WI-002: Design auth architecture - Evidence: design.yaml

### In Progress
- [ ] WI-003: Implement user model - Assigned to: backend-developer

### Pending
- [ ] WI-004: Add auth endpoints - Blocked by: WI-003
```

### File 2: findings.md (1000-5000 tokens)
Accumulated discoveries, decisions, and context.

```markdown
# Findings: run_20260127_165825

## Key Discoveries
- Finding 1: Current auth is session-based
- Finding 2: JWT preferred for API clients

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use JWT | Stateless, better for scaling |

## Questions & Answers
**Q: What authentication approach?**
A: JWT with refresh tokens (from architect)
```

### File 3: progress.md (200-500 tokens)
Current status and resume instructions.

```markdown
# Progress: run_20260127_165825

**Last Updated**: 2026-01-27T17:30:00Z
**Phase**: coordinating
**Status**: in_progress

## Progress Summary
- Work Items: 5/15 completed
- Questions: 8/10 answered

## Next Steps
1. Complete user model implementation
2. Begin auth endpoint work

## Resume Instructions
1. Read: task_plan.md, findings.md
2. Continue from: WI-003 implementation
```

### Context Efficiency

| Method | Token Load | Efficiency |
|--------|-----------|------------|
| Full coordination_log | 5000-15000 | Baseline |
| Three-file pattern | 700-2500 | 60-80% savings |

## Waypoints (V8.0)

Waypoints are snapshots created at phase transitions and before context compaction.

### Waypoint Structure

```yaml
id: WP-001
type: phase_transition
phase: coordinating
created_at: "2026-01-27T17:00:00Z"

work_items:
  completed: [WI-001, WI-002]
  in_progress: [WI-003]
  pending: [WI-004, WI-005]

resume_hints:
  next_action: "Continue with WI-003 implementation"
  context_needed: [task_plan.md, findings.md]
```

### Waypoint Types

- `phase_transition` - Created when phase changes
- `work_item_complete` - Created when work item completes
- `periodic` - Created every N minutes (configurable)
- `pre_compact` - Created before context compaction

## Command-Specific Extensions

**/explore sessions** also include:
```
├── session.yaml                  # Session state
├── qa_log.yaml                   # Q&A with phases
├── design_document.md            # Main design document
├── artifacts/                    # Generated artifacts
├── diagrams/                     # Mermaid diagrams
└── exports/                      # Multi-format exports
```

**/review sessions** also include:
```
├── scope_analysis.yaml           # Scope and framework detection
├── execution_strategy.yaml       # Parallel execution plan
└── reports/                      # Review reports
    ├── aggregate.yaml
    ├── auto_fixes.yaml
    ├── quality_gates.yaml
    └── final_report.md
```

**/optimize sessions** also include:
```
├── workflow/
│   ├── detection_report.yaml     # Detection results
│   └── opportunities.yaml        # Identified opportunities
└── outputs/
    └── optimization_report.md    # Impact report
```

## Config Locations

### Command Configs

| Command | Config Path |
|---------|------------|
| `/run` | `Agent_Memory/_system/commands/run/` |
| `/explore` | `Agent_Memory/_system/commands/explore/` |
| `/review` | `Agent_Memory/_system/commands/review/` |
| `/optimize` | `Agent_Memory/_system/commands/optimize/` |

### Domain Configs

Each domain has 5 config files in `Agent_Memory/_system/domains/{domain}/`:

1. `router_config.yaml` - Tier classification logic
2. `planner_config.yaml` - Objectives + controller_catalog
3. `executor_config.yaml` - Execution monitoring patterns
4. `validator_config.yaml` - Quality gates
5. `self_correct_config.yaml` - Recovery patterns

### V8.0 Configs

| Config | Path | Purpose |
|--------|------|---------|
| Metrics | `_system/metrics/config.yaml` | ROI tracking |
| Evals | `_system/evals/config.yaml` | Quality assessment |
| Waypoint template | `_system/templates/waypoint.yaml` | Checkpoint format |
| Session files | `_system/templates/session_files.yaml` | Three-file pattern |

## Memory Principles

- **File-based**: All state persists to disk
- **Session-scoped**: Isolated per command invocation
- **Parallel-safe**: Multiple sessions simultaneously
- **Pause/resume**: Can stop and continue sessions via waypoints
- **Git-ignored**: Agent_Memory/ excluded from version control
- **Consistent naming**: `{command}_{timestamp}` for all sessions
- **Centralized sessions**: All in `sessions/` folder, not scattered
- **Context-efficient**: Three-file pattern reduces context load by 60-80%

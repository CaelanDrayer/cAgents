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
│   └── templates/                    # Shared templates
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
├── workflow/                     # Workflow state
│   ├── plan.yaml                # Objectives + controller assignment
│   ├── coordination_log.yaml    # Q&A exchanges, synthesis (V7.0)
│   ├── execution_summary.yaml   # Aggregated outputs
│   └── checkpoints/             # State snapshots
├── tasks/                        # Task tracking
│   ├── pending/
│   ├── in_progress/
│   ├── completed/
│   └── blocked/
├── outputs/                      # Deliverables
│   ├── partial/
│   └── final/
└── validation/                   # Validation records
    └── validation_report.yaml
```

### Command-Specific Extensions

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

## Memory Principles

- **File-based**: All state persists to disk
- **Session-scoped**: Isolated per command invocation
- **Parallel-safe**: Multiple sessions simultaneously
- **Pause/resume**: Can stop and continue sessions
- **Git-ignored**: Agent_Memory/ excluded from version control
- **Consistent naming**: `{command}_{timestamp}` for all sessions
- **Centralized sessions**: All in `sessions/` folder, not scattered

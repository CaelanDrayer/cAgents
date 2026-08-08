# Session Schema Contract (Internal)

Internal contract for cAgents session YAML — consumed by cAgents hooks and agents. **NOT a public API. NOT consumed by external visualizers.** External consumers MUST treat the schema as private and stable only within a single cAgents version.

v12.6.0 dropped the external visualizer-UI contract. Fields documented here are read by cAgents agents (planner, controller, validator) and hooks (verify-completion.cjs, post-compact-restore.cjs, subagent-tracker.cjs, post-write-validator.cjs). Any field NOT listed here is no longer written; see the v12.6.0 CHANGELOG entry for the full removal list. (attention-injection.cjs removed in v12.7.0 per P2-10.)

## Session Directory Structure

Every skill creates a session directory under `cagents-memory/sessions/`:

```
cagents-memory/sessions/{session_id}/
+-- instruction.yaml         # REQUIRED: Session metadata and request
+-- status.yaml              # REQUIRED: Current state and state history
+-- workflow/
|   +-- enriched_context.yaml  # ORCHESTRATED-state output (orchestrator)
|   +-- plan.yaml              # PLANNED-state output (planner)
|   +-- work_items.yaml        # PLANNED-state output (planner)
|   +-- coordination_log.yaml  # COORDINATED-state output (controller)
|   +-- validation_report.yaml # VALIDATED-state output (validator)
|   +-- execution_summary.yaml # /act loop final summary
|   +-- agent_tree.yaml        # Agent spawn tracking (written by hooks)
|   +-- file_changes.log       # File change audit (written by hooks)
+-- outputs/                 # Work item outputs
```

State advancement is driven by each agent's primary output file. The `/act` state machine loop reads these files at level 0 to detect completion and advance state.

## Session ID Format

Format: `{command}_{slug}_{YYMMDD}_{NNN}`

| Component | Description | Example |
|-----------|-------------|---------|
| `command` | Skill prefix | `run`, `team`, `designer` |
| `slug` | 2-6 word kebab-case summary, max 50 chars | `fix-auth-module-jwt` |
| `YYMMDD` | Compact date (2-digit year) | `260317` |
| `NNN` | Auto-increment index per command+date, 3 digits | `001` |

| Skill | Prefix | Example |
|-------|--------|---------|
| /act | `run_` | `run_fix-auth-module-jwt_260317_001` |
| /team | `team_` | `team_implement-oauth2-flow_260317_001` |
| /designer | `designer_` | `designer_redo-session-names_260317_001` |

Slug generation: extract 2-6 key words from user request, kebab-case, strip filler words (the, a, an, to, for, with, and, of). Index: scan `cagents-memory/sessions/` for dirs matching `{command}_*_{YYMMDD}_*`, find highest NNN, increment (start at 001).

Backward compatible: old sessions (`run_20260316_143022`) remain valid. Hook sorting extracts the last 2 underscore segments.

## CAGENTS_SESSION_ID Environment Variable

All skills that create sessions check `process.env.CAGENTS_SESSION_ID` during initialization before auto-generating an ID.

| Condition | Action |
|-----------|--------|
| `CAGENTS_SESSION_ID` not set or empty | Auto-generate session ID using `{command}_{slug}_{YYMMDD}_{NNN}` format |
| `CAGENTS_SESSION_ID` set, directory does not exist | Use env var value verbatim; create new session directory |
| `CAGENTS_SESSION_ID` set, directory already exists | Use env var value; **resume** the existing session |

Use cases (cAgents-internal): parent-skill chaining (e.g., `/team` strategic mode passing an ID to child `/act` invocations), test fixtures with deterministic IDs.

## instruction.yaml (Required)

Every skill writes this file at session creation:

```yaml
session_id: "{SESSION_ID}"                       # REQUIRED: Unique session identifier
session_type: run|team|designer                  # REQUIRED: Skill type
command: /act|/team|/designer                    # REQUIRED: Skill command
request: "{user_request}"                        # REQUIRED: Original user request text
created_at: "{ISO_TIMESTAMP}"                    # REQUIRED: ISO 8601 timestamp — use `date -u +%Y-%m-%dT%H:%M:%SZ`
flags: {parsed_flags}                            # REQUIRED: Object of parsed CLI flags
parent_session_id: "{id}" | null                 # REQUIRED: Parent session if nested, null otherwise
metadata:
  working_directory: "{CWD}"                     # REQUIRED: Working directory at session creation
```

Skill-specific extension:

- **/act**: May include `strategic_brief_path` when invoked with `--brief` from `/team` strategic mode.

## status.yaml (Required)

Tracks the current pipeline/phase state and state history.

### Field Name Mapping

| Skills | Field Name | Rationale |
|--------|-----------|-----------|
| /act | `pipeline_state` | Event-driven pipeline engine with formal state machine |
| /team, /designer | `phase` | Phase-based workflow progression |

Hooks (`session-catchup.cjs`, `verify-completion.cjs`, `post-compact-restore.cjs`) check BOTH `pipeline_state` AND `phase` as fallback.

### Schema (v12.6.0)

```yaml
pipeline_state: "{STATE}"               # /act: INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED
# OR
phase: "{phase}"                        # /team, /designer: phase name

created_at: "{ISO_TIMESTAMP}"           # REQUIRED: Session creation time
revision_cycles: 0                      # /act: revision counter (REC-11). Re-added to
                                        # status.yaml in REC-11 (removed v12.6.0). /act
                                        # increments it on each FAIL/REVISE route-back to
                                        # PLANNED; verify-completion.cjs reads it to enforce
                                        # the max_cycles cap (pipeline_config.yaml, 3).
state_history:                          # REQUIRED: Ordered list of state transitions
  - state: "{STATE_NAME}"               # REQUIRED: State/phase name
    entered_at: "{ISO_TIMESTAMP}"       # REQUIRED: When this state was entered
```

### State Values by Skill

| Skill | States (in order) |
|-------|-------------------|
| /act (v12.0.0+) | INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED, FOLLOWUP_{TYPE}_{N} |
| /team | INIT, (wave states vary; strategic mode adds Wave 0/1/2 prefix when domain_count >= 2) |
| /designer | empathize, define, conceptualize, ideation, refinement, specification |

## Additional Session Files (Skill-Specific)

### /act
- `workflow/enriched_context.yaml` - Orchestrator output (ORCHESTRATED state advancement signal)
- `workflow/plan.yaml` - Planner output: objectives + controller assignment (PLANNED state signal)
- `workflow/work_items.yaml` - Planner output: decomposition
- `workflow/coordination_log.yaml` - Controller output (MUST include `schema_version: "1"`, `implementation_tasks[].agent_id` linking to agent_tree.yaml). COORDINATED state signal.
- `workflow/validation_report.yaml` - Validator output (verdict: PASS/FAIL/REVISE). VALIDATED state signal.
- `workflow/execution_summary.yaml` - **ALWAYS written** by /act at loop exit (success, failure, or interruption)

**Runtime responsibilities of /act state machine** (not delegated to agents):
- Append state_history entry on each transition (state + entered_at)
- Always write `execution_summary.yaml` at pipeline exit
- Persist + increment `revision_cycles` in status.yaml on each FAIL/REVISE route-back to PLANNED (REC-11); at `revision_cycles >= max_cycles` (pipeline_config.yaml, 3) escalate to user (HITL) + finalize `incomplete` instead of re-planning again

### /team
- `team/metrics/timing.yaml` - Team timing metrics
- `team/metrics/parallelism.yaml` - Parallelism and wave metrics
- `workflow/work_items.yaml` - Decomposed work items with wave assignments
- `workflow/child_controllers.yaml` - Controller-to-work-item assignment audit trail
- `outputs/strategic/strategic_brief.yaml` - Final strategic brief (strategic mode only)
- `outputs/strategic/strategic_brief_draft.yaml` - Draft brief before deliberation
- `outputs/strategic/domain_analyses/` - Per-domain C-suite analysis files
- `outputs/strategic/objections/` - Per-C-suite objection files
- `outputs/strategic/routing_decision.yaml` - CEO routing analysis
- `outputs/strategic/domain_dependencies.yaml` - C-suite dependency ordering
- `outputs/integration/integration_report.yaml` - Final integration summary

### /designer
- `question_prep/` - Research agent question preparation per phase
- `phases/` - Per-phase output files
- `artifacts/` - Generated design artifacts
- `waypoints/` - Checkpoint snapshots at phase transitions

## Standardized Artifact Schemas

### tool_failures.yaml (All Skills)

Written by `tool-failure-tracker.cjs` hook on PostToolUseFailure:

```yaml
failures:
  - tool: "Write"                       # REQUIRED: Tool name that failed
    file_path: "/path/to/file"          # OPTIONAL: File path if applicable
    error: "Permission denied"          # REQUIRED: Error message (truncated to 200 chars)
    timestamp: "2026-03-20T05:00:00Z"   # REQUIRED: ISO 8601 timestamp
    agent_id: "executor-1"              # REQUIRED: Agent or session ID
    recoverable: true                   # REQUIRED: Whether failure is recoverable
```

## Hook Integration

Hooks discover active sessions by scanning `cagents-memory/sessions/` for directories matching known prefixes (`run_`, `team_`, `designer_`). The `SESSION_PREFIXES` array in `hook-utils.cjs` defines the active list.

### Key Hook Behaviors

- **session-catchup.cjs** (SessionStart): Detects incomplete sessions by checking status.yaml for non-terminal states.
- **post-compact-restore.cjs** (PostCompact): Reads `pipeline_state` OR `phase` from status.yaml and re-injects mission + phase summary after compaction (replaced `attention-injection.cjs` in v12.7.0).
- **subagent-tracker.cjs** (SubagentStart): Writes to `workflow/agent_tree.yaml`.
- **post-write-validator.cjs** (PostToolUse): Logs to `workflow/file_changes.log`.
- **pre-compact-save.cjs** (PreCompact): Creates waypoints in `waypoints/`.
- **verify-completion.cjs** (Stop): Checks for incomplete pipelines; advances VALIDATED→complete safety net.

### Terminal States

A session is considered complete when its status.yaml state matches one of:
- Lowercase: `completed`, `complete`, `failed`, `aborted`
- Uppercase: `COMPLETE`, `VALIDATED`
- /act: `VALIDATED` (final successful state) or after max revision cycles (3)
- /team: `COMPLETE` (final wave gate validated)

Note: `VALIDATED` may be followed by `FOLLOWUP_{TYPE}_{N}` states if the user provides post-completion feedback. The session re-enters the pipeline and eventually returns to `VALIDATED`. No limit on follow-up rounds.

### Follow-Up Types (/act only, v12.6.0)

| Type | Re-entry Point | Use Case |
|------|----------------|----------|
| `ADJUSTMENT` | PLANNED | Targeted change (rename, tweak, modify) — controller re-runs |
| `REWORK` | ORCHESTRATED | Significant redo (wrong approach, rewrite) — planner re-runs |
| `EXTENSION` | ORCHESTRATED | Add new scope (also add, extend, include) — planner re-decomposes inline |
| `FIX` | PLANNED | Bug fix (broken, error, failing) — controller re-runs |
| `REVIEW` | COORDINATED | Re-validate (check, verify, test) |

---

**This document is the authoritative internal reference for the session file contract. cAgents agents and hooks conform to these schemas; external consumers MUST treat session YAML as private.**

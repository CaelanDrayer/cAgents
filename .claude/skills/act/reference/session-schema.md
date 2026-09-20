# Session Schema Contract (Internal)

Internal contract for the cAgents session YAML. The cAgents hooks and the cAgents agents consume it. **NOT a public API. NOT consumed by external visualizers.** An external consumer MUST treat this schema as private, and as stable only inside a single cAgents version.

v12.6.0 dropped the external visualizer-UI contract. The cAgents agents read the fields that this file documents, and those agents are the planner, the controller and the validator. The hooks read them too, and those hooks are verify-completion.cjs, post-compact-restore.cjs, subagent-tracker.cjs and post-write-validator.cjs. The pipeline no longer writes any field that this file does not list. See the v12.6.0 CHANGELOG entry for the full removal list. v12.7.0 removed attention-injection.cjs, as P2-10 asked.

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

The primary output file of each agent drives the state advancement. The `/act` state machine loop reads these files at level 0. It then detects the completion and advances the state.

## Session ID Format

Format: `{command}_{slug}_{YYMMDD}_{NNN}`

| Component | Description | Example |
|-----------|-------------|---------|
| `command` | Skill prefix | `act`, `team`, `designer` |
| `slug` | 2-6 word kebab-case summary, max 50 chars | `fix-auth-module-jwt` |
| `YYMMDD` | Compact date (2-digit year) | `260317` |
| `NNN` | Auto-increment index per command+date, 3 digits | `001` |

| Skill | Prefix | Example |
|-------|--------|---------|
| /act | `act_` | `act_fix-auth-module-jwt_260317_001` |
| /team | `team_` | `team_implement-oauth2-flow_260317_001` |
| /designer | `designer_` | `designer_redo-session-names_260317_001` |

To generate the slug, extract 2 to 6 key words from the user request. Write them in kebab-case. Strip the filler words, which are the, a, an, to, for, with, and, of.

To generate the index, scan `cagents-memory/sessions/` for the directories that match `{command}_*_{YYMMDD}_*`. Find the highest NNN. Increment it, and start at 001 when you find no directory.

Backward compatible: an old session stays valid, and nothing renames it on disk. Two old shapes qualify. The first is the pre-slug shape `run_20260316_143022`. The second is every `run_`-prefixed session that predates the /run -> /act rename. The hook sorting extracts the last 2 underscore segments.

## CAGENTS_SESSION_ID Environment Variable

Every skill that creates a session checks `process.env.CAGENTS_SESSION_ID` at initialization. It does that check before it auto-generates an ID.

| Condition | Action |
|-----------|--------|
| `CAGENTS_SESSION_ID` not set or empty | Auto-generate session ID using `{command}_{slug}_{YYMMDD}_{NNN}` format |
| `CAGENTS_SESSION_ID` set, directory does not exist | Use env var value verbatim; create new session directory |
| `CAGENTS_SESSION_ID` set, directory already exists | Use env var value; **resume** the existing session |

The use cases are cAgents-internal. The first one is parent-skill chaining. In that case `/team` strategic mode passes an ID to a child `/act` invocation. The second one is a test fixture with a deterministic ID.

## instruction.yaml (Required)

Every skill writes this file at session creation:

```yaml
session_id: "{SESSION_ID}"                       # REQUIRED: Unique session identifier
session_type: act|team|designer                  # REQUIRED: Skill type
command: /act|/team|/designer                    # REQUIRED: Skill command
request: "{user_request}"                        # REQUIRED: Original user request text
created_at: "{ISO_TIMESTAMP}"                    # REQUIRED: ISO 8601 timestamp — use `date -u +%Y-%m-%dT%H:%M:%SZ`
flags: {parsed_flags}                            # REQUIRED: Object of parsed CLI flags
parent_session_id: "{id}" | null                 # REQUIRED: Parent session if nested, null otherwise
metadata:
  working_directory: "{CWD}"                     # REQUIRED: Working directory at session creation
```

Skill-specific extension:

- **/act**: It MAY hold `strategic_brief_path` when `/team` strategic mode invokes it with `--brief`.

## status.yaml (Required)

This file tracks the current pipeline state or phase state, and it tracks the state history.

### Field Name Mapping

| Skills | Field Name | Rationale |
|--------|-----------|-----------|
| /act | `pipeline_state` | Event-driven pipeline engine with formal state machine |
| /team, /designer | `phase` | Phase-based workflow progression |

Three hooks check both `pipeline_state` and `phase` as a fallback. They are `session-catchup.cjs`, `verify-completion.cjs` and `post-compact-restore.cjs`.

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
- `workflow/coordination_log.yaml` - Controller output. It MUST hold `schema_version: "1"` and `implementation_tasks[].agent_id`, which links to agent_tree.yaml. This file is the COORDINATED state signal.
- `workflow/validation_report.yaml` - Validator output, with a verdict of PASS, FAIL or REVISE. This file is the VALIDATED state signal.
- `workflow/execution_summary.yaml` - /act **always writes** this file at loop exit, on success, on failure and on interruption

**Runtime responsibilities of /act state machine**, which it never delegates to an agent:
- Append a state_history entry on each transition, with the state and the entered_at value
- Always write `execution_summary.yaml` at pipeline exit
- Persist `revision_cycles` in status.yaml, and increment it on each FAIL or
  REVISE route-back to PLANNED. This behavior is REC-11. When
  `revision_cycles >= max_cycles`, which pipeline_config.yaml sets to 3,
  escalate to the user through HITL. Then finalize the session as `incomplete`,
  and do not re-plan again.

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

The hooks discover the active sessions when they scan `cagents-memory/sessions/`. They look for a directory that matches a known prefix. The known prefixes are `act_`, `team_`, `designer_`, plus the legacy `run_`. The `SESSION_PREFIXES` array in `hook-utils.cjs` defines the active list.

### Key Hook Behaviors

- **session-catchup.cjs** (SessionStart): It detects an incomplete session when it checks status.yaml for a non-terminal state.
- **post-compact-restore.cjs** (PostCompact): It reads `pipeline_state` or `phase` from status.yaml. It then re-injects the mission and the phase summary after a compaction. It replaced `attention-injection.cjs` in v12.7.0.
- **subagent-tracker.cjs** (SubagentStart): It writes to `workflow/agent_tree.yaml`.
- **post-write-validator.cjs** (PostToolUse): It logs to `workflow/file_changes.log`.
- **pre-compact-save.cjs** (PreCompact): It creates the waypoints in `waypoints/`.
- **verify-completion.cjs** (Stop): It checks for an incomplete pipeline. It also advances VALIDATED→complete as a safety net.

### Terminal States

A session is complete when its status.yaml state matches one of these values:
- Lowercase: `completed`, `complete`, `failed`, `aborted`
- Uppercase: `COMPLETE`, `VALIDATED`
- /act: `VALIDATED` (final successful state) or after max revision cycles (3)
- /team: `COMPLETE` (final wave gate validated)

A `FOLLOWUP_{TYPE}_{N}` state can follow `VALIDATED` when the user gives post-completion feedback. The session then re-enters the pipeline, and it returns to `VALIDATED` in the end. There is no limit on the number of follow-up rounds.

### Follow-Up Types (/act only, v12.6.0)

| Type | Re-entry Point | Use Case |
|------|----------------|----------|
| `ADJUSTMENT` | PLANNED | Targeted change (rename, tweak, modify). The controller re-runs. |
| `REWORK` | ORCHESTRATED | Significant redo (wrong approach, rewrite). The planner re-runs. |
| `EXTENSION` | ORCHESTRATED | Add new scope (also add, extend, include). The planner re-decomposes inline. |
| `FIX` | PLANNED | Bug fix (broken, error, failing). The controller re-runs. |
| `REVIEW` | COORDINATED | Re-validate (check, verify, test) |

---

**This document is the authoritative internal reference for the session file
contract. The cAgents agents and the cAgents hooks conform to these schemas.
An external consumer MUST treat the session YAML as private.**

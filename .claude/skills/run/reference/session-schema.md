# Session Schema Contract

Canonical reference for session YAML files written by all 5 cAgents skills (/run, /team, /designer, /optimize, /review). This is the authoritative schema for AgentPath visualizer developers and hook authors.

## Session Directory Structure

Every skill creates a session directory under `cagents-memory/sessions/`:

```
cagents-memory/sessions/{session_id}/
+-- instruction.yaml    # REQUIRED: Session metadata and request
+-- status.yaml         # REQUIRED: Current state and state history
+-- workflow/
|   +-- events/         # Completion events (EVT-{N}.yaml)
|   +-- agent_tree.yaml # Agent spawn tracking (written by hooks)
|   +-- file_changes.log # File change audit trail (written by hooks)
+-- outputs/            # Work item outputs
```

## Session ID Format

Format: `{command}_{slug}_{YYMMDD}_{NNN}`

> **DEPRECATED in V11.0**: The /review, /optimize, /context, /debug skills were removed in V11.0.
> The `optimize`, `review`, `context`, and `debug` enum entries below (and `optimize_`, `review_`, `context_`, `debug_` session-type prefixes) are PRESERVED for AgentPath FileWatcher backward-compatibility — it consumes
> session_type prefixes from historical session directories on disk. Do NOT remove these values.
> Use /improve --mode review|optimize|full or /run --mode debug for V11+ workflows.
> See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md) for migration guidance.

| Component | Description | Example |
|-----------|-------------|---------|
| `command` | Skill prefix | `run`, `team`, `designer`, `optimize`, `review` |
| `slug` | AI-generated 2-6 word kebab-case summary, max 50 chars | `fix-auth-module-jwt` |
| `YYMMDD` | Compact date (2-digit year) | `260317` |
| `NNN` | Auto-increment index per command+date, 3 digits | `001` |

| Skill | Prefix | Example |
|-------|--------|---------|
| /run | `run_` | `run_fix-auth-module-jwt_260317_001` |
| /team | `team_` | `team_implement-oauth2-flow_260317_001` |
| /designer | `designer_` | `designer_redo-session-names_260317_001` |
| /optimize | `optimize_` | `optimize_reduce-bundle-size_260317_001` |
| /review | `review_` | `review_security-audit-api_260317_001` |

Slug generation: extract 2-6 key words from user request, kebab-case, strip filler words (the, a, an, to, for, with, and, of). Index: scan `cagents-memory/sessions/` for dirs matching `{command}_*_{YYMMDD}_*`, find highest NNN, increment (start at 001).

Backward compatible: old sessions (`run_20260316_143022`) remain valid. The hook sorting logic extracts the last 2 underscore segments, which works for both old and new formats.

## CAGENTS_SESSION_ID Environment Variable

All 6 skills that create sessions (`/run`, `/team`, `/designer`, `/review`, `/optimize`, `/debug`) check `process.env.CAGENTS_SESSION_ID` during session initialization before auto-generating a session ID.

### Behavior

| Condition | Action |
|-----------|--------|
| `CAGENTS_SESSION_ID` not set or empty | Auto-generate session ID using `{command}_{slug}_{YYMMDD}_{NNN}` format |
| `CAGENTS_SESSION_ID` set, directory does not exist | Use env var value as SESSION_ID verbatim; create new session directory and write `instruction.yaml`, `status.yaml`, `agent_tree.yaml` |
| `CAGENTS_SESSION_ID` set, directory already exists | Use env var value as SESSION_ID; **resume** the existing session -- skip creating `instruction.yaml`, `status.yaml`, `agent_tree.yaml` (they already exist) and proceed directly to skill work |

### Use Cases

- **AgentPath integration**: AgentPath spawns skills with a known session ID so it can display the session in the UI before execution begins
- **Pipeline chaining**: Parent skills (e.g., `/team` strategic mode) can pre-create a session ID and pass it to child skills
- **Test fixtures**: Automated tests can inject deterministic session IDs for predictable artifact paths

### Contract for instruction.yaml

When `CAGENTS_SESSION_ID` is set and the directory does not exist (new session), the `session_id` field in `instruction.yaml` MUST match the env var value exactly:

```yaml
session_id: "{CAGENTS_SESSION_ID value}"   # Matches env var verbatim
```

## instruction.yaml (Required, All 6 Skills)

Every skill writes this file with an identical schema at session creation.

> **DEPRECATED in V11.0**: The /review, /optimize, /context, /debug skills were removed in V11.0.
> The `optimize`, `review`, `debug` values in the `session_type` and `command` enums below are PRESERVED
> for AgentPath FileWatcher backward-compatibility — it consumes session_type prefixes from historical
> session directories on disk. Do NOT remove these values.
> Use /improve --mode review|optimize|full or /run --mode debug for V11+ workflows.
> See [docs/MIGRATION-V11.md](../../../../docs/MIGRATION-V11.md) for migration guidance.

```yaml
session_id: "{SESSION_ID}"           # REQUIRED: Unique session identifier
session_type: run|team|designer|optimize|review|debug  # REQUIRED: Skill type
command: /run|/team|/designer|/optimize|/review|/debug  # REQUIRED: Skill command
request: "{user_request}"            # REQUIRED: Original user request text
created_at: "{ISO_TIMESTAMP}"        # REQUIRED: ISO 8601 timestamp — use `date -u +%Y-%m-%dT%H:%M:%SZ` or the injected "Current timestamp", NEVER fabricate
flags: {parsed_flags}                # REQUIRED: Object of parsed CLI flags
parent_session_id: "{id}" | null     # REQUIRED: Parent session if nested, null otherwise
issue_id: "{issue_id}" | null        # OPTIONAL: AgentPath issue ID (set from AGENTPATH_ISSUE_ID env var by session-catchup.cjs)
metadata:
  working_directory: "{CWD}"         # REQUIRED: Working directory at session creation
```

### Skill-Specific Extensions

- **/run**: May include `strategic_brief_path` when invoked with `--brief` from /team strategic mode.
- **/team**: Same as standard.
- **/designer**: Same as standard.
- **/optimize**: Same as standard.
- **/review**: Same as standard.

## status.yaml (Required, All 6 Skills)

Tracks the current pipeline/phase state and full state history with timing.

### Field Name Mapping (CRITICAL)

The state tracking field name varies by skill:

| Skills | Field Name | Rationale |
|--------|-----------|-----------|
| /run | `pipeline_state` | Event-driven pipeline engine with formal state machine |
| /team, /designer, /optimize, /review | `phase` | Phase-based workflow progression |

Hooks (e.g., attention-injection.cjs, session-catchup.cjs) check BOTH `pipeline_state` AND `phase` as fallback to handle this variation.

### Schema

```yaml
pipeline_state: "{STATE}"  # /run: INIT, ORCHESTRATED, PLANNED, etc.
# OR
phase: "{phase}"           # /team, /designer, /optimize, /review: INIT, detection, empathize, etc.

created_at: "{ISO_TIMESTAMP}"        # REQUIRED: Session creation time
state_history:                       # REQUIRED: Ordered list of state transitions
  - state: "{STATE_NAME}"           # REQUIRED: State/phase name
    entered_at: "{ISO_TIMESTAMP}"   # REQUIRED: When this state was entered
    duration_ms: {N} | null         # REQUIRED: Milliseconds in this state (null = current)
```

### State Values by Skill

| Skill | States (in order) |
|-------|-------------------|
| /run (v12.0.0+) | INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED, FOLLOWUP_{TYPE}_{N} |
| /run (pre-v12, historical) | INIT, ORCHESTRATED, PLANNED, DECOMPOSED, PROMPTS_READY, COORDINATED, VALIDATED, FOLLOWUP_{TYPE}_{N} (DECOMPOSED/PROMPTS_READY collapsed into ORCHESTRATED in v12.0.0; archived sessions retain these names) |
| /team | INIT, (wave states vary; strategic mode adds Wave 0/1/2 prefix when domain_count >= 2) |
| /designer | empathize, define, conceptualize, ideation, refinement, specification |
| /optimize | detection, analysis, planning, execution, validation |
| /review | initializing, executing, aggregating, fixing, validating, reporting |

### Skill-Specific Extensions

- **/run**: Includes `revision_round: {N}` for pipeline revision cycles, `validation_cycles: {N}` for total FAIL/REVISE loop count, and `followup_round: {N}` for post-completion follow-ups. Follow-up states use the naming pattern `FOLLOWUP_{TYPE}_{N}` where TYPE is `ADJUSTMENT`, `REWORK`, `EXTENSION`, `FIX`, or `REVIEW`.
- **/team**: No additional fields.
- **/designer**: No additional fields.
- **/optimize**: No additional fields.
- **/review**: No additional fields.

## Additional Session Files (Skill-Specific)

### /run
- `workflow/enriched_context.yaml` - Orchestrator output
- `workflow/plan.yaml` - Universal-planner output: objectives + controller assignment
- `workflow/work_items.yaml` - Universal-planner output: decomposition (v12.0.0: produced inline by universal-planner, not by a separate decomposer agent)
- `workflow/delegation_prompts.yaml` - **HISTORICAL (pre-v12.0.0 only)**. Produced by the prompt-engineer agent before v12. v12 sessions do NOT write this file — controllers fall back to standard delegation prompts. Retained in schema for backward-compat with pre-v12 archived sessions.
- `workflow/coordination_log.yaml` - Controller coordination record (MUST include `schema_version: "1"`, `implementation_tasks[].agent_id` linking to agent_tree.yaml)
- `workflow/validation_report.yaml` - Validator output (PASS/FAIL/REVISE)
- `workflow/execution_summary.yaml` - **ALWAYS written** by /run, even on failure/interruption
- `workflow/events/index.yaml` - **Maintained by /run** — authoritative ordered list of EVT-N events

**Runtime responsibilities of /run state machine** (not delegated to agents):
- Compute `duration_ms` for previous state_history entry at each state transition
- Maintain `events/index.yaml` after reading each completion event
- Always write `execution_summary.yaml` at pipeline exit (success, failure, or interruption)

### /team
- `team/messages/` - Inter-teammate messages
- `team/metrics/timing.yaml` - Team timing metrics
- `team/metrics/parallelism.yaml` - Parallelism and wave metrics
- `workflow/work_items.yaml` - Decomposed work items with wave assignments
- `workflow/wave_structure.yaml` - Wave execution plan with names, items, and gate criteria
- `workflow/child_controllers.yaml` - Controller-to-work-item assignment audit trail
- `workflow/partial_results.yaml` - Partial completion tracking (if applicable)
- `outputs/strategic/strategic_brief.yaml` - Final strategic brief (strategic mode only)
- `outputs/strategic/strategic_brief_draft.yaml` - Draft brief before deliberation (strategic mode only)
- `outputs/strategic/domain_analyses/` - Per-domain C-suite analysis files (strategic mode only)
- `outputs/strategic/objections/` - Per-C-suite objection files (strategic mode only)
- `outputs/strategic/routing_decision.yaml` - CEO routing analysis (strategic mode only)
- `outputs/strategic/domain_dependencies.yaml` - C-suite dependency ordering (strategic mode only)
- `workflow/domain_status.yaml` - Per-domain completion status (strategic mode only)
- `outputs/integration/integration_report.yaml` - Final integration summary (strategic mode only)

### /designer
- `question_prep/` - Research agent question preparation per phase
- `phases/` - Per-phase output files
- `artifacts/` - Generated design artifacts
- `waypoints/` - Checkpoint snapshots at phase transitions

### /optimize
- `workflow/detection_report.yaml` - Optimization type detection
- `workflow/baseline_metrics.yaml` - Before-optimization metrics
- `workflow/opportunities.yaml` - Identified optimization opportunities
- `workflow/plan.yaml` - Prioritized optimization plan
- `workflow/execution_summary.yaml` - Per-optimization results
- `workflow/validation_report.yaml` - Before/after comparison

### /review
- `reports/` - Review report directory
- `reports/aggregate.yaml` - Aggregated findings with confidence scores
- `workflow/scope_analysis.yaml` - Review scope analysis
- `workflow/execution_strategy.yaml` - Parallel execution plan

## Standardized Artifact Schemas

### tool_failures.yaml (All Skills)

Written by `tool-failure-tracker.cjs` hook on PostToolUseFailure events. Standardized schema:

```yaml
# tool_failures.yaml
failures:
  - tool: "Write"               # REQUIRED: Tool name that failed
    file_path: "/path/to/file"  # OPTIONAL: File path if applicable (Write/Edit tools)
    error: "Permission denied"  # REQUIRED: Error message (truncated to 200 chars)
    timestamp: "2026-03-20T05:00:00Z"  # REQUIRED: ISO 8601 timestamp
    agent_id: "executor-1"     # REQUIRED: Agent or session ID
    recoverable: true          # REQUIRED: Whether failure is recoverable (based on taxonomy)
```

### wave_structure.yaml (/team only)

Written by /team lead after decomposition. Documents the wave execution plan:

```yaml
waves:
  - wave: 0
    name: "Foundation"
    items: [TASK-1, TASK-2]
    gate_criteria: "All scaffolding files exist"
  - wave: 1
    name: "Core Implementation"
    items: [TASK-3, TASK-4, TASK-5]
    gate_criteria: "All features implemented"
```

### Event Payload Schema (workflow/events/EVT-*.yaml)

All event files MUST include these standardized fields:

```yaml
event_id: EVT-N                        # REQUIRED: Sequential event ID
type: "state_transition"               # REQUIRED: One of standardized types below
agent_id: "string"                     # REQUIRED: Agent that produced this event
agent_type: "cagents:type"             # REQUIRED: cAgents agent type namespace
timestamp: "ISO8601"                   # REQUIRED: When event occurred
state_from: "STATE"                    # For state_transition type
state_to: "STATE"                      # For state_transition type
payload: {}                            # Type-specific data
```

**Standardized event types:**
- `state_transition` -- Pipeline state change (INIT -> ORCHESTRATED, etc.)
- `agent_spawn` -- Agent spawned via Agent tool
- `agent_complete` -- Agent finished execution
- `validation_fail` -- Validator returned FAIL or REVISE
- `wave_complete` -- Team wave completed (/team only)
- `followup` -- Post-completion follow-up initiated (/run only)

## Hook Integration

Hooks discover active sessions by scanning `cagents-memory/sessions/` for directories matching known prefixes (`run_`, `team_`, `designer_`, `optimize_`, `review_`). The `SESSION_PREFIXES` array in `hook-utils.cjs` must include all active session type prefixes. The legacy `org_` prefix is retained in `hook-utils.cjs` only for backward-compat with archived sessions from pre-v12.2.0; no new sessions are created with that prefix.

### Key Hook Behaviors

- **session-catchup.cjs** (SessionStart): Detects incomplete sessions by checking status.yaml for non-terminal states.
- **attention-injection.cjs** (PreToolUse): Reads `pipeline_state` OR `phase` from status.yaml to determine active state.
- **subagent-tracker.cjs** (SubagentStart): Writes to `workflow/agent_tree.yaml`.
- **post-write-validator.cjs** (PostToolUse): Logs to `workflow/file_changes.log`.
- **pre-compact-save.cjs** (PreCompact): Creates waypoints in `waypoints/`.

### Terminal States

A session is considered complete when its status.yaml state matches one of:
- Lowercase: `completed`, `complete`, `failed`, `aborted`
- Uppercase: `COMPLETE`, `VALIDATED`
- /run: `VALIDATED` (final successful state) or after max revision cycles
- /team: `COMPLETE` (final wave gate validated)

Note: `VALIDATED` may be followed by `FOLLOWUP_{TYPE}_{N}` states if the user provides post-completion feedback. The session re-enters the pipeline and eventually returns to `VALIDATED`. No limit on follow-up rounds.

### Follow-Up Types (/run only, v12.0.0)

| Type | Re-entry Point (v12.0.0) | Use Case |
|------|---------------|----------|
| `ADJUSTMENT` | PLANNED | Targeted change (rename, tweak, modify) — controller re-runs |
| `REWORK` | ORCHESTRATED | Significant redo (wrong approach, rewrite) — planner re-runs |
| `EXTENSION` | ORCHESTRATED | Add new scope (also add, extend, include) — planner re-decomposes inline |
| `FIX` | PLANNED | Bug fix (broken, error, failing) — controller re-runs |
| `REVIEW` | COORDINATED | Re-validate (check, verify, test) |

**v12.0.0 change**: Pre-v12 used `PROMPTS_READY` for ADJUSTMENT/FIX and `DECOMPOSED` for EXTENSION. With those states removed, re-entry now lands at `PLANNED` (controller layer) or `ORCHESTRATED` (planner layer). Pre-v12 archived sessions retain the old re-entry state names in their event logs.

---

## Autonomous Execution Contract

### CAGENTS_SESSION_ID Environment Variable

When AgentPath spawns a cAgents session via `execution-service.ts`, it pre-generates a session ID and passes it to the CLI via the `CAGENTS_SESSION_ID` environment variable:

```
CAGENTS_SESSION_ID=run_fix-auth_260320_001 claude --plugin-dir ${CAGENTS_PLUGIN_DIR} /run "Fix auth module"
```

**Contract**:
- If `CAGENTS_SESSION_ID` is set, all skills (`/run`, `/team`, etc.) MUST use it as the session ID instead of auto-generating one
- This allows AgentPath to link triggered sessions back to the trigger that spawned them
- The variable is set by `execution-service.ts` in the child process environment

### --plugin-dir Flag

AgentPath's `execution-service.ts` always includes `--plugin-dir` when spawning cAgents sessions:

```
claude --plugin-dir ${config.cAgentsPluginDir} /run "request"
```

This ensures the cAgents plugin is loaded and all skills, hooks, and agents are available. Without `--plugin-dir`, spawned sessions would not have access to cAgents capabilities.

**Implementation reference**: `agentpath/server/src/services/execution-service.ts` lines 160-165.

---

**This document is the authoritative reference for the session file contract. All 6 skills and all hooks must conform to these schemas.**

# Session Schema Contract

Canonical reference for session YAML files written by all 6 cAgents skills (/run, /org, /team, /designer, /optimize, /review). This is the authoritative schema for AgentPath visualizer developers and hook authors.

## Session Directory Structure

Every skill creates a session directory under `Agent_Memory/sessions/`:

```
Agent_Memory/sessions/{session_id}/
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

| Component | Description | Example |
|-----------|-------------|---------|
| `command` | Skill prefix | `run`, `org`, `team`, `designer`, `optimize`, `review` |
| `slug` | AI-generated 2-6 word kebab-case summary, max 50 chars | `fix-auth-module-jwt` |
| `YYMMDD` | Compact date (2-digit year) | `260317` |
| `NNN` | Auto-increment index per command+date, 3 digits | `001` |

| Skill | Prefix | Example |
|-------|--------|---------|
| /run | `run_` | `run_fix-auth-module-jwt_260317_001` |
| /org | `org_` | `org_launch-new-product_260317_001` |
| /team | `team_` | `team_implement-oauth2-flow_260317_001` |
| /designer | `designer_` | `designer_redo-session-names_260317_001` |
| /optimize | `optimize_` | `optimize_reduce-bundle-size_260317_001` |
| /review | `review_` | `review_security-audit-api_260317_001` |

Slug generation: extract 2-6 key words from user request, kebab-case, strip filler words (the, a, an, to, for, with, and, of). Index: scan `Agent_Memory/sessions/` for dirs matching `{command}_*_{YYMMDD}_*`, find highest NNN, increment (start at 001).

Backward compatible: old sessions (`run_20260316_143022`) remain valid. The hook sorting logic extracts the last 2 underscore segments, which works for both old and new formats.

## instruction.yaml (Required, All 6 Skills)

Every skill writes this file with an identical schema at session creation.

```yaml
session_id: "{SESSION_ID}"           # REQUIRED: Unique session identifier
session_type: run|org|team|designer|optimize|review  # REQUIRED: Skill type
command: /run|/org|/team|/designer|/optimize|/review  # REQUIRED: Skill command
request: "{user_request}"            # REQUIRED: Original user request text
created_at: "{ISO_TIMESTAMP}"        # REQUIRED: ISO 8601 timestamp
flags: {parsed_flags}                # REQUIRED: Object of parsed CLI flags
parent_session_id: "{id}" | null     # REQUIRED: Parent session if nested, null otherwise
metadata:
  working_directory: "{CWD}"         # REQUIRED: Working directory at session creation
```

### Skill-Specific Extensions

- **/run**: May include `strategic_brief_path` when invoked with `--brief` from /org.
- **/org**: No extensions beyond the standard schema.
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
| /run, /org | `pipeline_state` | Event-driven pipeline engine with formal state machine |
| /team, /designer, /optimize, /review | `phase` | Phase-based workflow progression |

Hooks (e.g., attention-injection.cjs, session-catchup.cjs) check BOTH `pipeline_state` AND `phase` as fallback to handle this variation.

### Schema

```yaml
pipeline_state: "{STATE}"  # /run, /org: INIT, ORCHESTRATED, PLANNED, etc.
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
| /run | INIT, ORCHESTRATED, PLANNED, DECOMPOSED, PROMPTS_READY, COORDINATED, VALIDATED, FOLLOWUP_{TYPE}_{N} |
| /org | INIT, ANALYZED, DELIBERATED, BRIEFED, EXECUTED, INTEGRATED, COMPLETE |
| /team | INIT, (wave states vary) |
| /designer | empathize, define, conceptualize, ideation, refinement, specification |
| /optimize | detection, analysis, planning, execution, validation |
| /review | initializing, executing, aggregating, fixing, validating, reporting |

### Skill-Specific Extensions

- **/run**: Includes `revision_round: {N}` for pipeline revision cycles and `followup_round: {N}` for post-completion follow-ups. Follow-up states use the naming pattern `FOLLOWUP_{TYPE}_{N}` where TYPE is `ADJUSTMENT`, `REWORK`, `EXTENSION`, `FIX`, or `REVIEW`.
- **/org**: No additional fields.
- **/team**: No additional fields.
- **/designer**: No additional fields.
- **/optimize**: No additional fields.
- **/review**: No additional fields.

## Additional Session Files (Skill-Specific)

### /run
- `workflow/enriched_context.yaml` - Orchestrator output
- `workflow/plan.yaml` - Planner output with objectives, controller assignment
- `workflow/work_items.yaml` - Decomposer output
- `workflow/delegation_prompts.yaml` - Prompt-engineer output (aspirational — may not exist in all sessions)
- `workflow/coordination_log.yaml` - Controller coordination record (MUST include `schema_version: "1"`)
- `workflow/validation_report.yaml` - Validator output (PASS/FAIL/REVISE)
- `workflow/execution_summary.yaml` - **ALWAYS written** by /run, even on failure/interruption
- `workflow/events/index.yaml` - **Maintained by /run** — authoritative ordered list of EVT-N events

**Runtime responsibilities of /run state machine** (not delegated to agents):
- Compute `duration_ms` for previous state_history entry at each state transition
- Maintain `events/index.yaml` after reading each completion event
- Always write `execution_summary.yaml` at pipeline exit (success, failure, or interruption)

### /org
- `routing_decision.yaml` - CEO routing analysis
- `domain_dependencies.yaml` - C-suite dependency ordering
- `strategic_brief_draft.yaml` - Draft brief before deliberation
- `strategic_brief.yaml` - Final strategic brief
- `domain_analyses/` - Per-domain C-suite analysis files
- `objections/` - Per-C-suite objection files
- `integration_report.yaml` - Final integration summary

### /team
- `team/messages/` - Inter-teammate messages
- `team/metrics/timing.yaml` - Team timing metrics
- `team/metrics/parallelism.yaml` - Parallelism and wave metrics
- `workflow/work_items.yaml` - Decomposed work items with wave assignments
- `workflow/partial_results.yaml` - Partial completion tracking (if applicable)

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

## Hook Integration

Hooks discover active sessions by scanning `Agent_Memory/sessions/` for directories matching known prefixes (`run_`, `org_`, `team_`, `designer_`, `optimize_`, `review_`). The `SESSION_PREFIXES` array in `hook-utils.cjs` must include all session type prefixes.

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
- /org: `COMPLETE`

Note: `VALIDATED` may be followed by `FOLLOWUP_{TYPE}_{N}` states if the user provides post-completion feedback. The session re-enters the pipeline and eventually returns to `VALIDATED`. No limit on follow-up rounds.

### Follow-Up Types (/run only)

| Type | Re-entry Point | Use Case |
|------|---------------|----------|
| `ADJUSTMENT` | PROMPTS_READY | Targeted change (rename, tweak, modify) |
| `REWORK` | PLANNED | Significant redo (wrong approach, rewrite) |
| `EXTENSION` | DECOMPOSED | Add new scope (also add, extend, include) |
| `FIX` | PROMPTS_READY | Bug fix (broken, error, failing) |
| `REVIEW` | COORDINATED | Re-validate (check, verify, test) |

---

**This document is the authoritative reference for the session file contract. All 6 skills and all hooks must conform to these schemas.**

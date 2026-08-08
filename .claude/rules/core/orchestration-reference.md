---
paths:
  - "agents/core/orchestrator/**"
  - "agents/core/planner/**"
  - "agents/core/router/**"
  - "agents/core/execution-monitor/**"
  - "agents/core/validator/**"
  - "agents/core/self-correct/**"
  - ".claude/skills/act/**"
  - "cagents-memory/_system/config/**"
---

# Orchestration Reference Details

Detailed schemas, examples, and protocols for pipeline orchestration. See `orchestration.md` for core rules.

## enriched_context.yaml Schema (V10.6.0)

```yaml
domain: {detected_domain}
tier: {classified_tier}
project_summary: "{1-2 sentence project description from _projects/{hash}/product_context.yaml}"
constraints: [...]
project_context:
  codebase_type: "{type}"
  key_patterns: [...]
  relevant_files: [...]
enrichment_summary: "{brief_summary_of_context}"
```

> **DEPRECATED in V11.0**: The /review, /optimize, /context, /debug skills were removed in V11.0.
> The `/context init` reference below is PRESERVED for archived-session back-compat — hooks consume
> session_type prefixes from historical session directories on disk. Do NOT remove these
> values. Use `/run review`, `/run optimize`, `/run improve` (v12.1.2+ keyword router) or `/run --mode debug` for V12+ workflows. (`/improve` was folded into `/run` via the keyword router in v12.1.2; the historical `/improve --mode review|optimize|full` syntax no longer exists.)
> See [docs/MIGRATION-V11.md](../../../docs/MIGRATION-V11.md) for migration guidance.

The `project_summary` field is loaded from `cagents-memory/_projects/{hash}/product_context.yaml` if it exists (created via `/context init`). Must fit within MAX_ATTENTION_CHARS budget (500 chars).

## Pipeline Configuration

The state machine is defined in `cagents-memory/_system/config/pipeline_config.yaml`:

```yaml
states:
  INIT:
    agent: cagents:orchestrator
    next: ORCHESTRATED
    outputs: [enriched_context.yaml]
  ORCHESTRATED:
    agent: cagents:planner
    next: PLANNED
    inputs: [enriched_context.yaml]
    outputs: [plan.yaml]
  # ... (see pipeline_config.yaml for full definition)

revision:
  max_cycles: 3
  on_fail: PLANNED
  on_revise: PLANNED
  escalation: user_hitl
```

## Event Files (HISTORICAL — removed in v12.6.0)

> **DEPRECATED in v12.6.0**: `workflow/events/EVT-{N}.yaml` emission was removed.
> The shape below is preserved for archived pre-v12.6 sessions that retain
> `workflow/events/` on disk. New sessions do NOT create `workflow/events/` and
> do NOT emit EVT files. **Current state-advancement signal**: each pipeline
> agent's primary output file (`enriched_context.yaml`, `plan.yaml`,
> `coordination_log.yaml`, `validation_report.yaml`), which the `/run` loop reads
> at level 0. The EVT files were external-UI-only signals — no cAgents hook or
> agent ever consumed them — which is why the emission was dropped. See
> `.claude/skills/run/reference/state-machine-detail.md` (Historical note).

Pre-v12.6, each pipeline agent wrote a completion event to `workflow/events/EVT-{N}.yaml`:

```yaml
event_id: EVT-1
state: ORCHESTRATED
agent: cagents:orchestrator
timestamp: "{ISO_TIMESTAMP}"
inputs_consumed: [instruction.yaml]
outputs_produced: [workflow/enriched_context.yaml]
next_state: ORCHESTRATED
```

## Handoff Documents Protocol (V10.6.0)

Each pipeline stage writes a handoff document to `workflow/handoffs/{STATE}.md`.

### Handoff Document Format

```markdown
# Handoff: {STAGE_NAME}
Generated: {ISO_TIMESTAMP}
Agent: cagents:{agent_name}

## Summary
{1-3 sentence summary of what this stage accomplished}

## Key Outputs
- {output_file_1}: {what it contains}

## Decisions Made
- {decision_1}: {rationale}

## Context for Next Stage
- {key_context_1}

## Warnings/Risks
- {any_issues_the_next_stage_should_know}
```

### Rules
- Handoff documents are APPEND-ONLY (never overwrite previous stages' handoffs)
- Keep handoffs under 500 tokens
- Next-stage agents SHOULD read the preceding handoff before starting

## Signal File Intervention Protocol

The pipeline supports graceful intervention via signal files at `cagents-memory/sessions/{session_id}/signals/`.

| Signal | Effect | State Machine Action |
|--------|--------|---------------------|
| `PAUSE` | Pause pipeline | Complete current agent, write waypoint, wait for RESUME |
| `STOP` | Graceful stop | Complete current agent, write final status, mark session paused |
| `RESUME` | Resume paused pipeline | Remove PAUSE signal, continue from last completed state |

### State Machine Check (before each transition)

```
before_transition(current_state, next_state):
  signals_dir = session_dir/signals/
  if exists(signals_dir/STOP):
    write_waypoint(current_state)
    update_status(phase: "paused", paused_at: current_state)
    EXIT pipeline

  if exists(signals_dir/PAUSE):
    write_waypoint(current_state)
    WAIT until exists(signals_dir/RESUME)
    CONTINUE to next_state
```

### User Interaction

```bash
touch cagents-memory/sessions/{session_id}/signals/PAUSE   # Pause
touch cagents-memory/sessions/{session_id}/signals/STOP     # Stop
touch cagents-memory/sessions/{session_id}/signals/RESUME   # Resume
```

### Pipeline Config Integration

```yaml
signals:
  enabled: true
  check_interval: before_transition
  signal_dir: signals/
  supported: [PAUSE, STOP, RESUME]
```

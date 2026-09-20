---
paths:
  - "agents/orchestrator/**"
  - "agents/planner/**"
  - "agents/router/**"
  - "agents/execution-monitor/**"
  - "agents/validator/**"
  - "agents/self-correct/**"
  - ".claude/skills/act/**"
  - "cagents-memory/_system/config/**"
---

# Orchestration Reference Details

This file holds the detailed schemas, the examples, and the protocols for
pipeline orchestration. See `orchestration.md` for the core rules.

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

> **DEPRECATED in V11.0**: V11.0 removed the /review, /optimize, /context, and
> /debug skills. The `/context init` reference below stays for archived-session
> back-compat. Hooks read session_type prefixes from the historical session
> directories on disk. Do not remove these values. For a V12+ workflow, use
> `/act review`, `/act optimize`, `/act improve`, or `/act --mode debug`. The
> keyword router that v12.1.2 added accepts the first three forms. That router
> also folded `/improve` into `/act`, which carried the name `/run` before v12.
> The historical `/improve --mode review|optimize|full` syntax no longer
> exists. See [docs/MIGRATION-V11.md](../../../docs/MIGRATION-V11.md) for
> migration guidance.

If `cagents-memory/_projects/{hash}/product_context.yaml` exists, the
orchestrator loads the `project_summary` field from that file. The
`/context init` command created the file. The field must fit in the
MAX_ATTENTION_CHARS budget of 500 characters.

## Pipeline Configuration

`cagents-memory/_system/config/pipeline_config.yaml` defines the state machine:

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

## Event Files (HISTORICAL, removed in v12.6.0)

> **DEPRECATED in v12.6.0**: v12.6.0 removed the `workflow/events/EVT-{N}.yaml`
> emission. This file keeps the shape below for the archived pre-v12.6 sessions
> that hold `workflow/events/` on disk. A new session does not create
> `workflow/events/`, and it does not emit an EVT file. **Current
> state-advancement signal**: the primary output file of each pipeline agent.
> Those files are `enriched_context.yaml`, `plan.yaml`,
> `coordination_log.yaml`, and `validation_report.yaml`. The `/act` loop reads
> them at level 0. The EVT files were signals for an external user interface
> only. No cAgents hook and no cAgents agent ever read them, so v12.6.0 dropped
> the emission. See `.claude/skills/act/reference/state-machine-detail.md`
> (Historical note).

Before v12.6, each pipeline agent wrote a completion event to
`workflow/events/EVT-{N}.yaml`:

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

Each pipeline stage writes a handoff document to
`workflow/handoffs/{STATE}.md`.

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

- A handoff document is append-only. Never overwrite the handoff of an earlier
  stage.
- Keep each handoff under 500 tokens.
- The agent of the next stage should read the preceding handoff before it
  starts the work.

## Signal File Intervention Protocol

The pipeline accepts a graceful intervention through a signal file. The signal
files are in `cagents-memory/sessions/{session_id}/signals/`.

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

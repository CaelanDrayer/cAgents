# /act Delegation Patterns (v12.0.0 — 5-State Pipeline)

## Delegation Chain (v12.0.0)

The event-driven pipeline architecture uses a 5-state machine with sequential enrichment and nested controller execution:

```
/act (state machine loop, level 0)
  +-> orchestrator (level 1)         -> enriched_context.yaml
  +-> planner (level 1)    -> plan.yaml + work_items.yaml (decomposition inline)
  +-> controller (level 1)
       +-> executor (level 2)        -> implementation
       +-> reviewer (level 2)        -> review_report.yaml
  +-> validator (level 1)            -> validation_report.yaml (PASS/FAIL/REVISE)
```

**v12.0.0 collapse**: `task-decomposer` and `prompt-engineer` no longer exist as separate stages. `cagents:planner` produces both `plan.yaml` and `work_items.yaml` inline. Controllers fall back to standard delegation prompts (no `delegation_prompts.yaml` artifact).

## What /act Does Inline (v12.0.0)

| Phase | Agent | Output |
|-------|-------|--------|
| **INIT** | orchestrator | enriched_context.yaml |
| **ORCHESTRATED** | planner | plan.yaml + work_items.yaml |
| **PLANNED** | controller (from plan.yaml) | coordination_log.yaml |
| **COORDINATED** | validator | validation_report.yaml |
| **VALIDATED** | (terminal) | execution_summary.yaml |

## Progressive Pipeline (3 Paths, v12.0.0)

Complexity scoring (9 weighted signals) determines which states to execute:

| Path | Score | States | Description |
|------|-------|--------|-------------|
| **Minimal** | < 0.25 | PLANNED -> COORDINATED | Simple tasks, controller only (~2 agents) |
| **Medium** | 0.25-0.65 | ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | Moderate tasks (~3 agents) |
| **Full** | > 0.65 | All 5 states | Complex tasks, all agents |

Pre-v12 paths referenced DECOMPOSED and PROMPTS_READY; those states no longer exist and the corresponding agents (decomposer, prompt-engineer) have been folded into planner.

## Debug-Mode Prefix Injection (V10.26.13+)

When `/act` is invoked with `--mode debug`, the **PLANNED** state controller
spawn gets a prepended prefix block from
`.claude/skills/act/reference/debug-mode-prompt.md`. The injection point is
the controller spawn prompt only — enrichment agents (orchestrator,
planner) are unaffected. When
`flags.mode === "standard"` (default), no prefix is added and behavior is
identical to V10.26.12.

See @debug-mode-prompt.md for the prefix text and sentinel requirements.

## Controller Delegation

The controller is selected from plan.yaml's `controller_assignment.primary`:

```javascript
Agent({
  subagent_type: "cagents:{controller_name}",
  description: "Coordinate: {request}",
  prompt: `
    Request: {user_request}
    Session: cagents-memory/sessions/{SESSION_ID}/
    Domain: {domain} | Tier: {tier}
    Read plan.yaml and work_items.yaml.
    Coordinate via question-based delegation to execution agents.
    Spawn cagents:reviewer after each executor completes (max 3 rounds).
    Write coordination_log.yaml when complete.
  `
})
```

## Controller Internal Loop

```
Controller (level 1):
  for each work item:
    1. Spawn execution agent via Agent tool (level 2)
    2. Spawn reviewer via Agent tool (level 2)
    3. If REVISE: re-spawn executor with feedback (max 3 rounds)
    4. If PASS after round 3: mark as dead_letter
  Write coordination_log.yaml
```

## Domain-to-Controller Mapping

| Request Type | Domain | Controller |
|-------------|--------|-----------|
| "Fix auth bug" | Engineering | tech-lead |
| "Write fantasy story" | Creative | narrative-director |
| "Plan Q4 campaign" | Growth | marketing-strategist |
| "Create budget" | Business | operations-manager / finance-manager |
| "Hire software engineer" | People | hr-manager |
| "Handle customer complaint" | Service | customer-success-manager |

## Revision Routing (v12.0.0)

| Validator Output | Route To | Description |
|-----------------|----------|-------------|
| PASS | Complete | Pipeline finished |
| FAIL | PLANNED | Re-run controller with feedback |
| REVISE | PLANNED | Re-plan (planner re-runs, may also re-run orchestrator) |

Max 3 revision cycles (lowered from 5 in v12.0.0) before escalation to user.

## Team Mode Delegation

For `--team`, /act delegates to the `cagents:team-bootstrap` agent which creates a real team (the standalone `team-trigger` agent was removed in v12.0.0; the `/team` skill loop now does this work inline. `team-bootstrap` was renamed from the former `team` name in v12.53.0):

```javascript
Agent({
  subagent_type: "cagents:team-bootstrap",
  description: "Team: {request}",
  prompt: `
    Request: {request}
    Session: cagents-memory/sessions/{SESSION_ID}/
    Mode: team_execution
    Plan at: workflow/plan.yaml
    Work items at: workflow/work_items.yaml
  `
})
```

## Session Structure (v12.0.0)

```
cagents-memory/sessions/run_{slug}_{YYMMDD}_{NNN}/
+-- instruction.yaml
+-- status.yaml
+-- workflow/
|   +-- enriched_context.yaml
|   +-- plan.yaml
|   +-- work_items.yaml
|   +-- coordination_log.yaml
|   +-- validation_report.yaml
|   +-- agent_tree.yaml
|   +-- events/EVT-*.yaml
|   +-- handoffs/*.md
+-- outputs/
```

Pre-v12 sessions also wrote `workflow/delegation_prompts.yaml` (produced by prompt-engineer). v12 sessions omit this file; controllers fall back to standard delegation prompts.

## Configuration Files

| Config | Path | Purpose |
|--------|------|---------|
| Pipeline config | `cagents-memory/_system/config/pipeline_config.yaml` | State machine definition (5 states) |
| Domain overrides | `{domain}/config/domain_overrides.yaml` | Controller catalog |
| Domain detection | Keywords in SKILL.md (inline) | Domain routing |

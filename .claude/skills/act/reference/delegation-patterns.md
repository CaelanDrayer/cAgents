# /act Delegation Patterns (v12.0.0 — 5-State Pipeline)

## Delegation Chain (v12.0.0)

The event-driven pipeline uses a machine of 5 states. It runs the enrichment agents in sequence, and it nests the controller execution below them:

```
/act (state machine loop, level 0)
  +-> orchestrator (level 1)         -> enriched_context.yaml
  +-> planner (level 1)    -> plan.yaml + work_items.yaml (decomposition inline)
  +-> controller (level 1)
       +-> executor (level 2)        -> implementation
       +-> reviewer (level 2)        -> review_report.yaml
  +-> validator (level 1)            -> validation_report.yaml (PASS/FAIL/REVISE)
```

**v12.0.0 collapse**: `task-decomposer` and `prompt-engineer` no longer exist as separate stages. `cagents:planner` produces both `plan.yaml` and `work_items.yaml` inline. Controllers fall back to the standard delegation prompts, and the pipeline writes no `delegation_prompts.yaml` artifact.

## What /act Does Inline (v12.0.0)

| Phase | Agent | Output |
|-------|-------|--------|
| **INIT** | orchestrator | enriched_context.yaml |
| **ORCHESTRATED** | planner | plan.yaml + work_items.yaml |
| **PLANNED** | controller (from plan.yaml) | coordination_log.yaml |
| **COORDINATED** | validator | validation_report.yaml |
| **VALIDATED** | (terminal) | execution_summary.yaml |

## Progressive Pipeline (3 Paths, v12.0.0)

A complexity score of 9 weighted signals determines which states to execute:

| Path | Score | States | Description |
|------|-------|--------|-------------|
| **Minimal** | < 0.25 | PLANNED -> COORDINATED | Simple tasks, controller only (~2 agents) |
| **Medium** | 0.25-0.65 | ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED | Moderate tasks (~3 agents) |
| **Full** | > 0.65 | All 5 states | Complex tasks, all agents |

The pre-v12 paths referred to DECOMPOSED and to PROMPTS_READY. Neither state exists today. The planner absorbed the two agents that served them, which were the decomposer and the prompt-engineer.

## Debug-Mode Prefix Injection (V10.26.13+)

When you run `/act` with `--mode debug`, the controller spawn in the
**PLANNED** state gets a prefix block at its head. That block comes from
`.claude/skills/act/reference/debug-mode-prompt.md`. The controller spawn
prompt is the only injection point. The enrichment agents get no prefix, and
those agents are the orchestrator and the planner. When
`flags.mode === "standard"`, which is the default, the pipeline adds no prefix, and
the behavior matches V10.26.12.

See @debug-mode-prompt.md for the prefix text and for the sentinel rules.

## Controller Delegation

The pipeline selects the controller from `controller_assignment.primary` in plan.yaml:

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

The pipeline allows a maximum of 3 revision cycles, and v12.0.0 lowered that limit from 5. After the third cycle, the pipeline escalates to the user.

## Team Mode Delegation

For `--team`, /act delegates to the `cagents:team-bootstrap` agent, and that agent creates a real team. The v12.0.0 bump removed the standalone `team-trigger` agent, so the `/team` skill loop now does that work inline. The v12.53.0 bump renamed `team-bootstrap` from its former `team` name. The delegation call is:

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
cagents-memory/sessions/act_{slug}_{YYMMDD}_{NNN}/
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

A session from before v12 also wrote `workflow/delegation_prompts.yaml`, and the prompt-engineer produced that file. A v12 session omits the file. Controllers fall back to the standard delegation prompts.

## Configuration Files

| Config | Path | Purpose |
|--------|------|---------|
| Pipeline config | `cagents-memory/_system/config/pipeline_config.yaml` | State machine definition (5 states) |
| Domain overrides | `{domain}/config/domain_overrides.yaml` | Controller catalog |
| Domain detection | Keywords in SKILL.md (inline) | Domain routing |

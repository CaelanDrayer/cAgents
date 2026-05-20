# /run Delegation Patterns (V9.23+ Event-Driven Pipeline)

## Delegation Chain (V9.23)

The event-driven pipeline architecture uses a state machine with sequential enrichment agents and nested controller execution:

```
/run (state machine loop, level 0)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
  +-> validator (level 1)       -> validation_report.yaml (PASS/FAIL/REVISE)
```

## What /run Does Inline

| Phase | Agent | Output |
|-------|-------|--------|
| **INIT** | orchestrator | enriched_context.yaml |
| **ORCHESTRATED** | universal-planner | plan.yaml |
| **PLANNED** | task-decomposer | work_items.yaml |
| **DECOMPOSED** | prompt-engineer | delegation_prompts.yaml |
| **PROMPTS_READY** | controller (from plan.yaml) | coordination_log.yaml |
| **COORDINATED** | universal-validator | validation_report.yaml |

## Progressive Pipeline (3 Paths)

Complexity scoring (9 weighted signals) determines which states to execute:

| Path | Score | States | Description |
|------|-------|--------|-------------|
| **Minimal** | < 0.25 | PLANNED -> PROMPTS_READY -> COORDINATED | Simple tasks, ~3 agents |
| **Medium** | 0.25-0.65 | PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED | Moderate tasks, ~4 agents |
| **Full** | > 0.65 | All 7 states | Complex tasks, all agents |

## Debug-Mode Prefix Injection (V10.26.13+)

When `/run` is invoked with `--mode debug`, the PROMPTS_READY controller
spawn gets a prepended prefix block from
`.claude/skills/run/reference/debug-mode-prompt.md`. The injection point is
the controller spawn prompt only — enrichment agents (orchestrator,
planner, decomposer, prompt-engineer) are unaffected. When
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
| "Plan Q4 campaign" | Growth | campaign-manager / marketing-strategist |
| "Create budget" | Business | operations-manager / finance-manager |
| "Hire software engineer" | People | hr-manager |
| "Handle customer complaint" | Service | customer-success-manager |

## Revision Routing

| Validator Output | Route To | Description |
|-----------------|----------|-------------|
| PASS | Complete | Pipeline finished |
| FAIL | PROMPTS_READY | Re-run controller with feedback |
| REVISE | PLANNED | Re-plan (more fundamental issue) |

Max 5 revision cycles before escalation to user.

## Team Mode Delegation

For `--team`, /run delegates to team-trigger which creates a real team:

```javascript
Agent({
  subagent_type: "cagents:team-trigger",
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

## Session Structure

```
cagents-memory/sessions/run_{slug}_{YYMMDD}_{NNN}/
+-- instruction.yaml
+-- status.yaml
+-- workflow/
|   +-- enriched_context.yaml
|   +-- plan.yaml
|   +-- work_items.yaml
|   +-- delegation_prompts.yaml
|   +-- coordination_log.yaml
|   +-- validation_report.yaml
|   +-- agent_tree.yaml
|   +-- events/EVT-*.yaml
|   +-- handoffs/*.md
+-- outputs/
```

## Configuration Files

| Config | Path | Purpose |
|--------|------|---------|
| Pipeline config | `cagents-memory/_system/config/pipeline_config.yaml` | State machine definition |
| Domain overrides | `{domain}/config/domain_overrides.yaml` | Controller catalog |
| Domain detection | Keywords in SKILL.md (inline) | Domain routing |

# /run Delegation Patterns (Flattened Architecture)

## Delegation Chain (V9.18)

The flattened architecture reduces the delegation chain from 5 levels to 2:

**Previous** (5 levels -- unreliable, frequent failures):
```
/run -> trigger -> orchestrator -> controller -> execution_agents
```

**Current** (2 levels -- reliable):
```
/run (inline: routing + planning + orchestration) -> controller -> execution_agents
```

## What /run Does Inline

| Phase | Previously | Now |
|-------|-----------|-----|
| **Routing** | trigger + universal-router (2 agents) | /run inline |
| **Planning** | orchestrator + universal-planner (2 agents) | /run inline |
| **Orchestration** | orchestrator (1 agent) | /run inline |
| **Coordination** | controller (1 agent) | controller via Task tool |
| **Execution** | execution agents (N agents) | execution agents via controller |
| **Validation** | universal-validator (1 agent) | /run inline (basic checks) |

## Why Flattened?

The 5-level chain caused systematic failures:
1. **Task tool unavailability**: The Task tool for spawning subagents was not always available at every nesting level
2. **Context exhaustion**: Each nesting level consumed context, leaving less for actual work
3. **Session tracking failures**: Deeply nested agents couldn't always find/write to session files
4. **Agent type confusion**: All agents appeared as "general-purpose" at every level
5. **Incomplete workflows**: Most sessions ended with empty workflow directories

## Controller Delegation

The only Task tool delegation is to the controller:

```javascript
Task({
  subagent_type: "cagents:{controller_name}",
  description: "Coordinate: {request}",
  prompt: `
    Request: {user_request}
    Session: Agent_Memory/sessions/{SESSION_ID}/
    Domain: {domain} | Tier: {tier}
    Read plan.yaml for objectives and work items.
    Coordinate via question-based delegation to execution agents.
    Write coordination_log.yaml when complete.
  `
})
```

## Domain-to-Controller Mapping

| Request Type | Domain | Controller |
|-------------|--------|-----------|
| "Fix auth bug" | Make (engineering) | engineering-manager |
| "Write fantasy story" | Make (creative) | creative-director |
| "Plan Q4 campaign" | Grow | campaign-manager / marketing-strategist |
| "Create budget" | Operate | finance-manager / cfo |
| "Hire software engineer" | People | hr-manager |
| "Handle customer complaint" | Serve | customer-success-manager |
| "Design game mechanics" | Make (game dev) | game-designer |

## Team Mode Delegation

For `--team`, /run still performs routing + planning inline, then delegates to team-trigger:

```javascript
Task({
  subagent_type: "cagents:team-trigger",
  description: "Team: {request}",
  prompt: `
    Request: {request}
    Session: Agent_Memory/sessions/{SESSION_ID}/
    Mode: team_execution
    Plan already created at: workflow/plan.yaml
    Decomposition at: workflow/decomposition.yaml
  `
})
```

## Configuration Files

| Config | Path | Purpose |
|--------|------|---------|
| Planner configs | `{domain}/config/planner_config.yaml` | Controller catalog |
| Domain detection | Keywords in SKILL.md (inline) | Domain routing |

## Session Structure

```
Agent_Memory/sessions/run_{YYYYMMDD_HHMMSS}/
+-- instruction.yaml         # Written by /run (Step 2)
+-- status.yaml              # Written by /run (Step 2, updated throughout)
+-- workflow/
|   +-- plan.yaml            # Written by /run (Step 4)
|   +-- decomposition.yaml   # Written by /run (Step 4, tier 3+)
|   +-- coordination_log.yaml # Written by controller (Step 5)
|   +-- agent_tree.yaml      # Written by SubagentStart hook
+-- outputs/
+-- validation/
```

## Important Notes

- /run performs routing, planning, and orchestration -- these do NOT need subagent delegation
- The controller is the ONLY subagent spawned by /run in standard mode
- The controller spawns execution agents (1 level of nesting under the controller)
- Total nesting depth: /run (level 0) -> controller (level 1) -> execution agents (level 2)
- This is well within Claude Code's subagent nesting limits

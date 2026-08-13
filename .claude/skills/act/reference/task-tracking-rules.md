# Task Tracking Rules and Validation Pattern

How /act uses TaskCreate/TaskUpdate (or TodoWrite in SDK) at every state transition.

## Core Rules

1. **/act calls TaskCreate/TaskUpdate at every state transition** -- minimum once per state.
2. **Each task call happens BEFORE advancing to the next state.**
3. **The controller also calls TaskCreate** when it identifies execution agents (progressive refinement).
4. **No slash prefix on command names**: Use `[act]`, `[team]` -- not `[/act]`, `[/team]`. (Pre-v12.2.0 also `[org]`; v12.2.0 removed /org.)
5. **[parent > child] on spawn, child-only for sub-tasks**: When spawning an agent, use `[act > orchestrator]`. For that agent's own sub-tasks, use just `[orchestrator]`.
6. **2-space indent for children**: Sub-tasks under a parent entry are indented with 2 spaces.
7. **Include contextual detail**: Add domain, tier, counts, controller names, wave numbers -- e.g., `[act > planner] Planning approach\n  [planner] Controller: tech-lead`.
8. **Granular sub-tasks per agent**: Each agent gets 1-2 sub-tasks showing real progress, not just a single line.
9. **Never have zero tasks `in_progress`** -- always transition one to `completed` and the next to `in_progress` in the same call.
10. **On revision, add a revision entry** showing round number and what is being re-executed.
11. **Never expose internal state machine names** (INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED) as primary task subject content. Users see these entries in the UI -- they should communicate meaningful work being done.

## TaskCreate vs TodoWrite

Per [docs.claude.com/docs/en/tools.md](https://docs.claude.com/docs/en/tools.md):
- **Interactive Claude Code**: use `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`. cAgents primarily runs interactively, so TaskCreate is the mandatory primary call.
- **Agent SDK / non-interactive**: `TodoWrite` is the equivalent fallback.

If you skip the task call, the workflow is broken -- the user has zero visibility into what is happening.

## Initial TaskCreate at Pipeline Start (v12.0.0 — 5 states)

```
TodoWrite([
  {"content": "[act > orchestrator] Analyzing request & detecting domain\n  [orchestrator] Enriching context ({domain}, tier {N})\n  [act] Pre-flight validation: enriched_context.yaml schema valid, domain confirmed", "status": "in_progress", "id": "init"},
  {"content": "[act > planner] Planning objectives, decomposing work items, selecting controller\n  [planner] Controller selected: {controller_name}\n  [planner] {N} work items created ({N} parallel groups)\n  [act] Plan validation: objectives have success_criteria, controller assigned, all WIs have acceptance_criteria, DAG acyclic", "status": "pending", "id": "orchestrated"},
  {"content": "[act > {controller}] Coordinating implementation\n  [{controller} > {executor}] Implementing: {description}\n  [{controller}] Synthesizing solution\n  [act] Coordination validation: all WIs completed with evidence, no stale in_progress items", "status": "pending", "id": "planned"},
  {"content": "[act > validator] Validating against {N} acceptance criteria\n  [act] Final validation: traceability 100%, evidence score >= 2.0, schema checks passed", "status": "pending", "id": "coordinated"},
  {"content": "[act] Pipeline complete -- all validation gates passed", "status": "pending", "id": "validated"}
])
```

## Tier 2 Fast Path Tasks (Adaptive Pipeline, v12.0.0)

```
TodoWrite([
  {"content": "[act] Context enriched inline ({domain}, tier 2 fast path)\n  [act] Pre-flight validation: enriched_context.yaml valid, domain confirmed", "status": "completed", "id": "init"},
  {"content": "[act > planner] Planning & decomposition (inline)\n  [planner] Controller: {controller_name}\n  [act] Plan validation: objectives have success_criteria, controller assigned, work items have criteria", "status": "in_progress", "id": "orchestrated"},
  {"content": "[act > {controller}] Coordinating implementation\n  [{controller} > {executor}] Implementing: {description}\n  [{controller}] Solution synthesized\n  [act] Coordination validation: all WIs completed with evidence, no stale items", "status": "pending", "id": "planned"},
  {"content": "[act > validator] Validating against acceptance criteria\n  [act] Final validation: traceability 100%, evidence score >= 2.0", "status": "pending", "id": "coordinated"},
  {"content": "[act] Pipeline complete -- all validation gates passed", "status": "pending", "id": "validated"}
])
```

## Validation Task Pattern (V10.23.0, v12.0.0)

Every pipeline phase transition MUST include at least one validation TaskCreate entry. These entries confirm that the previous phase's outputs are valid before proceeding.

### Required Validation Entries (v12.0.0)

| After Phase | Validation Entry | What It Checks |
|-------------|-----------------|----------------|
| INIT | `[act] Pre-flight: enriched_context valid` | enriched_context.yaml exists and has required fields |
| ORCHESTRATED | `[act] Plan + decomposition validation: {N} objectives, {N} WIs, DAG valid` | plan.yaml schema, work_items.yaml schema, acceptance_criteria on every WI, acyclic deps, controller assigned |
| PLANNED | `[act] Coordination: {N}/{N} WIs complete, evidence score {X}` | coordination_log complete, all evidence non-vague |
| COORDINATED | `[act] Validation: verdict={PASS/FAIL/REVISE}, score={X}` | validation_report.yaml exists with verdict |

**v12.0.0 change**: The pre-v12 DECOMPOSED and PROMPTS_READY validation entries are no longer separate — the ORCHESTRATED entry now validates both plan.yaml AND work_items.yaml because planner produces both inline.

### Example: Full Pipeline with Validation Entries (v12.0.0)

```
TodoWrite([
  {"content": "[act > orchestrator] Context enrichment complete\n  [orchestrator] Domain: engineering, Tier: 3\n  [act] Pre-flight validation: enriched_context.yaml valid (3/3 fields)", "status": "completed", "id": "init"},
  {"content": "[act > planner] Plan + 12 work items complete\n  [planner] Controller: tech-lead, 5 objectives\n  [act] Plan validation: 5 objectives with criteria, controller assigned, 12/12 WIs have criteria, DAG valid", "status": "completed", "id": "orchestrated"},
  {"content": "[act > tech-lead] Coordination complete\n  [tech-lead] Pre-execution: 6/6 input checks passed\n  [tech-lead] Mid-execution: 4 checkpoints, 0 issues\n  [tech-lead] 12/12 WIs complete with evidence\n  [act] Coordination validation: evidence score 2.8/3.0, no stale items", "status": "completed", "id": "planned"},
  {"content": "[act > validator] Validation verdict: PASS\n  [validator] Phase 1-5: all passed\n  [validator] Phase 6 automated: 12/12 files verified\n  [validator] Phase 7 traceability: 100% coverage\n  [act] Final validation: overall score 0.97, PASS", "status": "completed", "id": "coordinated"},
  {"content": "[act] Pipeline complete -- all validation gates passed", "status": "completed", "id": "validated"}
])
```

## Revision Task Updates (v12.0.0)

```
TodoWrite([
  ...completed_states...,
  {"content": "[act] Revision {N}/3: Re-executing from {target_agent} due to validation feedback\n  [act] Revision trigger: {FAIL|REVISE}, feedback: {summary}\n  [act] Re-validation target: PLANNED with updated inputs", "status": "in_progress", "id": "revision"},
  ...remaining_states...
])
```

Max 3 revision cycles in v12.0.0 (lowered from 5). Both FAIL and REVISE route back to PLANNED.

## /act Owns All Pipeline Tasks

**/act (level 0) MUST own ALL task calls for pipeline agents it spawns.** This means /act calls TaskCreate BEFORE each Agent spawn, and updates status AFTER each Agent returns. This is the only way task cleanup works in Step 4, because TaskUpdate only works on tasks created by the same agent scope.

**Subagents (controllers, executors at level 1-2) MUST NOT call TaskCreate for pipeline-tracking tasks.** Tasks created by subagents live in the subagent's scope and cannot be updated by /act, causing "Task not found" errors during Step 4 cleanup. Subagents may use TaskCreate for their OWN internal sub-spawns but those are scoped tasks invisible to /act cleanup.

```
# /act creates the task BEFORE spawning the agent:
TaskCreate({ subject: "ORCHESTRATED: Plan + decomposition (planner)", description: "..." })
TaskUpdate({ taskId: "N", status: "in_progress" })
Agent({ subagent_type: "cagents:planner", description: "...", prompt: "..." })
# /act updates the task AFTER the agent returns:
TaskUpdate({ taskId: "N", status: "completed" })
```

Without per-agent tasks owned by /act, the user only sees generic entries like "[act] Pipeline running" with no visibility into the 3-5 agents actually working in parallel. Each pipeline agent MUST be a separate task created by /act.

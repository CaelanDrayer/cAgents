# Team — Spawn Protocol Detail

Detailed teammate-spawning protocol for the `team-bootstrap` agent. The SKILL.md body keeps the contract short; this resource carries spawning syntax, anti-patterns, and the per-wave decomposition schema.

## Controller Resolution (do this ONCE before spawning any teammates)

```
# Read plan.yaml -> controller_assignment -> primary
# This is ALWAYS the subagent_type for ALL teammates.
# Example: plan.yaml says "primary: cagents:tech-lead"
#   -> CONTROLLER_TYPE = "tech-lead"
#
# NEVER use work_items.yaml's per-item `agent` field as subagent_type.
# The `agent` field (e.g., "backend-developer", "senior-developer") is an
# EXECUTION agent -- it lacks the Agent tool and CANNOT delegate work.
# Only controllers (tech-lead, narrative-director, etc.) have Agent tool.
CONTROLLER_TYPE = plan.yaml -> controller_assignment -> primary
```

## Default Spawn Model: Concurrent Agent() Waves

Teams are **implicit** — `TeamCreate`/`TeamDelete` were removed in Claude Code v2.1.178; there is nothing to create or delete, and cleanup is automatic at session end. The DEFAULT (works in every harness): for each parallel wave, spawn ALL wave-K teammates as CONCURRENT `Agent()` calls issued in ONE assistant message (multiple tool uses in a single message run concurrently). Spawn them SYNCHRONOUSLY with `run_in_background: false` so the lead receives all wave results together, validates GATE-K, then proceeds. Explicit `run_in_background: false` is required because subagents are background-by-default since v2.1.198.

## Spawning a Teammate Controller

```javascript
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",  // MUST be the controller from plan.yaml, NEVER an execution agent
  run_in_background: false,                     // DEFAULT — collect the wave's results synchronously (v2.1.198 background-by-default)
  description: "Teammate: Execute TASK-01",
  prompt: `You are a team member in team '{team_name}'.

YOUR ASSIGNED WORK ITEM: TASK-01: {description}
Acceptance criteria: {criteria}
EXECUTION AGENT TO SPAWN: {agent_from_work_items}  (delegate to this agent via Agent tool)

CRITICAL INSTRUCTIONS:
1. You are a CONTROLLER agent. Spawn the execution agent via Agent tool:
   Agent({
     subagent_type: 'cagents:{agent_from_work_items}',
     description: 'Implement TASK-01: {description}',
     prompt: 'Implement TASK-01: {description}. Acceptance criteria: {criteria}.'
   })
2. After execution agent returns, spawn a reviewer to validate:
   Agent({
     subagent_type: 'cagents:reviewer',
     description: 'Review TASK-01',
     prompt: 'Review TASK-01. Acceptance criteria: {criteria}. Output: PASS or REVISE.'
   })
3. If REVISE: re-spawn execution agent with feedback (max 3 rounds)
4. After validation passes, mark your task as completed:
   TaskUpdate({ taskId: '{task_id}', status: 'completed' })
5. Check TaskList for additional unblocked tasks you can claim.
6. Report results to the team lead via SendMessage when done.`
})
```

## Anti-patterns (NEVER DO)

```javascript
// WRONG: Using execution agent as subagent_type (lacks Agent tool, can't delegate)
Agent({ subagent_type: "cagents:tech-lead", ... })
Agent({ subagent_type: "cagents:backend-developer", ... })

// WRONG: Telling teammate to implement directly
"Implement the user model with password_hash field"

// WRONG: Just creating tasks without spawning teammates
TaskCreate({ subject: "TASK-01: Implement user model" })  // No one to execute it!

// RIGHT: Controller as subagent_type, execution agent inside the delegation prompt
Agent({ subagent_type: "cagents:tech-lead", prompt: "...Agent({subagent_type:'cagents:backend-developer', ...})..." })
```

## Experimental Path: Named Background Teammates + Panes

OPTIONAL and harness-variable. Enable ONLY when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` AND the harness supports interactive agent teams; always label it EXPERIMENTAL.

- Spawn named teammates via `Agent({ name, run_in_background: true })` — the team is implicit; any `team_name` arg is accepted-but-ignored.
- Coordinate via `SendMessage({to: name})` (auto-resumes a stopped teammate by name) plus the shared Task list.
- `teammateMode` (`in-process` default since v2.1.179; or `tmux`/`iterm2`) controls display; panes require tmux/iTerm2 and are experimental-only.
- The TeammateIdle / TaskCompleted hooks support THIS path only and are no-ops on the default concurrent-Agent path.
- **MUST fall back to the DEFAULT concurrent-Agent path (above) if the experimental feature is unavailable.**

## Per-Wave Decomposition Emission (v12.1.0+)

To minimize lead context, decomposition is emitted as TWO artifact types instead of one monolithic `work_items.yaml`. See @../../../.claude/skills/team/reference/per-wave-decomposition.md for the full schema.

### `workflow/work_meta.yaml` — wave skeleton, lead reads ONCE on init

```yaml
schema_version: "1"
session_id: "{session_id}"
total_waves: N
total_work_items: M
waves:
  - wave: 0
    type: bootstrap
    summary: "1-line description"
    work_item_ids: [WI-1]
    work_item_file: "workflow/work_items_wave_0.yaml"
  - wave: 1
    type: implementation
    summary: "..."
    work_item_ids: [WI-2, WI-3, ...]
    work_item_file: "workflow/work_items_wave_1.yaml"
dependency_graph:
  critical_path: [WI-1, WI-2, ...]
  cross_wave_dependencies:
    - {from: WI-1, to: WI-2, type: blocks}
```

### `workflow/work_items_wave_{K}.yaml` — per-wave detail, lead reads ON DEMAND when entering wave K

```yaml
schema_version: "1"
wave: K
work_items:
  - id: WI-N
    title: "..."
    description: "..."
    assigned_to: cagents:{agent}
    acceptance_criteria:
      - criterion: "..."
        verification_method: file_exists | file_contains | test_result | metric_check
    dependencies: [WI-M, ...]
```

Schema is back-compat with legacy monolithic `work_items.yaml` — same field names, same acceptance_criteria schema, same verification_method enum. For one minor-version cycle (v12.1.x), the planner also emits the legacy file for downstream consumers not yet updated; v12.2.0 deprecates the monolithic file.

## Parallelism Analysis

```yaml
parallelism_analysis:
  analysis_steps:
    1. Build dependency graph from work_items
    2. Identify items with no blockers (root items)
    3. Group items that can execute simultaneously
    4. Calculate critical path
    5. Estimate parallelism utilization

  output:
    parallel_groups:
      - [TASK-01, TASK-02, TASK-03]  # Can run together
      - [TASK-04, TASK-05]          # After group 1
      - [TASK-06]                   # Sequential
    critical_path: [TASK-01, TASK-04, TASK-06]
    parallelism_score: 0.7  # 70% items can run in parallel
```

## Session Initialization

Create team session structure:

```
cagents-memory/sessions/team_{slug}_{YYMMDD}_{NNN}/
+-- instruction.yaml          # User request + flags
+-- status.yaml               # Current phase
+-- team/
|   +-- team_manifest.yaml    # Generated team config
|   +-- messages/             # Communication log
|   +-- metrics/
|       +-- timing.yaml
|       +-- parallelism.yaml
+-- workflow/
|   +-- plan.yaml             # From planner
|   +-- decomposition.yaml    # From decomposer
|   +-- coordination_log.yaml # Final coordination record
+-- outputs/
```

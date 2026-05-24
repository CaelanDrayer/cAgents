# Wave Execution Loop

Reference document for the `/team` skill loop's wave-based delivery pattern (formerly owned by the team-trigger agent, removed in v12.0.0 and inlined into the `/team` skill loop).

## CRITICAL: Waves Are the Default

**Wave-based delivery is the DEFAULT for tier 3+ requests.** Template auto-selection runs automatically. Only fall back to flat execution when `--no-template` is explicitly used or no template scores above the confidence threshold.

## Wave Execution Architecture

Waves are enforced via **TaskCreate dependencies** (gate sentinel tasks with `addBlockedBy`), not custom orchestration code. This preserves full compatibility with Claude Code's built-in task tools.

## Gate Sentinel Pattern

```
Wave 0 tasks created
  -> GATE-0 sentinel task (addBlockedBy: all wave-0 task IDs)

Wave 1 tasks created (addBlockedBy: [GATE-0])
  -> GATE-1 sentinel task (addBlockedBy: all wave-1 task IDs)

Wave 2 tasks created (addBlockedBy: [GATE-1])
```

When all wave-0 tasks complete, the team lead validates quality criteria and marks GATE-0 as completed, which unblocks all wave-1 tasks.

## TaskCreate Example

```javascript
// Wave 0: Foundation tasks
TaskCreate({ subject: "TASK-01: Setup project structure", ... })   // -> task #1
TaskCreate({ subject: "TASK-02: Define database schema", ... })    // -> task #2

// Gate 0: Sentinel blocked by all wave-0 tasks
TaskCreate({ subject: "GATE-0: Foundation Ready", description: "Quality gate. Validate: project structure, schema, contracts.", activeForm: "Validating foundation" /* optional */ })
TaskUpdate({ taskId: "3", addBlockedBy: ["1", "2"] })             // GATE-0 blocked by TASK-01, TASK-02

// Wave 1: Parallel build tasks (blocked by GATE-0)
TaskCreate({ subject: "TASK-03: Build API endpoints", ... })       // -> task #4
TaskUpdate({ taskId: "4", addBlockedBy: ["3"] })                  // blocked by GATE-0
TaskCreate({ subject: "TASK-04: Build UI components", ... })       // -> task #5
TaskUpdate({ taskId: "5", addBlockedBy: ["3"] })                  // blocked by GATE-0

// Gate 1: Sentinel blocked by all wave-1 tasks
TaskCreate({ subject: "GATE-1: Components Ready", ... })
TaskUpdate({ taskId: "6", addBlockedBy: ["4", "5"] })
```

## Wave Execution Loop

```
for each wave in template.waves:
  if wave.type == "bootstrap" or wave.type == "integration":
    # Orchestrator executes via /run sequentially
    for each work_item tagged with wave:
      Execute via /run (orchestrator handles directly)

    # Validate quality gate
    Verify gate criteria
    Mark GATE-{wave.id} as completed

  if wave.type == "parallel":
    # Teams execute in parallel via teammates
    # Tasks already created with GATE dependency
    # Teammates claim and execute via /run
    # Monitor via TaskList until all complete

    # Validate quality gate
    Verify gate criteria per team
    Mark GATE-{wave.id} as completed
```

## Quality Gate Validation

When all tasks in a wave complete, the team lead validates:

1. **Read gate criteria** from the template's `quality_gate.criteria` list
2. **Verify each criterion** using the specified `verification_method`:
   - `file_exists` - Check that expected files/artifacts exist
   - `output_exists` - Check that output deliverables were produced
   - `test_result` - Run or check test results
   - `manual_review` - Escalate to HITL if configured
3. **Mark gate task completed** if all criteria pass
4. **Report failure** if criteria not met; attempt self-correction or escalate

## Wave Types

| Type | Executor | Parallelism | Use Case |
|------|----------|-------------|----------|
| `bootstrap` | Orchestrator (sequential /run) | None | Foundation setup, contracts |
| `parallel` | Teams (parallel /run per item) | Full | Main build phase |
| `integration` | Orchestrator (sequential /run) | None | Wiring, testing, polish |

**CRITICAL for `parallel` waves**: Each teammate invokes `/run` via the Skill tool. The `/run` spins out its own controller and execution agents. Teammates NEVER implement directly.

```
Parallel wave:
  Teammate 1 -> Skill({skill: "run", args: "TASK-03"}) -> controller -> execution agents
  Teammate 2 -> Skill({skill: "run", args: "TASK-04"}) -> controller -> execution agents
  Teammate 3 -> Skill({skill: "run", args: "TASK-05"}) -> controller -> execution agents
```

## Contract Enforcement

Before marking a gate complete, verify that all contracts `established_in` this wave have their artifacts present. Contracts are the interface agreements between teams.

```
For each contract where established_in == current_wave:
  Verify artifacts exist
  Log contract status in coordination_log.yaml
```

# Team Lead — Wave Execution Detail

Wave-aware coordination, gate validation, and contract tracking for `cagents:team-lead`.

## Wave Loop

When the team manifest includes a template with waves, the lead coordinates wave-by-wave:

```
for each wave in manifest.template.waves:
  if wave.type == "bootstrap" or "integration":
    # Execute foundation/integration items sequentially via /run
    for each task tagged with this wave:
      Execute via /run (lead coordinates directly)
    # Validate quality gate criteria
    Verify gate criteria from template
    Mark GATE-{wave.id} as completed (TaskUpdate)

  if wave.type == "parallel":
    # Teammates claim and execute in parallel
    # Tasks already blocked by GATE-{wave.id - 1}
    # Monitor via TaskList until all wave tasks complete
    # Validate quality gate criteria per team
    Mark GATE-{wave.id} as completed (TaskUpdate)
```

## Gate Validation

When all tasks in a wave complete, validate the quality gate before marking the gate sentinel:

1. **Read** gate criteria from the template
2. **Verify** each criterion (`file_exists`, `output_exists`, `test_result`)
3. **Check** interface contracts established in this wave have artifacts present
4. **Mark** GATE-N task as completed -> unblocks next wave's tasks
5. **Broadcast** wave completion to all teammates

## Contract Tracking

Track contract status in coordination_log.yaml:

```yaml
contracts:
  - interface: "Database Schema"
    status: fulfilled  # established | consumed | fulfilled | violated
    artifacts_verified: true
```

## Memory Operations

### Writes

- `workflow/coordination_log.yaml` - Final coordination record
- `outputs/` - Aggregated deliverables
- (v12.6.0: `team/messages/` removed — teammate communication uses SendMessage; no on-disk log)

### Reads

- `team/team_manifest.yaml` - Team configuration
- `workflow/plan.yaml` - Original objectives
- `workflow/work_items.yaml` - Work items

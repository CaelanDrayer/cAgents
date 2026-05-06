# Dynamic Scaling

Mid-wave teammate addition (scale up), early shutdown (scale down), and scaling metrics for /team.

## Dynamic Scaling (V10.18.0)

The lead can dynamically adjust teammate count during wave execution based on workload and completion speed.

### Scale Up (Mid-Wave Teammate Addition)

When a wave has more items than the initial `--members` cap, or when workload is discovered to be larger than planned:

```
# During wave K execution, if additional items are identified:
1. Create TaskCreate for the new work item
2. Spawn additional teammate:
   Agent({
     subagent_type: "cagents:{CONTROLLER_TYPE}",
     name: "w{K}-task-{N}-{CONTROLLER_TYPE}-scaled",
     team_name: "{team_name}",
     description: "Wave {K} (scaled) - Execute TASK-{N}",
     ...
   })
3. The new teammate joins the wave in progress
```

**When to scale up**:
- A wave has more items than `--members` and current teammates are progressing well
- A work item is discovered to need decomposition into sub-items during execution
- A teammate finishes early and there are unstarted items in the same wave

### Scale Down (Early Teammate Shutdown)

When teammates finish early or become idle with no remaining work:

```
# Teammate reports completion:
1. Verify output exists and meets gate criteria
2. Send shutdown signal:
   SendMessage({ type: "shutdown_request",
                 recipient: "w{K}-task-{N}-{type}",
                 content: "Work complete. Shutting down to free resources." })
3. Teammate stops (via continue:false from TeammateIdle hook)
```

**When to scale down**:
- Teammate completes its work item (always shut down immediately — see Step 5c-1)
- Teammate is idle with no available work items in the current wave
- Wave GATE validation is complete and remaining teammates have no pending items

### Scaling Metrics

Track scaling events in `team/metrics/parallelism.yaml`:

```yaml
scaling_events:
  - wave: 2
    type: scale_up
    reason: "Additional sub-items from TASK-5 decomposition"
    new_teammate: "w2-task-5b-engineering-manager-scaled"
  - wave: 3
    type: scale_down
    reason: "TASK-8 completed early"
    stopped_teammate: "w3-task-8-engineering-manager"
```

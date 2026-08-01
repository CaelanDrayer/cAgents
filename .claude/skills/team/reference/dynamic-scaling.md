# Dynamic Scaling

Mid-wave subagent addition (scale up), early shutdown (scale down), and scaling metrics for /team.

## Dynamic Scaling (V10.18.0)

The lead can dynamically adjust subagent count during wave execution based on workload and completion speed.

### Scale Up (Mid-Wave Subagent Addition)

When a wave has more items than the initial `--members` cap, or when workload is discovered to be larger than planned:

```
# During wave K execution, if additional items are identified:
1. Create TaskCreate for the new work item
2. Spawn additional subagent:
   Agent({
     subagent_type: "cagents:{CONTROLLER_TYPE}",
     name: "w{K}-task-{N}-{CONTROLLER_TYPE}-scaled",
     team_name: "{team_name}",
     description: "Wave {K} (scaled) - Execute TASK-{N}",
     ...
   })
3. The new subagent joins the wave in progress
```

**When to scale up**:
- A wave has more items than `--members` and current subagents are progressing well
- A work item is discovered to need decomposition into sub-items during execution
- A subagent finishes early and there are unstarted items in the same wave

### Scale Down (Early Subagent Shutdown)

When subagents finish early or become idle with no remaining work:

```
# Subagent reports completion:
1. Verify output exists and meets gate criteria
2. Send shutdown signal:
   SendMessage({ type: "shutdown_request",
                 recipient: "w{K}-task-{N}-{type}",
                 content: "Work complete. Shutting down to free resources." })
3. Subagent stops (via continue:false from TeammateIdle hook)
```

**When to scale down**:
- Subagent completes its work item (always shut down immediately — see Step 5c-1)
- Subagent is idle with no available work items in the current wave
- Wave GATE validation is complete and remaining subagents have no pending items

### Scaling Metrics

Track scaling events in `team/metrics/parallelism.yaml`:

```yaml
scaling_events:
  - wave: 2
    type: scale_up
    reason: "Additional sub-items from TASK-5 decomposition"
    new_subagent: "w2-task-5b-tech-lead-scaled"
  - wave: 3
    type: scale_down
    reason: "TASK-8 completed early"
    stopped_subagent: "w3-task-8-tech-lead"
```

## Team Mode Execution

When `team_mode: true` is set in instruction.yaml or flags include `--team`:

### Detection
```yaml
team_mode_indicators:
  - flags.team == true
  - instruction.yaml contains team_mode: true
  - session folder starts with team_
```

### Team Execution Flow

1. **After Planning**: Instead of spawning controller directly, hand off to the `/team` lead (the pre-v12.0.0 team-lead-adapter pattern, now inlined in the `/team` skill loop)
2. **Team Lead Initialization**: The `/team` lead wraps the selected controller in delegate mode
3. **Parallel Execution**: Work items distributed to team members for parallel execution
4. **Progress Monitoring**: Monitor `team/task_list.yaml` instead of polling controller
5. **Aggregation**: Team lead aggregates results into coordination_log.yaml
6. **Validation**: Standard validation phase on aggregated outputs

### Delegation to Team Lead

```javascript
// Standard mode: spawn controller
Agent({
  subagent_type: "cagents:{controller}",
  description: "Coordinate: {request}",
  prompt: "Session: {session_path}\nRead plan.yaml for context."
})

// Team mode: spawn the team-lead (the pre-v12.0.0 team-lead-adapter pattern, now inlined)
Agent({
  subagent_type: "cagents:team-lead",
  description: "Team lead: {request}",
  prompt: `
    Session: {session_path}
    Controller: cagents:{controller}
    Mode: team_execution
    Read team/team_manifest.yaml and team/task_list.yaml for team context.
  `
})
```

### Team Progress Monitoring

Instead of polling coordination_log.yaml:
1. Read `team/task_list.yaml` for shared task statuses
2. Check for completion: `summary.completed == summary.total`
3. (v12.6.0: `team/messages/` removed — teammate communication uses SendMessage in-memory; lead aggregates via TaskList)
4. Aggregate metrics from `team/metrics/`

### Team Mode Benefits

| Metric | Standard Mode | Team Mode |
|--------|---------------|-----------|
| Execution | Sequential | Parallel (tmux split panes) |
| Coordination | Controller polls | Shared task list |
| Parallelism | Single context | Visual parallelism via tmux split panes |
| Time reduction | Baseline | 40-60% faster |

### Fallback Handling

Execution method priority: tmux -> Agent Teams -> parallel /act.
If tmux is unavailable during team mode:
1. Team-trigger checks Agent Teams availability
2. Falls back to parallel `/act` Skill invocations if neither available
3. Logs degraded mode in session
4. Proceeds with reduced functionality (no visual parallelism)

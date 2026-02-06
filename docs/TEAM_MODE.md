# Team Mode Documentation

cAgents V8.6 - Claude Code Agent Teams Integration

## Overview

Team Mode enables parallel team-based execution using Claude Code's experimental Agent Teams feature. This provides 40-60% execution time reduction for tier 3+ workflows through true parallelism with peer-to-peer communication.

## Quick Start

```bash
# Dedicated team command
/team Implement OAuth2 authentication

# Or use --team flag with /run
/run Build user dashboard --team
```

## What is Team Mode?

Team Mode transforms the standard sequential controller-execution pattern into parallel team-based execution:

**Standard Mode**:
```
Controller → Agent 1 → Agent 2 → Agent 3 → Results
                (sequential)
```

**Team Mode**:
```
Team Lead ─┬─ Agent 1 ──→ Complete
           ├─ Agent 2 ──→ Complete
           └─ Agent 3 ──→ Complete
               (parallel)
              └──────────→ Aggregate
```

## Key Features

### Peer-to-Peer Communication
Team members can communicate directly via `SendMessage`:
- Ask questions to other members
- Share intermediate results
- Coordinate dependent work

### Shared Task Lists
Work items posted to `team/task_list.yaml`:
- Members self-claim matching work
- Real-time status visibility
- Automatic dependency unblocking

### Independent Contexts
Each team member operates in isolated context:
- No context pollution between members
- Parallel execution without interference
- Scalable to many members

### Team Leads (Controllers)
Domain controllers operate in delegate mode:
- Coordination only, no implementation
- Distribute and monitor work
- Aggregate final results

## Commands

### /team Command

```bash
/team <request> [flags]
```

**Flags**:
| Flag | Description | Default |
|------|-------------|---------|
| `--dry-run` | Preview team composition | false |
| `--lead <agent>` | Specify team lead | auto |
| `--members <N>` | Max team members | 8 |
| `--parallel` | Force parallel execution | auto |
| `--display` | Show team communication | false |
| `--quiet`, `-q` | Suppress progress output | false |

**Examples**:
```bash
/team Implement user authentication
/team Build payment integration --dry-run
/team Create dashboard --members 4 --display
```

### /run --team Flag

```bash
/run <request> --team [other flags]
```

Equivalent to `/team` but uses existing `/run` infrastructure.

**Examples**:
```bash
/run Add search feature --team
/run Implement notifications --team --quiet
/run Build reporting module --team --interactive
```

## When to Use Team Mode

### Recommended For

| Scenario | Benefit |
|----------|---------|
| Tier 3+ workflows | Significant parallelism potential |
| Multiple independent work items | True parallel execution |
| Large features | Faster delivery via distribution |
| Time-sensitive projects | 40-60% time reduction |

### Not Recommended For

| Scenario | Why |
|----------|-----|
| Tier 2 simple workflows | Team overhead exceeds benefit |
| Highly sequential work | No parallelism possible |
| Single work items | No distribution benefit |
| Trivial changes | Standard mode is faster |

## Team Suitability Analysis

Team-trigger analyzes requests to determine if team execution provides benefit:

```yaml
# Automatic analysis
suitability_criteria:
  required:
    - work_items >= 3
    - has_independent_items: true

  preferred:
    - tier >= 3
    - parallelism_score > 0.5

  disqualifying:
    - all_sequential: true
    - tier 2 with items < 4
```

If analysis shows team mode won't provide benefit, gracefully falls back to standard mode.

## Team Composition

### Team Lead Selection

Controllers become team leads based on domain:

| Domain | Team Lead |
|--------|-----------|
| Engineering | engineering-manager |
| Creative | creative-director |
| Marketing | campaign-manager |
| Sales | sales-strategist |
| Finance | finance-manager |
| Operations | operations-manager |
| HR | hr-manager |
| Support | customer-success-manager |

### Member Selection

Execution agents are selected based on:
- Work item skill requirements
- Agent capabilities
- Load balancing

## Session Structure

Team sessions use enhanced session structure:

```
Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
├── instruction.yaml          # Request + team flags
├── status.yaml               # Phase + team status
├── team/
│   ├── team_manifest.yaml    # Team composition
│   ├── task_list.yaml        # Shared work items
│   ├── messages/             # Peer communications
│   │   └── {timestamp}.yaml
│   └── metrics/
│       ├── timing.yaml       # Execution timing
│       └── parallelism.yaml  # Utilization metrics
├── workflow/
│   ├── plan.yaml
│   ├── decomposition.yaml
│   └── coordination_log.yaml
└── outputs/
```

## Fallback Behavior

If Agent Teams is unavailable (env var not set):

1. **Detection**: team-trigger checks `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`
2. **Graceful Degradation**: Uses parallel Task tool calls
3. **Reduced Features**:
   - No peer-to-peer messaging
   - No self-claiming (direct assignment only)
   - Sequential result handling
4. **User Notification**:
   ```
   Agent Teams not available. Using parallel Task execution.
   Team features (peer messaging, shared tasks) disabled.
   Parallelism still achieved via concurrent Task invocations.
   ```

To enable full team features:
```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Or add to `.claude/settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

## Performance

### Expected Improvements

| Metric | Target |
|--------|--------|
| Execution time | 40-60% reduction |
| Parallelism utilization | >70% |
| Work item throughput | 3x improvement |

### Metrics Tracked

Team sessions automatically track:
- **Timing**: Per-phase and per-item duration
- **Parallelism**: Peak concurrent members, efficiency score
- **Speedup**: Actual vs estimated sequential time

View metrics in `team/metrics/` directory.

## Configuration

### Project Override

Create `.cagents/team_config.yaml`:

```yaml
team_mode:
  enabled: true
  min_work_items: 3       # Minimum for team mode
  max_team_size: 8        # Maximum members
  prefer_teams_for_tiers: [3, 4]
  fallback_parallel_tasks: true
```

### Disabling Team Mode

To disable team mode for a project:

```yaml
team_mode:
  enabled: false
```

## Troubleshooting

### Team Not Spawning

**Symptom**: `/team` falls back to `/run`

**Causes**:
- Agent Teams env var not set
- Work items < 3
- All items sequential

**Fix**: Check env var, verify work item count

### Slow Team Execution

**Symptom**: Team mode slower than expected

**Causes**:
- Many sequential dependencies
- Member selection suboptimal
- Overhead for small workflows

**Fix**: Check parallelism_score in metrics, use standard mode for small workflows

### Member Communication Failures

**Symptom**: Messages not delivered

**Causes**:
- Running in fallback mode
- Member context exhausted

**Fix**: Verify full teams mode active, check member status

## Related Documentation

- **CLAUDE.md** - Main project documentation
- **.claude/rules/core/teams.md** - Team coordination patterns
- **core/commands/team.md** - /team command specification
- **core/agents/team-trigger/SKILL.md** - Team initialization agent
- **core/agents/team-lead-adapter/SKILL.md** - Controller wrapper

## Hooks

Team-specific hooks in `.claude/hooks/`:
- `team-start.cjs` - Initialize team monitoring
- `team-stop.cjs` - Finalize and archive team session
- `team-task-complete.cjs` - Track task completion

---

**Version**: 8.6.0
**Part of**: cAgents - Claude Code Agent Teams Integration

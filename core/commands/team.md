---
name: team
description: Parallel team-based workflow execution with peer-to-peer communication. Leverages Claude Code Agent Teams for 40-60% execution time reduction on tier 3+ workflows.
---

# Team Command

**Parallel team-based workflow execution** using Claude Code's experimental Agent Teams feature.

## Your Mission

You are a minimal delegation layer that initializes team-based execution for parallelizable workflows. Your ONLY responsibility is to pass the user's request to the team-trigger agent via Task tool.

DO NOT execute ANY logic directly. The team-trigger agent handles team initialization and orchestration.

## CRITICAL: Agent Teams Feature Detection

Before any team operation, verify Agent Teams is available:

```javascript
// Team-trigger checks this
const teamsAvailable = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
```

**If unavailable**: Fall back to standard `/run` with parallel Task tool calls.

## How It Works

When the user runs `/team <request> [flags]`:

1. **Parse flags** from command arguments
2. Create initial TodoWrite entry to show progress
3. Check Agent Teams availability
4. If available: Invoke team-trigger agent via Task tool
5. If unavailable: Fall back to `/run` with parallel execution
6. Report results when complete

## Usage

### Basic Usage
```bash
/team Implement OAuth2 authentication
/team Build user profile feature
/team Add payment gateway integration
```

### With Flags
```bash
/team Fix auth + add tests + update docs --parallel     # Parallel execution
/team Implement search feature --dry-run                 # Preview team composition
/team Build dashboard --lead engineering-manager         # Specify team lead
/team Create campaign --members 4                        # Limit team size
/team Add API endpoints --display                        # Show team communication
```

## Command Flags

| Flag | Type | Description | Default |
|------|------|-------------|---------|
| `--parallel` | Boolean | Force parallel execution | auto |
| `--dry-run` | Boolean | Preview team without executing | false |
| `--lead <agent>` | String | Specify team lead controller | auto-detect |
| `--members <N>` | Number | Max team members | 8 |
| `--display` | Boolean | Show team communication | false |
| `--domain <domain>` | String | Override domain detection | auto |
| `--tier <N>` | Number | Override tier classification | auto |
| `--quiet`, `-q` | Boolean | Suppress team progress output | false |

## Flag Parsing

```javascript
function parseTeamFlags(commandString) {
  const flags = {
    request: commandString.split('--')[0].trim(),
    parallel: commandString.includes('--parallel'),
    dryRun: commandString.includes('--dry-run'),
    display: commandString.includes('--display'),
    quiet: commandString.includes('--quiet') || commandString.includes('-q'),
    lead: extractFlagValue(commandString, '--lead'),
    members: parseInt(extractFlagValue(commandString, '--members') || '8', 10),
    domain: extractFlagValue(commandString, '--domain'),
    tier: extractFlagValue(commandString, '--tier')
  };
  return flags;
}
```

## Delegation to Team-Trigger

```javascript
Task({
  subagent_type: "cagents:team-trigger",
  description: "Team: {flags.request}",
  prompt: `
    Request: {flags.request}
    Flags: {JSON.stringify(flags)}
    Mode: team_execution

    Initialize team workflow:
    1. Check Agent Teams availability
    2. Analyze request for parallelizable work items
    3. Select team lead (controller)
    4. Spawn team via Claude Code Agent Teams API
    5. Map work items to shared task list
    6. Monitor and aggregate results

    Session: Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
  `
})
```

## When to Use /team vs /run

| Use /team | Use /run |
|-----------|----------|
| Multiple parallelizable work items | Single-threaded workflow |
| Tier 3+ complex workflows | Tier 2 simple coordination |
| Independent subtasks | Sequential dependencies |
| Time-sensitive delivery | Quality-focused delivery |

## Team Composition

Teams are composed based on workflow analysis:

```yaml
team_composition:
  lead:
    role: controller
    mode: delegate  # Coordination only, no direct work
  members:
    - type: execution
      count: varies  # Based on work item count
    - type: specialist
      count: 1-2     # Domain experts
```

**Controller as Team Lead**:
- Engineering workflows: `engineering-manager`
- Creative workflows: `creative-director`
- Marketing workflows: `campaign-manager`
- Operations workflows: `operations-manager`
- HR workflows: `hr-manager`
- Support workflows: `customer-success-manager`

## Parallel Execution Model

```
Team Lead (Controller)
    │
    ├── Spawn teammates via spawnTeam()
    ├── Create shared task list (work items)
    │
    ├── Member 1 ──┬── Claims task A ──→ Executes ──→ Completes
    ├── Member 2 ──┼── Claims task B ──→ Executes ──→ Completes
    ├── Member 3 ──┴── Claims task C ──→ Executes ──→ Completes
    │                  (parallel)
    │
    └── Aggregates results when all tasks complete
```

## Fallback Behavior

If Agent Teams is unavailable:

```javascript
// Automatic fallback to parallel Task tool calls
Task({ subagent_type: "make:backend-developer", prompt: "Task A..." })
Task({ subagent_type: "make:frontend-developer", prompt: "Task B..." })
Task({ subagent_type: "make:qa-tester", prompt: "Task C..." })
// Sent in single message for parallel execution
```

**User notification**:
```
Agent Teams not available. Using standard parallel execution.
Team features (peer messaging, shared tasks) disabled.
```

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
├── instruction.yaml          # User request
├── status.yaml               # Current state
├── team/
│   ├── team_manifest.yaml    # Team composition
│   ├── task_list.yaml        # Shared task list (work items)
│   ├── messages/             # Peer-to-peer messages
│   │   └── {timestamp}.yaml  # Individual messages
│   └── metrics/
│       ├── timing.yaml       # Execution timing
│       └── parallelism.yaml  # Utilization metrics
├── workflow/
│   ├── plan.yaml
│   ├── decomposition.yaml
│   └── coordination_log.yaml
└── outputs/
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Execution time reduction | 40-60% vs sequential |
| Parallelism utilization | >70% |
| Work item throughput | 3x improvement |

## TodoWrite Pattern

```javascript
TodoWrite({
  todos: [
    {content: "Initialize team and analyze parallelism", status: "in_progress", activeForm: "Initializing team and analyzing parallelism"},
    {content: "Spawn team members", status: "pending", activeForm: "Spawning team members"},
    {content: "Execute parallel tasks", status: "pending", activeForm: "Executing parallel tasks"},
    {content: "Aggregate results and validate", status: "pending", activeForm: "Aggregating results and validating"}
  ]
})
```

## Command Responsibilities

**This command ONLY does:**
- Parse command arguments
- Create initial TodoWrite
- Invoke team-trigger via Task tool
- Return final report to user

**This command NEVER does:**
- Team composition (team-trigger does this)
- Work item distribution (team-lead-adapter does this)
- Parallel execution (Claude Code Agent Teams does this)
- Result aggregation (team lead does this)

## Configuration

Project-level override (`.cagents/team_config.yaml`):
```yaml
team_mode:
  enabled: true
  min_work_items: 3        # Minimum items for team mode
  max_team_size: 8         # Maximum team members
  prefer_teams_for_tiers: [3, 4]
  fallback_parallel_tasks: true
```

## Related Files

- `core/agents/team-trigger/SKILL.md` - Team initialization
- `core/agents/team-lead-adapter/SKILL.md` - Controller-to-lead wrapper
- `core/agents/orchestrator/SKILL.md` - Phase management
- `.claude/rules/core/teams.md` - Team coordination patterns
- `docs/TEAM_MODE.md` - Full documentation

---

**Key Innovation**: Leverage Claude Code Agent Teams for true peer-to-peer parallel execution with shared context.

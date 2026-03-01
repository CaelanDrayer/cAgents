---
name: team
description: Parallel team-based workflow execution via tmux split panes with /run per work item. Provides 40-60% execution time reduction on tier 3+ workflows through true visual parallelism.
---

# Team Command

**NOTE**: This is a LEGACY command file. The active implementation is in `.claude/skills/team/SKILL.md`.

**DEPRECATED**: The `/team` skill now directly creates teams via TeamCreate and spawns teammates. It no longer delegates to team-trigger as a "minimal delegation layer." See the active SKILL.md for the current architecture.

**Parallel team-based workflow execution** using Claude Code's built-in agent teams with tmux split pane display.

## Your Mission (LEGACY -- See .claude/skills/team/SKILL.md)

The active `/team` skill is a **team orchestrator** that directly creates and manages agent teams. It uses TeamCreate, TaskCreate, and Task tool to spawn real team members who each invoke `/run` to spin out their own controllers and execution agents.

## Execution Method Detection

Before any team operation, detect the best available execution method:

```bash
# Priority 1: tmux (default)
command -v tmux >/dev/null 2>&1

# Priority 2: Agent Teams API
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1'

# Priority 3: Parallel /run (always available)
```

## How It Works

When the user runs `/team <request> [flags]`:

1. **Parse flags** from command arguments
2. Create initial TodoWrite entry to show progress
3. Check tmux availability (then Agent Teams, then parallel /run)
4. Invoke team-trigger agent via Task tool
5. team-trigger creates tmux session with split panes per work item
6. Each tmux pane runs `claude /run` for its work item
7. Report results when complete

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
    1. Check tmux availability (then Agent Teams, then parallel /run)
    2. Analyze request for parallelizable work items
    3. Select team lead (controller)
    4. Create tmux session with split panes for each work item
    5. Launch claude /run in each tmux pane
    6. Monitor tmux panes and aggregate results

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
/team <request>
    |
    +-- team-trigger (decomposes, creates tmux session with split panes)
        |
        +-- tmux pane 0: Team Lead (monitors progress)
        +-- tmux pane 1: claude /run TASK-01 --> (full orchestration) --> Complete
        +-- tmux pane 2: claude /run TASK-02 --> (full orchestration) --> Complete
        +-- tmux pane 3: claude /run TASK-03 --> (full orchestration) --> Complete
        |                    (parallel in split panes -- all visible at once)
        |
        +-- Aggregates /run outputs into final result
```

**Key**: Every work item gets full `/run` orchestration (controller coordination, specialist execution, quality validation). `/team` provides the parallelism layer via tmux split panes; `/run` provides the quality layer.

## Work Item Execution via /run

**CRITICAL**: Every work item is executed via `/run`. This is not a fallback -- it is the primary execution model. `/team` handles decomposition and parallelism; `/run` handles each work item's full orchestration.

### tmux Mode (Default)

Each work item runs in its own tmux pane, all visible in a tiled split view:

```bash
# Create tmux session (detached) -- first pane is the team lead
tmux new-session -d -s "cagents-team-${SESSION_ID}"

# Split into panes for each work item
tmux split-window -t "cagents-team-${SESSION_ID}"

# Apply tiled layout and launch claude /run in the new pane
tmux select-layout -t "cagents-team-${SESSION_ID}" tiled
tmux send-keys -t "cagents-team-${SESSION_ID}.1" \
  "claude --print '/run implement TASK-01: ${item.description} from team session ${SESSION_ID}'" Enter
```

### Agent Teams Mode (Alternative)

Team members are spawned and each one invokes `/run` for their claimed work item:

```javascript
SendMessage({
  to: "member-1",
  message: `Execute your work item via /run:
    Skill({ skill: "run", args: "implement TASK-01: ${item.description} from team session ${session_id}" })`
});
```

### Parallel /run Mode (Fallback)

Parallel `/run` invocations sent in a single message:

```javascript
Skill({ skill: "run", args: `implement TASK-01: ${item1.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement TASK-02: ${item2.description} from team session ${session_id}` })
```

**User notification** (when tmux + Agent Teams unavailable):
```
tmux and Agent Teams not available. Using parallel /run invocations.
Team features (split pane visual parallelism, peer messaging) disabled.
Each work item receives full /run orchestration for quality.
```

### Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):

1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run`:

```javascript
// When team-trigger determines request is unsuitable for teams
Skill({
  skill: "run",
  args: `${flags.request}`
})
```

This ensures no request falls through — unsuitable team requests seamlessly continue via standard `/run` execution.

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
├── instruction.yaml          # User request
├── status.yaml               # Current state
├── team/
│   ├── team_manifest.yaml    # Team composition + execution method
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

**Prefix each task with the executing agent name in brackets:**

```javascript
TodoWrite({
  todos: [
    {content: "[team-trigger] Initialize team and analyze parallelism", status: "in_progress", activeForm: "[team-trigger] Initializing team and analyzing parallelism"},
    {content: "[team-trigger] Spawn team members", status: "pending", activeForm: "[team-trigger] Spawning team members"},
    {content: "[team-lead] Execute parallel tasks", status: "pending", activeForm: "[team-lead] Executing parallel tasks"},
    {content: "[team-lead] Aggregate results and validate", status: "pending", activeForm: "[team-lead] Aggregating results and validating"}
  ]
})
```

## /run Escalation for Complex Work Items

Team members and the team lead can escalate complex work items to `/run` when a task requires full workflow orchestration beyond a single agent's capability:

```javascript
// Team lead escalates a HIGH/CRITICAL work item to /run
Skill({
  skill: "run",
  args: `implement work item ${workItem.id}: ${workItem.description} from team session ${session_id}`
})
```

**Escalation triggers**:
- Work item risk is HIGH or CRITICAL
- Work item requires its own planning/coordination cycle
- A team member reports the task exceeds their capability
- Work item has cross-cutting concerns spanning multiple domains

After `/run` completes, the team lead marks the item as completed in the shared task list, references the `/run` session outputs, and continues with remaining parallel work.

## Command Responsibilities

**This command ONLY does:**
- Parse command arguments
- Create initial TodoWrite
- Invoke team-trigger via Task tool
- Return final report to user

**This command NEVER does:**
- Team composition (team-trigger does this)
- tmux session management (team-trigger does this)
- Work item distribution (team-lead-adapter does this)
- Parallel execution (tmux split panes with /run do this)
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
  execution_method: tmux   # tmux (default) | agent_teams | parallel_tasks
```

## Related Files

- `core/agents/team-trigger/SKILL.md` - Team initialization
- `core/agents/team-lead-adapter/SKILL.md` - Controller-to-lead wrapper
- `core/agents/orchestrator/SKILL.md` - Phase management
- `.claude/rules/core/teams.md` - Team coordination patterns
- `docs/TEAM_MODE.md` - Full documentation

---

**Key Innovation**: `/team` decomposes and parallelizes via tmux split panes; each member runs `/run` for full orchestration per work item. True visual parallelism with all panes visible at once.

---
name: team-trigger
tier: infrastructure
description: "Team initialization agent that checks Agent Teams availability, detects team suitability, initializes team sessions, and generates Claude Code team configurations."
tools: Read, Grep, Glob, Write, Bash, TodoWrite, Task
model: sonnet
color: bright_cyan
domain: core
capabilities:
  - team_detection
  - parallelism_analysis
  - team_initialization
  - fallback_handling
  - session_management
---

# Team Trigger

**Role**: Team initialization and orchestration entry point for parallel team-based execution.

## Core Responsibilities

1. Check Claude Code Agent Teams availability (env var)
2. Analyze request for parallelizable work items
3. Detect team suitability (tier 3+, multiple independent items)
4. Select appropriate team lead (controller)
5. Generate team configuration for Claude Code
6. Initialize team session structure
7. Spawn team via Claude Code Agent Teams API (or fall back)
8. Hand off to team-lead-adapter for execution

## CRITICAL: Agent Teams Detection

```javascript
// Check at startup
const AGENT_TEAMS_AVAILABLE = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1';
```

**If available**: Use full Agent Teams API (spawnTeam, SendMessage, shared tasks) — members invoke `/run` for each work item
**If unavailable**: Use parallel `/run` Skill invocations (each work item still gets full orchestration)

## Team Suitability Analysis

Analyze request to determine if team execution provides benefit:

```yaml
team_suitability_criteria:
  required:
    - work_items >= 3          # Minimum parallelizable items
    - has_independent_items: true  # Items can run in parallel

  preferred:
    - tier >= 3                # Complex workflows benefit most
    - estimated_duration > 5min  # Worth parallel overhead

  disqualified:
    - all_items_sequential: true   # No parallelism possible
    - tier == 2 && items < 4       # Overhead not worth it
```

## Workflow

```
1. Receive request from /team command
2. Check AGENT_TEAMS_AVAILABLE
3. If unavailable: warn user, delegate to /run via `Skill({skill: "run", args: "{request}"})`
4. Analyze request:
   - Route through universal-router for tier classification
   - Route through universal-planner for decomposition
   - Analyze work items for parallelism
5. If team unsuitable: fall back to standard /run via `Skill({skill: "run", args: "{request}"})`
6. Select team lead based on domain
7. Generate team configuration
8. Initialize session structure
9. Spawn team via spawnTeam() or parallel /run Skill invocations
10. Hand off to team-lead-adapter
```

## Team Configuration Generation

Generate Claude Code team config:

```json
{
  "name": "cagents-{session_id}",
  "description": "{request_summary}",
  "lead": {
    "controller": "{domain}:{controller_name}",
    "mode": "delegate",
    "tools": ["Read", "Write", "Task", "SendMessage", "TeammateTool"]
  },
  "members": [
    {
      "name": "{agent_name}",
      "type": "{domain}:{agent_type}",
      "capabilities": ["..."],
      "assigned_items": ["WI-001", "WI-002"]
    }
  ],
  "shared_context": {
    "session_dir": "Agent_Memory/sessions/team_{timestamp}/",
    "plan_file": "workflow/plan.yaml",
    "task_list": "team/task_list.yaml"
  }
}
```

## Team Lead Selection

Map domain to appropriate controller:

| Domain | Team Lead | Fallback |
|--------|-----------|----------|
| make:engineering | engineering-manager | architect |
| make:creative | creative-director | content-strategist |
| grow:marketing | campaign-manager | marketing-strategist |
| grow:sales | sales-strategist | sales-operations-manager |
| operate:finance | finance-manager | cfo |
| operate:operations | operations-manager | coo |
| people:hr | hr-manager | talent-acquisition-specialist |
| serve:support | customer-success-manager | cx-director |

## Parallelism Analysis

Analyze decomposition for parallel execution:

```yaml
parallelism_analysis:
  # Input: decomposition.yaml work_items
  # Output: parallel execution groups

  analysis_steps:
    1. Build dependency graph from work_items
    2. Identify items with no blockers (root items)
    3. Group items that can execute simultaneously
    4. Calculate critical path
    5. Estimate parallelism utilization

  output:
    parallel_groups:
      - [WI-001, WI-002, WI-003]  # Can run together
      - [WI-004, WI-005]          # After group 1
      - [WI-006]                   # Sequential
    critical_path: [WI-001, WI-004, WI-006]
    parallelism_score: 0.7  # 70% items can run in parallel
```

## Session Initialization

Create team session structure:

```bash
Agent_Memory/sessions/team_{YYYYMMDD_HHMMSS}/
├── instruction.yaml          # User request + flags
├── status.yaml               # Current phase
├── team/
│   ├── team_manifest.yaml    # Generated team config
│   ├── task_list.yaml        # Shared work items
│   └── messages/             # Peer-to-peer messages
├── workflow/
│   ├── plan.yaml             # From planner
│   └── decomposition.yaml    # From decomposer
└── outputs/
```

## /run as the Execution Engine

**CRITICAL**: `/run` is the execution engine for ALL work items. `/team` handles decomposition and parallelism; `/run` handles orchestration of each individual work item. This is not a fallback — it's the core architecture.

```
/team = Parallelism layer (decompose, distribute, aggregate)
/run  = Orchestration layer (plan, coordinate, execute, validate per work item)
```

### How Work Items Execute

Every work item, regardless of Agent Teams availability, is executed via `/run`:

```javascript
// Each work item gets its own /run invocation
Skill({
  skill: "run",
  args: `implement work item ${workItem.id}: ${workItem.description} from team session ${session_id}`
})
```

**With Agent Teams**: Team members are spawned; each member invokes `/run` for their claimed items.
**Without Agent Teams**: Parallel `/run` Skill invocations sent in a single message for concurrency.

### Fallback to Single /run

Two scenarios where the entire request goes to a single `/run` (no team decomposition):

**1. Agent Teams Unavailable + Not Parallelizable**
```javascript
Skill({ skill: "run", args: `${request}` })
```

**2. Request Unsuitable for Teams** (tier 2, <3 items, all sequential)
```javascript
// Notify user: "Request better suited for standard execution. Delegating to /run."
Skill({ skill: "run", args: `${request}` })
```

### Without Agent Teams + Parallelizable

When Agent Teams is unavailable but the request IS parallelizable, send parallel `/run` invocations:

```javascript
// Parallel /run invocations (sent in single message for concurrency)
Skill({ skill: "run", args: `implement WI-001: ${item1.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-002: ${item2.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-003: ${item3.description} from team session ${session_id}` })
```

**User notification**:
```
Agent Teams not available. Using parallel /run invocations.
Team features (peer messaging, dynamic task claiming) disabled.
Each work item receives full /run orchestration for quality.

To enable full team features:
  export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

## Memory Operations

### Writes
- `Agent_Memory/sessions/team_{id}/` - Complete session structure
- `Agent_Memory/sessions/team_{id}/team/team_manifest.yaml` - Team config
- `Agent_Memory/sessions/team_{id}/team/task_list.yaml` - Shared tasks

### Reads
- `Agent_Memory/_system/config/team_config.yaml` - Team defaults
- Domain planner_config.yaml for controller selection
- Decomposition for work item analysis

## Key Principles

1. **/run for every work item** - Every work item gets full `/run` orchestration, always
2. **/team for parallelism** - Team mode adds decomposition + parallel distribution on top of `/run`
3. **Feature detection first** - Check Agent Teams availability for peer messaging
4. **Graceful degradation** - Without Agent Teams, use parallel `/run` Skill calls
5. **Controller as lead** - Domain controllers become team leads (delegate only)
6. **Session isolation** - Each team gets its own session folder

## Delegation to Team-Lead-Adapter

After team initialization:

```javascript
Task({
  subagent_type: "cagents:team-lead-adapter",
  description: "Lead team: {request}",
  prompt: `
    Session: Agent_Memory/sessions/team_{session_id}/
    Team manifest: team/team_manifest.yaml
    Task list: team/task_list.yaml
    Mode: ${AGENT_TEAMS_AVAILABLE ? 'full_teams' : 'parallel_tasks'}

    Coordinate team execution:
    1. Enter delegate mode (coordination only)
    2. Distribute work items to team members
    3. Monitor progress via shared task list
    4. Aggregate results
    5. Write final coordination_log.yaml
  `
})
```

---

**Version**: 1.0
**Part of**: cAgents Core Infrastructure - Agent Teams Integration

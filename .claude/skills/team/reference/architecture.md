# /team Execution Architecture

## Parallel Execution Model

```
/team <request>
    |
    /team skill directly:
    |
    1. Analyze + decompose request into work items
    2. TeamCreate -- create team IMMEDIATELY
    3. TaskCreate -- create work items as shared tasks with wave dependencies
    4. Spawn teammates via Task tool -- each gets explicit /run instructions
    |
    +-- Team Lead = /team skill (coordinate via SendMessage, manage TaskList)
    +-- Teammate 1: /run WI-001 --> (trigger -> controller -> execution agents) --> Complete
    +-- Teammate 2: /run WI-002 --> (trigger -> controller -> execution agents) --> Complete
    +-- Teammate 3: /run WI-003 --> (trigger -> controller -> execution agents) --> Complete
    |                 (parallel -- each in own context/tmux pane)
    |
    5. Monitor via TaskList + automatic teammate messages
    6. Aggregate results from all /run sessions
    7. Shutdown teammates + TeamDelete
```

## CRITICAL: Create Teams, Not Just Tasks

The `/team` skill MUST:
1. **TeamCreate** -- Create a real agent team
2. **TaskCreate** -- Create work items as shared tasks
3. **Spawn teammates** -- Via Task tool with explicit /run instructions

All three steps are required. Creating tasks without spawning teammates to execute them is an anti-pattern.

## Built-in Agent Teams

`/team` uses Claude Code's **built-in agent teams** for parallel execution. The built-in system provides:

- **TeamCreate**: Creates team with shared task list
- **SendMessage**: Direct messaging between teammates and lead
- **TaskCreate/TaskUpdate/TaskList**: Shared task coordination
- **teammateMode**: Display mode for visual layout

No manual tmux scripting is needed. Claude Code manages teammate lifecycle, messaging, and display.

## Display Modes (teammateMode)

| Mode | Description | Requirements |
|------|-------------|--------------|
| `"auto"` (default) | tmux split panes if inside tmux session, otherwise in-process | None |
| `"tmux"` | Force tmux split pane display -- each teammate in its own pane | tmux installed |
| `"in-process"` | All teammates in main terminal, navigate with Shift+Up/Down | None |

Configure in settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Or per-session via CLI flag:
```bash
claude --teammate-mode tmux
```

## Work Item Execution -- Teammates Spin Out Their Own Agents

Every work item is executed via `/run`. When a teammate invokes `/run` via the Skill tool, that `/run` creates its own controller and execution agents. This is how teammates "spin out their own agents."

```
Teammate -> Skill({skill: "run", args: "WI-001: ..."})
  -> trigger -> orchestrator -> controller (e.g., engineering-manager)
    -> execution agents (e.g., backend-developer, qa-tester)
  -> validated output returned to teammate
```

**Teammates NEVER implement work items directly.** They ALWAYS invoke `/run` via the Skill tool.

### Team Creation Flow (Execute IMMEDIATELY)

```javascript
// 1. Create the agent team -- IMMEDIATELY after decomposition
TeamCreate({
  team_name: "cagents-team-{session_id}",
  description: "Parallel execution of {request}"
})

// 2. Create shared tasks with wave dependencies (GATE sentinel pattern)
TaskCreate({
  subject: "WI-001: Implement user model",
  description: "Execute via Skill({skill: 'run', args: 'implement WI-001: ...'}). Do NOT implement directly.",
  activeForm: "Implementing user model"
})

// 3. IMMEDIATELY spawn teammates -- each MUST invoke /run via Skill tool
Task({
  description: "Teammate: Execute WI-001 via /run",
  prompt: "You are a team member. Execute WI-001 via: Skill({skill: 'run', args: '...'})"
})
```

### Teammate Assignment -- MUST Include Skill Invocation

```javascript
// For already-spawned teammates, assign via SendMessage
SendMessage({
  type: "message",
  recipient: "teammate-1",
  content: "You are assigned WI-001: Implement user model.\n\nCRITICAL: Execute via the Skill tool to spin out your own agents:\nSkill({ skill: 'run', args: 'implement WI-001: Implement user model' })\n\nDo NOT implement directly. /run creates controller + execution agents. Report when complete.",
  summary: "Assigning WI-001 with /run"
})
```

### Self-Claiming

After completing a task, teammates check TaskList for unblocked, unassigned work:

```javascript
// Teammate flow:
TaskList()  // Find available tasks
TaskUpdate({ taskId: "3", status: "in_progress", owner: "teammate-1" })  // Claim
// Execute via /run using Skill tool -- spins out its own agents
Skill({ skill: "run", args: "implement WI-003: {description}" })
TaskUpdate({ taskId: "3", status: "completed" })  // Mark done
```

## Team Lead Behavior

The `/team` skill itself acts as team lead. It ONLY coordinates. It NEVER implements.

**Allowed actions:**
- Distribute work items to teammates via SendMessage
- Monitor task list progress via TaskList
- Request status from teammates via SendMessage
- Synthesize teammate outputs
- Validate wave quality gates
- Shut down teammates via SendMessage (type: shutdown_request)
- Clean up team via TeamDelete

**Prohibited actions:**
- Edit/Write implementation files
- Answer questions directly
- Execute work items themselves (except bootstrap/integration wave items via /run)
- Skip delegation for "simple" tasks
- Create only tasks without spawning teammates

## Shared Task List

Tasks are managed via Claude Code's built-in TaskCreate/TaskList/TaskUpdate tools:

```
Task states: pending --> in_progress --> completed
Dependencies: TaskUpdate with addBlockedBy to set blocking relationships
Claiming: TaskUpdate with owner to claim a task
```

Built-in task list is stored at `~/.claude/tasks/{team-name}/` with file-lock based claiming to prevent race conditions.

## Session Structure

```
Agent_Memory/sessions/team_{timestamp}/
+-- instruction.yaml
+-- status.yaml
+-- team/
|   +-- team_manifest.yaml    # Team composition + display mode
|   +-- messages/             # Communication log
|   +-- metrics/
|       +-- timing.yaml
|       +-- parallelism.yaml
+-- workflow/
|   +-- plan.yaml
|   +-- decomposition.yaml
|   +-- coordination_log.yaml
+-- outputs/
```

Note: Shared task list managed by Claude Code at `~/.claude/tasks/{team-name}/`.
Team config managed by Claude Code at `~/.claude/teams/{team-name}/config.json`.

## Team Suitability Criteria

```yaml
required:
  work_items: ">= 3"
  has_independent_items: true

preferred:
  tier: ">= 3"
  parallelism_score: "> 0.5"

disqualified:
  all_sequential: true
  tier: 2 with items < 4
```

## Team Lifecycle (Execute IMMEDIATELY -- No Permission Required)

```
1. Analyze + decompose request into work items
2. TeamCreate -- create team and shared task list IMMEDIATELY
3. Auto-select template -> tag work items with wave + team assignments
4. TaskCreate -- create work items with wave dependencies (GATE sentinel pattern)
5. IMMEDIATELY spawn teammates via Task tool with explicit /run instructions
6. Execute waves: bootstrap -> gate -> parallel (teammates invoke /run) -> gate -> integration
7. TaskList/TaskUpdate -- track progress
8. Aggregate -- synthesize results from teammate /run outputs
9. SendMessage (shutdown_request) -- shut down teammates
10. TeamDelete -- clean up resources
```

**Steps 2-5 are MANDATORY and IMMEDIATE.** Do not pause or ask permission between them.

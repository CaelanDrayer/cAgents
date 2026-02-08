# /team Execution Architecture

## Parallel Execution Model

```
/team <request>
    |
    +-- team-trigger (decomposes, creates agent team via TeamCreate)
        |
        +-- Team Lead (coordinates via SendMessage, manages TaskList)
        +-- Teammate 1: /run WI-001 --> (full orchestration) --> Complete
        +-- Teammate 2: /run WI-002 --> (full orchestration) --> Complete
        +-- Teammate 3: /run WI-003 --> (full orchestration) --> Complete
        |                 (parallel -- each in own context/tmux pane)
        |
        +-- Aggregates /run outputs into final result
```

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

// 3. IMMEDIATELY spawn teammates and assign work
// Each teammate MUST invoke /run via Skill tool
// /run will spin out its own controller + execution agents
```

### Teammate Assignment -- MUST Include Skill Invocation

```javascript
// Lead assigns work -- MUST include explicit Skill invocation
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

## Team Lead Behavior (Delegate Mode)

Team leads ONLY coordinate. They NEVER implement.

**Allowed actions:**
- Distribute work items to teammates via SendMessage
- Monitor task list progress via TaskList
- Request status from teammates via SendMessage
- Synthesize teammate outputs
- Write coordination_log.yaml
- Shut down teammates via SendMessage (type: shutdown_request)
- Clean up team via TeamDelete

**Prohibited actions:**
- Edit/Write implementation files
- Answer questions directly
- Execute work items themselves
- Skip delegation for "simple" tasks

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
1. TeamCreate -- create team and shared task list IMMEDIATELY
2. Auto-select template -> tag work items with wave + team assignments
3. TaskCreate -- create work items with wave dependencies (GATE sentinel pattern)
4. IMMEDIATELY spawn teammates
5. SendMessage -- assign work WITH explicit Skill({skill: "run"}) invocation
6. Execute waves: bootstrap -> gate -> parallel (teammates invoke /run) -> gate -> integration
7. TaskList/TaskUpdate -- track progress
8. Aggregate -- synthesize results from teammate /run outputs
9. SendMessage (shutdown_request) -- shut down teammates
10. TeamDelete -- clean up resources
```

**Steps 1-5 are MANDATORY and IMMEDIATE.** Do not pause or ask permission between them.

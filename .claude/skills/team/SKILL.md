---
name: team
description: "Parallel team-based workflow execution using Claude Code's built-in agent teams with tmux split pane display. Decomposes request into work items, creates a real team via TeamCreate, spawns teammates who each invoke /run."
argument-hint: "<request> [--dry-run] [--members <n>] [--teammate-mode tmux|auto|in-process] [--no-template]"
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Skill
---

# /team - Parallel Team Execution

You are a team orchestrator. Your job is to **create a real agent team and spawn real teammates**. You MUST call TeamCreate, TaskCreate, and spawn teammates via the Task tool. This is non-negotiable.

## MANDATORY: You MUST Execute These Steps

**If you do not call TeamCreate and spawn teammates via Task tool, you have FAILED.** Do not just describe what you would do. Do not just create tasks without teammates. Do not fall back to /run for the whole request. Actually execute the steps below.

## Step-by-Step Execution (Follow Exactly)

### Step 1: Parse the Request

Extract the user's request from `$ARGUMENTS`. Check for flags:
- `--dry-run`: Show plan only, do not execute
- `--members <N>`: Max teammates (default: 5)
- `--teammate-mode <mode>`: tmux (default from settings), auto, or in-process

The request is everything before the first `--` flag.

### Step 2: Decompose into Work Items

Break the user's request into 3-8 concrete work items. You do this yourself -- do NOT delegate decomposition to another agent. Think about what independent pieces of work are needed.

For each work item, define:
- **ID**: WI-001, WI-002, etc.
- **Description**: What needs to be done
- **Dependencies**: Which other WIs must complete first (if any)
- **Wave**: 0 (foundation/setup), 1 (main parallel work), 2 (integration/testing)

Assign waves:
- **Wave 0**: Setup, design, schemas, contracts (1-2 items, executed by you sequentially)
- **Wave 1**: Main implementation work (2-5 items, executed by teammates IN PARALLEL)
- **Wave 2**: Integration, testing, review (1-2 items, executed by you sequentially)

If the request produces fewer than 3 work items or has no parallelizable items, fall back:
```
Skill({ skill: "run", args: "<the full request>" })
```

If `--dry-run` is specified, display the work items and waves, then STOP.

### Step 3: Create the Team (TeamCreate)

Call TeamCreate IMMEDIATELY. Do not skip this step. Do not ask permission.

```
TeamCreate({
  team_name: "cagents-team-<YYYYMMDD-HHMMSS>",
  description: "Parallel execution: <summary of request>"
})
```

Use the current date/time for the timestamp. This creates the team and shared task list.

### Step 4: Create Tasks for ALL Work Items (TaskCreate)

Create a task for EVERY work item using TaskCreate. Create them all before spawning teammates.

For wave 0 items:
```
TaskCreate({ subject: "WI-001: <description>", description: "Wave 0 (bootstrap). <details and acceptance criteria>", activeForm: "Executing WI-001" })
```

For wave 1 items (add dependency on wave 0 completion):
```
TaskCreate({ subject: "WI-003: <description>", description: "Wave 1 (parallel). <details and acceptance criteria>", activeForm: "Executing WI-003" })
```

For wave 2 items:
```
TaskCreate({ subject: "WI-006: <description>", description: "Wave 2 (integration). <details and acceptance criteria>", activeForm: "Executing WI-006" })
```

### Step 5: Execute Wave 0 (Bootstrap) -- You Do This

Execute wave 0 work items yourself, sequentially, using /run:

```
Skill({ skill: "run", args: "WI-001: <description>. Acceptance criteria: <criteria>" })
```

After each wave-0 item completes, mark its task as completed:
```
TaskUpdate({ taskId: "<id>", status: "completed" })
```

### Step 6: Spawn Teammates for Wave 1 (CRITICAL -- This Creates tmux Panes)

**This is the step that creates actual team members and tmux split panes.** Spawn one teammate per wave-1 work item using the Task tool. The `team_name` and `name` parameters connect them to the team.

Spawn ALL teammates in PARALLEL (make all Task calls at once, do not wait between them):

```
Task({
  description: "Execute WI-003: <short description>",
  prompt: "You are a teammate executing a work item.

WORK ITEM: WI-003: <full description>
ACCEPTANCE CRITERIA: <criteria>

INSTRUCTIONS:
1. Use the Skill tool to invoke /run for your work item:
   Skill({ skill: 'run', args: 'WI-003: <description>. Acceptance criteria: <criteria>' })
2. After /run completes, mark your task completed:
   TaskUpdate({ taskId: '<task_id>', status: 'completed' })
3. Check TaskList for more unblocked work you can claim.
4. Send results to team lead: SendMessage({ type: 'message', recipient: '<lead_name>', content: 'WI-003 complete. <summary>', summary: 'WI-003 done' })"
})
```

**Spawn ALL wave-1 teammates simultaneously.** Each Task call creates a real Claude Code instance that appears as a tmux pane (when teammateMode is "tmux").

### Step 7: Monitor Progress

After spawning teammates:
1. Wait for teammate messages (they arrive automatically)
2. Periodically check TaskList to see progress
3. When all wave-1 tasks show completed, proceed to wave 2

### Step 8: Execute Wave 2 (Integration) -- You Do This

Execute wave 2 items yourself sequentially via /run:
```
Skill({ skill: "run", args: "WI-006: <description>. Acceptance criteria: <criteria>" })
```

Mark each completed:
```
TaskUpdate({ taskId: "<id>", status: "completed" })
```

### Step 9: Shut Down and Clean Up

1. Shut down each teammate:
```
SendMessage({ type: "shutdown_request", recipient: "<teammate_name>", content: "All work complete, shutting down." })
```

2. Clean up the team:
```
TeamDelete()
```

3. Report final results to the user.

## Key Rules

1. **You MUST call TeamCreate.** No exceptions. This is what creates the team.
2. **You MUST spawn teammates via Task tool.** This is what creates tmux panes.
3. **Spawn ALL wave-1 teammates at the same time** (parallel Task calls).
4. **Teammates invoke /run via Skill tool** -- they do NOT implement work directly.
5. **You (the lead) do wave 0 and wave 2** -- teammates do wave 1.
6. **Never ask permission** between steps. Execute the full pipeline automatically.
7. **Never just create tasks without spawning teammates** -- tasks without teammates are useless.
8. **Never implement work items yourself** (except wave 0/2 bootstrap and integration via /run).

## Fallback

If the request has fewer than 3 work items or no parallelizable work:
```
Skill({ skill: "run", args: "<the original request>" })
```

## Configuration

- `teammateMode` in settings.json controls display: `"tmux"` (split panes), `"auto"`, `"in-process"`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be `"1"` in settings.json env
- Both are already configured in this project's settings.json

See @reference/architecture.md for team execution model details.
See @reference/fallback-behavior.md for fallback and error recovery.
See @reference/flags.md for complete flag reference.

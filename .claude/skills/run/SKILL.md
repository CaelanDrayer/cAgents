---
name: run
description: "Universal workflow engine. Runs inline (no fork) to minimize subagent nesting. Performs routing + planning inline, delegates coordination to controllers via Task tool. 2-level chain (run -> controller -> execution)."
argument-hint: "<request> [--interactive] [--dry-run] [--quiet] [--team] [--resume <session_id>]"
user-invocable: true
context: none
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite
---

# /run - Universal Workflow Engine (Flattened Architecture)

You are the **universal workflow engine** that handles routing, planning, and orchestration inline (no fork -- runs in the current conversation context to minimize subagent nesting), then delegates coordination to the appropriate controller via Task tool. This 2-level chain (`/run -> controller -> execution`) keeps nesting within Claude Code's supported limits.

## Architecture: Flattened Delegation

```
/run (routing + planning + orchestration inline) -> controller -> execution_agents
```

`/run` performs the work previously done by trigger, orchestrator, universal-router, and universal-planner directly. Only the controller (which needs domain expertise to ask questions and synthesize) and execution agents (which do the actual work) are spawned as subagents.

## BLOCKING REQUIREMENT: TodoWrite

**TodoWrite is a BLOCKING PREREQUISITE for every phase transition.** You CANNOT proceed to the next step until you have called TodoWrite. This is not optional. This is not a suggestion. This is the primary mechanism for user-visible progress tracking.

**If you skip a TodoWrite call, the workflow is broken.** The user sees TodoWrite entries in the UI task list -- without them, the user has zero visibility into what is happening.

**Minimum 4 TodoWrite calls per /run execution** -- one at each of these steps:
1. Step 2 (after session init)
2. Step 3 (after routing completes)
3. Step 5 (before controller delegation)
4. Step 6 (after controller returns)

## Core Workflow (6 Steps)

When the user runs `/run <request> [flags]`:

---

### Step 1: Parse Arguments

Parse `$ARGUMENTS` for:
- **Flags**: `--interactive`, `--dry-run`, `--quiet`/`-q`, `--stream`, `--skip-preflight`, `--team`
- **Value flags**: `--template <name>`, `--domain <domain>`, `--tier <N>`, `--confidence <N>`, `--resume <session_id>`
- **Request**: Everything before the first `--` flag

If `--resume <session_id>`: Load session from `Agent_Memory/sessions/{session_id}/progress.md` and resume from last checkpoint.

---

### Step 2: Initialize Session + CALL TodoWrite

**ACTION 1 -- Create session files:**

```bash
SESSION_ID="run_$(date -u +%Y%m%d_%H%M%S)"
SESSION_DIR="Agent_Memory/sessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}/workflow"
mkdir -p "${SESSION_DIR}/outputs"
```

Write `instruction.yaml`:
```yaml
session_id: {SESSION_ID}
command: /run
request: "{user_request}"
created_at: "{ISO_TIMESTAMP}"
flags: {parsed_flags}
metadata:
  working_directory: {CWD}
```

Write `status.yaml`:
```yaml
phase: routing
created_at: "{ISO_TIMESTAMP}"
phase_history:
  - phase: routing
    entered_at: "{ISO_TIMESTAMP}"
```

**ACTION 2 -- Call TodoWrite NOW (this is mandatory, do not skip):**

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "in_progress", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "pending", "id": "plan"},
  {"content": "[controller] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

You have now initialized the session AND called TodoWrite. Proceed to Step 3.

---

### Step 3: Route + CALL TodoWrite

**ACTION 1 -- Classify domain and tier (inline, no delegation):**

| Domain | Keywords |
|--------|----------|
| Make (engineering) | fix, bug, implement, code, api, database, build, refactor, test, deploy |
| Make (creative) | write, story, content, design, creative, novel, script, poem |
| Make (game dev) | game, level, quest, character, mechanic, balance, gameplay |
| Grow | campaign, marketing, sales, conversion, SEO, funnel, leads, revenue |
| Operate | budget, cost, forecast, operations, process, supply chain, procurement |
| People | hire, recruit, onboard, culture, HR, talent, performance review |
| Serve | support, legal, compliance, customer, SLA, contract, privacy |

**Tier Classification** (minimum tier 2):

| Tier | Criteria | Controllers |
|------|----------|-------------|
| 2 | Single component, clear scope | 1 primary controller |
| 3 | Multiple components, external deps | 1 primary + 1-2 supporting |
| 4 | Strategic/architectural, company-wide | Executive + HITL |

Update `status.yaml` phase to `planning`.

**ACTION 2 -- Call TodoWrite NOW with the specific controller name:**

Replace `[controller]` with the actual controller identified during routing (e.g., `engineering-manager`, `creative-director`).

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "in_progress", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "pending", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

Output a brief routing summary:
```
[/run] Routing... Domain: {domain}, Tier: {tier}, Controller: {controller_name}
```

Proceed to Step 4.

---

### Step 4: Plan (Inline -- No Delegation)

Define objectives and select the controller. Load the appropriate planner_config.yaml:
- Make: `make/config/planner_config.yaml`
- Grow: `grow/config/planner_config.yaml`
- Operate: `operate/config/planner_config.yaml`
- People: `people/config/planner_config.yaml`
- Serve: `serve/config/planner_config.yaml`

Match the request to a controller from the `controller_catalog` based on `use_when` patterns and the classified tier.

**Common Controller Mappings** (quick reference):

| Request Type | Controller |
|-------------|-----------|
| Bug fix, code fix | engineering-manager |
| Architecture, system design | architect |
| Frontend work | frontend-lead |
| Backend work | backend-lead |
| Story, creative writing | editor or creative-director |
| Game design | game-designer or game-producer |
| Marketing campaign | campaign-manager |
| Sales strategy | sales-strategist |
| Budget, finance | finance-manager |
| HR, hiring | hr-manager |
| Customer support | customer-success-manager or vp-customer-support |
| Legal, compliance | legal-counsel or general-counsel |

Write `plan.yaml`:
```yaml
plan_id: plan_{SESSION_ID}
tier: {tier}
domain: {domain}
request: "{user_request}"

objectives:
  - "{objective_1}"
  - "{objective_2}"

controller_assignment:
  primary: cagents:{controller_name}
  supporting: []  # Add for tier 3+

work_items_summary:
  count: {estimated_count}
  types: {understand, design, build, verify}
```

Write `decomposition.yaml` for tier 3+ (inline for tier 2):
```yaml
work_items:
  - id: WI-001
    name: "{work_item_name}"
    type: understand|design|build|verify
    acceptance_criteria:
      - "{criterion_1}"
    dependencies: []
```

If `--dry-run`: Display plan and STOP here.
If `--team`: Delegate to team-trigger with plan.yaml already written (skip to team execution).

Update `status.yaml` phase to `coordinating`.

Output a brief planning summary:
```
[/run] Planning... {N} objectives, {M} work items, controller: {controller_name}
```

Proceed to Step 5.

---

### Step 5: CALL TodoWrite + Delegate to Controller

**ACTION 1 -- Call TodoWrite NOW to mark coordination starting:**

```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "in_progress", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
])
```

**ACTION 2 -- Spawn the controller via Task tool:**

```
Task({
  subagent_type: "cagents:{controller_name}",
  description: "Coordinate: {request}",
  prompt: `You are the {controller_name} controller coordinating work for this request.

REQUEST: {user_request}
SESSION: Agent_Memory/sessions/{SESSION_ID}/
DOMAIN: {domain} | TIER: {tier}

INSTRUCTIONS:
1. Read workflow/plan.yaml for objectives and work items.
2. Break objectives into specific questions.
3. For EACH question, delegate to an execution agent via Task tool:
   Task({ subagent_type: "cagents:{execution_agent}", description: "Answer: {question}", prompt: "{question}" })
4. After identifying which execution agents you will use, call TodoWrite to show them:
   TodoWrite([
     {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
     {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
     {"content": "[{controller_name}] Coordinate: ask questions and synthesize", "status": "in_progress", "id": "coordinate"},
     {"content": "[{exec_agent_1}] {specific_task_1}", "status": "pending", "id": "exec1"},
     {"content": "[{exec_agent_2}] {specific_task_2}", "status": "pending", "id": "exec2"},
     {"content": "[/run] Validate outputs and quality", "status": "pending", "id": "validate"}
   ])
5. Synthesize answers into a coherent solution.
6. Coordinate implementation via execution agents.
7. Write coordination_log.yaml when complete with status: completed.
`
})
```

The controller will coordinate the work. Wait for it to return.

Update `status.yaml` phase to `executing` then `validating` after controller returns.

---

### Step 6: CALL TodoWrite + Validate and Report

After the controller returns:

1. **Check coordination_log.yaml** exists and has `status: completed`
2. **Verify outputs** match plan objectives
3. **Write execution_summary.yaml** with results
4. **Update status.yaml** to `completed`

**ACTION -- Call TodoWrite NOW to mark completion:**

On success:
```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "completed", "id": "coordinate"},
  {"content": "[/run] Validate outputs and quality", "status": "completed", "id": "validate"}
])
```

On failure:
```
TodoWrite([
  {"content": "[/run] Route request to domain and tier", "status": "completed", "id": "route"},
  {"content": "[/run] Plan objectives and select controller", "status": "completed", "id": "plan"},
  {"content": "[{controller_name}] Coordinate work via question-based delegation", "status": "completed", "id": "coordinate"},
  {"content": "[/run] Validate outputs -- FAILED: {reason}", "status": "in_progress", "id": "validate"}
])
```

5. **Report results** to user

If validation fails:
- FIXABLE: Note issues, report with suggestions
- BLOCKED: Report failure, suggest `--resume {SESSION_ID}`

---

## Team Mode (--team flag)

For team mode, after completing Steps 1-4 (routing + planning), delegate to team-trigger:

```
Task({
  subagent_type: "cagents:team-trigger",
  description: "Team: {request}",
  prompt: `
    Request: {request}
    Session: Agent_Memory/sessions/{SESSION_ID}/
    Mode: team_execution
    Plan already created at: workflow/plan.yaml
    Decomposition at: workflow/decomposition.yaml
    Initialize team execution from existing plan.
  `
})
```

## TodoWrite Rules Summary

1. **/run calls TodoWrite exactly 4 times** -- Steps 2, 3, 5, and 6.
2. **Each TodoWrite call is ACTION 1 or ACTION 2 in its step** -- it happens BEFORE or IMMEDIATELY AFTER the main work, never as an afterthought.
3. **The controller also calls TodoWrite** when it identifies execution agents (progressive refinement -- see the prompt template in Step 5).
4. **Never use generic placeholders** after the specific agent is known. Replace `[controller]` with `[engineering-manager]` etc.
5. **Never have zero tasks `in_progress`** -- always transition one to `completed` and the next to `in_progress` in the same call.
6. **Each execution agent gets its own entry** with `[agent-name] specific task description`.

## What /run Does Directly (Exhaustive List)

- Parse flags from arguments
- Create session directory and files (instruction.yaml, status.yaml, plan.yaml, decomposition.yaml)
- **Call TodoWrite** (Step 2: initial task list)
- Domain detection (keyword-based routing)
- Tier classification
- **Call TodoWrite** (Step 3: replace `[controller]` with specific name)
- Controller selection (from planner_config.yaml)
- Plan creation (objectives, work items)
- **Call TodoWrite** (Step 5: mark coordination as in_progress)
- Spawn controller via Task tool
- Validate controller output
- **Call TodoWrite** (Step 6: mark all tasks completed)
- Report results to user

## What /run Delegates (Exhaustive List)

- **Controller** (via Task tool): Question-based coordination, synthesis, implementation task management
- **Execution agents** (via controller): Actual implementation work (coding, writing, analysis)
- **Team-trigger** (via Task tool, --team mode only): Parallel team execution

## Error Handling

If the controller fails or returns incomplete:
1. **Check for partial results** in coordination_log.yaml
2. **Report what completed** vs what remains
3. **Suggest recovery**: `/run --resume {SESSION_ID}`
4. **Save progress** in progress.md for resumption

If context is exhausted mid-workflow:
1. Session state is preserved in Agent_Memory/sessions/
2. pre-compact-save hook creates waypoints automatically
3. User can resume with `/run --resume {SESSION_ID}`

## Argument Handling

See @reference/flags.md for complete flag reference with defaults and examples.

## Configuration

- Planner configs: `{domain}/config/planner_config.yaml`
- Session folder: `Agent_Memory/sessions/run_{YYYYMMDD_HHMMSS}/`
- Agent audit trail: `Agent_Memory/sessions/{session_id}/workflow/agent_tree.yaml`
- Global audit log: `Agent_Memory/_system/logs/agent_spawns.log`

## Agent Audit Trail

When spawned as a subagent (e.g., by /team), self-register in agent_tree.yaml:
```yaml
    cagents_type: "cagents:run"
    role_description: "Universal workflow engine - routing, planning, and orchestration"
```

---

**Flattened architecture: Route and plan inline, delegate coordination to controllers. 2 levels instead of 5. TodoWrite at every phase transition.**

---
name: run
description: "Universal workflow engine with flattened delegation. Performs routing + planning inline, delegates coordination to controllers via Task tool. 2-level chain (run -> controller -> execution) replaces previous 5-level chain."
argument-hint: "<request> [--interactive] [--dry-run] [--quiet] [--team] [--resume <session_id>]"
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite
---

# /run - Universal Workflow Engine (Flattened Architecture)

You are the **universal workflow engine** that handles routing, planning, and orchestration inline, then delegates coordination to the appropriate controller via Task tool. This flattened architecture replaces the previous 5-level delegation chain (`/run -> trigger -> orchestrator -> controller -> execution`) with a reliable 2-level chain (`/run -> controller -> execution`).

## Architecture: Flattened Delegation

**Previous** (5 levels, unreliable):
```
/run -> trigger -> orchestrator -> controller -> execution_agents
```

**Current** (2 levels, reliable):
```
/run (routing + planning + orchestration inline) -> controller -> execution_agents
```

`/run` now performs the work previously done by trigger, orchestrator, universal-router, and universal-planner directly. Only the controller (which needs domain expertise to ask questions and synthesize) and execution agents (which do the actual work) are spawned as subagents.

## Core Workflow (6 Steps)

When the user runs `/run <request> [flags]`:

### Step 1: Parse Arguments

Parse `$ARGUMENTS` for:
- **Flags**: `--interactive`, `--dry-run`, `--quiet`/`-q`, `--stream`, `--skip-preflight`, `--team`
- **Value flags**: `--template <name>`, `--domain <domain>`, `--tier <N>`, `--confidence <N>`, `--resume <session_id>`
- **Request**: Everything before the first `--` flag

If `--resume <session_id>`: Load session from `Agent_Memory/sessions/{session_id}/progress.md` and resume from last checkpoint.

### Step 2: Initialize Session

Create the session directory and files BEFORE any delegation:

```bash
# Session ID format
SESSION_ID="run_$(date -u +%Y%m%d_%H%M%S)"
SESSION_DIR="Agent_Memory/sessions/${SESSION_ID}"

# Create in this exact order (hooks depend on status.yaml existing)
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

### Step 3: Route (Inline -- No Delegation)

Classify the request domain and complexity tier. This was previously done by trigger + universal-router across 2 agent levels.

**Domain Detection** (keyword-based, fast):

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

**Scope adjustments**: Multiple systems (+1), external dependencies (+1), high-risk (+1), executive approval needed (+2).

Update `status.yaml` phase to `planning`.

### Step 4: Plan (Inline -- No Delegation)

Define objectives and select the controller. This was previously done by orchestrator + universal-planner across 2 agent levels.

**Controller Selection**: Load the appropriate planner_config.yaml for the detected domain:
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

### Step 5: Delegate to Controller (via Task tool)

This is the ONLY delegation step. Spawn the selected controller to coordinate the work.

```javascript
Task({
  subagent_type: "cagents:{controller_name}",
  description: "Coordinate: {request}",
  prompt: `
    Request: {user_request}
    Session: Agent_Memory/sessions/{SESSION_ID}/
    Domain: {domain} | Tier: {tier}
    Read plan.yaml for objectives and work items.
    Coordinate via question-based delegation to execution agents.
    Write coordination_log.yaml when complete.
  `
})
```

The controller will:
1. Read plan.yaml for objectives
2. Break objectives into questions
3. Delegate questions to execution agents via Task tool
4. Synthesize answers
5. Create implementation tasks
6. Write coordination_log.yaml

Update `status.yaml` phase to `executing` then `validating` after controller returns.

### Step 6: Validate and Report

After the controller returns:

1. **Check coordination_log.yaml** exists and has `status: completed`
2. **Verify outputs** match plan objectives
3. **Write execution_summary.yaml** with results
4. **Update status.yaml** to `completed`
5. **Report results** to user

If validation fails:
- FIXABLE: Note issues, report with suggestions
- BLOCKED: Report failure, suggest `--resume {SESSION_ID}`

## Team Mode (--team flag)

For team mode, after completing Steps 1-4 (routing + planning), delegate to team-trigger:

```javascript
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

## Progress Reporting

Report progress at each step. Prefix with agent name:

```
/run Fix auth bug

[/run] Routing...
  Domain: Make (engineering), Confidence: 0.92
  Tier: 2, Controller: engineering-manager

[/run] Planning...
  Objectives: Fix authentication timeout, Add regression tests
  Work items: 5 (1 understand, 1 design, 2 build, 1 verify)

[engineering-manager] Coordinating...
  Questions asked: 3
  - [backend-developer] Current auth implementation: JWT with 30min expiry
  - [security-specialist] Risk assessment: Medium (timeout too short)
  - [qa-tester] Test coverage: 45% (needs improvement)

[engineering-manager] Implementation:
  - [backend-developer] Fixed timeout to 1hr with refresh
  - [qa-tester] Added 5 regression tests (coverage: 82%)

[/run] Validation: PASSED
  All objectives met. Session: Agent_Memory/sessions/run_20260227_100000/
```

## TodoWrite Progressive Refinement

**CRITICAL**: TodoWrite entries MUST be updated with specific agent names as soon as routing decisions are made. The task list should progressively refine from generic placeholders to specific agents so the user always sees exactly which agent handles each task.

See @shared/patterns/todo_write_helper.md for the full Progressive Refinement Pattern.

### /run TodoWrite Flow (3 Updates Minimum)

**Update 1 -- Session start** (generic placeholders):
```javascript
TodoWrite({
  todos: [
    {content: "[/run] Route request to domain and tier", status: "in_progress", activeForm: "[/run] Routing request"},
    {content: "[/run] Plan objectives and select controller", status: "pending", activeForm: "[/run] Planning objectives"},
    {content: "[controller] Coordinate work via question-based delegation", status: "pending", activeForm: "[controller] Coordinating work"},
    {content: "[/run] Validate outputs and quality", status: "pending", activeForm: "[/run] Validating outputs"}
  ]
})
```

**Update 2 -- After routing selects controller** (replace `[controller]` with specific name):
```javascript
TodoWrite({
  todos: [
    {content: "[/run] Route request to domain and tier", status: "completed"},
    {content: "[/run] Plan objectives and select controller", status: "in_progress", activeForm: "[/run] Planning objectives"},
    {content: "[engineering-manager] Coordinate work via question-based delegation", status: "pending", activeForm: "[engineering-manager] Coordinating work"},
    {content: "[/run] Validate outputs and quality", status: "pending", activeForm: "[/run] Validating outputs"}
  ]
})
```

**Update 3 -- Controller identifies execution agents** (add specific executor entries):

The controller is responsible for this update. When it determines which execution agents will be used, it replaces its generic coordination entry with specific per-agent entries:

```javascript
TodoWrite({
  todos: [
    {content: "[/run] Route request to domain and tier", status: "completed"},
    {content: "[/run] Plan objectives and select controller", status: "completed"},
    {content: "[engineering-manager] Coordinate: ask questions and synthesize", status: "in_progress", activeForm: "[engineering-manager] Coordinating work"},
    {content: "[backend-developer] Implement auth timeout fix", status: "pending", activeForm: "[backend-developer] Implementing auth timeout fix"},
    {content: "[security-specialist] Review security implications", status: "pending", activeForm: "[security-specialist] Reviewing security implications"},
    {content: "[qa-tester] Create regression tests", status: "pending", activeForm: "[qa-tester] Creating regression tests"},
    {content: "[/run] Validate outputs and quality", status: "pending", activeForm: "[/run] Validating outputs"}
  ]
})
```

### Rules

1. `/run` updates TodoWrite twice: once at start (generic), once after controller selection (specific controller name)
2. The controller updates TodoWrite when it identifies which execution agents it will delegate to
3. If multiple executors: add a SEPARATE entry for each executor with `[agent-name] specific task description`
4. Never show generic `[executor]` or `[execution-agent]` -- always use the actual agent name
5. Include a brief task description for each executor entry (not just the agent name)

## What /run Does Directly (Exhaustive List)

- Parse flags from arguments
- Create session directory and files (instruction.yaml, status.yaml, plan.yaml, decomposition.yaml)
- Domain detection (keyword-based routing)
- Tier classification
- Controller selection (from planner_config.yaml)
- Plan creation (objectives, work items)
- Spawn controller via Task tool
- Validate controller output
- Report results to user
- Create TodoWrite entries for progress visibility

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

**Flattened architecture: Route and plan inline, delegate coordination to controllers. 2 levels instead of 5.**

---
name: run
description: "Event-driven pipeline engine. Runs inline (no fork) with state machine loop reading pipeline_config.yaml. Spawns agents sequentially at level 1, controllers spawn executors/reviewers at level 2. Supports revision loops and pre-enrichment detection."
argument-hint: "<request> [--interactive] [--dry-run] [--quiet] [--team] [--brief <path>] [--resume <session_id>] [--session <session_dir>] [--analytics]"
user-invocable: true
context: none
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite
---

# /run - Event-Driven Pipeline Engine

You are the **event-driven pipeline engine** that executes a state machine loop, spawning agents sequentially at level 1 based on `pipeline_config.yaml`. Controllers spawn executors and reviewers at level 2. Revision loops at both levels ensure quality. This replaces the previous fixed 6-step workflow with a config-driven state machine.

## Architecture: Event-Driven State Machine

```
/run (state machine loop -- level 0)
  |
  Phase 1: Sequential enrichment (all level 1, spawned by /run)
  +-> orchestrator (level 1)    -> enriched_context.yaml
  +-> planner (level 1)         -> plan.yaml
  +-> decomposer (level 1)      -> work_items.yaml
  +-> prompt-engineer (level 1)  -> delegation_prompts.yaml
  |
  Phase 2: Nested execution (level 1 + 2)
  +-> controller (level 1)
       +-> executor (level 2)   -> implementation
       +-> reviewer (level 2)   -> review_report.yaml
       +-> revision loop (level 2, max 3 rounds)
  |
  Phase 3: Validation (level 1)
  +-> validator (level 1)       -> validation_report.yaml
  |
  Revision loop (max 5 rounds):
    FAIL   -> back to Phase 2 (PROMPTS_READY)
    REVISE -> back to Phase 1 (PLANNED, re-plan)
```

## BLOCKING REQUIREMENT: TodoWrite

**TodoWrite is a BLOCKING PREREQUISITE for every state transition.** You CANNOT proceed to the next state until you have called TodoWrite. This is not optional.

**If you skip a TodoWrite call, the workflow is broken.** The user sees TodoWrite entries in the UI task list -- without them, the user has zero visibility into what is happening.

**Minimum TodoWrite calls**: One per state transition (typically 7+ per full pipeline run).

## Core Workflow (State Machine)

When the user runs `/run <request> [flags]`:

---

### Step 1: Parse Arguments

Parse `$ARGUMENTS` for:
- **Flags**: `--interactive`, `--dry-run`, `--quiet`/`-q`, `--stream`, `--skip-preflight`, `--team`, `--analytics`
- **Value flags**: `--template <name>`, `--domain <domain>`, `--tier <N>`, `--confidence <N>`, `--brief <path>`, `--resume <session_id>`, `--session <session_dir>`
- **Request**: Everything before the first `--` flag

If `--analytics`: Read `Agent_Memory/_system/metrics/pipeline_analytics.yaml`, display the analytics dashboard (success rate, avg duration, by-domain, by-tier, bottlenecks), and exit without running a pipeline.

If `--resume <session_id>`: Load session from `Agent_Memory/sessions/{session_id}/progress.md` and resume from last checkpoint.

If `--session <session_dir>`: This is a pre-enriched session (from /team). Skip to pre-enrichment detection in Step 3.

If `--brief <path>`: This request comes from `/org` with a strategic brief. Read the `strategic_brief.yaml` at the given path. Use the brief's `mission`, `success_criteria`, and `domain_assignments` to enrich context passed to the orchestrator and planner. The brief provides CEO-level strategic framing that gives downstream agents richer context about the mission and constraints. Store brief path in `instruction.yaml` as `strategic_brief_path`.

---

### Step 2: Initialize Session + Load Pipeline Config

**ACTION 1 -- Create session files:**

```bash
SESSION_ID="run_$(date -u +%Y%m%d_%H%M%S)"
SESSION_DIR="Agent_Memory/sessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}/workflow/events"
mkdir -p "${SESSION_DIR}/outputs"
```

If `--session` was provided, use that directory instead and skip session creation.

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
pipeline_state: INIT
revision_round: 0
created_at: "{ISO_TIMESTAMP}"
state_history:
  - state: INIT
    entered_at: "{ISO_TIMESTAMP}"
```

**ACTION 2 -- Load pipeline config:**

Read `Agent_Memory/_system/config/pipeline_config.yaml` to get the state machine definition.

**ACTION 3 -- Call TodoWrite NOW (mandatory):**

```
TodoWrite([
  {"content": "[/run] Pipeline: INIT (enriching context)", "status": "in_progress", "id": "init"},
  {"content": "[/run] Pipeline: ORCHESTRATED (planning)", "status": "pending", "id": "orchestrated"},
  {"content": "[/run] Pipeline: PLANNED (decomposing)", "status": "pending", "id": "planned"},
  {"content": "[/run] Pipeline: DECOMPOSED (crafting prompts)", "status": "pending", "id": "decomposed"},
  {"content": "[controller] Pipeline: PROMPTS_READY (coordinating)", "status": "pending", "id": "prompts_ready"},
  {"content": "[/run] Pipeline: COORDINATED (validating)", "status": "pending", "id": "coordinated"},
  {"content": "[/run] Pipeline: VALIDATED (complete)", "status": "pending", "id": "validated"}
])
```

Proceed to Step 3.

---

### Step 3: State Machine Loop

This is the core loop. For each state in the pipeline:

**3a. Check pre-enrichment (for /team teammate flows):**

If `--session` was provided, check which enrichment files already exist:
- `enriched_context.yaml` exists -> skip INIT, start from ORCHESTRATED
- `plan.yaml` exists -> skip INIT+ORCHESTRATED, start from PLANNED
- `work_items.yaml` exists -> skip through PLANNED, start from DECOMPOSED

Set `current_state` to the first state that needs execution based on pre-enrichment detection. Use the `pre_enrichment.skip_if_exists` mapping from pipeline_config.yaml.

**3b. Route domain and tier (inline, during INIT processing):**

Before spawning the orchestrator, classify domain and tier inline:

| Domain | Keywords |
|--------|----------|
| Engineering | fix, bug, implement, code, api, database, build, refactor, test, deploy, backend, frontend, devops, security, infrastructure |
| Creative | write, story, content, narrative, novel, script, poem, game art, audio, animation, character design, worldbuild |
| Business | budget, cost, forecast, operations, process, supply chain, procurement, strategy, campaign, marketing, sales, conversion, SEO, funnel, leads, revenue, product, roadmap, planning |
| People | hire, recruit, onboard, culture, HR, talent, performance review, benefits, compensation, diversity |
| Service | support, legal, compliance, customer, SLA, contract, privacy, governance, ticket, escalation |

Load domain controller catalog from `{domain}/config/domain_overrides.yaml`.

**3b-1b. Complexity scoring (9 signals) for progressive pipeline:**

Compute a complexity score (0.0 to 1.0) inline using 9 weighted signals:

| Signal | Weight | Scoring |
|--------|--------|---------|
| Request length | 0.15 | <10 words: 0, 10-30: 0.3, 30-60: 0.6, 60+: 1.0 |
| Complexity keywords | 0.20 | "refactor", "migrate", "integrate", "redesign" each +0.25 (capped 1.0) |
| Multi-component | 0.10 | "and", "then", "plus", "also" each +0.25 (capped 1.0) |
| File references | 0.10 | Explicit file paths: +0.33 per file (capped 1.0) |
| Domain breadth | 0.15 | Multi-domain keywords: 1 domain=0, 2+=1.0 |
| Test requirements | 0.05 | "with tests", "ensure", "verify": 1.0 if present |
| Security markers | 0.10 | "auth", "encryption", "RBAC", "security": 1.0 if present |
| Architecture markers | 0.10 | "API", "database", "microservice", "schema": 1.0 if present |
| Scale markers | 0.05 | "all", "every", "entire", "comprehensive": 1.0 if present |

`complexity_score = sum(signal_score * weight)`

**Pipeline path selection:**

| Path | Score Range | States | Skip Agents |
|------|-----------|--------|-------------|
| **Minimal** | < 0.25 | PLANNED -> PROMPTS_READY -> COORDINATED | orchestrator, decomposer, prompt-engineer, validator |
| **Medium** | 0.25 - 0.65 | PLANNED -> DECOMPOSED -> PROMPTS_READY -> COORDINATED -> VALIDATED | orchestrator, prompt-engineer |
| **Full** | >= 0.65 or tier 4 | All 7 states | none |

Display the selected path:
```
Pipeline: {path} (score: {score:.2f}), Domain={domain}, Tier={tier}, Controller={controller}
```

**Planner escalation**: After planner runs, if plan.yaml contains `complexity_escalation: medium` or `complexity_escalation: full`, upgrade to the higher path (never downgrade).

**Tier Classification** (minimum tier 2):

| Tier | Criteria | Controllers |
|------|----------|-------------|
| 2 | Single component, clear scope | 1 primary controller |
| 3 | Multiple components, external deps | 1 primary + 1-2 supporting |
| 4 | Strategic/architectural, company-wide | Executive + HITL |

**3b-2. Display domain/tier confirmation:**

After classifying domain and tier, display the classification to the user for transparency:

```
Detected: Domain={domain} ({super_domain}), Tier={tier}, Controller={controller_name}
```

If `--interactive`, ask for confirmation with override options:
```
I detected this as a {domain} task (Tier {tier}). Is that right?
1. Yes, proceed
2. Different domain: [specify]
3. Higher complexity: Tier 3 or 4
```

If not interactive, just display and proceed. Include an override hint:
```
Detected: Domain=Make (Engineering), Tier=2, Controller=engineering-manager
  (Override with: --domain <domain> --tier <N>)
```

**3b-3. Adaptive pipeline (tier-based state skipping):**

For **tier 2** requests with clear scope, skip enrichment agents that add minimal value:

| State | Tier 2 (Simple) | Tier 3+ (Complex) |
|-------|-----------------|-------------------|
| INIT (orchestrator) | **SKIP** -- /run does inline enrichment | Execute |
| ORCHESTRATED (planner) | Execute (always needed) | Execute |
| PLANNED (decomposer) | **SKIP** -- single work item from plan.yaml | Execute |
| DECOMPOSED (prompt-engineer) | **SKIP** -- use default delegation prompt | Execute |
| PROMPTS_READY (controller) | Execute | Execute |
| COORDINATED (validator) | Execute | Execute |

**Tier 2 fast path**:
```
/run -> inline enrichment -> planner -> controller -> validator -> DONE
```

This saves 3 agent spawns (orchestrator, decomposer, prompt-engineer) for simple tasks, reducing execution time by ~40%.

For tier 2, when skipping INIT:
- Write a minimal `enriched_context.yaml` inline with the user request, domain, tier, and working directory context.
- This becomes the planner's input.

For tier 2, when skipping DECOMPOSED:
- Extract the single work item from plan.yaml objectives directly.
- Write a minimal `work_items.yaml` with one work item.

For tier 2, when skipping PROMPTS_READY prompt-engineer:
- Use a default delegation prompt template instead of a crafted one.
- Write a minimal `delegation_prompts.yaml` with the standard controller prompt.

Update the TodoWrite to reflect the shorter pipeline:
```
TodoWrite([
  {"content": "[/run] Pipeline: INIT (inline enrichment)", "status": "completed", "id": "init"},
  {"content": "[/run] Pipeline: PLANNED (planning)", "status": "in_progress", "id": "planned"},
  {"content": "[controller] Pipeline: PROMPTS_READY (coordinating)", "status": "pending", "id": "prompts_ready"},
  {"content": "[/run] Pipeline: COORDINATED (validating)", "status": "pending", "id": "coordinated"},
  {"content": "[/run] Pipeline: VALIDATED (complete)", "status": "pending", "id": "validated"}
])
```

**3c. Execute state machine loop:**

```
while current_state is not terminal (VALIDATED):
  1. Look up current_state in pipeline_config.yaml
  2. Determine agent to spawn (or "dynamic" for controller from plan.yaml)
  3. Spawn agent at level 1 via Task tool (see delegation below)
  4. After agent returns, read completion event from workflow/events/
  5. Update status.yaml with new state
  6. Call TodoWrite to reflect progress
  7. Check for revision: if validator returned FAIL or REVISE, route accordingly
  8. Advance to next_state from event file
```

**3d. Agent delegation pattern (for each state):**

```
Task({
  subagent_type: "cagents:{agent_from_pipeline_config}",
  description: "{state}: {brief_description}",
  prompt: `You are the {agent_name} in the event-driven pipeline.

REQUEST: {user_request}
SESSION: Agent_Memory/sessions/{SESSION_ID}/
DOMAIN: {domain} | TIER: {tier}
CURRENT STATE: {current_state}

INSTRUCTIONS:
1. Read your inputs from the session workflow/ directory.
2. Perform your phase work.
3. Write your outputs to the session workflow/ directory.
4. Write a completion event to workflow/events/EVT-{N}.yaml:
   event_id: EVT-{N}
   state: {next_state}
   agent: cagents:{agent_name}
   timestamp: "{ISO_TIMESTAMP}"
   inputs_consumed: [{inputs}]
   outputs_produced: [{outputs}]
   next_state: {next_state}
`
})
```

**For the PROMPTS_READY state (controller):**

The controller is dynamic -- resolved from `plan.yaml` `controller_assignment.primary`. Use the delegation prompt from `workflow/delegation_prompts.yaml` if available (crafted by prompt-engineer), otherwise fall back to standard controller prompt.

```
Task({
  subagent_type: "cagents:{controller_from_plan}",
  description: "Coordinate: {request}",
  prompt: `You are the {controller_name} controller coordinating work for this request.

REQUEST: {user_request}
SESSION: Agent_Memory/sessions/{SESSION_ID}/
DOMAIN: {domain} | TIER: {tier}

INSTRUCTIONS:
1. Read workflow/delegation_prompts.yaml for your optimized delegation prompt.
2. Read workflow/plan.yaml for objectives and work items.
3. Break objectives into specific questions.
4. For EACH question, delegate to an execution agent via Task tool.
5. After each executor completes, spawn a reviewer to evaluate against acceptance criteria.
6. If reviewer says REVISE: send feedback to executor (max 3 internal rounds).
7. After identifying execution agents, call TodoWrite to show them.
8. Synthesize answers into a coherent solution.
9. Write coordination_log.yaml when complete with status: completed.
10. Write completion event to workflow/events/EVT-{N}.yaml with state: COORDINATED.
`
})
```

**3e. Call TodoWrite after each state transition:**

After each agent returns and a state transition occurs, call TodoWrite to update progress. Mark the completed state as `completed` and the next state as `in_progress`.

**3f. Revision handling:**

After the COORDINATED state, read `workflow/validation_report.yaml`:

- **PASS**: Advance to VALIDATED (terminal). Pipeline complete.
- **FAIL**: Route back to PROMPTS_READY. Increment `revision_round`. Pass feedback from validation_report.yaml to the controller. Max 5 total revision cycles.
- **REVISE**: Route back to PLANNED. Increment `revision_round`. Pass feedback to the planner. Max 5 total revision cycles.

If `revision_round >= max_cycles` (5): Escalate to user (HITL). Report what completed and what failed.

Update TodoWrite on revision:
```
TodoWrite([
  ...completed_states...,
  {"content": "[/run] REVISION {N}/5: Re-running from {target_state}", "status": "in_progress", "id": "revision"},
  ...remaining_states...
])
```

---

### Step 4: Report Results

After the state machine loop exits:

1. **Read final state** from status.yaml
2. **Summarize pipeline execution**: which states ran, revision cycles used, final status
3. **Write execution_summary.yaml** with results:

```yaml
session_id: {SESSION_ID}
final_state: VALIDATED  # or FAILED
revision_rounds_used: {N}
states_executed: [INIT, ORCHESTRATED, PLANNED, DECOMPOSED, PROMPTS_READY, COORDINATED, VALIDATED]
total_agents_spawned: {count}
```

4. **Update status.yaml** to `completed`
5. **Track execution analytics**: Append session metrics to `Agent_Memory/_system/metrics/pipeline_analytics.yaml`:

```yaml
# Append to session_log array
session_log:
  - session_id: {SESSION_ID}
    date: "{ISO_DATE}"
    domain: "{domain}"
    tier: {tier}
    controller: "{controller_name}"
    final_state: VALIDATED|FAILED
    revision_rounds: {N}
    states_executed: [{list}]
    states_skipped: [{list}]  # from adaptive pipeline
    total_agents_spawned: {count}
    duration_seconds: {elapsed}
    started_at: "{ISO_TIMESTAMP}"
    completed_at: "{ISO_TIMESTAMP}"
```

After appending, recalculate aggregate metrics (total_sessions, success_rate, avg_duration, by_domain, by_tier, bottlenecks). Keep the last 500 sessions in the log; archive older entries.

6. **Report results** to user

If pipeline failed after max revisions:
- Report what completed vs what remains
- Suggest recovery: `/run --resume {SESSION_ID}`
- Save progress in progress.md for resumption

---

## Team Mode (--team flag)

For team mode, after completing routing + planning inline, delegate to `/team`:

```
Skill({ skill: "team", args: "{request} --session {SESSION_DIR}" })
```

The /team skill handles decomposition into work items, team creation, and parallel execution. Each teammate invokes `/run --session {SESSION_DIR}` which detects pre-enrichment and picks up from the appropriate state.

If `--dry-run` with `--team`: Display plan summary and team composition, then STOP.

## TodoWrite Rules Summary

1. **/run calls TodoWrite at every state transition** -- minimum once per state.
2. **Each TodoWrite call happens BEFORE advancing to the next state.**
3. **The controller also calls TodoWrite** when it identifies execution agents (progressive refinement).
4. **Never use generic placeholders** after the specific agent is known. Replace `[controller]` with `[engineering-manager]` etc.
5. **Never have zero tasks `in_progress`** -- always transition one to `completed` and the next to `in_progress` in the same call.
6. **On revision, add a revision entry** showing round number and target state.

## What /run Does Directly (Exhaustive List)

- Parse flags from arguments
- Create session directory and files (instruction.yaml, status.yaml)
- Load pipeline_config.yaml
- Read strategic_brief.yaml if `--brief` flag provided (from /org)
- Domain detection and tier classification (inline)
- **Call TodoWrite** at every state transition
- Spawn pipeline agents via Task tool (one per state)
- Read completion events from workflow/events/
- Handle revision routing (FAIL -> PROMPTS_READY, REVISE -> PLANNED)
- Validate final state and write execution_summary.yaml
- Report results to user

## What /run Delegates (Exhaustive List)

- **Orchestrator** (level 1): Enrich context -> enriched_context.yaml
- **Universal-planner** (level 1): Plan objectives -> plan.yaml
- **Task-decomposer** (level 1): Decompose -> work_items.yaml
- **Prompt-engineer** (level 1): Craft prompts -> delegation_prompts.yaml
- **Controller** (level 1, dynamic): Coordinate execution with reviewer loop -> coordination_log.yaml
- **Universal-validator** (level 1): Validate -> validation_report.yaml (PASS/FAIL/REVISE)
- **Execution agents** (level 2, via controller): Actual implementation work
- **Reviewer** (level 2, via controller): Review against acceptance criteria

## Error Handling

If an agent fails or returns incomplete:
1. **Check for partial results** in session workflow/ directory
2. **Check for completion event** in workflow/events/
3. **If no event**: Retry agent once with reduced scope
4. **If retry fails**: Save progress to progress.md, suggest `--resume {SESSION_ID}`

If context is exhausted mid-workflow:
1. Session state is preserved in Agent_Memory/sessions/
2. pre-compact-save hook creates waypoints automatically
3. User can resume with `/run --resume {SESSION_ID}`
4. Resume detects completed states from events/ and skips them

## Argument Handling

See @reference/flags.md for complete flag reference with defaults and examples.

## Configuration

- Pipeline config: `Agent_Memory/_system/config/pipeline_config.yaml`
- Planner configs: `{domain}/config/planner_config.yaml`
- Event template: `Agent_Memory/_system/templates/event.yaml`
- Session folder: `Agent_Memory/sessions/run_{YYYYMMDD_HHMMSS}/`
- Agent audit trail: `Agent_Memory/sessions/{session_id}/workflow/agent_tree.yaml`
- Global audit log: `Agent_Memory/_system/logs/agent_spawns.log`
- Pipeline analytics: `Agent_Memory/_system/metrics/pipeline_analytics.yaml`

## Agent Audit Trail

When spawned as a subagent (e.g., by /team), self-register in agent_tree.yaml:
```yaml
    cagents_type: "cagents:run"
    role_description: "Event-driven pipeline engine - state machine loop"
```

---

**Event-driven pipeline: Config-driven state machine with sequential enrichment, nested execution with reviewer loops, and revision routing. TodoWrite at every state transition.**

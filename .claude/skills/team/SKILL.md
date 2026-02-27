---
name: team
description: "N-wave parallel team execution using Claude Code's built-in agent teams. Encourages maximum wave decomposition for better quality gating, coordination, and parallel throughput. More waves = more checkpoints = higher quality."
argument-hint: "<request> [--dry-run] [--members <n>] [--teammate-mode tmux|auto|in-process] [--no-template] [--waves <n>]"
user-invocable: true
context: fork
allowed-tools: Read, Grep, Glob, Write, Bash, Task, TodoWrite, TeamCreate, TeamDelete, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Skill
---

# /team - N-Wave Parallel Team Execution

You are a team orchestrator using the event-driven pipeline. Your job is to **create a real agent team and spawn real teammates**. You MUST call TeamCreate, TaskCreate, and spawn teammates via the Task tool. This is non-negotiable.

## CRITICAL: Maximize Waves

**More waves are ALWAYS better.** There is nothing wrong with more waves. Each wave provides:
- A quality gate checkpoint (catch issues early, not at the end)
- A coordination point (lead validates before next phase starts)
- Clear dependency boundaries (consumers wait for providers)
- Smaller, more focused work units (higher success rate per teammate)

**Default behavior**: Decompose into as many waves as the work requires. Do NOT collapse phases that could be separate waves. If work items have natural dependency ordering, each dependency level should be its own wave.

**Wave count guidance**:
| Work complexity | Minimum waves | Typical waves |
|----------------|---------------|---------------|
| Tier 2 (moderate) | 3 | 3-4 |
| Tier 3 (complex) | 4 | 5-7 |
| Tier 4 (expert) | 5 | 6-10 |

## Architecture: N-Wave Model

```
Wave 0 (Lead, sequential): Enrichment + Foundation
  INIT -> orchestrator -> planner -> decomposer
  All enrichment stages always run (no skipping)
  Output: enriched_context.yaml, plan.yaml, work_items.yaml
  Lead may also execute bootstrap work items (scaffolding, schemas, contracts)

Wave 1..N-1 (Teammates, parallel per wave): Execution Waves
  Each wave spawns a FRESH ROUND of teammates for that wave's work items
  Teammates within a wave run in parallel
  Each wave has a GATE sentinel -- lead validates before next wave starts
  Later waves consume outputs from earlier waves via file-based handoffs

  Typical wave breakdown:
    Wave 1: Research / Analysis / Design (specialists gather information)
    Wave 2: Core Implementation (primary build work)
    Wave 3: Supporting Implementation (secondary features, integrations)
    Wave 4: Testing / Validation (QA, security scans, performance)
    Wave 5: Documentation / Polish (docs, cleanup, optimization)
    Wave 6+: Additional phases as complexity demands

Wave N (Lead, sequential): Integration + Final Validation
  Integration controller merges cross-WI outputs
  Final validator confirms all WIs complete
  COMPLETE or escalate
```

**IMPORTANT**: Each wave is a DISTINCT spawn cycle. Do NOT collapse multiple waves into a single teammate invocation. Spawn teammates for Wave K, wait for them to complete, validate the gate, THEN spawn teammates for Wave K+1. This maximizes quality gating and coordination.

## MANDATORY: You MUST Execute These Steps

**If you do not call TeamCreate and spawn teammates via Task tool, you have FAILED.** Do not just describe what you would do. Do not just create tasks without teammates. Actually execute the steps below.

**EXCEPTION: Mandatory /run fallback.** If the request produces fewer than 3 work items or has no parallelizable items, you MUST pass the request to /run via `Skill({ skill: "run" })`. Never silently drop a request — either team-ize it or /run it.

## Step-by-Step Execution (Follow Exactly)

### Step 1: Parse the Request

Extract the user's request from `$ARGUMENTS`. Check for flags:
- `--dry-run`: Show plan only, do not execute
- `--members <N>`: Max teammates per wave (default: 5)
- `--teammate-mode <mode>`: tmux (default from settings), auto, or in-process
- `--waves <N>`: Minimum number of waves (default: auto-maximize)

The request is everything before the first `--` flag.

### Step 2: Execute Wave 0 -- Enrichment (Lead Does This)

Run the enrichment pipeline sequentially. All three stages always run (consistency over speed).

**2a. Initialize session:**

```bash
SESSION_ID="run_$(date -u +%Y%m%d_%H%M%S)"
SESSION_DIR="Agent_Memory/sessions/${SESSION_ID}"
mkdir -p "${SESSION_DIR}/workflow/events"
mkdir -p "${SESSION_DIR}/outputs"
```

Write `instruction.yaml` and `status.yaml` with initial state INIT.

**2b. Classify domain and tier (inline):**

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

**2c. Spawn orchestrator (enrichment):**

```
Task({
  subagent_type: "cagents:orchestrator",
  description: "INIT: Enrich context",
  prompt: "You are the orchestrator in the event-driven pipeline.\n\nREQUEST: {user_request}\nSESSION: {SESSION_DIR}/\nDOMAIN: {domain} | TIER: {tier}\n\nEnrich the request with domain context and project state. Write workflow/enriched_context.yaml and a completion event to workflow/events/EVT-1.yaml."
})
```

**2d. Spawn planner:**

```
Task({
  subagent_type: "cagents:universal-planner",
  description: "ORCHESTRATED: Plan objectives",
  prompt: "You are the universal-planner in the event-driven pipeline.\n\nREQUEST: {user_request}\nSESSION: {SESSION_DIR}/\nDOMAIN: {domain} | TIER: {tier}\n\nRead workflow/enriched_context.yaml. Define objectives, select controllers, write workflow/plan.yaml and a completion event to workflow/events/EVT-2.yaml."
})
```

**2e. Spawn decomposer (with wave maximization):**

```
Task({
  subagent_type: "cagents:task-decomposer",
  description: "PLANNED: Decompose into work items with maximum wave granularity",
  prompt: "You are the task-decomposer in the event-driven pipeline.\n\nREQUEST: {user_request}\nSESSION: {SESSION_DIR}/\nDOMAIN: {domain} | TIER: {tier}\n\nRead workflow/plan.yaml. Decompose into work items with acceptance criteria.\n\nCRITICAL WAVE MAXIMIZATION:\n- Assign each work item a wave number (0, 1, 2, 3, ...)\n- Wave 0 = foundation/bootstrap (lead executes)\n- Maximize the number of waves by separating work into natural dependency layers\n- If item B depends on item A's output, they MUST be in different waves\n- Even items that COULD run in the same wave SHOULD be split into separate waves if they represent distinct phases (e.g., research vs implementation vs testing vs documentation)\n- Prefer 5-10 waves over 2-3 waves\n- Each wave should have a clear quality gate with verifiable criteria\n- The final wave is always integration/validation (lead executes)\n\nWave assignment strategy:\n  Wave 0: Scaffolding, schemas, contracts, project setup\n  Wave 1: Research, analysis, information gathering\n  Wave 2: Design, architecture decisions, interface definitions\n  Wave 3: Core implementation (primary features)\n  Wave 4: Supporting implementation (secondary features, integrations)\n  Wave 5: Testing, QA, security validation\n  Wave 6: Documentation, cleanup, optimization\n  Wave 7+: Additional phases as needed\n\nWrite workflow/work_items.yaml with wave assignments and a completion event to workflow/events/EVT-3.yaml."
})
```

After decomposer returns, read `workflow/work_items.yaml` to get the work items and their wave assignments.

**2f. Analyze wave structure:**

After reading work_items.yaml, organize items by wave number. Count the number of distinct waves. If the decomposer produced fewer waves than expected for the tier, re-decompose with more granularity:

| Tier | Minimum waves expected |
|------|----------------------|
| 2 | 3 |
| 3 | 5 |
| 4 | 6 |

If the request produces fewer than 3 work items total or has no parallelizable items, you **MUST** pass to /run. Never silently drop the request:
```
Skill({ skill: "run", args: "<the full request>" })
```
This is mandatory — /team must ALWAYS either execute as a team OR delegate to /run. No request should ever be left unhandled.

If `--dry-run` is specified, display the work items, wave structure, and team composition, then STOP.

### Step 3: Create the Team (TeamCreate)

Call TeamCreate IMMEDIATELY. Do not skip this step. Do not ask permission.

```
TeamCreate({
  team_name: "cagents-team-<YYYYMMDD-HHMMSS>",
  description: "Parallel execution: <summary of request>"
})
```

### Step 4: Create Tasks for ALL Work Items with Wave Gates (TaskCreate)

Create a task for EVERY work item from `work_items.yaml` using TaskCreate. Also create GATE sentinel tasks between waves. Create them all before spawning any teammates.

**4a. Create work item tasks:**

For each work item:
```
TaskCreate({
  subject: "WI-{N}: <description>",
  description: "Wave {W}. Work item from decomposition. <details and acceptance criteria>",
  activeForm: "Executing WI-{N}"
})
```

**4b. Create GATE sentinel tasks between waves:**

For each wave transition (wave K -> wave K+1), create a gate:
```
TaskCreate({
  subject: "GATE-{K}: Quality gate after wave {K}",
  description: "Quality gate. Lead validates all wave {K} outputs before wave {K+1} starts. Criteria: <gate criteria from decomposition>",
  activeForm: "Validating GATE-{K}"
})
```

**4c. Set up wave dependencies:**

```
# Wave 1 work items are blocked by GATE-0
TaskUpdate({ taskId: "{wave1_item_id}", addBlockedBy: ["{gate0_id}"] })

# GATE-0 is blocked by all wave 0 work items
TaskUpdate({ taskId: "{gate0_id}", addBlockedBy: ["{wave0_item1_id}", "{wave0_item2_id}", ...] })

# Wave 2 work items are blocked by GATE-1
TaskUpdate({ taskId: "{wave2_item_id}", addBlockedBy: ["{gate1_id}"] })

# GATE-1 is blocked by all wave 1 work items
TaskUpdate({ taskId: "{gate1_id}", addBlockedBy: ["{wave1_item1_id}", "{wave1_item2_id}", ...] })

# ... repeat for each wave transition
```

Also set up intra-wave dependencies from the decomposition's dependency graph.

### Step 5: Execute Waves 1..N-1 -- Spawn Teammates Per Wave (CRITICAL)

**This is the core execution loop. For EACH wave, spawn a fresh round of teammates, wait for completion, validate the gate, then proceed to the next wave.**

```
for each wave K from 1 to N-1:

  5a. Display wave K status:
      "=== WAVE {K}/{N-1}: {wave_description} ==="
      List work items in this wave

  5b. Spawn teammates for wave K IN PARALLEL:
      For each work item in wave K:

      Task({
        description: "Wave {K} - Execute WI-{N}: <short description>",
        prompt: "You are a teammate executing a work item in wave {K} of the pipeline.

      WORK ITEM: WI-{N}: <full description>
      WAVE: {K} of {total_waves}
      ACCEPTANCE CRITERIA: <criteria>
      SESSION DIR: {SESSION_DIR}  (contains enriched_context.yaml, plan.yaml, work_items.yaml)
      OUTPUTS FROM PREVIOUS WAVES: {SESSION_DIR}/outputs/  (read artifacts from earlier waves)

      INSTRUCTIONS:
      1. Read outputs from previous waves if your work item depends on them
      2. Invoke /run for your work item:
         Skill({ skill: 'run', args: 'execute WI-{N}: {description} --session {SESSION_DIR}' })
      3. /run detects pre-enrichment and picks up from DECOMPOSED
      4. Pipeline: prompt-engineer -> controller -> executor+reviewer -> validator
      5. Write your outputs to {SESSION_DIR}/outputs/wi-{N}/
      6. If issues arise: flag to lead via SendMessage but continue working
      7. On completion:
         TaskUpdate({ taskId: '{task_id}', status: 'completed' })
         SendMessage({ type: 'message', recipient: '{lead_name}', content: 'WI-{N} complete. <summary>', summary: 'WI-{N} done' })",
        team_name: "{team_name}",
        name: "teammate-w{K}-wi-{N}",
        subagent_type: "general-purpose"
      })

  5c. Monitor wave K progress:
      - Wait for teammate messages (they arrive automatically)
      - Periodically check TaskList to see progress
      - If a teammate flags an issue: course-correct if needed
      - Track per-teammate timeout: if no progress after 5 minutes, consider recovery

  5c-2. Automatic teammate failure recovery:
      If a teammate fails (task stuck, error reported, or timeout):

      Recovery chain (max 2 retries per work item):
      1. RETRY: Spawn replacement teammate with error context:
         Task({
           description: "RETRY Wave {K} - WI-{N}: <description>",
           prompt: "Previous attempt failed with: {error_context}. Avoid: {failure_cause}.
                   Execute WI-{N} with adjusted approach. ...",
           team_name: "{team_name}",
           name: "teammate-w{K}-wi-{N}-retry-{R}",
           subagent_type: "general-purpose"
         })
      2. SIMPLIFY: If retry fails, break the work item into sub-items:
         Create WI-{N}a (core implementation) and WI-{N}b (edge cases + testing)
         Spawn separate teammates for each sub-item
      3. ESCALATE: If simplify also fails, mark the work item as blocked:
         TaskUpdate({ taskId: "{task_id}", status: "completed",
                      description: "BLOCKED: Failed after 2 retries. Error: {context}" })
         Log failure in workflow/failed_items.yaml
         Continue with remaining wave items (do not halt the entire wave)

      Track recovery metrics per wave:
        recovery_attempts: {count}
        successful_recoveries: {count}
        blocked_items: [{WI-ids}]

  5d. Validate GATE-K when all wave K items complete (or blocked):
      - Verify outputs exist for each work item in wave K
      - Check quality gate criteria based on wave type (see GATE Validation Standards below)
      - If gate passes: Mark GATE-K task as completed (unblocks wave K+1)
      - If gate fails but blocked items exist: Apply partial pass -- mark gate as
        conditionally passed with noted gaps; proceed with degraded scope
      - If gate fails without blocked items: Report issues, spawn fix-up teammates, re-validate

  5e. Shut down wave K teammates before spawning wave K+1:
      SendMessage({ type: "shutdown_request", recipient: "teammate-w{K}-wi-{N}", content: "Wave {K} complete." })

  5f. Proceed to wave K+1 (AUTOMATIC -- do NOT ask permission)
```

**Each wave is a distinct spawn-execute-validate cycle.** This ensures quality gates are enforced between phases, outputs from earlier waves are available to later waves, and issues are caught early.

### Step 6: Execute Final Wave -- Integration + Validation (Lead Does This)

Run integration to merge cross-wave outputs:

**6a. Spawn integration controller:**

```
Task({
  subagent_type: "cagents:{primary_controller_from_plan}",
  description: "Integration: Merge outputs from all {N} waves",
  prompt: "You are the {controller_name} controller performing final integration.\n\nSESSION: {SESSION_DIR}/\n\nAll {N-1} execution waves are complete. Read workflow/coordination_log.yaml and outputs/ from each wave and WI. Merge cross-WI outputs, resolve conflicts, write final integrated outputs. Write coordination_log.yaml with integration results."
})
```

**6b. Spawn final validator:**

```
Task({
  subagent_type: "cagents:universal-validator",
  description: "Final validation: All waves and WIs complete",
  prompt: "You are the universal-validator performing final validation.\n\nSESSION: {SESSION_DIR}/\n\nAll {N} waves and integration are complete. Validate all acceptance criteria across all WIs and all wave gates. Write workflow/validation_report.yaml with PASS/FAIL/REVISE classification."
})
```

If PASS: Pipeline complete. Proceed to cleanup.
If FAIL with partial results: Report partial completion summary (see Partial Results on Failure below).
If FAIL without partial results: Report issues with evidence. Suggest `/run --resume {SESSION_ID}`.

### Step 7: Shut Down and Clean Up

1. Shut down any remaining teammates (wave teammates should already be shut down per-wave):
```
SendMessage({ type: "shutdown_request", recipient: "<teammate_name>", content: "All work complete, shutting down." })
```

2. Clean up the team:
```
TeamDelete()
```

3. Report final results to the user including:
   - Total waves executed
   - Work items completed per wave
   - Gate validation results per wave
   - Revision rounds used (if any)
   - Recovery attempts and outcomes (retries, simplifications, blocked items)
   - Final validation status
   - Output file locations
   - If partial: which items completed vs blocked vs not started (see below)

## Cross-Wave Coordination

### File-Based Handoffs Between Waves
Each wave's outputs are available to subsequent waves via the shared session directory:

```
Wave 1 teammate (WI-001):
  Completes -> writes outputs/wi-001/api_spec.yaml
  TaskUpdate(WI-001, completed)
  SendMessage(lead, "WI-001 done")

Lead validates GATE-1 -> marks complete -> unblocks wave 2

Wave 2 teammate (WI-003, depends on WI-001):
  Reads outputs/wi-001/api_spec.yaml from session dir
  Builds on wave 1 outputs
  Writes outputs/wi-003/implementation/
```

### Intra-Wave Parallelism
Within a single wave, all teammates run in parallel. Use TaskUpdate `addBlockedBy` for any intra-wave dependencies.

### Task Dependencies
- **Inter-wave**: Enforced via GATE sentinel tasks (wave K+1 items blocked by GATE-K)
- **Intra-wave**: Set via TaskUpdate `addBlockedBy` based on decomposition dependency graph
- Dependencies auto-unblock via TaskList

### Teammate Autonomy
- Teammates flag issues to lead via SendMessage but continue working
- Lead can course-correct if needed but doesn't block progress
- All enrichment always runs (consistency over speed)
- Teammates within a wave operate independently

## Key Rules

1. **You MUST call TeamCreate.** No exceptions. This is what creates the team.
2. **You MUST spawn teammates via Task tool.** This is what creates tmux panes.
3. **Spawn teammates PER WAVE** -- each wave gets its own fresh round of teammates.
4. **Within a wave, spawn ALL teammates at the same time** (parallel Task calls).
5. **Validate each GATE before proceeding to the next wave.** Gates are quality checkpoints.
6. **Shut down wave K teammates before spawning wave K+1 teammates.**
7. **Maximize the number of waves.** More waves = better quality gating. There is nothing wrong with more waves.
8. **Teammates invoke /run with --session** to run the full pipeline for their work item.
9. **You (the lead) do Wave 0 (enrichment) and the final wave (integration)** -- teammates do all middle waves.
10. **Never ask permission** between waves. Execute the full pipeline automatically.
11. **Never just create tasks without spawning teammates** -- tasks without teammates are useless.
12. **All enrichment stages always run** -- no skipping for consistency.

## GATE Validation Standards

GATE validation criteria are standardized by wave type. The lead uses these criteria when validating each gate (Step 5d). See @reference/gate-standards.md for the full standard.

| Wave Type | Validation Criteria | Method |
|-----------|-------------------|--------|
| **Research / Analysis** | All research outputs exist; each has summary section; key findings documented | `file_exists` + `content_check` |
| **Design / Architecture** | Design artifacts exist; interfaces defined; decisions documented with rationale | `file_exists` + `content_check` |
| **Core Implementation** | Implementation files created/modified; no syntax errors; acceptance criteria addressed | `file_exists` + `syntax_check` + `grep_criteria` |
| **Supporting Implementation** | Integration points connected; supporting features functional; no regressions | `file_exists` + `syntax_check` |
| **Testing / QA** | Test files exist for implemented features; test execution attempted (pass or documented failure) | `file_exists` + `test_run` |
| **Documentation** | Doc files updated; API changes reflected; examples provided | `file_exists` + `content_check` |

**Gate validation algorithm**:
1. For each work item in the wave, check if output directory exists (`outputs/wi-{N}/`)
2. Apply wave-type-specific criteria from the table above
3. Compute gate score: `completed_criteria / total_criteria`
4. Gate result:
   - Score >= 0.9: **PASS** (proceed to next wave)
   - Score >= 0.7 with no critical failures: **CONDITIONAL_PASS** (proceed with noted gaps)
   - Score < 0.7 or critical failures: **FAIL** (attempt fix-up or escalate)

**Conditional pass**: If blocked items caused the gap, log the gaps and proceed. The integration wave (final) accounts for these gaps in its validation.

## Partial Results on Failure

If the pipeline cannot complete all waves, report partial results instead of a binary failure. This ensures users always get value from completed work.

**Partial results report format**:
```
Team execution partially complete:
  Wave 1 (Research):       COMPLETE - 3/3 items done
  Wave 2 (Implementation): COMPLETE - 4/4 items done
  Wave 3 (Testing):        PARTIAL  - 2/3 items done, 1 blocked
  Wave 4 (Documentation):  NOT STARTED (blocked by Wave 3 gap)

Completed outputs: Agent_Memory/sessions/{id}/outputs/
  - wi-001/ through wi-007/: COMPLETE
  - wi-008/ and wi-009/:     COMPLETE
  - wi-010/:                 BLOCKED (test framework incompatibility)
  - wi-011/ through wi-012/: NOT STARTED

Recovery:
  - Fix wi-010 manually, then: /team --resume {session_id}
  - Or accept partial results and continue from outputs/
```

**When to report partial results**:
- A wave has blocked items after recovery attempts
- A gate fails and fix-up attempts are exhausted
- Context exhaustion occurs mid-pipeline
- Final validation returns FAIL but some waves completed successfully

**Partial results are stored in** `workflow/partial_results.yaml`:
```yaml
status: partial
completed_waves: [1, 2]
partial_waves:
  3: {completed: [WI-008, WI-009], blocked: [WI-010], reason: "test framework incompatibility"}
not_started_waves: [4]
total_items: 12
completed_items: 9
blocked_items: 1
not_started_items: 2
completion_rate: 0.75
output_locations:
  - outputs/wi-001/ through outputs/wi-009/
resume_command: "/team --resume {session_id}"
```

## Fallback (MANDATORY)

If the request has fewer than 3 work items or no parallelizable work, you **MUST** pass to /run. Never silently fail or leave a request unhandled:
```
Skill({ skill: "run", args: "<the original request>" })
```
This ensures every /team invocation produces a result — either via team execution or /run delegation.

## Strategic Brief Awareness (/org Integration)

When invoked by `/org`, the session directory may contain a `strategic_brief.yaml`. If present:

1. **Read the brief** at session initialization (Step 2a, after creating session):
   ```
   Check for ${SESSION_DIR}/strategic_brief.yaml
   If exists: read and extract mission, success_criteria, domain_assignments
   ```

2. **Pass brief context to enrichment agents** -- include mission and success criteria in orchestrator and planner prompts for richer context.

3. **Write domain_status updates** during execution:
   - After each wave completes, update the brief's `domain_status` section:
   ```yaml
   domain_status:
     {domain_key}:
       progress: {percentage}
       status: in_progress|completed
       completed_wis: [WI-xxx, ...]
       blockers: []
   ```
   - Write updates to `${SESSION_DIR}/strategic_brief.yaml` (the brief is the CEO's monitoring interface)

4. **Check for escalation directives** -- if the CEO has added directives to the brief (from resolving escalations), read them and adjust execution accordingly.

5. **Report completion** by setting domain_status to completed with 100% progress.

This allows `/org`'s CEO to monitor domain execution progress and handle cross-domain escalations in real-time.

## Configuration

- Pipeline config: `Agent_Memory/_system/config/pipeline_config.yaml`
- Org pipeline config: `Agent_Memory/_system/config/org_pipeline_config.yaml`
- `teammateMode` in settings.json controls display: `"tmux"` (split panes), `"auto"`, `"in-process"`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be `"1"` in settings.json env
- Both are already configured in this project's settings.json

See @reference/architecture.md for team execution model details.
See @reference/fallback-behavior.md for fallback and error recovery.
See @reference/flags.md for complete flag reference.

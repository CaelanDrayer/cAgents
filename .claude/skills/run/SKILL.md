---
name: run
description: "Execute any task through coordinated agents. Use for building, fixing, writing, or any single-domain work. TRIGGER: run, implement, fix, build, create. NOT for: parallel work or cross-domain strategy (use /team)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "12.7.0"
  argument-hint: "<request> [--interactive] [--dry-run] [--quiet] [--stream] [--skip-preflight] [--team] [--analytics] [--template <name>] [--domain <name>] [--tier <N>] [--confidence <N>] [--brief <path>] [--resume <session_id>] [--session <session_dir>] [--mode <standard|debug>] [--no-goal]"
  user-invocable: "true"
  context: "none"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet, TodoWrite
---

# /run - Event-Driven Pipeline Engine

**Current timestamp**: !`date -u +%Y-%m-%dT%H:%M:%SZ`

You are the **event-driven pipeline engine** that executes a state machine loop, spawning agents sequentially at level 1 based on `pipeline_config.yaml`. Controllers spawn executors and reviewers at level 2. Revision loops at both levels ensure quality.

## STOP: Your First Action Is Session Init

**Do NOT explore the codebase, spawn agents, or analyze the request yet.** Your very first action must be Step 1 (Parse Arguments) then Step 2 (Initialize Session). Create the session directory and write `status.yaml` BEFORE any other work. Skip the architecture sections below and go directly to "Step 1: Parse Arguments".

## CRITICAL: You Are a Delegator, Not a Doer

**You MUST delegate ALL work to subagents via the Agent tool. You NEVER implement, write code, create content, or fix bugs yourself.**

/run is a pipeline engine. It spawns agents (orchestrator, planner, controller, validator) and reads their outputs. It does NOT do their work. Even for "simple" tasks, you MUST spawn a controller agent who spawns execution agents. The whole point of this plugin is delegation to specialized agents. If you do the work yourself, you defeat the entire purpose.

**What you do**: Parse, plan, spawn agents, read events, route revisions, report results.
**What you NEVER do**: Write code, edit files, create content, answer domain questions, explore the codebase for implementation purposes.

See @.claude/rules/core/delegation.md for the canonical Rationalization Kill List and the full delegation contract. If you catch yourself reasoning toward any phrase in that list, STOP — you are rationalizing a violation. Delegate.

## Architecture: Event-Driven State Machine (v12.0.0)

```
INIT -> ORCHESTRATED -> PLANNED -> COORDINATED -> VALIDATED
                                            FAIL -> PLANNED
                                          REVISE -> PLANNED
```

| Phase | Level | Agents | Output |
|-------|-------|--------|--------|
| Enrichment | 1 | orchestrator, planner (decomposition inline) | enriched_context.yaml, plan.yaml, work_items.yaml |
| Coordination | 1 + 2 | controller (level 1) -> executor + reviewer (level 2, max 3 rounds) | coordination_log.yaml |
| Validation | 1 | validator | validation_report.yaml (PASS/FAIL/REVISE) |

Pipeline-level revision loop: max 3 cycles total (lowered from 5 in v12.0.0). v12.0.0 collapse: task-decomposer and prompt-engineer absorbed into planner; controllers fall back to standard delegation prompts.

See @reference/state-machine-detail.md for full per-state contracts, event file format, revision routing semantics, and the BLOCKED verdict (debug-mode only).

See @reference/delegation-patterns.md for the full delegation chain and Agent tool patterns.

## BLOCKING REQUIREMENT: TaskCreate / TodoWrite

**TaskCreate is a BLOCKING PREREQUISITE for every state transition in interactive Claude Code sessions.** You CANNOT proceed to the next state until you have called TaskCreate (and TaskUpdate to drive status).

Per docs.claude.com/docs/en/tools.md: `TodoWrite` is the equivalent fallback in non-interactive mode and the Agent SDK; interactive sessions use `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`. cAgents primarily runs interactively.

If you skip the task call, the workflow is broken -- the user has zero visibility. Minimum: one TaskCreate per state transition, plus TaskUpdate as status changes.

See @reference/task-tracking-rules.md for the full task tracking protocol, format rules, validation pattern, and revision-task examples.

---

## Step 1: Parse Arguments

### Step 1a: Improve-Mode Keyword Router (v12.1.2)

**BEFORE flag parsing, BEFORE domain routing**, inspect the first whitespace-separated token of `$ARGUMENTS`. If it (case-insensitively) matches one of the four improve-family keywords, strip the keyword and set an internal `mode`:

| First-word keyword | Inferred `mode` |
|--------------------|-----------------|
| `improve` | `full` |
| `review` | `review` |
| `audit` | `review` |
| `optimize` | `optimize` |

If no match, leave `mode` unset (or set by an explicit `--mode` flag in Step 1b). The keyword router collapsed the standalone `/improve` skill into `/run` in v12.1.2 — see @reference/improve-mode.md for the full contract, mode-specific controller behavior, atomic rollback pattern, and cross-session artifact layout.

Example: `/run improve src/auth/` -> mode=`full`, request=`src/auth/`.
Example: `/run review the auth module` -> mode=`review`, request=`the auth module`.

### Step 1b: Parse Flags

Parse `$ARGUMENTS` for flags (`--interactive`, `--dry-run`, `--quiet`, `--stream`, `--skip-preflight`, `--team`, `--analytics`, `--no-goal`) and value flags (`--template`, `--domain`, `--tier`, `--confidence`, `--brief`, `--resume`, `--session`, `--mode`).

The request is everything before the first `--` flag.

**--mode parser (V10.26.11+, expanded v12.1.2)**: Accepted values are `standard` (default), `debug`, `review`, `optimize`, `full`. Any other value MUST be rejected: `unknown mode: {value}. Supported: standard, debug, review, optimize, full`. Default when unset (and no improve-keyword detected in Step 1a): `standard`. An explicit `--mode` value OVERRIDES any improve-keyword inference from Step 1a.

Special flag handling:
- `--analytics`: Read `cagents-memory/_system/metrics/pipeline_analytics.yaml`, display the dashboard, exit.
- `--resume <session_id>`: Load session from `progress.md` and resume from last checkpoint.
- `--session <session_dir>`: Pre-enriched session (from /team). Skip to pre-enrichment detection in Step 3.
- `--brief <path>`: Strategic brief from /team strategic mode. See @reference/strategic-brief-integration.md.
- `--mode debug`: Enables debug-mode prefix injection for the controller. See @reference/debug-mode-prompt.md.

See @reference/flags.md for the complete flag reference with defaults and examples.

**`/run context show|init|update|clear`** — historical passthrough subcommands. Removed in V11.0; `/run` no longer dispatches to a sibling `/context` skill. The orchestrator still reads `cagents-memory/_projects/{project_hash}/product_context.yaml` during INIT enrichment, so users edit `product_context.yaml` directly. See @reference/context-passthrough.md for the full historical contract (preserved for archived-session back-compat).

---

## Step 2: Initialize Session + Load Pipeline Config

**ACTION 0**: Check `process.env.CAGENTS_SESSION_ID`. If set, use it verbatim as SESSION_ID. If SESSION_DIR exists, treat as RESUME. Otherwise auto-generate.

**ACTION 1**: Generate SESSION_ID, mkdir SESSION_DIR with `workflow/events/` and `outputs/` subdirs, write `instruction.yaml`, `status.yaml`, and self-register as root agent in `workflow/agent_tree.yaml`.

`{ISO_TIMESTAMP}` MUST be the real current time. NEVER fabricate timestamps like `T00:00:00Z`. Note: /run uses the `pipeline_state` field (not `phase`). See @reference/session-schema.md for the canonical session YAML contract.

See @reference/session-id-format.md for slug rules, NNN counter generation, and required initial files.

See @reference/agent-tracking.md for agent_tree.yaml format and lineage fields.

**ACTION 1b**: After writing status.yaml, set `process.env.CAGENTS_ACTIVE_SESSION = SESSION_ID;` so hooks resolve to the correct session without heuristic discovery. Critical for concurrent /team-spawned /run instances.

**ACTION 2**: Try to read `cagents-memory/_system/config/pipeline_config.yaml`. If absent, use the hardcoded state machine. Do not error.

**ACTION 3**: Call TaskCreate (or TodoWrite in SDK). See @reference/task-tracking-rules.md for the initial task list template.

**ACTION 4 (V11.3.0 — /goal auto-anchor)**: Derive a `/goal` condition and offer to set it via Bash, **unless** any of the following opt-out conditions hold:

- `--no-goal` flag is present in `$ARGUMENTS`
- The invocation came from `/designer` context (designer is interactive-by-contract and exempt from auto-anchoring; mirrors the existing "/designer is EXEMPT from auto-proceed" rule)
- `process.env.CAGENTS_NO_GOAL` is set to a truthy value
- `/goal` is already active in the current session (status indicator visible) — do not replace user-set goals

When NOT opted out, surface this Bash invocation as an optional setup step:

```bash
claude /goal "cagents-memory/sessions/{SESSION_ID}/workflow/completion_summary.yaml exists with status: COMPLETED AND cagents-memory/sessions/{SESSION_ID}/workflow/execution_summary.yaml exists; AND all TaskList session tasks are completed or deleted; or stop after 8 revision cycles"
```

The condition references verifiable end state (file existence + status field + clean TaskList) and includes a turn-cap clause for bounded execution. Goal evaluator reasons are captured by `.claude/hooks/goal-evaluator-logger.cjs` and consumed by `cagents:self-correct` as additional revision signal.

Proceed to Step 3.

---

## Step 3: State Machine Loop

This is the core loop -- spawn pipeline agents one state at a time, advance via completion events.

**3a. Pre-enrichment detection** (for /team teammate flows): If `--session` was provided, check which enrichment files exist and skip already-completed states. See @reference/state-machine-detail.md.

**3b. Route domain and tier inline** before spawning the orchestrator. Domain detection uses `{domain}/config/domain_overrides.yaml` -> `router_keywords` array. See @reference/domain-coverage.md for the full domain table.

**3c. Compute complexity score and select pipeline path** (Minimal / Medium / Full). For tier 2 with clear scope, the adaptive pipeline skips the orchestrator. (v12.0.0: decomposer and prompt-engineer no longer exist as separate stages — planner handles decomposition inline.) See @reference/adaptive-pipeline.md for the 9-signal scoring rubric, path-selection thresholds, and tier-2 fast-path skip behavior.

**3d. Display domain/tier confirmation**:

```
Detected: Domain={domain} ({super_domain}), Tier={tier}, Controller={controller_name}
  (Override with: --domain <domain> --tier <N>)
```

**3e. Execute the state machine loop**: For each state, look up the agent in pipeline_config, spawn via Agent tool, read the agent's primary output file (enriched_context.yaml / plan.yaml / coordination_log.yaml / validation_report.yaml), update status.yaml, call TaskUpdate, check for revision, advance. (v12.6.0: workflow/events/ emission removed — primary output files are the canonical state-advancement signal.)

**MANDATORY**: Update status.yaml after EVERY state transition. The verify-completion.cjs and attention-injection.cjs hooks read pipeline_state from status.yaml. Skipping this update breaks hook-based session detection.

**3f. Agent delegation pattern** for each state spawn:

```
Agent({
  subagent_type: "cagents:{agent_from_pipeline_config}",
  description: "{state}: {brief_description}",
  prompt: `You are the {agent_name} in the event-driven pipeline.

REQUEST: {user_request}
SESSION: cagents-memory/sessions/{SESSION_ID}/
DOMAIN: {domain} | TIER: {tier}
CURRENT STATE: {current_state}

INSTRUCTIONS:
1. Read your inputs from session workflow/.
2. Perform your phase work.
3. Write outputs to session workflow/ (your primary output file is the canonical state-advancement signal — see SKILL.md for which file your state owns).`
})
```

For the **PLANNED state (controller)**, the controller is dynamic -- resolved from `plan.yaml` `controller_assignment.primary`. (v12.0.0: PROMPTS_READY removed; planner produces work_items.yaml inline and controllers fall back to standard delegation prompts.)

**Debug-mode prefix injection (V10.26.13+)**: If `flags.mode === "debug"`, read `.claude/skills/run/reference/debug-mode-prompt.md` and PREPEND its prefix text to the controller spawn prompt. See @reference/debug-mode-prompt.md.

**3g. Revision handling** after the COORDINATED state. Read `workflow/validation_report.yaml`:

| Verdict | Action |
|---------|--------|
| PASS | Advance to VALIDATED. **Loop exits -- proceed IMMEDIATELY to Step 4.** Do NOT stop. |
| FAIL | Route back to PLANNED. Pass validation feedback to controller. (v12.0.0: PROMPTS_READY removed; controller re-runs from PLANNED.) |
| REVISE | Route back to PLANNED. Pass feedback to planner. |
| BLOCKED (debug only) | Route to PLANNED with falsification annotation. |

Track revision cycles internally (max 3 total before HITL escalation; lowered from 5 in v12.0.0). v12.6.0: `revision_round` and `validation_cycles` are no longer written to status.yaml — these were external-UI-only fields. Hold the counter in working state and use it to enforce the 3-cycle cap.

> **CRITICAL: DO NOT STOP HERE.** When the loop exits at ANY terminal state, Step 4 is MANDATORY. The verify-completion.cjs Stop hook will block stopping if execution_summary.yaml is missing or auto-generated.

See @reference/state-machine-detail.md for the full revision routing protocol and BLOCKED verdict semantics.

---

## Step 4: MANDATORY -- Report Results and Clean Up

This step MUST execute after the state machine loop exits. Not optional, not deferrable, not handled by any hook.

- [ ] **4.1**. Read final state from status.yaml
- [ ] **4.2**. (v12.6.0: removed — `duration_ms` is no longer emitted to state_history. Skip this step.)
- [ ] **4.3**. Write `execution_summary.yaml` -- MANDATORY even on failure or interruption. Write this BEFORE anything else. The verify-completion.cjs hook creates a stub if you forget, but that triggers a warning visible to the user.

```yaml
session_id: {SESSION_ID}
final_state: VALIDATED  # or FAILED, INTERRUPTED
status: completed | failed | interrupted
states_executed: [INIT, ORCHESTRATED, PLANNED, COORDINATED, VALIDATED]
states_skipped: [{list}]
total_agents_spawned: {count}
started_at: "{ISO_TIMESTAMP}"
completed_at: "{ISO_TIMESTAMP}"
```

Note: v12.6.0 dropped `revision_rounds_used` and `total_duration_ms` from execution_summary.yaml (external-UI-only fields).

- [ ] **4.4**. Update status.yaml to terminal state (`complete` or `failed`).
- [ ] **4.5**. Append session metrics to `cagents-memory/_system/metrics/pipeline_analytics.yaml`. Recalculate aggregates (success_rate, avg_duration, by_domain, by_tier). Keep the last 500 sessions in the log; archive older entries.
- [ ] **4.6**. Clean up tasks: call `TaskList`, mark ALL session tasks as `completed` or `deleted` via `TaskUpdate`. Never leave stale in_progress tasks.
- [ ] **4.7**. Pre-stop verification: confirm `execution_summary.yaml` exists, `coordination_log.yaml` has self_validation and validation_checkpoints blocks if a controller ran, `status.yaml` is in a terminal state, and no stale tasks remain.
- [ ] **4.8**. Report results to the user with final pipeline state, revision count, key deliverables, and any validation warnings.

If the pipeline failed after max revisions: report what completed vs what remains, suggest `/run --resume {SESSION_ID}`, save progress in progress.md.

---

## Step 5: Follow-Up Handling

After reporting results, the pipeline enters a listening state. User follow-ups in the same conversation re-enter execution within the SAME session rather than starting a new one.

Classify the follow-up (adjustment, rework, extension, fix, review) and re-enter the pipeline at the appropriate state. No limit on follow-up rounds.

See @reference/followup-handling.md for the full classification rubric, re-entry procedure, status.yaml/execution_summary.yaml schema additions, and controller follow-up prompt format.

---

## Team Mode (--team flag)

For team mode, after completing routing + planning inline, delegate to `/team`:

```
Skill({ skill: "team", args: "{request} --session {SESSION_DIR}" })
```

The /team skill handles decomposition into work items, team creation, and parallel execution. Each teammate invokes `/run --session {SESSION_DIR}` which detects pre-enrichment and picks up from the appropriate state.

If `--dry-run` with `--team`: Display plan summary and team composition, then STOP.

---

## What /run Does Directly vs Delegates

| /run does directly | /run delegates |
|--------------------|----------------|
| Parse flags, create session dir, write instruction.yaml + status.yaml | Orchestrator (level 1) -> enriched_context.yaml |
| Load pipeline_config, read strategic_brief.yaml | Universal-planner (level 1) -> plan.yaml + work_items.yaml (decomposition inline, v12.0.0) |
| Domain detection + tier classification (inline) | Controller (level 1, dynamic) -> coordination_log.yaml |
| Track state transitions in status.yaml state_history (entered_at only; v12.6.0 dropped duration_ms) | Universal-validator (level 1) -> validation_report.yaml |
| (v12.6.0: events/index.yaml emission removed — workflow/events/ is no longer maintained) | Execution agents (level 2, via controller): implementation work |
| Always write execution_summary.yaml | Reviewer (level 2, via controller): acceptance criteria review |
| Call TaskCreate/TaskUpdate at every transition | |
| Spawn pipeline agents via Agent tool | |
| Read completion events, handle revision routing | |
| Validate final state, report results | |

See @reference/delegation-workaround.md for notes on the Task vs Agent tool naming.

## Error Handling

If an agent fails or returns incomplete:
1. Check for partial results in session workflow/
2. Check for completion event in workflow/events/
3. If no event: retry agent once with reduced scope
4. If retry fails: save progress to progress.md, suggest `--resume {SESSION_ID}`

If context is exhausted mid-workflow:
1. Session state is preserved in cagents-memory/sessions/
2. pre-compact-save hook creates waypoints automatically
3. User can resume with `/run --resume {SESSION_ID}`
4. Resume detects completed states from events/ and skips them

## Configuration

| Path | Purpose |
|------|---------|
| `cagents-memory/_system/config/pipeline_config.yaml` | Pipeline state machine (optional, generated at runtime) |
| `{domain}/config/planner_config.yaml` | Per-domain planner config |
| `cagents-memory/_system/templates/event.yaml` | Event template |
| `cagents-memory/sessions/run_{slug}_{YYMMDD}_{NNN}/` | Session folder |
| `cagents-memory/sessions/{session_id}/workflow/agent_tree.yaml` | Audit trail |
| `cagents-memory/_system/logs/agent_spawns.log` | Global audit log |
| `cagents-memory/_system/metrics/pipeline_analytics.yaml` | Pipeline analytics |

---

**Event-driven pipeline: Config-driven state machine with sequential enrichment, nested execution with reviewer loops, and revision routing. TaskCreate/TaskUpdate at every state transition.**

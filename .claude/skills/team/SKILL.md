---
name: team
description: "Parallel multi-agent execution with wave-based quality gates. Use for complex tasks with 3+ parallelizable items, including cross-domain strategic work (via Strategic Mode). TRIGGER: team, parallel, swarm, complex multi-part, cross-domain, strategic. NOT for: simple single-domain tasks (/act)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "12.71.0"
  argument-hint: "<request> [--dry-run] [--members <n>] [--teammate-mode tmux|auto|in-process] [--template <id>] [--no-template] [--waves <n>] [--strategic] [--no-strategic]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Skill
---

# /team — N-Wave Parallel Team Execution (Event Loop)

**Current timestamp**: !`date -u +%Y-%m-%dT%H:%M:%SZ`

You are a thin event loop. Do these steps. First, init the session. Second, run the Wave 0 enrichment. Then, for each wave K: write the spawn brief, spawn the wave subagents, spawn `cagents:wave-reviewer`, and mark the gate. To finalize: spawn the integration controller, spawn `cagents:coord-log-writer`, validate, and clean up. Parallelism comes from two sources. The first source is the concurrent per-wave subagent calls. The second source is each subagent, because a subagent spawns its own subagents to depth 5. A subagent that needs another specialty spawns that specialist downward. It does not route the request sideways through the lead.

**You are a delegator, not a doer.** Use the Agent tool only. Never implement a work item yourself.

**Domain-agnostic. This skill is NOT software-only.** `/team` parallelizes ANY multi-part work. Examples are a cross-domain product launch, a multi-deliverable client engagement, a legal-marketing-finance initiative, and a multi-chapter manuscript. One client engagement can hold three SOWs plus a price quote. The wave machinery, the subagent machinery, and the gate machinery are all domain-neutral coordination. So never refuse a non-technical request because the pipeline "looks engineering-focused." Never redirect such a request either. Spawn the right domain controllers, and not only `tech-lead`. Those controllers include `operations-manager`, `marketing-strategist`, `general-counsel`, and `account-manager`.

See @.claude/rules/core/delegation.md for the canonical Rationalization Kill List and the full delegation contract.

## STOP — Session Init First

Do nothing else before Step 1 and Step 2a. First, create the session directory. Then write `status.yaml`. Do both of these BEFORE any analysis, any exploration, and any spawning.

## Lead-Context Discipline (v12.1.0+)

This skill lets the lead complete 5-10 wave workflows without exhausting its context. @reference/architecture.md holds the full team-execution model. That model covers the wave structure and the depth-5 nesting budget. It also says why wave subagents spawn execution agents directly, instead of re-entering `/act`. Four disciplines enforce the lead-context limit:

1. **Per-wave decomposition.** The planner emits `workflow/work_meta.yaml`, and the lead reads that file ONCE. The planner also emits one `workflow/work_items_wave_{K}.yaml` per wave, and the lead reads only the current wave. See @reference/per-wave-decomposition.md.
2. **Disk-handoff spawn briefs.** The lead writes `outputs/wave-{K}/spawn_brief.md` one time per wave. Each subagent then gets a pointer prompt of about 80 tokens. See @reference/spawn-brief-schema.md.
3. **Delegated gate validation.** `cagents:wave-reviewer` runs the 7-check protocol against the on-disk evidence. It returns a 1-line verdict. The lead never reads the raw gate evidence.
4. **Delegated final assembly.** `cagents:coord-log-writer` builds `coordination_log.yaml` from the on-disk artifacts. It returns a 1-line confirmation. The lead never re-reads N waves of WI status.

Sometimes you load more than the WIs of the current wave. Sometimes you re-read the outputs of a prior wave in lead context. In either case, STOP. That is the failure mode this refactor exists to prevent. Spawned subagents carry an advisory per-subagent context aim. See `.claude/rules/playbooks/pat-context-budget-tiers.md` for the figures, and for the delegation levers that hold them. The four disciplines above are how a lead holds that aim. A wave subagent holds the aim in two ways. It delegates, and it writes each body to disk instead of carrying it.

## Wave Report Cap and Lead Read Whitelist

The four disciplines above bound what you load per wave. These two statements bound your **fan-in**. Your fan-in is the k subagent reports times the N waves, and it grows with the size of the work. Per @.claude/rules/core/delegation.md § The Size Rule, a term that grows with the work does not belong in the main session. The report cap bounds what each report costs you. The whitelist removes the discretionary-read term outright. Together they attenuate the fan-in. They do not make it constant, because the report count still tracks the work-item count.

**Report cap.** What a wave subagent returns to you MUST be **at most 12 lines, each at most 15 words**. Everything longer goes to `outputs/wave-{K}/task-{N}/` on disk. The report then carries a pointer to that location, and never the content itself. These are two bounds, and not one bound. A line count alone is satisfiable by twelve paragraph-length lines. Twelve short lines carry the status, the WI id, a one-sentence outcome, the artifact pointer, and any blocker. They leave no room for narrative. Restate this cap in every `spawn_brief.md` you write.

**Read whitelist, with default-deny.** You MAY read ONLY the twelve artifacts in this list. (1) `workflow/work_meta.yaml`, one time. (2) `workflow/plan.yaml`, for `controller_assignment`, the tier, and the domain. (3) The `universal_router.domain_count` field of `enriched_context.yaml`. (4) `workflow/work_items_wave_{K}.yaml`, for the CURRENT wave K only. (5) The capped wave-subagent reports. (6) The 1-line GATE verdict of `cagents:wave-reviewer`. (7) `outputs/integration/integration_summary.md`. (8) The 1-line replies from `cagents:validator` and from `cagents:coord-log-writer`. (9) The `TaskList` status and the `TaskGet` status. (10) The files you authored yourself, such as `spawn_brief.md`, `status.yaml`, `instruction.yaml`, and your own metrics and summary files. (11) `outputs/wave-{K}/peer_requests/REQ-*.yaml`, but only the newly-arrived REQ file, and only on the experimental path at Step 5d-i. (12) Your own entry in `workflow/agent_tree.yaml`. **Everything else in the session is DENIED by default.** The denied set includes `outputs/wave-{K}/task-{N}/**`, which is any subagent work product, and `self-validation.yaml` sits in that set. It also includes `workflow/gate_validations/**`, `outputs/integration/integrated_outputs.yaml`, and `workflow/coordination_log.yaml`. It includes every `work_items_wave_{J}.yaml` file whose J is not the current wave number. It includes the outputs of any prior wave, and any repository file under review. This whitelist governs your reads. It does not restrict the writes that this contract directs you to make. Those writes are the Step 4 task_id write-back, the Step 5d-i PROMOTE append, and your Step 7 finalization. A write is not a read. The reviewer opens the artifact of a subagent to check its work. That job is not yours. If you do it, you produce the fan-in blowup that these two statements exist to prevent. You also violate the delegation contract at the same time, because verification is delegated work like any other work.

## Wave Count

| Tier | Minimum | Typical |
|------|---------|---------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

Prefer more waves over fewer waves. Each wave is a quality gate.

## Architecture

```
Wave 0 (Lead, sequential):
  orchestrator → enriched_context.yaml
  planner → work_meta.yaml + work_items_wave_{K}.yaml per wave
  (legacy work_items.yaml also written during v12.1.x for back-compat)

Waves 1..N-1 (Subagents, parallel per wave):
  Lead writes outputs/wave-{K}/spawn_brief.md (once)
  Spawn ALL wave-K subagents as CONCURRENT Agent() calls in ONE message,
    run_in_background: false (synchronous — lead collects all wave results together)
  Each wave subagent: controller-agent delegates to execution agent via Agent (direct-execution fallback only if Agent absent at nesting ceiling)
  Lead spawns cagents:wave-reviewer → 1-line GATE-K verdict
  Mark gate, drop wave from active reads, advance

Wave N (Lead, sequential):
  Spawn integration controller → writes outputs/integration/integrated_outputs.yaml + integration_summary.md (≤200 tokens)
  Read ONLY integration_summary.md
  Spawn cagents:validator → 1-line PASS/FAIL/REVISE
  Spawn cagents:coord-log-writer → 1-line "coordination_log: N WIs mapped, status: X"
  Task cleanup (teams are implicit — cleanup is automatic, no TeamDelete)
```

## Strategic Mode (auto-enabled for cross-domain requests)

Strategic mode prepends three coordination waves before the normal wave loop. Those three waves are the C-suite analysis, the objection phase, and the brief synthesis. Release v12.2.0 absorbed the former standalone corporate-hierarchy skill into `/team` strategic mode. The strategic prefix produces a `strategic_brief.yaml`. That file anchors the per-domain dispatch waves that come after it.

**Auto-detect trigger.** In Step 1 and in Step 2b, read `enriched_context.universal_router.domain_count`. `cagents:router` sets that field. When `domain_count >= 2` AND `--no-strategic` is absent from `$ARGUMENTS`, prepend the strategic prefix:

```
Wave 0 (Lead): orchestrator + planner + router
Wave 1 (Subagents, parallel): C-suite analysis (one subagent per assigned C-suite role from csuite-mapping.md)
Wave 2 (Lead): Objection phase — peer reads + two-phase deliberation
Wave 3 (Lead): Brief synthesis → outputs/strategic/strategic_brief.yaml
Wave 4..N-1 (Subagents, parallel per wave): per-domain dispatch driven by domain_assignments
Wave N (Lead): integration + validation (unchanged)
```

A single-domain request has `domain_count <= 1`. Such a request and a tier-2 request both skip the strategic prefix. They run the standard wave loop directly.

**Flag overrides.** `--strategic` force-enables the prefix, whatever the value of `domain_count`. `--no-strategic` force-disables the prefix. With neither flag present, `domain_count` decides.

See @reference/strategic-mode.md for the full wave-by-wave machinery. That machinery covers the C-suite dependency ordering, the two-phase deliberation, and the escalation chain. See @reference/strategic-brief-format.md for the `strategic_brief.yaml` schema and for its validation protocol. See @reference/csuite-deliberation.md, @reference/csuite-mapping.md, @reference/strategic-cross-domain.md, @reference/strategic-escalation.md, and @reference/strategic-examples.md for the supporting detail.

## Step 1 — Parse Request

Extract the request from `$ARGUMENTS`. See `.claude/skills/_MODE_REGISTRY.md § /team` for the canonical flags. Detect the `--strategic` flag and the `--no-strategic` flag here. Defer the final strategic-mode decision until Step 2d, when `router.domain_count` is available.

After the Wave 0 enrichment completes in Step 2d, read `enriched_context.universal_router.domain_count`. If `--strategic` is present, set `strategic_mode = true`. If `--no-strategic` is present instead, set `strategic_mode = false`. If neither flag is present, set `strategic_mode = (domain_count >= 2)`. When `strategic_mode === true`, plan the Wave 0/1/2/3 strategic prefix before the standard wave loop. That prefix holds the C-suite analysis, the objection phase, and the brief synthesis. See Strategic Mode above.

## Step 2 — Wave 0 Enrichment

**2a.** Initialize the session. If `CAGENTS_SESSION_ID` is set, use it verbatim. If it is not set, generate a slug, scan `$MEM/sessions/` for the next NNN, and compose `SESSION_ID="team_{slug}_{YYMMDD}_{NNN}"`. Anchor ALL session writes to an ABSOLUTE project root, as REC-20 directs. Never use a relative `cagents-memory/…` literal. A cwd-drifted subagent would nest such a literal under a parent session dir, and that is the CWD-leak. Define `$MEM` one time, and then reuse it:

```bash
CAGENTS_ROOT="${CLAUDE_PROJECT_DIR:-$(git -C "$(pwd)" rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEM="$CAGENTS_ROOT/cagents-memory"
SESSION_DIR="$MEM/sessions/${SESSION_ID}"
```

Then run `mkdir -p "${SESSION_DIR}/workflow" "${SESSION_DIR}/outputs"`. (v12.6.0: do NOT create `workflow/events/`.) Write `instruction.yaml` and `status.yaml` with `phase: INIT`. Write the lead entry to `workflow/agent_tree.yaml`. Set `CAGENTS_ACTIVE_SESSION=${SESSION_ID}`. Never run `npm install` or `npm ci` with the cwd inside a session directory or a scratch directory. An install runs from `$CAGENTS_ROOT` only.

**2a-i (BEST-EFFORT PRIMARY, SDK-UUID map).** The session dir and `status.yaml` now exist. If `${CLAUDE_SESSION_ID}` is available AND SDK-UUID-shaped, persist the mapping. The hooks then resolve this session deterministically by its SDK transcript UUID. This write is **best-effort PRIMARY only**. The **authoritative and robust fallback** is the WI-3 hook self-population, which is `upsertSdkSessionMap` in `subagent-tracker.cjs` and in `session-init-gate.cjs`. That fallback is needed for two reasons. `${CLAUDE_SESSION_ID}` can be empty at skill init. It can also differ from the `input.session_id` of the hook payload. The map must never depend SOLELY on the skill capturing its own UUID.

```bash
SID="${CLAUDE_SESSION_ID:-}"
if [[ "$SID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  printf '%s' "$SID" > "${SESSION_DIR}/session.sdk_id"
  mkdir -p "$MEM/_system/sdk_session_map"
  printf '%s' "${SESSION_ID}" > "$MEM/_system/sdk_session_map/${SID}"
fi
```

**2b.** Classify the domain and the tier inline. See @reference/wave-execution-detail.md § Domain & Tier.

**2c.** Call TaskCreate for the init, for the enrichment, for each planned wave, for the integration, and for the completion. Update each task with TaskUpdate as the phases land.

**2d.** Spawn the enrichment agents sequentially. The primary output file of each agent is the state-advancement signal (v12.6.0: no `workflow/events/` EVT emission):
- `cagents:orchestrator` → `enriched_context.yaml`
- `cagents:planner` → `plan.yaml` + `work_meta.yaml` + per-wave `work_items_wave_{K}.yaml` (+ legacy `work_items.yaml` for v12.1.x back-compat)

After each agent returns, advance the `phase:` field in `status.yaml`. The orchestrator advances it to `ENRICHING`, and the planner advances it to `ENRICHED`. Use `sed -i 's/^phase: .*/phase: <PHASE>/' "{SESSION_DIR}/status.yaml"`.

**2e.** Read `work_meta.yaml` ONCE. Confirm that the wave count meets the tier minimum. If it does not meet the minimum, request a re-decomposition. If `--dry-run` is present, display the plan and STOP. If the total is fewer than 3 WIs, fall back to `Skill({ skill: "act", args: ... })`.

## Step 3 — Team Is Implicit (no creation call)

There is nothing to create. Claude Code v2.1.178 removed `TeamCreate` and `TeamDelete`. Teams are now implicit, and the cleanup is automatic at session end. Do NOT call `TeamCreate`. Advance the phase to `TEAM_READY` and continue.

## Step 4 — Create Tasks + GATE Sentinels

For each WI in `work_meta.yaml`, TaskCreate the WI. That file gives you the IDs and the per-wave file pointers, so do NOT load all of the wave detail. TaskCreate the GATE-{K} sentinels between the waves. Set `addBlockedBy` as the dependency_graph shows. Save each returned task_id back into its `work_items_wave_{K}.yaml` row.

## Step 4b — Phase EXECUTING

Update the `phase:` field in `status.yaml` to `EXECUTING`.

## Step 5 — Wave Loop (K = 1..N-1)

For each wave K:

**5a.** Read `workflow/work_items_wave_{K}.yaml`. Read ONLY the file of this wave.

**5b.** Write `outputs/wave-{K}/spawn_brief.md` to the schema in @reference/spawn-brief-schema.md. The brief MUST carry the report cap as a Report Contract section. That cap is at most 12 lines, with at most 15 words per line.

**5c. (DEFAULT: concurrent Agent waves, which work in every harness).** Spawn ALL wave-K subagents as CONCURRENT `Agent()` calls, issued in ONE assistant message. Many tool uses in a single message run concurrently. Give each call `run_in_background: false`. Synchronous spawning is required. Subagents are background-by-default since v2.1.198. So `run_in_background: false` is what makes the lead receive all of the wave results together, before it validates GATE-K. Use pointer prompts of about 80 tokens, per @reference/spawn-brief-schema.md § Short Spawn Prompt. Each wave subagent is the `cagents:{CONTROLLER_TYPE}` from `plan.yaml.controller_assignment.primary`. It can recursively spawn its own subagents to depth 5, for any specialty that it needs. There is no team to create, because teams are implicit. See @reference/teammate-spawning-template.md for the self-registration and for the worktree isolation.

**5c-EXPERIMENTAL (OPTIONAL: named background teammates and panes).** Two conditions gate this path. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` must be set, AND the harness must support interactive agent teams. When both conditions hold, you MAY instead spawn named background teammates with `Agent({ name, run_in_background: true })`. The team forms implicitly, and any `team_name` arg is accepted-but-ignored. Coordinate those teammates with `SendMessage({to: name})` and with the shared Task list. Since v2.1.77, `SendMessage` auto-resumes a stopped teammate by name. `teammateMode` controls the display, and its default is `in-process` since v2.1.179. The other two values are `tmux` and `iterm2`. Panes need tmux or iTerm2, and panes belong to the experimental path only. This path is harness-variable. If the experimental feature is unavailable, fall back to the DEFAULT concurrent-Agent path in 5c.

**5d.** Monitor wave K with TaskList. On the DEFAULT path, the wave subagents return synchronously, so there is nothing to shut down. On the EXPERIMENTAL named-teammate path only, monitor the teammate messages. On that path, also early-shutdown each completed teammate, per @reference/wave-execution-detail.md § Early Shutdown. Collect only the capped reports. Do not open any `outputs/wave-{K}/task-{N}/` artifact to check the work of a subagent.

**5d-i. (LEGACY: experimental-named-teammate-path only.)** This step is obsolete under the default subagent model. Under that model, a subagent that needs another specialty spawns that specialist downward as its own sub-subagent. It does not route a request sideways through the lead. The step is retained only for the experimental named-teammate path. On that path, an inbound `SendMessage(type=peer_request)` can arrive, OR a new file can appear at `outputs/wave-{K}/peer_requests/REQ-*.yaml`. In either case, read ONLY the new REQ file, which is lead-context discipline. Then apply the 4-branch decision tree. RELAY sends a SendMessage to the peer. SPAWN creates a fresh Agent. PROMOTE appends the item to `work_items_wave_{K+1}.yaml`. REJECT sends a SendMessage to the requester with a rationale. Update the `status` field of REQ-N.yaml after each routing decision. The lead NEVER executes the requested work itself, because of the aggressive-delegation invariant. See @.claude/rules/playbooks/pat-cross-teammate-request.md.

**5e.** When all of the wave-K WIs are completed in TaskList, spawn `cagents:wave-reviewer`:
```
Agent({
  subagent_type: "cagents:wave-reviewer",
  description: "Validate GATE-{K}",
  prompt: "Validate GATE-{K} for session {SESSION_DIR}. Wave outputs at {SESSION_DIR}/outputs/wave-{K}/. Work items {SESSION_DIR}/workflow/work_items_wave_{K}.yaml. Write to {SESSION_DIR}/workflow/gate_validations/wave_{K}.yaml. Reply with one line: 'GATE-{K}: PASS|CONDITIONAL_PASS|FAIL — {1-sentence rationale}'."
})
```
Read ONLY the 1-line reply. Do NOT open the gate_validations YAML file. Do NOT open the raw wave outputs.

**5f.** If the verdict is PASS or CONDITIONAL_PASS, mark GATE-{K} completed with TaskUpdate. (v12.6.0 removed the `workflow/events/EVT-wave-{K}.yaml` emission. The `completed` status of the GATE task is now the canonical wave-gate signal.) If the verdict is FAIL or HOLD, see @reference/fallback-and-error-recovery.md.

**5g.** Drop wave K from the active reads. Advance to wave K+1 automatically.

## Step 6 — Final Wave: Integration + Validation

**6a.** Spawn the integration controller, which is the `cagents:{primary}` from the plan:
```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",
  description: "Integration controller",
  prompt: "You are the integration controller for session {SESSION_DIR}. Merge per-wave outputs from outputs/wave-*/. Write outputs/integration/integrated_outputs.yaml (full detail) and outputs/integration/integration_summary.md (≤200 tokens). Schema: @.claude/skills/team/reference/integration-handoff.md. Reply with the integration_summary.md path."
})
```
Read ONLY `outputs/integration/integration_summary.md`, which is at most 200 tokens.

**6b.** Spawn `cagents:validator` pointed at `outputs/integration/`. Read its 1-line verdict of PASS, FAIL, or REVISE.

**6c.** Spawn `cagents:coord-log-writer`:
```
Agent({
  subagent_type: "cagents:coord-log-writer",
  description: "Assemble coordination_log.yaml",
  prompt: "Assemble {SESSION_DIR}/workflow/coordination_log.yaml from on-disk artifacts. Reply 1 line: 'coordination_log: N WIs mapped, status: X'."
})
```
Read the 1-line confirmation only.

## Step 7 — Cleanup

1. On the DEFAULT path, the wave subagents are synchronous, with `run_in_background: false`, and they have already returned. There is nothing to shut down, and there is no team to delete. Teams are implicit, and the cleanup is automatic. Do NOT call `TeamDelete`. Only on the EXPERIMENTAL named-background-teammate path, send `SendMessage({type:"shutdown_request",...})` to any teammate that still runs.
2. Mark the initial orchestration TaskCreate as completed.
3. Finalize the lead entry in `agent_tree.yaml` with `stopped_at`, `completion_summary`, and `duration_seconds`.
4. **Task cleanup (HARD GATE).** Run `TaskList`. Mark every `in_progress` task and every `pending` task as completed. Run `TaskList` again, and make sure that zero tasks are outstanding before you stop.
5. (v12.6.0: `state_history[].duration_ms` is no longer emitted, so skip this step.)
6. Write `team/metrics/parallelism.yaml` with the wave_stats and the totals.
7. Write `workflow/execution_summary.yaml` with the final_state and the totals. (v12.6.0: drop `total_duration_ms`.)
8. Report the results to the user. Report the waves, the items per wave, the gate results, the validation status, and the output locations.

`cagents:coord-log-writer` writes `workflow/coordination_log.yaml` in Step 6c. Do NOT write that file yourself.

## Key Rules

1. Teams are implicit, so never call `TeamCreate` or `TeamDelete`. Claude Code v2.1.178 removed both tools. There is nothing to create, and the cleanup is automatic at session end.
2. DEFAULT: spawn ALL wave-K subagents as CONCURRENT `Agent()` calls in ONE message, with `run_in_background: false`. This path works in every harness. Named background teammates and tmux or iTerm2 panes are an OPTIONAL EXPERIMENTAL path. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gates that path. If the path is unavailable, fall back to the default.
3. Run one spawn cycle per wave, with fresh subagents in each wave.
4. All of the subagents within a wave run in parallel.
5. Do the gate validation with `cagents:wave-reviewer`, and never inline the 7-check in the lead.
6. Maximize the number of waves.
7. Wave subagents ARE controller agents. They spawn execution agents directly with the Agent tool. They can also recursively spawn their own subagents, up to depth 5. A subagent that needs another specialty spawns that specialist downward. It does not route the request sideways through the lead. CC ≥ 2.1.172 retains the Agent tool up to 5 levels deep. Graceful degradation per @.claude/rules/playbooks/pat-graceful-degradation-depth1.md is a fallback only. It applies when the Agent tool is verifiably absent at the nesting ceiling, or on a regressed harness.
8. The lead does Wave 0 and the final wave.
9. Never ask for permission between the waves.
10. Never create tasks without also spawning the subagents.
11. `cagents:coord-log-writer` writes the final coordination_log, and the lead does not.

## Session Hierarchy

`/team` creates `team_*` sessions. Strategic mode can spawn child `/act` sessions with `--brief`. In that case, set `parent_session_id` per @reference/parent-session-extraction.md. The hierarchy has a maximum of 2 levels, which are `team_*` and then `act_*`.

## See Also

- @reference/per-wave-decomposition.md, @reference/spawn-brief-schema.md, @reference/integration-handoff.md: the v12.1 lead-context discipline contracts
- @reference/wave-execution-detail.md, @reference/teammate-spawning-template.md, @reference/gate-validation-protocol.md: the wave execution detail, the spawn detail, and the gate detail
- @reference/dynamic-scaling.md, @reference/partial-results.md, @reference/fallback-and-error-recovery.md, @reference/parent-session-extraction.md, @reference/cross-version-compat.md: scaling, partial results, fallback, child-session integration, and CC compat
- `.claude/rules/core/teams.md`, `.claude/skills/act/reference/session-schema.md`: the rules and the canonical session schema

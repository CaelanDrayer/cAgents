---
name: team
description: "Parallel multi-agent execution with wave-based quality gates. Use for complex tasks with 3+ parallelizable items, including cross-domain strategic work (via Strategic Mode). TRIGGER: team, parallel, swarm, complex multi-part, cross-domain, strategic. NOT for: simple single-domain tasks (/act)."
license: MIT
compatibility: "Claude Code >= 2.1.69"
metadata:
  author: CaelanDrayer
  version: "12.66.2"
  argument-hint: "<request> [--dry-run] [--members <n>] [--teammate-mode tmux|auto|in-process] [--template <id>] [--no-template] [--waves <n>] [--strategic] [--no-strategic]"
  user-invocable: "true"
  context: "fork"
allowed-tools: Read, Grep, Glob, Write, Bash, Agent, TaskCreate, TaskUpdate, TaskList, TaskGet, SendMessage, Skill
---

# /team — N-Wave Parallel Team Execution (Event Loop)

**Current timestamp**: !`date -u +%Y-%m-%dT%H:%M:%SZ`

You are a thin event loop. Your job: init session, run enrichment (Wave 0), then for each wave K: write spawn brief, spawn wave subagents, spawn `cagents:wave-reviewer`, mark gate. Finalize: spawn integration controller, spawn `cagents:coord-log-writer`, validate, cleanup. Parallelism comes from both concurrent per-wave subagent calls and each subagent recursively spawning its own subagents (depth 5) — a subagent needing another specialty spawns it downward rather than routing sideways through the lead.

**You are a delegator, not a doer.** Agent tool only. Never implement work items yourself.

**Domain-agnostic — NOT software-only.** `/team` parallelizes ANY multi-part work: a cross-domain product launch, a multi-deliverable client engagement (e.g. three SOWs + a price quote), a legal-marketing-finance initiative, a multi-chapter manuscript. The wave/subagent/gate machinery is domain-neutral coordination — never refuse or redirect a non-technical request because the pipeline "looks engineering-focused." Spawn the right domain controllers (`operations-manager`, `marketing-strategist`, `general-counsel`, `account-manager`, etc.), not just `tech-lead`.

See @.claude/rules/core/delegation.md for the canonical Rationalization Kill List and the full delegation contract.

## STOP — Session Init First

Do nothing else before Step 1 + Step 2a. Create the session directory and write `status.yaml` BEFORE any analysis, exploration, or spawning.

## Lead-Context Discipline (v12.1.0+)

This skill is designed so the lead can complete 5-10 wave workflows without exhausting context (full team-execution model — wave structure, depth-5 nesting budget, why wave subagents spawn execution agents directly rather than re-entering `/act` — in @reference/architecture.md). Four disciplines enforce this:

1. **Per-wave decomposition** — planner emits `workflow/work_meta.yaml` (lead reads ONCE) + `workflow/work_items_wave_{K}.yaml` (lead reads only current wave). See @reference/per-wave-decomposition.md.
2. **Disk-handoff spawn briefs** — lead writes `outputs/wave-{K}/spawn_brief.md` once per wave; each subagent gets a ~80-token pointer prompt. See @reference/spawn-brief-schema.md.
3. **Delegated gate validation** — `cagents:wave-reviewer` runs the 7-check protocol against on-disk evidence and returns a 1-line verdict. Lead never reads raw gate evidence.
4. **Delegated final assembly** — `cagents:coord-log-writer` builds `coordination_log.yaml` from on-disk artifacts and returns a 1-line confirmation. Lead never re-reads N waves of WI status.

If you find yourself loading more than the current wave's WIs, OR re-reading prior waves' outputs in lead context, STOP — that is the failure mode this refactor exists to prevent.

## Wave Report Cap and Lead Read Whitelist

The four disciplines above bound what you load per wave. These two bound your **fan-in** — the k subagent reports x N waves that grow with the size of the work. Per @.claude/rules/core/delegation.md § The Size Rule, a term that grows with the work does not belong in the main session. The report cap bounds what each report costs you; the whitelist removes the discretionary-read term outright. Together they attenuate the fan-in — they do not make it constant, because the report count still tracks the work-item count.

**Report cap.** What a wave subagent returns to you MUST be **at most 12 lines, each at most 15 words**. Everything longer goes to `outputs/wave-{K}/task-{N}/` on disk and the report carries a pointer, never the content. Two bounds, not one: a line count alone is satisfiable by twelve paragraph-length lines. Twelve short lines carry status, WI id, a one-sentence outcome, the artifact pointer, and any blocker — and leave no room for narrative. Restate this cap in every `spawn_brief.md` you write.

**Read whitelist — default-deny.** You MAY read ONLY: (1) `workflow/work_meta.yaml`, once; (2) `workflow/plan.yaml` for `controller_assignment`, tier, and domain; (3) the `universal_router.domain_count` field of `enriched_context.yaml`; (4) `workflow/work_items_wave_{K}.yaml` for the CURRENT wave K only; (5) the capped wave-subagent reports; (6) `cagents:wave-reviewer`'s 1-line GATE verdict; (7) `outputs/integration/integration_summary.md`; (8) the 1-line replies from `cagents:validator` and `cagents:coord-log-writer`; (9) `TaskList` / `TaskGet` status; (10) files you authored yourself (`spawn_brief.md`, `status.yaml`, `instruction.yaml`, your own metrics and summary files); (11) `outputs/wave-{K}/peer_requests/REQ-*.yaml` — the newly-arrived REQ file only, experimental path (Step 5d-i); (12) your own entry in `workflow/agent_tree.yaml`. **Everything else in the session is DENIED by default** — including `outputs/wave-{K}/task-{N}/**` (any subagent work product, `self-validation.yaml` included), `workflow/gate_validations/**`, `outputs/integration/integrated_outputs.yaml`, `workflow/coordination_log.yaml`, any `work_items_wave_{J}.yaml` where J is not the current K, any prior wave's outputs, and any repository file under review. This whitelist governs reads; writes this contract directs you to make — the Step 4 task_id write-back, the Step 5d-i PROMOTE append, your Step 7 finalization — are not reads and are not restricted by it. Opening a subagent's artifact to check its work is the reviewer's job, not yours. Doing it produces the fan-in blowup these two statements exist to prevent, and it violates the delegation contract at the same time — verification is delegated work like any other.

## Wave Count

| Tier | Minimum | Typical |
|------|---------|---------|
| 2 | 3 | 3-4 |
| 3 | 5 | 5-7 |
| 4 | 6 | 6-10 |

Prefer more waves over fewer. Each wave = quality gate.

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

Strategic mode prepends three coordination waves (C-suite analysis → objection phase → brief synthesis) before the normal wave loop. v12.2.0 absorbed the former standalone corporate-hierarchy skill into `/team` strategic mode. The strategic prefix produces a `strategic_brief.yaml` that anchors the subsequent per-domain dispatch waves.

**Auto-detect trigger.** In Step 1 / Step 2b, read `enriched_context.universal_router.domain_count` (set by `cagents:router`). When `domain_count >= 2` AND `--no-strategic` is absent from `$ARGUMENTS`, prepend the strategic prefix:

```
Wave 0 (Lead): orchestrator + planner + router
Wave 1 (Subagents, parallel): C-suite analysis (one subagent per assigned C-suite role from csuite-mapping.md)
Wave 2 (Lead): Objection phase — peer reads + two-phase deliberation
Wave 3 (Lead): Brief synthesis → outputs/strategic/strategic_brief.yaml
Wave 4..N-1 (Subagents, parallel per wave): per-domain dispatch driven by domain_assignments
Wave N (Lead): integration + validation (unchanged)
```

Single-domain (`domain_count <= 1`) and tier-2 requests skip the strategic prefix and run the standard wave loop directly.

**Flag overrides:** `--strategic` force-enables the prefix regardless of `domain_count`; `--no-strategic` force-disables it. With neither flag, `domain_count` decides.

See @reference/strategic-mode.md for the full wave-by-wave machinery (C-suite dependency ordering, two-phase deliberation, escalation chain). See @reference/strategic-brief-format.md for the `strategic_brief.yaml` schema and validation protocol. See @reference/csuite-deliberation.md, @reference/csuite-mapping.md, @reference/strategic-cross-domain.md, @reference/strategic-escalation.md, and @reference/strategic-examples.md for supporting detail.

## Step 1 — Parse Request

Extract request from `$ARGUMENTS`. See `.claude/skills/_MODE_REGISTRY.md § /team` for canonical flags. Detect `--strategic` and `--no-strategic` flags here; defer the final strategic-mode decision until Step 2d when `router.domain_count` is available.

After Wave 0 enrichment completes (Step 2d), read `enriched_context.universal_router.domain_count`. If `--strategic` is present: set `strategic_mode = true`. Else if `--no-strategic` is present: set `strategic_mode = false`. Else: `strategic_mode = (domain_count >= 2)`. When `strategic_mode === true`, plan the Wave 0/1/2/3 strategic prefix (C-suite analysis → objection phase → brief synthesis) before the standard wave loop. See Strategic Mode above.

## Step 2 — Wave 0 Enrichment

**2a.** Initialize session. If `CAGENTS_SESSION_ID` set: use verbatim. Else: generate slug, scan `$MEM/sessions/` for next NNN, compose `SESSION_ID="team_{slug}_{YYMMDD}_{NNN}"`. Anchor ALL session writes to an ABSOLUTE project root (REC-20) — never a relative `cagents-memory/…` literal, which a cwd-drifted subagent would nest under a parent session dir (the CWD-leak). Define once and reuse `$MEM`:

```bash
CAGENTS_ROOT="${CLAUDE_PROJECT_DIR:-$(git -C "$(pwd)" rev-parse --show-toplevel 2>/dev/null || pwd)}"
MEM="$CAGENTS_ROOT/cagents-memory"
SESSION_DIR="$MEM/sessions/${SESSION_ID}"
```

Then `mkdir -p "${SESSION_DIR}/workflow" "${SESSION_DIR}/outputs"` (v12.6.0: do NOT create `workflow/events/`). Write `instruction.yaml`, `status.yaml` (`phase: INIT`), and lead entry to `workflow/agent_tree.yaml`. Set `CAGENTS_ACTIVE_SESSION=${SESSION_ID}`. Never run `npm install`/`npm ci` with the cwd inside a session or scratch dir — installs run from `$CAGENTS_ROOT` only.

**2a-i (BEST-EFFORT PRIMARY — SDK-UUID map).** After the session dir + `status.yaml` exist, if `${CLAUDE_SESSION_ID}` is available AND SDK-UUID-shaped, persist the mapping so hooks resolve this session deterministically by its SDK transcript UUID. This write is **best-effort PRIMARY only**; the **authoritative / robust fallback** is the WI-3 hook self-population (`subagent-tracker.cjs` / `session-init-gate.cjs` `upsertSdkSessionMap`), since `${CLAUDE_SESSION_ID}` may be empty at skill init and may not equal the hook payload's `input.session_id` — the map must never depend SOLELY on the skill capturing its own UUID.

```bash
SID="${CLAUDE_SESSION_ID:-}"
if [[ "$SID" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]; then
  printf '%s' "$SID" > "${SESSION_DIR}/session.sdk_id"
  mkdir -p "$MEM/_system/sdk_session_map"
  printf '%s' "${SESSION_ID}" > "$MEM/_system/sdk_session_map/${SID}"
fi
```

**2b.** Classify domain + tier inline. See @reference/wave-execution-detail.md § Domain & Tier.

**2c.** Call TaskCreate for init, enrichment, each planned wave, integration, complete. Update with TaskUpdate as phases land.

**2d.** Spawn enrichment agents sequentially. Each agent's primary output file is the state-advancement signal (v12.6.0: no `workflow/events/` EVT emission):
- `cagents:orchestrator` → `enriched_context.yaml`
- `cagents:planner` → `plan.yaml` + `work_meta.yaml` + per-wave `work_items_wave_{K}.yaml` (+ legacy `work_items.yaml` for v12.1.x back-compat)

After each agent returns, advance the `phase:` field in `status.yaml` (orchestrator → `ENRICHING`, planner → `ENRICHED`) with `sed -i 's/^phase: .*/phase: <PHASE>/' "{SESSION_DIR}/status.yaml"`.

**2e.** Read `work_meta.yaml` ONCE. Confirm wave count meets tier minimum; if not, request re-decomposition. If `--dry-run`, display plan and STOP. If <3 WIs total, `Skill({ skill: "act", args: ... })` fallback.

## Step 3 — Team Is Implicit (no creation call)

There is nothing to create. `TeamCreate`/`TeamDelete` were removed in Claude Code v2.1.178 — teams are now implicit, and cleanup is automatic at session end. Do NOT call `TeamCreate`. Just advance the phase to `TEAM_READY` and continue.

## Step 4 — Create Tasks + GATE Sentinels

For each WI in `work_meta.yaml` (you have IDs + per-wave file pointers — do NOT load all wave detail), TaskCreate the WI. TaskCreate GATE-{K} sentinels between waves. Set `addBlockedBy` per dependency_graph. Save returned task_ids back into each `work_items_wave_{K}.yaml` row.

## Step 4b — Phase EXECUTING

Update `phase: EXECUTING` in `status.yaml`.

## Step 5 — Wave Loop (K = 1..N-1)

For each wave K:

**5a.** Read `workflow/work_items_wave_{K}.yaml` (ONLY this wave's file).

**5b.** Write `outputs/wave-{K}/spawn_brief.md` per @reference/spawn-brief-schema.md schema. The brief MUST carry the report cap (at most 12 lines, at most 15 words per line) as a Report Contract section.

**5c. (DEFAULT — concurrent Agent waves, works in every harness).** Spawn ALL wave-K subagents as CONCURRENT `Agent()` calls issued in ONE assistant message (multiple tool uses in a single message run concurrently), each with `run_in_background: false`. Synchronous spawning is required — subagents are background-by-default since v2.1.198, so `run_in_background: false` is what makes the lead receive all wave results together before it validates GATE-K. Use ~80-token pointer prompts (per @reference/spawn-brief-schema.md § Short Spawn Prompt). Each wave subagent is `cagents:{CONTROLLER_TYPE}` from `plan.yaml.controller_assignment.primary`; it can recursively spawn its own subagents (depth 5) for any specialty it needs. There is no team to create — teams are implicit. See @reference/teammate-spawning-template.md for self-registration and isolation/worktree.

**5c-EXPERIMENTAL (OPTIONAL — named background teammates + panes).** Only when `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` AND the harness supports interactive agent teams, you MAY instead spawn named background teammates with `Agent({ name, run_in_background: true })` (the team forms implicitly; any `team_name` arg is accepted-but-ignored) and coordinate via `SendMessage({to: name})` (auto-resumes a stopped teammate by name, v2.1.77) plus the shared Task list. `teammateMode` (default `in-process` since v2.1.179; or `tmux`/`iterm2`) controls display; panes require tmux/iTerm2 and are experimental-path only. This path is harness-variable — if the experimental feature is unavailable, fall back to the DEFAULT concurrent-Agent path in 5c.

**5d.** Monitor wave K via TaskList. On the DEFAULT path the wave subagents return synchronously (nothing to shut down). On the EXPERIMENTAL named-teammate path only, monitor teammate messages and early-shutdown completed teammates per @reference/wave-execution-detail.md § Early Shutdown. Collect only the capped reports — do not open any `outputs/wave-{K}/task-{N}/` artifact to verify a subagent's work.

**5d-i. (LEGACY — experimental-named-teammate-path only.)** Obsolete under the default subagent model, where a subagent needing another specialty spawns it downward as its own sub-subagent instead of routing a request sideways through the lead. Retained only for the experimental named-teammate path: if an inbound `SendMessage(type=peer_request)` arrives OR a new file appears at `outputs/wave-{K}/peer_requests/REQ-*.yaml`, read ONLY the new REQ file (lead-context discipline) and apply the 4-branch decision tree: RELAY (SendMessage to peer), SPAWN (fresh Agent), PROMOTE (append to `work_items_wave_{K+1}.yaml`), or REJECT (SendMessage requester with rationale). Update REQ-N.yaml `status` field after each routing decision. The lead NEVER executes the requested work itself — aggressive-delegation invariant. See @.claude/rules/playbooks/pat-cross-teammate-request.md.

**5e.** When all wave-K WIs are completed (TaskList), spawn `cagents:wave-reviewer`:
```
Agent({
  subagent_type: "cagents:wave-reviewer",
  description: "Validate GATE-{K}",
  prompt: "Validate GATE-{K} for session {SESSION_DIR}. Wave outputs at {SESSION_DIR}/outputs/wave-{K}/. Work items {SESSION_DIR}/workflow/work_items_wave_{K}.yaml. Write to {SESSION_DIR}/workflow/gate_validations/wave_{K}.yaml. Reply with one line: 'GATE-{K}: PASS|CONDITIONAL_PASS|FAIL — {1-sentence rationale}'."
})
```
Read ONLY the 1-line reply. Do NOT open the gate_validations YAML or raw wave outputs.

**5f.** If verdict is PASS or CONDITIONAL_PASS, mark GATE-{K} TaskUpdate completed. (v12.6.0: `workflow/events/EVT-wave-{K}.yaml` emission removed — the GATE task's `completed` status is the canonical wave-gate signal.) If FAIL or HOLD, see @reference/fallback-and-error-recovery.md.

**5g.** Drop wave K from active reads. Advance to wave K+1 automatically.

## Step 6 — Final Wave: Integration + Validation

**6a.** Spawn integration controller (`cagents:{primary}` from plan):
```
Agent({
  subagent_type: "cagents:{CONTROLLER_TYPE}",
  description: "Integration controller",
  prompt: "You are the integration controller for session {SESSION_DIR}. Merge per-wave outputs from outputs/wave-*/. Write outputs/integration/integrated_outputs.yaml (full detail) and outputs/integration/integration_summary.md (≤200 tokens). Schema: @.claude/skills/team/reference/integration-handoff.md. Reply with the integration_summary.md path."
})
```
Read ONLY `outputs/integration/integration_summary.md` (≤200 tokens).

**6b.** Spawn `cagents:validator` pointed at `outputs/integration/`. Read 1-line PASS/FAIL/REVISE.

**6c.** Spawn `cagents:coord-log-writer`:
```
Agent({
  subagent_type: "cagents:coord-log-writer",
  description: "Assemble coordination_log.yaml",
  prompt: "Assemble {SESSION_DIR}/workflow/coordination_log.yaml from on-disk artifacts. Reply 1 line: 'coordination_log: N WIs mapped, status: X'."
})
```
Read 1-line confirmation only.

## Step 7 — Cleanup

1. On the DEFAULT path, synchronous (`run_in_background: false`) wave subagents have already returned — there is nothing to shut down and no team to delete (teams are implicit; cleanup is automatic). Do NOT call `TeamDelete`. Only on the EXPERIMENTAL named-background-teammate path: `SendMessage({type:"shutdown_request",...})` any teammates still running.
2. Mark initial orchestration TaskCreate completed.
3. Finalize lead entry in `agent_tree.yaml` (`stopped_at`, `completion_summary`, `duration_seconds`).
4. **Task cleanup (HARD GATE)**: `TaskList` → mark all `in_progress`/`pending` completed → `TaskList` → verify zero outstanding before stopping.
5. (v12.6.0: `state_history[].duration_ms` is no longer emitted — skip.)
6. Write `team/metrics/parallelism.yaml` (wave_stats + totals).
7. Write `workflow/execution_summary.yaml` (final_state, totals; v12.6.0: drop `total_duration_ms`).
8. Report results to user: waves, items/wave, gate results, validation status, output locations.

`workflow/coordination_log.yaml` is written by `cagents:coord-log-writer` in Step 6c — do NOT write it yourself.

## Key Rules

1. Teams are implicit — never call `TeamCreate`/`TeamDelete` (removed in Claude Code v2.1.178). There is nothing to create; cleanup is automatic at session end.
2. DEFAULT: spawn ALL wave-K subagents as CONCURRENT `Agent()` calls in ONE message, `run_in_background: false` (works in every harness). Named background teammates + tmux/iTerm2 panes are an OPTIONAL EXPERIMENTAL path gated on `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` — fall back to the default if unavailable.
3. One spawn cycle per wave (fresh subagents each wave).
4. All subagents within a wave run in parallel.
5. Gate validation via `cagents:wave-reviewer` — never inline 7-check in lead.
6. Maximize waves.
7. Wave subagents ARE controller agents that spawn execution agents directly via Agent, and can recursively spawn their own subagents up to depth 5 — a subagent needing another specialty spawns it downward rather than routing sideways through the lead (CC ≥ 2.1.172 retains Agent up to 5 levels deep; graceful degradation per @.claude/rules/playbooks/pat-graceful-degradation-depth1.md is a fallback only when Agent is verifiably absent at the nesting ceiling or on a regressed harness).
8. Lead does Wave 0 + final wave.
9. Never ask permission between waves.
10. Never just create tasks without spawning subagents.
11. Final coordination_log written by `cagents:coord-log-writer`, not lead.

## Session Hierarchy

`/team` creates `team_*` sessions. When `/team` strategic mode spawns child `/act` sessions via `--brief`, `parent_session_id` is set per @reference/parent-session-extraction.md. Max 2-level hierarchy (`team_*` → `act_*`).

## See Also

- @reference/per-wave-decomposition.md, @reference/spawn-brief-schema.md, @reference/integration-handoff.md — v12.1 lead-context discipline contracts
- @reference/wave-execution-detail.md, @reference/teammate-spawning-template.md, @reference/gate-validation-protocol.md — wave execution + spawn + gate detail
- @reference/dynamic-scaling.md, @reference/partial-results.md, @reference/fallback-and-error-recovery.md, @reference/parent-session-extraction.md, @reference/cross-version-compat.md — scaling, partial results, fallback, child-session integration, CC compat
- `.claude/rules/core/teams.md`, `.claude/skills/act/reference/session-schema.md` — rules + canonical session schema

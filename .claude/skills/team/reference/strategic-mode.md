# /team Strategic Mode

Detailed wave-by-wave specification for `/team` in **strategic mode** — the multi-domain coordination flow introduced in v12.2.0. Strategic mode adds a 3-wave strategic prefix (C-suite analysis, objection phase, brief synthesis) before the standard per-domain dispatch waves.

This document is the canonical wave-flow reference. For complementary topics:
- `@reference/strategic-brief-format.md` — `strategic_brief.yaml` schema (including `dependency_type`)
- `@reference/csuite-deliberation.md` — Wave 0/1 dependency-ordered analysis + two-phase deliberation
- `@reference/csuite-mapping.md` — domain-to-C-suite routing table
- `@reference/strategic-escalation.md` — escalation chain and resolution patterns
- `@reference/strategic-examples.md` — worked end-to-end examples

## When Strategic Mode Activates

Strategic mode is activated by:
- `/team --strategic <instruction>` explicit flag, OR
- `/team <instruction>` when the router detects multi-domain scope (2+ domains touched) and tier 3+ complexity

Single-domain or tier-2 requests do NOT enter strategic mode — they use the standard `/team` flat-wave or template-wave flow.

## Wave Overview

Strategic mode is a wave pipeline with two distinct phases:

| Phase | Wave Range | Owner | Purpose |
|-------|-----------|-------|---------|
| **Strategic prefix** | Wave 0, Wave 1, Wave 2 | Strategic-mode lead | Cross-domain C-suite analysis, objection deliberation, brief synthesis |
| **Per-domain dispatch** | Wave 3 .. Wave N-1 | Per-domain controllers | Execute work items per domain. Independent domains in parallel via Agent; dependent domains sequential via Skill(/run --brief). |
| **Integration** | Wave N | Strategic-mode lead | Merge cross-domain outputs, run final validation, write integration_report.yaml |

Compared to standard `/team` mode, the strategic prefix replaces what was previously the "bootstrap" wave with a richer cross-domain analysis cycle. Per-domain dispatch waves are similar to standard /team but driven by `domain_assignments` in the strategic brief rather than a template.

## Wave 0 — C-Suite Analysis (Strategic Prefix)

**Owner**: Strategic-mode lead spawns C-suite agents (e.g., `cagents:cto`, `cagents:cco`, `cagents:cfo`, etc.). C-suites run as level-1 subagents.

**Spawn pattern**: Dependency-ordered, multi-wave parallel — see `@reference/csuite-deliberation.md` for full detail.

- **Wave 0a (independent C-suites in parallel)**: Spawn all C-suite agents with no peer dependencies simultaneously. Each writes `domain_analyses/domain_analysis_{domain_key}.yaml`.
- **Wave 0b (dependent C-suites in parallel)**: Spawn C-suites that benefit from peer analyses. Each reads relevant Wave 0a outputs first, then writes its own analysis with a `peer_context_used:` block.

Wait for all Wave 0 (both sub-waves) to complete before proceeding to Wave 1.

**Pre-execution research (optional)**: Before spawning C-suites, the strategic-mode lead MAY spawn lightweight research subagents to gather concrete project facts (codebase analysis, existing patterns, current metrics). Research outputs go to `domain_analyses/research_*.yaml` and are read by C-suite agents during their analysis. This grounds C-suite analysis in real project state rather than instruction-text interpretation alone.

**State at Wave 0 end**: ANALYZED. Write state transition event to `workflow/events/EVT-{N}.yaml`.

## Wave 1 — Objection Phase (Strategic Prefix)

**Owner**: Strategic-mode lead re-spawns the same C-suite agents in parallel.

**Mandatory reads**: Each C-suite agent in Wave 1 MUST read:
1. The CEO's draft brief (`strategic_brief_draft.yaml`, written by the lead between Wave 0 and Wave 1)
2. ALL peer domain analyses from Wave 0 (every `domain_analyses/domain_analysis_*.yaml`)

This is the cross-domain context pass — each agent objects with full visibility into peer analyses, not just its own.

**Output**: Each agent writes `objections/objections_{csuite_agent}.yaml` with:
- `peer_analyses_reviewed: [list]` (validated by post-write check)
- `status: approved | conditional_approval | objection`
- `objections: [list of structured objections with severity blocking|suggestion]`
- `requested_dependencies: [list]`
- `risk_flags: [list]`

**Post-validation (M-03 check)**: The lead validates that every objection file has a non-empty `peer_analyses_reviewed` list. Agents that did not read peers are re-spawned once with stronger instructions.

**State at Wave 1 end**: still ANALYZED (objections are inputs to deliberation, not a separate state). Proceed immediately to Wave 2.

## Wave 2 — Brief Synthesis (Strategic Prefix)

**Owner**: Strategic-mode lead (no spawned agents — this is lead-internal work).

**Inputs**:
- `strategic_brief_draft.yaml` (the lead's draft from between Wave 0 and Wave 1)
- All `objections/objections_*.yaml` from Wave 1

**Resolutions**:
- **Blocking objections**: Adjust the brief to address them
- **Suggestions**: Incorporate if low-cost
- **Conflicting demands**: Lead decides based on chairperson intent
- **New dependencies**: Add to `cross_domain_dependencies`

**Output**: Final `strategic_brief.yaml` with all `domain_assignments` populated, including:
- `dependency_type: independent | dependent_on` on every entry (drives Wave 3+ dispatch)
- `dependent_on: [domain_keys]` on entries with `dependency_type: dependent_on`
- `cross_domain_dependencies` graph (validated acyclic)
- `risk_register` with owners
- `success_criteria` (measurable)

**State at Wave 2 end**: BRIEFED. Run Validation Point 3 (`strategic_brief_validation`) — see `@reference/strategic-brief-format.md`. The validation includes the new `domain_dependency_type_declared`, `dependent_on_well_formed`, and `dependency_graph_acyclic` checks.

## Wave 3 .. Wave N-1 — Per-Domain Dispatch

**Owner**: Strategic-mode lead dispatches per-domain work. Each domain's actual work is owned by its domain controller (spawned by the lead).

**Dispatch logic driven by `dependency_type`**:

1. **Topological-sort** the `domain_assignments` by their `dependent_on` arrays.
2. **Group the topological order into dispatch waves**: domains with no remaining unmet dependencies form the next wave; once they complete, the next group runs.
3. **Within each dispatch wave**:
   - **Independent domains** (`dependency_type: independent`) dispatch **in parallel via Agent tool**:
     ```
     Agent({
       subagent_type: "cagents:{csuite_or_controller}",
       description: "Domain execution: {domain_key}",
       prompt: "Execute work items {WI list} per strategic_brief.yaml. Read {SESSION_DIR}/strategic_brief.yaml for the full brief context."
     })
     ```
   - **Dependent domains** (`dependency_type: dependent_on`) dispatch **sequentially via Skill tool**:
     ```
     Skill({
       skill: "run",
       args: "{instruction_summary_for_domain} --brief {SESSION_DIR}/strategic_brief.yaml --domain {domain_key}"
     })
     ```
     The Skill invocation receives the full brief plus a `--domain` selector so `/run` can scope to the dependent domain's work items. Upstream domain outputs are available in the session directory for `/run` to read.

4. **Track completion** per domain via `domain_status.{domain_key}.status` in `strategic_brief.yaml` (pending -> in_progress -> completed | blocked).

5. **Escalation handling**: If any domain reports an escalation during dispatch, the strategic-mode lead handles it per `@reference/strategic-escalation.md` (resolve at strategic level, or escalate to user as HITL).

**Wave count for per-domain dispatch**: This is variable — the number of dispatch waves equals the longest path in the `dependent_on` DAG. A 5-domain brief with no dependencies runs in a single dispatch wave (all 5 parallel via Agent). A 5-domain brief with a linear dependency chain runs in 5 sequential dispatch waves.

**State during per-domain dispatch**: EXECUTING. Each completed domain advances `domain_status[domain].status` to `completed`.

**State after all domains complete**: EXECUTED. Run Validation Point 4 (`post_execution_validation`) — see `@reference/strategic-brief-format.md`.

## Wave N — Integration

**Owner**: Strategic-mode lead (lead-internal work, no teammate spawn).

**Inputs**: All per-domain outputs from Wave 3..N-1 plus the strategic_brief.yaml.

**Actions**:
1. Merge cross-domain deliverables and verify handoffs match `cross_domain_dependencies`
2. Run Validation Point 5 (`integration_validation`)
3. Write `integration_report.yaml` capturing:
   - Domains executed and their outputs
   - Cross-domain contracts fulfilled
   - Outstanding gaps (if any)
   - Brief version drift (compare `strategic_brief._version_history[0]` vs final)
4. Write `execution_summary.yaml`:
   ```yaml
   session_id: {SESSION_ID}
   final_state: complete
   status: completed
   strategic_mode: true
   domains_executed: [{domain_keys}]
   csuite_spawned: [{agent_names}]
   total_duration_ms: {elapsed}
   started_at: "{first state_history entered_at}"
   completed_at: "{ISO_TIMESTAMP}"
   ```

**State at Wave N end**: INTEGRATED, then immediately COMPLETE.

## Routing Within Strategic Mode

The strategic-mode lead can short-circuit the full wave flow when the analyzed scope turns out to be single-domain:

```
After Wave 0 analysis (or via --quick), if domains_touched == 1:

  1 domain + simple scope:
    -> Strategic brief + Skill("run", "--brief {brief_path}")
    -> Collapse pipeline to: INIT -> BRIEFED -> EXECUTED -> COMPLETE

  1 domain + complex scope:
    -> Strategic brief + /team standard mode with --session {session_dir}
    -> Collapse pipeline to: INIT -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE

  2+ domains OR cross-domain keywords:
    -> Full strategic wave flow (Wave 0..N as described above)
```

Write `routing_decision.yaml`:
```yaml
domains_touched: [{domain_key}: {csuite}]
route: full_strategic_wave_flow | single_team_standard | single_run
rationale: "{why this route}"
strategic_mode: true
```

## Session Directory Layout

```
cagents-memory/sessions/team_{slug}_{YYMMDD}_{NNN}/
+-- instruction.yaml
+-- status.yaml
+-- routing_decision.yaml
+-- domain_dependencies.yaml          # which C-suites are Wave 0a vs Wave 0b
+-- strategic_brief_draft.yaml        # post-Wave 0, pre-Wave 1
+-- strategic_brief.yaml              # post-Wave 2, with domain_assignments + dependency_type
+-- domain_analyses/
|   +-- research_codebase.yaml        # optional pre-Wave 0 research
|   +-- research_{domain_key}.yaml    # optional per-domain research
|   +-- domain_analysis_engineering.yaml
|   +-- domain_analysis_creative.yaml
|   +-- ...
+-- objections/
|   +-- objections_cto.yaml
|   +-- objections_cco.yaml
|   +-- ...
+-- {domain_key}/                     # per-domain output directories (Wave 3..N-1)
|   +-- workflow/
|   +-- outputs/
+-- integration_report.yaml           # post-Wave N
+-- execution_summary.yaml            # post-COMPLETE
+-- workflow/
    +-- agent_tree.yaml
    +-- events/
```

## Initialization Sequence

When `/team` enters strategic mode, the lead MUST initialize the session directory before any wave work:

1. Generate `SESSION_ID = "team_{slug}_{YYMMDD}_{NNN}"` (standard /team session naming — strategic mode does NOT use a separate `org_*` prefix).
2. `mkdir -p ${SESSION_DIR}/workflow/events ${SESSION_DIR}/outputs ${SESSION_DIR}/domain_analyses ${SESSION_DIR}/objections`
3. Write `instruction.yaml` (with `session_type: team`, `strategic_mode: true`).
4. Write `status.yaml` with `pipeline_state: INIT`.
5. Write strategic-mode-lead self-registration to `workflow/agent_tree.yaml`.
6. Seed TaskCreate entries using the strategic-mode wave names (see below).

**CRITICAL: `{ISO_TIMESTAMP}` must be the REAL current time.** Use the timestamp from "Current timestamp" at the top of the SKILL.md, or run `date -u +%Y-%m-%dT%H:%M:%SZ` via Bash. NEVER fabricate timestamps.

**State casing**: Always use lowercase for `pipeline_state` values in `status.yaml` (e.g., `complete` not `COMPLETE`).

**State transition protocol**: At every state transition, the lead MUST:
1. Compute `duration_ms` for the previous `state_history` entry
2. Append new `state_history` entry with `entered_at: now`, `duration_ms: null`
3. Update `pipeline_state` to the new state
4. Write a completion summary at COMPLETE state (even on partial completion)

## TaskCreate Seeding

Seed TaskCreate entries describing strategic-mode work — NOT state machine names. Use the parent>child format when spawning C-suite agents and domain controllers.

Interactive seed example:
```
TaskCreate({ subject: "[team-strategic] Routing: analyzing domains & scope", description: "INIT phase" })
TaskCreate({ subject: "[team-strategic] Wave 0a: independent C-suite analysis" })
TaskCreate({ subject: "[team-strategic] Wave 0b: dependent C-suite analysis (peer-read)" })
TaskCreate({ subject: "[team-strategic] Wave 1: objection phase (cross-domain review)" })
TaskCreate({ subject: "[team-strategic] Wave 2: strategic brief synthesis" })
TaskCreate({ subject: "[team-strategic] Wave 3..N-1: per-domain dispatch" })
TaskCreate({ subject: "[team-strategic] Wave N: cross-domain integration" })
TaskCreate({ subject: "[team-strategic] Complete" })
```

As work progresses, `TaskUpdate` to `in_progress` then `completed`. Use the parent>child format (`[team-strategic > {csuite}] {domain} domain analysis`) when spawning C-suite agents.

**CRITICAL: Never use state machine names (INIT, ANALYZED, etc.) as task subjects.** Describe the work being done. Never prepend a slash: `[team-strategic]` not `[/team-strategic]`.

## Completion

### Finalize Strategic-Mode Lead in agent_tree.yaml

Update the strategic-mode lead entry to set:
- `stopped_at: "{ISO_TIMESTAMP}"`
- `completion_summary: "Orchestrated {N} domains, {N} C-suite agents, strategic brief + execution"`
- `duration_seconds: {computed from spawned_at to now}`

Write state transition event:
```yaml
event_id: EVT-{N}
type: state_transition
state: complete
agent: cagents:strategic-mode-lead
timestamp: "{ISO_TIMESTAMP}"
outputs_produced: [integration_report.yaml, execution_summary.yaml]
```

### Clean Up Tasks (MANDATORY — Hard Gate Before Stopping)

Call `TaskList` to get the CURRENT task inventory. Do NOT rely on task IDs remembered from earlier in the session — IDs may have shifted after Skill invocations. For EVERY task that is `in_progress` or `pending`, call `TaskUpdate({ taskId: "{id}", status: "completed" })`. If TaskUpdate returns "Task not found", the task was in a different namespace (expected after TeamDelete) — log it and continue.

**Cleanup guard**: Before producing any final output or stopping, call `TaskList` one more time and verify it shows zero `in_progress` tasks. If any remain, mark them completed. This is a hard gate — do not stop with stale tasks.

### Report to User

Summarize what was accomplished across all domains, key decisions made during deliberation, any escalations handled, and where outputs can be found. Include a pointer to `integration_report.yaml` and `execution_summary.yaml`.

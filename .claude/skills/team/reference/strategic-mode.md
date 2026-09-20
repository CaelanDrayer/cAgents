# /team Strategic Mode

This file is the detailed wave-by-wave specification for `/team` in **strategic mode**. Strategic mode is the multi-domain coordination flow that v12.2.0 introduced. It adds a strategic prefix of 3 waves before the standard per-domain dispatch waves. Those 3 waves are the C-suite analysis, the objection phase, and the brief synthesis.

This document is the canonical wave-flow reference. For complementary topics:
- `@reference/strategic-brief-format.md`: the schema of `strategic_brief.yaml`, which includes `dependency_type`.
- `@reference/csuite-deliberation.md`: the dependency-ordered analysis in Wave 0 and Wave 1, plus the two-phase deliberation.
- `@reference/csuite-mapping.md`: the routing table from a domain to a C-suite agent.
- `@reference/strategic-escalation.md`: the escalation chain and the resolution patterns.
- `@reference/strategic-examples.md`: the worked end-to-end examples.

## When Strategic Mode Activates

Two conditions activate strategic mode:
- The explicit flag `/team --strategic <instruction>`.
- A `/team <instruction>` call where the router detects a multi-domain scope. That scope has 2 domains or more, and the complexity is tier 3 or higher.

A single-domain request does NOT enter strategic mode. A tier-2 request does NOT enter it either. Both use the standard flat-wave flow of `/team`, or its template-wave flow.

## Wave Overview

Strategic mode is a wave pipeline with two distinct phases:

| Phase | Wave Range | Owner | Purpose |
|-------|-----------|-------|---------|
| **Strategic prefix** | Wave 0, Wave 1, Wave 2 | Strategic-mode lead | Cross-domain C-suite analysis, objection deliberation, brief synthesis |
| **Per-domain dispatch** | Wave 3 .. Wave N-1 | Per-domain controllers | Execute the work items of each domain. An independent domain runs in parallel through the Agent tool. A dependent domain runs in sequence through Skill(/act --brief). |
| **Integration** | Wave N | Strategic-mode lead | Merge the cross-domain outputs. Run the final validation. Write integration_report.yaml. |

Standard `/team` mode has a bootstrap wave. The strategic prefix replaces that wave with a richer cross-domain analysis cycle. The per-domain dispatch waves are similar to the ones in standard /team. The `domain_assignments` block in the strategic brief drives them, and a template does not.

## Wave 0 — C-Suite Analysis (Strategic Prefix)

**Owner**: the strategic-mode lead spawns the C-suite agents. Examples are `cagents:cto`, `cagents:cco`, and `cagents:cfo`. Each C-suite agent runs as a level-1 subagent.

**Spawn pattern**: the spawn is dependency-ordered, and it is parallel across many waves. For the full detail, see `@reference/csuite-deliberation.md`.

- **Wave 0a (independent C-suites in parallel)**: spawn every C-suite agent that has no peer dependency at the same time. Each agent writes `domain_analyses/domain_analysis_{domain_key}.yaml`.
- **Wave 0b (dependent C-suites in parallel)**: spawn each C-suite agent that gets a benefit from a peer analysis. Each agent first reads the Wave 0a outputs that apply to it. Each agent then writes its own analysis with a `peer_context_used:` block.

Wait for all of Wave 0 to complete before you go on to Wave 1. Both sub-waves must complete.

**Pre-execution research (optional)**: before it spawns the C-suites, the strategic-mode lead MAY spawn small research subagents. They collect concrete facts about the project, such as the codebase analysis, the existing patterns, and the current metrics. The research outputs go to `domain_analyses/research_*.yaml`. Each C-suite agent reads them during its analysis. The analysis then rests on the real state of the project, and not on the text of the instruction alone.

**State at Wave 0 end**: ANALYZED. Release v12.6.0 removed the `workflow/events/EVT-{N}.yaml` emission. Two artifacts are now the canonical signal of the state transition. They are the `pipeline_state` update in `status.yaml`, and the `domain_analyses/*.yaml` outputs.

## Wave 1 — Objection Phase (Strategic Prefix)

**Owner**: the strategic-mode lead re-spawns the same C-suite agents in parallel.

**Mandatory reads**: each C-suite agent in Wave 1 MUST read these two files:
1. The draft brief of the CEO, which is `strategic_brief_draft.yaml`. The lead writes it between Wave 0 and Wave 1.
2. ALL of the peer domain analyses from Wave 0. They are every `domain_analyses/domain_analysis_*.yaml` file.

This is the cross-domain context pass. Each agent objects with full sight of the peer analyses, and not of its own analysis alone.

**Output**: each agent writes `objections/objections_{csuite_agent}.yaml` with these fields:
- `peer_analyses_reviewed: [list]`. A post-write check validates this field.
- `status: approved | conditional_approval | objection`
- `objections: [list of structured objections with severity blocking|suggestion]`
- `requested_dependencies: [list]`
- `risk_flags: [list]`

**Post-validation (M-03 check)**: the lead validates every objection file. Each file must hold a `peer_analyses_reviewed` list, and that list must not be empty. If an agent did not read its peers, re-spawn that agent once with stronger instructions.

**State at Wave 1 end**: the state is still ANALYZED. The objections are inputs to the deliberation, and they are not a separate state. Go on to Wave 2 at once.

## Wave 2 — Brief Synthesis (Strategic Prefix)

**Owner**: the strategic-mode lead. This work is internal to the lead, and it spawns no agent.

**Inputs**:
- `strategic_brief_draft.yaml`, which is the draft that the lead wrote between Wave 0 and Wave 1
- All `objections/objections_*.yaml` from Wave 1

**Resolutions**:
- **Blocking objections**: change the brief to address them.
- **Suggestions**: include a suggestion if its cost is low.
- **Conflicting demands**: the lead decides from the intent of the chairperson.
- **New dependencies**: add them to `cross_domain_dependencies`.

**Output**: the final `strategic_brief.yaml` file, with every `domain_assignments` entry filled in. It includes these fields:
- `dependency_type: independent | dependent_on` on every entry. This field drives the dispatch from Wave 3 on.
- `dependent_on: [domain_keys]` on each entry with `dependency_type: dependent_on`.
- The `cross_domain_dependencies` graph. The validation confirms that it is acyclic.
- `risk_register` with the owners.
- `success_criteria`, and each criterion is measurable.

**State at Wave 2 end**: BRIEFED. Run Validation Point 3, which is `strategic_brief_validation`. See `@reference/strategic-brief-format.md`. The validation includes the new `domain_dependency_type_declared`, `dependent_on_well_formed`, and `dependency_graph_acyclic` checks.

## Wave 3 .. Wave N-1 — Per-Domain Dispatch

**Owner**: the strategic-mode lead dispatches the per-domain work. The domain controller owns the real work of its domain. The lead spawns that controller.

**Dispatch logic driven by `dependency_type`**:

1. **Topological-sort** the `domain_assignments` by their `dependent_on` arrays.
2. **Group the topological order into dispatch waves**: the domains with no unmet dependency form the next wave. After they complete, the next group runs.
3. **Within each dispatch wave**:
   - An **independent domain**, which has `dependency_type: independent`, dispatches **in parallel through the Agent tool**. Issue all of the independent-domain `Agent()` calls as CONCURRENT tool uses in ONE message. Give each call `run_in_background: false`, so the lead collects their results together. Teams are implicit, so there is no TeamCreate call:
     ```
     Agent({
       subagent_type: "cagents:{csuite_or_controller}",
       description: "Domain execution: {domain_key}",
       run_in_background: false,
       prompt: "Execute work items {WI list} per strategic_brief.yaml. Read {SESSION_DIR}/strategic_brief.yaml for the full brief context."
     })
     ```
   - A **dependent domain**, which has `dependency_type: dependent_on`, dispatches **in sequence through the Skill tool**:
     ```
     Skill({
       skill: "act",
       args: "{instruction_summary_for_domain} --brief {SESSION_DIR}/strategic_brief.yaml --domain {domain_key}"
     })
     ```
     The Skill invocation receives the full brief and a `--domain` selector. `/act` can then scope its work to the work items of the dependent domain. The outputs of the upstream domains are in the session directory, and `/act` reads them there.

4. **Track the completion** of each domain with `domain_status.{domain_key}.status` in `strategic_brief.yaml`. The values run pending -> in_progress -> completed | blocked.

5. **Escalation handling**: if a domain reports an escalation during the dispatch, the strategic-mode lead handles it. Follow `@reference/strategic-escalation.md`. The lead resolves the escalation at the strategic level. As an alternative, the lead escalates it to the user as a HITL gate.

**Wave count for per-domain dispatch**: this count is variable. The number of dispatch waves equals the longest path in the `dependent_on` DAG. A 5-domain brief with no dependency runs in one dispatch wave. All 5 domains then go through the Agent tool in parallel. A 5-domain brief with a linear dependency chain runs in 5 sequential dispatch waves.

**State during per-domain dispatch**: EXECUTING. Each completed domain advances `domain_status[domain].status` to `completed`.

**State after all domains complete**: EXECUTED. Run Validation Point 4, which is `post_execution_validation`. See `@reference/strategic-brief-format.md`.

## Wave N — Integration

**Owner**: the strategic-mode lead. This work is internal to the lead, and it spawns no subagent.

**Inputs**: all of the per-domain outputs from Wave 3 to Wave N-1, and the strategic_brief.yaml file.

**Actions**:
1. Merge the cross-domain deliverables. Make sure that each handoff matches `cross_domain_dependencies`.
2. Run Validation Point 5, which is `integration_validation`.
3. Write `integration_report.yaml`. It captures these items:
   - The domains that executed, and their outputs.
   - The cross-domain contracts that are fulfilled.
   - Each gap that is still open.
   - The version drift of the brief. Compare `strategic_brief._version_history[0]` against the final version.
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

Sometimes the analyzed scope is single-domain. In that case, the strategic-mode lead can short-circuit the full wave flow:

```
After Wave 0 analysis (or via --quick), if domains_touched == 1:

  1 domain + simple scope:
    -> Strategic brief + Skill("act", "--brief {brief_path}")
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
```
Release v12.6.0 removed the EVT emission, so the system no longer creates `workflow/events/`.

## Initialization Sequence

When `/team` enters strategic mode, the lead MUST initialize the session directory before any wave work:

1. Generate `SESSION_ID = "team_{slug}_{YYMMDD}_{NNN}"`. This is the standard session naming of /team. Strategic mode does NOT use a separate `org_*` prefix.
2. `mkdir -p ${SESSION_DIR}/workflow ${SESSION_DIR}/outputs ${SESSION_DIR}/domain_analyses ${SESSION_DIR}/objections`. From v12.6.0, do NOT create `workflow/events/`.
3. Write `instruction.yaml`, with `session_type: team` and `strategic_mode: true`.
4. Write `status.yaml` with `pipeline_state: INIT`.
5. Write strategic-mode-lead self-registration to `workflow/agent_tree.yaml`.
6. Seed TaskCreate entries using the strategic-mode wave names (see below).

**CRITICAL: `{ISO_TIMESTAMP}` must be the REAL current time.** Use the timestamp from "Current timestamp" at the top of the SKILL.md file. As an alternative, run `date -u +%Y-%m-%dT%H:%M:%SZ` with Bash. NEVER fabricate a timestamp.

**State casing**: always write each `pipeline_state` value in `status.yaml` in lowercase. Write `complete`, and do not write `COMPLETE`.

**State transition protocol**: At every state transition, the lead MUST:
1. Compute `duration_ms` for the previous `state_history` entry
2. Append new `state_history` entry with `entered_at: now`, `duration_ms: null`
3. Update `pipeline_state` to the new state
4. Write a completion summary at the COMPLETE state. Do this even for a partial completion.

## TaskCreate Seeding

Seed the TaskCreate entries with a description of the strategic-mode work. Do NOT use the state machine names. Use the parent>child format when you spawn a C-suite agent or a domain controller.

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

As the work progresses, call `TaskUpdate` with `in_progress`, and then with `completed`. Use the parent>child format when you spawn a C-suite agent, for example `[team-strategic > {csuite}] {domain} domain analysis`.

**CRITICAL: never use a state machine name as a task subject.** Examples of those names are INIT and ANALYZED. Describe the work that you do. Never put a slash in front: write `[team-strategic]`, and do not write `[/team-strategic]`.

## Completion

### Finalize Strategic-Mode Lead in agent_tree.yaml

Update the strategic-mode lead entry to set:
- `stopped_at: "{ISO_TIMESTAMP}"`
- `completion_summary: "Orchestrated {N} domains, {N} C-suite agents, strategic brief + execution"`
- `duration_seconds: {computed from spawned_at to now}`

Advance the `pipeline_state` in `status.yaml` to `complete`. Release v12.6.0 removed the `workflow/events/EVT-{N}.yaml` emission. Two artifacts are now the canonical completion signal. They are the `pipeline_state: complete` update in `status.yaml`, and the `integration_report.yaml` and `execution_summary.yaml` outputs.

### Clean Up Tasks (MANDATORY — Hard Gate Before Stopping)

Call `TaskList` to get the CURRENT task inventory. Do NOT use a task ID that you remember from earlier in the session. An ID can shift after a Skill invocation. For EVERY task that is `in_progress` or `pending`, call `TaskUpdate({ taskId: "{id}", status: "completed" })`.

Sometimes TaskUpdate returns "Task not found". The task then belongs to a different namespace. One example is a task that a spawned subagent created in its own scope. Log that task, and continue. Teams are implicit, so there is no `TeamDelete` call. The cleanup is automatic at session end.

**Cleanup guard**: before you produce the final output, call `TaskList` one more time. Do the same before you stop. Make sure that it shows zero `in_progress` tasks. If a task stays, mark it completed. This is a hard gate. Do not stop with a stale task.

### Report to User

Write a summary of the work that the domains did. Include the key decisions from the deliberation. Include each escalation that you handled. Say where the reader finds the outputs. Include a pointer to `integration_report.yaml` and to `execution_summary.yaml`.

# Cross-Domain Dispatch & Handoffs

This file gives the supporting detail for two mechanics of `/team` strategic mode. They are the per-domain dispatch and the cross-domain handoff. The canonical wave-by-wave flow lives in `@reference/strategic-mode.md`. Wave 3 to Wave N-1 do the per-domain dispatch, and Wave N does the integration. This file covers the check of each cross-domain handoff. It also covers the file-based communication model that those waves use.

Strategic mode is **wave-based and parallel-within-wave**. It is not a sequential re-invocation for each domain. An independent domain dispatches in parallel through the Agent tool. A dependent domain dispatches in sequence through `Skill(act, "--brief ...")`. The `dependency_type` field in `strategic_brief.yaml` drives the dispatch grouping. For the topological-sort logic, see `@reference/strategic-mode.md` § Wave 3 .. Wave N-1.

## Per-Domain Session Subdirectories

Before the per-domain dispatch starts, the strategic-mode lead creates a session subdirectory for each assigned domain. Each domain controller then has a place to write. Each `Skill(act)` fork also has a place to write:

```bash
for domain in {domain_keys}:
  mkdir -p "${SESSION_DIR}/${domain}/workflow"   # v12.6.0: do NOT create workflow/events/
  mkdir -p "${SESSION_DIR}/${domain}/outputs"
  # The brief lives once at the session root; domains read it in place.
  # (No per-domain copy needed — Agent/Skill prompts point at ${SESSION_DIR}/strategic_brief.yaml.)
```

## Dispatch Visibility for Skill-Tool Forks

The **Agent tool** dispatches each independent domain. A `SubagentStart` hook sees those dispatches automatically. The **Skill tool** dispatches each dependent domain with `Skill(act, ...)`. Such a dispatch is a fork, and it is not a Task subagent. A `SubagentStart` hook therefore does not see it.

Before each `Skill(act)` dispatch, write a manual `agent_tree.yaml` entry. The fork then appears in the agent hierarchy:

```yaml
# Append to ${SESSION_DIR}/workflow/agent_tree.yaml before each Skill(act) dispatch:
- id: "skill-fork-{domain_key}-{ISO_TIMESTAMP_COMPACT}"
  type: "skill-fork"
  cagents_type: "cagents:act"
  short_role: "Domain dispatch ({domain_key})"
  parent: "team-strategic-lead"
  depth: 1
  spawned_at: "{ISO_TIMESTAMP}"
  stopped_at: null
  domain_session: "{SESSION_ID}/{domain_key}"
  role_description: "Dependent-domain /act dispatch for {domain_key}"
  session: "{SESSION_ID}"
```

Before each fork, set `CAGENTS_ACTIVE_SESSION` to the root of the team session. The hooks of the fork then resolve to the strategic session. After the fork returns, update `stopped_at` on the entry. After each dispatch returns, call `TaskList`. Mark the dispatch task of that domain `completed` at once. A task ID is most reliable directly after a Skill fork returns. The reason is that a later tool call can shift the namespace.

## Cross-Domain Handoffs

The dispatch order in `@reference/strategic-mode.md` gives you one guarantee. A domain runs only after every domain in its `dependent_on` list completes. After each domain finishes, do a check of the handoff. Do that check before the dependent domain dispatches:

1. Read `{domain_key}/workflow/coordination_log.yaml` of the completed domain. It gives you the output locations.
2. Make sure that every `cross_domain_dependencies` edge with the `blocks` mark is satisfied. The upstream artifact must exist at the cited path.
3. If a `blocks` dependency is not satisfied, change the scope of the dependent domain. As an alternative, escalate as in `@reference/strategic-escalation.md`. Do NOT dispatch the dependent domain against a missing input.
4. Record the handoff status in `strategic_brief.yaml`, under `domain_status.{domain_key}`. Record `completed_wis`, `outputs`, and each `handoff_blocked` flag.

The cross-domain integration happens once, at Wave N. It merges the overlapping outputs, and it makes sure that every contract is fulfilled. See `@reference/strategic-mode.md` § Wave N — Integration. The job of this file is the per-handoff check that gates each dispatch wave. The final merge is the job of Wave N.

## Communication Model

- **Lead ↔ C-suite**: the communication is file-based. A C-suite agent writes `domain_analyses/*.yaml` and `objections/*.yaml`. The lead reads those files, and the lead decides. There is no direct messaging.
- **C-suite peer reads**: a C-suite agent READS the domain analysis of a peer. It does so through a file-based inline pass of `domain_analyses/*.yaml`. A Wave 0b agent reads the Wave 0a outputs during its analysis. ALL agents read ALL peer analyses during the Wave 1 objection phase. These are reads only. There is never a direct message between two peers.
- **Lead ↔ domain dispatch**: an independent domain goes through the Agent tool, in parallel. A dependent domain goes through `Skill(act, "--brief ...")`, in sequence. The status flows back through `domain_status.{domain_key}` in `strategic_brief.yaml`.
- **Cross-domain**: the domains share one session directory. The `cross_domain_dependencies` field in `strategic_brief.yaml` expresses each dependency.
- **Escalation**: a domain writes its escalation into `domain_status.{domain_key}.escalations`. The lead reads that escalation. The lead resolves it at the strategic level, or the lead escalates it to the user as a HITL gate. See `@reference/strategic-escalation.md`.

## See Also

- `@reference/strategic-mode.md`: the canonical wave-by-wave flow. It is the authority for the dispatch order and for the integration.
- `@reference/strategic-brief-format.md`: the schema of `strategic_brief.yaml`. It includes `dependency_type`, `dependent_on`, and `cross_domain_dependencies`.
- `@reference/strategic-escalation.md`: the escalation chain and the resolution patterns.
- `@reference/csuite-deliberation.md`: the C-suite analysis in Wave 0, and the objection deliberation in Wave 1.

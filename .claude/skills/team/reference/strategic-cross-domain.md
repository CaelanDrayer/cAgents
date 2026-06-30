# Cross-Domain Dispatch & Handoffs

Supporting detail for the per-domain dispatch and cross-domain handoff mechanics of `/team` strategic mode. The canonical wave-by-wave flow lives in `@reference/strategic-mode.md` (Wave 3..N-1 per-domain dispatch, Wave N integration); this file covers the cross-domain handoff verification and the file-based communication model that those waves rely on.

Strategic mode is **wave-based and parallel-within-wave**, not sequential per-domain re-invocation. Independent domains dispatch in parallel via the Agent tool; dependent domains dispatch sequentially via `Skill(run, "--brief ...")`. Dispatch grouping is driven by the `dependency_type` field in `strategic_brief.yaml` — see `@reference/strategic-mode.md` § Wave 3 .. Wave N-1 for the topological-sort logic.

## Per-Domain Session Subdirectories

Before per-domain dispatch begins, the strategic-mode lead pre-creates a session subdirectory per assigned domain so each domain controller (and any `Skill(run)` fork) has somewhere to write:

```bash
for domain in {domain_keys}:
  mkdir -p "${SESSION_DIR}/${domain}/workflow"   # v12.6.0: do NOT create workflow/events/
  mkdir -p "${SESSION_DIR}/${domain}/outputs"
  # The brief lives once at the session root; domains read it in place.
  # (No per-domain copy needed — Agent/Skill prompts point at ${SESSION_DIR}/strategic_brief.yaml.)
```

## Dispatch Visibility for Skill-Tool Forks

Independent domains dispatched via the **Agent tool** are visible to `SubagentStart` hooks automatically. Dependent domains dispatched via the **Skill tool** (`Skill(run, ...)`) are forks, not Task subagents, so they are invisible to those hooks. Before each `Skill(run)` dispatch, write a manual `agent_tree.yaml` entry so the fork appears in the agent hierarchy:

```yaml
# Append to ${SESSION_DIR}/workflow/agent_tree.yaml before each Skill(run) dispatch:
- id: "skill-fork-{domain_key}-{ISO_TIMESTAMP_COMPACT}"
  type: "skill-fork"
  cagents_type: "cagents:run"
  short_role: "Domain dispatch ({domain_key})"
  parent: "team-strategic-lead"
  depth: 1
  spawned_at: "{ISO_TIMESTAMP}"
  stopped_at: null
  domain_session: "{SESSION_ID}/{domain_key}"
  role_description: "Dependent-domain /run dispatch for {domain_key}"
  session: "{SESSION_ID}"
```

Set `CAGENTS_ACTIVE_SESSION` to the team session root before each fork so the fork's hooks resolve to the strategic session, and update `stopped_at` on the entry after the fork returns. After each dispatch returns, call `TaskList` and mark the domain's dispatch task `completed` immediately — task IDs are most reliable right after a Skill fork returns, before later tool calls shift the namespace.

## Cross-Domain Handoffs

The dispatch order from `@reference/strategic-mode.md` guarantees a domain runs only after the domains it `dependent_on` have completed. After each domain finishes, verify the handoff before the dependent domain dispatches:

1. Read the completed domain's `{domain_key}/workflow/coordination_log.yaml` for output locations.
2. Confirm every `cross_domain_dependencies` edge marked `blocks` is satisfied (the upstream artifact exists at the cited path).
3. If a `blocks` dependency is not satisfied, adjust the dependent domain's scope or escalate per `@reference/strategic-escalation.md` — do NOT dispatch the dependent domain against a missing input.
4. Record handoff status in `strategic_brief.yaml` under `domain_status.{domain_key}` (`completed_wis`, `outputs`, and any `handoff_blocked` flag).

Cross-domain integration (merging overlapping outputs, verifying all contracts fulfilled) happens once at Wave N — see `@reference/strategic-mode.md` § Wave N — Integration. This file's job is the per-handoff check that gates each dispatch wave; the final merge is Wave N's job.

## Communication Model

- **Lead ↔ C-suite**: File-based. C-suite agents write `domain_analyses/*.yaml` and `objections/*.yaml`; the lead reads them and decides. No direct messaging.
- **C-suite peer reads**: C-suite agents READ peer domain analyses via file-based inline passes (`domain_analyses/*.yaml`). Wave 0b agents read Wave 0a outputs during analysis; ALL agents read ALL peer analyses during the Wave 1 objection phase. Reads only — never direct peer-to-peer messaging.
- **Lead ↔ domain dispatch**: Independent domains via Agent tool (parallel); dependent domains via `Skill(run, "--brief ...")` (sequential). Status flows back through `domain_status.{domain_key}` in `strategic_brief.yaml`.
- **Cross-domain**: Shared session directory. Dependencies expressed via `strategic_brief.yaml` `cross_domain_dependencies`.
- **Escalation**: A domain writes its escalation into `domain_status.{domain_key}.escalations`; the lead reads it, resolves at the strategic level, or escalates to the user as a HITL gate per `@reference/strategic-escalation.md`.

## See Also

- `@reference/strategic-mode.md` — canonical wave-by-wave flow (the authority for dispatch ordering and integration)
- `@reference/strategic-brief-format.md` — `strategic_brief.yaml` schema, including `dependency_type` / `dependent_on` / `cross_domain_dependencies`
- `@reference/strategic-escalation.md` — escalation chain and resolution patterns
- `@reference/csuite-deliberation.md` — Wave 0/1 C-suite analysis + objection deliberation

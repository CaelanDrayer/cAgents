# Cross-Domain Integration

Sequential `/team` execution per domain, cross-domain handoffs, and CEO integration of all domain outputs.

## Step 7: Sequential Domain Execution (BRIEFED -> EXECUTED)

For each domain in `domain_assignments`, invoke `/team` via Skill **sequentially**. Each Skill invocation is a fork that creates a fresh context, allowing /team to spawn teammates who, as controller agents, spawn execution agents directly via Agent tool.

### 7a. Pre-create ALL Domain Session Subdirectories

```bash
for domain in {domain_keys}:
  mkdir -p "${SESSION_DIR}/${domain}/workflow"   # v12.6.0: do NOT create workflow/events/
  mkdir -p "${SESSION_DIR}/${domain}/outputs"
  # Copy strategic_brief.yaml so /team can read it
  cp "${SESSION_DIR}/strategic_brief.yaml" "${SESSION_DIR}/${domain}/strategic_brief.yaml"
```

### 7b. Execute Domains Sequentially, Ordered by Priority and Dependencies

For each domain (in priority order from strategic_brief.yaml):

**Before each Skill invocation — write a manual agent_tree entry (GAP-2 fix):**

The Skill tool fork is invisible to SubagentStart hooks (it is a Skill fork, not a Task subagent). Before invoking `/team` for each domain, write a manual entry to the org session's `workflow/agent_tree.yaml` so the /team invocation is visible in the agent hierarchy:

```yaml
# Append to ${SESSION_DIR}/workflow/agent_tree.yaml before each Skill(team) call:
- id: "skill-fork-{domain_key}-{ISO_TIMESTAMP_COMPACT}"
  type: "skill-fork"
  cagents_type: "cagents:team"
  short_role: "Team Execution ({domain_key})"
  parent: "pipeline"
  depth: 1
  spawned_at: "{ISO_TIMESTAMP}"
  stopped_at: null
  team_session_id: "{SESSION_ID}/{domain_key}"
  role_description: "Sequential /team execution for {domain_key} domain"
  session: "{SESSION_ID}"
```

Use `js-yaml` (if available) or append the YAML block directly. After writing the entry, set `CAGENTS_ACTIVE_SESSION` to the team session path so the /team fork's hooks route correctly:

```bash
export CAGENTS_ACTIVE_SESSION="{SESSION_ID}/{domain_key}"
```

Then invoke /team:

```
Skill({
  skill: "team",
  args: "Execute {domain_key} scope from strategic brief: {scope_summary} --session {SESSION_DIR}/{domain_key}"
})
```

**After each Skill returns — update the agent_tree entry:**
```yaml
# Update stopped_at for the skill-fork entry written above
stopped_at: "{ISO_TIMESTAMP}"
```
Also restore `CAGENTS_ACTIVE_SESSION` to the org session ID so subsequent hooks route back to the org session:
```bash
export CAGENTS_ACTIVE_SESSION="{ORG_SESSION_ID}"
```

After each /team returns (continued):
- **Immediately call `TaskList`** to verify that the org-level task for this domain execution is still accessible. If the task for this domain (e.g., "[org > team] Executing {domain} domain") is still listed as `in_progress`, mark it `completed` now via `TaskUpdate`. Do not wait until Step 9c — task IDs from before the Skill fork are most reliable immediately after the fork returns, before further tool calls shift the namespace.
- Read `{SESSION_DIR}/{domain_key}/outputs/` to check results
- Update domain_status in strategic_brief.yaml (progress, completed_wis)
- Check for cross-domain outputs that the next domain may need
- Handle any escalations before proceeding to the next domain

**Execution order strategy**: Process domains that other domains depend on first (from cross_domain_dependencies in strategic_brief.yaml). If no dependencies, process by priority (high -> medium -> low).

### 7c. Handle Escalations Between Domains

If a domain reports an escalation:
1. CEO reads the escalation context
2. Attempts resolution (adjust brief, re-prioritize, add mitigation)
3. If CEO cannot resolve: escalate to user with context + recommended options
4. User decision recorded in strategic_brief.yaml as `directive`

### 7d. Cross-Domain Handoffs

After each domain completes, check if its outputs are needed by subsequent domains:
- Read the completed domain's `coordination_log.yaml` for output locations
- Verify cross_domain_dependencies marked as `blocks` are satisfied
- If a dependency is not satisfied, adjust the next domain's scope or escalate

Update status to EXECUTED when all domains complete. (v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed — the `status.yaml` `pipeline_state` update plus each domain's `{domain_key}/outputs/*` are the canonical state-transition signal.)

## Step 8: Integration (EXECUTED -> INTEGRATED)

CEO reads all domain outputs and produces an integrated deliverable.

### 8a. Read All Outputs
- Check `{SESSION_DIR}/{domain}/outputs/` for each domain
- Read coordination_log.yaml from each domain's workflow/

### 8b. Resolve Cross-Domain Issues
- Check cross_domain_dependencies from brief are satisfied
- Merge overlapping outputs (e.g., if both engineering and creative touched the same files)
- Verify cross-domain handoffs completed

### 8c. Write integration_report.yaml

```yaml
session_id: {SESSION_ID}
domains_executed: [{domain_keys}]
cross_domain_resolutions:
  - dependency: "{from} -> {to}"
    status: resolved|partial|unresolved
    notes: "{details}"
integrated_outputs:
  - "{output_path_1}"
  - "{output_path_2}"
remaining_issues:
  - "{issue if any}"
```

Update status to INTEGRATED. (v12.6.0: `workflow/events/EVT-{N}.yaml` emission removed — the `status.yaml` `pipeline_state` update plus the `integration_report.yaml` output are the canonical state-transition signal.)

## Communication Model

- **CEO <-> C-suite**: File-based (domain_analysis, objections). CEO decides all.
- **C-suite peer reads**: C-suite agents READ peer domain analyses via file-based inline passes (domain_analyses/*.yaml). Wave 2 agents read Wave 1 outputs during analysis; ALL agents read ALL peer analyses during objection phase. No direct messaging — reads only.
- **C-suite <-> /team**: Sequential Skill invocation with session dir. Status updates via domain_status.
- **Cross-domain**: Shared session directory. Dependencies via strategic_brief cross_domain_dependencies.
- **Escalation**: domain_status.escalations -> CEO reads -> resolves or escalates to user.
- **No direct peer messaging**: C-suite members never message each other directly. Cross-pollination happens via file-based reads of peer analyses, not via messaging.

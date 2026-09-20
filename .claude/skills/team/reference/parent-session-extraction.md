# Parent Session Extraction & Strategic-Mode Integration

This file tells you how /team works with the strategic brief of strategic mode. A pre-v12.2.0 `/org` brief has the same shape. /team extracts the `parent_session_id` from the path. /team then writes `child_controllers.yaml` for the lineage of the audit trail.

> **v12.2.0 note**: Before v12.2.0, `/org` used the `--session` flag. That flag started one `/team` run for each domain. v12.2.0 absorbed `/org` into the strategic mode of `/team`. Strategic mode now creates nested per-domain waves inside one `/team` session. It does not launch a child `/team` session.
>
> The extraction logic below stays for back-compat. It supports a pre-v12.2.0 `org_*` session. It also supports an external caller that creates the session path first.

## Parent Session Extraction

Sometimes /team starts with the `--session` flag. A pre-v12.2.0 `/org` session does this. An external integration that creates the session directory first also does this. In that case, extract the parent session ID from the path:

- The `--session` flag gives a path in this form: `cagents-memory/sessions/{PARENT_SESSION_ID}/{domain_key}`
- Pattern: split the path at each `/`. The component directly after `sessions/` is the `parent_session_id`.
- Example: `--session cagents-memory/sessions/org_launch-product_260317_001/engineering`
  → `parent_session_id = "org_launch-product_260317_001"`
- If the `--session` flag is absent, set `parent_session_id: null`. If the path holds no `sessions/` segment, also set `parent_session_id: null`.

### Extraction Logic

```
session_flag = flags["session"]  # e.g., "cagents-memory/sessions/org_foo_260317_001/engineering"
if session_flag:
  parts = session_flag.split("/")
  sessions_index = parts.index("sessions") if "sessions" in parts else -1
  EXTRACTED_PARENT_SESSION_ID = parts[sessions_index + 1] if sessions_index >= 0 and sessions_index + 1 < len(parts) else null
else:
  EXTRACTED_PARENT_SESSION_ID = null
```

## Strategic Brief Awareness (v12.2.0 strategic mode, or pre-v12.2.0 /org integration)

Sometimes the session directory holds a `strategic_brief.yaml` file. The Wave 2 deliberation step of v12.2.0+ `/team` strategic mode writes that file. A pre-v12.2.0 `/org` CEO also writes that file. In that case, do these steps:

1. **Read the brief** at session initialization. This is Step 2a, and it comes after you create the session.
   ```
   Check for ${SESSION_DIR}/strategic_brief.yaml
   If exists: read and extract mission, success_criteria, domain_assignments
   ```

2. **Use the `domain_assignments` of the brief as pre-decomposed input.** Skip the re-derivation.
   - If the brief holds `domain_assignments.{domain_key}.work_required`, use those items as the work items. Do not run the decomposer from scratch.
   - Map each `work_required` entry to a TASK-N. Use the acceptance criteria of the brief.
   - The planner still runs. It assigns the wave numbers and the dependencies. It starts from the work items of the brief, and it does not derive them from scratch.
   - If `domain_assignments.{domain_key}.csuite` is set, read the controller that the C-suite agent recommends. Use that controller as an override hint. For example, the CTO can recommend tech-lead. Prefer tech-lead over the auto-detection.

3. **Pass the context of the brief to the enrichment agents.** Include the mission, the success criteria, and the summary of the C-suite domain analysis. Put them into the prompts of the orchestrator and of the planner.

4. **Validate the outputs against the `success_criteria` of the brief**:
   - After the final validation, do a check of the `success_criteria` array of the brief.
   - Each success criterion must map to one completed TASK or more. That TASK must carry evidence.
   - Put the results of the brief validation into the final report.

5. **Write the `domain_status` updates** during the execution:
   - After each wave completes, update the `domain_status` section of the brief:
   ```yaml
   domain_status:
     {domain_key}:
       progress: {percentage}
       status: in_progress|completed
       completed_wis: [TASK-xx, ...]
       blockers: []
   ```
   - Write the updates to `${SESSION_DIR}/strategic_brief.yaml`. The brief is the monitoring interface of the CEO.

6. **Do a check for the escalation directives.** The CEO adds a directive to the brief when it resolves an escalation. Read each directive, and change the execution to match.

7. **Report the completion.** Set `domain_status` to completed, and set the progress to 100 percent.

These steps let the strategic-mode lead of `/team` monitor the execution progress of each domain. A pre-v12.2.0 `/org` CEO does the same. The lead also handles each cross-domain escalation as it happens.

## Session Hierarchy

You must know the session hierarchy. It gives you correct lineage tracking in the audit trails.

### Session Types and Nesting

/team creates a `team_*` session, for example `team_implement-oauth2_260317_001`. It does NOT create an `act_*` session. Sometimes /team starts with the `--session` flag. A pre-v12.2.0 `/org` session does this, and so does an external integration. In that case, the `parent_session_id` of the team session gets the parent session ID from the path.

**Hierarchy depth (max 2 levels)**:
```
team_* session (level 0; v12.2.0+ strategic-mode entry point)
  per-domain waves (level 1; nested inside the same team_* session)

— or, pre-v12.2.0 historical form (legacy sessions still on disk):
org_* session (level 0)     <- /org created this; no new sessions of this type after v12.2.0
  team_* session (level 1)  <- /team creates this, parent_session_id = org_*
```

There is no `team_* -> team_* -> act_*` chain. A /team subagent spawns its execution agents directly through the Agent tool. It does not invoke /act as a Skill. This is a design choice for cost and for clarity, and it is not a harness limit. CC 2.1.172 and later support subagent nesting to 5 levels deep. A nested /act is possible, but it duplicates the Wave 0 enrichment and it wastes tokens.

Therefore, the controller work is tracked at the level of the `team_*` session. It is not tracked in a separate child session. Strategic mode extends this model from v12.2.0. It runs the per-domain dispatch as more waves *inside* the same `team_*` session. It does not launch one child `team_*` session for each domain. A pre-v12.2.0 chain from `/org` to `/team` worked in that older way.

## Controller Tracking

A controller that /team spawns as a subagent does NOT create its own session. The session level tracks the work of that controller instead. These three files do the tracking:

1. **`workflow/agent_tree.yaml`**: each spawned controller gets an entry. That entry holds `spawned_at`, `stopped_at`, `completion_summary`, and `duration_seconds`. This file is the authoritative audit trail of the agents.
2. **`workflow/coordination_log.yaml`**: each controller subagent writes this file. It writes the file after it completes the work items of its wave. The file holds `objectives`, `questions_asked`, `synthesized_solution`, and `implementation_tasks`.
3. **`workflow/child_controllers.yaml`**: the /team lead writes this file after each wave. See Step 5d-pre. The file maps each work item to the controller that handled it.

## child_controllers.yaml Format

After each wave completes, the lead adds the completed controllers to `workflow/child_controllers.yaml`:

```yaml
controllers:
  - wave: 1
    name: "w1-task-1-tech-lead"
    work_item: "TASK-1"
    agent_type: "cagents:tech-lead"
    status: completed
  - wave: 1
    name: "w1-task-2-tech-lead"
    work_item: "TASK-2"
    agent_type: "cagents:tech-lead"
    status: completed
  - wave: 2
    name: "w2-task-3-tech-lead"
    work_item: "TASK-3"
    agent_type: "cagents:tech-lead"
    status: completed
```

## Parent Session ID in instruction.yaml

Sometimes /team starts with `--session cagents-memory/sessions/<parent_session_id>/<subdir>`. A pre-v12.2.0 `/org` run sets that flag, for example `--session cagents-memory/sessions/org_foo_260317_001/engineering`. An external integration that creates the session directory first also sets it. In that case, the `team_*` session stores this value:

```yaml
parent_session_id: "org_foo_260317_001"
```

The value comes from the `--session` path. Sometimes a user invokes /team directly, with no `--session` flag. That is the default in v12.2.0+ strategic mode. In that case, `parent_session_id` is `null`.

# Parent Session Extraction & Strategic-Mode Integration

How /team integrates with strategic-mode's strategic brief (or a pre-v12.2.0 `/org` brief), extracts parent_session_id, and writes child_controllers.yaml for audit-trail lineage.

> **v12.2.0 note**: Pre-v12.2.0, the `--session` flag was used by `/org` to invoke per-domain `/team` runs. v12.2.0 absorbed `/org` into `/team` strategic mode; strategic-mode now creates nested per-domain waves inside a single `/team` session rather than launching child `/team` sessions. The `--session` extraction logic below is preserved for back-compat with pre-v12.2.0 `org_*` sessions and for any external caller that still pre-creates a session path.

## Parent Session Extraction

When /team is invoked with the `--session` flag (e.g., by a pre-v12.2.0 `/org` session, or by an external integration that pre-creates a session directory), extract the parent session ID from the path:

- The `--session` flag provides a path like: `cagents-memory/sessions/{PARENT_SESSION_ID}/{domain_key}`
- Pattern: split path by `/`, find the component immediately after `sessions/` — that is the `parent_session_id`
- Example: `--session cagents-memory/sessions/org_launch-product_260317_001/engineering`
  → `parent_session_id = "org_launch-product_260317_001"`
- If no `--session` flag is provided, or the path has no `sessions/` segment, set `parent_session_id: null`

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

When invoked with a `strategic_brief.yaml` in the session directory (written either by v12.2.0+ `/team` strategic mode's Wave 2 deliberation step, or by a pre-v12.2.0 `/org` CEO):

1. **Read the brief** at session initialization (Step 2a, after creating session):
   ```
   Check for ${SESSION_DIR}/strategic_brief.yaml
   If exists: read and extract mission, success_criteria, domain_assignments
   ```

2. **Use brief's domain_assignments as pre-decomposed input** (skip re-derivation):
   - If the brief contains `domain_assignments.{domain_key}.work_required`, use those items directly as work items instead of running the decomposer from scratch
   - Map each `work_required` entry to a TASK-N with the brief's acceptance criteria
   - The planner still runs to assign wave numbers and dependencies, but starts from brief work items rather than deriving from scratch
   - If `domain_assignments.{domain_key}.csuite` is specified, use that C-suite agent's recommended controller as a controller override hint (e.g., if CTO recommended tech-lead, prefer that over auto-detection)

3. **Pass brief context to enrichment agents** — include mission, success criteria, and the C-suite domain analysis summary in orchestrator and planner prompts for richer context.

4. **Validate outputs against brief success_criteria**:
   - After final validation, cross-check the brief's `success_criteria` array
   - Each success criterion must map to at least one completed TASK with evidence
   - Include brief validation results in the final report

5. **Write domain_status updates** during execution:
   - After each wave completes, update the brief's `domain_status` section:
   ```yaml
   domain_status:
     {domain_key}:
       progress: {percentage}
       status: in_progress|completed
       completed_wis: [TASK-xx, ...]
       blockers: []
   ```
   - Write updates to `${SESSION_DIR}/strategic_brief.yaml` (the brief is the CEO's monitoring interface)

6. **Check for escalation directives** — if the CEO has added directives to the brief (from resolving escalations), read them and adjust execution accordingly.

7. **Report completion** by setting domain_status to completed with 100% progress.

This allows the `/team` strategic-mode lead (or pre-v12.2.0 `/org` CEO) to monitor domain execution progress and handle cross-domain escalations in real-time.

## Session Hierarchy

Understanding the session hierarchy is essential for correct lineage tracking in audit trails.

### Session Types and Nesting

/team creates `team_*` sessions (e.g., `team_implement-oauth2_260317_001`). It does NOT create `run_*` sessions. When /team is invoked via the `--session` flag (by a pre-v12.2.0 `/org` session, or by an external integration), the team session's `parent_session_id` is set to the parent session ID extracted from the path.

**Hierarchy depth (max 2 levels)**:
```
team_* session (level 0; v12.2.0+ strategic-mode entry point)
  per-domain waves (level 1; nested inside the same team_* session)

— or, pre-v12.2.0 historical form (legacy sessions still on disk):
org_* session (level 0)     <- /org created this; no new sessions of this type after v12.2.0
  team_* session (level 1)  <- /team creates this, parent_session_id = org_*
```

There is no `team_* -> team_* -> run_*` chain. /team teammates spawn execution agents directly via Agent tool rather than invoking /run as a Skill — by design for cost and clarity, not because of a harness limit (CC ≥ 2.1.172 supports subagent nesting up to 5 levels deep; a nested /run is technically possible but duplicates Wave 0 enrichment and wastes tokens). As a result, controller work is tracked at the `team_*` session level, not in separate child sessions. Strategic mode (v12.2.0+) extends this by running per-domain dispatch as additional waves *inside* the same team_* session, instead of launching separate child team_* sessions per domain (which is how pre-v12.2.0 `/org` -> `/team` chains worked).

## Controller Tracking

Controllers spawned as /team teammates do NOT create their own sessions. Instead, their work is tracked at the session level via:

1. **`workflow/agent_tree.yaml`** — Each spawned controller gets an entry with `spawned_at`, `stopped_at`, `completion_summary`, and `duration_seconds`. This is the authoritative agent audit trail.
2. **`workflow/coordination_log.yaml`** — Written by each controller teammate after completing its wave work items. Contains objectives, questions_asked, synthesized_solution, and implementation_tasks.
3. **`workflow/child_controllers.yaml`** — Written by /team lead after each wave (see Step 5d-pre). Maps work items to the controllers that handled them.

## child_controllers.yaml Format

After each wave completes, the lead appends completed controllers to `workflow/child_controllers.yaml`:

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

When invoked with `--session cagents-memory/sessions/<parent_session_id>/<subdir>` (e.g., pre-v12.2.0 `/org` setting `--session cagents-memory/sessions/org_foo_260317_001/engineering`, or an external integration pre-creating a session directory), the `team_*` session stores:

```yaml
parent_session_id: "org_foo_260317_001"
```

This is extracted from the `--session` path. If /team is invoked directly by a user (no `--session` flag) — the default in v12.2.0+ strategic mode — `parent_session_id` is `null`.

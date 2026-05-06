# Escalation Handling and Error Recovery

How CEO handles domain escalations, when to escalate to the user (HITL), error recovery patterns, and routing shortcuts.

## CEO Escalation Flow

When a domain reports an escalation during Step 7 (sequential domain execution):

1. CEO reads the escalation context from `domain_status.escalations[]` in `strategic_brief.yaml`
2. CEO attempts resolution at the strategic level:
   - Adjust brief to address the blocker
   - Re-prioritize work items
   - Add risk mitigation
   - Reassign work between domains
3. If CEO cannot resolve: escalate to user (Chairperson) with:
   - Context of what happened
   - What was tried
   - Recommended options for the user to choose from
4. User decision is recorded in `strategic_brief.yaml` as a `directive` field, then execution continues

## Routing Shortcuts

### Single-Domain Simple (-> /run)

For instructions touching only one domain with simple scope:

1. CEO still generates `strategic_brief.yaml` (adds mission, success criteria)
2. Invoke: `Skill({ skill: "run", args: "{instruction} --brief {brief_path}" })`
3. /run reads brief for richer context
4. Skip states: ANALYZED, DELIBERATED (brief generated inline)

### Single-Domain Complex (-> /team)

For instructions touching one domain with complex scope:

1. CEO generates `strategic_brief.yaml`
2. Invoke: `Skill({ skill: "team", args: "{instruction} --session {session_dir}" })`
3. /team reads strategic_brief.yaml from session dir
4. Skip states: ANALYZED, DELIBERATED

### Multi-Domain (-> Full Hierarchy)

For instructions touching 2+ domains: execute the full 6-state pipeline (INIT -> ANALYZED -> DELIBERATED -> BRIEFED -> EXECUTED -> INTEGRATED -> COMPLETE).

## Error Handling

| Failure Mode | Recovery |
|--------------|----------|
| **C-suite agent fails** | Retry once. If still fails, CEO produces domain analysis inline. |
| **Deliberation deadlock** | After 2 rounds of unresolved blocking objections, escalate to user. |
| **/team execution fails** | CEO reads partial outputs, reports status, suggests `--resume`. |
| **Context exhaustion** | Pre-compact hook saves waypoint. Resume via `--resume {session_id}`. |

## Validation Failure Escalations

See `strategic-brief-format.md` for the per-checkpoint validation failure handling matrix. Summary:

| Checkpoint | Failure Action |
|-----------|---------------|
| Pre-deliberation | Re-spawn missing/empty C-suite agents (1 retry); proceed with gaps if persistent |
| Post-deliberation | Re-run objection phase (1 retry); escalate to user if contradictions persist |
| Strategic brief | Fix missing fields inline; break dependency cycles by reordering |
| Post-execution | Report partial results; map evidence; escalate unresolved escalations |
| Integration | Resolve conflicts by priority; document gaps in integration_report.yaml |

## Configuration Pointers

- Pipeline config: `cagents-memory/_system/config/org_pipeline_config.yaml` (optional — generated at runtime; /org operates with hardcoded defaults if absent)
- C-suite mapping: See `csuite-mapping.md`
- Strategic brief schema: See `strategic-brief-format.md`
- Escalation protocol details: See `escalation-protocol.md` (legacy reference, still valid)

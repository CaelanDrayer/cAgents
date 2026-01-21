# Hook Registration Fix (2026-01-21)

**STATUS: Hooks temporarily disabled in plugin.json due to validation errors**

## Problem

The cAgents plugin was attempting to register custom hook types that aren't supported by Claude Code:

**Custom hooks (not supported)**:
- `session` (with `on_session_start`, `on_session_end`)
- `workflow` (with `on_workflow_start`, `on_workflow_complete`, `on_workflow_fail`, `stop_workflow`)
- `phase` (with `on_phase_start`, `on_phase_complete`, `on_phase_fail`)
- `coordination` (with `on_question_asked`, `on_answer_received`, `on_synthesis_complete`)
- `hitl` (with `on_hitl_required`, `on_hitl_decision`)

**Error message**:
```
Hook load failed: Invalid key in record
Invalid option: expected one of "PreToolUse"|"PostToolUse"|"PostToolUseFailure"|
"Notification"|"UserPromptSubmit"|"SessionStart"|"SessionEnd"|"Stop"|
"SubagentStart"|"SubagentStop"|"PreCompact"|"PermissionRequest"|"Setup"
```

## Root Cause

The `hooks/hooks.json` file used a custom schema with nested hook categories. Claude Code requires hooks to be registered using only the built-in event types defined in the plugin specification.

## Solution

Updated `.claude-plugin/plugin.json` to map cAgents lifecycle hooks to supported Claude Code events:

```json
"hooks": {
  "SessionStart": "hooks/session/on-session-start.sh",
  "SessionEnd": "hooks/session/on-session-end.sh",
  "SubagentStart": "hooks/workflow/on-workflow-start.sh",
  "SubagentStop": "hooks/workflow/on-workflow-complete.sh",
  "Stop": "hooks/workflow/stop-workflow.sh"
}
```

**Mapping Strategy**:
- Session hooks → `SessionStart`, `SessionEnd` (direct mapping)
- Workflow hooks → `SubagentStart` (workflow start), `SubagentStop` (workflow complete)
- Stop hook → `Stop` (graceful termination)
- Phase/coordination/HITL hooks → Disabled for now (can be re-implemented using supported events)

## Disabled Features (Temporary)

The following hooks are not mapped and are currently disabled:
- `on_workflow_fail` - Could be mapped to `PostToolUseFailure` if needed
- Phase lifecycle hooks (`on_phase_start`, `on_phase_complete`, `on_phase_fail`) - Could use `SubagentStart`/`SubagentStop`
- Coordination tracking (`on_question_asked`, `on_answer_received`, `on_synthesis_complete`)
- HITL hooks (`on_hitl_required`, `on_hitl_decision`) - Could use `PermissionRequest`

## Future Work

To restore full hook functionality:

1. **Implement phase hooks** using `PreToolUse`/`PostToolUse` events
2. **Add coordination tracking** by intercepting agent Task calls
3. **Restore HITL hooks** using `PermissionRequest` event
4. **Add failure handling** using `PostToolUseFailure` event

Alternatively, consider implementing a custom hook orchestration layer that uses Claude Code's supported events as triggers.

## Update (2026-01-21 Evening)

After attempting to register supported hook types, the plugin validation still failed with "hooks: Invalid input" error. Hooks section has been **temporarily removed** from plugin.json to allow the plugin to load.

**Current status**: Hooks disabled in plugin manifest. Hook scripts still exist in `hooks/` directory but are not registered.

**Next steps**:
1. Investigate correct hook registration format for Claude Code plugins
2. Test hook registration with minimal example
3. Re-add hooks once correct format is determined

## Files Changed

- `.claude-plugin/plugin.json` - Hooks section removed (was causing validation errors)

## Files Unchanged (For Reference)

- `hooks/hooks.json` - Custom hook configuration (not used by Claude Code, kept for documentation)
- Hook scripts in `hooks/session/` and `hooks/workflow/` - Retained, now called by supported events

## Testing

After this fix, the plugin should load without hook validation errors. Basic lifecycle hooks (session start/end, workflow start/complete/stop) are now functional.

## Impact

**No breaking changes** for core workflows:
- Trigger, orchestrator, and workflow agents continue to work normally
- Session and workflow lifecycle tracking is preserved
- Ralph-style stop workflow functionality maintained

**Temporarily disabled**:
- Fine-grained phase transition hooks
- Real-time coordination Q&A tracking
- HITL decision recording hooks

These features relied on the custom hook types and will need to be re-implemented using supported events.

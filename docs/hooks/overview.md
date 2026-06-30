# Hooks System Overview

This is a high-level summary. The canonical per-hook detail (matchers, inputs, outputs, side effects) lives in `.claude/rules/core/hooks.md` and `.claude/rules/core/resources/hook-catalog.md`.

## Architecture

CJS-only hooks built with the `createHook()` factory pattern. **31 `.cjs` files = 24 unique registered hooks across 18 event types + 5 in-process dispatched sub-validators + `hook-utils.cjs` (shared utilities) + `run-hook.cjs` (launcher).**

Two consolidating dispatchers run the sub-validators in-process (one node cold-start instead of one per sub-validator):

- **`write-edit-dispatch.cjs`** (PreToolUse[Write\|Edit]) — runs `secret-detection.cjs`, `controller-delegation-validator.cjs`, and `skill-size-monitor.cjs`. The two security/governance gates fail CLOSED.
- **`agent-dispatch.cjs`** (PreToolUse[Agent]) — runs `session-init-gate.cjs` (session-presence DENY gate, fail-CLOSED) and `model-routing-advisor.cjs` (advisory, fail-OPEN).

## Hook Registry (by event)

| Event | Hook(s) | Purpose |
|-------|---------|---------|
| SessionStart | session-catchup.cjs | Initialize state, detect incomplete sessions, inject context |
| SessionEnd | team-stop.cjs | Finalize metrics, update status, agent-tree cleanup |
| UserPromptSubmit | prompt-router.cjs | Delegation enforcement + natural-language routing |
| PreToolUse[Bash] | bash-validator.cjs | Block dangerous commands (two-tier: deny + HITL) |
| PreToolUse[Write\|Edit] | write-edit-dispatch.cjs | Dispatches secret-detection + controller-delegation-validator + skill-size-monitor |
| PreToolUse[Agent] | agent-dispatch.cjs | Dispatches session-init-gate + model-routing-advisor |
| ConfigChange | config-change-logger.cjs | Log config changes |
| PermissionRequest | permission-handler.cjs | Log permission requests for HITL audit |
| PostToolUse[Write\|Edit] | post-write-validator.cjs, validator-evidence-recheck.cjs | Validate JSON/YAML syntax, re-verify cited evidence |
| PostToolUseFailure | tool-failure-tracker.cjs | Track failures, detect patterns |
| Notification | notification.cjs | Log notifications |
| SubagentStart | subagent-tracker.cjs, team-start.cjs | Log spawns, initialize team monitoring |
| SubagentStop | subagent-stop-tracker.cjs | Log completion, capture summaries + duration |
| Stop | verify-completion.cjs, goal-evaluator-logger.cjs, secret-restore.cjs | Verify completion, capture /goal reasons, restore sanitized secrets |
| StopFailure | stop-failure-handler.cjs | Save recovery state |
| TeammateIdle | teammate-idle-handler.cjs | Find available work or stop teammate |
| TaskCompleted | team-task-complete.cjs | Update task status, unblock dependencies |
| InstructionsLoaded | instructions-loaded.cjs | Validate rules dir, inject active session context |
| PreCompact | pre-compact-save.cjs | Save critical state before compaction |
| PostCompact | post-compact-restore.cjs | Log workflow context to disk after compaction |

Six events (`WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `Elicitation`, `ElicitationResult`) have no cAgents hook and remain available for custom use.

## Invocation

All hooks are invoked via `run-hook.cjs` with a 3-tier plugin-root fallback:
```
CLAUDE_PLUGIN_ROOT -> CLAUDE_PROJECT_DIR -> pwd
```

## Testing

The hook suite runs under `npm test` (Vitest, `tests/hooks/` + `tests/config/`):
```bash
npm test                    # Run the full suite
npm run test:hooks          # Hooks only
npm run test:config         # Config only
```

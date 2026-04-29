# Hooks System Overview

## Architecture

CJS-only hooks with `createHook()` factory pattern. 18 .cjs files: 15 registered hooks + hook-utils.cjs (shared utilities) + run-hook.cjs (launcher) + eval-runner.cjs (CLI tool).

## Hook Registry

| Event | Hook | Purpose |
|-------|------|---------|
| SessionStart | session-catchup.cjs | Initialize state, detect incomplete sessions |
| SessionEnd | team-stop.cjs | Finalize metrics, update status |
| Stop | verify-completion.cjs | Verify completion before stopping |
| SubagentStart | subagent-tracker.cjs | Log spawns to agent_tree.yaml |
| SubagentStart | team-start.cjs | Initialize team monitoring |
| SubagentStop | subagent-stop-tracker.cjs | Log completion, capture summaries |
| PreToolUse[Bash] | bash-validator.cjs | Block dangerous commands |
| PreToolUse[Write\|Edit] | secret-detection.cjs | Block secrets in writes |
| PostToolUse[Write\|Edit] | post-write-validator.cjs | Validate JSON/YAML syntax |
| PostToolUseFailure | tool-failure-tracker.cjs | Track failures, suggest alternatives |
| TeammateIdle | teammate-idle-handler.cjs | Find available work |
| TaskCompleted | team-task-complete.cjs | Update task status |
| PermissionRequest | permission-handler.cjs | Auto-approve safe patterns |
| PreCompact | pre-compact-save.cjs | Save state before compaction |
| Notification | notification.cjs | Log notifications |

## Invocation

All hooks invoked via `run-hook.cjs` with 3-tier path fallback:
```
CLAUDE_PLUGIN_ROOT -> CLAUDE_PROJECT_DIR -> pwd
```

## Error Format

Hooks use structured error messages (What/Why/Fix):
```
[HookName]
WHAT: File write blocked
WHY: Path is in protected system directory
FIX: Move the file to cagents-memory/ or project directory
```

## Testing

265 tests in `tests/hooks/` and `tests/config/`:
```bash
npm test                    # Run all tests
npm run test:hooks          # Hooks only
npm run test:config         # Config only
```

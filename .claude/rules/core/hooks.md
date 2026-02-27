---
paths:
  - ".claude/hooks/**"
  - ".claude/settings*.json"
---

# cAgents Hook System

V9.22.0 CJS-only hook architecture with 15 hooks across 13 event types, `createHook()` factory pattern, agent audit trail with completion summaries, and resilient path resolution.

## Architecture

cAgents uses a unified CJS hook system configured in `.claude/settings.json`:

- **CJS hooks** (`.claude/hooks/`): 17 `.cjs` files -- 1 shared utility module (`hook-utils.cjs`) + 1 hook launcher (`run-hook.cjs`) + 14 registered hooks + 1 standalone CLI tool (`eval-runner.cjs`). All hooks use the `createHook()` factory from `hook-utils.cjs` which eliminates boilerplate (stdin reading, try-catch, JSON output).
- **Prompt hooks**: None currently active. The Stop prompt hook was removed in V9.6.2 due to unreliable LLM JSON responses causing recurring validation failures. The `verify-completion.cjs` command hook provides equivalent file-based verification.
- **Self-contained invocation via run-hook.cjs**: All hooks are called via `bash -c 'R="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"; node "$R/.claude/hooks/run-hook.cjs" <hook-name>'` -- a bash wrapper with a 3-tier fallback chain that resolves the plugin root, then launches `run-hook.cjs` which resolves the target hook path using `__dirname`. V9.17.1 switched from bare `node "${CLAUDE_PLUGIN_ROOT}"/.claude/hooks/run-hook.cjs` (which fails with MODULE_NOT_FOUND when `CLAUDE_PLUGIN_ROOT` is not expanded) to a `bash -c` wrapper with fallback chain: `CLAUDE_PLUGIN_ROOT` (official plugin env var) -> `CLAUDE_PROJECT_DIR` (user's project dir, works for local dev) -> `pwd` (last resort). Previous V9.13 approach used `${CLAUDE_PLUGIN_ROOT}` directly in the command string, but this fails when the env var is not set (e.g., in certain subagent contexts, SessionEnd events, or non-plugin installations).

### V9.5 Changes (from V9.4)

The V9.5 refactoring eliminates the dual shell+JS architecture that caused recurring bugs:

**Removed**:
- 9 shell hooks (`hooks/session/`, `hooks/workflow/`, `hooks/tools/`)
- 2 dispatch scripts (`scripts/hook-dispatch.sh`, `scripts/hook-dispatch-node.sh`)
- Shell library dependency for hooks (`scripts/lib/core.sh`, `hook-bootstrap.sh`, etc.)

**Added**:
- `createHook()` factory in `hook-utils.cjs` (eliminates ~25 lines of boilerplate per hook)
- `bash-validator.cjs` (new CJS hook replacing `pre-bash.sh`)
- `findTeamSession()` helper (extracted from 4 duplicated team hooks)

**Merged**:
- `on-session-start.sh` logic -> `session-catchup.cjs`
- `on-session-end.sh` logic -> `team-stop.cjs`
- `stop-workflow.sh` logic -> `verify-completion.cjs`
- `pre-write.sh` path protection -> `secret-detection.cjs`
- `pre-bash.sh` command validation -> `bash-validator.cjs`

**Root Causes Fixed**:
- ERR EXIT trap causing duplicate JSON output in shell hooks
- `set -euo pipefail` from `core.sh` propagating into hooks via dispatch
- PreToolUse deny using exit 2 instead of exit 0 + deny JSON
- fd redirection (`exec 3>&1; exec 1>&2`) fragility in shell hooks
- Double-JSON-output from dispatch layer on error paths

## Hook Types Overview

| Hook Type | Trigger | cAgents Hook | Purpose |
|-----------|---------|--------------|---------|
| `SessionStart` | Session begins | `session-catchup.cjs` | Initialize state, detect incomplete sessions, inject cAgents context |
| `SessionEnd` | Session ends | `team-stop.cjs` | Finalize metrics, update status |
| `PreToolUse` | Before tool execution | `bash-validator.cjs`, `secret-detection.cjs` | Validate, block dangerous operations |
| `PostToolUse` | After tool execution | `post-write-validator.cjs` | Validate JSON/YAML syntax, audit file changes |
| `PostToolUseFailure` | Tool execution fails | `tool-failure-tracker.cjs` | Track failures, detect patterns, suggest recovery |
| `Stop` | Claude stops responding | `verify-completion.cjs` | Verify completion criteria |
| `SubagentStart` | Subagent spawned | `subagent-tracker.cjs`, `team-start.cjs` | Log spawns, initialize team monitoring, inject self-registration context |
| `SubagentStop` | Subagent finishes | `subagent-stop-tracker.cjs` | Log completion, capture summaries + duration, update agent tree |
| `TeammateIdle` | Teammate goes idle | `teammate-idle-handler.cjs` | Find available work for idle members |
| `TaskCompleted` | Task finishes | `team-task-complete.cjs` | Update task list, unblock dependencies |
| `PermissionRequest` | Permission dialog | `permission-handler.cjs` | Auto-approve safe patterns, HITL gates |
| `Notification` | Status notification | `notification.cjs` | Log and track |
| `PreCompact` | Before context compaction | `pre-compact-save.cjs` | Save critical state + coordination state |

## createHook() Factory

All hooks use the `createHook(name, handler)` factory from `hook-utils.cjs`:

```javascript
const { createHook } = require('./hook-utils.cjs');

createHook('MyHook', async (input) => {
  // input = parsed JSON from stdin

  // Return null for no-op (outputs {"continue": true})
  if (!relevant) return null;

  // Return deny shorthand for PreToolUse blocks
  return { deny: true, reason: 'Blocked because ...' };

  // Return allow shorthand for PreToolUse approvals
  return { allow: true, reason: 'Safe operation', hookEvent: 'PreToolUse' };

  // Return system message
  return { continue: true, systemMessage: 'Info for the model...' };

  // Return block decision for Stop hooks
  return { decision: 'block', reason: 'Not complete yet' };
});
```

**Factory handles**:
- stdin reading with 3-second timeout
- JSON parsing with graceful fallback to `{}`
- Try-catch wrapping (errors produce `{"continue": true}`)
- Result transformation (`deny` shorthand -> full hookSpecificOutput)
- Single JSON output to stdout (no double-output possible)

## Active Hooks (V9.5)

### Session Lifecycle

#### SessionStart: session-catchup.cjs
- **Purpose**: Detect incomplete sessions on startup, offer resume options, inject cAgents behavioral context
- **Also**: Initializes session state (replaces on-session-start.sh); includes prompt guidance previously in a separate prompt hook (prompt hooks not supported for SessionStart)
- **Creates**: `Agent_Memory/_system/incomplete_sessions.json`
- **Output**: `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}`

#### SessionEnd: team-stop.cjs
- **Purpose**: Finalize team metrics and update session status
- **Also**: Session cleanup (replaces on-session-end.sh)
- **Updates**: `status.yaml`, `metrics/timing.yaml`

### Tool Validation

#### PreToolUse[Bash]: bash-validator.cjs
- **Matcher**: `Bash`
- **Purpose**: Block dangerous bash commands
- **Blocked** (deny): `rm -rf /`, `rm -rf ~`, fork bombs, `mkfs`, `dd if=/dev/zero`, `> /dev/sda`, `sudo`
- **Warned** (allow + message): destructive git commands (`--force`, `reset --hard`, `clean -fd`)

#### PreToolUse[Write|Edit]: secret-detection.cjs
- **Matcher**: `Write|Edit`
- **Purpose**: Block writes to protected paths and detect secrets
- **Three phases**: (1) Protected path check, (2) Sensitive file warning, (3) Secret scanning
- **Blocked**: System paths (`/etc/`, `/usr/`, `~/.ssh/`), files with critical/high secrets

### Workflow Events

#### Stop: verify-completion.cjs
- **Purpose**: Verify completion criteria before allowing stop
- **Also**: Stop-workflow cleanup (replaces stop-workflow.sh)
- **Creates**: `completion_summary.yaml`
- **Can block**: Returns `{decision: "block", reason: "..."}` for incomplete workflows

#### SubagentStart: subagent-tracker.cjs + team-start.cjs
- **subagent-tracker.cjs**: Logs agent spawns to `workflow/agent_tree.yaml` and global audit log (`_system/logs/agent_spawns.log`). Includes fallback session discovery for the race condition where `status.yaml` hasn't been written yet. Injects `additionalContext` asking cAgents agents to self-register their `cagents:{name}` type, since Claude Code's `agent_type` field reports "general-purpose" for plugin agents.
- **team-start.cjs**: Initializes team monitoring directories and metrics files

#### SubagentStop: subagent-stop-tracker.cjs
- **Purpose**: Track when subagents finish, capturing completion summaries and duration metrics
- **Also**: Appends stop events with summaries to the global audit log (`_system/logs/agent_spawns.log`)
- **Updates**: `workflow/agent_tree.yaml` (adds `stopped_at`, `completion_summary`, `duration_seconds` to agent entry)
- **Captures**: `last_assistant_message` from SubagentStop input (truncated to 300 chars for audit trail)

#### PostToolUse[Write|Edit]: post-write-validator.cjs
- **Matcher**: `Write|Edit`
- **Purpose**: Validate file syntax after successful Write/Edit operations
- **Validates**: JSON parsing, YAML tab detection, duplicate YAML top-level keys
- **Logs**: All file changes to `workflow/file_changes.log` with timestamps and validation status
- **Output**: Warning systemMessage if syntax issues found (does not block -- write already succeeded)

#### PostToolUseFailure: tool-failure-tracker.cjs
- **Purpose**: Track tool failures, detect patterns (3+ failures suggests alternatives)
- **Creates**: `workflow/tool_failures.yaml`

### Team Hooks

#### TeammateIdle: teammate-idle-handler.cjs
- **Purpose**: Suggest available work items from team task list

#### TaskCompleted: team-task-complete.cjs
- **Purpose**: Update task_list.yaml status, check dependency unblocking
- **Input fields**: `task_subject`, `task_description`, `teammate_name` (Claude Code API)

#### PermissionRequest: permission-handler.cjs
- **Purpose**: Auto-approve safe patterns (Read, Grep, Glob), HITL gates for tier 4
- **Auto-approved**: Read, Grep, Glob, TaskList, TaskGet; Write/Edit to Agent_Memory

### State Management

#### PreCompact: pre-compact-save.cjs
- **Purpose**: Save critical workflow state before context compaction
- **Creates**: Waypoint file in `sessions/{id}/waypoints/`
- **Includes**: Coordination state, team state, resume instructions

#### Notification: notification.cjs
- **Purpose**: Log notifications to daily files with 1MB rotation
- **Creates**: `Agent_Memory/_system/logs/notifications_{date}.log`

### CLI Tool (Not a registered hook)

#### eval-runner.cjs
- **Purpose**: Run quality evaluations on sessions (standalone CLI tool)
- **Usage**: `node eval-runner.cjs --session <session_id>`
- **Creates**: `sessions/{id}/evals/evaluation_report.yaml`

## Hook Input/Output

### Input (stdin)

Hooks receive JSON on stdin:

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file",
    "content": "..."
  },
  "session_id": "...",
  "cwd": "/project/path"
}
```

### Output (stdout)

Hooks output JSON to stdout:

```json
{
  "continue": true,
  "systemMessage": "Optional message to show user",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny",
    "permissionDecisionReason": "..."
  }
}
```

### Exit Codes

- `0`: Success -- JSON parsed from stdout. Use `permissionDecision: "deny"` in hookSpecificOutput to block PreToolUse operations.
- `2`: Blocking error -- Claude Code ignores stdout JSON and feeds stderr to the model. Use only for fatal errors, NOT for PreToolUse deny (use exit 0 + deny JSON instead).

## Prompt-Based Hooks

In addition to command hooks, Claude Code supports prompt-based hooks (`type: "prompt"`) that use an LLM to evaluate conditions and return yes/no decisions. Agent hooks (`type: "agent"`) spawn subagents with tool access for verification.

**Supported Events** (prompt and agent hooks):
- `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`
- `UserPromptSubmit`, `Stop`, `SubagentStop`, `TaskCompleted`

**NOT Supported** (command hooks only):
- `SessionStart`, `SessionEnd`, `SubagentStart`, `PreCompact`, `Notification`
- `TeammateIdle` (exit codes only, no prompt/agent/JSON)

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Check if all tasks are complete before stopping: $ARGUMENTS"
          }
        ]
      }
    ]
  }
}
```

**Note**: For SessionStart context injection, use a command hook that returns `hookSpecificOutput.additionalContext` instead of a prompt hook. See `session-catchup.cjs` for the cAgents implementation.

**Limitations**:
- Only supported on the events listed above
- Cannot modify tool input (use command hooks for that)
- LLM responds with `{"ok": true/false, "reason": "..."}` JSON

## Secret Detection

The secret detection hook (`secret-detection.cjs`) blocks these patterns:

### Critical (Blocked)
- GitHub tokens: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- AWS keys: `AKIA...`
- Private keys: `-----BEGIN ... PRIVATE KEY-----`
- Slack tokens: `xox[baprs]-...`
- Stripe live keys: `sk_live_...`, `rk_live_...`
- Database connection strings with credentials
- Anthropic API keys: `sk-ant-...`
- OpenAI API keys: `sk-proj-...` (newer format), `sk-<48-50 chars>` (legacy)
- NPM/PyPI tokens

### High (Blocked)
- Google API keys: `AIza...`

### Medium (Warning)
- Generic API keys
- Generic secret keys

### Low (Logged)
- JWT tokens (could be test tokens)

### False Positive Filtering

Skipped for:
- Test files (`*.test.js`, `*.spec.ts`, etc.)
- Documentation files (`*.md`, `README`, etc.)
- Lock files (`package-lock.json`, etc.)
- Example/sample/template/mock files

## Creating Custom Hooks

### Using createHook() Factory (Recommended)

```javascript
#!/usr/bin/env node
const { createHook } = require('./hook-utils.cjs');

createHook('MyCustomHook', async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Your logic here...

  // Return null for pass-through
  return null;

  // Or return a result object
  return { continue: true, systemMessage: 'Context for the model' };
});
```

### Manual (for hooks outside the cAgents hook directory)

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    if (process.stdin.isTTY) { resolve({}); return; }
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch { resolve({}); }
    });
    setTimeout(() => resolve({}), 1000);
  });
}

async function main() {
  const input = await readStdin();
  // Your logic here...
  console.log(JSON.stringify({ continue: true }));
}

main();
```

## Hook Configuration

Hooks are registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "HookType": [
      {
        "matcher": "ToolName",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}\"; node \"$R/.claude/hooks/run-hook.cjs\" my-hook'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

The `bash -c` wrapper provides a 3-tier fallback chain for resolving the plugin root:
1. `CLAUDE_PLUGIN_ROOT` -- Official Claude Code plugin env var (set when loaded as marketplace plugin)
2. `CLAUDE_PROJECT_DIR` -- User's project directory (works for local development)
3. `$(pwd)` -- Current working directory (last resort fallback)

## Best Practices

1. **Use createHook()**: Eliminates boilerplate and guarantees correct output format
2. **Fast execution**: Keep hooks under 5 seconds
3. **Graceful failure**: createHook() handles errors automatically (returns `{"continue": true}`)
4. **Clear logging**: Use `console.error()` for logs (stderr), `createHook()` handles stdout
5. **Idempotent**: Hooks may run multiple times
6. **Self-contained**: No external dependencies (100% built-in Node.js)
7. **State in files**: Store state in Agent_Memory, not memory
8. **Single JSON output**: createHook() guarantees exactly one JSON output to stdout

## Troubleshooting

### Hook not running
- Check `.claude/settings.json` for registration
- Verify file permissions (`chmod +x`)
- Verify `node` is in PATH

### Hook blocks unexpectedly
- Check `permissionDecisionReason` in output
- Check matcher pattern for PreToolUse
- Test hook manually: `echo '{}' | node .claude/hooks/<name>.cjs`

### Hook output not shown
- Ensure using createHook() factory (handles output correctly)
- Check JSON is valid: `echo '{}' | node .claude/hooks/<name>.cjs 2>/dev/null | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"`

## Related Files

- `.claude/settings.json` - Hook registration (active configuration)
- `.claude/hooks/hook-utils.cjs` - Shared utilities and createHook() factory
- `Agent_Memory/_system/config/hooks.yaml` - Hook behavior config
- `scripts/ci/check-quality.sh` - Hook validation in CI
- `Agent_Memory/_system/evals/` - Evaluation framework

**Removed in V9.5** (no longer present in codebase):
- `hooks/` directory - Legacy shell hooks (replaced by `.claude/hooks/*.cjs`)
- `scripts/hook-dispatch.sh` - Legacy shell dispatch (replaced by `run-hook.cjs`)
- `scripts/hook-dispatch-node.sh` - Legacy Node dispatch (replaced by `run-hook.cjs`)

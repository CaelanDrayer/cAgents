---
paths:
  - ".claude/hooks/**"
  - ".claude/settings*.json"
---

# cAgents Hook System

V10.5.0 CJS-only hook architecture with 16 registered hooks + 1 CLI tool across 13 event types (of 17 total Claude Code event types), `createHook()` factory pattern, agent audit trail with completion summaries, attention injection for goal refresh, clean team lifecycle (`continue:false` + `stopReason` for TeammateIdle/TaskCompleted), and resilient path resolution. Supports command, http, prompt, and agent hook types, async execution, and matcher-based filtering.

## Architecture

cAgents uses a unified CJS hook system configured in `.claude/settings.json`:

- **CJS hooks** (`.claude/hooks/`): 19 `.cjs` files -- 1 shared utility module (`hook-utils.cjs`) + 1 hook launcher (`run-hook.cjs`) + 16 registered hooks + 1 standalone CLI tool (`eval-runner.cjs`). All hooks use the `createHook()` factory from `hook-utils.cjs` which eliminates boilerplate (stdin reading, try-catch, JSON output).
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

Claude Code supports 17 hook event types. cAgents implements 16 registered hooks across 13 of these events. Four events (`UserPromptSubmit`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`) have no cAgents hooks but are available for custom use.

| Hook Type | Trigger | cAgents Hook | Purpose |
|-----------|---------|--------------|---------|
| `SessionStart` | Session begins/resumes | `session-catchup.cjs` | Initialize state, detect incomplete sessions, inject cAgents context |
| `SessionEnd` | Session ends | `team-stop.cjs` | Finalize metrics, update status |
| `UserPromptSubmit` | User submits prompt | *(none)* | Available for custom input validation/preprocessing |
| `PreToolUse` | Before tool execution | `bash-validator.cjs`, `secret-detection.cjs`, `attention-injection.cjs` | Validate, block dangerous operations, refresh goals |
| `PermissionRequest` | Permission dialog | `permission-handler.cjs` | Auto-approve safe patterns, HITL gates |
| `PostToolUse` | After tool execution | `post-write-validator.cjs` | Validate JSON/YAML syntax, audit file changes |
| `PostToolUseFailure` | Tool execution fails | `tool-failure-tracker.cjs` | Track failures, detect patterns, suggest recovery |
| `Notification` | Status notification | `notification.cjs` | Log and track |
| `SubagentStart` | Subagent spawned | `subagent-tracker.cjs`, `team-start.cjs` | Log spawns, initialize team monitoring, inject self-registration context |
| `SubagentStop` | Subagent finishes | `subagent-stop-tracker.cjs` | Log completion, capture summaries + duration, update agent tree |
| `Stop` | Claude stops responding | `verify-completion.cjs` | Verify completion criteria |
| `TeammateIdle` | Teammate goes idle | `teammate-idle-handler.cjs` | Find available work or stop teammate (`continue:false`) when all items done |
| `TaskCompleted` | Task finishes | `team-task-complete.cjs` | Update task list, unblock dependencies, stop teammate (`continue:false`) when all items done |
| `ConfigChange` | Config file changes | *(none)* | Available for custom config change handling |
| `WorktreeCreate` | Worktree being created | *(none)* | Available for custom VCS-agnostic worktree setup |
| `WorktreeRemove` | Worktree being removed | *(none)* | Available for custom worktree cleanup |
| `PreCompact` | Before context compaction | `pre-compact-save.cjs` | Save critical state + coordination state |

### Matcher Patterns by Event

| Event | What matcher filters | Example values |
|-------|---------------------|----------------|
| `SessionStart` | How session started | `startup`, `resume`, `clear`, `compact` |
| `SessionEnd` | Why session ended | `clear`, `logout`, `prompt_input_exit`, `other` |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest` | Tool name | `Bash`, `Edit\|Write`, `mcp__.*` |
| `Notification` | Notification type | `permission_prompt`, `idle_prompt`, `auth_success` |
| `SubagentStart`, `SubagentStop` | Agent type name | `Bash`, `Explore`, `Plan`, custom agent names |
| `PreCompact` | Compaction trigger | `manual`, `auto` |
| `ConfigChange` | Config source | `user_settings`, `project_settings`, `local_settings`, `skills` |
| `UserPromptSubmit`, `Stop`, `TeammateIdle`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove` | *(no matcher)* | Always fires on every occurrence |

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

  // Return stop signal for TeammateIdle/TaskCompleted (V10.5.0)
  return { continue: false, stopReason: 'All work items completed' };
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

#### PreToolUse[Write|Edit|Bash]: attention-injection.cjs
- **Matcher**: `Write|Edit|Bash`
- **Purpose**: Refresh plan objectives in attention window before tool operations (Manus-style goal drift prevention)
- **Reads**: `workflow/plan.yaml` mission, domain, controller; `workflow/coordination_log.yaml` status
- **Output**: systemMessage with concise goal reminder (mission + domain + coordination status)
- **No-op when**: No active session, no plan.yaml, or writing to planning files

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
- **Purpose**: Validate file syntax after successful Write/Edit operations, nudge planning file updates
- **Validates**: JSON parsing, YAML tab detection, duplicate YAML top-level keys
- **Planning reminder**: During active sessions with plan.yaml, reminds to update coordination_log/progress.md after implementation file writes
- **Logs**: All file changes to `workflow/file_changes.log` with timestamps and validation status
- **Output**: Warning systemMessage if syntax issues found; planning reminder for non-planning file writes

#### PostToolUseFailure: tool-failure-tracker.cjs
- **Purpose**: Track tool failures, detect patterns (3+ failures suggests alternatives)
- **Creates**: `workflow/tool_failures.yaml`

### Team Hooks

#### TeammateIdle: teammate-idle-handler.cjs
- **Purpose**: Suggest available work items or cleanly stop idle teammates
- **V10.5.0**: Refactored to `createHook()`. Returns `{ continue: false, stopReason }` when all work items are completed, causing the teammate to stop cleanly instead of lingering idle.
- **Logic**: Available work → suggest (continue:true); all completed → stop (continue:false); otherwise → pass-through (null)

#### TaskCompleted: team-task-complete.cjs
- **Purpose**: Update task_list.yaml status, check dependency unblocking, stop teammate when all done
- **Input fields**: `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name` (Claude Code API)
- **V10.5.0**: Refactored to `createHook()`. Returns `{ continue: false, stopReason }` when all work items are completed. Reports newly unblocked items via systemMessage.
- **Side effects**: Updates task_list.yaml, writes completion message, updates timing metrics

#### PermissionRequest: permission-handler.cjs
- **Purpose**: Auto-approve safe patterns (Read, Grep, Glob), HITL gates for tier 4
- **Auto-approved**: Read, Grep, Glob, TaskList, TaskGet; Write/Edit to Agent_Memory

### State Management

#### PreCompact: pre-compact-save.cjs
- **Purpose**: Save critical workflow state before context compaction
- **Creates**: Waypoint file in `sessions/{id}/waypoints/`
- **Includes**: Coordination state, team state, 5-question reboot check (where_am_i, where_going, whats_the_goal, what_learned, what_done), resume instructions

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

**Note**: Exit codes apply to command hooks only. HTTP hooks communicate success/failure via HTTP response status codes (2xx = success, non-2xx may block depending on event). Prompt and agent hooks communicate via their LLM response.

- `0`: Success -- JSON parsed from stdout. Use `permissionDecision: "deny"` in hookSpecificOutput to block PreToolUse operations. For most events, stdout is only shown in verbose mode (Ctrl+O). Exceptions: `UserPromptSubmit` and `SessionStart` add stdout as context Claude can see.
- `2`: Blocking error -- Claude Code ignores stdout JSON and feeds stderr to the model. The effect depends on the event:
  - **Can block**: `PreToolUse` (blocks tool call), `PermissionRequest` (denies permission), `UserPromptSubmit` (blocks prompt), `Stop` (prevents stopping), `SubagentStop` (prevents stop), `TeammateIdle` (keeps working), `TaskCompleted` (prevents completion), `ConfigChange` (blocks change), `WorktreeCreate` (fails creation)
  - **Cannot block**: `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SessionStart`, `SessionEnd`, `PreCompact`, `WorktreeRemove` -- stderr shown to user only
- Any other exit code: Non-blocking error, stderr shown in verbose mode, execution continues.

## Hook Handler Types

Claude Code supports four hook handler types:

### Command Hooks (`type: "command"`)
Run a shell command. Receives JSON on stdin, communicates via exit codes and stdout JSON.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"command"` |
| `command` | yes | Shell command to execute |
| `timeout` | no | Seconds before canceling (default: 600) |
| `async` | no | If `true`, runs in background without blocking |
| `statusMessage` | no | Custom spinner message while hook runs |
| `once` | no | If `true`, runs once per session then removed (skills only) |

### HTTP Hooks (`type: "http"`)
Send an HTTP POST request to a URL endpoint. Useful for external integrations, webhooks, and logging to external services.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"http"` |
| `url` | yes | URL endpoint to POST to (receives JSON payload) |
| `headers` | no | Custom HTTP headers as key-value pairs |
| `timeout` | no | Seconds before canceling (default: 30) |

### Prompt Hooks (`type: "prompt"`)
Use an LLM to evaluate conditions and return yes/no decisions.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"prompt"` |
| `prompt` | yes | Prompt text. Use `$ARGUMENTS` for hook input JSON |
| `model` | no | Model for evaluation (defaults to fast model) |
| `timeout` | no | Seconds before canceling (default: 30) |

### Agent Hooks (`type: "agent"`)
Spawn a subagent with tool access (Read, Grep, Glob) to verify conditions.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"agent"` |
| `prompt` | yes | Prompt text. Use `$ARGUMENTS` for hook input JSON |
| `model` | no | Model for evaluation |
| `timeout` | no | Seconds before canceling (default: 60) |

**Supported Events** (all four types: command, http, prompt, agent):
- `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`
- `UserPromptSubmit`, `Stop`, `SubagentStop`, `TaskCompleted`

**Command hooks only** (http/prompt/agent NOT supported):
- `SessionStart`, `SessionEnd`, `SubagentStart`, `PreCompact`, `Notification`
- `TeammateIdle`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`

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

### Async Hooks

Command hooks support `"async": true` to run in the background without blocking. Useful for logging, analytics, or notifications that should not delay tool execution.

```json
{
  "type": "command",
  "command": "./scripts/log-event.sh",
  "async": true
}
```

### Hooks in Skills and Agents

Hooks can be defined in skill and subagent YAML frontmatter, scoped to the component's lifecycle:

```yaml
---
name: secure-ops
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

For subagents, `Stop` hooks are automatically converted to `SubagentStop` events.

**Note**: For SessionStart context injection, use a command hook that returns `hookSpecificOutput.additionalContext` instead of a prompt hook. See `session-catchup.cjs` for the cAgents implementation.

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

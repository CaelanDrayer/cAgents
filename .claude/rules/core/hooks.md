# cAgents Hook System

V9.0 hook system with 14 hook event types and 3 hook types (command, prompt, agent).

## Architecture

cAgents uses a dual-hook system configured in `.claude/settings.json`:

- **Shell hooks** (`hooks/`): 9 scripts for session lifecycle, workflow events, and tool validation. These are the baseline hooks that work without Node.js. Shared functions (`get_active_instruction`, `get_active_phase`, `get_session_field`) are provided by `scripts/lib/hook-bootstrap.sh`.
- **JavaScript hooks** (`.claude/hooks/`): 11 `.cjs` files — 1 shared utility module (`hook-utils.cjs`) + 9 registered hooks for advanced features (session catchup, secret detection, completion verification, pre-compact state save, notifications, tool failure tracking, subagent tracking, teammate idle handling, permission handling, team task completion). Plus 1 standalone CLI tool (`eval-runner.cjs`) and 1 unregistered hook (`context-overflow.cjs` - awaiting Claude Code support for ContextOverflow hook type). All CJS hooks import shared functions from `hook-utils.cjs`.
- **Hook dispatchers** (`scripts/`): `hook-dispatch.sh` and `hook-dispatch-node.sh` simplify settings.json registration by eliminating verbose bash-in-JSON wrappers.
- **Prompt hooks**: 2 prompt-based hooks inject guidance at SessionStart and Stop events.

The `setup.sh` script auto-detects Node.js and configures the appropriate settings. Without Node.js, only shell hooks are active (via `settings.shell-only.json`). With Node.js, both systems run (via `settings.full.json`).

**Archived hooks**: 10 legacy shell scripts and 1 schema file were archived to `archive/hooks/` as they were never registered in settings.json and not called from any active code. These were "programmatic" hooks from an earlier design that anticipated being called by agents during coordination/phase/HITL events but were never wired up.

## Hook Types Overview

| Hook Type | Trigger | cAgents Implementation | Purpose |
|-----------|---------|------------------------|---------|
| `SessionStart` | Session begins | `on-session-start.sh`, `session-catchup.cjs`, prompt hook | Initialize state, detect incomplete sessions |
| `SessionEnd` | Session ends | `on-session-end.sh`, `team-stop.cjs` | Clean up, archive session, team cleanup |
| `PreToolUse` | Before tool execution | Multiple (see below) | Validate, block, modify |
| `PostToolUse` | After tool execution | `on-task-complete.sh` | Track, log, verify |
| `PostToolUseFailure` | Tool execution fails | `tool-failure-tracker.cjs` | Track failures, detect patterns, suggest recovery |
| `UserPromptSubmit` | User sends message | `on-user-prompt.sh` | Detect commands, route |
| `Stop` | Claude stops responding | `stop-workflow.sh`, `verify-completion.cjs`, prompt hook | Verify completion |
| `SubagentStart` | Subagent spawned | `subagent-tracker.cjs`, `team-start.cjs` | Log spawns, track agent chains |
| `SubagentStop` | Subagent completes | `on-workflow-complete.sh` | Aggregate results |
| `TeammateIdle` | Teammate goes idle | `teammate-idle-handler.cjs` | Find available work for idle members |
| `TaskCompleted` | Task finishes | `team-task-complete.cjs` | Update task list, unblock dependencies |
| `PermissionRequest` | Permission dialog | `permission-handler.cjs` | Auto-approve safe patterns, HITL gates |
| `Notification` | Status notification | `notification.cjs` | Log, alert, track |
| `PreCompact` | Before context compaction | `pre-compact-save.cjs` | Save critical state + coordination state |
| `Error` | Error occurs | (planned) | Error tracking |

## Active Hooks (V9.0)

### Session Lifecycle

#### SessionStart
- **Files**:
  - `hooks/session/on-session-start.sh` - Initialize session
  - `.claude/hooks/session-catchup.cjs` - Detect incomplete sessions
- **Purpose**: Initialize session state, offer resume for incomplete sessions
- **Output**: `{"continue": true, "systemMessage": "..."}`

#### SessionEnd
- **File**: `hooks/session/on-session-end.sh`
- **Purpose**: Clean up session, archive if complete

### Tool Validation

#### PreToolUse: Bash
- **File**: `hooks/tools/pre-bash.sh`
- **Matcher**: `Bash`
- **Purpose**: Validate bash commands, block dangerous operations
- **Blocked** (exit 2): `rm -rf /`, `rm -rf ~`, fork bombs, `mkfs`, `dd if=/dev/zero`, `> /dev/sda`, `sudo`
- **Warned** (allow): destructive git commands (`--force`, `reset --hard`, `clean -fd`)

#### PreToolUse: Write/Edit
- **Files**:
  - `hooks/tools/pre-write.sh` - Path validation
  - `.claude/hooks/secret-detection.cjs` - Secret blocking
- **Matcher**: `Write|Edit`
- **Purpose**: Block writes to protected paths, detect secrets
- **Blocked**: System paths, files with secrets

#### PreToolUse: Task
- **File**: `hooks/workflow/on-task-start.sh`
- **Matcher**: `Task`
- **Purpose**: Track task delegation

### Workflow Events

#### Stop
- **Files**:
  - `hooks/workflow/stop-workflow.sh`
  - `.claude/hooks/verify-completion.cjs`
- **Purpose**: Verify completion criteria before stopping

#### SubagentStop
- **File**: `hooks/workflow/on-workflow-complete.sh`
- **Purpose**: Aggregate subagent outputs

#### PostToolUse: Task
- **File**: `hooks/workflow/on-task-complete.sh`
- **Matcher**: `Task`
- **Purpose**: Track task completion

### V8.0 Hooks

#### Notification
- **File**: `.claude/hooks/notification.cjs`
- **Purpose**: Log and track status notifications
- **Input**: `{type, message, session_id, phase, ...}`
- **Output**: `{"continue": true}`

#### PreCompact
- **File**: `.claude/hooks/pre-compact-save.cjs`
- **Purpose**: Save critical workflow state before context compaction
- **Creates**: Waypoint file in `sessions/{id}/waypoints/`
- **Output**: `{"continue": true, "systemMessage": "..."}`

#### Session Catchup
- **File**: `.claude/hooks/session-catchup.cjs`
- **Purpose**: Detect incomplete sessions on startup
- **Outputs**: Resume options to user
- **Creates**: `Agent_Memory/_system/incomplete_sessions.json`

#### Context Overflow (NOT REGISTERED - awaiting Claude Code support)
- **File**: `.claude/hooks/context-overflow.cjs`
- **Status**: NOT REGISTERED - "ContextOverflow" is not a valid Claude Code hook type
- **Purpose**: Save exhaustion checkpoint when context limit is reached, trigger self-correction
- **Creates**: Waypoint at `sessions/{id}/waypoints/wp-exhaustion-{timestamp}.yaml` and `continuation_needed.yaml`
- **Recovery**: System message directs agent to invoke `universal-self-correct` with `correction_type: context_overflow`
- **Note**: This hook exists but cannot be registered until Claude Code adds a ContextOverflow or similar hook type

#### Eval Runner (CLI Tool, not a registered hook)
- **File**: `.claude/hooks/eval-runner.cjs`
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

- `0`: Success, continue
- `2`: Block operation (for PreToolUse)

## Prompt-Based Hooks

In addition to command hooks, Claude Code supports prompt-based hooks that inject text into the conversation:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Remember to follow cAgents task completion protocol."
          }
        ]
      }
    ]
  }
}
```

**Use Cases**:
- Inject reminders at session start
- Add context before specific tool use
- Provide guidance after errors

**Limitations**:
- Cannot block operations
- Cannot modify tool input
- Text only (no JSON processing)

## Hook Override in Agent Frontmatter

Agents can specify hook overrides in SKILL.md frontmatter:

```yaml
---
name: security-specialist
tier: execution
domain: make
hook_overrides:
  PreToolUse:
    Bash:
      skip: true        # Security specialist can run any bash
    Write:
      skip_secret_scan: false  # Still scan for secrets
  custom_hooks:
    on_complete:
      run_security_audit: true
---
```

**Available Override Options**:
- `skip: true` - Skip this hook entirely for this agent
- `skip_secret_scan: true` - Skip secret detection
- `timeout_override: 30` - Override default timeout
- `custom_hooks` - Agent-specific hook logic

## Secret Detection

The secret detection hook (`secret-detection.cjs`) blocks these patterns:

### Critical (Blocked)
- GitHub tokens: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- AWS keys: `AKIA...`
- Private keys: `-----BEGIN ... PRIVATE KEY-----`
- Slack tokens: `xox[baprs]-...`
- Stripe live keys: `sk_live_...`, `rk_live_...`
- Database connection strings with credentials
- Heroku API keys: `HEROKU_API_KEY=<uuid>` (context-required, no bare UUID matching)
- OpenAI API keys: `sk-proj-...` (newer format), `sk-<48-50 chars>` (legacy, excludes `sk-ant-`/`sk-live_`/`sk-test_`)

### High (Blocked)
- Google API keys: `AIza...`

### Medium (Warning)
- Generic API keys
- Generic secret keys
- Google OAuth Client IDs

### Low (Logged)
- JWT tokens (could be test tokens)

### False Positive Filtering

Skipped for:
- Test files (`*.test.js`, `*.spec.ts`, etc.)
- Documentation files (`*.md`, `README`, etc.)
- Lock files (`package-lock.json`, etc.)
- Example/sample/template/mock files

## Creating Custom Hooks

### Shell Hook Template

```bash
#!/bin/bash
set -o pipefail

# Redirect stdout to stderr, save original stdout
exec 3>&1
exec 1>&2

# Read input
input="$(cat)" || input='{}'

# Parse with jq if available
if command -v jq &>/dev/null; then
    value=$(echo "$input" | jq -r '.field // "default"')
fi

# Your logic here...

# Output JSON to original stdout
echo '{"continue":true}' >&3
exit 0
```

### JavaScript Hook Template

```javascript
#!/usr/bin/env node
/**
 * Custom Hook - 100% Self-Contained
 * NO external dependencies (no npm packages)
 */

const fs = require('fs');
const path = require('path');

// Read stdin
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

  // Output result
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
        "matcher": "ToolName",  // Optional: for PreToolUse/PostToolUse
        "hooks": [
          {
            "type": "command",
            "command": "path/to/hook.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

## Best Practices

1. **Fast execution**: Keep hooks under 5 seconds
2. **Graceful failure**: Don't block on errors
3. **Clear logging**: Use stderr for logs, stdout for JSON only
4. **Idempotent**: Hooks may run multiple times
5. **Self-contained**: No external dependencies (100% built-in Node.js)
6. **Informative output**: Provide clear messages to user
7. **State in files**: Store state in Agent_Memory, not memory

## Troubleshooting

### Hook not running
- Check `.claude/settings.json` for registration
- Verify file permissions (`chmod +x`)
- Check path uses `$CLAUDE_PROJECT_DIR`

### Hook blocks unexpectedly
- Check exit code (2 = block)
- Review `permissionDecisionReason` in output
- Check matcher pattern for PreToolUse

### Hook output not shown
- Ensure JSON output goes to stdout (fd 1 or fd 3)
- Ensure logs go to stderr (fd 2)
- Check JSON is valid

## Related Files

- `.claude/settings.json` - Hook registration (active configuration)
- `.claude/settings.full.json` - Template for full hooks (shell + JS), synced with settings.json
- `.claude/settings.shell-only.json` - Template for shell-only hooks (no Node.js)
- `setup.sh` - Auto-detects Node.js and selects appropriate settings
- `Agent_Memory/_system/config/hooks.yaml` - Hook behavior config
- `scripts/ci/check-quality.sh` - Hook validation in CI
- `Agent_Memory/_system/evals/` - Evaluation framework
- `archive/hooks/` - Archived legacy hooks (coordination, hitl, phase, workflow-start/fail)

**Removed**: `hooks/hooks.json` was deprecated and has been deleted.

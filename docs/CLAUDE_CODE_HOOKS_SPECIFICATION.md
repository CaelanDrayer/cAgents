# Claude Code Plugin Hooks Specification

**Research Date**: 2026-01-21
**Purpose**: Document correct hook specification to fix "hooks: Invalid input" validation error

---

## Executive Summary

The **"hooks: Invalid input"** error in cAgents plugin.json was caused by using an **invalid inline hooks format**. Claude Code requires hooks to be defined **either** as:

1. **External file reference**: `"hooks": "./hooks/hooks.json"`
2. **Inline object with matcher-based structure** (NOT direct event-to-script mapping)

The invalid format used in commit 392979c:
```json
// ❌ INVALID - Direct event-to-script mapping
{
  "hooks": {
    "SessionStart": "hooks/session/on-session-start.sh",
    "SessionEnd": "hooks/session/on-session-end.sh"
  }
}
```

---

## 1. Hook Registration in plugin.json

### Valid Option 1: External File Reference

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "hooks": "./hooks/hooks.json"
}
```

**Requirements**:
- Path MUST start with `./` (relative path)
- File MUST be at plugin root level (not inside `.claude-plugin/`)
- File MUST use wrapper format (see section 2)

### Valid Option 2: Inline Hooks Object

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-start.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
          }
        ]
      }
    ]
  }
}
```

**Requirements**:
- Event keys MUST be valid hook types (see section 3)
- Each event MUST have array of matcher-based hook definitions
- Commands MUST use `${CLAUDE_PLUGIN_ROOT}` for portability
- For events without matchers (SessionStart, SessionEnd, Stop, SubagentStop), you can omit the matcher or use empty string

---

## 2. External hooks.json Format (Wrapper Format)

For plugins, `hooks/hooks.json` MUST use a **wrapper format**:

```json
{
  "description": "cAgents lifecycle hooks",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-start.sh",
            "timeout": 5000,
            "description": "Initialize session state"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-end.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/on-workflow-start.sh"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/on-workflow-complete.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/stop-workflow.sh",
            "timeout": 10000
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/validation/validate-bash.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/on-file-change.sh"
          }
        ]
      }
    ]
  }
}
```

**Key Features**:
- Top-level `"description"` field (optional)
- Hooks MUST be nested under `"hooks"` key
- Event names are keys (SessionStart, SessionEnd, etc.)
- Each event is an array of matcher-based definitions

---

## 3. Supported Hook Events

### Events WITH Matcher Support

| Event | Description | Typical Matchers |
|-------|-------------|------------------|
| `PreToolUse` | Before tool execution | `Write\|Edit\|Bash`, `Read`, `Grep`, `*` |
| `PostToolUse` | After successful tool | `Write\|Edit`, `Notebook.*`, `*` |
| `PostToolUseFailure` | After tool failure | Same as PostToolUse |
| `PermissionRequest` | Permission dialogs | `fileWrite`, `bashCommand`, `*` |
| `UserPromptSubmit` | Before user prompt | N/A (matchers ignored) |
| `Notification` | Notifications | `permission_prompt`, `idle_prompt`, `*` |
| `PreCompact` | Before context compact | `manual`, `auto`, `*` |
| `Setup` | Repository setup | `init`, `maintenance`, `*` |
| `SessionStart` | Session initialization | `startup`, `resume`, `clear`, `compact` |

### Events WITHOUT Matcher Support

| Event | Description | Matcher Behavior |
|-------|-------------|------------------|
| `SessionEnd` | Session cleanup | Matchers ignored, fires for all |
| `Stop` | Main agent finishes | Matchers ignored, fires for all |
| `SubagentStart` | Subagent starts | Matchers ignored, fires for all |
| `SubagentStop` | Subagent finishes | Matchers ignored, fires for all |

**For events without matcher support**: You can either omit the `"matcher"` field or use empty string `""`.

---

## 4. Hook Definition Structure

### Hook Object Schema

```typescript
interface HookDefinition {
  type: "command" | "prompt" | "agent";
  command?: string;           // For type: "command"
  prompt?: string;            // For type: "prompt"
  timeout?: number;           // Milliseconds (default: 60000)
  description?: string;       // Human-readable description
}
```

### Type: Command

Execute bash command or script:

```json
{
  "type": "command",
  "command": "${CLAUDE_PLUGIN_ROOT}/scripts/validate.sh",
  "timeout": 30000,
  "description": "Validate file operations"
}
```

**Features**:
- Receives JSON input via stdin
- Exit code 0 = success, 2 = blocking error
- Can output JSON for advanced control
- Has access to environment variables

### Type: Prompt

LLM evaluation (Haiku model):

```json
{
  "type": "prompt",
  "prompt": "Evaluate if this tool call is safe: $ARGUMENTS. Return {\"ok\": true|false, \"reason\": \"explanation\"}",
  "timeout": 30000
}
```

**Features**:
- Use `$ARGUMENTS` placeholder for hook input
- Only for: Stop, SubagentStop, UserPromptSubmit, PreToolUse, PermissionRequest
- MUST return JSON: `{"ok": true|false, "reason": "text"}`

### Type: Agent

Agentic verifier with tool access:

```json
{
  "type": "agent",
  "prompt": "Verify code quality and security",
  "timeout": 60000
}
```

**Features**:
- Full tool access for complex verification
- Can read files, run commands, etc.
- More powerful than prompt-based hooks

---

## 5. Matcher Patterns

Matchers are **case-sensitive** and support regex:

| Pattern | Matches |
|---------|---------|
| `"Write"` | Exact match: Write tool only |
| `"Write\|Edit"` | Alternation: Write OR Edit |
| `"Read\|Write\|Edit"` | Multiple tools |
| `"Notebook.*"` | Regex: All Notebook tools |
| `"mcp__.*"` | All MCP tools |
| `"mcp__memory__.*"` | Specific MCP server tools |
| `"*"` | All tools (wildcard) |
| `""` | All tools (empty string) |

### Common Tool Names

**File Operations**:
- `Read`, `Write`, `Edit`, `Glob`

**Shell**:
- `Bash`

**Search**:
- `Grep`, `WebFetch`, `WebSearch`

**Tasks**:
- `Task` (subagent invocation)

**Notebook**:
- `NotebookEdit`, `NotebookRead`

**MCP Tools**:
- `mcp__<server-name>__<tool-name>`

---

## 6. Environment Variables

Available in ALL hook commands:

| Variable | Description | Example |
|----------|-------------|---------|
| `CLAUDE_PROJECT_DIR` | Project root directory | `/home/user/project` |
| `CLAUDE_CODE_REMOTE` | Running in web environment | `"true"` or `"false"` |
| `CLAUDE_PLUGIN_ROOT` | Plugin installation directory | `/path/to/plugin` |

**Special Variables** (specific events):

| Variable | Available In | Description |
|----------|--------------|-------------|
| `CLAUDE_ENV_FILE` | SessionStart, Setup | Path to persist env vars |

---

## 7. Hook Input Schema

All hooks receive JSON via stdin (for command type) or as `$ARGUMENTS` (for prompt type).

### Common Fields (All Events)

```json
{
  "session_id": "unique-session-id",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default|plan|acceptEdits|dontAsk|bypassPermissions",
  "hook_event_name": "EventName"
}
```

### SessionStart Input

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "...",
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear|compact",
  "agent_type": "main|subagent"  // NEW in 2026
}
```

### SessionEnd Input

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "...",
  "hook_event_name": "SessionEnd",
  "reason": "clear|logout|prompt_input_exit|other"
}
```

### PreToolUse Input

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash|Write|Edit|Read|etc",
  "tool_input": {
    "command": "shell command",
    "file_path": "/path/to/file",
    "content": "file content",
    "old_string": "text to replace",
    "new_string": "replacement text"
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

### PostToolUse Input

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "...",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "...", "content": "..." },
  "tool_response": {
    "success": true,
    "filePath": "/path/to/file"
  },
  "tool_use_id": "toolu_01ABC123..."
}
```

### Stop/SubagentStop Input

```json
{
  "session_id": "...",
  "transcript_path": "...",
  "cwd": "...",
  "permission_mode": "...",
  "hook_event_name": "Stop",
  "stop_hook_active": false
}
```

---

## 8. Hook Output Schema

### Exit Codes (Command Hooks)

- **0**: Success, proceed normally
- **2**: Blocking error (stderr shown, action blocked)
- **Other**: Non-blocking error (shown in verbose mode only)

### JSON Output (Exit Code 0)

```json
{
  "continue": true,
  "stopReason": "Optional message if continue=false",
  "suppressOutput": false,
  "systemMessage": "Optional warning/info for Claude",
  "hookSpecificOutput": {
    "hookEventName": "EventName",
    "additionalContext": "Context to add to transcript",
    "permissionDecision": "allow|deny|ask",  // PreToolUse only
    "updatedInput": { "field": "value" }     // PreToolUse/PermissionRequest
  }
}
```

### PreToolUse Output

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask",
    "permissionDecisionReason": "Why this decision was made",
    "updatedInput": {
      "file_path": "/modified/path.txt"
    },
    "additionalContext": "Security check passed"
  }
}
```

### Stop/SubagentStop Output

```json
{
  "decision": "block|undefined",
  "reason": "Explanation (required if block)"
}
```

---

## 9. Script Requirements

Hook scripts MUST:

1. **Be executable**: `chmod +x script.sh`
2. **Have shebang**: `#!/bin/bash` or `#!/usr/bin/env python3`
3. **Handle stdin**: Read JSON input from stdin (for command type)
4. **Output JSON**: If exit code 0 and advanced control needed
5. **Use proper exit codes**:
   - 0 for success
   - 2 for blocking errors
   - Other for non-blocking errors

### Minimal Working Script

```bash
#!/bin/bash
# hooks/session/on-session-start.sh

# Read input from stdin
INPUT=$(cat)

# Extract fields (using jq if available)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
SOURCE=$(echo "$INPUT" | jq -r '.source')

# Do work
echo "Session started: $SESSION_ID (source: $SOURCE)" >&2

# Output JSON (optional)
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "Session initialized successfully"
  }
}
EOF

# Exit with success
exit 0
```

---

## 10. Path Resolution

### Plugin Root Reference

**ALWAYS use `${CLAUDE_PLUGIN_ROOT}`** for portable paths:

```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-start.sh"
}
```

**Why**: Plugins install in different locations:
- Marketplace: `~/.claude/plugins/marketplace/<plugin-name>/`
- Local: Project directory
- NPM: `node_modules/<plugin-name>/`

### Relative Paths

In plugin.json hooks field:
- ✅ `"./hooks/hooks.json"` (relative to plugin root)
- ❌ `"hooks/hooks.json"` (missing `./`)
- ❌ `"/absolute/path/hooks.json"` (absolute paths not allowed)

In hooks.json commands:
- ✅ `"${CLAUDE_PLUGIN_ROOT}/scripts/script.sh"`
- ❌ `"./scripts/script.sh"` (no variable)
- ❌ `"scripts/script.sh"` (no variable)

---

## 11. Validation Rules

Claude Code validates hooks at session start:

1. **Event names**: MUST be valid hook types (case-sensitive)
2. **Structure**: MUST follow matcher-based array format
3. **Type field**: MUST be "command", "prompt", or "agent"
4. **Timeout**: Integer in milliseconds (default 60000, max 600000)
5. **Matcher**: Case-sensitive, supports regex
6. **Commands**: MUST be valid bash commands

**Common Validation Errors**:

| Error | Cause | Fix |
|-------|-------|-----|
| `hooks: Invalid input` | Direct event-to-script mapping | Use matcher-based structure |
| `hooks: Invalid input` | Invalid event name | Check event name spelling/case |
| `hooks: Invalid input` | Missing required fields | Add `type`, `command`/`prompt` |
| Hook script not found | Wrong path or not executable | Check path, run `chmod +x` |

---

## 12. Complete Working Examples

### Example 1: External hooks.json (RECOMMENDED)

**plugin.json**:
```json
{
  "name": "cagents",
  "version": "7.3.3",
  "hooks": "./hooks/hooks.json"
}
```

**hooks/hooks.json**:
```json
{
  "description": "cAgents lifecycle hooks",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-start.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-end.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/stop-workflow.sh",
            "timeout": 10000
          }
        ]
      }
    ]
  }
}
```

### Example 2: Inline hooks (Alternative)

**plugin.json**:
```json
{
  "name": "cagents",
  "version": "7.3.3",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-start.sh",
            "timeout": 5000
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-end.sh"
          }
        ]
      }
    ]
  }
}
```

---

## 13. cAgents Recommended Solution

**RECOMMENDED**: Use external `hooks/hooks.json` file with wrapper format.

### Step 1: Create hooks/hooks.json

```json
{
  "description": "cAgents V7.3 lifecycle hooks for workflow orchestration",
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-start.sh",
            "timeout": 5000,
            "description": "Initialize session state and load context"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session/on-session-end.sh",
            "timeout": 5000,
            "description": "Cleanup session state and archive if needed"
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/on-workflow-start.sh",
            "timeout": 5000,
            "description": "Initialize workflow folder and status.yaml"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/on-workflow-complete.sh",
            "timeout": 10000,
            "description": "Archive workflow and cleanup temp files"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/workflow/stop-workflow.sh",
            "timeout": 10000,
            "description": "Ralph-style graceful workflow termination"
          }
        ]
      }
    ]
  }
}
```

### Step 2: Update .claude-plugin/plugin.json

```json
{
  "name": "cagents",
  "version": "7.3.3",
  "description": "...",
  "hooks": "./hooks/hooks.json",
  "commands": [...],
  "agents": [...]
}
```

### Step 3: Verify Script Executability

```bash
chmod +x hooks/session/*.sh
chmod +x hooks/workflow/*.sh
chmod +x hooks/phase/*.sh
chmod +x hooks/coordination/*.sh
chmod +x hooks/hitl/*.sh
```

---

## 14. References

### Official Documentation
- [Hooks Reference - Claude Code Docs](https://code.claude.com/docs/en/hooks)
- [Plugins Reference - Claude Code Docs](https://code.claude.com/docs/en/plugins-reference)
- [Hook Development Skill](https://github.com/anthropics/claude-code/blob/main/plugins/plugin-dev/skills/hook-development/SKILL.md)

### Community Resources
- [claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)
- [claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)
- [A Complete Guide to Hooks in Claude Code](https://www.eesel.ai/blog/hooks-in-claude-code)
- [Claude Code Power User Customization](https://claude.com/blog/how-to-configure-hooks)

### Claude Skills Resources
- [Hook Configuration Skill](https://claude-plugins.dev/skills/@andisab/swe-marketplace/hook-configuration)
- [Plugin Structure Guide](https://claude-plugins.dev/skills/@anthropics/claude-plugins-official/plugin-structure)

---

## 15. Key Takeaways

1. **NEVER use direct event-to-script mapping** in plugin.json hooks field
2. **ALWAYS use matcher-based array structure** for hook definitions
3. **USE `${CLAUDE_PLUGIN_ROOT}`** for all command paths
4. **External hooks.json is RECOMMENDED** over inline hooks
5. **Wrapper format required** for external hooks.json
6. **Exit code 2** for blocking errors, 0 for success
7. **Scripts MUST be executable** with proper shebang
8. **Case-sensitive** event names and matchers
9. **Events without matchers** (SessionEnd, Stop, SubagentStop) can omit matcher field
10. **Test hooks** by checking Claude Code startup logs

---

**Document Version**: 1.0.0
**Last Updated**: 2026-01-21
**Maintained By**: cAgents Team

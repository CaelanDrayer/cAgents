# Settings Configuration

## Location

`.claude/settings.json`

## Purpose

Registers hooks, sets permissions, configures environment variables, and defines agent defaults.

## Key Sections

### hooks
Registers all 15 CJS hooks across 13 event types. Each hook is invoked via:
```
bash -c 'R="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"; node "$R/.claude/hooks/run-hook.cjs" <hook-name>'
```

### env
Environment variables set for all hook and agent executions:
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` - Enable Agent Teams
- Other project-specific variables

### permissions
Default permission settings for tools.

### agent
Default settings applied to subagents spawned by the plugin.

## Hook Registration Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-...}\"; node \"$R/.claude/hooks/run-hook.cjs\" bash-validator'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

## teammateMode

Controls how team teammates are displayed:
- `auto` (default): Automatic selection
- `tmux`: Split terminal panes
- `in-process`: Main terminal output

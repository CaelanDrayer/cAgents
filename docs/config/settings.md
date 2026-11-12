# Settings Configuration

## Location

`.claude/settings.json`

## Purpose

The file registers the hooks, sets the permissions, sets the environment variables, and sets the display and worktree options.

## Key Sections

### hooks

The file registers every cAgents hook. Each hook runs through the `run-hook.cjs` launcher:

```
bash -c 'R="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"; node "$R/.claude/hooks/run-hook.cjs" <hook-name>'
```

For the list of hooks and their events, see `docs/hooks/overview.md` and `.claude/rules/core/hooks.md`.

### env

The environment variables for all hook and agent executions:

| Variable | Purpose |
|----------|---------|
| `CAGENTS_VERSION` | The plugin version. `scripts/sync-versions.sh` sets it. |
| `CAGENTS_DELEGATION_ENFORCEMENT` | The mode of the delegation guard. |
| `CLAUDE_CODE_ENABLE_TODO_TOOLS` | Turns on the task tools on models that do not offer them by default. |

The file does not set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`. The default `/team` path uses concurrent `Agent` waves and does not need that flag.

For the opt-out values of the guards, see `docs/HOOK_OPT_OUTS.md`. The file does not set `CAGENTS_BASH_NARROW_GUARD`, so the narrow Bash guard is on. Set `CAGENTS_BASH_NARROW_GUARD=off` to turn it off. The old `CAGENTS_BASH_GUARD` and `CAGENTS_BASH_GUARD_DISABLED` keys are inert.

### permissions

The `allow` list and the `deny` list for tools. The `deny` list blocks some destructive commands, `sudo`, and edits to system and SSH paths. This block ships in the source repo only. A plugin install has no such block.

The narrow Bash guard, `bash-validator.cjs`, is a separate check. It denies a critical or high secret literal in the command text. It also denies a write, a delete, a move, or a mode or owner change on a protected path. It fails open. It is a tripwire for agent mistakes and plain injections, not a sandbox. See `docs/hooks/overview.md`.

### teammateMode

Controls how team teammates are displayed. cAgents sets `in-process`, the Claude Code default. Other values are `auto` and `tmux`.

### worktree

`worktree.sparsePaths` lists the paths that a worktree-isolated subagent checks out.

### displayOrigin and trustProjectMdFiles

`displayOrigin` sets the origin label `cAgents`. `trustProjectMdFiles` is `true`.

## Hook Registration Format

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write|Edit|NotebookEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-...}\"; node \"$R/.claude/hooks/run-hook.cjs\" write-edit-dispatch'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

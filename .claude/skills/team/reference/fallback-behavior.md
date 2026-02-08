# /team Fallback Behavior

## Display Mode Selection

Claude Code's built-in agent teams support three display modes via `teammateMode` in settings.json:

| Mode | Behavior | Requirements |
|------|----------|--------------|
| `"auto"` (default) | Uses tmux split panes if running inside a tmux session; otherwise in-process | None |
| `"tmux"` | Forces tmux split pane display -- each teammate in its own pane | tmux installed |
| `"in-process"` | All teammates in main terminal, navigate with Shift+Up/Down | None |

### Configuration

In settings.json:
```json
{
  "teammateMode": "tmux"
}
```

Per-session override:
```bash
claude --teammate-mode in-process
```

### tmux Requirements

For tmux split pane display:
- tmux must be installed and in PATH
- Terminal must support tmux
- Install via package manager: `apt install tmux`, `brew install tmux`, etc.

### In-Process Mode

When tmux is unavailable or `"in-process"` is configured:
- All teammates run inside the main terminal
- Use Shift+Up/Down to select and interact with teammates
- Use Shift+Tab to toggle delegate mode
- Use Ctrl+T to toggle the task list
- Press Enter to view a teammate's session, Escape to interrupt

## Unsuitable Request Fallback

If the request is unsuitable for team execution (tier 2, too few work items, all sequential):

1. Notify user: "Request better suited for standard execution."
2. Automatically delegate to `/run`:

```javascript
Skill({
  skill: "run",
  args: `${flags.request}`
})
```

This ensures no request falls through -- unsuitable team requests seamlessly continue via standard `/run` execution.

## Error Recovery

### Teammate Not Appearing

If teammates are not appearing after team creation:
- In in-process mode: use Shift+Down to cycle through active teammates
- Check that the task is complex enough to warrant a team
- For tmux mode: verify tmux is installed (`which tmux`)

### Teammate Stops on Error

If a teammate stops after encountering an error:
- Check their output via Shift+Up/Down (in-process) or click pane (tmux)
- Send additional instructions via SendMessage
- Spawn a replacement teammate if needed

### Lead Implements Instead of Delegating

If the lead starts implementing tasks directly:
- Tell the lead: "Wait for your teammates to complete their tasks before proceeding"
- Enable delegate mode to restrict the lead to coordination-only tools

### Orphaned Sessions

If a team session persists after completion:
- Use TeamDelete to clean up team resources
- For tmux: `tmux ls` to check for orphaned sessions, `tmux kill-session -t <name>` to remove

## Limitations

Current limitations of built-in agent teams:

- **No session resumption with in-process teammates**: `/resume` and `/rewind` do not restore in-process teammates
- **Task status can lag**: teammates may not always mark tasks as completed promptly
- **One team per session**: a lead can only manage one team at a time
- **No nested teams**: teammates cannot spawn their own *teams* (via TeamCreate), but teammates CAN and MUST spawn their own *agents* (via `/run` which creates controllers + execution agents)
- **Lead is fixed**: cannot promote a teammate to lead
- **Split panes require tmux**: not supported in VS Code terminal, Windows Terminal, or Ghostty

**IMPORTANT distinction**: "No nested teams" means teammates cannot create sub-teams via TeamCreate. However, teammates absolutely CAN and MUST invoke `/run` via the Skill tool, which spins out controllers and execution agents. This is the core architecture -- each teammate is an orchestration node that delegates to specialists.

## Related Files

- `core/agents/team-trigger/SKILL.md` - Team initialization
- `core/agents/team-lead-adapter/SKILL.md` - Controller-to-lead wrapper
- `.claude/rules/core/teams.md` - Team coordination patterns
- `docs/TEAM_MODE.md` - Full documentation

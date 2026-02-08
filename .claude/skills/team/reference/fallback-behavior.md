# /team Fallback Behavior

## Execution Method Detection

Before any team operation, detect the best available execution method:

```bash
# Priority 1: tmux (default)
command -v tmux >/dev/null 2>&1

# Priority 2: Agent Teams API
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS === '1'

# Priority 3: Parallel /run (always available)
```

## Method 1: tmux (Default)

When tmux is available, create a tmux session with one window per work item:

```bash
tmux new-session -d -s "cagents-team-${SESSION_ID}" -n "lead"
tmux new-window -t "cagents-team-${SESSION_ID}" -n "wi-001"
tmux send-keys -t "cagents-team-${SESSION_ID}:wi-001" \
  "claude --print '/run implement WI-001: ${item.description} from team session ${SESSION_ID}'" Enter
```

**Advantages**: True visual parallelism, user can watch all agents work simultaneously.

## Method 2: Agent Teams API

If Agent Teams is enabled:

```javascript
spawnTeam({
  members: [
    { name: "member-1", type: "general-purpose" },
    { name: "member-2", type: "general-purpose" }
  ]
});
```

**Advantages**: Peer-to-peer messaging, self-claiming, dynamic rebalancing.

## Method 3: Parallel /run (Always Available)

Fallback when neither tmux nor Agent Teams is available:

```javascript
// Each work item gets its own /run -- parallel invocations
Skill({ skill: "run", args: `implement WI-001: ${item1.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-002: ${item2.description} from team session ${session_id}` })
Skill({ skill: "run", args: `implement WI-003: ${item3.description} from team session ${session_id}` })
```

**Limitations**:
- No peer-to-peer messaging
- No self-claiming (direct assignment only)
- Sequential result aggregation

**Notification**:
```
tmux and Agent Teams not available. Using parallel /run invocations.
Team features (visual parallelism, peer messaging) disabled.
Each work item receives full /run orchestration for quality.
```

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

## Related Files

- `core/agents/team-trigger/SKILL.md` - Team initialization
- `core/agents/team-lead-adapter/SKILL.md` - Controller-to-lead wrapper
- `.claude/rules/core/teams.md` - Team coordination patterns
- `docs/TEAM_MODE.md` - Full documentation

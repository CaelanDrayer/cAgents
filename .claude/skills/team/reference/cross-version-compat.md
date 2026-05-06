# Cross-Version Compatibility

Minimum Claude Code version table, env var propagation rules, and hook input schema stability for /team.

## Minimum Claude Code Version

**Minimum CC version**: >= 2.1.69 (declared in frontmatter `compatibility` field)

| Feature | Minimum CC Version | Notes |
|---------|-------------------|-------|
| `TeamCreate` / `TeamDelete` | 2.1.69 | Core agent teams API |
| `SendMessage` (direct + broadcast) | 2.1.69 | Teammate communication |
| `TaskCreate` / `TaskUpdate` / `TaskList` | 2.1.69 | Shared task list coordination |
| `settings.json` `env` block propagation | 2.1.x | Required for `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to reach subagents |
| `SendMessage` auto-resume of stopped teammates | 2.1.77 | Re-activate stopped teammates without fresh spawn |
| `isolation: "worktree"` in Task calls | 2.1.72 | Git worktree isolation for parallel file safety |
| `ExitWorktree` tool | 2.1.72 | Clean exit from worktree-isolated subagents |
| `teammateMode: "tmux"` | 2.1.69 | Requires tmux installed on host |
| `teammateMode: "in-process"` | 2.1.69 | Works in any terminal |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | 2.1.74 | Extend SessionEnd hook timeout |

## Environment Variable Propagation

The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var is set in `.claude/settings.json` under `env`. Claude Code injects these vars into the environment of all hooks and subagents. If this var is not set (e.g., settings.json env block not supported by the CC version), the team-start hook logs a warning and /team falls back to parallel Task execution without TeamCreate.

## Model-Agnostic Spawning

All teammate Task calls use `subagent_type: "cagents:{name}"` which is routed by Claude Code's model routing layer. No hardcoded model assumptions exist in team hooks or spawning templates. Teammates run on whatever model Claude Code assigns based on `model_routing.yaml` and environment configuration.

## Hook Input Schema Stability

Team hooks (`team-start`, `team-task-complete`, `teammate-idle-handler`, `team-stop`) use defensive field access with fallback defaults for all input fields (`team_name || ''`, `teammate_name || 'teammate'`, `task_id` with multi-level extraction). This ensures hooks do not crash if Claude Code changes the hook input schema across versions.

## Configuration

- Pipeline config: `cagents-memory/_system/config/pipeline_config.yaml`
- Org pipeline config: `cagents-memory/_system/config/org_pipeline_config.yaml`
- `teammateMode` in settings.json controls display: `"tmux"` (split panes), `"auto"`, `"in-process"`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` must be `"1"` in settings.json env
- Both are already configured in this project's settings.json

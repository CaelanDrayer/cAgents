# Cross-Version Compatibility

Minimum Claude Code version table, env var propagation rules, and hook input schema stability for /team.

## Minimum Claude Code Version

**Minimum CC version**: >= 2.1.69 (declared in frontmatter `compatibility` field)

| Feature | Version | Notes |
|---------|---------|-------|
| `TeamCreate` / `TeamDelete` | **REMOVED in 2.1.178** | Do NOT call. Agent teams are now implicit — nothing to create, cleanup is automatic at session end. |
| Concurrent `Agent()` waves (DEFAULT model) | any | Spawn all wave-K subagents as concurrent `Agent()` calls in one message; works in every harness. |
| Subagent nesting to depth 5 | 2.1.172 | Subagents retain `Agent` and spawn execution agents + reviewers up to 5 levels deep. |
| `Agent({ run_in_background })` background-by-default | 2.1.198 | Subagents run in background unless `run_in_background: false`; the default wave path uses `false` for synchronous collection. |
| `SendMessage` (direct + broadcast) | 2.1.69 | Named-teammate communication (experimental path). |
| `TaskCreate` / `TaskUpdate` / `TaskList` / `TaskGet` | 2.1.69 | Shared task list coordination (present). |
| `settings.json` `env` block propagation | 2.1.x | Required for `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to reach subagents (experimental path). |
| `SendMessage` auto-resume of stopped teammates | 2.1.77 | Re-activate a stopped named teammate by name without a fresh spawn (experimental path). |
| `isolation: "worktree"` in Agent calls | 2.1.72 | Git worktree isolation for parallel file safety. |
| `ExitWorktree` tool | 2.1.72 | Clean exit from worktree-isolated subagents. |
| `teammateMode: "in-process"` (default since 2.1.179) | 2.1.179 | Default display; works in any terminal. |
| `teammateMode: "tmux"` / `"iterm2"` panes | 2.1.69 | EXPERIMENTAL path only; requires tmux / iTerm2 on host. |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | 2.1.74 | Extend SessionEnd hook timeout. |

## Environment Variable Propagation

The `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var is set in `.claude/settings.json` under `env`. Claude Code injects these vars into the environment of all hooks and subagents. This var gates the OPTIONAL experimental named-background-teammate path only. The DEFAULT concurrent-`Agent()` wave path does not depend on it — when the var is unset or the experimental feature is unavailable, `/team` runs the default concurrent-Agent path, which works in every harness.

## Model-Agnostic Spawning

All subagent Task calls use `subagent_type: "cagents:{name}"` which is routed by Claude Code's model routing layer. No hardcoded model assumptions exist in team hooks or spawning templates. Subagents run on whatever model Claude Code assigns based on `model_routing.yaml` and environment configuration.

## Hook Input Schema Stability

Team hooks (`team-start`, `team-task-complete`, `teammate-idle-handler`, `team-stop`) use defensive field access with fallback defaults for all input fields (`team_name || ''`, `teammate_name || 'teammate'`, `task_id` with multi-level extraction). This ensures hooks do not crash if Claude Code changes the hook input schema across versions.

## Configuration

- Pipeline config: `cagents-memory/_system/config/pipeline_config.yaml`
- Org pipeline config: `cagents-memory/_system/config/org_pipeline_config.yaml`
- `teammateMode` in settings.json controls display on the experimental path only: `"in-process"` (default since 2.1.179), `"tmux"` / `"iterm2"` (experimental panes), `"auto"`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` = `"1"` in settings.json env keeps the OPTIONAL experimental named-teammate path available; the DEFAULT concurrent-Agent path does not require it
- Both are configured in this project's settings.json

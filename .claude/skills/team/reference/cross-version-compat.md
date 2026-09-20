# Cross-Version Compatibility

This file gives the table of minimum Claude Code versions. It also gives the
rules for env var propagation, and the stability of the hook input schema for
/team.

## Minimum Claude Code Version

**Minimum CC version**: >= 2.1.69. The frontmatter `compatibility` field
declares it.

| Feature | Version | Notes |
|---------|---------|-------|
| `TeamCreate` / `TeamDelete` | **REMOVED in 2.1.178** | Do NOT call. Agent teams are now implicit. There is nothing to create, and cleanup is automatic at session end. |
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

The file `.claude/settings.json` sets the
`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var under `env`. Claude Code puts
these vars into the environment of all hooks and all subagents. This var gates
one path only. That path is the optional experimental path with named
background teammates. The default wave path uses concurrent `Agent()` calls,
and it does not depend on the var.

The var can be unset. The experimental feature can also be unavailable. In each
of those two cases, `/team` runs the default concurrent-Agent path. That path
works in every harness.

## Model-Agnostic Spawning

Every subagent Task call uses `subagent_type: "cagents:{name}"`. The model
routing layer of Claude Code then routes that call. The team hooks and the
spawning templates hold no hardcoded model. Claude Code assigns the model for
each subagent. It uses `model_routing.yaml` and the configuration of the
environment.

## Hook Input Schema Stability

Four team hooks read their input fields defensively. The hooks are
`team-start`, `team-task-complete`, `teammate-idle-handler`, and `team-stop`.
Each input field has a fallback default. The defaults are `team_name || ''` and
`teammate_name || 'teammate'`. The `task_id` field uses extraction at more than
one level. If Claude Code changes the hook input schema between versions, the
hooks do not crash.

## Configuration

- Pipeline config: `cagents-memory/_system/config/pipeline_config.yaml`
- Org pipeline config: `cagents-memory/_system/config/org_pipeline_config.yaml`
- `teammateMode` in settings.json controls the display on the experimental path
  only. Its values are `"in-process"`, which is the default since 2.1.179,
  `"tmux"` and `"iterm2"` for the experimental panes, and `"auto"`
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` = `"1"` in the settings.json env block
  keeps the optional experimental named-teammate path available. The default
  concurrent-Agent path does not need it
- This project's settings.json sets both of them

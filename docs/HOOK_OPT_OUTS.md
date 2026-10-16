# Hook Opt-Outs

This page lists every switch that relaxes or tunes a cAgents guard hook. Use a
switch when a hook gets in your way. Do not disable the hook.

## Opt out, do not disable

A disabled hook loses all of its checks. A switch relaxes one check and keeps
the others on. One example is `write-edit-dispatch.cjs`. It runs secret
detection first, on every Write and Edit. If you remove that hook to stop a
delegation deny, you also lose secret detection and the protected-path block.
Use `CAGENTS_DELEGATION_ENFORCEMENT=warn` instead.

## The switches

Each env var below is read by a file in `.claude/hooks/`. A value that a hook
does not know falls back to the default.

| Hook | What it guards | Env var or settings key | Values | What stays on |
|---|---|---|---|---|
| `bash-validator.cjs` | Bash commands: denies for catastrophic shapes, asks for risky ones | `CAGENTS_BASH_GUARD`, or the settings key `cagents.bash_guard`. The env var wins. | `block` (default), `warn`, `off`. An unknown value gives `block`. | Under `warn`, an obfuscation-class deny becomes an ask. Under `off`, an ask becomes an allow, with one stderr line. Every deny stays a deny, except the legacy obfuscation-class belt denies (for example `python3 -c os.system`), which `off` skips. Under `off` these still ask: a parse-failure ask; a loader env var (`LD_*`, `DYLD_*`, `BASH_ENV`, `BASH_FUNC_*`, `SHELLOPTS`, `BASHOPTS`, `PS4`, and `NODE_OPTIONS` beyond resource flags); and a Bash write to `.claude/settings*.json` or `.claude/hooks/`. See `docs/SECURITY_BASH_GUARD_THREAT_MODEL.md` §7.3. |
| `secret-detection.cjs`, run by `write-edit-dispatch.cjs` | Secrets in written files | `CAGENTS_SECRET_MODE` | `block` (default), `sanitize`. Any other value gives `block`. | There is no `off`. `sanitize` replaces each secret with a `BLOCK_<hex>` placeholder, and `secret-restore.cjs` restores the file at Stop. The protected-path block (`/etc/`, `/usr/`, `~/.ssh/` and more) stays on in both modes. |
| `controller-delegation-validator.cjs`, run by `write-edit-dispatch.cjs` | A controller that writes to `src/`, `lib/`, `components/`, `app/`, `services/`, or `middleware/` | `CAGENTS_DELEGATION_ENFORCEMENT`, or the key `delegation_enforcement` in the plugin `.claude/settings.json`. The env var wins. | `block` (default), `warn`, `off` | Secret detection and the skill-size check in the same dispatcher. The check fires only while a cAgents controller is active, so a direct user edit is never denied. |
| `skill-size-monitor.cjs`, run by `write-edit-dispatch.cjs` | `SKILL.md` size | `CAGENTS_SKILL_WARN_LINES`, `CAGENTS_SKILL_BLOCK_LINES` | Line counts. The defaults are 600 (warn) and 900 (block). | Secret detection and the delegation check. Set the block value higher for a one-off large write, then set it back. |
| `verify-completion.cjs` (Stop) | A stop in the middle of a pipeline | `CAGENTS_STALE_CHILD_MS` | Milliseconds. The default is 1800000 (30 min). | A child agent with `stopped_at: null` that is younger than this value counts as live, so Stop allows and writes nothing. An older child counts as stale, and the normal checks run. |
| `verify-completion.cjs` (Stop) | A stop in the middle of a pipeline | Pause markers in the session dir: `paused_at` or `paused_reason` in `status.yaml`, or a file at `<session>/signals/PAUSE` | Any non-null value, or the file exists | No env var. A paused session in a non-terminal state stops with no block and no writes. Remove the marker to get the normal checks back. |
| `verify-completion.cjs`, `team-stop.cjs`, `session-catchup.cjs` | The heartbeat window that marks a session as active | `CAGENTS_SESSION_LIVENESS_MS` | Milliseconds. The default is 60000 (60 s). | All checks. The value changes only how fresh a `last_updated_at` heartbeat must be. |
| `team-stop.cjs` | A `/team` lead that is idle between waves | `CAGENTS_IDLE_LEAD_MAX_MS` | Milliseconds. The default is 24 h. | All checks. An idle lead older than this value gets the normal teardown. |
| `hook-utils.cjs` (all hooks) | Duplicate runs of one event when the plugin and the project both register a hook | `CAGENTS_HOOK_DEDUP_DISABLE` | `1` turns dedup off. Any other value keeps it on. | Every hook still runs. A duplicate event runs twice, so you can see two messages. |
| `prompt-router.cjs` | Routing suggestions on a plain-language prompt | `CAGENTS_ROUTING_SUGGESTIONS` | Off by default. `1`, `true`, `on`, or `yes` turns it on. | The delegation reminder for `/act` and `/team` is always on. |

## Set an env var

Put the var in the `env` block of a Claude Code settings file. Claude Code
passes the block to each hook. Use a string value, also for a number.

```json
{
  "env": {
    "CAGENTS_BASH_GUARD": "warn",
    "CAGENTS_STALE_CHILD_MS": "3600000"
  }
}
```

Use one of these files:

- `~/.claude/settings.json` for all of your projects.
- `.claude/settings.json` in the project, to share the value with your team.
- `.claude/settings.local.json` in the project, for your machine only.

For the bash guard you can also use the settings key in place of the env var:

```json
{
  "cagents": { "bash_guard": "warn" }
}
```

The hook reads that key from the project `.claude/settings.local.json`, then
from the project `.claude/settings.json`, then from the plugin
`settings.json`. If an `env` block also sets `CAGENTS_BASH_GUARD`, the env var
wins. The cAgents repo itself sets `CAGENTS_BASH_GUARD` to `block` in its
`.claude/settings.json` `env` block.

### Windows and Git Bash

The `env` block works the same on Windows. Use it in preference to a shell
profile, because Claude Code runs hooks with `node` and not always from your
shell. Write paths in a settings file with forward slashes, such as
`C:/Users/you/.claude/settings.json`.

If you set a var in the shell, start Claude Code from that same shell:

- Git Bash: add `export CAGENTS_BASH_GUARD=warn` to `~/.bashrc`.
- PowerShell: run `$env:CAGENTS_BASH_GUARD = "warn"` for the current window,
  or `setx CAGENTS_BASH_GUARD warn` for new windows.

## See also

- `docs/SECURITY_BASH_GUARD_THREAT_MODEL.md`: what the bash guard catches,
  and the residuals in §7.
- `.claude/rules/core/resources/hook-catalog.md`: the detail of each hook.
- `.claude/rules/playbooks/pat-concurrent-session-hooks.md` § Writing commands
  that pass the bash guard: command shapes that do not ask.

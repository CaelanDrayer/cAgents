---
paths:
  - ".claude/rules/core/hooks.md"
  - ".claude/rules/core/resources/hook-catalog.md"
  - ".claude/hooks/**"
  - ".claude/settings*.json"
  - "scripts/lint-hooks.cjs"
  - "tests/hooks/**"
---

# cAgents Hook System

33 .cjs files = 25 unique registered hooks across 17 event types.
cAgents also has 5 dispatched sub-validators and 3 non-hook utilities. See the Architecture section below. See @resources/hook-catalog.md for the detail of each hook.

> **Count generator (A2-11, v12.x)**: `scripts/lint-hooks.cjs` derives the counts 33, 25, and 17 from disk. It counts the `.cjs` files, and it parses
> `.claude/settings.json` for the unique registered hook names and the event keys. It then asserts that the inventory is internally consistent, with
> `hook_files === registered + dispatched + utilities`. Run `node scripts/lint-hooks.cjs` after you add a hook or remove one. Then update the hardcoded
> counts in this doc, in `CLAUDE.md`, and in the `$comment` of `settings.json`. `tests/hooks/lint-hooks.test.js` guards the script.
> Since v12.76.0 (HS-9, WI-11) `scripts/ci/validate-agents.sh` reads the "N unique registered hooks" claim from the `$comment` of `settings.json`. It also compares the hook names in `settings.json` with the names in `.claude/hooks.json`, so update both files together.
> D1 (WI-15, v12.76.0) deleted `permission-handler.cjs`, so the counts went from 34, 26, and 18 to 33, 25, and 17.

## Architecture

cAgents uses one CJS hook system, and `.claude/settings.json` configures it:

- **CJS hooks** (`.claude/hooks/`): 25 unique registered hooks, plus 5 dispatched sub-validators, plus 3 non-hook utilities. `write-edit-dispatch.cjs` and `agent-dispatch.cjs` run the sub-validators in process. The
  3 utilities are `hook-utils.cjs`, the `run-hook.cjs` launcher, and `bash-guard-evaluator.cjs`, a pure GuardFall evaluator library that `bash-validator.cjs` requires and that is neither registered nor dispatched
  (v12.34.0). Every hook uses the `createHook()` factory from `hook-utils.cjs`, which removes the boilerplate: the stdin reading, the try-catch, and the JSON output. `eval-runner.cjs` is
  a standalone CLI that A2-10 moved to `scripts/`, so it no longer counts under `.claude/hooks/`.
- **Write|Edit dispatcher** (`write-edit-dispatch.cjs`, v12.19.0, D1b): one deny-first PreToolUse[Write|Edit] entry that runs three sub-validators in process: `secret-detection.cjs`, `controller-delegation-validator.cjs`, and `skill-size-monitor.cjs`. The security sub-validators fail CLOSED.
  This entry replaced three separate `Write|Edit` registrations, and it cut the cold-start node spawns per Write|Edit from 3 to 1.
- **Agent dispatcher** (`agent-dispatch.cjs`, A2-12): one deny-first PreToolUse[Agent] entry that runs two sub-validators in process: `session-init-gate.cjs` and `model-routing-advisor.cjs`. Both are advisory, and both fail OPEN.
  The session-init-gate allows when no owned session exists. Since v12.76.0 (HS-7, WI-19 F2) a logic throw inside it also allows, with one `[FAIL-OPEN]` systemMessage and one stderr line. An I/O error allows too. `AgentDispatch` itself stays fail-closed: a fault in the dispatcher outside the sub-gate try/catch denies. This entry replaced three separate `Agent` registrations, and it cut the cold-start node spawns per Agent spawn from
  3 to 1. A2-04 dropped the former `prompt-router.cjs` PreToolUse[Agent] `return null` no-op. A2-02 deleted `approval-gate.cjs`, because that hook was structurally dead: its `_data/policies/` dir
  and its `AGENT_MEMORY_DIR` env var never existed in production.
- **Prompt hooks**: None is active now. V9.6.2 removed the Stop prompt hook, because unreliable LLM JSON responses caused recurring validation failures. The `verify-completion.cjs` command
  hook gives the equivalent file-based verification.
- **Self-contained invocation with run-hook.cjs**: Claude Code calls every hook with `bash -c 'R="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"; node "$R/.claude/hooks/run-hook.cjs" <hook-name>'`. That bash wrapper holds a 3-tier fallback chain
  which resolves the plugin root: `CLAUDE_PLUGIN_ROOT`, then `CLAUDE_PROJECT_DIR`, then `pwd`. The wrapper then launches `run-hook.cjs`, which resolves the target hook path with `__dirname`.
- **Windows needs Git for Windows**: no registration sets a `shell` field, so each hook needs bash. Since Claude Code 2.1.299, a PreToolUse or PermissionRequest hook that sets no `shell` blocks the call when Git for Windows is missing. It no longer fails open. The guard hooks then deny every Bash, Write, Edit, and Agent call. Install Git for Windows (Git Bash) before you use cAgents on Windows.

### V9.5 Changes

The V9.5 refactoring removed the dual shell and JS architecture. That architecture caused recurring bugs: a duplicate output from the ERR EXIT trap, `set -euo pipefail` propagation, fd-redirection fragility, and a double JSON output from the dispatch. The `createHook()` factory, the `bash-validator.cjs` CJS hook, and the `findTeamSession()` helper replaced it. The matching CJS hooks absorbed the logic of `on-session-start.sh`, `on-session-end.sh`, `stop-workflow.sh`, `pre-write.sh`, and `pre-bash.sh`.

## Hook Types Overview

Claude Code supports 24 hook event types. cAgents implements 25 unique registered hooks across 17 of those events. cAgents also dispatches 5 sub-validators in
process: `write-edit-dispatch.cjs` dispatches 3, and `agent-dispatch.cjs` dispatches 2. Seven events have no cAgents hook, and they stay available for custom use: `PermissionRequest`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`,
`FileChanged`, `Elicitation`, and `ElicitationResult`. WI-15 (v12.76.0) unregistered the no-op `permission-handler.cjs` from `PermissionRequest`. LP-17 wired `ConfigChange` in v12.7.0.

| Hook Type | Trigger | cAgents Hook | Purpose |
|-----------|---------|--------------|---------|
| `SessionStart` | Session begins/resumes | `session-catchup.cjs` | Initialize state, detect incomplete sessions, inject cAgents context |
| `SessionEnd` | Session ends | `team-stop.cjs` | Finalize metrics, update status |
| `UserPromptSubmit` | User submits prompt | `prompt-router.cjs` | Enforce delegation rules + suggest routing (P1-7: consolidated the former `delegation-enforcer.cjs` + `magic-keywords.cjs`) |
| `PreToolUse` | Before tool execution | `bash-validator.cjs` (Bash), `write-edit-dispatch.cjs` (Write\|Edit: dispatches secret-detection, controller-delegation-validator, and skill-size-monitor in process), `agent-dispatch.cjs` (Agent: dispatches session-init-gate and model-routing-advisor in process). See the catalog. | Validate, block dangerous ops, enforce session-presence gate |
| `ConfigChange` | Config file changed | `config-change-logger.cjs` | Log config changes (LP-17, v12.7.0) |
| `PostToolUse` | After tool execution | `post-write-validator.cjs`, `validator-evidence-recheck.cjs`, `spawn-footprint.cjs` (Agent) | Validate JSON/YAML syntax, audit file changes, re-verify cited evidence, record spawn token footprints (diagnostic only) |
| `PostToolUseFailure` | Tool execution fails | `tool-failure-tracker.cjs` | Track failures, detect patterns, suggest recovery |
| `Notification` | Status notification | `notification.cjs` | Log and track |
| `SubagentStart` | Subagent spawned | `subagent-tracker.cjs`, `team-start.cjs`, `role-manifest-injector.cjs` | Log spawns, initialize team monitoring, inject the spawned role's rules pointer index + memory-layout stanza |
| `SubagentStop` | Subagent finishes | `subagent-stop-tracker.cjs` | Log completion, capture summaries + duration |
| `Stop` | Claude stops responding | `verify-completion.cjs`, `goal-evaluator-logger.cjs`, `secret-restore.cjs` | Verify completion; capture `/goal` reasons; restore sanitized secrets |
| `StopFailure` | Claude fails to stop cleanly | `stop-failure-handler.cjs` | Save recovery state |
| `TeammateIdle` | Teammate goes idle | `teammate-idle-handler.cjs` | Find available work or stop teammate (**experimental named-teammate path only**: a no-op on the default concurrent-Agent wave model) |
| `TaskCompleted` | Task finishes | `team-task-complete.cjs` | Update task list, unblock dependencies, stop teammate when done (**experimental named-teammate path only**: a no-op on the default concurrent-Agent wave model) |
| `InstructionsLoaded` | Instructions/CLAUDE.md loaded | `instructions-loaded.cjs` | Validate rules dir, inject active session context |
| `PreCompact` | Before context compaction | `pre-compact-save.cjs` | Save critical state + coordination state |
| `PostCompact` | After context compaction | `post-compact-restore.cjs` | Log workflow context to disk after compaction (no systemMessage per thinking-block-immutability contract; model reads plan.yaml + coordination_log.yaml directly) |

**Team-hook scope note (Claude Code v2.1.178+)**: The default execution model of `/team` is **concurrent-Agent waves**, so its teams are implicit. Claude Code 2.1.178 removed the `TeamCreate` tool and the `TeamDelete` tool. The interactive team hooks therefore apply to the optional experimental named-background-teammate path only, which `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` gates. Three hooks serve that path: `TeammateIdle` (`teammate-idle-handler.cjs`), `TaskCompleted` (`team-task-complete.cjs`), and `team-start.cjs` (SubagentStart). All three are no-ops on the default concurrent-Agent wave model, and all three stay registered. Their **event names do not change, and the file count, the registered count, and the event count do not change**. `team-stop.cjs` (SessionEnd) is the exception. Its session-teardown work covers the agent-tree cleanup, `execution_summary.yaml`, and the SDK-UUID pointer unlink, and it runs for **every** session type.

See @resources/hook-catalog.md for the full detail of each hook. It covers the matchers, the inputs, the outputs, and the side effects. It also holds
the Secret Detection pattern catalog.

### Matcher Patterns by Event

| Event | What matcher filters | Example values |
|-------|---------------------|----------------|
| `SessionStart` | How session started | `startup`, `resume`, `clear`, `compact` |
| `SessionEnd` | Why session ended | `clear`, `logout`, `prompt_input_exit`, `other` |
| `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest` | Tool name | `Bash`, `Edit\|Write` |
| `Notification` | Notification type | `permission_prompt`, `idle_prompt`, `auth_success` |
| `SubagentStart`, `SubagentStop` | Agent type name | `Bash`, `Explore`, `Plan`, custom agent names |
| `PreCompact` | Compaction trigger | `manual`, `auto` |
| `ConfigChange` | Config source | `user_settings`, `project_settings`, `local_settings`, `skills` |
| `UserPromptSubmit`, `Stop`, `StopFailure`, `TeammateIdle`, `TaskCompleted`, `InstructionsLoaded`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `PostCompact` | *(no matcher)* | Always fires on every occurrence |

## Concurrency Contract (v12.73.0+)

Two cAgents sessions can share one directory. Every hook then acts only on a session that its payload `session_id` (the transcript UUID) owns. Ownership lives in the
`sessions/{sid}/session.sdk_id` marker and the `_system/sdk_session_map/{uuid}` pointer. A foreign marker beats a stale pointer. `hook-utils.cjs` exports `getSessionOwner`, `isOwnedBy`, `resolveOwnedSession`, and `claimSession`.
`post-write-validator.cjs` claims an unclaimed session when a transcript writes its `status.yaml` or `instruction.yaml` (claim-on-write). It never steals a foreign session.
Since v12.76.0 (HS-1, WI-7) `claimFromAnyWrite` also claims from a Bash command, through a `PostToolUse` entry with `matcher: "Bash"`.

Since v12.76.0, 7 hooks resolve their session with `resolveSession(input, { purpose })` (HS-1), and 8 hooks still use `findActiveSession`. `session-catchup.cjs` runs its own liveness-aware scan. The chain is ownership, then a prompt hint, then a pin or `CAGENTS_ACTIVE_SESSION`, then `null`. It has no newest-mtime step, and it drops a session that another transcript owns.

No owned session means no-op. Stop allows, SessionEnd skips finalization, governance allows, and the trackers log only to `_system/logs/agent_spawns.log`. An unclaimed session is used only when a prompt hint, a pin, or `CAGENTS_ACTIVE_SESSION` names it. The trackers append spawn and stop events to `workflow/events.jsonl` (HS-6). `agent_tree.yaml` is a view that hooks derive from it, so do not edit the tree by hand.

Writes stay lock-protected, catchup stays liveness-aware, and secret restore stays session-bound. See @.claude/rules/playbooks/pat-concurrent-session-hooks.md and @resources/hook-catalog.md § Cross-Cutting Contracts for the chain, the hook list, the event log, and the Stop-path rules (HS-4, HS-10, HS-11, idle lead).

## createHook() Factory

Every hook uses the `createHook(name, handler)` factory from `hook-utils.cjs`:

```javascript
const { createHook } = require('./hook-utils.cjs');

createHook('MyHook', async (input) => {
  // input = parsed JSON from stdin

  // Return null for no-op (outputs {"continue": true})
  if (!relevant) return null;

  // Return deny shorthand for PreToolUse blocks
  return { deny: true, reason: 'Blocked because ...' };

  // Return allow shorthand for PreToolUse approvals
  return { allow: true, reason: 'Safe operation', hookEvent: 'PreToolUse' };

  // Return system message
  return { continue: true, systemMessage: 'Info for the model...' };

  // Return block decision for Stop hooks
  return { decision: 'block', reason: 'Not complete yet' };

  // Return stop signal for TeammateIdle/TaskCompleted (V10.5.0)
  return { continue: false, stopReason: 'All work items completed' };
});
```

**The factory handles**:

- stdin reading with a fallback deadline (`STDIN_FALLBACK_MS`, 2000 ms). That deadline must stay strictly below the smallest registered hook `timeout` in `.claude/settings.json`. At 3000
  ms it tied the `timeout: 3` of `PreToolUse[Agent]` and of `UserPromptSubmit`, and the harness then cancelled those hooks before they could emit a verdict. Since v12.76.0 (F3, WI-19) the `PreToolUse[Agent]` timeout is 5.
  `tests/hooks/stdin-fallback-below-hook-timeout.test.js` pins the deadline.
- JSON parsing with graceful fallback to `{}`
- Early verdict and exit (HS-3, WI-2): the reader parses a complete JSON object before EOF. After the verdict the factory destroys stdin. A 1.5 s unref'd backstop then calls `process.exit`.
- Payload policy (HS-3, W5, HS-7, WI-19 F1): a guard hook (`BashValidator`, `WriteEditDispatch`, `AgentDispatch`) denies a truncated payload. It allows an empty payload, at EOF or at the deadline, with one `[FAIL-OPEN]` systemMessage. See @resources/hook-catalog.md § Payload Policy for the Guard Hooks.
- Dedup backstop (HS-2, WI-4): an identical payload inside 5 s (`DEDUP_TTL_MS`) replays the first verdict. See @resources/hook-catalog.md § Cross-Cutting Contracts.
- Try-catch wrapping (errors produce `{"continue": true}`)
- Result transformation (`deny` shorthand -> full hookSpecificOutput)
- Single JSON output to stdout (no double-output possible)

## Hook Input/Output

### Input (stdin)

A hook receives JSON on stdin:

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

A hook writes JSON to stdout:

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

An exit code applies to a command hook only. An HTTP hook signals success or failure with the HTTP response status code. A 2xx
code is a success, and a code that is not 2xx can block, depending on the event. A prompt hook and an agent hook
signal through their LLM response.

- `0`: Success. Claude Code parses the JSON from stdout. To block a PreToolUse operation, use `permissionDecision: "deny"` in `hookSpecificOutput`. For most events, Claude Code
  shows stdout in verbose mode only (Ctrl+O). `UserPromptSubmit` and `SessionStart` are the exceptions, because they add stdout as context that Claude can see.
- `2`: Blocking error. Claude Code ignores the stdout JSON, and it feeds stderr to the model. The effect depends on the event:
  - **Can block**: `PreToolUse` (blocks tool call), `PermissionRequest` (denies permission), `UserPromptSubmit` (blocks prompt), `Stop` (prevents stopping), `StopFailure` (prevents stop-failure handling), `SubagentStop` (prevents stop), `TeammateIdle` (keeps
    working), `TaskCompleted` (prevents completion), `ConfigChange` (blocks change), `WorktreeCreate` (fails creation)
  - **Cannot block**: `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SessionStart`, `SessionEnd`, `PreCompact`, `PostCompact`, `InstructionsLoaded`, and `WorktreeRemove`. Claude Code shows stderr to the user only.
- Any other exit code: Non-blocking error, stderr shown in verbose mode, execution continues.

## Hook Handler Types

Claude Code supports four hook handler types:

- **Command hook** (`type: "command"`): It runs a shell command, receives JSON on stdin, and signals through the exit code and the stdout JSON.
- **HTTP hook** (`type: "http"`): It sends an HTTP POST request to a URL endpoint. Use it for an external integration, for a webhook, or
  for logging to an external service.
- **Prompt hook** (`type: "prompt"`): It uses an LLM to evaluate a condition. The LLM returns a yes decision or a no decision.
- **Agent hook** (`type: "agent"`): It spawns a subagent with tool access to Read, Grep, and Glob. The subagent then checks a condition.

### Handler Fields

| Handler | Field | Required | Description |
|---------|-------|----------|-------------|
| command | `type` | yes | `"command"` |
| command | `command` | yes | Shell command to execute |
| command | `timeout` | no | Seconds before canceling (default: 600) |
| command | `async` | no | If `true`, runs in background without blocking |
| command | `statusMessage` | no | Custom spinner message while hook runs |
| command | `once` | no | If `true`, runs once per session then removed (skills only) |
| http | `type` | yes | `"http"` |
| http | `url` | yes | URL endpoint to POST to (receives JSON payload) |
| http | `headers` | no | Custom HTTP headers as key-value pairs |
| http | `timeout` | no | Seconds before canceling (default: 30) |
| prompt | `type` | yes | `"prompt"` |
| prompt | `prompt` | yes | Prompt text. Use `$ARGUMENTS` for hook input JSON |
| prompt | `model` | no | Model for evaluation (defaults to fast model) |
| prompt | `timeout` | no | Seconds before canceling (default: 30) |
| agent | `type` | yes | `"agent"` |
| agent | `prompt` | yes | Prompt text. Use `$ARGUMENTS` for hook input JSON |
| agent | `model` | no | Model for evaluation |
| agent | `timeout` | no | Seconds before canceling (default: 60) |

**Supported events (all four types)**: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `TaskCompleted`.

**Command hooks only** (http, prompt, and agent are not supported): `SessionStart`, `SessionEnd`, `SubagentStart`, `PreCompact`, `PostCompact`, `Notification`, `TeammateIdle`, `InstructionsLoaded`, `StopFailure`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`.

### Async Hooks

A command hook supports `"async": true`, which runs the hook in the background without blocking. Use it for logging, for analytics, or for a
notification that must not delay the tool execution.

```json
{
  "type": "command",
  "command": "./scripts/log-event.sh",
  "async": true
}
```

### Hooks in Skills and Agents

You can define a hook in the YAML frontmatter of a skill or a subagent. The hook is then scoped to that component's lifecycle:

```yaml
---
name: secure-ops
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/security-check.sh"
---
```

For a subagent, Claude Code converts a `Stop` hook to a `SubagentStop` event automatically.

For SessionStart context injection, use a command hook that returns `hookSpecificOutput.additionalContext`. Do not use a prompt hook. See `session-catchup.cjs` for the cAgents implementation.

## Creating Custom Hooks

### Using createHook() Factory (Recommended)

```javascript
#!/usr/bin/env node
const { createHook } = require('./hook-utils.cjs');

createHook('MyCustomHook', async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Your logic here...

  // Return null for pass-through
  return null;

  // Or return a result object
  return { continue: true, systemMessage: 'Context for the model' };
});
```

### Manual (for hooks outside the cAgents hook directory)

```javascript
#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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
  console.log(JSON.stringify({ continue: true }));
}

main();
```

## Hook Configuration

Register each hook in `.claude/settings.json`:

```json
{
  "hooks": {
    "HookType": [
      {
        "matcher": "ToolName",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'R=\"${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}\"; node \"$R/.claude/hooks/run-hook.cjs\" my-hook'",
            "timeout": 5
          }
        ]
      }
    ]
  }
}
```

The `bash -c` wrapper gives a 3-tier fallback chain that resolves the plugin root: `CLAUDE_PLUGIN_ROOT`, the official plugin env var, then `CLAUDE_PROJECT_DIR`, the project
dir of the user, then `$(pwd)` as the last resort.

## Best Practices

1. **Use createHook()**: It removes the boilerplate, and it guarantees the correct output format.
2. **Fast execution**: Keep each hook under 5 seconds.
3. **Graceful failure**: `createHook()` handles an error automatically, and it returns `{"continue": true}`. A hook in `FAIL_CLOSED_HOOKS` (now only `AgentDispatch`) denies on a logic throw instead. An I/O error allows for every hook.
4. **Clear logging**: Use `console.error()` for a log line, which goes to stderr. `createHook()` handles stdout.
5. **Idempotent**: A hook can run more than one time.
6. **Self-contained**: `js-yaml` is the one declared external dependency. Every hook that uses it wraps the require in a try-catch with a graceful degraded path,
   so no hook crashes at load when node_modules is absent. Everything else is built in to Node.js.
7. **State in files**: Store the state in cagents-memory, and not in memory.
8. **Single JSON output**: `createHook()` guarantees exactly one JSON output to stdout.

## Troubleshooting

### Hook not running

- Check `.claude/settings.json` for the registration.
- Make sure that the file permissions are correct (`chmod +x`).
- Make sure that `node` is in PATH.

### Hook blocks unexpectedly

- On Windows, if every Bash, Write, Edit, and Agent call is denied, install Git for Windows (see § Architecture).
- Check `permissionDecisionReason` in the output.
- Check the matcher pattern for PreToolUse.
- Do a manual test of the hook: `echo '{}' | node .claude/hooks/<name>.cjs`

### "SessionEnd hook...team-stop...failed: Hook cancelled"

- This message is expected when you cancel a session with Ctrl+C, with escape, or by closing Claude Code.
- Claude Code terminates a SessionEnd hook during the teardown, before the hook can finish.
- No data is lost, and no data is corrupted. Each file write has its own try-catch guard.
- The final metrics and the final status of the team session can stay un-updated, but that is harmless.

### SessionEnd hooks timing out

- Use `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` to extend the timeout (CC 2.1.74).
- Set it in your shell profile or in `.env`: `export CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=10000` (10 seconds)
- For `team-stop.cjs` which writes final metrics, `5000`–`10000` ms is recommended
- If a hook still times out after you extend the limit, check for blocking I/O or for a large file operation.

### Hook output not shown

- Make sure that the hook uses the `createHook()` factory, which handles the output correctly.
- Check that the JSON is valid: `echo '{}' | node .claude/hooks/<name>.cjs 2>/dev/null | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"`

## Related Files

- `.claude/settings.json`: the hook registration, which is the active configuration
- `.claude/hooks/hook-utils.cjs`: the shared utilities and the `createHook()` factory
- `cagents-memory/_system/config/hooks.yaml`: the config for the hook behavior
- `scripts/ci/cagents-ci.sh`: the CI runner for the hook lint and for the tests. Run `node scripts/lint-hooks.cjs` for the hook inventory.
- `cagents-memory/_system/evals/`: the evaluation framework

**Removed in V9.5**: the codebase no longer holds the legacy `hooks/` directory, `scripts/hook-dispatch.sh`, or `scripts/hook-dispatch-node.sh`.

---
paths:
  - ".claude/hooks/**"
  - ".claude/settings*.json"
---

# cAgents Hook System

32 .cjs files = 24 unique registered hooks across 18 event types, plus 5 dispatched sub-validators and 3 non-hook utilities. See the Architecture section below and @resources/hook-catalog.md for per-hook detail.

> **Count generator (A2-11, v12.x)**: the counts (32 / 24 / 18) are derivable
> from disk by `scripts/lint-hooks.cjs`, which counts `.cjs` files, parses
> `.claude/settings.json` for unique registered hook names + event keys, and
> asserts the inventory is internally consistent
> (`hook_files === registered + dispatched + utilities`). Run
> `node scripts/lint-hooks.cjs` after any hook add/remove and update the
> hardcoded counts in this doc, `CLAUDE.md`, and the `settings.json` `$comment`
> to match. `tests/hooks/lint-hooks.test.js` guards the script.

## Architecture

cAgents uses a unified CJS hook system configured in `.claude/settings.json`:

- **CJS hooks** (`.claude/hooks/`): 32 `.cjs` files = 24 unique registered hooks + 5 dispatched sub-validators (run in-process by `write-edit-dispatch.cjs` + `agent-dispatch.cjs`) + 3 non-hook utilities: `hook-utils.cjs`, `run-hook.cjs` launcher, and `bash-guard-evaluator.cjs` (pure GuardFall evaluator library `require`'d by `bash-validator.cjs`; neither registered nor dispatched — v12.34.0). All hooks use the `createHook()` factory from `hook-utils.cjs` which eliminates boilerplate (stdin reading, try-catch, JSON output). (`eval-runner.cjs` is a standalone CLI, relocated to `scripts/` in A2-10 — no longer counted under `.claude/hooks/`.)
- **Write|Edit dispatcher** (`write-edit-dispatch.cjs`, v12.19.0 / D1b): a single deny-first PreToolUse[Write|Edit] entry that runs three sub-validators in-process — `secret-detection.cjs`, `controller-delegation-validator.cjs`, and `skill-size-monitor.cjs`. The security sub-validators fail CLOSED. This replaced three separate `Write|Edit` registrations, cutting cold-start node spawns per Write|Edit from 3 → 1.
- **Agent dispatcher** (`agent-dispatch.cjs`, A2-12): a single deny-first PreToolUse[Agent] entry that runs two sub-validators in-process — `session-init-gate.cjs` (session-presence DENY gate, fail-CLOSED) and `model-routing-advisor.cjs` (advisory, fail-OPEN). This replaced three separate `Agent` registrations (the former `prompt-router.cjs` PreToolUse[Agent] `return null` no-op was dropped in A2-04), cutting cold-start node spawns per Agent spawn from 3 → 1. `approval-gate.cjs` was deleted in A2-02 (structurally dead — its `_data/policies/` dir + `AGENT_MEMORY_DIR` env never existed in production).
- **Prompt hooks**: None currently active. The Stop prompt hook was removed in V9.6.2 due to unreliable LLM JSON responses causing recurring validation failures. The `verify-completion.cjs` command hook provides equivalent file-based verification.
- **Self-contained invocation via run-hook.cjs**: All hooks are called via `bash -c 'R="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"; node "$R/.claude/hooks/run-hook.cjs" <hook-name>'` — a bash wrapper with a 3-tier fallback chain that resolves the plugin root (`CLAUDE_PLUGIN_ROOT` → `CLAUDE_PROJECT_DIR` → `pwd`), then launches `run-hook.cjs` which resolves the target hook path using `__dirname`.

### V9.5 Changes

The V9.5 refactoring eliminated the dual shell+JS architecture that caused recurring bugs (ERR EXIT trap duplicate output, `set -euo pipefail` propagation, fd-redirection fragility, double-JSON output from dispatch). Replaced with the `createHook()` factory, the `bash-validator.cjs` CJS hook, and the `findTeamSession()` helper. Logic from `on-session-start.sh`, `on-session-end.sh`, `stop-workflow.sh`, `pre-write.sh`, and `pre-bash.sh` was merged into the corresponding CJS hooks.

## Hook Types Overview

Claude Code supports 24 hook event types. cAgents implements 24 unique registered hooks across 18 of these events (plus 5 sub-validators dispatched in-process: 3 by `write-edit-dispatch.cjs`, 2 by `agent-dispatch.cjs`). Six events (`WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`, `Elicitation`, `ElicitationResult`) have no cAgents hooks but are available for custom use. (`ConfigChange` was wired in v12.7.0 LP-17.)

| Hook Type | Trigger | cAgents Hook | Purpose |
|-----------|---------|--------------|---------|
| `SessionStart` | Session begins/resumes | `session-catchup.cjs` | Initialize state, detect incomplete sessions, inject cAgents context |
| `SessionEnd` | Session ends | `team-stop.cjs` | Finalize metrics, update status |
| `UserPromptSubmit` | User submits prompt | `prompt-router.cjs` | Enforce delegation rules + suggest routing (P1-7: consolidated the former `delegation-enforcer.cjs` + `magic-keywords.cjs`) |
| `PreToolUse` | Before tool execution | `bash-validator.cjs` (Bash), `write-edit-dispatch.cjs` (Write\|Edit — dispatches secret-detection + controller-delegation-validator + skill-size-monitor in-process), `agent-dispatch.cjs` (Agent — dispatches session-init-gate + model-routing-advisor in-process) — see catalog | Validate, block dangerous ops, enforce session-presence gate |
| `ConfigChange` | Config file changed | `config-change-logger.cjs` | Log config changes (LP-17, v12.7.0) |
| `PermissionRequest` | Permission dialog | `permission-handler.cjs` | Auto-approve safe patterns, HITL gates |
| `PostToolUse` | After tool execution | `post-write-validator.cjs`, `validator-evidence-recheck.cjs` | Validate JSON/YAML syntax, audit file changes, re-verify cited evidence |
| `PostToolUseFailure` | Tool execution fails | `tool-failure-tracker.cjs` | Track failures, detect patterns, suggest recovery |
| `Notification` | Status notification | `notification.cjs` | Log and track |
| `SubagentStart` | Subagent spawned | `subagent-tracker.cjs`, `team-start.cjs` | Log spawns, initialize team monitoring |
| `SubagentStop` | Subagent finishes | `subagent-stop-tracker.cjs` | Log completion, capture summaries + duration |
| `Stop` | Claude stops responding | `verify-completion.cjs`, `goal-evaluator-logger.cjs`, `secret-restore.cjs` | Verify completion; capture `/goal` reasons; restore sanitized secrets |
| `StopFailure` | Claude fails to stop cleanly | `stop-failure-handler.cjs` | Save recovery state |
| `TeammateIdle` | Teammate goes idle | `teammate-idle-handler.cjs` | Find available work or stop teammate (**experimental named-teammate path only** — no-op on the default concurrent-Agent wave model) |
| `TaskCompleted` | Task finishes | `team-task-complete.cjs` | Update task list, unblock dependencies, stop teammate when done (**experimental named-teammate path only** — no-op on the default concurrent-Agent wave model) |
| `InstructionsLoaded` | Instructions/CLAUDE.md loaded | `instructions-loaded.cjs` | Validate rules dir, inject active session context |
| `PreCompact` | Before context compaction | `pre-compact-save.cjs` | Save critical state + coordination state |
| `PostCompact` | After context compaction | `post-compact-restore.cjs` | Log workflow context to disk after compaction (no systemMessage per thinking-block-immutability contract; model reads plan.yaml + coordination_log.yaml directly) |

Four events (`WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`) are available for custom use; cAgents does not register handlers. (`ConfigChange` was wired to `config-change-logger.cjs` in LP-17 / v12.7.0 — see table above.)

**Team-hook scope note (Claude Code v2.1.178+)**: since `/team`'s DEFAULT execution model is **concurrent-Agent waves** (implicit teams — `TeamCreate`/`TeamDelete` were removed in 2.1.178), the interactive team hooks apply only to the OPTIONAL experimental named-background-teammate path (gated on `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Specifically, `TeammateIdle` (`teammate-idle-handler.cjs`) and `TaskCompleted` (`team-task-complete.cjs`), plus `team-start.cjs` (SubagentStart), serve the experimental path and are no-ops on the default concurrent-Agent path. All three remain registered; their **event names and the file/registered/event counts are unchanged**. `team-stop.cjs` (SessionEnd) is the exception — its session-teardown work (agent-tree cleanup, `execution_summary.yaml`, SDK-UUID pointer unlink) runs for **all** session types, not just experimental-team sessions.

See @resources/hook-catalog.md for the full per-hook detail (matchers, inputs, outputs, side effects) and the Secret Detection pattern catalog.

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

## Concurrency Contract (v12.15.0+)

Under two concurrent same-directory cAgents sessions, every hook MUST satisfy
four invariants: deterministic session resolution via `findActiveSession(input.session_id)`,
lock-protected shared-file writes, liveness-aware session-catchup, and
session-id-bound secret restore. See @.claude/rules/playbooks/pat-concurrent-session-hooks.md
for the full contract, default resolution chain, regression tests, and the
narrow `fallbackHeuristic: true` opt-in cases for Stop/SessionEnd hooks.

**v12.32.0 additions**: (1) a persisted SDK-transcript-UUID → cAgents-session map
lets `findActiveSession` / `findTeamSession` resolve a UUID-only hook payload
deterministically before the env-var step; the map-writer hooks
`subagent-tracker.cjs` + `session-init-gate.cjs` `upsertSdkSessionMap` on a
confident resolution (never the newest-session heuristic), and `team-stop.cjs`
unlinks the pointer at SessionEnd. (2) `verify-completion.cjs` gains a
`sessionActivelyWorking` discriminator (running child agent OR fresh heartbeat) so
the Stop hook WARNs instead of blocking a legitimately mid-flight session, while
still blocking an abandoned one. Detail lives in @resources/hook-catalog.md;
session `run_hook-session-id_260701_001`.

## createHook() Factory

All hooks use the `createHook(name, handler)` factory from `hook-utils.cjs`:

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

**Factory handles**:

- stdin reading with 3-second timeout
- JSON parsing with graceful fallback to `{}`
- Try-catch wrapping (errors produce `{"continue": true}`)
- Result transformation (`deny` shorthand -> full hookSpecificOutput)
- Single JSON output to stdout (no double-output possible)

## Hook Input/Output

### Input (stdin)

Hooks receive JSON on stdin:

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

Hooks output JSON to stdout:

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

Exit codes apply to command hooks only. HTTP hooks communicate success/failure via HTTP response status codes (2xx = success, non-2xx may block depending on event). Prompt and agent hooks communicate via their LLM response.

- `0`: Success — JSON parsed from stdout. Use `permissionDecision: "deny"` in `hookSpecificOutput` to block PreToolUse operations. For most events, stdout is only shown in verbose mode (Ctrl+O). Exceptions: `UserPromptSubmit` and `SessionStart` add stdout as context Claude can see.
- `2`: Blocking error — Claude Code ignores stdout JSON and feeds stderr to the model. The effect depends on the event:
  - **Can block**: `PreToolUse` (blocks tool call), `PermissionRequest` (denies permission), `UserPromptSubmit` (blocks prompt), `Stop` (prevents stopping), `StopFailure` (prevents stop-failure handling), `SubagentStop` (prevents stop), `TeammateIdle` (keeps working), `TaskCompleted` (prevents completion), `ConfigChange` (blocks change), `WorktreeCreate` (fails creation)
  - **Cannot block**: `PostToolUse`, `PostToolUseFailure`, `Notification`, `SubagentStart`, `SessionStart`, `SessionEnd`, `PreCompact`, `PostCompact`, `InstructionsLoaded`, `WorktreeRemove` — stderr shown to user only
- Any other exit code: Non-blocking error, stderr shown in verbose mode, execution continues.

## Hook Handler Types

Claude Code supports four hook handler types:

### Command Hooks (`type: "command"`)

Run a shell command. Receives JSON on stdin, communicates via exit codes and stdout JSON.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"command"` |
| `command` | yes | Shell command to execute |
| `timeout` | no | Seconds before canceling (default: 600) |
| `async` | no | If `true`, runs in background without blocking |
| `statusMessage` | no | Custom spinner message while hook runs |
| `once` | no | If `true`, runs once per session then removed (skills only) |

### HTTP Hooks (`type: "http"`)

Send an HTTP POST request to a URL endpoint. Useful for external integrations, webhooks, and logging to external services.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"http"` |
| `url` | yes | URL endpoint to POST to (receives JSON payload) |
| `headers` | no | Custom HTTP headers as key-value pairs |
| `timeout` | no | Seconds before canceling (default: 30) |

### Prompt Hooks (`type: "prompt"`)

Use an LLM to evaluate conditions and return yes/no decisions.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"prompt"` |
| `prompt` | yes | Prompt text. Use `$ARGUMENTS` for hook input JSON |
| `model` | no | Model for evaluation (defaults to fast model) |
| `timeout` | no | Seconds before canceling (default: 30) |

### Agent Hooks (`type: "agent"`)

Spawn a subagent with tool access (Read, Grep, Glob) to verify conditions.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | yes | `"agent"` |
| `prompt` | yes | Prompt text. Use `$ARGUMENTS` for hook input JSON |
| `model` | no | Model for evaluation |
| `timeout` | no | Seconds before canceling (default: 60) |

**Supported events (all four types)**: `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `UserPromptSubmit`, `Stop`, `SubagentStop`, `TaskCompleted`.

**Command hooks only** (http/prompt/agent NOT supported): `SessionStart`, `SessionEnd`, `SubagentStart`, `PreCompact`, `PostCompact`, `Notification`, `TeammateIdle`, `InstructionsLoaded`, `StopFailure`, `ConfigChange`, `WorktreeCreate`, `WorktreeRemove`, `CwdChanged`, `FileChanged`.

### Async Hooks

Command hooks support `"async": true` to run in the background without blocking. Useful for logging, analytics, or notifications that should not delay tool execution.

```json
{
  "type": "command",
  "command": "./scripts/log-event.sh",
  "async": true
}
```

### Hooks in Skills and Agents

Hooks can be defined in skill and subagent YAML frontmatter, scoped to the component's lifecycle:

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

For subagents, `Stop` hooks are automatically converted to `SubagentStop` events.

**Note**: For SessionStart context injection, use a command hook that returns `hookSpecificOutput.additionalContext` instead of a prompt hook. See `session-catchup.cjs` for the cAgents implementation.

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

Hooks are registered in `.claude/settings.json`:

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

The `bash -c` wrapper provides a 3-tier fallback chain for resolving the plugin root: `CLAUDE_PLUGIN_ROOT` (official plugin env var) → `CLAUDE_PROJECT_DIR` (user's project dir) → `$(pwd)` (last resort).

## Best Practices

1. **Use createHook()**: Eliminates boilerplate and guarantees correct output format.
2. **Fast execution**: Keep hooks under 5 seconds.
3. **Graceful failure**: `createHook()` handles errors automatically (returns `{"continue": true}`).
4. **Clear logging**: Use `console.error()` for logs (stderr), `createHook()` handles stdout.
5. **Idempotent**: Hooks may run multiple times.
6. **Self-contained**: `js-yaml` is the sole declared external dependency and every hook that uses it wraps the require in try/catch with a graceful degraded path (so hooks never crash at load when node_modules is absent); everything else is built-in Node.js.
7. **State in files**: Store state in cagents-memory, not memory.
8. **Single JSON output**: `createHook()` guarantees exactly one JSON output to stdout.

## Troubleshooting

### Hook not running

- Check `.claude/settings.json` for registration
- Verify file permissions (`chmod +x`)
- Verify `node` is in PATH

### Hook blocks unexpectedly

- Check `permissionDecisionReason` in output
- Check matcher pattern for PreToolUse
- Test hook manually: `echo '{}' | node .claude/hooks/<name>.cjs`

### "SessionEnd hook...team-stop...failed: Hook cancelled"

- Expected when cancelling a session (Ctrl+C, escape, or closing Claude Code)
- Claude Code terminates SessionEnd hooks during teardown before they can finish
- No data is lost or corrupted — all file writes are individually try-catch guarded
- The team session's final metrics/status may not be updated, but this is harmless

### SessionEnd hooks timing out

- Use `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` to extend the timeout (CC 2.1.74)
- Set in shell profile or `.env`: `export CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS=10000` (10 seconds)
- For `team-stop.cjs` which writes final metrics, `5000`–`10000` ms is recommended
- If hooks still time out after increasing the limit, check for blocking I/O or large file operations

### Hook output not shown

- Ensure using `createHook()` factory (handles output correctly)
- Check JSON is valid: `echo '{}' | node .claude/hooks/<name>.cjs 2>/dev/null | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"`

## Related Files

- `.claude/settings.json` — Hook registration (active configuration)
- `.claude/hooks/hook-utils.cjs` — Shared utilities and `createHook()` factory
- `cagents-memory/_system/config/hooks.yaml` — Hook behavior config
- `scripts/ci/check-quality.sh` — Hook validation in CI
- `cagents-memory/_system/evals/` — Evaluation framework

**Removed in V9.5** (no longer present in codebase): legacy `hooks/` directory, `scripts/hook-dispatch.sh`, `scripts/hook-dispatch-node.sh`.

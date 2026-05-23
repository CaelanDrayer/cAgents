# Hook Catalog Detail

Per-hook detail for the active cAgents hook system. The parent `.claude/rules/core/hooks.md` keeps the architecture overview + factory + I/O contract; this catalog carries the per-hook purpose, matchers, inputs, outputs, and side effects.

## Session Lifecycle

### SessionStart: session-catchup.cjs

- **Purpose**: Detect incomplete sessions on startup, offer resume options, inject cAgents behavioral context.
- **Also**: Initializes session state (replaces on-session-start.sh); includes prompt guidance previously in a separate prompt hook (prompt hooks not supported for SessionStart).
- **Creates**: `cagents-memory/_system/incomplete_sessions.json`
- **Output**: `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}`

### SessionEnd: team-stop.cjs

- **Purpose**: Finalize team metrics and update session status.
- **Also**: Session cleanup (replaces on-session-end.sh).
- **Updates**: `status.yaml`, `metrics/timing.yaml`.

## Tool Validation

### PreToolUse[Bash]: bash-validator.cjs

- **Matcher**: `Bash`
- **Purpose**: Two-tier command safety — auto-deny catastrophic commands, HITL confirmation for borderline-dangerous commands with safe-alternative suggestions.

**Tier 1 — Blocked (deny, auto-reject)**:

- **Destructive**: `rm -rf /`, `rm -rf ~`, fork bombs, `mkfs`, `dd if=/dev/zero`, `> /dev/sda`, `sudo`, `su`, `crontab`
- **Data exfiltration**: `curl` with POST data, `wget --post-file`, `nc`/`netcat` pipes, `socat`
- **Obfuscation**: `base64 -d | bash/sh`, `eval "$(..."`, `python3 -c` with `os.system`/`subprocess`, `perl -e` with `system`, `curl|wget` piped to shell, `node -e` with `child_process`, `ruby -e` with `exec`/`system`, `php -r` with `exec`/`system`

**Tier 2 — HITL (ask, user confirms with safe alternative shown)**:

- **Git destructive**: `--force` push (suggest `--force-with-lease`), `reset --hard` (suggest `stash`/`--soft`), `clean -fd`/`-fdx` (suggest `-n` preview)
- **SQL destructive**: `DROP TABLE/DATABASE/SCHEMA` (suggest backup), `TRUNCATE TABLE` (suggest `DELETE ... WHERE`), `DELETE FROM` without `WHERE` (suggest adding `WHERE`)
- **Permission escalation**: `chmod 777`/`-R 777`/`-R 666` (suggest `755`/`644`), `chown -R root` (suggest verifying path)
- **Process management**: `kill -9 -1` (suggest SIGTERM), `killall` (suggest specific PID), `pkill -9` (suggest SIGTERM first)
- **System control**: `shutdown`/`poweroff` (suggest `shutdown -c`), `reboot` (suggest saving work), `halt` (suggest `shutdown -h +1`)
- **Network/firewall**: `iptables -F` (suggest `iptables-save` first), `ufw disable` (suggest per-port rules)
- **Service management**: `systemctl stop/disable` (suggest checking dependents first)
- **Container cleanup**: `docker system prune -a` (suggest without `-a`), `docker volume prune` (suggest `volume ls` first)
- **Disk operations**: `mkswap` (suggest verifying device), `fdisk` (suggest backing up partition table)

**Obfuscation detection limitation**: Patterns use static regex matching against the literal command string. Runtime-constructed obfuscation (variables holding command fragments, heredoc-built payloads, multi-step obfuscation across separate commands) cannot be detected. Only known static patterns are caught.

### PreToolUse[Write|Edit]: secret-detection.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Block writes to protected paths and detect secrets.
- **Three phases**: (1) Protected path check, (2) Sensitive file warning (`.env` and similar filenames — warns only, does not block), (3) Secret scanning (pattern matching — blocks on critical/high severity).
- **Blocked**: System paths (`/etc/`, `/usr/`, `~/.ssh/`), files with critical/high secrets.

### PreToolUse[Write|Edit]: controller-delegation-validator.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Warn when controller-tier agents write to implementation files instead of delegating.
- **Detects**: Active controller from agent_tree.yaml, implementation file patterns.
- **Output**: systemMessage warning (does not block — advisory only).

### PreToolUse[Bash|Write|Edit]: approval-gate.cjs

- **Matcher**: `Bash|Write|Edit`
- **Purpose**: Enforce explicit user-approval gates before sensitive Bash/Write/Edit operations. Acts as a thin policy layer over `permissions.allow` / `permissions.deny` in `.claude/settings.json`.
- **Behavior**: returns `systemMessage` for advisory cases; non-blocking by default. Hard denials remain the responsibility of `bash-validator.cjs` (Bash) and `secret-detection.cjs` (Write/Edit).

### PreToolUse[Agent]: model-routing-advisor.cjs

- **Matcher**: `Agent`
- **Purpose**: Advisory hook that suggests optimal model selection before agent spawns.
- **Configuration**: see `.claude/rules/infrastructure/model-routing.md` for model routing configuration and aliases.

### PreToolUse[Agent]: session-init-gate.cjs

- **Matcher**: `Agent`
- **Purpose**: Guard that ensures session initialization is complete before allowing agent spawns.
- **Output**: Advisory systemMessage (does not block).

### PreToolUse[Write|Edit]: skill-size-monitor.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Prevent SKILL.md bloat regression. Counts lines in any `SKILL.md` being written or edited and surfaces a warning or block when thresholds are exceeded.
- **Thresholds**: warns at 600 lines (`CAGENTS_SKILL_WARN_LINES`), blocks at 900 lines (`CAGENTS_SKILL_BLOCK_LINES`).
- **Behavior**: at the warn threshold, returns `systemMessage` recommending a split into `resources/*.md` per Three-Tier Progressive Disclosure. At the block threshold, returns `deny` with the same recommendation. Non-SKILL.md writes pass through.
- **Override**: set `CAGENTS_SKILL_BLOCK_LINES` higher to allow a one-off oversized write (e.g., during a refactor), then re-tighten.

## Workflow Events

### Stop: verify-completion.cjs

- **Purpose**: Verify completion criteria before allowing stop.
- **Also**: Stop-workflow cleanup (replaces stop-workflow.sh).
- **Creates**: `completion_summary.yaml`
- **Can block**: Returns `{decision: "block", reason: "..."}` for incomplete workflows.

### Stop: goal-evaluator-logger.cjs

- **Purpose**: Capture the latest `/goal` evaluator reason into the active session's `workflow/goal_evaluator_log.yaml` so `cagents:self-correct` can consume it as additional revision signal (V11.3.0, REC-4).
- **Activation**: Only when `/goal` is active in the Stop hook payload. Non-blocking. No-op when `/goal` inactive, no active cAgents session, or no reason to capture.
- **Creates / appends**: `cagents-memory/sessions/{active}/workflow/goal_evaluator_log.yaml`
- **Consumed by**: `core/self-correct/SKILL.md` Step 2 (reads most recent 3-5 entries as revision signal).

### Stop: secret-restore.cjs

- **Purpose**: Companion to `secret-detection.cjs` sanitize mode (v12.0.4, REC-1). When `CAGENTS_SECRET_MODE=sanitize` is active, the PreToolUse hook replaces secrets with `BLOCK_<hex>` placeholders during the session and backs up the original content. This Stop hook restores all backed-up files at session end so the workspace returns to its pre-sanitize state.
- **Reads**: `cagents-memory/_system/secret-backups/{session_id}/manifest.yaml`
- **Restores**: Each `file_path` listed in the manifest by reading the corresponding `.orig` file (0600 perms) and writing it back. Deletes consumed `.orig` files and the manifest after restore.
- **Idempotent**: No-op when no manifest exists. Per-entry try/catch — partial failures log to `cagents-memory/_system/logs/secret-restore_{date}.log` but never fail the Stop.
- **Output**: Always returns `{continue: true}`. Never blocks.
- **Protocol doc**: `.claude/hooks/SECRET-SANITIZE.md`.

### SubagentStart: subagent-tracker.cjs + team-start.cjs

- **subagent-tracker.cjs**: Logs agent spawns to `workflow/agent_tree.yaml` and global audit log (`_system/logs/agent_spawns.log`). Includes fallback session discovery for the race condition where `status.yaml` hasn't been written yet. Injects `additionalContext` asking cAgents agents to self-register their `cagents:{name}` type, since Claude Code's `agent_type` field reports `general-purpose` for plugin agents.
- **team-start.cjs**: Initializes team monitoring directories and metrics files.

### SubagentStop: subagent-stop-tracker.cjs

- **Purpose**: Track when subagents finish, capturing completion summaries and duration metrics.
- **Also**: Appends stop events with summaries to the global audit log.
- **Updates**: `workflow/agent_tree.yaml` (adds `stopped_at`, `completion_summary`, `duration_seconds`).
- **Captures**: `last_assistant_message` from SubagentStop input (truncated to 300 chars for audit trail).

### PostToolUse[Write|Edit]: post-write-validator.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Validate file syntax after successful Write/Edit operations, nudge planning file updates.
- **Validates**: JSON parsing, YAML tab detection, duplicate YAML top-level keys.
- **Planning reminder**: During active sessions with `plan.yaml`, reminds to update `coordination_log.yaml` after implementation file writes.
- **Logs**: All file changes to `workflow/file_changes.log` with timestamps and validation status.
- **Output**: Warning systemMessage if syntax issues found; planning reminder for non-planning file writes.

### PostToolUseFailure: tool-failure-tracker.cjs

- **Purpose**: Track tool failures, detect patterns (3+ failures suggests alternatives).
- **Creates**: `workflow/tool_failures.yaml`

## Team Hooks

### TeammateIdle: teammate-idle-handler.cjs

- **Purpose**: Suggest available work items or cleanly stop idle teammates.
- **V10.5.0**: Refactored to `createHook()`. Returns `{ continue: false, stopReason }` when all work items are completed, causing the teammate to stop cleanly instead of lingering idle.
- **Logic**: Available work → suggest (`continue:true`); all completed → stop (`continue:false`); otherwise → pass-through (null).

### TaskCompleted: team-task-complete.cjs

- **Purpose**: Update `task_list.yaml` status, check dependency unblocking, stop teammate when all done.
- **Input fields**: `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name` (Claude Code API).
- **V10.5.0**: Refactored to `createHook()`. Returns `{ continue: false, stopReason }` when all work items completed. Reports newly unblocked items via systemMessage.
- **Side effects**: Updates `task_list.yaml`, writes completion message, updates timing metrics.

### PermissionRequest: permission-handler.cjs

- **Purpose**: Auto-approve safe patterns (Read, Grep, Glob), HITL gates for tier 4.
- **Auto-approved**: Read, Grep, Glob, TaskList, TaskGet; Write/Edit to cagents-memory.

## State Management

### PreCompact: pre-compact-save.cjs

- **Purpose**: Save critical workflow state before context compaction.
- **Creates**: Waypoint file in `sessions/{id}/waypoints/`
- **Includes**: Coordination state, team state, 5-question reboot check (where_am_i, where_going, whats_the_goal, what_learned, what_done), resume instructions.

### Notification: notification.cjs

- **Purpose**: Log notifications to daily files with 1MB rotation.
- **Creates**: `cagents-memory/_system/logs/notifications_{date}.log`

### UserPromptSubmit: delegation-enforcer.cjs

- **Purpose**: Enforce the aggressive-delegation rule. When a user prompt looks like a direct request to implement work without going through a skill (`/run`, `/team`, `/designer`, `/improve`), surface a systemMessage reminding the model to delegate via the appropriate skill rather than handle the task directly.
- **Output**: Advisory systemMessage (does not block the prompt). Pairs with `delegation-enforcer` doc in CLAUDE.md § CRITICAL: Aggressive Delegation.

### UserPromptSubmit: magic-keywords.cjs

- **Purpose**: Natural-language routing suggestions. Recognizes intent keywords in user prompts ("build X", "review Y", "design Z", "audit", "optimize") and emits a systemMessage suggesting the appropriate skill.
- **Output**: Advisory systemMessage (does not block the prompt). Complements `delegation-enforcer.cjs`.

## New Event Hooks

### StopFailure: stop-failure-handler.cjs

- **Purpose**: Capture workflow state (phase, domain, controller, pending/in-progress work items) into `recovery_state.yaml` when Claude fails to stop cleanly.
- **Creates**: `workflow/recovery_state.yaml`
- **Output**: Pass-through (never blocks).

### InstructionsLoaded: instructions-loaded.cjs

- **Purpose**: Validate `.claude/rules/` directory structure, count loaded rule files, inject active session mission as context.
- **Output**: `{"hookSpecificOutput": {"additionalContext": "...mission reminder..."}}`

### PostCompact: post-compact-restore.cjs

- **Purpose**: Re-inject key workflow state (mission, domain, phase, work item progress counts) as systemMessage after context compaction.
- **Output**: `{"continue": true, "systemMessage": "...context restoration..."}`

## CLI Tool (Not a registered hook)

### eval-runner.cjs

- **Purpose**: Run quality evaluations on sessions (standalone CLI tool).
- **Usage**: `node eval-runner.cjs --session <session_id>`
- **Creates**: `sessions/{id}/evals/evaluation_report.yaml`

## Secret Detection Patterns

The `secret-detection.cjs` hook blocks these patterns:

### Critical (Blocked)

- GitHub tokens: `ghp_`, `gho_`, `ghu_`, `ghs_`, `ghr_`
- AWS keys: `AKIA...`
- Private keys: `-----BEGIN ... PRIVATE KEY-----`
- Slack tokens: `xox[baprs]-...`
- Stripe live keys: `sk_live_...`, `rk_live_...`
- Database connection strings with credentials
- Anthropic API keys: `sk-ant-...`
- OpenAI API keys: `sk-proj-...` (newer format), `sk-<48-50 chars>` (legacy)
- NPM/PyPI tokens

### High (Blocked)

- Google API keys: `AIza...`

### Medium (Warning)

- Generic API keys
- Generic secret keys

### Low (Logged)

- JWT tokens (could be test tokens)

### False Positive Filtering

Blanket-excluded (entire file skipped):

- Documentation files (`*.md`, `README`, `docs/` directories)
- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Example/sample/template/mock/fixture files (by filename pattern)

Test file scanning (targeted suppression, not blanket exclusion):

- Test files (`*.test.js`, `*.spec.ts`, `__tests__/`, etc.) ARE scanned for real secrets
- Explicit placeholder tokens suppressed: `test_`, `fake_`, `example_`, `your_key_here`, `REPLACE_ME` (matched against the token itself)
- Realistic-looking tokens in test files trigger alerts normally

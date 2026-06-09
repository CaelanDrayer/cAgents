# Hook Catalog Detail

Per-hook detail for the active cAgents hook system. The parent `.claude/rules/core/hooks.md` keeps the architecture overview + factory + I/O contract; this catalog carries the per-hook purpose, matchers, inputs, outputs, and side effects.

## Session Lifecycle

### SessionStart: session-catchup.cjs

- **Purpose**: Detect incomplete sessions on startup, offer resume options, inject cAgents behavioral context.
- **Also**: Initializes session state (replaces on-session-start.sh); includes prompt guidance previously in a separate prompt hook (prompt hooks not supported for SessionStart).
- **Creates**: `cagents-memory/_system/incomplete_sessions.json`
- **Output**: `{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}}`

### SessionEnd: team-stop.cjs

- **Purpose**: Multi-phase session teardown. Despite the filename, the hook runs for ALL session types (not just team_*).
- **Phase 1 — Agent tree cleanup (all session types)**: Marks any unstopped agents in `workflow/agent_tree.yaml` with `stopped_at` and computes `duration_seconds` from `spawned_at`. Uses `yaml.load` with a regex fallback.
- **Phase 2 — execution_summary.yaml generation (all session types)**: If `workflow/execution_summary.yaml` does not already exist, writes a minimal summary with `session_id`, `final_state`, `status`, `agent_count` (parsed via `yaml.load` of `agent_tree.yaml`; corrected in v12.12.2 — previously used a regex against the wrong key), `duration_seconds`, `started_at`, `completed_at`. Skill-generated summaries are not overwritten.
- **Phase 3 — Team metrics + status (team_* sessions only)**: Finalizes `team/metrics/timing.yaml` (sets `completed_at`, `total_duration_seconds`), reads `team/task_list.yaml` for items_completed/total, reads `team/metrics/parallelism.yaml` for speedup_factor, then updates `status.yaml` (`phase: completed`, `pipeline_state: VALIDATED`, `result: success|partial`).
- **Phase 4 — Pattern extractor (24h throttle, fire-and-forget)**: Conditionally spawns `scripts/knowledge/pattern-extractor.cjs extract --save` as a detached child process if `_knowledge/patterns/.last-extracted` is older than 24h. Honors `CAGENTS_PATTERN_EXTRACTOR_OVERRIDE` for tests. Never blocks team-stop.
- **createHook label**: `'SessionEnd'` (matches the registered event name; was `'SessionStop'` pre-v12.12.2 — corrected to eliminate the source-vs-event 3-name mismatch).
- **Updates**: `workflow/agent_tree.yaml`, `workflow/execution_summary.yaml`, `team/metrics/timing.yaml`, `status.yaml`, `_knowledge/patterns/.last-extracted`.

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

**Obfuscation detection** (strengthened by F7-1, audit run_fable-plugin-review_260609_001): the static regexes now catch several previously-missed obfuscation shapes:

- **Tier 1 (deny)**: `eval` of a bare variable — `eval $VAR`, `eval "$VAR"`, `eval ${VAR}` (variable-indirection execution; does NOT match `eval $(cmd)` command-substitution style).
- **Tier 1 (deny)**: two-step download-then-execute within a single command string — e.g. `curl ... -o x.sh; bash x.sh`, `wget -O /tmp/i URL && sh /tmp/i` (a download flag/redirect followed by a shell-exec of a file in the same chain).
- **Tier 2 (ask)**: a bare variable in command position (start of a command segment), and download-then-run-without-an-explicit-shell where the file is executed directly (`curl URL -o /tmp/x.sh && /tmp/x.sh`).

**Remaining limitation**: detection is still static regex matching against the literal command string. Obfuscation split across *separate, sequential* commands (e.g. building a payload in one command and executing it in a later one), heredoc-built payloads, and other runtime-constructed indirection that does not appear as a single literal pattern still cannot all be statically caught. Only the known static patterns above are caught.

### PreToolUse[Write|Edit]: secret-detection.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Block writes to protected paths and detect secrets.
- **Three phases**: (1) Protected path check, (2) Sensitive file warning (`.env` and similar filenames — warns only, does not block), (3) Secret scanning (pattern matching — blocks on critical/high severity).
- **Blocked**: System paths (`/etc/`, `/usr/`, `~/.ssh/`), files with critical/high secrets.

### PreToolUse[Write|Edit]: controller-delegation-validator.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Enforce the aggressive-delegation rule from `.claude/rules/core/delegation.md`. Controllers (tech-lead, architect, marketing-strategist, etc.) coordinate via Agent tool; they must NOT Write/Edit implementation files in protected paths.
- **Detects**: Active controller from `workflow/agent_tree.yaml`, implementation file patterns.
- **Output (HARD-DENY for protected paths)**: Returns `permissionDecision: "deny"` for Write/Edit targeting `src/`, `lib/`, `components/`, `app/`, `services/`, `middleware/` when in `block` mode. The DENY fires regardless of whether an active controller is detected — `CAGENTS_DELEGATION_ENFORCEMENT=block` is the canonical environment toggle (default in cAgents). To downgrade to warn-only, set `CAGENTS_DELEGATION_ENFORCEMENT=warn`. Workflow files (`workflow/*.yaml`, `coordination_log.yaml`) and `cagents-memory/` writes are always allowed.
- **Output (advisory for non-protected paths)**: `systemMessage` warning when an active controller writes outside the protected list.

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
- **Purpose**: Multi-phase guard before any Agent spawn. Phase 1 (session-presence gate) DENIES; phases 2-3 (alias and data-access-level checks) are advisory.
- **Output (Phase 1 — session-presence gate)**: Calls `denyWithReason()` when no active session directory exists (`findActiveSession` returns null and no `CAGENTS_SESSION_ID` bypass is set). This actively blocks agent spawns that would have no session to write into.
- **Output (Phases 2-3 — alias / data-access-level)**: Advisory `systemMessage` only (does not block). Phase 2 resolves `cagents:*` aliases via `v12-aliases.yaml`. Phase 3 warns when a `trusted`-tier agent spawns an `unverified`-tier child.
- **Bypass**: Set `CAGENTS_SESSION_ID` to skip the presence gate during tests or out-of-session work.

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
- **Purpose**: Validate file syntax after successful Write/Edit operations, log all writes to the session file_changes audit trail.
- **Validates**: JSON parsing, YAML tab detection, duplicate YAML top-level keys, anti-slop patterns, SKILL.md schema.
- **Logs**: All file changes to `workflow/file_changes.log` with timestamps and validation status (`status: "warn"` when warnings are detected).
- **Output**: Returns `{ continue: true }` (no systemMessage). Per the thinking-block-immutability contract (run_team-thinking-400_260531_001), PostToolUse hooks no longer emit systemMessage — warnings surface via `console.error` (stderr → user verbose mode) and the file_changes.log status field instead. The hook does not block.

### PostToolUseFailure: tool-failure-tracker.cjs

- **Purpose**: Track tool failures, detect patterns (3+ failures suggests alternatives).
- **Creates**: `workflow/tool_failures.yaml`

## Team Hooks

### TeammateIdle: teammate-idle-handler.cjs

- **Purpose**: Cleanly stop idle teammates when all work is done; surface available work via stderr.
- **V10.5.0**: Refactored to `createHook()`. Returns `{ continue: false, stopReason }` when all work items are completed, causing the teammate to stop cleanly instead of lingering idle.
- **Logic**: All work items completed → `{ continue: false, stopReason }` (NEW-TURN-SAFE shutdown signal); available work → `{ continue: true }` (no systemMessage) with item list logged to `console.error`; otherwise → pass-through (null). Per the thinking-block-immutability contract (run_team-thinking-400_260531_001), the available-work branch no longer emits systemMessage — teammates self-claim by reading TaskList / task_list.yaml directly.

### TaskCompleted: team-task-complete.cjs

- **Purpose**: Update `task_list.yaml` status, check dependency unblocking, stop teammate when all done.
- **Input fields**: `task_id`, `task_subject`, `task_description`, `teammate_name`, `team_name` (Claude Code API).
- **V10.5.0**: Refactored to `createHook()`. Returns `{ continue: false, stopReason }` when all work items completed (NEW-TURN-SAFE shutdown signal). Per the thinking-block-immutability contract (run_team-thinking-400_260531_001), newly-unblocked items are no longer announced via systemMessage; teammates discover them by reading TaskList / task_list.yaml directly.
- **Side effects**: Updates `task_list.yaml`, writes completion message YAML to `team/messages/`, updates `team/metrics/timing.yaml`.
- **Output**: `{ continue: false, stopReason }` when all items complete, `{ continue: true }` otherwise. No systemMessage.

### PermissionRequest: permission-handler.cjs

- **Purpose**: Logs permission requests for HITL audit but DEFERS all approval decisions to `.claude/settings.json` `permissions.allow` / `permissions.deny`. The hook returns `null` in every branch — it does not actively emit `permissionDecision: "allow"` or `permissionDecision: "deny"` itself.
- **Actual auto-approval source**: `.claude/settings.json:permissions.allow` patterns (Read, Grep, Glob, TaskList, TaskGet, Write/Edit to `cagents-memory/`, etc.). The hook does NOT independently auto-approve these; it simply does not interfere with the default settings.json flow.
- **HITL gates for tier 4**: Currently the hook logs HITL-relevant requests to stderr but does NOT emit `permissionDecision: "ask"` to make the gate load-bearing. If the default Claude Code permission flow doesn't already prompt (e.g., the user has the path in `permissions.allow`), the HITL gate is silently bypassed.
- **Design note (H-7/H-8 from audit team_hooks-review_260602_001)**: The hook's name suggests it makes permission decisions; in practice it functions as a permission-request *logger* for HITL audit. The option of adding explicit `permissionDecision: "ask"` returns for HITL paths is deferred to a future code-change tiny-bump (see `outputs/deferral_list.md` in the audit-remediation session). For now, HITL enforcement relies on settings.json patterns + default-flow prompting.

## State Management

### PreCompact: pre-compact-save.cjs

- **Purpose**: Save critical workflow state to a waypoint file before context compaction.
- **Creates**: Waypoint file in `sessions/{id}/waypoints/`
- **Includes**: Coordination state, team state, 5-question reboot check (where_am_i, where_going, whats_the_goal, what_learned, what_done), resume instructions.
- **Output**: Returns `{ continue: true }` (no systemMessage). Per the thinking-block-immutability contract (run_team-thinking-400_260531_001), PreCompact no longer emits systemMessage — emitting one immediately before context compaction risked attaching it to the to-be-frozen assistant turn's content array, violating thinking-block immutability. The waypoint file IS the authoritative resume artifact; post-compact-restore.cjs (also fixed) is the resume path.

### Notification: notification.cjs

- **Purpose**: Log notifications to daily files with 1MB rotation.
- **Creates**: `cagents-memory/_system/logs/notifications_{date}.log`

### UserPromptSubmit: prompt-router.cjs

- **Purpose**: Consolidated delegation enforcement + natural-language routing (P1-7, v12.7.1; replaced the former `delegation-enforcer.cjs` + `magic-keywords.cjs`). Layer 1: when a prompt invokes `/run` or `/team`, inject a concise delegation reminder referencing `@.claude/rules/core/delegation.md` (the canonical Rationalization Kill List). Layer 2: detect intent keywords ("build X", "fix Y", "review Z", "optimize", "design") at the start of ≤2-sentence prompts and emit a routing suggestion (`/run`, `/run review`, `/run optimize`, `/designer`, `/team`).
- **Output**: Layer 1 → `hookSpecificOutput.additionalContext`; Layer 2 → advisory `systemMessage`. Neither blocks the prompt. Pairs with CLAUDE.md § CRITICAL: Aggressive Delegation.

### PreToolUse[Agent]: prompt-router.cjs

- **Matcher**: `Agent`
- **Purpose**: Pass-through (no-op) reserved for future controller-spawn validation. The same `prompt-router.cjs` handler registered under UserPromptSubmit also receives PreToolUse[Agent] events; for `Agent` tool calls it returns null. The Write/Edit deny path is handled by `controller-delegation-validator.cjs`.
- **Output**: Pass-through (never blocks).

### PostToolUse[Write|Edit]: validator-evidence-recheck.cjs

- **Matcher**: `Write|Edit`
- **Purpose**: Re-verify evidence cited in validation_report.yaml by re-running the cited verification methods (`fs.existsSync`, `grep`, file:line content match) after a write. When claimed evidence does not verify mechanically, mutates the report on disk: downgrades the classification from PASS to FAIL and appends a `recheck:` block listing the failing entries. See `pat-evidence-first-execution.md`.
- **Output**: Returns `{ continue: true }` (no systemMessage). Per the thinking-block-immutability contract (run_team-thinking-400_260531_001), PostToolUse hooks no longer emit systemMessage. The on-disk mutation of validation_report.yaml is the load-bearing side effect; the downgrade message surfaces via `console.error` (stderr → user verbose mode).

### ConfigChange: config-change-logger.cjs

- **Purpose**: Log configuration changes (user/project/local settings, skills) to an audit trail when Claude Code emits a `ConfigChange` event (wired in LP-17, v12.7.0).
- **Output**: Pass-through (never blocks).

## New Event Hooks

### StopFailure: stop-failure-handler.cjs

- **Purpose**: Capture workflow state (phase, domain, controller, pending/in-progress work items) into `recovery_state.yaml` when Claude fails to stop cleanly.
- **Creates**: `workflow/recovery_state.yaml`
- **Output**: Pass-through (never blocks).

### InstructionsLoaded: instructions-loaded.cjs

- **Purpose**: Validate `.claude/rules/` directory structure, count loaded rule files, inject active session mission as context.
- **Output**: `{"hookSpecificOutput": {"additionalContext": "...mission reminder..."}}`

### PostCompact: post-compact-restore.cjs

- **Purpose**: Log key workflow state (mission, domain, phase, work item progress counts) to disk after context compaction.
- **Creates**: `cagents-memory/_system/logs/post-compact_{YYYY-MM-DD}.log` — one block per invocation with goal/state/phase/work-counts.
- **Output**: Returns `{ continue: true }` (no systemMessage). Per the thinking-block-immutability contract (run_team-thinking-400_260531_001), PostCompact no longer emits systemMessage — context compaction is the only documented harness conversation-rewriting event, and a systemMessage emitted immediately after rewrite risked attaching to the just-rewritten assistant turn's content array, violating Anthropic API thinking-block immutability. The model resumes by reading `plan.yaml` + `coordination_log.yaml` directly after compaction; the disk log is for audit/troubleshooting only.

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

Markdown scanning (changed by F7-2, audit run_fable-plugin-review_260609_001): `*.md` / `README` / `docs/` are NO LONGER blanket-excluded. Markdown is scanned with the SAME full-token regexes as code, so a live API key pasted into a README or doc is now caught. This introduces zero false positives on documentation that merely references secret *prefixes* (e.g., this catalog lists `ghp_`, `AKIA...`, `sk-ant-...` as patterns to detect) because those are partial/prefix fragments, not full-length tokens, and the full-token regexes do not match them.

Blanket-excluded (entire file skipped):

- Lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`)
- Example/sample/template/mock/fixture files (by filename pattern)

DOC_ALLOWLIST (narrow per-file allowlist — basename-anchored, entire file skipped): only the two repo docs that document the secret-detection mechanism itself and therefore legitimately carry secret-pattern fragments as reference material:

- `hook-catalog.md` (this file)
- `SECRET-SANITIZE.md`

The allowlist exists so a future expansion of those two docs to include a worked example cannot self-block the hook. It is anchored on the path basename so a sibling directory of the same name cannot widen it.

Test file scanning (targeted suppression, not blanket exclusion):

- Test files (`*.test.js`, `*.spec.ts`, `__tests__/`, etc.) ARE scanned for real secrets
- Explicit placeholder tokens suppressed: `test_`, `fake_`, `example_`, `your_key_here`, `REPLACE_ME` (matched against the token itself)
- Realistic-looking tokens in test files trigger alerts normally

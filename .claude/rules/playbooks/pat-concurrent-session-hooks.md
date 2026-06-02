---
name: pat-concurrent-session-hooks
description: "Pattern: how cAgents hooks resolve their session deterministically under two concurrent same-directory sessions, and the four invariants every hook author must satisfy."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.15.0+"
metadata:
  author: cagents
  version: "1.0.0"
  applies_to:
    - .claude/hooks/*.cjs
---

# Pattern: Concurrent-Session Hook Contract (v12.15.0+)

When two cAgents sessions run in the same project directory at the same
time (e.g., two `/run` invocations, or `/run` + `/team`), every hook fired
by EITHER instance MUST satisfy four invariants:

## The Four Invariants

1. **Deterministic resolution**: every hook resolves to its own session via
   `findActiveSession(input.session_id)` (or the option-bag form). Hooks do
   NOT fall through to "newest active" heuristics by default. The legacy
   heuristic is gated behind `findActiveSession({fallbackHeuristic: true})`
   for Stop / SessionEnd hooks that legitimately finalize terminal sessions.

2. **Session-scoped, lock-protected shared writes**: every append to
   `workflow/agent_tree.yaml`, `workflow/file_changes.log`,
   `workflow/tool_failures.yaml`, `team/task_list.yaml`,
   `workflow/goal_evaluator_log.yaml`, and the secret manifest
   (`_system/secret-backups/{sid}/manifest.yaml`) is wrapped in
   `withFileLock(filePath, fn)`. The lock key is the file path, so distinct
   sessions never contend; same-session concurrent writers serialize.

3. **Liveness-aware session-catchup**: `session-catchup.cjs` filters LIVE
   sessions out of the SessionStart resume offer. A session is LIVE when its
   `session.pid` file holds a still-running PID OR its `status.yaml` mtime
   / `last_updated_at` heartbeat is within `CAGENTS_SESSION_LIVENESS_MS`
   (default 60s). This closes cross-instance resume leakage.

4. **Session-id-bound secret restore**: `secret-detection.cjs` stamps
   `session_id:` at the top of the secret manifest;
   `secret-restore.cjs` refuses to restore from any manifest whose
   `session_id` does not match the resolving session. Mismatched manifests
   log a stderr warning and abort without file writes.

## Default Resolution Chain (no fallback)

1. **`sessionHint`** (typically `input.session_id` from the hook payload)
   — if the directory exists and the session is in a non-terminal
   `pipeline_state` / `phase` (or has no status.yaml yet — race window),
   return it. If terminal, return null.
2. **`process.env.CAGENTS_ACTIVE_SESSION`** — same rules.
3. **`promptHint`** (e.g., extracted from prompt text by subagent-tracker
   Pass-3) — same rules.
4. **`null`** — refuse to silently resolve to "newest active" session.

## Regression tests pinning these invariants

- `tests/hooks/find-active-session-deterministic.test.js` — chain
  ordering + cache.
- `tests/hooks/concurrent-appends.test.js` — 10 concurrent
  agent_tree.yaml writers; lock prevents truncation.
- `tests/hooks/session-catchup-liveness.test.js` — LIVE filter + PID
  liveness.
- `tests/v12/concurrent-sessions-no-crosswrite.test.js` — end-to-end
  two-session cross-write asserter (5 cases).

## When to opt into `fallbackHeuristic: true`

ONLY when the hook legitimately needs to finalize a terminal session
(SessionEnd / Stop hooks). Examples:

- `team-stop.cjs` (SessionEnd): finalizes `agent_tree.yaml` cleanup +
  `execution_summary.yaml` generation. Resolves session strictly via
  `input.session_id` direct path when provided, then falls back to
  `findActiveSession({fallbackHeuristic: true})` only when the payload
  carries no hint.
- `verify-completion.cjs` (Stop): block-decides on completion of the
  resolving session. Uses
  `findMostRecentSessionDir({includeTerminal: true})` as fallback when
  `findActiveSession(input.session_id)` returns null (session already
  marked terminal by the skill before Stop fires).

Reference: empirical record in `cagents-memory/sessions/run_concurrent-session-hooks_260602_001/`.

## See also

- `.claude/rules/memory/agent-memory.md` § Session Discovery Internals —
  the deterministic chain narrative.
- `.claude/rules/core/hooks.md` § Concurrency Contract — the hook-level
  summary that references this playbook.
- `.claude/hooks/hook-utils.cjs` `findActiveSession` — implementation.

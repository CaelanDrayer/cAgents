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
   — if the hint is a cAgents-shaped ID (`run_*`, `team_*`, `designer_*`, etc.)
   AND the directory exists AND the session is in a non-terminal
   `pipeline_state` / `phase` (or has no status.yaml yet — race window),
   return it. If terminal, return null. If the hint matches the SDK
   transcript UUID shape (`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`),
   skip step 1 entirely and fall through to step 2 — see "Input Semantics"
   below.
2. **`process.env.CAGENTS_ACTIVE_SESSION`** — same rules.
3. **`promptHint`** (e.g., extracted from prompt text by subagent-tracker
   Pass-3) — same rules.
4. **`null`** — refuse to silently resolve to "newest active" session.

## Input Semantics: SDK UUID vs cAgents Session ID (v12.16.0+)

The H1 finding from session `run_sessions-hung-single-dir_260602_001`
showed that Claude Code's hook payload `input.session_id` field carries
an **SDK transcript UUID** (e.g.,
`28d9d944-e2f5-4e03-b06b-d367625f1fdd`), NOT a cAgents session directory
name. The 8-4-4-4-12 hex shape is the SDK conversation identifier; cAgents
session directory names use the `{command}_{slug}_{YYMMDD}_{NNN}` shape
(e.g., `run_fix-auth_260317_001`). The two namespaces never overlap.

**Empirical evidence**:
`cagents-memory/_system/logs/agent_spawns.log` carries 229 production
hook invocations with `session=<UUID>` entries, confirming that every
real `SubagentStart` / `PreToolUse[Agent]` payload received in this
project carries a UUID — never a cAgents-shaped ID — in the
`input.session_id` field.

**The v12.15.0 regression**: the v12.15.0 deterministic chain treated
ANY `sessionHint` literally — if `_tryResolveCandidate(sessionsDir, hint)`
failed to find a matching directory (which it ALWAYS did for UUID hints,
because no cAgents session directory is named after an SDK UUID), the
chain refused to fall through and returned `null`. This caused
`session-init-gate.cjs` (the `PreToolUse[Agent]` gate) to HARD-DENY
every Agent spawn with "no active session" — sessions hung at the very
first `Agent()` call.

**The v12.16.0 fix** (`.claude/hooks/hook-utils.cjs:188-263`): a
positive UUID-shape check gates the no-fallback behavior. Step 1 of the
chain now:

- Lines 188-192 — declares `SDK_UUID_RE` and the `_isSdkUuidShape()` helper.
- Lines 244-248 — if `sessionHint` matches the SDK UUID shape, logs a
  stderr note and **falls through** to step 2 (env-var) and step 3
  (promptHint) without caching `null`. The UUID is treated as "no
  cAgents hint provided" — env-var resolution still works, and
  `CAGENTS_SESSION_ID` (a separate cAgents-controlled var) or
  `CAGENTS_ACTIVE_SESSION` can carry the real session ID.
- Lines 249-263 — cAgents-shaped hints (anything NOT matching the
  UUID regex) still terminate at `null` if unresolvable, exactly as in
  v12.15.0. The cross-session-write invariant from the Four Invariants
  section is preserved: a UUID hint alone never resolves to ANY session
  directory — only env-var or promptHint can — so a hook with no cAgents
  context still refuses to silently bind to a sibling instance's
  session.

The fix is narrowly scoped to one positively-identified failure shape.
Every other path through `findActiveSession` (cAgents-shaped hints, env
fallback, prompt extraction, the legacy `fallbackHeuristic: true`
escape) is byte-identical to v12.15.0.

## Regression tests pinning these invariants

- `tests/hooks/find-active-session-deterministic.test.js` — chain
  ordering + cache.
- `tests/hooks/concurrent-appends.test.js` — 10 concurrent
  agent_tree.yaml writers; lock prevents truncation.
- `tests/hooks/session-catchup-liveness.test.js` — LIVE filter + PID
  liveness.
- `tests/v12/concurrent-sessions-no-crosswrite.test.js` — end-to-end
  two-session cross-write asserter (5 cases).
- `tests/hooks/session-init-gate-uuid-payload.test.js` — v12.16.0 H1
  regression: UUID-shaped `input.session_id` payload handling (5 cases).
  Tests 2/3/5 fail on commit a2b19cc0 (pre-v12.16.0 HEAD) and pass with
  the `SDK_UUID_RE` chain-step-1 fall-through patch. Tests 1/4 pin the
  cross-write invariant (UUID alone never resolves; cAgents-shaped-but-
  unresolvable hints still terminate at null).

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

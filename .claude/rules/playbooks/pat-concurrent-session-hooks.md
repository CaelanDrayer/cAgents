---
paths:
  - ".claude/rules/playbooks/pat-concurrent-session-hooks.md"
  - ".claude/rules/core/hooks.md"
  - ".claude/rules/core/resources/hook-catalog.md"
  - ".claude/rules/memory/agent-memory.md"
  - ".claude/hooks/**"
  - "tests/hooks/**"
  - "tests/v12/concurrent-sessions-no-crosswrite.test.js"
name: pat-concurrent-session-hooks
description: "Pattern: how cAgents hooks bind to the session their transcript owns when two sessions share one project directory, and the invariants every hook author must satisfy."
license: MIT
compatibility: "Claude Code 2.x, cAgents 12.73.0+"
metadata:
  author: cagents
  version: "2.0.0"
  applies_to:
    - .claude/hooks/*.cjs
---

# Pattern: Concurrent-Session Hook Contract (v12.73.0+)

Two cAgents sessions can run in one project directory at the same time.
Examples are two `/act` runs, or `/act` next to `/team`. Every hook that
either transcript fires must satisfy the invariants below.

## The Five Invariants

1. **Strict ownership.** A hook acts only on a session that its payload
   `session_id` owns. "Acts" means it reads the session for a verdict,
   blocks on it, or writes into it. The payload `session_id` is the Claude
   transcript UUID. See "Ownership model" below.

2. **Session-scoped, lock-protected shared writes.** Every append to
   `workflow/agent_tree.yaml`, `workflow/file_changes.log`,
   `workflow/tool_failures.yaml`, `team/task_list.yaml`,
   `workflow/goal_evaluator_log.yaml`, and the secret manifest
   (`_system/secret-backups/{sid}/manifest.yaml`) runs inside
   `withFileLock(filePath, fn)`. The lock key is the file path. Distinct
   sessions never contend. Writers in one session serialize.

3. **Liveness-aware session-catchup.** `session-catchup.cjs` leaves LIVE
   sessions out of the SessionStart resume offer. A session is LIVE when its
   `session.pid` file holds a running PID. It is also LIVE when its
   `status.yaml` mtime or `last_updated_at` heartbeat is inside
   `CAGENTS_SESSION_LIVENESS_MS` (default 60s).

4. **Session-id-bound secret restore.** `secret-detection.cjs` stamps
   `session_id:` at the top of the secret manifest. `secret-restore.cjs`
   refuses a manifest whose `session_id` does not match the resolved
   session. It logs a stderr warning and writes no files.

5. **No owned session means no-op.** A hook that finds no owned session does
   nothing to any session. It never adopts the newest session on disk.

## Ownership model

Each session has at most one owner UUID. Two records hold that fact:

- The marker file `sessions/{sid}/session.sdk_id`. Its content is the owner UUID.
- The map pointer `cagents-memory/_system/sdk_session_map/{uuid}`. Its content
  is the owned session id.

A session is in one of three states for a given UUID:

| State | Rule |
|-------|------|
| Owned | The marker names the UUID. Or there is no marker and the map pointer names the session. |
| Foreign | The marker names a different UUID. A foreign marker beats a stale map pointer. |
| Unclaimed | No marker and no pointer. |

A hook acts only on an owned session. Stop, SessionEnd, the governance
hooks, and the trackers never adopt an unclaimed session.

## Ownership API (`hook-utils.cjs`)

All four functions are exported. None of them throws.

- `getSessionOwner(sessionDir)` returns the marker UUID, or `null` when the
  session is unclaimed.
- `isOwnedBy(sessionDir, uuid)` returns `true` for an owned session. A
  foreign marker returns `false`, even when a stale map pointer names the
  session.
- `resolveOwnedSession(uuid, { includeTerminal = false })` returns the owned
  session dir, or `null`. It reads the map pointer first. It then scans the
  markers under `sessions/*`, and the newest owned session wins. A scan hit
  re-seeds the map pointer. It never returns an unclaimed or foreign session.
  Pass `includeTerminal: true` to accept a terminal session.
- `claimSession(sessionDir, uuid)` creates the marker with an atomic
  exclusive link. The first claimant wins. It returns `true` when the UUID
  owns the session after the call. It returns `false` for a foreign session
  and writes nothing. On success it writes or refreshes the map pointer.

`upsertSdkSessionMap(uuid, sessionDir)` now delegates to `claimSession`. It
never overwrites a foreign marker.

## How a session gets its owner

Three paths claim a session. All three use claim semantics, so none of
them steals a foreign session.

1. **Claim-on-write (primary).** `post-write-validator.cjs` watches every
   successful Write and Edit. A write to `sessions/{sid}/status.yaml` or
   `sessions/{sid}/instruction.yaml` calls `claimSession` for the writing
   transcript. The `{sid}` dir must be a direct child of `sessions/`. The
   claim runs before the audit-trail log line.
2. **Skill seeding (best-effort).** `/act`, `/team`, and `/designer` write
   the marker and the map pointer from `${CLAUDE_SESSION_ID}` in bash at
   init. An owner guard skips the write when the marker names a different
   UUID. `${CLAUDE_SESSION_ID}` can be empty, so this path is not required.
3. **Tracker seeding.** `subagent-tracker.cjs` and `session-init-gate.cjs`
   call `claimSession` after a deterministic resolution.

A model cannot set `CAGENTS_ACTIVE_SESSION` for hook subprocesses. Skills
rely on claim-on-write instead.

## Resolution rules

**Hooks with a UUID payload.** When the UUID is known, every resolution step
rejects a foreign-owned session:

- `findActiveSession` accepts a UUID-shaped `sessionHint` or
  `options.sdkUuid`. The map step drops a pointer whose target marker names
  another UUID. The `CAGENTS_ACTIVE_SESSION` step skips a foreign session.
  The `promptHint` step rejects a foreign session. An unclaimed session named
  by the env var or the prompt stays acceptable. The heuristic status passes
  accept only owned sessions.
- `findTeamSession` applies the same checks to `team_*` sessions.
- `findMostRecentSessionDir({ sdkUuid })` returns only an owned session.

**Hooks with no UUID.** Callers that pass no UUID keep the legacy behavior.

## Per-hook behavior with no owned session

| Hook | Resolution | No owned session |
|------|------------|------------------|
| `verify-completion.cjs` (Stop) | `resolveOwnedSession(uuid, { includeTerminal: true })` | Allows the stop and writes nothing. |
| `team-stop.cjs` (SessionEnd) | `resolveOwnedSession(uuid, { includeTerminal: true })`; Phase 2 takes a team session only if `isOwnedBy` | Skips session finalization. |
| `controller-delegation-validator.cjs` (governance) | Owned session only | Allows the write. |
| `session-init-gate.cjs` (Agent presence gate) | Owned session only | Allows the spawn. It writes to stderr only and adds no notice. One exception: when no sessions dir exists at all, it rebuilds the scaffold and adds an absence notice. |
| `subagent-tracker.cjs`, `subagent-stop-tracker.cjs` | Map/env, pointer owner, prompt hint; a foreign result is dropped | Logs to `_system/logs/agent_spawns.log` only. |

The `fallbackHeuristic: true` option is retired from all of these hooks.
None of them falls back to the newest session. A non-UUID `session_id`
payload in Stop or SessionEnd is an exact session-id pin. Stop still
ignores that pin when the named session has an owner marker.

## Stop-hook actively-working discriminator (v12.32.0)

The Stop hook must not block an owned session that is still working. An
example is a pipeline that yields while a child agent runs.

`sessionActivelyWorking(sessionDir, statusContent)` returns `true` in two
cases. The first is a running child: an `agent_tree.yaml` `agents:` entry
with `stopped_at: null`. The scan skips the top-level `root:` block. The
second is a fresh `status.yaml` `last_updated_at` heartbeat, inside
`CAGENTS_SESSION_LIVENESS_MS`. On any error it returns `false`, so it fails
toward blocking.

`verify-completion.cjs` applies the check at all three block paths (A, B,
and C). When the check is `true`, a block becomes a warning
(`continue: true`). An abandoned session still blocks. The 24h staleness
skip is unchanged.

## Regression tests pinning these invariants

- `tests/regressions/concurrent-session-ownership.test.js` — end-to-end
  two-transcript ownership contract.
- `tests/hooks/session-ownership.test.js` — `getSessionOwner`, `isOwnedBy`,
  `resolveOwnedSession`, `claimSession`, and the owned-only resolution steps.
- `tests/hooks/claim-on-write.test.js` — `post-write-validator.cjs` claims an
  unclaimed session and never steals a foreign one.
- `tests/hooks/verify-completion-ownership.test.js` — Stop allows and writes
  nothing with no owned session.
- `tests/hooks/team-stop-ownership.test.js` — SessionEnd skips finalization
  of unowned sessions.
- `tests/hooks/tracker-ownership.test.js` — trackers never file into an
  unowned session.
- `tests/hooks/governance-ownership.test.js` — governance and the presence
  gate allow when no owned session exists.
- `tests/hooks/concurrent-appends.test.js` — 10 concurrent `agent_tree.yaml`
  writers. The lock prevents truncation.
- `tests/hooks/session-catchup-liveness.test.js` — LIVE filter and PID liveness.
- `tests/v12/concurrent-sessions-no-crosswrite.test.js` — end-to-end
  two-session cross-write check.

## See also

- `.claude/rules/memory/agent-memory.md` § Session Discovery Internals.
- `.claude/rules/core/hooks.md` § Concurrency Contract.
- `.claude/rules/core/resources/hook-catalog.md` — per-hook detail.
- `.claude/hooks/hook-utils.cjs` — `resolveOwnedSession` and `claimSession`.
- Design record: session `act_concurrent-session-hooks_260927_001`.

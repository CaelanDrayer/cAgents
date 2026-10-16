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
  version: "2.1.0"
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
   `workflow/file_changes.log`,
   `workflow/tool_failures.yaml`, `team/task_list.yaml`,
   `workflow/goal_evaluator_log.yaml`, and the secret manifest
   (`_system/secret-backups/{sid}/manifest.yaml`) runs inside
   `withFileLock(filePath, fn)`. The lock key is the file path. Distinct
   sessions never contend. Writers in one session serialize.
   `workflow/agent_tree.yaml` has one write path, `updateYamlLocked` (see
   "Agent tree ownership" below).

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

1. **Claim-on-write (primary).** `post-write-validator.cjs` calls
   `claimFromAnyWrite(input)` after every successful Write, Edit,
   MultiEdit, NotebookEdit, and Bash call. Since v12.76.0 (HS-1, WI-7) a
   `PostToolUse` entry with `matcher: "Bash"` runs it for Bash too. A write
   to `sessions/{sid}/status.yaml` or `sessions/{sid}/instruction.yaml`
   claims the session for the writing transcript. For Bash, a redirect,
   `tee`, `cp`, `mv`, or `install` to one of these files counts. The
   `{sid}` dir must be a direct child of `sessions/`. The claim runs before
   the audit-trail log line.
2. **Skill seeding (best-effort).** `/act`, `/team`, and `/designer` write
   the marker and the map pointer from `${CLAUDE_SESSION_ID}` in bash at
   init. An owner guard skips the write when the marker names a different
   UUID. `${CLAUDE_SESSION_ID}` can be empty, so this path is not required.
3. **Spawn-prompt claim.** `session-init-gate.cjs` calls
   `claimFromAnyWrite` for an `Agent` call. An absolute `SESSION_DIR=` line
   in the spawn prompt claims an unclaimed session. `resolveSession` step 2
   also claims a hinted session, unless the caller passes `claimHint: false`.

A model cannot set `CAGENTS_ACTIVE_SESSION` for hook subprocesses. Skills
rely on claim-on-write instead.

## Resolution rules

**`resolveSession` (HS-1, WI-7).** Since v12.76.0, 7 hooks resolve their
session with `resolveSession(input, { purpose, includeTerminal, claimHint,
allowEnv })`. The chain has four steps:

1. The session that the payload transcript owns (`resolveOwnedSession`).
2. An absolute `SESSION_DIR` hint, or `CAGENTS_SESSION_ID`, in
   `tool_input.prompt`. The session must be unclaimed or owned.
3. A non-UUID cAgents session id in `session_id` (a legacy or test pin).
   If there is no pin, the `CAGENTS_ACTIVE_SESSION` env var.
   `allowEnv: false` skips the env var.
4. `null`.

The chain has no newest-mtime step. It drops a result whose marker names
another transcript. `purpose: 'gate'` rejects a terminal session.
`purpose: 'record'`, the default, accepts it. The per-hook options are in
`.claude/rules/core/resources/hook-catalog.md` § Session Resolution.

**`findActiveSession` (8 hooks).** `pre-compact-save`, `post-compact-restore`, `instructions-loaded`, `goal-evaluator-logger`,
`model-routing-advisor`, `tool-failure-tracker`, `spawn-footprint`, and
`stop-failure-handler` still use it. When the UUID is known, every step
rejects a foreign-owned session:

- `findActiveSession` accepts a UUID-shaped `sessionHint` or
  `options.sdkUuid`. The map step drops a pointer whose target marker names
  another UUID. The `CAGENTS_ACTIVE_SESSION` step skips a foreign session.
  The `promptHint` step rejects a foreign session. An unclaimed session named
  by the env var or the prompt stays acceptable. The heuristic status passes
  accept only owned sessions.
- `findTeamSession` applies the same checks to `team_*` sessions.
- `findMostRecentSessionDir({ sdkUuid })` returns only an owned session.

Callers that pass no UUID keep the legacy behavior.

## Per-hook behavior with no owned session

| Hook | Resolution | No owned session |
|------|------------|------------------|
| `verify-completion.cjs` (Stop) | `resolveSession`, `purpose: 'record'`, `claimHint: false` | Allows the stop and writes nothing. |
| `team-stop.cjs` (SessionEnd) | Phase 1: `resolveSession`, `purpose: 'record'`, `claimHint: false`, `allowEnv: false`. Phase 2 takes a team session only if `isOwnedBy` | Skips session finalization. |
| `controller-delegation-validator.cjs` (governance) | `resolveSession`, `purpose: 'gate'`, `claimHint: false` | Allows the write. |
| `session-init-gate.cjs` (Agent presence gate) | `resolveSession`, `purpose: 'gate'` | Allows the spawn. It writes to stderr only and adds no notice. One exception: when no sessions dir exists at all, it rebuilds the scaffold and adds an absence notice. |
| `subagent-tracker.cjs`, `subagent-stop-tracker.cjs` | `resolveSession`, `purpose: 'record'` | Logs to `_system/logs/agent_spawns.log` only. |

The `fallbackHeuristic: true` option is retired from all of these hooks.
None of them falls back to the newest session. A non-UUID `session_id`
payload in Stop or SessionEnd is an exact session-id pin. Stop still
ignores that pin when the named session has an owner marker.

## Agent tree ownership (HS-6, WI-7)

The hooks own `workflow/agent_tree.yaml`. Agents do not self-register in it,
and no agent edits it by hand.

- The trackers append each spawn and each stop to `workflow/events.jsonl`,
  one JSON object per line. Each append is one `O_APPEND` write of less
  than 4 KB, so it needs no lock. `events.jsonl` is the source of truth.
- `agent_tree.yaml` is a view of the events. `updateYamlLocked` is its one
  write path: it takes the file lock, parses the tree tolerantly, applies
  the change, and replaces the file with `writeFileAtomic`. When the lock
  is busy, it skips the write. It never writes without the lock.
- `reconcileTreeFromEvents` adds the rows that a skipped write missed.
- `loadAgentTreeTolerant` moves a tree that is not valid YAML to a
  quarantine file. The hooks then rebuild the tree from `events.jsonl`.
- A spawn with no `agent_id` gets `anon_<type>_<ts>_<pid>`
  (`fallbackAgentId`). Its stop is a `stop_anon` event.

One write is not a hook write. At session init, `/act`, `/team`, and
`/designer` create the file with the depth-0 root entry in a top-level
`agents:` list. No `SubagentStart` event fires for the main session, so no
hook writes that row. After init, only the hooks write the file.

## Stop-hook actively-working discriminator (v12.32.0)

The Stop hook must not block an owned session that is still working. An
example is a pipeline that yields while a child agent runs.

`sessionActivelyWorking(sessionDir, statusContent)` returns `true` in two
cases. The first is a running child: an `agent_tree.yaml` `agents:` entry
with `stopped_at: null` and a `spawned_at` inside
`CAGENTS_STALE_CHILD_MS` (default 30 min). A row with a missing
`spawned_at` counts as stale. The scan skips a legacy top-level `root:` block.
Since WI-17 it also skips a root entry in the `agents:` list: a row with
`depth: 0`, `id: pipeline`, or a `*-pipeline` type. The child counter skips that
row too, so the REC-04 0-child gate fires for a session that spawned nothing.
The second is a fresh `status.yaml` `last_updated_at` heartbeat, inside
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
- `tests/hooks/resolve-session-chain.test.js` — the `resolveSession`
  chain, with no newest-mtime step.
- `tests/hooks/session-events-jsonl.test.js` — `events.jsonl` appends and
  the tree rebuild.
- `tests/hooks/concurrent-appends.test.js` — 10 concurrent `agent_tree.yaml`
  writers. The lock prevents truncation.
- `tests/hooks/session-catchup-liveness.test.js` — LIVE filter and PID liveness.
- `tests/v12/concurrent-sessions-no-crosswrite.test.js` — end-to-end
  two-session cross-write check.

## See also

- `.claude/rules/memory/agent-memory.md` § Session Discovery Internals.
- `.claude/rules/core/hooks.md` § Concurrency Contract.
- `.claude/rules/core/resources/hook-catalog.md` — per-hook detail.
- `.claude/hooks/hook-utils.cjs` — `resolveSession`, `claimFromAnyWrite`,
  `resolveOwnedSession`, `claimSession`, and `updateYamlLocked`.
- Design record: session `act_concurrent-session-hooks_260927_001`.

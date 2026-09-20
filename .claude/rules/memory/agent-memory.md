---
paths:
  - ".claude/rules/memory/**"
  - "cagents-memory/_system/**"
  - "cagents-memory/_knowledge/**"
  - "cagents-memory/sessions/*/status.yaml"
  - "cagents-memory/sessions/*/waypoints/**"
  - ".claude/skills/act/reference/session-schema.md"
  - ".claude/hooks/hook-utils.cjs"
  - ".claude/hooks/session-catchup.cjs"
  - ".claude/hooks/session-init-gate.cjs"
  - ".claude/hooks/subagent-tracker.cjs"
  - ".claude/hooks/pre-compact-save.cjs"
  - ".claude/hooks/post-compact-restore.cjs"
  - ".claude/hooks/team-stop.cjs"
  - ".claude/rules/playbooks/pat-concurrent-session-hooks.md"
  - "tests/hooks/find-active-session-deterministic.test.js"
  - "tests/hooks/session-catchup-liveness.test.js"
  - "tests/v12/concurrent-sessions-no-crosswrite.test.js"
---

# Agent Memory Structure

This file describes the file-based memory organization of cAgents. That
organization aligns with the memory hierarchy of Claude Code.

## Claude Code Memory Hierarchy

| Memory Type | Location | Shared With | Loaded |
|-------------|----------|-------------|--------|
| **Managed policy** | OS-level paths | All users in org | Always, highest priority |
| **Project memory** | `./CLAUDE.md` | Team via git | Always at launch |
| **Project rules** | `./.claude/rules/*.md` | Team via git | Always (path-specific conditional) |
| **User memory** | `~/.claude/CLAUDE.md` | Just you | Always |
| **Project local** | `./CLAUDE.local.md` | Just you (auto-gitignored) | Always |
| **Auto memory** | `~/.claude/projects/<project>/memory/` | Just you | First 200 lines of MEMORY.md |

**Loading Order**: Managed -> User -> Project -> Project Rules -> Project Local (later = higher priority)

**Auto Memory**: this is a persistent directory at
`~/.claude/projects/<project>/memory/MEMORY.md`. Toggle it with `/memory`. It is
separate from cagents-memory/. Use the `autoMemoryDirectory` setting to point
auto memory at a custom path. For example, point it at
`cagents-memory/_knowledge/` to share the learnings across the agents in the
same project:

```json
{
  "autoMemoryDirectory": "cagents-memory/_knowledge/"
}
```

Many agents can then write to one shared knowledge store. The store accumulates
patterns across sessions.

**Path-Specific Rules**: add a `paths:` field to the YAML frontmatter, with glob
patterns. A rule with no `paths` field applies unconditionally.

**Recursive Lookup**: Claude Code reads the CLAUDE.md files recursively up the
directory tree. The files in a child directory load on demand.

## cAgents cagents-memory Overview

```
cagents-memory/
├── _system/          # configs, commands/, domains/, metrics/, evals/, templates/
├── _knowledge/       # semantic, procedural, calibration, analytics
├── _archive/         # Completed sessions
└── sessions/         # run_*, designer_*, review_*, optimize_*, team_*, org_*
```

**Session ID Format**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `run_fix-auth_260317_001`)

See `agent-memory-reference.md` for the full directory structure, and for the
session folder details.

## Three-File Pattern (V8.0)

This is an aspirational pattern. It holds task_plan.md, findings.md, and
progress.md, and it gives compact session tracking. Nothing enforces it at run
time. See docs/DESIGN_NOTES.md.

## Waypoints

cAgents creates a snapshot at each phase transition, and before each context
compaction. The types are `phase_transition`, `work_item_complete`, `periodic`,
and `pre_compact`.

## Session Discovery Internals

**v12.15.0+ deterministic chain: the concurrency contract**

`findActiveSession(sessionHintOrOptions)` resolves the active cAgents session
through an explicit deterministic chain. The legacy heuristic made three passes:
status-newest-first, then a 5-minute grace window, then a nested-org
subdirectory scan. An explicit `{fallbackHeuristic: true}` opt-in now gates that
heuristic, and only single-session diagnostic tooling uses it.

**Default chain (no fallback)**:

1. **`sessionHint`**. The hook payload supplies this value as
   `input.session_id`. If the directory exists, and if the session has a
   non-terminal `pipeline_state` or a non-terminal `phase`, return the session.
   A session with no status.yaml yet is in the race window, and it also
   returns. If the session is terminal, return null.
1a. **Persisted SDK-UUID map** (v12.32.0+). Sometimes `sessionHint` is an SDK
   transcript UUID. That is the 8-4-4-4-12 hex shape the hooks receive, and it
   is not a cAgents directory name. In that case `findActiveSession` consults
   the persisted map through `resolveSdkUuidToSession(uuid)`, BEFORE the env-var
   step.

   A live pointer is a deterministic resolution. The pointer is
   `cagents-memory/_system/sdk_session_map/{uuid}`, which names the owning
   session_id, and the per-session `sessions/{id}/session.sdk_id` marker goes
   with it. A miss falls through to step 2, and it never resolves to a sibling
   session. A miss means no pointer at all, or a target that is terminal or
   missing, because the map is reaped lazily.

   `findTeamSession` mirrors this behavior for `team_` pointers.
   `upsertSdkSessionMap` writes the map from `subagent-tracker.cjs` and from
   `session-init-gate.cjs`, on a confident resolution. `team-stop.cjs` unlinks
   the map at SessionEnd. See
   `.claude/rules/playbooks/pat-concurrent-session-hooks.md` and session
   `run_hook-session-id_260701_001`.
2. **`process.env.CAGENTS_ACTIVE_SESSION`**. The same rules apply.
3. **`promptHint`**. Pass-3 of subagent-tracker extracts this value from the
   prompt text. The same rules apply.
4. **`null`**. Refuse to resolve to the "newest active" session in silence.

**Cache**: `_cachedActiveSessions` is a `Map`. Its key is the composite key
`sessionHint|envSession|promptHint|fallback`. Two distinct inputs never share a
cache entry. That closes the H6 cache leak, where an unhinted call returned a
hinted result from an earlier cache write. Tests call
`_resetActiveSessionCache()` between runs.

**Legacy heuristic**: opt in with
`findActiveSession({fallbackHeuristic: true})`. The heuristic restores the
pre-v12.15.0 behavior, which is the status pass, then the grace pass, then the
nested-org pass. Only the Stop hooks and the SessionEnd hooks use it, because
they legitimately need to finalize a terminal session. Those hooks are
`verify-completion.cjs` and the fallback path of `team-stop.cjs`.

**Why the deterministic chain**: two concurrent cAgents sessions can run in the
same directory. In that case the legacy heuristic resolved to the WRONG session.
The status pass picked the newest session first, and the grace pass picked the
last-touched session. The deterministic chain binds each hook to its own
session, through the `input.session_id` field of the payload.

See `.claude/rules/core/hooks.md` § Concurrency Contract for the full hook-level
invariants. See session `run_concurrent-session-hooks_260602_001` for the
empirical regression-test record.

## Memory Principles

- **File-based**: All state persists to disk
- **Session-scoped**: Isolated per command invocation
- **Parallel-safe**: Multiple sessions simultaneously
- **Pause/resume**: Via waypoints
- **Git-ignored**: cagents-memory/ excluded from version control
- **Context-efficient**: the workflow artifacts and the waypoints give context recovery. The three-file pattern is an optional supplement.

---
paths:
  - "cagents-memory/**"
  - ".claude/hooks/**"
  - ".claude/skills/**"
---

# Agent Memory Structure

File-based memory organization for cAgents. Aligned with Claude Code's memory hierarchy.

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

**Auto Memory**: Persistent directory at `~/.claude/projects/<project>/memory/MEMORY.md`. Toggle with `/memory`. Separate from cagents-memory/. Configure with `autoMemoryDirectory` setting to point auto memory at a custom path — for example, `cagents-memory/_knowledge/` to share learnings across agents in the same project:

```json
{
  "autoMemoryDirectory": "cagents-memory/_knowledge/"
}
```

This lets multiple agents write to a shared knowledge store, enabling cross-session pattern accumulation.

**Path-Specific Rules**: Add `paths:` YAML frontmatter with glob patterns. Rules without `paths` apply unconditionally.

**Recursive Lookup**: CLAUDE.md files read recursively up directory tree. Child directory files load on demand.

## cAgents cagents-memory Overview

```
cagents-memory/
├── _system/          # configs, commands/, domains/, metrics/, evals/, templates/
├── _knowledge/       # semantic, procedural, calibration, analytics
├── _archive/         # Completed sessions
└── sessions/         # run_*, designer_*, review_*, optimize_*, team_*, org_*
```

**Session ID Format**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `run_fix-auth_260317_001`)

See `agent-memory-reference.md` for full directory structure and session folder details.

## Three-File Pattern (V8.0)

Aspirational pattern (task_plan.md / findings.md / progress.md compact session
tracking) — not runtime-enforced. See docs/DESIGN_NOTES.md.

## Waypoints

Snapshots created at phase transitions and before context compaction. Types: `phase_transition`, `work_item_complete`, `periodic`, `pre_compact`.

## Session Discovery Internals

**v12.15.0+ — deterministic chain (concurrency contract):**

`findActiveSession(sessionHintOrOptions)` resolves the active cAgents session via
an explicit deterministic chain. The legacy 3-pass heuristic (status-newest-first,
5-minute grace, nested-org subdir scan) is now gated behind an explicit
`{fallbackHeuristic: true}` opt-in for single-session diagnostic tooling.

**Default chain (no fallback)**:

1. **`sessionHint`** (typically `input.session_id` from the hook payload) — if
   the directory exists and the session is in a non-terminal `pipeline_state` /
   `phase` (or has no status.yaml yet — race window), return it. If terminal,
   return null.
2. **`process.env.CAGENTS_ACTIVE_SESSION`** — same rules.
3. **`promptHint`** (e.g., extracted from prompt text by subagent-tracker
   Pass-3) — same rules.
4. **`null`** — refuse to silently resolve to "newest active" session.

**Cache**: `_cachedActiveSessions` is a `Map` keyed by the composite key
`sessionHint|envSession|promptHint|fallback`. Distinct inputs never share cache
entries (closes the H6 cache-leak where an unhinted call returned a previously
cached hinted result). Tests call `_resetActiveSessionCache()` between runs.

**Legacy heuristic** (opt-in via `findActiveSession({fallbackHeuristic: true})`):
restores the pre-v12.15.0 status-pass + grace-pass + nested-org-pass behavior.
Used only by Stop / SessionEnd hooks that legitimately need to finalize a
terminal session (`verify-completion.cjs`, `team-stop.cjs` fallback path).

**Why the deterministic chain**: under two concurrent same-directory cAgents
sessions, the legacy heuristic actively resolved to the WRONG session (status
pass picked newest-first; grace pass picked last-touched). The deterministic
chain binds each hook to its own session via the payload's `input.session_id`.

See `.claude/rules/core/hooks.md` § Concurrency Contract for the full hook-level
invariants and session `run_concurrent-session-hooks_260602_001` for the
empirical regression-test record.

## Memory Principles

- **File-based**: All state persists to disk
- **Session-scoped**: Isolated per command invocation
- **Parallel-safe**: Multiple sessions simultaneously
- **Pause/resume**: Via waypoints
- **Git-ignored**: cagents-memory/ excluded from version control
- **Context-efficient**: Workflow artifacts and waypoints provide context recovery; three-file pattern is an optional supplement

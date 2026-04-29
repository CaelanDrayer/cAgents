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
├── _communication/   # inbox/{agent}/, broadcast/
└── sessions/         # run_*, designer_*, review_*, optimize_*, team_*, org_*
```

**Session ID Format**: `{command}_{slug}_{YYMMDD}_{NNN}` (e.g., `run_fix-auth_260317_001`)

See `agent-memory-reference.md` for full directory structure and session folder details.

## Three-File Pattern (V8.0)

> **Note**: This pattern is aspirational/historical. It was designed as a best practice for context-efficient session tracking but is not enforced or consistently used in practice. Sessions typically rely on `workflow/` artifacts (plan.yaml, coordination_log.yaml) and waypoints instead. Agents MAY use this pattern but are not required to.

Compact session tracking that survives context compaction (60-80% savings vs full logs):

1. **task_plan.md** (500-2000 tokens): Work item breakdown with completion status
2. **findings.md** (1000-5000 tokens): Discoveries, decisions, Q&A
3. **progress.md** (200-500 tokens): Current status and resume instructions

See `agent-memory-reference.md` for examples.

## Waypoints

Snapshots created at phase transitions and before context compaction. Types: `phase_transition`, `work_item_complete`, `periodic`, `pre_compact`.

## Session Discovery Internals

`findActiveSession()` uses a three-pass algorithm to locate the active session:
1. **Hint pass**: If `session_id` is provided, check that directory directly.
2. **Status pass**: Scan all session dirs for a non-terminal `pipeline_state` / `phase`.
3. **Grace pass**: Sessions created within `SESSION_DISCOVERY_GRACE_PERIOD_MS` (5 minutes) that lack `status.yaml` are treated as active. This bridges the race between session dir creation and first status write. Constant defined in `hook-utils.cjs`. Nested org subdirectory scanning is mutex-locked via `withFileLock` to prevent concurrent hooks from double-discovering the same session.

## Memory Principles

- **File-based**: All state persists to disk
- **Session-scoped**: Isolated per command invocation
- **Parallel-safe**: Multiple sessions simultaneously
- **Pause/resume**: Via waypoints
- **Git-ignored**: cagents-memory/ excluded from version control
- **Context-efficient**: Workflow artifacts and waypoints provide context recovery; three-file pattern is an optional supplement

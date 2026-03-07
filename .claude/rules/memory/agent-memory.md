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

**Auto Memory**: Persistent directory at `~/.claude/projects/<project>/memory/MEMORY.md`. Toggle with `/memory`. Separate from Agent_Memory/.

**Path-Specific Rules**: Add `paths:` YAML frontmatter with glob patterns. Rules without `paths` apply unconditionally.

**Recursive Lookup**: CLAUDE.md files read recursively up directory tree. Child directory files load on demand.

## cAgents Agent_Memory Overview

```
Agent_Memory/
├── _system/          # configs, commands/, domains/, metrics/, evals/, templates/
├── _knowledge/       # semantic, procedural, calibration, analytics
├── _archive/         # Completed sessions
├── _communication/   # inbox/{agent}/, broadcast/
└── sessions/         # run_*, designer_*, review_*, optimize_*, team_*, org_*
```

**Session ID Format**: `{command}_{YYYYMMDD}_{HHMMSS}`

See `agent-memory-reference.md` for full directory structure and session folder details.

## Three-File Pattern (V8.0)

Compact session tracking that survives context compaction (60-80% savings vs full logs):

1. **task_plan.md** (500-2000 tokens): Work item breakdown with completion status
2. **findings.md** (1000-5000 tokens): Discoveries, decisions, Q&A
3. **progress.md** (200-500 tokens): Current status and resume instructions

See `agent-memory-reference.md` for examples.

## Waypoints

Snapshots created at phase transitions and before context compaction. Types: `phase_transition`, `work_item_complete`, `periodic`, `pre_compact`.

## Memory Principles

- **File-based**: All state persists to disk
- **Session-scoped**: Isolated per command invocation
- **Parallel-safe**: Multiple sessions simultaneously
- **Pause/resume**: Via waypoints
- **Git-ignored**: Agent_Memory/ excluded from version control
- **Context-efficient**: Three-file pattern reduces load by 60-80%

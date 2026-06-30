# cAgents Documentation

**Version**: 12.29.0
**Last Updated**: 2026-06-18

## Quick Navigation

| Audience | Start Here |
|----------|-----------|
| **New users** | `GETTING_STARTED.md` then `COMMANDS.md` |
| **Developers** | `ARCHITECTURE.md` then `DOMAIN_STRUCTURE_STANDARD.md` |
| **Contributors** | `DOCUMENTATION_STANDARDS.md` then `CONTEXT_MANAGEMENT.md` |

## Documentation Index

### Architecture and Workflow
- `ARCHITECTURE.md` - System architecture overview
- `AUTOMATIC_WORKFLOW_PROGRESSION.md` - Phase transition policy (auto-proceed rules)
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `CLAUDE_CODE_HOOKS_SPECIFICATION.md` - Claude Code hooks API reference

### Commands and Skills
- `COMMANDS.md` - All 4 active cAgents skills reference (`/designer`, `/helper`, `/run`, `/team`) — `/improve` folded into `/run` in v12.1.2 via keyword router; `/org` removed in v12.2.0 (folded into `/team` strategic mode)
- `MIGRATION-V11.md` - Migration guide for users of removed skills (`/review`, `/optimize`, `/context`, `/debug` → `/improve` or `/run`); v12.1.2 further folded `/improve` into `/run` via keyword router (see CHANGELOG)
- `COMMAND_SELECTION.md` - Guide for choosing the right command
- `SKILLS.md` - Detailed skill documentation
- `TEAM_MODE.md` - N-wave parallel team execution guide

### Quality and Operations
- `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` - Task completion protocol
- `TASK_CONSOLIDATION.md` - Task consolidation strategies (40-88% reduction)
- `WORKFLOW_EVALUATION_FIXES.md` - Workflow issue resolutions

### Standards
- `DOCUMENTATION_STANDARDS.md` - Documentation conventions
- `DOMAIN_STRUCTURE_STANDARD.md` - Domain package structure

### Project Meta
- `GETTING_STARTED.md` - Quick start guide
- `RELEASE_NOTES.md` - Version history
- `CHANGELOG.md` - Detailed change log
- `OPTIMIZATION_PROGRESS.md` - Performance tracking
- `REMAINING_OPTIMIZATIONS.md` - Planned optimizations

### Subdirectories
- `agents/` - Agent-specific documentation
- `architecture/` - Architecture diagrams and details
- `commands/` - Per-command deep dives
- `config/` - Configuration reference
- `hooks/` - Hook system details
- `migration/` - Migration guides
- `templates/` - Document templates
- `testing/` - Test documentation

### Archived
- `archive/docs/` - Historical documentation
- `archive/docs/versioned/` - Versioned feature docs (trigger-v2, designer-v2, optimizer-v7, reviewer-v3)

## Canonical References

- **Architecture**: `CLAUDE.md` (root) is the single source of truth
- **Rules**: `.claude/rules/` contains modular topic-specific rules
- **Agent specs**: `{domain}/agents/{name}/SKILL.md` per agent
- **Domain config**: `{domain}/config/domain_overrides.yaml` per domain

---

**Maintained By**: cAgents Core Team
**Last Cleanup**: 2026-06-18

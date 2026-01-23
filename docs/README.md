# cAgents Documentation

**Version**: 7.5.1 (Controller-Centric Architecture with Task Inventory)
**Last Updated**: 2026-01-22

## Documentation Structure

This directory contains all project documentation organized by category.

### Core Documentation

**Standards and Guidelines**:
- `DOCUMENTATION_STANDARDS.md` - Documentation best practices and conventions
- `DOMAIN_STRUCTURE_STANDARD.md` - Domain package structure standards
- `AGENT_OPTIMIZATION_INSTRUCTION.md` - Agent optimization guidelines

**System Architecture**:
- `ARCHITECTURE.md` - System architecture overview
- `AUTOMATIC_WORKFLOW_PROGRESSION.md` - Automatic phase transition policy (CRITICAL)
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` - Task completion protocol
- `TASK_CONSOLIDATION.md` - Task consolidation strategies (40-88% reduction)
- `TOKEN_MIGRATION_SUMMARY.md` - Token optimization migration details
- `WORKFLOW_EVALUATION_FIXES.md` - Workflow issue resolutions

**Project Meta**:
- `COMMANDS.md` - All cAgents commands reference
- `GETTING_STARTED.md` - Quick start guide
- `RELEASE_NOTES.md` - Version history and changes
- `OPTIMIZATION_PROGRESS.md` - Ongoing optimization tracking

### Archived Feature Documentation

Versioned feature documentation has been archived to `archive/docs/versioned/`:

| Feature | Location | Key Files |
|---------|----------|-----------|
| Trigger V2.0 | `archive/docs/versioned/trigger-v2/` | Architecture, migration guide, test scenarios |
| Designer V2.0 | `archive/docs/versioned/designer-v2/` | Optimization summary, migration guide |
| Optimizer V7.0 | `archive/docs/versioned/optimizer-v7/` | Migration guide, test results |
| Reviewer V3.0 | `archive/docs/versioned/reviewer-v3/` | Summary, migration guide |

### Historical Documentation

Other archived documentation in `archive/docs/`:
- Implementation plans (completed)
- Execution summaries (historical)
- Old orchestration docs (V2.0 superseded by V5.0)
- Scripts audit (completed)

## Quick Navigation

### Getting Started
1. Read main `../CLAUDE.md` for architecture overview
2. Read `AUTOMATIC_WORKFLOW_PROGRESSION.md` for workflow behavior (CRITICAL)
3. Review `COMMANDS.md` for available commands
4. See `GETTING_STARTED.md` for quick start guide

### For Developers
- **Adding a domain**: See `DOMAIN_STRUCTURE_STANDARD.md`
- **Optimizing agents**: See `AGENT_OPTIMIZATION_INSTRUCTION.md`
- **Writing documentation**: See `DOCUMENTATION_STANDARDS.md`
- **Understanding context**: See `CONTEXT_MANAGEMENT.md`
- **Task completion**: See `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md`

### For Users
- **Quick Start**: See `GETTING_STARTED.md`
- **Commands Reference**: See `COMMANDS.md`
- **Architecture**: See `ARCHITECTURE.md`

## Documentation Principles

1. **Single Source of Truth**: Each concept documented in one place
2. **Version-Specific**: Clearly marked with version numbers
3. **Archive Historical**: Move outdated docs to archive
4. **Migration Guides**: Provide upgrade paths when needed

## File Naming Conventions

- `[TOPIC]_[DESCRIPTOR].md` - General topic docs
- `README.md` - Index and navigation (this file)

## Documentation Status

**Active Documentation** (This Directory): 19 files
**Archived Documentation**: `archive/docs/` and `archive/docs/versioned/`

---

**Maintained By**: cAgents Core Team
**Questions**: See main project README or CLAUDE.md
**Last Cleanup**: 2026-01-22

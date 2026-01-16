# cAgents Documentation

**Version**: 7.0 (Controller-Centric Architecture)
**Last Updated**: 2026-01-16

## Documentation Structure

This directory contains all project documentation organized by category.

### Core Documentation (Root Level)

**Standards and Guidelines**:
- `DOCUMENTATION_STANDARDS.md` - Documentation best practices and conventions
- `DOMAIN_STRUCTURE_STANDARD.md` - Domain package structure standards
- `AGENT_OPTIMIZATION_INSTRUCTION.md` - Agent optimization guidelines

**System Architecture**:
- `AUTOMATIC_WORKFLOW_PROGRESSION.md` - Automatic phase transition policy (CRITICAL)
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` - Task completion protocol
- `TASK_CONSOLIDATION.md` - Task consolidation strategies (40-88% reduction)
- `TOKEN_MIGRATION_SUMMARY.md` - Token optimization migration details
- `WORKFLOW_EVALUATION_FIXES.md` - Workflow issue resolutions

**Project Meta**:
- `COMMANDS.md` - All cAgents commands reference
- `RELEASE_NOTES.md` - Version history and changes
- `OPTIMIZATION_PROGRESS.md` - Ongoing optimization tracking

### Feature-Specific Documentation (Subdirectories)

#### Trigger V2.0 (`trigger-v2/`)
Universal workflow entry point with context-aware detection and pre-flight validation.

- `TRIGGER_V2_ARCHITECTURE.md` - Complete technical architecture
- `TRIGGER_V2_MIGRATION_GUIDE.md` - V1.0 → V2.0 upgrade guide
- `TRIGGER_V2_OPTIMIZATION_SUMMARY.md` - Performance improvements and features
- `TRIGGER_V2_OPTIMIZATION_INSTRUCTION.md` - Implementation instruction (reference)
- `TRIGGER_V2_TEST_SCENARIOS.md` - 125 test scenarios and benchmarks
- `TRIGGER_TODOWRITE_ENHANCEMENT.md` - TodoWrite tracking implementation

**Key Features**: 2-3x faster, 90%+ accuracy, 50% fewer failures, 100% backward compatible

#### Designer V2.0 (`designer-v2/`)
Interactive design assistant with smart chunking and adaptive questioning.

- `DESIGNER_V2_OPTIMIZATION_SUMMARY.md` - V2.0 improvements overview
- `DESIGNER_V2_MIGRATION_GUIDE.md` - V1.0 → V2.0 upgrade guide
- `DESIGNER_V2_TEST_SCENARIOS.md` - Comprehensive test cases

**Key Features**: Smart chunking, context discovery, adaptive questioning, runs until canceled

#### Optimizer V7.0 (`optimizer-v7/`)
Universal optimizer with trigger-style workflow and controller-centric coordination.

- `OPTIMIZER_V7_MIGRATION_GUIDE.md` - V6.0 → V7.0 upgrade guide
- `OPTIMIZER_V7_TEST_RESULTS.md` - Test results and validation

**Key Features**: Zero-arg invocation, auto-detection, 8 optimization types, continuous monitoring

#### Reviewer V3.0 (`reviewer-v3/`)
Enhanced universal review with intelligent agent selection and severity-based reporting.

- `REVIEWER_V3_MIGRATION_GUIDE.md` - V2.0 → V3.0 upgrade guide
- `REVIEWER_V3_SUMMARY.md` - V3.0 enhancements overview

**Key Features**: 33% faster, 81% faster to critical issues, 98% more actionable, 78% pattern detection

### Historical Documentation (`../archive/docs/`)

Outdated or completed documentation moved to `archive/docs/`:
- Implementation plans (completed)
- Execution summaries (historical)
- Old orchestration docs (V2.0 superseded by V5.0)
- Scripts audit (completed)
- Daily checklists (archived)
- Agent templates (moved to archive, use agent files as reference)

## Quick Navigation

### Getting Started
1. Read main `../CLAUDE.md` for architecture overview
2. Read `AUTOMATIC_WORKFLOW_PROGRESSION.md` for workflow behavior (CRITICAL)
3. Review `COMMANDS.md` for available commands
4. Check feature-specific docs in subdirectories for detailed guides

### For Developers
- **Adding a domain**: See `DOMAIN_STRUCTURE_STANDARD.md`
- **Optimizing agents**: See `AGENT_OPTIMIZATION_INSTRUCTION.md`
- **Writing documentation**: See `DOCUMENTATION_STANDARDS.md`
- **Understanding context**: See `CONTEXT_MANAGEMENT.md`
- **Task completion**: See `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md`

### For Users
- **Using /trigger**: See `trigger-v2/TRIGGER_V2_MIGRATION_GUIDE.md`
- **Using /designer**: See `designer-v2/DESIGNER_V2_MIGRATION_GUIDE.md`
- **Using /optimize**: See `optimizer-v7/OPTIMIZER_V7_MIGRATION_GUIDE.md`
- **Using /reviewer**: See `reviewer-v3/REVIEWER_V3_MIGRATION_GUIDE.md`

## Documentation Principles

1. **Single Source of Truth**: Each concept documented in one place
2. **Organized by Feature**: Feature-specific docs in subdirectories
3. **Version-Specific**: Clearly marked with version numbers
4. **Migration Guides**: Always provide upgrade paths
5. **Test Scenarios**: Document testing approach
6. **Architecture Specs**: Technical implementation details
7. **Archive Historical**: Move outdated docs to archive

## File Naming Conventions

- `[FEATURE]_V[VERSION]_[TYPE].md` - Feature-specific docs
- `[TOPIC]_[DESCRIPTOR].md` - General topic docs
- `README.md` - Index and navigation (this file)

## Contributing Documentation

When adding new documentation:

1. **Follow standards**: See `DOCUMENTATION_STANDARDS.md`
2. **Use correct location**:
   - Core architecture → Root level
   - Feature-specific → Feature subdirectory
   - Historical/completed → `archive/docs/`
3. **Update this README**: Add new docs to relevant section
4. **Version appropriately**: Use semantic versioning in filenames
5. **Provide migration**: Always include upgrade guides for breaking changes

## Documentation Status

**Current** (Root Level): 12 files
**Feature-Specific** (Subdirectories): 13 files across 4 features
**Historical** (Archive): 13 files

**Total Active Documentation**: 25 files
**Organization**: 4 feature subdirectories + root level + archive

---

**Maintained By**: cAgents Core Team
**Questions**: See main project README or CLAUDE.md
**Last Cleanup**: 2026-01-16

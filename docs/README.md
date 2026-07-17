# cAgents Documentation

**Version**: 12.53.0
**Last Updated**: 2026-07-16

This index groups every file under `docs/` into three explicit buckets so the
~66 documents are navigable at a glance:

- **[Canonical / Living](#canonical--living)** — the current, authoritative docs you should read and keep current.
- **[Historical / Superseded](#historical--superseded)** — tracking, implementation-summary, and migration artifacts kept for the record.
- **[Redirect tombstones](#redirect-tombstones)** — deliberate bookmark-preservers that redirect to the current home of a moved/removed topic.

Every file listed below exists on disk. Nothing here is a dead link.

## Quick Navigation

| Audience | Start Here |
|----------|-----------|
| **New users** | `GETTING_STARTED.md` then `SKILLS_REFERENCE.md` |
| **Developers** | `ARCHITECTURE.md` then `DOMAIN_STRUCTURE_STANDARD.md` |
| **Contributors** | `CONTRIBUTING.md` then `DOCUMENTATION_STANDARDS.md` |

---

## Canonical / Living

The current authoritative documentation. Read these first; keep them accurate.

### Getting Started and Architecture
- `GETTING_STARTED.md` - Quick start guide
- `ARCHITECTURE.md` - System architecture overview
- `AUTOMATIC_WORKFLOW_PROGRESSION.md` - Phase transition policy (auto-proceed rules)
- `LIFECYCLE.md` - Pipeline lifecycle and state transitions
- `WORKFLOW_AGENT_INTERACTIONS.md` - Agent interaction patterns
- `CONTEXT_MANAGEMENT.md` - Context handling and token management
- `CLAUDE_CODE_HOOKS_SPECIFICATION.md` - Claude Code hooks API reference
- `12-FACTOR-COMPLIANCE.md` - Twelve-factor design compliance notes
- `MULTI_TOOL_DEPLOYMENT.md` - Deploying across multiple tool surfaces

### Commands and Skills
> **Canonical pointer:** `SKILLS_REFERENCE.md` is the single canonical reference
> for the 4 active cAgents skills. `COMMANDS.md` and `COMMAND_SELECTION.md` are
> related surfaces — consult `SKILLS_REFERENCE.md` first
> (see the [Skills/commands cluster](#skillscommands-cluster) note below).

- **`SKILLS_REFERENCE.md`** - **Canonical** v12.x skill reference (`/designer`, `/helper`, `/run`, `/team`)
- `COMMANDS.md` - All 4 active cAgents skills reference (`/improve` folded into `/run` in v12.1.2 via keyword router; `/org` removed in v12.2.0, folded into `/team` strategic mode) → see `SKILLS_REFERENCE.md`
- `COMMAND_SELECTION.md` - Guide for choosing the right command → see `SKILLS_REFERENCE.md`
- `TEAM_MODE.md` - N-wave parallel team execution guide
- Per-command deep dives (live under `commands/`): `commands/run.md`, `commands/team.md`, `commands/designer.md`, `commands/helper.md`

### Security
- `SECURITY.md` - Vulnerability-reporting policy and security architecture
- `SECURITY_BASH_GUARD_THREAT_MODEL.md` - Bash guard threat model + GuardFall hardening (tokenize-and-canonicalize evaluator implemented in v12.34.0 as `.claude/hooks/bash-guard-evaluator.cjs`, closing the named Class A–E single-command bypass shapes; §7 residuals remain open)

### Standards and Contribution
- `DOCUMENTATION_STANDARDS.md` - Documentation conventions
- `DOMAIN_STRUCTURE_STANDARD.md` - Domain package structure
- `CONTRIBUTING.md` - Contribution workflow and conventions

---

## Historical / Superseded

Tracking, implementation-summary, and migration artifacts kept for the record.
These describe past work or planned/future work; they are not the live spec.

- `RELEASE_NOTES.md` - Version history (per-release notes)
- `OPTIMIZATION_PROGRESS.md` - Performance-optimization tracking
- `REMAINING_OPTIMIZATIONS.md` - Planned/queued optimizations
- `TASK_COMPLETION_ENFORCEMENT_SUMMARY.md` - Task completion protocol summary
- `TASK_CONSOLIDATION.md` - Task consolidation strategies (40-88% reduction)
- `WORKFLOW_EVALUATION_FIXES.md` - Historical workflow issue resolutions
- `FUTURE_VALIDATION_FRAMEWORK.md` - Deferred validation-framework roadmap (the 24 aspirational checks)
- `DESIGN_NOTES.md` - Aspirational/design-note patterns (not runtime-enforced)
- `VERSION_REGISTRY_HISTORY.md` - Historical version-registry locations (V10.x)
- `MIGRATION_GUIDE.md` - General migration guide
- `MIGRATION-V11.md` - Migration guide for users of removed skills (`/review`, `/optimize`, `/context`, `/debug` → `/run`); v12.1.2 further folded `/improve` into `/run` via keyword router (see CHANGELOG)
- `PLUGIN_DATA_MIGRATION.md` - Plugin data-directory migration notes
- `migration/v11.1.0-followups.md` - v11.1.0 archetype-tree follow-up items
- `migration/v9-to-v10.md` - V9 → V10 migration record

---

## Redirect tombstones

Deliberate bookmark-preservers. Each of these is a short stub that redirects to
the current home of a moved or removed topic. **They are intentionally retained —
do not delete them.**

- `CHANGELOG.md` - Redirect → repository-root `../CHANGELOG.md` (this stub covers only up to V10.0.0)
- `SKILLS.md` - Redirect → `SKILLS_REFERENCE.md` (moved-skill-docs stub)
- `commands/org.md` - Redirect → `/team` strategic mode (`/org` removed in v12.2.0)
- `commands/optimize.md` - Redirect → `/run optimize` (`/optimize` removed in V11.0)
- `commands/review.md` - Redirect → `/run review` (`/review` removed in V11.0)

---

## Skills/commands cluster

Several docs describe the skills/commands surface. To avoid drift, **one file is
canonical; consult it first**:

| File | Role |
|------|------|
| **`SKILLS_REFERENCE.md`** | **Canonical** — authoritative v12.x skill reference |
| `COMMANDS.md` | Overview reference — related surface; consult `SKILLS_REFERENCE.md` first |
| `COMMAND_SELECTION.md` | Choosing-a-command guide — related surface; consult `SKILLS_REFERENCE.md` first |
| `commands/*.md` | Per-command deep dives (`run`, `team`, `designer`, `helper` are live; `org`, `optimize`, `review` are redirect tombstones) |
| `SKILLS.md` | Redirect tombstone → `SKILLS_REFERENCE.md` |

## Subdirectories

- `agents/` - Agent authoring docs (`agents/index.md`, `agents/creating-agents.md`, `agents/agent-template.md`)
- `architecture/` - Architecture diagrams and details
- `commands/` - Per-command deep dives (4 live: `run`, `team`, `designer`, `helper`) + 3 redirect tombstones (`org`, `optimize`, `review`)
- `config/` - Configuration reference
- `hooks/` - Hook system details
- `migration/` - Migration records (see Historical / Superseded)
- `templates/` - Document templates (10 files)
- `testing/` - Test documentation

> **Known sub-sprawl (deferred):** `templates/` (10 files) overlaps with
> `agents/agent-template.md`; this duplication is a known follow-up and is **not**
> consolidated in this pass.

---

## Canonical References

- **Architecture**: `CLAUDE.md` (root) is the single source of truth
- **Rules**: `.claude/rules/` contains modular topic-specific rules
- **Agent specs**: `agents/{archetype}/[branch/]{name}/SKILL.md` per agent (post-v11.1.0 archetype tree; `branch/` is present only for the 3-level archetypes — developer, operator, advisor)
- **Domain config**: only the `people/` and `shared/` overlays still carry `config/domain_overrides.yaml` (at `agents/_overlay/people/config/domain_overrides.yaml` and `agents/_overlay/shared/config/domain_overrides.yaml`); the 11 legacy domains were consolidated into `cagents-memory/_system/config/routing.yaml`

## Archived

Historical and versioned feature documentation is kept in a local-only archive that is excluded from source control (the `archive/` entry in `.gitignore`). It is intentionally absent from standard checkouts, so there is no browsable archive path in this repository.

---

**Maintained By**: cAgents Core Team
**Last Cleanup**: 2026-07-16

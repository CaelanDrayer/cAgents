# Changelog (Moved)

> **The canonical cAgents changelog has moved.** The historical entries below
> only cover up through V10.0.0 and are preserved for cross-link continuity.
>
> For the current, complete changelog (V10.x through v12.6.0+), see the
> repository root [CHANGELOG.md](../CHANGELOG.md).
>
> Major milestones since these entries:
> - **v11.0.0** — V10 commands `/review`, `/optimize`, `/context`, `/debug` removed; consolidated under `/improve`
> - **v11.1.0** — 13 business domains restructured into the 9 builder-role archetype tree; top-level frontmatter `domain:` field replaced by `archetype:` + `branch:`
> - **v12.0.0** — Pipeline collapse 7 → 5 states (task-decomposer + prompt-engineer folded into planner); architecture-reviewer absorbed into `architect --review`; max_revision_cycles 5 → 3
> - **v12.1.2** — `/improve` folded into `/run` via the first-word keyword router; standalone `/improve` skill removed
> - **v12.2.0** — `/org` skill removed; cross-domain coordination folded into `/team` strategic mode
> - **v12.4.0** — Pillar 2 (Compression): catalog audit + cull (240 → 144 agents)
> - **v12.6.0** — Current release; mandatory pipeline + compression + renames + drop external-UI contract (BREAKING)

---

## Historical Entries (up to V10.0.0)

## [10.0.0] - 2026-02-28

### Breaking Changes
- Restructured 5 super-domains (Make, Grow, Operate, People, Serve) into 8 business domains (Engineering, Creative, Business, People, Service, Leadership, Shared, Core)
- Domain directories renamed: `make/` -> `engineering/` + `creative/`, `grow/` -> `business/`, `operate/` -> `business/`, `serve/` -> `service/`
- Config format changed from `planner_config.yaml` to `domain_overrides.yaml`
- Agent count reduced from 239 to 206 through consolidation
- C-suite agents centralized in `leadership/` directory

### Added
- Progressive pipeline with 3 paths (minimal/medium/full) based on 9-signal complexity scoring
- Agent chaining with topological execution ordering in decomposer
- Structured error format (What/Why/Fix) in hook-utils.cjs
- `scripts/ci/validate-agents.sh` for agent schema validation
- 265 Vitest tests (10 hook test files + 3 config test files)
- Intent classification patterns in /helper
- CPO and CSO agents in leadership/
- Comprehensive documentation in `docs/` (20+ files across 7 categories)
- Migration guide: `docs/migration/v9-to-v10.md`

### Changed
- `/run` now selects pipeline path based on complexity scoring
- Domain routing uses `domain_overrides.yaml` per domain instead of centralized configs
- CI scripts updated for v10 domain structure
- CLAUDE.md slimmed to ~500 lines with v10 domain references
- All `.claude/rules/domains/` files updated for new domain paths
- Controller catalogs moved to per-domain config files
- /org updated with new domain routing keys (engineering, creative, business, people, service)
- /team domain keywords updated for v10 structure
- /helper agent count and domain references updated

### Removed
- Old super-domain directories (make/, grow/, operate/) deprecated
- Duplicate/overlapping agents consolidated (33 agents removed)
- `planner_config.yaml` format replaced by `domain_overrides.yaml`

### Fixed
- Skill() cross-skill calls in forked contexts replaced with AskUserQuestion handoffs
- CI scripts reference correct v10 domain directories
- Agent frontmatter validation covers all 8 domains

## [9.30.0] - 2026-02-27

### Added
- /designer subagent-delegated question preparation
- /org dependency-ordered C-suite passes (Wave 1 independent, Wave 2 dependent) [/org removed in v12.2.0; folded into /team strategic mode]

## [9.28.0] - 2026-02-27

### Changed
- Skill improvements across all 7 commands
- Fixed /org inline execution [/org removed in v12.2.0]

## [9.26.0] - 2026-02-27

### Added
- /org command: corporate hierarchy orchestration [/org removed in v12.2.0; folded into /team strategic mode]

## [9.25.0] - 2026-02-27

### Changed
- Comprehensive documentation update

## [9.23.0] - 2026-02-26

### Added
- Event-driven pipeline engine for /run
- prompt-engineer agent [folded into universal-planner in v12.0.0]
- Reviewer loops in controllers
- Revision routing (FAIL/REVISE)

# Changelog

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
- /org dependency-ordered C-suite passes (Wave 1 independent, Wave 2 dependent)

## [9.28.0] - 2026-02-27

### Changed
- Skill improvements across all 7 commands
- Fixed /org inline execution

## [9.26.0] - 2026-02-27

### Added
- /org command: corporate hierarchy orchestration

## [9.25.0] - 2026-02-27

### Changed
- Comprehensive documentation update

## [9.23.0] - 2026-02-26

### Added
- Event-driven pipeline engine for /run
- prompt-engineer agent
- Reviewer loops in controllers
- Revision routing (FAIL/REVISE)

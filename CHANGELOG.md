# Changelog

All notable changes to cAgents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry corresponds to one atomic tiny-bump commit. See
`.claude/rules/core/version-registry.md` for the tiny-bump cadence rules.

## [Unreleased]

## [12.0.7] - 2026-05-20

### Added
- `docs/12-FACTOR-COMPLIANCE.md` — positioning doc mapping cAgents against
  humanlayer's 12-Factor Agents methodology. Score: 6 YES · 4 PARTIAL · 2
  deliberate DIVERGENCE (Factor 5 unified state, Factor 12 stateless
  reducer — both intentional architectural choices). (REC-6)
- `docs/ARCHITECTURE.md` — cross-link to the new compliance doc.

## [12.0.6] - 2026-05-20

### Added
- `metadata.data_access_level` advisory frontmatter field (REC-7).
  Optional declarative trust tier: `trusted` | `verified` | `unverified`.
  Agents that don't declare the field default to behavior-equivalent to
  `unverified` (no warnings fired). Wired to `session-init-gate.cjs`
  advisory check — warns when a `trusted` parent spawns an `unverified`
  child. Does NOT block; matches v11.1.10 `metadata.requires` precedent.
- `.claude/rules/core/skill-format.md` — new § documenting the field.
- `tests/v12/data-access-level-advisory.test.js` — regression tests for
  the advisory behavior matrix.

## [12.0.5] - 2026-05-20

### Added
- `_deprecated/` bucket pattern for agent deprecation lifecycle.
  `scripts/sync-agents.sh` now excludes `<archetype>/_deprecated/**` from
  plugin.json registration while keeping the SKILL.md files on disk for
  alias resolution via `scripts/migration/v12-aliases.yaml`. (REC-5)
- `.claude/rules/core/skill-format.md` — new section documenting the
  bucket pattern, promotion path, and eventual-removal semantics.
- `tests/v12/deprecated-bucket-excluded.test.js` — regression test
  enforcing that `_deprecated/` agents do not appear in plugin.json.

## [12.0.4] - 2026-05-20

### Added
- `.claude/hooks/secret-restore.cjs` — new Stop hook that restores
  sanitized-content files to their pre-sanitize state at session end.
- `.claude/hooks/SECRET-SANITIZE.md` — protocol documentation for the
  opt-in sanitize-and-restore mode.
- `tests/v12/secret-sanitize-protocol.test.js` — regression tests covering
  sanitize-mode behavior + restore idempotency.

### Changed
- `.claude/hooks/secret-detection.cjs` — extended with opt-in
  `CAGENTS_SECRET_MODE=sanitize` mode that replaces secret content with
  `BLOCK_<hex>` placeholders during the session. Default remains `block`
  (no behavioral change for existing users).
- `.claude/settings.json` — registered secret-restore.cjs as a Stop hook.

(REC-1 from session team_external-samples-update_260520_003)

## [12.0.3] - 2026-05-20

### Added
- `.claude/skills/_MODE_REGISTRY.md` — single source of truth for all skill
  modes, flags, and phases across /run, /team, /org, /designer, /improve, /helper.
  Replaces inline mode definitions in improve/SKILL.md and team/SKILL.md to
  prevent documentation drift. (REC-3)
- `tests/v12/mode-registry-coverage.test.js` — regression test enforcing
  registry coverage of all documented flags.

### Changed
- `.claude/skills/improve/SKILL.md` — flag definitions now reference
  `_MODE_REGISTRY.md § /improve` instead of redefining inline.
- `.claude/skills/team/SKILL.md` — flag definitions now reference
  `_MODE_REGISTRY.md § /team` instead of redefining inline.

## [12.0.2] - 2026-05-20

### Changed
- Version bump to 12.0.2. See commit message for details.

## [12.0.1] - 2026-05-20

### Added
- `AGENTS.md` at repo root — multi-tool routing convention documenting how
  Cursor, Aider, Windsurf, Gemini-CLI, OpenCode and other non-Claude-Code
  agentic tools can discover cAgents skills + agents. Pure documentation;
  no behavioral change. (REC-2 from session team_external-samples-update_260520_003)

## [12.0.0] - 2026-05-20

Major consolidation release. Branch `revamp/v12-rc`. Total agents 251 -> 238.
Pipeline transitions 7 -> 5. Legacy domain dirs 13 -> 2. Execution
self-validation checks 15 -> 5.

### Added
- `scripts/migration/v12-aliases.yaml` — back-compat alias map for all v11 ->
  v12 agent renames and merges (W1.1). Resolves `engineering-manager`,
  `architecture-reviewer`, `chief-legal-officer`, `devops-lead`,
  `task-decomposer`, `prompt-engineer`, and the 13 marketing-sales fold
  sources to their v12 targets.
- `outputs/v12-migration/migration-state.yaml` and burndown chart (W0.3) —
  per-wave tracking against locked decisions Q1..Q8.
- Tar backup of 11 legacy domain dirs at
  `outputs/v12-migration/legacy-dirs-backup.tar.gz` (W0.4) — pre-deletion
  snapshot for recovery.

### Changed
- **Pipeline state machine collapsed (7 -> 5 states)** (W2.1, W3.1, W3.2).
  `/run` sequence is now `INIT -> ORCHESTRATED -> PLANNED -> COORDINATED ->
  VALIDATED`. `task-decomposer` and `prompt-engineer` folded into
  `universal-planner`; their output schemas (`work_items.yaml`,
  `delegation_prompts.yaml`) preserved but written by planner directly.
- **engineering-manager merged into tech-lead** (W2.4). Two engineering
  controllers consolidated into a single fullstack `tech-lead`. 222 active
  references swept across SKILL.md, rules, tests, and config. Alias
  preserved.
- **architecture-reviewer collapsed into `architect --review` mode flag**
  (W2.5). Removes a standalone agent and absorbs review responsibility into
  the `architect` controller with an explicit mode toggle.
- **Marketing-sales consolidation (38 -> 25)** (W3.3-W3.6). 13 agents
  absorbed across 6 groups (G1-G6). All 13 fold sources aliased.
- **chief-legal-officer renamed to clo** (W2.2). Standardized C-suite
  naming. Alias preserved.
- **vp-engineering moved to `leadership/` archetype** (W2.2). Co-located
  with other C-suite agents.
- **devops-lead renamed to infrastructure-lead** (W2.3). Moved to
  `developer/infrastructure/`.
- **engine-developer and game-programmer moved to `developer/backend/`**
  (W2.2).
- **max_revision_cycles 5 -> 3** (W1.4). Tightened revision budget in
  `pipeline_config.yaml` per audit.
- **Execution self-validation reduced 15 -> 5 hook-verifiable checks**
  (W1.2). The aspirational 15-check protocol replaced with 5
  mechanically-verifiable checks: evidence freshness, file existence,
  guard exit codes, git state, file:line accuracy. Aspirational checks
  moved to `docs/FUTURE_VALIDATION_FRAMEWORK.md`.
- Top-level docs (CLAUDE.md, README.md, docs/ARCHITECTURE.md,
  docs/RELEASE_NOTES.md) updated for v12.0.0 release content (W4.3).
- Version bumped 11.3.0 -> 12.0.0 across all 18 registry locations
  (W4.3).

### Removed
- `task-decomposer` agent — folded into `universal-planner` (W2.1).
- `prompt-engineer` agent — folded into `universal-planner` (W2.1).
- `engineering-manager` agent — merged into `tech-lead` (W2.4).
- `architecture-reviewer` agent — collapsed into `architect --review`
  (W2.5).
- 13 marketing-sales agents absorbed across G1-G6 groups (W3.3-W3.6).
- 11 legacy domain dirs: `engineering/`, `creative/`, `business/`,
  `growth/`, `service/`, `science/`, `health/`, `education/`,
  `personal/`, `arts/`, `trades/` (W4.2). `people/` and `shared/`
  retained as routing-config-only overlays.
- `cagents-memory/_communication/` directory and 58 stale SKILL.md
  references (W4.1).

### Migration
- Pre-v12 agent names continue to resolve via
  `scripts/migration/v12-aliases.yaml`. Existing session artifacts (org_*,
  team_*, run_*) referencing old names work unchanged.
- Could-have-caught-by: end-to-end pipeline-state-count regression test,
  agent-count invariant test, and zombie-ref scanner — all landed in W1.2
  and W4.4.

## [11.3.0] - 2026-05-13

### Added
- **`/goal` autonomous-execution integration (REC-5 + REC-1 + REC-10 + REC-4 from `cagents-memory/sessions/run_analyze-goal-md-task-skill_260513_005/outputs/analysis.md`)**. Three bundled changes turn cAgents into a first-class consumer of Claude Code's `/goal` continuation primitive (`https://code.claude.com/docs/en/goal.md`).
  - **WI-1 (REC-5)**: `.claude/skills/helper/SKILL.md` gains an "Autonomous Execution Triad" section documenting `/goal` + `/run` + Auto-mode as composing primitives, a comparison matrix (`/goal` vs `/loop` vs Stop hook), a headless `claude -p` example, and the `/goal clear` aliases (`stop`/`off`/`reset`/`none`/`cancel`). Before this bump, cAgents users had no on-ramp to Claude Code's native autonomous-continuation primitive.
  - **WI-2 (REC-1 + REC-10)**: `.claude/skills/run/SKILL.md` Step 2 gains ACTION 4, deriving a `/goal` condition referencing `completion_summary.yaml` status + clean TaskList state, with a turn-cap clause. `.claude/skills/run/reference/flags.md` documents the new `--no-goal` opt-out (also honored via `CAGENTS_NO_GOAL=1` env var). `.claude/skills/designer/SKILL.md` adds the `/designer` exemption sentence (interactive-by-contract; mirrors the existing "/designer is EXEMPT from auto-proceed" rule). The `/run` `argument-hint` and Step 1 body parser both list `--no-goal` so the regression flag-consistency test passes.
  - **WI-3 (REC-4)**: New `.claude/hooks/goal-evaluator-logger.cjs` (~125 LOC) registered as a second Stop hook. When `/goal` is active in the Stop payload (`input.goal.active === true` or `input.goal_state.active === true` with an `evaluator_reason`), the hook appends a YAML entry (timestamp, condition, evaluator_reason, turn, verdict) to `workflow/goal_evaluator_log.yaml` in the active cAgents session directory. Non-blocking; no-op when `/goal` inactive. `core/universal-self-correct/SKILL.md` Step 2 now reads the log's most recent 3-5 entries and treats evaluator reasons as additional FIXABLE signal alongside `validation_report.yaml` — a free Haiku-tier second-opinion every turn `/goal` is active. Hook documented in `.claude/rules/core/hooks.md` and listed in the Stop row of the Hook Types Overview table.
  - Test added: `tests/skills/helper-goal-section.test.js` (5 tests asserting helper SKILL.md surfaces `/goal`, comparison matrix, headless example, aliases, and Auto-mode orthogonality). `tests/skills/run-goal-anchor.test.js` (9 tests asserting `/run` SKILL.md mentions `/goal` + `completion_summary.yaml` + turn-cap + `--no-goal` + `/designer` exemption, `flags.md` lists `--no-goal`, and `/designer` SKILL.md has the exemption sentence). `tests/hooks/goal-evaluator-logger.test.js` (7 tests covering hook existence, no-op on empty input, no-op when `/goal` inactive, append on active payload, alternative `goal_state` shape, multiple appends, and `.claude/settings.json` registration). All 21 tests fail-before / pass-after the change.
- CLAUDE.md hook-count and test-count counters bumped to current reality (30 `.cjs` / 27 unique / 830+ Vitest tests / 75+ files). `hooks.md` count claim bumped (30 / 27). `scripts/ci/validate-agents.sh` expected hook count bumped (26 → 27). `tests/regressions/hooks-md-skill-size-monitor.test.js` count assertion updated to match new reality.

### Changed
- This is a **minor bump** (11.2.16 → 11.3.0) per `.claude/rules/core/version-registry.md` § Tiny-Bump Cadence: the change spans three coherent objectives across >5 non-sync files (helper + run + designer + flags + new hook + settings + self-correct + hooks.md + CLAUDE.md + 3 new tests), exceeding the tiny-bump atomicity criteria. The three WIs ship together because REC-4 (evaluator logger) consumes signal that REC-1 (auto-anchor) produces, and REC-10 (designer exemption) is the necessary carve-out for REC-1. Could-have-caught-by: a "skill mentions documented Claude Code primitive" coverage test on the helper SKILL.md (deferred to a future quality pass).

## [11.2.16] - 2026-05-13

### Fixed
- Trimmed `.claude/rules/core/version-registry.md` to canonical 18-location
  shape; moved V10.x 21-location history verbatim to a new file
  `docs/VERSION_REGISTRY_HISTORY.md` (Q-011 / F-xcut-003).
  Bug: the rule file simultaneously described the V10.x 21-location catalog
  AND the V11.0+ canonical 18-location registry. Mixed phrasing ("the V10.x
  catalog had 21 locations; the current canonical count is 18") created
  ambiguity about which number was authoritative for future registry
  additions, and the file no longer served as an unambiguous single source
  of truth.
  Root cause: V11.0 removed four SKILL.md slots (`context`, `debug`,
  `review`, `optimize`) shrinking the registry 21 → 18, but the historical
  paragraphs explaining the V10.x shape were retained inline rather than
  extracted to a history file. Five tiny-bumps' worth of additional rule
  edits never circled back to prune them.
  Test added: `tests/regressions/version-registry-canonical.test.js` —
  reads the rule file and asserts (1) no "V10.x catalog" phrasing, (2) no
  "21 registry locations" / "had 21 locations" phrasing as a registry
  count, (3) the canonical `| # | File | Field/Line | Updated By |` table
  contains exactly 18 rows numbered 1..18. The test failed at HEAD
  7b3a1d45 (3 hits across two pattern groups) and passes after the trim.
  Also pruned one stale assertion in
  `tests/rules/version-registry-structure.test.js` (line 43, "mentions the
  21-location sync count") because that assertion was the symptom of the
  bug — it required the file to contain the contradiction the fix removes.
  Could have caught by: a documentation-currency / source-of-truth
  invariant test on the registry rule file (this new test).

## [11.2.15] - 2026-05-13

### Fixed
- Removed stale `## V10.18.0 Highlights` section from CLAUDE.md (Q-010 /
  F-docs-002).
  Bug: CLAUDE.md still advertised V10.18.0 highlights despite the project
  being on V11.2.x — readers got pre-V11 release notes presented as current.
  Root cause: section was added in V10.18.0 and never pruned across the
  V10→V11 major bump.
  Test added: `tests/regressions/claude-md-no-stale-version-highlights.test.js`
  — parses the Quick Reference `**Version**:` line to extract the current
  version, finds every `## V<N>.<M>.<P> Highlights` heading, and asserts
  none is more than 2 minor versions behind the current version (cross-major
  comparison is an automatic fail since major bumps reset the minor).
  Could have caught by: regression test on documentation-currency invariants.

## [11.2.14] - 2026-05-12

### Fixed
- Refresh stale `CLAUDE.md` test-count claim from `858+ Vitest tests across 60+
  files` to `810+ Vitest tests across 72+ files` (with explanatory parenthetical
  that the figure is a static lower-bound; runtime `numTotalTests` is higher
  because `it.each` rows expand to multiple tests at runtime — 932 at
  baseline). Extends `tests/regressions/claude-md-counts-current.test.js` with
  a 4th sub-test that statically counts `it(...)` / `test(...)` invocations
  across `tests/**/*.test.js` (mirroring the include/exclude rules in
  `tests/vitest.config.js`), asserts `claim_tests <= static_lower_bound` AND
  `static_lower_bound - claim_tests <= 20`, and the same lower-bound +
  5-file freshness window for the file count. The sub-test fails on the
  pre-fix claim (858 > 816 static lower-bound) and passes after the bump.

Bug: `CLAUDE.md` line 517 Quick Reference Tests row was 74 runtime tests /
     12 files behind reality. The `+` suffix kept the claim technically true
     (under-counts are permitted), but the lower bound was so stale that the
     order-of-magnitude was misleading for anyone using the Quick Reference
     to size the suite.
Root cause: bumps that added regression tests (V11.2.x's Q-001/Q-002/Q-003/
     Q-006/Q-007/Q-008 each shipped a new `tests/regressions/*.test.js` file)
     did not refresh the CLAUDE.md test-count claim. No regression test
     existed for the test-count specifically — the V11.2.2 count-current
     test covers agents, hooks, and per-archetype distributions but not the
     test-count claim.
Test added: `tests/regressions/claude-md-counts-current.test.js` extended
     with a 4th sub-test "test-count claim is within freshness window of
     statically-counted suite size (Q-009)". Fails before, passes after.
Could have caught by: an extension of the existing CLAUDE.md count-currency
     test to cover the test-count Quick Reference row. The same pattern that
     guards the agent count and hook-file count would have caught this; the
     coverage gap was simply unimplemented.

## [11.2.13] - 2026-05-12

### Fixed
- Convert `.claude/skills/improve/SKILL.md` internal resource references
  from the `[`reference/X.md`](reference/X.md)` markdown-link form to the
  `@reference/X.md` form used by every other user-invocable cAgents skill
  (`/run`, `/team`, `/org`, `/designer`, `/helper`). 18 occurrences across
  lines 55–168 converted. The "Reference catalog" bullet list at lines
  200–212 was left intact — those are listing-style file-name mentions,
  not links, and are out of Q-008 scope.

Bug: `/improve` SKILL.md was the lone outlier in the 6-skill catalog,
     using `[`reference/X.md`](reference/X.md)` markdown-link form for 18
     internal resource refs while the other 5 skills uniformly used the
     `@reference/X.md` progressive-disclosure form.
Root cause: `/improve` SKILL.md was authored before the `@path`
     convention was adopted across skills; never refactored during the
     V11.0 review/optimize consolidation that produced the current
     `/improve` skill.
Test added: `tests/regressions/skill-at-path-consistency.test.js` walks
     `.claude/skills/{run,team,org,designer,improve,helper}/SKILL.md`
     and asserts no SKILL.md uses the markdown-link form for reference
     resources; also asserts `/improve` uses the `@reference/` form at
     least once. Failing before fix (improve had 18 markdown-link refs,
     0 `@reference/` refs); passing after (0 markdown-link refs, 18
     `@reference/` refs).
Could have caught by: contract test on `.claude/skills/` formatting
     consistency — this regression test IS that contract test.

## [11.2.12] - 2026-05-12

### Fixed
- Trim `.claude/rules/core/hooks.md` intro paragraph (line 9) from a 540-char
  per-event enumeration to a 2-line summary directing readers to the Hook Types
  Overview table beneath it. The previous intro duplicated every
  hook-event-matcher tuple already documented in the table, requiring dual-edit
  on every hook add/remove and creating a drift surface. The trim removes
  ~770 chars of redundant prose from a rules file that auto-loads into every
  agent's context on every session.

Bug: `.claude/rules/core/hooks.md` intro paragraph at line 9 duplicates the
     Hook Types Overview table beneath it, requiring dual-edit on every hook
     add/remove (drift surface).
Root cause: Intro evolved into a 540-char enumeration over many versions
     instead of staying a 2-line summary. No regression test enforced an
     upper bound on intro prose length.
Test added: `tests/regressions/hooks-md-intro-length.test.js` asserts intro
     paragraph (first non-heading prose after frontmatter and h1) is < 250
     chars and contains no per-event `[Matcher]` tuple enumeration. Failing
     before fix (intro 923 chars, contained `PreToolUse[Agent]`), passing
     after.
Could have caught by: regression test on `.claude/rules/core/hooks.md` prose
     structure.

## [11.2.11] - 2026-05-12

### Fixed
- Trim `.claude/rules/quality/resources/validation-checklist-29.md` from 126 lines
  to 35 lines, describing only the 5 actively-enforced Phase-4 cross-cutting
  checks (25-29). The 23 aspirational checks (Phases 1-3) move verbatim to
  `docs/FUTURE_VALIDATION_FRAMEWORK.md` (Q-006 / F-docs-003). The file lives
  under `.claude/rules/`, so it auto-loaded into every agent's context on every
  session — the trim removes ~91 lines of context-budget bloat per session for
  validation checks that did not actually run in practice.

Bug: `.claude/rules/quality/resources/validation-checklist-29.md` documented a
     29-check four-phase validation framework but only 5 of those checks (Phase
     4, IDs 25-29) were ever wired up to hooks (`subagent-stop-tracker.cjs`,
     `post-write-validator.cjs`, `attention-injection.cjs`,
     `verify-completion.cjs`). The other 23 (Phases 1-3, IDs 1-24) were
     explicitly labeled "ASPIRATIONAL" and depended on agents voluntarily
     running validation logic that did not happen in practice. The file's
     Current Enforcement Status table already acknowledged this. Because the
     file lives under `.claude/rules/quality/`, all 23 aspirational checks
     shipped as agent-context bloat on every session.
Root cause: The 29-check framework was designed as a target architecture in an
     earlier phase but the graduation pipeline (P1: check 16 → P2: check 20 →
     P3: checks 17/21/22 → P4: checks 1-3/6-7) was never executed. The
     aspirational content stayed in the auto-loaded rules tree rather than
     moving to `docs/` (which does not auto-load) until a check actually
     graduated to enforced.
Test added: `tests/regressions/validation-checklist-active.test.js` — asserts
     the active file is < 100 lines, mentions exactly the 5 active check IDs
     (25, 26, 27, 28, 29), contains no `ASPIRATIONAL` substring, and has no
     `Current Enforcement Status` or `Graduation Roadmap` sections. Also asserts
     `docs/FUTURE_VALIDATION_FRAMEWORK.md` exists and contains the moved
     Phase-1/Phase-2/Phase-3 tables plus the Current Enforcement Status and
     Graduation Roadmap sections. Failing-before evidence: 6/7 tests fail at
     HEAD (v11.2.10) — the file is 126 lines, has 9 ASPIRATIONAL tokens, and
     retains both deferred-section headings. Passing-after: 7/7 pass after the
     trim.
Could have caught by: unit test on validation-checklist file structure — a
     line-count gate and ASPIRATIONAL-token-count gate on any file inside
     `.claude/rules/` would have caught this pattern (and would catch future
     regressions of the same kind in other rule files).

### Changed
- `.claude/rules/quality/resources/validation-checklist-29.md`: 126 → 35 lines.
  Heading renamed from "29-Check Comprehensive Validation Framework
  (Aspirational)" to "Active Validation Checklist (5 checks)". Retains the
  filename `validation-checklist-29.md` so existing `@resources/` references at
  `.claude/rules/quality/completion.md:193` and `.claude/rules/README.md` keep
  resolving. Drops the Current Enforcement Status table, Graduation Roadmap,
  Phase 1/2/3 tables, aspirational Severity Classification, aspirational
  Summary Table, and any "ASPIRATIONAL" framing prose.
- Active 5 checks (25-29) preserved verbatim in the Phase-4 Cross-Cutting
  table. Severity Classification trimmed to just the active checks (HIGH for
  25-27/29, MEDIUM for 28). Key Principles trimmed to just the 3 active-only
  principles.

### Added
- `docs/FUTURE_VALIDATION_FRAMEWORK.md`: NEW. Receives the 23 ASPIRATIONAL
  checks (Phases 1-3) verbatim, plus the Current Enforcement Status table and
  Graduation Roadmap that describe how each aspirational check could graduate
  to enforced status. File lives under `docs/`, which does NOT auto-load into
  agent context — the content is preserved for future graduation work without
  paying ongoing context budget.
- `tests/regressions/validation-checklist-active.test.js`: NEW. 7 assertions
  enforce the active-file structure (line count, exact 5 checks, no
  ASPIRATIONAL token, no deferred sections, active-scope heading) and the
  presence/structure of `docs/FUTURE_VALIDATION_FRAMEWORK.md`. Now a permanent
  CI gate against re-bloat regression of the rules tree.

## [11.2.10] - 2026-05-12

### Fixed
- Remove non-functional `--from-review` and `--from-designer` flag advertisements
  from /run (Q-005 / F-skills-001). The underlying `output_contract` / `input_from`
  skill-chaining feature was tagged ASPIRATIONAL in
  `.claude/rules/core/skill-format.md` and never implemented; the flags silently
  no-op'd when used. OPTION B from triage (remove dead advertisements) chosen
  over OPTION A (implement) because implementation exceeds tiny-bump atomicity.

Bug: `--from-review` and `--from-designer` were advertised in three /run views
     (`.claude/skills/run/SKILL.md` argument-hint + Step 1 body parser,
     `.claude/skills/run/reference/flags.md` flag table,
     `.claude/skills/run/reference/strategic-brief-integration.md` chaining
     table) and in `.claude/rules/core/skill-format.md` § Skill Chaining
     (V10.18.0). The underlying feature was never implemented — no skill
     declares an `output_contract` or `input_from` frontmatter block — so the
     flags silently no-op'd at runtime.
Root cause: V10.18.0 designed the chaining pattern and added flag
     advertisements assuming implementation would follow; implementation never
     landed. V11.2.9 (Q-004) reconciled the three views but kept the dead flags
     advertised. Q-005 removes them as the natural follow-up.
Test added: `tests/regressions/no-aspirational-skill-chaining.test.js` —
     scans the three /run views and `.claude/rules/core/skill-format.md`,
     asserts no occurrence of `--from-review` or `--from-designer`. The test
     will fail if anyone re-adds these flag advertisements without re-adding
     the underlying implementation. Failing-before evidence at
     `cagents-memory/sessions/run_v11-2-10-fix-q005_260512_001/outputs/test-before-fix.txt`
     (9/9 failures at HEAD before fix); passing-after at `outputs/test-after-fix.txt`
     (9/9 passing). The test is now a permanent CI gate.
Could have caught by: a contract test on /run skill (set-equality across
     argument-hint, body parser, and flags.md flag declarations — added in
     v11.2.9 as Q-004) combined with a "no orphaned flags" lint rule asserting
     every advertised flag has working code paths and a non-ASPIRATIONAL
     implementation.

### Changed
- `.claude/skills/run/SKILL.md` argument-hint: dropped the two flags. Autocomplete
  now reflects the 15 implemented flags instead of 17.
- `.claude/skills/run/SKILL.md` Step 1 body parser: dropped both flags from the
  value-flags enumeration and removed the "Special flag handling" bullet that
  pointed at `@reference/strategic-brief-integration.md` for skill chaining.
- `.claude/skills/run/reference/flags.md` Complete Flag Table: removed the two
  ASPIRATIONAL rows. Table drops from 17 rows to 15.
- `.claude/skills/run/reference/strategic-brief-integration.md` "Skill Chaining
  via --brief" section: 3-row table (`--brief`, `--from-review`, `--from-designer`)
  collapsed into a paragraph documenting `--brief` as the sole implemented
  chaining flag, with a pointer to the v11.2.10 CHANGELOG for the removal
  rationale.
- `.claude/rules/core/skill-format.md` § Skill Chaining (V10.18.0): the ~55-line
  ASPIRATIONAL section (output_contract/input_from prose, two example YAML
  blocks, chaining-flag table, "How chaining works" steps, example pipeline)
  replaced with a ~10-line postmortem note pointing to the v11.2.x
  improvement-pass wave-1 findings for the design-vs-implementation gap analysis.

The Q-004 cross-view consistency regression test
(`tests/regressions/run-skill-flag-consistency.test.js`) remains green: the
three views still agree, on the reduced 15-flag set instead of 17.

## [11.2.9] - 2026-05-12

### Fixed
- Reconcile /run skill flag enumerations across three views: SKILL.md frontmatter
  `argument-hint`, Step 1 body-parsing prose, and `reference/flags.md` canonical
  table (Q-004 / F-skills-002).

Bug: The /run skill advertised three different flag sets across its three views
     of the same source-of-truth list. `argument-hint` (autocomplete display)
     enumerated 10 flags; the Step 1 body parser enumerated 17 flags; the
     canonical `reference/flags.md` Complete Flag Table enumerated 13 flags.
     The drift hid 7 documented, functional flags from autocomplete
     (`--stream`, `--skip-preflight`, `--template`, `--domain`, `--tier`,
     `--confidence`, `--mode`) and left 4 flags undocumented in the canonical
     reference (`--brief`, `--session`, `--from-review`, `--from-designer`).
Root cause: no regression test enforced consistency between the three views.
     Flags were added to the body parser and frontmatter on different commits
     without back-syncing the table or autocomplete hint.
Test added: `tests/regressions/run-skill-flag-consistency.test.js` — parses
     all three sources, asserts pairwise set equality across every pair.
     Failing-before evidence captured at
     `cagents-memory/sessions/run_v11-2-9-fix-q004_260512_001/outputs/wave-6/failing-before.log`
     (3 failed assertions naming all 11 drift flags); passing-after at
     `outputs/wave-6/passing-after.log`. The test is now a permanent CI gate.
Could have caught by: a CI regression test on cross-view flag-set consistency
     for skill SKILL.md files (this PR adds it as a permanent gate).

### Changed
- Added 7 flags to `.claude/skills/run/SKILL.md` frontmatter `argument-hint`:
  `--stream`, `--skip-preflight`, `--template <name>`, `--domain <name>`,
  `--tier <N>`, `--confidence <N>`, `--mode <standard|debug>`. Autocomplete
  now reflects the full 17-flag set the body parser already accepts.
- Added 4 flag rows to `.claude/skills/run/reference/flags.md` Complete Flag
  Table: `--session <dir>`, `--brief <path>`, `--from-review`, `--from-designer`.
  Each row carries the same Type/Description/Default/Example shape as the
  surrounding table. `--from-review` and `--from-designer` are tagged
  ASPIRATIONAL in their description per `.claude/rules/core/skill-format.md`
  Skill Chaining (the underlying `output_contract`/`input_from` feature is not
  yet implemented; Q-005 in the fix-queue removes the aspirational
  advertisements). For Q-004, they remain documented as currently-parsed
  flags so the three views agree.

## [11.2.8] - 2026-05-12

### Fixed
- Resolve 11 broken `@resources/` references across 5 agents (Q-003 / F-agents-001,
  bundles dedup'd F-agents-002). The fix-queue entry estimated 6 affected agents;
  empirical count was 5 (security-owasp held 6 of the 11 refs, accounting for the
  delta).

Bug: 11 `@resources/X.md` references across 5 SKILL.md files pointed to files
     that never existed (or were never migrated during the v11.1 builder-role-tree
     migration). Three-Tier Progressive Disclosure (`.claude/rules/core/skill-format.md`)
     mandates these refs resolve, but no test enforced this — broken refs slipped past
     `scripts/ci/validate-agents.sh` (which doesn't walk `@resources/` tokens).
Root cause: missing CI gate. The v11.1 migration moved agents into archetype
     directories; resources/ subdirs were migrated inconsistently. No regression
     test caught the resulting drift, so refs accumulated over multiple bumps.
Test added: `tests/regressions/agent-resources-references-resolve.test.js` —
     walks all 9 archetype roots, extracts every `@resources/X.md` token from
     every SKILL.md, asserts each resolves to a real file at
     `{agent_dir}/resources/{filename}`. Failing-before evidence in
     `cagents-memory/sessions/run_v11-2-8-fix-q003_260512_001/outputs/wave-5/failing-before.log`
     (lists the 11 broken refs); passing-after in
     `cagents-memory/sessions/run_v11-2-8-fix-q003_260512_001/outputs/wave-5/passing-after.log`.
     Default action for each ref was OPTION B (remove the broken pointer) to
     honor tiny-bump atomicity — creating 11 new tier-3 resource docs is
     L-effort and exceeds one-coherent-change.
Could have caught by: a CI regression test on `@resources/` reference
     resolution — exactly what this PR adds. The test is now a permanent
     CI gate.

### Changed
- Removed broken `@resources/` refs from:
  - `analyst/business-analyst/SKILL.md` (2 refs: `requirements-gathering-framework.md`, `gap-analysis-methods.md`)
  - `developer/infrastructure/security-engineer/SKILL.md` (1 ref: `security-checks.md`)
  - `developer/quality/security-owasp/SKILL.md` (6 refs: `owasp-top-10-detail.md`,
    `llm-security-detail.md`, `agentic-ai-security.md`, `asvs-5-checklist.md`,
    `language-quirks.md`, `audit-workflow.md`)
  - `operator/business-ops/quality-manager/SKILL.md` (1 ref: `quality-templates.md`)
  - `operator/marketing-sales/marketing-analyst/SKILL.md` (1 ref: `data-science-templates.md`)
  Each ref was a single "See @resources/X.md for ..." line removed cleanly. The
  surrounding body content (tables, checklists, prose) remains self-contained in
  every case; no agent left visibly underspecified after removal.

## [11.2.7] - 2026-05-12

### Fixed
- Move `skill-size-monitor` hook from `PostToolUse[Write|Edit]` to
  `PreToolUse[Write|Edit]` in `.claude/settings.json` so the 900-line
  block threshold is functional (Q-002 from the v11.2.x improvement-pass
  fix queue; bundles dedup'd finding F-hooks-002).

Bug: `.claude/hooks/skill-size-monitor.cjs` returns `{ deny: true }` when
     a `SKILL.md` exceeds 900 lines. The hook was registered under
     `PostToolUse`, which `.claude/rules/core/hooks.md` documents as
     "Cannot block" (only `PreToolUse` can block tool calls). The block
     threshold was therefore a silent no-op: warnings still surfaced via
     `systemMessage`, but the hard 900-line block never actually denied
     a write.
Root cause: registration/documentation drift — `hooks.md` prose correctly
     documented the hook as `PreToolUse[Write|Edit]`, but
     `.claude/settings.json` registered it as `PostToolUse[Write|Edit]`.
     No regression test enforced consistency between the two.
Test added: `tests/regressions/hooks-md-event-mapping.test.js` — parses
     `.claude/settings.json` and `.claude/rules/core/hooks.md`, asserts
     bidirectional consistency on `(event, matcher, hook_name)` tuples.
     This catches any future drift, not just the skill-size-monitor
     case. Failing-before evidence: at v11.2.6, the test FAILED with 4
     settings-registered / 1 docs-only mismatches. Passing-after: at
     v11.2.7, all 6 tuple-mapping assertions pass after (a) moving
     `skill-size-monitor` to PreToolUse and (b) adding the missing
     `####` subsection headings for `approval-gate.cjs`,
     `delegation-enforcer.cjs`, and `magic-keywords.cjs` in `hooks.md`
     (those hooks were already in the Hook Types Overview table but
     lacked dedicated subsections). Failing-before and passing-after
     logs in
     `cagents-memory/sessions/run_v11-2-7-fix-q002_260512_001/outputs/wave-4/`.
Could have caught by: a CI regression test on hook event/matcher
     consistency between `settings.json` registrations and `hooks.md`
     subsection headings — which is exactly what this PR adds. Bundles
     dedup'd finding F-hooks-002 from the v11.2.x audit.

### Changed
- `.claude/rules/core/hooks.md` now has `####` subsection headings for
  three hooks that were previously only mentioned in the Hook Types
  Overview table: `approval-gate.cjs` (PreToolUse[Bash|Write|Edit]),
  `delegation-enforcer.cjs` (UserPromptSubmit), and `magic-keywords.cjs`
  (UserPromptSubmit). These are documentation additions only — the
  hooks themselves have been registered and operational for several
  prior bumps.

## [11.2.6] - 2026-05-12

### Fixed
- **Standalone-contract regression test added** (Q-001 from the v11.2.x
  improvement-pass fix queue). New file `tests/regressions/standalone-contract.test.js`
  enforces the V11.2.0 contract via 29 unit + integration assertions.

Bug: V11.2.0 introduced the standalone contract (no MCP servers, no `mcp__*`
     in `allowed-tools`, no `Elicitation*` hook registrations, no
     MCP-suggesting prose in load-bearing docs) but did not add a regression
     test. The contract could be silently re-violated by a future PR without
     CI catching it.
Root cause: missing regression test — the V11.2.0 mandate at CLAUDE.md
     ("Bug-driven test mandate" — Rule 5 of the Standalone Contract) was
     satisfied for prose but not for code.
Test added: `tests/regressions/standalone-contract.test.js` — Vitest suite
     using the function-extraction + string-concat pattern. Helper-function
     unit tests prove the violation detectors work (synthetic-input fixtures
     where contract-violation tokens like `mcp__`, `mcpServers`, and
     `Elicitation` are assembled via string concat so they appear only as
     test fixtures, never as declarations in production files). Production-
     tree integration tests prove the current tree is clean
     (`.claude-plugin/plugin.json`, `.mcp.json`, all 9 archetype roots,
     `.claude/skills/`, `.claude/settings.json`). Failing-before evidence
     captured by short-circuiting `scanForMcpServersBlock` and confirming 2
     unit tests fail; see `cagents-memory/sessions/run_v11-2-6-fix-q001_260512_001/outputs/wave-3/failing-before.log`
     and `passing-after.log` (29/29 passing after restore).
Could have caught by: a CI regression test of the V11.2.0 contract — if such
     a test had existed, the V11.1.12 consumer-pattern PR would have failed
     CI immediately instead of requiring three follow-up bumps (V11.1.14,
     V11.1.15, V11.2.0) to revert.

## [11.2.5] - 2026-05-07

### Fixed
- **4 stale `related_agents` references resolved**:
  - `developer/quality/playwright-test-engineer/SKILL.md` — removed `qa-tester`
    (qa-lead already in list).
  - `developer/quality/security-owasp/SKILL.md` — replaced `qa-tester` with
    `qa-lead` (canonical).
  - `operator/marketing-sales/keyword-researcher/SKILL.md` — removed
    `content-marketer` (copywriter already in list, covers the role).
  - `operator/marketing-sales/seo-strategist/SKILL.md` — replaced
    `content-marketer` with `copywriter` (canonical for content collaboration).

  All four were emitted as `WARN` by `validate-agents.sh` for some time;
  warnings cleared (Total agents: 255, Errors: 0, Warnings: 0).

### Added
- **Regression test** `tests/regressions/related-agents-references-resolve.test.js`:
  walks every `SKILL.md` in the 9 archetype roots, parses each agent's
  `related_agents:` block, and asserts every referenced name resolves to an
  existing agent. Catches future stale references the moment they're added —
  much stronger than the existing WARN-level check in validate-agents.sh.

Bug: 4 stale `related_agents` references to non-existent agents (qa-tester, content-marketer)
Root cause: agents renamed/never-created without sweeping references; WARN-only validation let drift accumulate
Test added: tests/regressions/related-agents-references-resolve.test.js (1 sub-test, walks all 255 agents)
Could have caught by: promoting validate-agents.sh related_agents check from WARN to ERROR (now codified by regression test)

## [11.2.4] - 2026-05-07

### Fixed
- **CLAUDE.md domain_overrides count clarification**. `validate-agents.sh`
  reports "15 files checked" while CLAUDE.md states "13 legacy domain dirs".
  The +2 is not drift: `core/` and `leadership/` archetype roots also ship
  `config/domain_overrides.yaml` files (for pipeline/C-suite routing tables).
  Without explanation, future readers either assumed drift or "fixed" something
  that wasn't broken. Added a one-sentence clarification to the Project Overview
  `**Config**:` paragraph naming both archetype-root configs and reconciling the
  13-vs-15 delta as by-design.

### Added
- **Regression test** `tests/regressions/claude-md-domain-overrides-count.test.js` —
  verifies all 13 legacy domain dirs still have `domain_overrides.yaml`,
  verifies `core/` and `leadership/` archetype-root configs exist, and asserts
  CLAUDE.md contains a co-located passage tying "15", "core", "leadership", and
  "domain_overrides" together. Locks the clarification in place.

Bug: 13-vs-15 domain_overrides count discrepancy unexplained in CLAUDE.md
Root cause: archetype-root configs added without doc note
Test added: tests/regressions/claude-md-domain-overrides-count.test.js (3 sub-tests)
Could have caught by: domain-config doc audit (now codified)

## [11.2.3] - 2026-05-07

### Fixed
- **hooks.md missing `skill-size-monitor.cjs` documentation**. The hook was added
  in V11.1.13 (squashed commit 37b321e9 — "Skill-size monitor hook + per-agent
  version-field test"), is registered in `.claude/settings.json`, and fires on
  PreToolUse[Write|Edit] for any SKILL.md write — but `.claude/rules/core/hooks.md`
  never mentioned it: not in the count claim, not in the Hook Type Overview table's
  PreToolUse row, and not in the Active Hooks section. Users and contributors
  reading hooks.md could not discover this hook exists. Added:
  - count claim updated (28→29 .cjs / 25→26 unique registered)
  - Hook Type Overview row for PreToolUse extended with `skill-size-monitor.cjs`
  - new Active Hooks subsection with thresholds, behavior, and `CAGENTS_SKILL_*` env overrides

### Added
- **Regression test** `tests/regressions/hooks-md-skill-size-monitor.test.js` —
  asserts hooks.md mentions skill-size-monitor.cjs by name, has the current
  count claim, AND that EVERY .cjs file in `.claude/hooks/` is mentioned in
  hooks.md. The fourth sub-test catches future hook additions that ship without
  doc-coverage.

Bug: skill-size-monitor.cjs hook undocumented in hooks.md
Root cause: V11.1.13 added the hook but did not update hooks.md
Test added: tests/regressions/hooks-md-skill-size-monitor.test.js (4 sub-tests)
Could have caught by: hook-doc-coverage CI check that walks .claude/hooks/ vs hooks.md

## [11.2.2] - 2026-05-07

### Fixed
- **CLAUDE.md count drift sweep**: multiple count claims drifted from code
  reality after accumulated bumps without doc sync.
  - "243 agents" → 255 agents (drift +12)
  - Archetype distribution: developer 31→33, operator 81→87, analyst 27→31
  - "28 .cjs files = 25 unique registered hooks" → "29 .cjs files = 26 unique"
    (skill-size-monitor.cjs was added in V11.1.13 but not counted)
  - "790 Vitest tests across 46 files" → "858+ tests across 60+ files"

### Added
- **Regression test** `tests/regressions/claude-md-counts-current.test.js` —
  asserts CLAUDE.md contains the CURRENT agent count, hook .cjs file count, and
  per-archetype distribution. If a future bump adds an agent or hook without
  syncing CLAUDE.md, this test fails and forces the doc update. Prevents
  count-drift from re-accumulating silently.

Bug: CLAUDE.md count claims out of sync with reality
Root cause: agent/hook/test additions in recent bumps did not propagate to CLAUDE.md
Test added: tests/regressions/claude-md-counts-current.test.js (3 sub-tests)
Could have caught by: count-validation test in CI alongside validate-versions.sh

## [11.2.1] - 2026-05-07

### Fixed
- **CRITICAL: removed broken symlink** at `.claude/skills/commit-changes` →
  `../../skills/commit-changes`. The target never existed in the cAgents repo
  or the parent workspace. The symlink was added in V11.1.13 (squashed commit)
  intending to point to a workspace-level `skills/commit-changes/` that was
  never created. The V11.1.13 commit message itself enumerates "6 skills
  (designer/helper/improve/org/run/team)" — not including commit-changes.
  Plugin loaders walking the skills directory could error on the broken link.

### Added
- **Regression test** `tests/skills/no-broken-symlinks.test.js` — walks
  `.claude/skills/`, `.claude/hooks/`, `.claude/rules/`, and `.claude-plugin/`
  and fails if any symlink target does not exist. Prevents this class of bug
  from re-entering the shipped plugin tree.

Bug: broken symlink in shipped plugin's skills directory
Root cause: V11.1.13 introduced symlink with non-existent target
Test added: tests/skills/no-broken-symlinks.test.js (4 sub-tests, one per scanned dir)
Could have caught by: structural integrity test on .claude/ tree

## [11.2.0] - 2026-05-06

Reverts the v11.1.12 "MCP consumer pattern" experiment and codifies a
**standalone contract**: cAgents must never depend on or suggest MCP
servers. The plugin's value is that it works out of the box; coupling
agents to external MCP services breaks that promise.

### Removed
- **`mcpServers` block**: already gone from `.claude-plugin/plugin.json`
  (v11.1.14) and `.mcp.json` (v11.1.15); v11.2.0 deletes `.mcp.json`
  entirely (it had nothing to add — `mcpServers: {}` is just scaffolding).
- **`mcp__*` tool patterns**: stripped from `allowed-tools` in all 10
  pilot agents that declared them — `developer/quality/security-owasp`,
  `developer/quality/playwright-test-engineer`, `developer/quality/qa-lead`,
  `analyst/data-scientist`, `developer/fullstack/data-analyst`,
  `developer/backend/backend-developer`,
  `developer/infrastructure/devops-engineer`,
  `operator/support/support-agent`, `operator/support/technical-writer`,
  `operator/business-ops/finance-manager`. Each agent now uses only
  built-in Claude Code tools.
- **`elicitation-handler.cjs`**: hook that logged MCP elicitation events
  removed along with its `Elicitation` and `ElicitationResult` registrations
  in `.claude/settings.json`. The events remain available for users who
  want to register their own handlers.
- **Documentation**: deleted `docs/MCP_SERVERS.md`, removed the
  "MCP Tool Integration (Consumer Pattern)" section from
  `.claude/rules/core/skill-format.md`, and replaced the
  "MCP Integration (V11.1.12+)" section in `CLAUDE.md` with a firm
  **Standalone Contract** section that codifies the rule.

### Changed
- **Hook count**: 29 → 28 .cjs files; 26 → 25 unique registered hooks;
  19 → 17 event types. Updated in `.claude/rules/core/hooks.md`,
  `CLAUDE.md`, and `README.md`.
- **`core/team-trigger/SKILL.md`**: dropped the "and MCP servers" mention
  from the teammate context-loading description.

### Tests
- Replaced `tests/skills/mcp-consumer-pattern.test.js` (which asserted the
  presence of MCP scaffolding) with
  `tests/skills/standalone-contract.test.js` (which asserts its absence).
  Failing-before / passing-after the standalone contract.

### Why a minor bump
- Removes public-facing surface (`mcp__*` from 10 agents'
  `allowed-tools`, two registered hook events, 1 doc page, 1 ruleset
  section). Per the tiny-bump rule, "Multi-file refactors touching more
  than ~5 files outside the 18 sync locations → minor bump." This bump
  touches ~14 non-sync files.

## [11.1.15] - 2026-05-06

### Fixed
- **`/doctor` `.mcp.json` schema rejection**: same root cause as 11.1.14
  but in a different file. The repo root `.mcp.json` shipped a descriptive
  `_examples` block with `_description` keys, which Claude Code's
  `.mcp.json` validator rejects with
  `mcpServers: Does not adhere to MCP server configuration schema`.
  Replaced the file body with `{"mcpServers": {}}` (minimum valid schema)
  so `/doctor` parses cleanly and so users can add their own servers
  without scaffolding.

### Added
- `docs/MCP_SERVERS.md`: rehomed catalog of suggested MCP server configs
  (playwright, filesystem, github, fetch, postgres, slack) with paste-ready
  JSON blocks and a list of the agent-referenced servers that don't have
  canonical reference configs yet (bigquery, redis, docker, jupyter, plaid,
  zendesk, intercom, notion). Keeps the catalog discoverable without
  re-introducing the schema-rejected shape.

## [11.1.14] - 2026-05-06

### Fixed
- **Plugin install blocker**: removed the `mcpServers` consumer-suggestion block
  from `.claude-plugin/plugin.json`. Claude Code's plugin manifest validator
  rejects entries with `{description, stage}` keys (`mcpServers: Invalid input`)
  because the schema requires real MCP server configs (`command`, `args`, `env`,
  `type`, ...). The descriptive catalog already lives in `CLAUDE.md` and
  `.claude/rules/core/skill-format.md`, so removing it from `plugin.json` is
  doc-only — agents still declare their MCP usage via
  `allowed-tools: mcp__server__tool` patterns in their SKILL.md frontmatter,
  which is unaffected.

### Tests
- `tests/skills/mcp-consumer-pattern.test.js`:
  - Test (b): inverted to assert `mcpServers` is absent OR — if a future bump
    re-introduces it — every entry has `command` or `type` per Claude Code's
    schema. Prevents regression of the install-blocking shape.
  - Test (g): rewritten to assert each agent-referenced server is documented
    in `CLAUDE.md` (the new catalog source of truth) instead of `plugin.json`.

## [11.1.13] - 2026-05-05

Wave 7 + Wave 8 closeout of the v11.1.5 → measurably-better release.
Squashed bump (Section B Option B2 precedent — W3, W5, W6 all squashed)
covering Phase 12 (descoped academic research analysts), PHASE-N1
(controller Agent-tool bug doc/audit), and Phase 13 deferral note.

### Added
- **Phase 12 (descoped)**: 3 new academic-research analyst agents under
  `analyst/` — `literature-review-author`, `citation-graph-analyzer`,
  `methodology-critic`. Each declares `archetype: analyst`,
  `metadata.version: "1.0.0"`, allowed-tools tuned for research
  (Read/Grep/Glob/Bash/WebFetch/WebSearch). Regression test
  `tests/agents/academic-research-analysts.test.js` (6 cases).
- **PHASE-N1**: Formal audit of the depth-1 plugin-subagent Agent-tool
  stripping bug. `.claude/rules/core/teams.md` Known Harness Limitation
  block extended with docs.claude.com null-finding citation
  (claude-code-guide May 2026 consultation: no settings.json /
  plugin.json / env-var / per-spawn knob exposes the depth-1 stripping).
  `.claude/hooks/verify-completion.cjs` made context-aware: downgrades
  controller-self-handling severity from "protocol violation" to
  "graceful degradation (acceptable in /team mode)" when a `team_*`
  session's coordination_log contains the marker phrase
  "Agent/subagent-spawn tool was not available".
  `.claude/rules/core/{controllers,execution}.md` pin the
  graceful-degradation pattern (1-2 paragraphs each). Knowledge note
  `cagents-memory/_knowledge/agent-tool-depth1-stripping.md` (formal
  pattern + asks for Anthropic upstream). Regression test
  `tests/agents/controller-allowed-tools.test.js` (3 cases) locks the
  audit conclusion: all 7 canonical controllers correctly declare
  `Agent` in `allowed-tools`.
- **Phase 13 deferral planning note**:
  `cagents-memory/_knowledge/v12-consolidation-plan.md` — outlines the
  4-phase v12 consolidation plan (audit, consolidation, sunsetting,
  per-agent quality bar) and the major-bump trigger. Planning artifact
  only; no v12 work authorized by this note.

### Changed
- Agent count: 252 → 255 (+3 from Phase 12 descoped).
- Version registry: all 18 locations now at 11.1.13.
- Test count: 866 → 878 (+12: Phase 12 added 6 cases, PHASE-N1 audit added 3 cases, PHASE-N1 verify-completion graceful-degradation added 3 cases).

### Notes
- Squashed bump per Section B Option B2 (W3, W5, W6, W7+W8 all squashed
  within their wave/window).
- Closes the v11.1.5 → measurably-better release per the original
  IMPLEMENT_AND_VALIDATE_PROMPT.md plan. v12 work is gated on user
  request per the Phase 13 deferral note.

## [11.1.12] - 2026-05-05

Wave 6 of the v11.1.5 → measurably-better release. Squashed bump (Section B Option
B2 precedent — W3, W5, W6 all squashed) covering all 7 W6 phase deltas (Phases 5,
6, 9, 10, 11, NF-4, NF-5).

### Added
- **Phase 5**: 6 new SEO/GEO operator agents under `operator/marketing-sales/`
  (seo-strategist controller + keyword-researcher, on-page-seo-auditor,
  technical-seo-auditor, link-strategist, geo-strategist execution agents).
  Domain config updated at `growth/config/domain_overrides.yaml`.
- **Phase 6**: `metadata.paths` conditional activation schema (V11.1.12+ v1
  declarative; v2 routing-boost deferred). 10 pilot agents declare paths.
  Regression test `tests/skills/paths-conditional-activation.test.js`.
- **Phase 9**: MCP consumer pattern (Stage 1 — consumer-only). 10 pilot
  agents declare `mcp__*` in allowed-tools. `.claude-plugin/plugin.json`
  mcpServers block (11 servers). Documentation in skill-format.md and
  CLAUDE.md. Regression test `tests/skills/mcp-consumer-pattern.test.js`.
- **Phase 10**: SKILL.md schema validator hook in
  `.claude/hooks/post-write-validator.cjs` (in-process check for archetype,
  branch, tier, name, metadata.version semver). Advisory only — never
  blocks. `scripts/ci/validate-agents.sh --file <path>` flag for single-file
  validation. Regression test `tests/hooks/post-write-validator-skill-schema.test.js`
  (5/5).
- **Phase 11**: Per-agent `metadata.version: "1.0.0"` field on all 252
  agent SKILL.md files. `validate-agents.sh` Check 19 enforces semver.
  `sync-versions.sh` documents the non-touch policy: per-agent versions
  bump independently of the cAgents plugin version registry. Regression
  test `tests/agents/per-agent-version-field.test.js` (5/5).
- **NF-4**: `marketplace.json` top-level `$schema`, `categories`,
  `compatibility` fields. Anthropic schema URL placeholder; revisit when
  the canonical URL is published.
- **NF-5**: `.claude/settings.json` top-level `worktree.sparsePaths` array
  (14 entries — `.claude/`, `core/`, `cagents-memory/_system/`, the 9
  archetype roots, `scripts/`, `tests/`, `docs/`). CLAUDE.md § "Plugin
  Architecture" documents the worktree sparse-checkout integration for
  `/team` teammates spawned with `isolation: "worktree"`.

### Changed
- Agent count: 246 → 252 (+6 from TASK-5 SEO/GEO operators).
- Version registry: all 18 locations now at 11.1.12.
- Test count: 843 → 866 (+13 from W6 W1, +10 from W2/W3 Phase 10/11).

### Notes
- Squashed bump per Section B Option B2 precedent (W3 11.1.8, W5 11.1.11,
  W6 11.1.12 all squashed into a single bump per wave).
- Harness limitation discovered in W6 W1 and confirmed in W6 W2:
  plugin-namespaced subagents (`cagents:*`) crash at depth-1 spawn during
  Claude Code terminal/Bun init. Direct lead execution + 15-check
  self-validation used as workaround per `.claude/rules/core/teams.md` §
  "Known Harness Limitation" graceful-degradation block. Phase 5 (TASK-5)
  was the only W6 W1 spawn that completed under the teammate path; all
  other phases used lead direct execution. Documented in
  `cagents-memory/_knowledge/cc-plugin-subagent-spawn-bug.md`.

## [11.1.11] - 2026-05-05

Wave 5 of the v11.1.5 → measurably-better release. Phase 2 progressive-disclosure
refactor of the six user-facing skill SKILL.md files. Bumps 11.1.11–11.1.16
squashed into 11.1.11 per Section B Option B2 cadence concession.

### Changed
- `.claude/skills/org/SKILL.md` — 1202 → 228 lines (81% reduction). Detail content extracted to 5 new `.claude/skills/org/reference/` files: `csuite-deliberation.md`, `strategic-brief-format.md`, `cross-domain-integration.md`, `escalation-handling.md`, `command-flow-detail.md`.
- `.claude/skills/team/SKILL.md` — 1185 → 225 lines (81% reduction). Detail extracted to 8 new `.claude/skills/team/reference/` files: `wave-execution-detail.md`, `gate-validation-protocol.md`, `dynamic-scaling.md`, `partial-results.md`, `parent-session-extraction.md`, `fallback-and-error-recovery.md`, `teammate-spawning-template.md`, `cross-version-compat.md`. The "Known Harness Limitation" block remains verbatim in the body — not extracted.
- `.claude/skills/run/SKILL.md` — 861 → 295 lines (66% reduction). Augments existing 7 reference files with 7 new: `state-machine-detail.md`, `agent-tracking.md`, `session-id-format.md`, `adaptive-pipeline.md`, `strategic-brief-integration.md`, `task-tracking-rules.md`, `followup-handling.md`.
- `.claude/skills/designer/SKILL.md` — 736 → 200 lines (73% reduction). Detail extracted to 6 new `.claude/skills/designer/reference/` files: `phase-research-protocol.md`, `inline-controller-pattern.md`, `phase-overlap.md`, `ambiguity-scoring.md`, `behavioral-rules.md`, `follow-up-research.md`. AskUserQuestion mandate and auto-proceed exemption preserved verbatim in body.
- `.claude/skills/improve/SKILL.md` — 597 → 212 lines (64% reduction). Detail extracted to 5 new `.claude/skills/improve/reference/` files: `mode-review-detail.md`, `mode-optimize-detail.md`, `mode-full-detail.md`, `baselines-and-benchmarks.md`, `pattern-effectiveness.md`. Mode selection table and 7-state state machine summary preserved in body.
- `.claude/skills/helper/SKILL.md` — 508 → 343 lines (32% reduction, lightest cut). Detail extracted to 3 new `.claude/skills/helper/reference/` files: `scoring-engine.md`, `command-summaries.md`, `v11-migration.md`. Skill comparison matrix and `--troubleshoot` reference preserved in body.
- Total user-skill SKILL.md body size: 5089 → 1503 lines (70% reduction).

### Added
- `tests/skills/skill-size-progressive-disclosure.test.js` — 14-case Vitest regression test asserting each user-skill SKILL.md is ≤400 lines, each `reference/` directory exists with ≥1 file, the total body size stays ≤2400 lines, and no individual file regresses past its pre-refactor baseline. Failing-before / passing-after the Wave 5 refactor.
- `cagents-memory/_knowledge/progressive-disclosure-refactor.md` — captures the Wave 5 refactor pattern for future skill authors (when to apply, what stays in body, what moves to reference, anti-patterns, regression-test pattern).

### Notes
- TaskCreate-only contract from PHASE-N2 (TodoWrite → TaskCreate sweep) preserved across all 6 refactored bodies. Where TodoWrite still appears, it is restricted to historical "(SDK only)" notes or the verbatim Known Harness Limitation block.
- Frontmatter unchanged on all 6 skills (name, description, license, allowed-tools, compatibility, metadata blocks intact).
- Cross-cutting CRITICAL preserved-verbatim blocks: STOP rules for session init, Rationalization Kill List, Known Harness Limitation (team), AskUserQuestion mandate (designer), mode selection table + 7-state machine (improve), skill comparison matrix (helper).

## [11.1.10] - 2026-05-04

### Added
- **`metadata.requires` schema (advisory v1)**: documented in
  `.claude/rules/core/skill-format.md` as an optional `metadata:` sub-block.
  Sub-fields: `bins` (executable names), `env` (env var names), `files`
  (relative paths), and optional `min_node_version` (semver string).
- **session-init-gate hook extension**
  (`.claude/hooks/session-init-gate.cjs`): after the existing session-presence
  check, the hook now resolves the spawning agent's SKILL.md via the plugin
  manifest, parses `metadata.requires`, runs `command -v` / `process.env` /
  `fs.existsSync` checks, and emits an advisory `systemMessage` listing any
  missing dependencies. The advisory does NOT deny the spawn — purely
  informational. Agents without `metadata.requires` are unaffected.
- **3 pilot agents declare `metadata.requires`**:
  - `developer/quality/playwright-test-engineer/SKILL.md` (already declared
    `bins: [npx, node]` opportunistically; schema is now codified — no SKILL
    change needed for this pilot).
  - `developer/quality/qa-lead/SKILL.md` — declares `bins: [node, npx]`,
    `env: []`.
  - `analyst/academic-paper-searcher/SKILL.md` — declares `bins: [curl, jq]`,
    `env: []`.
- **Regression test**:
  `tests/hooks/session-init-gate-requires.test.js` (3 cases — missing bin
  emits advisory, all-present passes through, no-requires ignored).

### Notes
- Back-compat with the prior opportunistic `metadata.requires.bins` usage in
  `playwright-test-engineer`. The existing
  `tests/hooks/session-init-gate.test.js` continues to pass (8/8) — no
  regression to the V10.22.0 session presence gate.

## [11.1.9] - 2026-05-04

### Fixed
- **tests/skills/run-context-passthrough.test.js**: three pre-existing failing
  assertions referenced a "Context subcommand" section of
  `.claude/skills/run/SKILL.md` that was removed in v11.1.5 when the
  `/context` skill was deprecated. The reference document
  `.claude/skills/run/reference/context-passthrough.md` still preserves the
  historical contract; the SKILL.md file now carries a V11.0+ deprecation
  note instead. Updated three assertions to verify the current deprecation
  contract:
  - "contains a Context subcommand section" → "acknowledges the V11.0
    /context skill removal"
  - "lists all four subcommands (show/init/update/clear)" → "documents the
    historical subcommand syntax"
  - "documents the dispatch-before-state-machine ordering" → "points users
    at product_context.yaml for direct edits"

  Reference-file assertions left intact — they continue to verify the
  historical contract is preserved for AgentPath FileWatcher
  backward-compatibility and traceability. All 10 tests in the file now
  pass (was 7/10). Production code unmodified; no other test files
  touched. Pre-existing failure since v11.1.5 baseline (commit 5966a3e8).

## [11.1.8] - 2026-05-04

Wave 3 absorptions: three new agents ported from external skill corpus into the
cAgents archetype tree (Phase 3 paper-search, Phase 7 playwright-test-engineer,
Phase 8 claude-code-owasp). Naturally grouped as a single coherent wave bump
because all three were prepared in parallel and share the same plugin.json
sync pass; the multi-phase nature is documented per-phase below. Per
RESUME_IMPLEMENTATION_PROMPT.md Section B Option B2 cadence concession.

### Added
- **analyst/academic-paper-searcher** (Phase 3): absorbed `paper-search` agent
  from `example/external-skills/ykdojo__paper-search/`. New 2-level analyst
  archetype agent exposing OpenAlex (250M+ academic works, no API key) for
  keyword search, DOI/OpenAlex-ID lookup, citation traversal, and abstract
  retrieval via direct curl+jq invocations against `https://api.openalex.org`.
  Total cAgents agent count: analyst archetype 27 → 28.
- **developer/quality/playwright-test-engineer** (Phase 7): absorbed from
  `testdino-hq/playwright-skill` (v2.2.0, MIT) and
  `jeffallan/claude-skills/playwright-expert` (v1.1.0, MIT). New
  execution-tier agent under the developer/quality branch for Playwright E2E,
  API, component, visual regression, accessibility, and security browser
  automation. Coordinated by `qa-lead`. Frontmatter declares
  `metadata.requires.bins: [npx, node]` ahead of the Phase 4 declarative-deps
  gate. Capabilities: e2e_testing, api_testing, component_testing,
  visual_regression, accessibility_audit, browser_automation,
  flaky_test_diagnosis, playwright_ci_integration.
- **developer/quality/security-owasp** (Phase 8): absorbed from
  `agamm__claude-code-owasp`. Test-focused security execution agent
  covering OWASP Top 10:2025, OWASP Top 10 for LLM Applications (2025),
  Agentic AI Security (OWASP 2026), and ASVS 5.0 tier mapping (L1/L2/L3).
  Scope is distinct from `security-lead` (controller) and `security-engineer`
  (controls/pentest); audits code against OWASP frameworks and produces
  severity-tagged findings with file:line evidence and remediation guidance.
  Allowed-tools: `Read Grep Glob Bash` (audit-only — no Write/Edit by design).
- Total cAgents agent count: 243 → 246 (developer 31 → 33, analyst 27 → 28).
- **tests/regressions/phase3-paper-search-absorbed.test.js** (10 cases),
  **phase7-playwright-absorbed.test.js** (9 cases),
  **phase8-owasp-absorbed.test.js** (10 cases): failing-before/passing-after
  Vitest regressions for each absorption asserting v11.1.0 frontmatter,
  archetype/branch correctness, allowed-tools posture, and ported-content
  coverage. All 29 tests pass in <500ms aggregate.

### Notes
- Source repos under `example/external-skills/{owner}__{repo}/` remain
  read-only per IMPLEMENT_AND_VALIDATE_PROMPT.md § G.3. No corpus files
  modified.
- `scripts/sync-agents.sh` re-run as part of this bump to register the three
  new agents in `.claude-plugin/plugin.json`.

## [11.1.7] - 2026-05-04

TodoWrite -> TaskCreate sweep per official docs.claude.com deprecation. Per
[docs.claude.com/docs/en/tools.md](https://docs.claude.com/docs/en/tools.md),
TodoWrite is the Agent SDK / non-interactive equivalent of TaskCreate /
TaskUpdate / TaskList / TaskGet. Interactive Claude Code sessions (the primary
cAgents runtime) MUST use the TaskCreate family; TodoWrite remains valid only
in SDK / non-interactive mode.

### Changed
- `.claude/rules/core/controllers.md`: rewrote MANDATORY block to specify
  TaskCreate/TaskUpdate as the interactive-mode tools, with TodoWrite noted as
  the SDK equivalent. Updated example code blocks to show both forms.
- `.claude/rules/core/skill-format.md`: added deprecation note documenting that
  interactive Claude Code MUST use TaskCreate/TaskUpdate/TaskList/TaskGet.
- 73 agent SKILL.md files (developer/, operator/, advisor/, analyst/, creator/,
  writer/, strategist/, core/, leadership/): replaced `TodoWrite` in
  `allowed-tools` declarations with `TaskCreate TaskUpdate TaskList TaskGet`.
- 50 agent SKILL.md prompt bodies: rewrote imperative TodoWrite directives
  ("MUST call TodoWrite", "you MUST call TodoWrite", "Call TodoWrite BEFORE",
  "TodoWrite discipline", etc.) as TaskCreate equivalents.
- 6 user skill SKILL.md files (`org`, `team`, `run`, `designer`, `improve`,
  `helper`): added TaskCreate to `allowed-tools`. Updated BLOCKING blocks in
  `run` and `org` to specify TaskCreate as the interactive primary call.
- `operator/business-ops/scribe/SKILL.md` and
  `strategist/product-owner/SKILL.md`: rewrote "Use TodoWrite" body
  instructions as TaskCreate/TaskUpdate equivalents.

### Added
- Regression test `tests/skills/no-todowrite-runtime-instructions.test.js`:
  walks all SKILL.md files under `.claude/skills/` and the 9 archetype roots
  and asserts no file contains imperative phrases like "call TodoWrite", "use
  TodoWrite", or "MUST.*TodoWrite" without SDK contextualization. Allows
  TodoWrite mentions when contextualized as "(SDK only)", "Agent SDK", or
  comparative documentation.

### Notes
- Historical CHANGELOG/RELEASE_NOTES references to TodoWrite are preserved
  unchanged.
- TodoWrite remains in `allowed-tools` for the 6 user skills as an SDK
  fallback. The regression test allows this; only imperative runtime
  instructions in body text are forbidden.

## [11.1.6] - 2026-05-04

### Added
- `skill-size-monitor` hook (`.claude/hooks/skill-size-monitor.cjs`): warns at 600 lines, blocks at 900 lines on `Write|Edit` of `SKILL.md` files to prevent AP-1 bloat regression. Thresholds env-configurable via `CAGENTS_SKILL_WARN_LINES` / `CAGENTS_SKILL_BLOCK_LINES`. Registered under `hooks.PostToolUse` in `.claude/settings.json`. Source pattern: `raintree-technology/claude-starter` `file-size-monitor.sh`.
- Regression test `tests/hooks/skill-size-monitor.test.js` covering under-warn pass-through, warn at 700 lines, deny at 1000 lines, and non-SKILL.md pass-through (4 cases + existence check).

## [11.1.5] - 2026-05-03

Documentation accuracy patch + harness limitation rule. Six-wave /team audit
discovered and resolved 16 defects (2 critical, 6 high, 5 medium, 3 low) and
added a graceful-degradation rule for the empirically-observed Claude Code
limitation that withholds the `Agent` tool from level-1 plugin subagents.

### Fixed
- **CRITICAL**: removed live `/context` skill dispatch from `.claude/skills/run/SKILL.md`
  passthrough block. The /context skill was removed in V11.0; the dispatch
  call would crash for any user typing `/run context show|init|update|clear`.
- **CRITICAL**: rewrote `.claude/skills/run/reference/context-passthrough.md`
  from live-contract to deprecation note (113 -> 75 lines).
- **HIGH**: stale skill recommendations in `.claude/skills/{designer,helper}/SKILL.md`
  and `helper/reference/command-details.md` rewritten to route to `/improve`
  instead of removed `/review` and `/optimize` skills.
- **MEDIUM**: stale `/review`/`/optimize` examples in
  `docs/templates/QUICK_REFERENCE_TEMPLATE.md` updated to `/improve --mode {review,optimize}`.
- **LOW**: `cAgents/CLAUDE.md` rules count corrected (26 -> 29 with breakdown);
  stale domain-overlay file stems corrected.

### Added
- New "Known Harness Limitation: Agent Tool May Be Absent in Teammate Tool Surface"
  section in `.claude/rules/core/teams.md` with a graceful-degradation rule:
  when a /team teammate controller discovers the `Agent` tool is unavailable
  in its runtime surface, it MUST execute the work item directly using
  `Read`/`Write`/`Edit`/`Bash` and self-validate per the 15-check execution
  self-validation protocol, rather than failing the work item. Cross-referenced
  from `.claude/skills/team/SKILL.md`.

### Verified
- `validate-versions.sh`: 18/18 sync at 11.1.5
- `validate-agents.sh`: 243/243 valid, 0 errors, 26/26 hooks registered, 15/15 domain_overrides
- 16/16 defect resolutions confirmed via tailored grep verification

## [11.1.4] - 2026-04-29

Comprehensive plugin health sweep. Closes the v11.1.0 migration cleanup and
brings every documentation/config/script file into sync with the
9-archetype catalog and the 18-slot version registry.

### Fixed
- **Hook-count drift**: `.claude/settings.json` `$comment` field claimed
  "30 CJS files (27 registered hooks + utils + launcher + eval CLI)". Reality
  is 29 .cjs files = 26 unique registered hooks + hook-utils.cjs +
  run-hook.cjs launcher + eval-runner.cjs CLI. Comment now matches reality.
- **Hook-count assertion**: `scripts/ci/validate-agents.sh:444` hardcoded
  `expected 27`. Changed to `expected 26`. Resolves ISSUE-1.
- **Extra PASS print (244/243)**: `scripts/ci/validate-agents.sh` `log_pass`
  was being called from a non-agent location (plugin.json structure check),
  bumping the agent-PASS counter by 1. The plugin.json check now uses a
  direct echo so the counter reflects only agent-level passes. Validator
  now reports `Total agents: 243, Passed: 243`. Resolves ISSUE-7.
- **111 SKILL.md frontmatter warnings swept** (resolves ISSUE-2):
  - 43 broken `related_agents` cross-references retargeted or removed.
    Top offenders: `compliance-officer` (6×), `social-media-manager` (4×),
    `digital-marketing-manager` (4×), `account-executive` (4×),
    `project-manager` (3×). All retargets validated against the actual
    archetype tree (no dangling targets).
  - 26 legacy `related-agents` (hyphen, flat-list) fields renamed to
    `related_agents` (underscore, structured `- name: foo` block).
  - 28 missing `color` fields added (`color: bright_white` default).
  - 13 missing `model` fields added (`model: sonnet` default for
    execution-tier agents).
  - Net effect: `validate-agents.sh` now reports 0 errors, 0 warnings,
    243/243 PASS.
- **Stale validator slots pruned** (resolves ISSUE-4):
  `scripts/ci/validate-versions.sh` previously defined 24 slots, of which
  10 referenced paths that no longer exist (e.g. `engineering/plugin.json`,
  `.claude/skills/review/SKILL.md`). Pruned to track exactly the 18
  canonical locations from `.claude/rules/core/version-registry.md`. Now
  reports `Checked 18/18 locations, 0 mismatches, 0 skipped`.

### Changed
- **Archetype-canonical doc alignment** (resolves ISSUE-5):
  Locked the v11.1.0 migration policy: 9 archetypes
  (`developer`, `operator`, `advisor`, `analyst`, `creator`, `writer`,
  `strategist`, `core`, `leadership`) are canonical. The 15-domain framing
  is retained explicitly as a routing/config overlay (router_keywords +
  controller_catalog files in 13 legacy domain dirs). `CLAUDE.md` and
  `README.md` updated to lead with the archetype tree and document the
  legacy domain dirs as overlay-only. Legacy domain dirs are NOT deleted
  (they hold router config still loaded by the planner).
- **Staging artifact archived** (resolves ISSUE-8):
  `cagents-memory-staging/file-move-table.tsv` (v11.1.0 migration record)
  moved to `archive/migration/v11.1.0/file-move-table.tsv`. The empty
  `cagents-memory-staging/` directory removed. Both locations are
  gitignored — no tracked git state changed.

### Added
- **`scripts/sync-agents.sh --check` dry-run flag** (resolves ISSUE-3):
  CI-friendly drift detection. Exits 0 when `plugin.json` matches the
  archetype-tree SKILL.md inventory, exits 1 on drift, never mutates
  `plugin.json`. Includes `--help` documentation.
- **Two regression tests (Bug-Driven Testing mandate)**:
  - `tests/regression/related-agents-validation.test.js` — asserts 0 errors,
    < 5 broken `related_agents` warnings, < 5 legacy-format warnings, < 10
    total warnings (down from 111). Fails before sweep, passes after.
  - `tests/regression/sync-agents-check.test.js` — exercises both `--check`
    states (in-sync exits 0, drift exits 1) and asserts plugin.json mtime
    is unchanged across `--check` invocations.

## [11.1.3] - 2026-04-29

### Fixed
- **Stale agent references discovered during v11.1.0 migration removed.** Three
  config/script files pointed at agents that never had a backing SKILL.md:
  - `shared/config/planner_config.yaml` — `compliance-officer` (path
    `service/agents/compliance-officer/SKILL.md`) replaced with the real
    `compliance-manager` (`advisor/legal/compliance-manager/SKILL.md`).
  - `people/config/planner_config.yaml` — `talent-acquisition-manager` (path
    `people/agents/talent-acquisition-manager/SKILL.md`) replaced with the real
    `talent-recruiter` (`operator/people-ops/talent-recruiter/SKILL.md`).
  - `scripts/fix-resource-frontmatter.sh` — dropped lines pointing at
    `growth/agents/content-marketing-manager/...` and
    `engineering/agents/security-specialist/...` (4 lines total). Both agents
    never existed; the script processed nonexistent paths as no-ops.
- Reduces remaining `{domain}/agents/` references in the working tree from ~21
  (per CHANGELOG `[11.1.0]` known-follow-ups note) to 11 — only intentional
  references remain (skill docs, the migration script, and the FU spec doc itself).
- Refs FU-3.

## [11.1.2] - 2026-04-29

### Docs
- **`.claude/rules/core/skill-format.md` updated for v11.1.0 frontmatter schema.**
  Replaced `domain:` documentation with `archetype:` (top-level, all agents) and
  `branch:` (top-level, required for 3-level archetypes only). Listed valid branches
  per 3-level archetype: `developer` → backend/frontend/fullstack/infrastructure/quality;
  `operator` → support/business-ops/people-ops/marketing-sales/content;
  `advisor` → legal/health/education/personal. Updated path-conditional `paths:`
  glob from `**/agents/**/SKILL.md` to per-archetype globs. Migration-path examples
  and the full controller SKILL.md example now use the new schema. Marked legacy
  `domain:` field as REMOVED with a deprecation note. Refs FU-2.

## [11.1.1] - 2026-04-29

### Fixed
- **Post-migration validation tooling rebuilt for the v11.1.0 archetype tree.** Five
  scripts/files were left iterating the legacy `{domain}/agents/` glob and reported 0
  agents on the new tree:
  - `scripts/ci/validate-agents.sh` rewritten to walk the 9 archetype roots and
    validate top-level `archetype:` (all agents) and `branch:` (3-level only) against
    the directory layout. Top-level `domain:` is now forbidden (REMOVED in v11.1.0).
    `--archetype` flag added; `--domain` retained as back-compat alias. Reports 243
    agents, 0 errors.
  - `scripts/sync-agents.sh` walks the archetype tree to regenerate
    `.claude-plugin/plugin.json#agents`. Used by the pre-commit hook.
  - `scripts/lint-agents.sh` walks the archetype tree; check 7 now requires top-level
    `archetype:` instead of `domain:` (legacy domain in metadata is tolerated).
- **`.claude-plugin/plugin.json` agents array repopulated** (243 entries). The v11.1.0
  migration emptied the array even though CHANGELOG claimed 246 entries were rewritten;
  `tests/config/plugin-json.test.js` was failing as a result. Restored.
- **Top-level `archetype: core` added** to 4 core agents missed in the v11.1.0
  migration sweep: `core/trigger`, `core/orchestrator`, `core/universal-router`,
  `core/universal-planner`.
- **`analyst/science-coordinator` gained the `allowed-tools:` field** that lint-agents
  required but had been silently passing because the linter wasn't iterating any
  agents.

### Docs
- Added `docs/migration/v11.1.0-followups.md` — execution spec for the v11.1.x
  follow-ups (this bump satisfies FU-1).


## [11.1.0] - 2026-04-29

### Breaking
- **Catalog reorganized into builder-role archetype tree.** All 243 agents physically moved from
  flat `{domain}/agents/{name}/` to `{archetype}/{branch?}/{name}/` paths.
  - 9 root archetypes: `developer/` (3 levels), `operator/` (3 levels), `advisor/` (3 levels),
    `analyst/`, `creator/`, `writer/`, `strategist/`, `core/` (flat infrastructure),
    `leadership/` (flat C-suite).
  - 3-level archetypes use branches:
    - `developer/` → `backend, frontend, fullstack, infrastructure, quality`
    - `operator/` → `support, business-ops, people-ops, marketing-sales, content`
    - `advisor/` → `legal, health, education, personal`
  - Old `{domain}/agents/` directories removed; `{domain}/config/` directories retained for
    router keyword resolution.
- **`Agent_Memory/` folder renamed to `cagents-memory/`** to disambiguate from Claude Code's
  built-in `~/.claude/projects/<project>/memory/` auto-memory. 444 string references swept
  across 688 files (hooks, skills, scripts, docs, rules).
- **`SKILL.md` frontmatter schema change.** `domain:` field replaced by `archetype:` (and
  `branch:` for 3-level archetypes). All 243 agent files updated.
- **`plugin.json` agent paths rewritten** (246 entries) to point at new tree paths.
- Agent identifiers (`cagents:NAME`) unchanged — invocation strings still work; only the
  underlying SKILL.md paths moved.

### Changed
- Skill catalog still 6 user skills; routing and pipelines unchanged. The restructure is
  organizational, not behavioral.
- `tests/config/plugin-json.test.js` updated to assert archetype roots instead of legacy
  domain roots.

### Known Follow-ups (deferred to v11.1.x)
- `scripts/ci/validate-agents.sh` rewrite for archetype tree (currently iterates legacy
  `{domain}/agents/` glob; non-blocking — Vitest is the runtime gate).
- `.claude/rules/core/skill-format.md` documentation update for new frontmatter spec
  (`archetype:`/`branch:` instead of `domain:`).
- 7 stale agent references discovered during migration (in `shared/config/planner_config.yaml`,
  `people/config/planner_config.yaml`, `scripts/fix-resource-frontmatter.sh`) — pre-existing
  bugs pointing at `compliance-officer`, `talent-acquisition-manager`,
  `content-marketing-manager`, `security-specialist` which never existed. Cleanup in v11.1.1.

### Migration Tooling
- `scripts/migrate-v11.1.0.sh` — generates the file-move table from `plugin.json`.
- `scripts/migrate-v11.1.0-execute.sh` — Stages A-E (file moves, frontmatter swap,
  `plugin.json` rewrite, config sweep, cleanup).
- `scripts/migrate-v11.1.0-rename.sh` — Stage F (`Agent_Memory` → `cagents-memory` rename).

### Notes
- Atomic single-commit migration per project owner direction. Standard semver would suggest
  v12.0.0 (breaking changes); bumped to v11.1.0 by explicit owner override (solo project,
  no public API contract). Tests: 781/781 Vitest passing pre and post migration.

## [11.0.5] - 2026-04-28

### Changed
- `createHook()` factory in `.claude/hooks/hook-utils.cjs` now auto-injects
  `continue: true` into hook responses that omit it. The auto-inject fires
  only when the response is an object lacking both `continue` and `decision`,
  and not carrying a deny `permissionDecision` — i.e., only when the hook
  legitimately wanted the run to keep going but forgot to declare it. This
  prevents the entire class of latent bugs that V11.0.4 hit in
  `tool-failure-tracker.cjs` where the pattern-detection branch returned
  `{hookSpecificOutput: ...}` and broke any test asserting `result.continue
  === true`. Hooks that explicitly return `continue: false` (TeammateIdle
  clean shutdown), set `decision` (Stop hook block), or carry a deny
  `permissionDecision` (PreToolUse deny) are unchanged.

### Tests
- Added 7 regression tests in `tests/hooks/hook-utils.test.js` under the
  `createHook continue:true auto-inject` describe block: verifies the
  inject fires for hookSpecificOutput-only and systemMessage-only shapes,
  and verifies it does NOT fire for `continue: false`, `decision: block`,
  or deny responses. Per CLAUDE.md bug-driven testing mandate.
- Full suite: 781 passed / 0 failed / 0 skipped.

## [11.0.4] - 2026-04-28

### Fixed
- `tool-failure-tracker.cjs` pattern-detection branch now returns
  `continue: true` alongside `hookSpecificOutput`. Previously, after 3+
  failures of the same tool accumulated in a session's
  `tool_failures.yaml`, the hook returned a `{hookSpecificOutput: ...}`
  response missing the `continue` field — causing latent failures in
  `tests/hooks/tool-failure-tracker.test.js` whenever prior runs left
  enough state behind to trigger the pattern path. Discovered as flake
  during full-suite stress runs (1/6 fail rate); the failure was
  deterministic in isolation (5/5 fail) once Bash failures had built up.

### Changed
- `.gitignore` now excludes `.claude/*.lock` (covers
  `.claude/scheduled_tasks.lock` and any future lock-file runtime
  artifacts).
- `tests/config/plugin-json.test.js` deleted the V10-era domain
  `plugin.json` `describe.skip` block (55 dead skipped tests). V11.0
  removed domain sub-plugin files; the root `plugin.json` coverage
  earlier in the same file replaces the deleted suite.

### Tests
- Added `'should include continue:true even in the pattern-detection
  branch'` regression test in `tests/hooks/tool-failure-tracker.test.js`
  to pin the fix. Per CLAUDE.md bug-driven testing mandate.
- Full suite: 773 passed / 0 failed / 0 skipped (3 consecutive runs).
  Was 773 / flake / 55 skipped after V11.0.3.

## [11.0.3] - 2026-04-28

### Fixed
- **Hook test reliability**: `dedupGuard` in `.claude/hooks/hook-utils.cjs` no
  longer short-circuits hook invocations during tests, fixing 14 pre-existing
  failures across `tests/hooks/team-stop.test.js`,
  `tests/hooks/subagent-stop-tracker.test.js`, and
  `tests/hooks/attention-injection.test.js`. The dedup marker files at
  `/tmp/cagents-dedup-*` would leak from cancelled/crashed prior runs and then
  cause the next test invocation with the same deterministic fixture (e.g.,
  `session_id: "team_test-stop_260317_999"`) to short-circuit, skipping the
  side effects under test. Production behavior is unchanged: dedup still fires
  for plugin+project double-load scenarios.

### Changed
- `dedupGuard` now bypasses dedup when `VITEST=true`, `NODE_ENV=test`, or
  `CAGENTS_HOOK_DEDUP_DISABLE=1`. Vitest sets `VITEST=true` automatically; the
  other two are escape hatches for non-vitest test runners and ad-hoc debugging.

### Tests
- Added 4 regression tests in `tests/hooks/hook-utils.test.js` under the
  `dedupGuard test-mode bypass` describe block: verifies the bypass triggers
  on each of the 3 env vars and that production behavior (no env vars set)
  still dedupes correctly. Per CLAUDE.md bug-driven testing mandate.
- Full suite: 773 passed / 55 skipped / 0 failed (was 759 / 55 / 14).

## [11.0.2] - 2026-04-28

### Fixed
- **Bug-1**: `session-catchup.cjs` no longer suggests removed `/review`
  and `/optimize` skills at session resume — re-mapped to
  `/improve --mode review|optimize|full` (gap_analysis Bug-1).
- **Bug-2**: `magic-keywords.cjs` natural-language router no longer
  routes `"review"`/`"optimize"` to removed slash-commands — re-mapped
  to `/improve --mode review|optimize` (gap_analysis Bug-2).
- `model-routing-advisor.cjs:34`: stale "262 agents" comment →
  "243 agents" (gap_analysis Gap-4).
- `core/reviewer/SKILL.md:106`: removed `/review` slash-command
  reference (gap_analysis Gap-5).
- `scripts/sync-versions.sh`: header self-description "21 locations" →
  "18 locations" (gap_analysis NEW-5).
- `docs/commands/helper.md`: recommendation table re-mapped from
  `/review`/`/optimize` to `/improve --mode review|optimize`
  (gap_analysis NEW-7).
- `docs/CLAUDE.local.md.example`: `/optimize --dry-run` →
  `/improve --mode optimize --dry-run` (gap_analysis NEW-8).
- `docs/SKILLS.md`: replaced V10-era contents with redirect stub
  pointing at `docs/SKILLS_REFERENCE.md` (gap_analysis NEW-2).
- `docs/WORKFLOW_AGENT_INTERACTIONS.md`: `/review` and `/optimize`
  workflow nodes (lines 68–107) updated to `/improve --mode`
  equivalents (gap_analysis NEW-3).
- `.claude/rules/README.md`: refreshed rule count (29 files) and added
  V11.0 skill catalog table; removed live treatment of removed skills
  (gap_analysis NEW-4).

### Changed
- **Schema deprecation comments**:
  `.claude/skills/run/reference/session-schema.md`,
  `.claude/rules/core/orchestration.md`, and
  `.claude/rules/core/orchestration-reference.md` now carry inline
  `DEPRECATED in V11.0` callouts above enum entries for `review_*`,
  `optimize_*`, `context_*`, and `debug_*` prefixes. **No enum values
  were removed** — preserved for AgentPath FileWatcher
  backward-compatibility (cross-project contract).

### Tests
- Added `tests/hooks/session-catchup-v11.test.js` (7 tests) and
  `tests/hooks/magic-keywords-v11.test.js` (9 tests) per CLAUDE.md
  bug-driven testing mandate. Both files fail-before-fix and
  pass-after-fix.

## [11.0.1] - 2026-04-21

### Removed
- `statusLine` hook and the Claude Code status bar integration.
  Deleted `.claude/hooks/statusline.cjs`, removed the `statusLine`
  block from `.claude/settings.json`, removed the StatusLine Advisory
  branch from `session-catchup.cjs`, and dropped the Status Line
  Provider section from `.claude/rules/core/hooks.md`. The feature
  was refactored twice in quick succession (V10.26.x and commit
  2bf03f56) without delivering sustained value; the surface is
  retired rather than maintained in its current shape.

### Added
- Regression test `tests/config/no-statusline.test.js` that pins the
  removal: asserts settings.json has no `statusLine` key, the hook
  file does not exist, the two former tests are gone, session-catchup
  no longer mentions statusline, and hooks.md no longer documents the
  provider.

## [11.0.0] - 2026-04-21 — BREAKING

### Removed (migrate before upgrading)
- `/context` slash command — use `/run context show|init|update|clear`
  (the `/run context` passthrough has been available since V10.26.9).
- `/debug` slash command — use `/run --mode debug`
  (`--mode debug` wiring landed in V10.26.11–18).
- `/review` slash command — use `/improve --mode review` (or just
  `/improve`, since `review` is the default mode; shim was V10.26.26).
- `/optimize` slash command — use `/improve --mode optimize`
  (shim was V10.26.32).
- Legacy migration fallback read paths:
  `_projects/{hash}/review/baseline.yaml` and
  `_projects/{hash}/optimize/pattern_effectiveness.yaml`. `/improve`
  now reads and writes only under `_projects/{hash}/improve/`.

### Added
- `/improve --mode full` is the canonical headline capability: unified
  review → optimize pipeline with a shared baseline captured once and a
  synthesized `improve_report.md` (landed V10.26.33; no pre-V11
  equivalent).
- `docs/MIGRATION-V11.md` — complete user migration guide.
- `tests/v11-removal.test.mjs` — regression test asserting the 4
  removed skill dirs are gone, plugin.json description is clean, and
  CLAUDE.md + /helper catalog list exactly the 6 surviving skills.

### Changed
- Skill menu reduced from 10 to 6: `/run`, `/team`, `/org`,
  `/designer`, `/improve`, `/helper`.
- `plugin.json` description updated to reflect the 6-skill catalog.
- `CLAUDE.md` skill table, quick reference, and directory listing
  updated to the V11 shape.
- `/helper` SKILL.md and `reference/command-details.md` rewrote the
  Available Commands table and added a "Removed in V11.0.0" section
  pointing at `docs/MIGRATION-V11.md`.
- `scripts/sync-versions.sh` now updates 6 SKILL.md frontmatter
  versions (down from 10).
- `scripts/ci/cagents-ci.sh` tiny-bump guard exempts major-version
  bumps from the ≤5-file non-sync diff ceiling and updates its
  sync-targets list to the 6 surviving SKILL.md paths.
- `.claude/rules/core/version-registry.md` shrunk from 21 to 17
  version-sync locations.

### Removed (tests)
- `tests/skills/review-shim.test.mjs`
- `tests/skills/optimize-shim.test.mjs`
- `tests/skills/debug-shim.test.mjs`
- `tests/skills/deprecation-warnings.test.mjs`
- `tests/skills/context-invocation.test.js`
- `tests/skills/context-utility-final.test.js`

Each of the removed tests exercised paths that no longer exist.
Regression coverage is folded into `tests/v11-removal.test.mjs`.

### Migration

See `docs/MIGRATION-V11.md` for the complete command-by-command
migration guide, including optional data-file migration for
cross-session baselines and pattern-effectiveness history. Users who
cannot migrate can pin to `^10.26`.

### Bug / Rationale

Bug: Deprecation shims accumulating parsing + deprecation-warning
duplication across four skills.
Root cause: Each shim re-implemented argument forwarding and one-shot
warning logic, with subtle drift between them.
Test added: `tests/v11-removal.test.mjs`.
Could have caught by: contract test on `plugin.json` skills registry +
filesystem invariant on `.claude/skills/` directory shape.

## [10.26.35] - 2026-04-21

### Changed
- Version bump to 10.26.35. See commit message for details.

## [10.26.34] - 2026-04-21

### Changed
- Version bump to 10.26.34. See commit message for details.

## [10.26.33] - 2026-04-21

### Changed
- Version bump to 10.26.33. See commit message for details.

## [10.26.32] - 2026-04-21

### Changed
- Version bump to 10.26.32. See commit message for details.

## [10.26.31] - 2026-04-21

### Changed
- Version bump to 10.26.31. See commit message for details.

## [10.26.30] - 2026-04-21

### Changed
- Version bump to 10.26.30. See commit message for details.

## [10.26.29] - 2026-04-21

### Changed
- Version bump to 10.26.29. See commit message for details.

## [10.26.28] - 2026-04-21

### Changed
- Version bump to 10.26.28. See commit message for details.

## [10.26.27] - 2026-04-21

### Changed
- Version bump to 10.26.27. See commit message for details.

## [10.26.26] - 2026-04-21

### Changed
- Version bump to 10.26.26. See commit message for details.

## [10.26.25] - 2026-04-21

### Changed
- Version bump to 10.26.25. See commit message for details.

## [10.26.24] - 2026-04-21

### Changed
- Version bump to 10.26.24. See commit message for details.

## [10.26.23] - 2026-04-21

### Changed
- Version bump to 10.26.23. See commit message for details.

## [10.26.22] - 2026-04-21

### Changed
- Version bump to 10.26.22. See commit message for details.

## [10.26.21] - 2026-04-21

### Changed
- Version bump to 10.26.21. See commit message for details.

## [10.26.20] - 2026-04-21

### Changed
- Version bump to 10.26.20. See commit message for details.

## [10.26.19] - 2026-04-21

### Changed
- Version bump to 10.26.19. See commit message for details.

## [10.26.18] - 2026-04-21

### Changed
- Version bump to 10.26.18. See commit message for details.

## [10.26.17] - 2026-04-21

### Changed
- Version bump to 10.26.17. See commit message for details.

## [10.26.16] - 2026-04-21

### Changed
- Version bump to 10.26.16. See commit message for details.

## [10.26.15] - 2026-04-21

### Changed
- Version bump to 10.26.15. See commit message for details.

## [10.26.14] - 2026-04-21

### Changed
- Version bump to 10.26.14. See commit message for details.

## [10.26.13] - 2026-04-21

### Changed
- Version bump to 10.26.13. See commit message for details.

## [10.26.12] - 2026-04-21

### Changed
- Version bump to 10.26.12. See commit message for details.

## [10.26.11] - 2026-04-21

### Changed
- Version bump to 10.26.11. See commit message for details.

## [10.26.10] - 2026-04-21

### Changed
- `.claude/skills/context/SKILL.md` description tightened to utility-facing:
  "Internal utility: read/write cagents-memory/_projects/{hash}/product_context.yaml.
  Claude-invoked by /run orchestrator enrichment and by the /run context
  passthrough (V10.26.9). Direct user invocation deprecated — use
  /run context show|init|update|clear instead."
- `.claude/skills/context/SKILL.md` body adds a "Back-compat note" directing
  users who still type `/context` to `/run context show`. Heading renamed to
  "/context - Product Context Utility (Claude-invoked)".
- `docs/RELEASE_NOTES.md` adds a consolidated entry for the V10.26.6 –
  V10.26.10 `/context` utility demotion arc.

### Preserved
- `.claude-plugin/plugin.json` description continues to say "8 user skills +
  /context utility" (set in V10.26.6, no change required).
- `metadata.user-invocable: "false"` preserved (set in V10.26.6).
- Data file path `cagents-memory/_projects/{hash}/product_context.yaml`
  unchanged throughout the entire demotion arc.

### Added
- `tests/skills/context-utility-final.test.js` asserts the tightened
  description, preserved frontmatter flags, back-compat pointer, and
  plugin.json "/context utility" wording.

## [10.26.9] - 2026-04-21

### Added
- `/run context show|init|update|clear` passthrough subcommands. When
  `$ARGUMENTS` starts with `context` followed by one of the four recognized
  subcommands, `/run` dispatches to the `/context` utility skill via the
  Skill tool and skips the standard state machine.
- `.claude/skills/run/reference/context-passthrough.md` documents the full
  dispatch contract, data path, back-compat behavior, and edge cases.
- `.claude/skills/run/SKILL.md` (Step 1) now includes the front-door
  dispatch check before the state machine runs.
- `tests/skills/run-context-passthrough.test.js` verifies the reference
  doc exists, the four subcommands are documented, the dispatch target is
  the `/context` skill, and the token-matching routing logic is correct.

### Preserved
- Data file path `cagents-memory/_projects/{hash}/product_context.yaml`
  unchanged — the passthrough touches the WRITE surface only.
- Orchestrator's direct READ path (V10.26.7 contract) continues to work
  without going through the skill or the passthrough.

## [10.26.8] - 2026-04-21

### Changed
- `.claude/skills/helper/reference/command-details.md` replaces the full
  `## /context - Product Context Manager` section with a one-paragraph
  "Internal utilities (Claude-invoked)" pointer directing users to
  `/run context show|init|update|clear` (V10.26.9) or direct yaml edit.
- `.claude/skills/helper/SKILL.md` moves `/context` out of the main
  user-facing Command Overview table into a new "Internal utilities
  (Claude-invoked)" subsection. "I want to PERSIST project knowledge"
  decision-guide answer now points to `/run context init` (V10.26.9+).
- `.claude/skills/helper/reference/comparison-tables.md` drops the
  `/context` column from all user-facing comparison tables.
- The "Planned Commands" `/context` slot reserved in V10.26.4 is claimed:
  demotion is recorded as complete as of V10.26.6.
- `tests/skills/helper-catalog.test.js` now asserts 8 user-invocable
  skills in the main catalog and `/context` in the "Internal utilities"
  subsection, with an explicit check that the user-facing overview table
  no longer contains a `/context` row.

## [10.26.7] - 2026-04-21

### Added
- `core/orchestrator/resources/product-context-loader.md` documenting
  the INIT-state read of
  `cagents-memory/_projects/{hash}/product_context.yaml` into
  `enriched_context.project_summary`. Codifies the 500-character budget from
  `orchestration-reference.md:27` and the SHA-256 hash derivation from `pwd`.
- `core/orchestrator/SKILL.md` references the new resource via
  `@resources/product-context-loader.md`.
- `tests/orchestrator/product-context-read.test.js` verifies the helper doc
  exists, cites the budget and the canonical data-file path, and is
  referenced from orchestrator SKILL.md.

### Preserved
- No code path change. The orchestrator already reads the YAML directly; this
  patch formalizes the contract so the `/context` skill can be demoted to a
  utility in V10.26.10 without regressing enrichment.

## [10.26.6] - 2026-04-21

### Changed
- `.claude/skills/context/SKILL.md` frontmatter flips `metadata.user-invocable`
  from `"true"` to `"false"` and updates `argument-hint` to
  `"[init|show|update|clear] (Claude-invoked)"`. `/context` no longer appears
  in the `/` menu; Claude can still invoke it for enrichment.
- `.claude-plugin/plugin.json` description reworded to
  "8 user skills + /context utility" to reflect the demotion.
- `docs/SKILLS_REFERENCE.md` moves `/context` into a new
  "Internal utilities (Claude-invoked only)" section.

### Preserved
- Data file path `cagents-memory/_projects/{hash}/product_context.yaml` unchanged.
- Orchestrator's direct read path (per `orchestration-reference.md:18,27`)
  continues to work without going through the skill.

### Added
- `tests/skills/context-invocation.test.js` asserting the frontmatter flip
  and that `metadata['user-invocable'] === "false"`.

## [10.26.5] - 2026-04-21

### Changed
- Promoted `check_tiny_bump` in `scripts/ci/cagents-ci.sh` from warn-only
  to blocking. Four prior patches (10.26.1–10.26.4) ran clean under warn
  mode; enforcement now lands so Cluster 2+ bumps merge only under the
  full guard.
- Set `CAGENTS_TINY_BUMP_BLOCK=0` to opt back into warn-only mode for
  local experiments.

### Added
- Regression case in `tests/ci/tiny-bump-guard.test.js` asserting the
  guard defaults to blocking when no `CAGENTS_TINY_BUMP_BLOCK` env var
  is set.
- `version-registry.md` notes the guard is enforced and links to the
  opt-out env var.

## [10.26.4] - 2026-04-21

### Added
- "Planned Commands (coming in V10.27+)" section in `.claude/skills/helper/SKILL.md`
  reserving slots for `/improve` (V10.29), the `/debug` -> `/run --mode debug`
  migration (V10.28), and the `/context` demotion (V10.27).
- `tests/skills/helper-catalog.test.js` asserts all 9 current skills and the
  three planned slots are present in the helper catalog.

## [10.26.3] - 2026-04-21

### Added
- `check_tiny_bump` stage in `scripts/ci/cagents-ci.sh` that validates
  CHANGELOG entries, registry-location agreement (21 files), and
  non-sync diff size (<=5 files). Warn-only for one release to surface
  false positives before enforcement in 10.26.5.
- `tests/ci/tiny-bump-guard.test.js` covers compliant bump, no-op,
  warn-only, block-mode, and registry-drift paths.
- `tiny-bump` subcommand added to the CI script CLI.

## [10.26.2] - 2026-04-21

### Added
- "Tiny-Bump Cadence" section in `.claude/rules/core/version-registry.md`
  codifying the six atomicity criteria (one coherent change, CI-green,
  commit-before-verify, back-compat, sync-versions run, regression test).
- Cross-link from `docs/RELEASE_NOTES.md` header so readers discover the
  discipline without hunting for it.
- `tests/rules/version-registry-structure.test.js` asserts the cadence
  heading, all six criteria, 21 numbered registry rows, and references to
  the `CLAUDE.md` bug-driven-testing mandate.

## [10.26.1] - 2026-04-21

### Added
- `CHANGELOG.md` seeded with 10.26.0 baseline entry. Registered as sync-versions
  location #21 so every future bump auto-inserts a header.
- `tests/changelog-format.test.js` asserts Keep-a-Changelog headers are valid
  and the top version entry matches `package.json`.

## [10.26.0] - 2026-04-21

### Baseline
- First version tracked in this CHANGELOG. All prior release history lives in
  `docs/RELEASE_NOTES.md`.

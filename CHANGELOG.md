# Changelog

All notable changes to cAgents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry corresponds to one atomic tiny-bump commit. See
`.claude/rules/core/version-registry.md` for the tiny-bump cadence rules.

## [Unreleased]

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

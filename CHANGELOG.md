# Changelog

All notable changes to cAgents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry corresponds to one atomic tiny-bump commit. See
`.claude/rules/core/version-registry.md` for the tiny-bump cadence rules.

## [Unreleased]

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
  "Internal utility: read/write Agent_Memory/_projects/{hash}/product_context.yaml.
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
- Data file path `Agent_Memory/_projects/{hash}/product_context.yaml`
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
- Data file path `Agent_Memory/_projects/{hash}/product_context.yaml`
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
- `core/agents/orchestrator/resources/product-context-loader.md` documenting
  the INIT-state read of
  `Agent_Memory/_projects/{hash}/product_context.yaml` into
  `enriched_context.project_summary`. Codifies the 500-character budget from
  `orchestration-reference.md:27` and the SHA-256 hash derivation from `pwd`.
- `core/agents/orchestrator/SKILL.md` references the new resource via
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
- Data file path `Agent_Memory/_projects/{hash}/product_context.yaml` unchanged.
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

# Changelog

All notable changes to cAgents will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each entry corresponds to one atomic tiny-bump commit. See
`.claude/rules/core/version-registry.md` for the tiny-bump cadence rules.

## [Unreleased]

## [10.26.4] - 2026-04-21

### Changed
- Version bump to 10.26.4. See commit message for details.

## [10.26.3] - 2026-04-21

### Changed
- Version bump to 10.26.3. See commit message for details.

## [10.26.2] - 2026-04-21

### Changed
- Version bump to 10.26.2. See commit message for details.

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

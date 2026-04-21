---
paths:
  - "**/*plugin.json"
  - "**/*marketplace.json"
  - "**/package.json"
  - "CLAUDE.md"
  - "scripts/sync-versions.sh"
---

# Version Registry

All locations where the cAgents version number appears. Keep ALL locations in sync on every release.

## Version Locations (21 total)

| # | File | Field/Line | Updated By |
|---|------|-----------|------------|
| 1 | `package.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 2 | `.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 3 | `.claude-plugin/marketplace.json` | `version` (line 13) | `scripts/sync-versions.sh` |
| 4 | `CLAUDE.md` | Quick Reference section (`**Version**:`) | `scripts/sync-versions.sh` |
| 5 | `.claude/settings.json` | `CAGENTS_VERSION` + `$comment` | `scripts/sync-versions.sh` |
| 6 | `.claude/skills/run/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 7 | `.claude/skills/org/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 8 | `.claude/skills/team/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 9 | `.claude/skills/review/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 10 | `.claude/skills/optimize/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 11 | `.claude/skills/designer/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 12 | `.claude/skills/debug/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 13 | `.claude/skills/helper/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 14 | `.claude/skills/context/SKILL.md` | metadata `version:` | `scripts/sync-versions.sh` |
| 15 | `.claude/hooks/session-catchup.cjs` | `cAgents V{version} session initialized` | `scripts/sync-versions.sh` |
| 16 | `scripts/ci/cagents-ci.sh` | `# Version:` header + `log_section` banner | `scripts/sync-versions.sh` |
| 17 | `scripts/ci/validate-agents.sh` | `# Version:` header | `scripts/sync-versions.sh` |
| 18 | `README.md` | Version History `**V{version}** — Current release` | `scripts/sync-versions.sh` |
| 19 | `docs/README.md` | `**Version**:` header | `scripts/sync-versions.sh` |
| 20 | `docs/RELEASE_NOTES.md` | `**Current Version**:` header | `scripts/sync-versions.sh` |
| 21 | `CHANGELOG.md` | `## [VERSION] - DATE` header inserted under `[Unreleased]` | `scripts/sync-versions.sh` |

## Sync Tool

`scripts/sync-versions.sh <version>` updates all 21 locations (3 JSON files + CLAUDE.md + settings.json + 9 SKILL.md frontmatters + session-catchup.cjs + cagents-ci.sh + validate-agents.sh + README.md + docs/README.md + docs/RELEASE_NOTES.md + CHANGELOG.md).

## Version Bump Procedure

1. Determine increment: patch (bug fix), minor (feature), major (breaking)
2. Run `scripts/sync-versions.sh <new-version>`
3. Verify: `grep -r '"version"' .claude-plugin/ package.json | grep -v node_modules`

## Tiny-Bump Cadence

A "tiny bump" is a patch-level version increment (x.y.Z+1) that ships exactly
one coherent change. Tiny bumps are the preferred cadence for evolving cAgents
because each increment is small, reviewable, and independently revertible.

Every tiny bump MUST satisfy all six atomicity criteria:

1. **One coherent change**: the bump addresses a single objective (one rule
   tweak, one guard promotion, one catalog slot). If the change spans multiple
   independent objectives, split it into two bumps.
2. **CI-green**: `npm test` and `scripts/ci/cagents-ci.sh` both pass at HEAD
   before the bump is merged. No red CI, no "I'll fix it in the next bump."
3. **Commit-before-verify**: the commit lands first, then verification runs.
   If a hook or test fails after commit, use `git reset HEAD~1` to undo the
   commit (keeping changes staged), fix the issue, and re-commit as a NEW
   commit — never amend.
4. **Back-compat**: the bump must not remove or rename a public-facing
   contract (skill, agent, hook event, memory path). Deprecations are allowed
   (documented + warn-only); removals require a minor or major bump.
5. **`scripts/sync-versions.sh` run**: all 21 registry locations agree with
   the new version. `grep -r '"version"' .claude-plugin/ package.json` must
   show the new version in every match.
6. **Regression test per CLAUDE.md mandate**: per the Bug-Driven Testing
   mandate in `CLAUDE.md`, every bump that fixes a bug ships a failing-before
   / passing-after regression test. Feature or rule bumps ship a test that
   asserts the new behavior exists.

### When a bump is NOT a tiny bump

- Multi-file refactors touching more than ~5 files outside the 21 sync
  locations → should usually be a minor bump (x.Y+1.0).
- Breaking changes (removed skill, renamed agent, altered hook contract)
  → major bump (X+1.0.0).
- Reverts of a prior bump → still a tiny bump; describe the revert in the
  CHANGELOG entry and the commit message.

### Enforcement

- `scripts/ci/cagents-ci.sh` runs a `check_tiny_bump` stage that validates
  CHANGELOG.md has an entry for the new version, the 21 registry locations
  agree, and the non-sync diff is ≤5 files. The guard was warn-only in
  10.26.3 and promoted to blocking in 10.26.5.
- Reviewers cite this section when a bump violates the atomicity criteria.

## Related

- `scripts/sync-versions.sh` -- Automated JSON version sync
- `.claude/rules/core/version-registry.md` -- This file (canonical registry)
- `CLAUDE.md` (Bug-Driven Testing section) -- regression test mandate
- `CHANGELOG.md` -- per-bump entries (landed in 10.26.1)

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

## Related

- `scripts/sync-versions.sh` -- Automated JSON version sync
- `.claude/rules/core/version-registry.md` -- This file (canonical registry)

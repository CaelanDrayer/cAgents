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

## Version Locations (24 total)

| # | File | Field/Line | Updated By |
|---|------|-----------|------------|
| 1 | `package.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 2 | `.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 3 | `.claude-plugin/marketplace.json` | `version` (line 13) | `scripts/sync-versions.sh` |
| 4 | `CLAUDE.md` | Quick Reference section (`**Version**:`) | `scripts/sync-versions.sh` |
| 5 | `.claude/settings.json` | `CAGENTS_VERSION` + `$comment` | `scripts/sync-versions.sh` |
| 6 | `core/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 7 | `engineering/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 8 | `creative/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 9 | `business/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 10 | `growth/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 11 | `people/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 12 | `service/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 13 | `leadership/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 14 | `shared/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 15 | `.claude/skills/run/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 16 | `.claude/skills/org/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 17 | `.claude/skills/team/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 18 | `.claude/skills/review/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 19 | `.claude/skills/optimize/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 20 | `.claude/skills/designer/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 21 | `.claude/skills/debug/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 22 | `.claude/skills/helper/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 23 | `.claude/hooks/session-catchup.cjs` | `cAgents V{version} session initialized` | `scripts/sync-versions.sh` |
| 24 | `scripts/ci/cagents-ci.sh` | `# Version:` header + `log_section` banner | `scripts/sync-versions.sh` |

## Sync Tool

`scripts/sync-versions.sh <version>` updates all 24 locations (12 JSON files + CLAUDE.md + settings.json + 8 SKILL.md frontmatters + session-catchup.cjs + cagents-ci.sh).

## Version Bump Procedure

1. Determine increment: patch (bug fix), minor (feature), major (breaking)
2. Run `scripts/sync-versions.sh <new-version>`
3. Verify: `grep -r '"version"' .claude-plugin/ */.claude-plugin/ package.json | grep -v node_modules`

## Related

- `scripts/sync-versions.sh` -- Automated JSON version sync
- `.claude/rules/core/version-registry.md` -- This file (canonical registry)

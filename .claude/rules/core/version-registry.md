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

## Version Locations (13 total)

| # | File | Field/Line | Updated By |
|---|------|-----------|------------|
| 1 | `package.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 2 | `.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 3 | `.claude-plugin/marketplace.json` | `version` (line 13) | `scripts/sync-versions.sh` |
| 4 | `CLAUDE.md` | Quick Reference section (`**Version**:`) | `scripts/sync-versions.sh` |
| 5 | `core/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 6 | `engineering/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 7 | `creative/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 8 | `business/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 9 | `growth/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 10 | `people/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 11 | `service/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 12 | `leadership/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 13 | `shared/.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |

## Sync Tool

`scripts/sync-versions.sh <version>` updates all 13 locations (12 JSON files + CLAUDE.md).

## Version Bump Procedure

1. Determine increment: patch (bug fix), minor (feature), major (breaking)
2. Run `scripts/sync-versions.sh <new-version>`
3. Verify: `grep -r '"version"' .claude-plugin/ */.claude-plugin/ package.json | grep -v node_modules`

## Related

- `scripts/sync-versions.sh` -- Automated JSON version sync
- `.claude/rules/core/version-registry.md` -- This file (canonical registry)

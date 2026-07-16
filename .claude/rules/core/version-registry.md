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

**Last verified**: v12.42.0 — `scripts/ci/validate-versions.sh` reports `Checked 16/16 locations, 0 mismatches, 0 skipped`. v12.2.0 removed slot #7 (`.claude/skills/org/SKILL.md`) when `/org` was removed and cross-domain coordination folded into `/team` strategic mode. Slots #8-#17 renumbered to #7-#16. (Prior v12.1.2 removal: slot `.claude/skills/improve/SKILL.md` when `/improve` was folded into `/run` via the keyword router.)

## Version Locations (16 total)

See `docs/VERSION_REGISTRY_HISTORY.md` for V10.x history.

| # | File | Field/Line | Updated By |
|---|------|-----------|------------|
| 1 | `package.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 2 | `.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 3 | `.claude-plugin/marketplace.json` | `version` (line 13) | `scripts/sync-versions.sh` |
| 4 | `CLAUDE.md` | Quick Reference section (`**Version**:`) | `scripts/sync-versions.sh` |
| 5 | `.claude/settings.json` | `CAGENTS_VERSION` + `$comment` | `scripts/sync-versions.sh` |
| 6 | `.claude/skills/run/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 7 | `.claude/skills/team/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 8 | `.claude/skills/designer/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 9 | `.claude/skills/helper/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
| 10 | `.claude/hooks/session-catchup.cjs` | `cAgents V{version} session initialized` | `scripts/sync-versions.sh` |
| 11 | `scripts/ci/cagents-ci.sh` | `# Version:` header + `log_section` banner | `scripts/sync-versions.sh` |
| 12 | `scripts/ci/validate-agents.sh` | `# Version:` header | `scripts/sync-versions.sh` |
| 13 | `README.md` | Version History `**V{version}** — Current release` | `scripts/sync-versions.sh` |
| 14 | `docs/README.md` | `**Version**:` header | `scripts/sync-versions.sh` |
| 15 | `docs/RELEASE_NOTES.md` | `**Current Version**:` header | `scripts/sync-versions.sh` |
| 16 | `CHANGELOG.md` | `## [VERSION] - DATE` header inserted under `[Unreleased]` | `scripts/sync-versions.sh` |

## Sync Tool

`scripts/sync-versions.sh <version>` updates all 16 registry locations
(3 JSON files + CLAUDE.md + settings.json + 4 SKILL.md frontmatters +
session-catchup.cjs + cagents-ci.sh + validate-agents.sh + README.md +
docs/README.md + docs/RELEASE_NOTES.md + CHANGELOG.md).

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
5. **`scripts/sync-versions.sh` run**: all 16 registry locations agree with
   the new version. `grep -r '"version"' .claude-plugin/ package.json` must
   show the new version in every match.
6. **Regression test per CLAUDE.md mandate**: per the Bug-Driven Testing
   mandate in `CLAUDE.md`, every bump that fixes a bug ships a failing-before
   / passing-after regression test. Feature or rule bumps ship a test that
   asserts the new behavior exists.

### When a bump is NOT a tiny bump

- Multi-file refactors touching more than ~5 files outside the 16 sync
  locations → should usually be a minor bump (x.Y+1.0).
- Breaking changes (removed skill, renamed agent, altered hook contract)
  → major bump (X+1.0.0).
- Reverts of a prior bump → still a tiny bump; describe the revert in the
  CHANGELOG entry and the commit message.
- **Audit / consolidation sessions** that intentionally touch dozens-to-hundreds
  of files across multiple surfaces (e.g., a doc + wiring + agent-name sweep)
  → minor bump. The tiny-bump-guard's ≤5-non-sync-file cap applies to **patch**
  bumps only, so a minor bump is **exempt** from the file-count check and lands
  green on `cagents-ci.sh` (it still must satisfy the CHANGELOG-entry and
  registry-agreement checks). Bumping to `x.Y+1.0` — rather than forcing a large
  change through as a patch — is the proper response. The CHANGELOG entry should
  explicitly call out the audit session ID and the surfaces touched. See
  `team_doc-review-full_260522_001` for the canonical example (v12.6.0 → v12.7.0
  with 84 files patched / 233 drift hits resolved), and audit
  `team_plugin-prod-audit_260716_001` (A1-F1) for the guard fix that made the
  file-count cap patch-only.

### Enforcement

- `scripts/ci/cagents-ci.sh tiny-bump` runs the `check_tiny_bump` stage that
  validates CHANGELOG.md has an entry for the new version, the 16 registry
  locations agree, and — **for patch-level bumps only** — the non-sync diff is
  ≤5 files. A bump is classified patch-level iff the **major AND minor**
  components are unchanged between the old and new versions. **Minor** (x.Y+1.0)
  and **major** (X+1.0.0) bumps are **exempt** from the ≤5-file cap — audit /
  consolidation work legitimately lands as one large minor bump, and V11.0-scale
  removals as one large major bump — but both still require the CHANGELOG-entry
  and registry-agreement checks. (Before the A1-F1 fix the guard exempted only
  major bumps, so a large minor bump wrongly tripped the cap and made CI red at
  HEAD by default.)
- **Blocking**: the guard defaults to blocking (exit 6 on violation). Set
  `CAGENTS_TINY_BUMP_BLOCK=0` to opt back into warn-only mode for local
  experiments.
- Reviewers cite this section when a bump violates the atomicity criteria.

## Related

- `scripts/sync-versions.sh` -- Automated JSON version sync
- `.claude/rules/core/version-registry.md` -- This file (canonical registry)
- `CLAUDE.md` (Bug-Driven Testing section) -- regression test mandate
- `CHANGELOG.md` -- per-bump entries (landed in 10.26.1)

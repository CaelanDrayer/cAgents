---
paths:
  - ".claude/rules/core/version-registry.md"
  - "scripts/sync-versions.sh"
  - "scripts/ci/validate-versions.sh"
  - ".claude-plugin/plugin.json"
  - ".claude-plugin/marketplace.json"
  - "package.json"
  - "CHANGELOG.md"
  - "docs/RELEASE_NOTES.md"
  - "tests/rules/version-registry-structure.test.js"
  - "tests/regressions/version-registry-canonical.test.js"
  - "tests/v12/version-registry-no-org-slot.test.js"
---

# Version Registry

This file lists every location where the cAgents version number appears. Keep
all of these locations in sync on every release.

**Last verified**: v12.42.0. At that version, `scripts/ci/validate-versions.sh` reports `Checked 16/16 locations, 0 mismatches, 0 skipped`.

v12.2.0 removed slot #7, which held `.claude/skills/org/SKILL.md`. That removal
came when `/org` was removed and cross-domain coordination moved into the
`/team` strategic mode. Slots #8-#17 were then renumbered to #7-#16.

An earlier removal came in v12.1.2. It dropped the slot for
`.claude/skills/improve/SKILL.md`, when `/improve` was folded into `/act`. The
`/act` skill carried the name `/run` at that time, and the keyword router did
the fold.

## Version Locations (16 total)

See `docs/VERSION_REGISTRY_HISTORY.md` for V10.x history.

| # | File | Field/Line | Updated By |
|---|------|-----------|------------|
| 1 | `package.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 2 | `.claude-plugin/plugin.json` | `version` (line 3) | `scripts/sync-versions.sh` |
| 3 | `.claude-plugin/marketplace.json` | `version` (line 13) | `scripts/sync-versions.sh` |
| 4 | `CLAUDE.md` | Quick Reference section (`**Version**:`) | `scripts/sync-versions.sh` |
| 5 | `.claude/settings.json` | `CAGENTS_VERSION` + `$comment` | `scripts/sync-versions.sh` |
| 6 | `.claude/skills/act/SKILL.md` | frontmatter `version:` | `scripts/sync-versions.sh` |
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

Run `scripts/sync-versions.sh <version>` to update all 16 registry locations.
The script writes the new version into these files:

- the 3 JSON files
- `CLAUDE.md`
- `.claude/settings.json`
- the 4 SKILL.md frontmatters
- `session-catchup.cjs`
- `cagents-ci.sh`
- `validate-agents.sh`
- `README.md`
- `docs/README.md`
- `docs/RELEASE_NOTES.md`
- `CHANGELOG.md`

## Version Bump Procedure

1. Choose the increment. Use a patch for a bug fix, a minor for a feature, and
   a major for a breaking change.
2. Run `scripts/sync-versions.sh <new-version>`.
3. Do a check of the result with
   `grep -r '"version"' .claude-plugin/ package.json | grep -v node_modules`.

## Tiny-Bump Cadence

A "tiny bump" is a patch-level version increment (x.y.Z+1). It ships exactly
one coherent change. Tiny bumps are the preferred cadence for the development
of cAgents. Each increment is small. Each increment is easy to review. You can
revert each increment on its own.

Every tiny bump MUST satisfy all six atomicity criteria:

1. **One coherent change**: the bump addresses a single objective. One rule
   tweak, one guard promotion, and one catalog slot are each a single
   objective. If the change spans two or more independent objectives, split it
   into two bumps.
2. **CI-green**: `npm test` and `scripts/ci/cagents-ci.sh` both pass at HEAD
   before the bump is merged. No red CI, no "I'll fix it in the next bump."
3. **Commit-before-verify**: the commit lands first, then verification runs.
   If a hook or a test fails after the commit, use `git reset HEAD~1` to undo
   the commit. That command keeps your changes staged. Correct the problem,
   then make a new commit. Never amend the first commit.
4. **Back-compat**: the bump must not remove or rename a public-facing
   contract. A skill, an agent, a hook event, and a memory path are each a
   public-facing contract. A deprecation is allowed if it is documented and
   warn-only. A removal needs a minor bump or a major bump.
5. **`scripts/sync-versions.sh` run**: all 16 registry locations agree with
   the new version. `grep -r '"version"' .claude-plugin/ package.json` must
   show the new version in every match.
6. **Regression test per CLAUDE.md mandate**: the Bug-Driven Testing mandate in
   `CLAUDE.md` governs here. Every bump that fixes a bug ships a regression
   test. That test must fail before the fix, and it must pass after the fix. A
   feature bump or a rule bump ships a test that asserts the new behavior
   exists.

### When a bump is NOT a tiny bump

- A multi-file refactor can touch more than about 5 files outside the 16 sync
  locations. Make that refactor a minor bump (x.Y+1.0).
- A breaking change needs a major bump (X+1.0.0). A removed skill, a renamed
  agent, and an altered hook contract are each a breaking change.
- A revert of an earlier bump is still a tiny bump. Describe the revert in the
  CHANGELOG entry and in the commit message.
- **Audit / consolidation sessions** need a minor bump. These sessions touch
  dozens of files, or hundreds of files, across many surfaces. A documentation
  sweep plus a wiring sweep plus an agent-name sweep is one example.

The tiny-bump guard caps a bump at 5 non-sync files. That cap applies to
**patch** bumps only. A minor bump is therefore **exempt** from the file-count
check, and it lands green on `cagents-ci.sh`. A minor bump must still satisfy
the CHANGELOG-entry check and the registry-agreement check.

Bump to `x.Y+1.0` for an audit session. Do not force a large change through as
a patch. The CHANGELOG entry must name the audit session ID and the surfaces
that the session touched.

See `team_doc-review-full_260522_001` for the canonical example. That session
went from v12.6.0 to v12.7.0. It patched 84 files, and it resolved 233 drift
hits. Audit `team_plugin-prod-audit_260716_001` (A1-F1) holds the guard fix
that made the file-count cap patch-only.

### Enforcement

- `scripts/ci/cagents-ci.sh tiny-bump` runs the `check_tiny_bump` stage. That
  stage makes three checks. It checks that CHANGELOG.md holds an entry for the
  new version. It checks that the 16 registry locations agree. **For
  patch-level bumps only**, it checks that the non-sync diff is 5 files or
  fewer.
- A bump is patch-level if, and only if, two things hold between the old
  version and the new version. The **major** component is unchanged, and the
  **minor** component is unchanged.
- **Minor** bumps (x.Y+1.0) and **major** bumps (X+1.0.0) are **exempt** from
  the 5-file cap. Audit work and consolidation work legitimately land as one
  large minor bump. Removals at the scale of V11.0 land as one large major
  bump. Both kinds of bump still need the CHANGELOG-entry check and the
  registry-agreement check.
- Before the A1-F1 fix, the guard exempted major bumps only. A large minor bump
  therefore tripped the cap, and CI was red at HEAD by default.
- **Blocking**: the guard blocks by default, and it exits 6 on a violation. Set
  `CAGENTS_TINY_BUMP_BLOCK=0` to return to warn-only mode for local
  experiments.
- Reviewers cite this section when a bump breaks the atomicity criteria.

## Related

- `scripts/sync-versions.sh` -- Automated JSON version sync
- `.claude/rules/core/version-registry.md` -- This file (canonical registry)
- `CLAUDE.md` (Bug-Driven Testing section) -- regression test mandate
- `CHANGELOG.md` -- per-bump entries (landed in 10.26.1)

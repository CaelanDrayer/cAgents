/**
 * REC-21 (v12.52.0) regression test: retired dead scripts are gone AND
 * unreferenced by any live tooling.
 *
 * Retired in v12.52.0:
 *   - scripts/ci/check-quality.sh          (dead: walks _archive/, matches .js not
 *     .cjs, expects pre-v11 core/ paths, unwired from cagents-ci.sh)
 *   - scripts/validate-versions.sh         (root DUPLICATE; canonical is
 *     scripts/ci/validate-versions.sh, wired to `npm run validate:versions`)
 *   - scripts/migrate-v11.1.0.sh / -execute.sh / -rename.sh, scripts/migrate_agent.sh,
 *     scripts/verify-skill-migration.sh    (one-time v11.1.0-era migrators)
 *
 * Bug-driven testing mandate (CLAUDE.md): failing-before / passing-after — these
 * asserts fail on the pre-REC-21 tree (files present) and pass after removal.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const RETIRED = [
  'scripts/ci/check-quality.sh',
  'scripts/validate-versions.sh',
  'scripts/migrate-v11.1.0.sh',
  'scripts/migrate-v11.1.0-execute.sh',
  'scripts/migrate-v11.1.0-rename.sh',
  'scripts/migrate_agent.sh',
  'scripts/verify-skill-migration.sh',
];

// Live-tooling locations that would actually invoke or list these scripts as
// current tooling. Historical logs (CHANGELOG.md, docs/RELEASE_NOTES.md,
// docs/migration/*, docs/REMAINING_OPTIMIZATIONS.md) legitimately record the
// scripts as past work and are intentionally out of scope.
const LIVE_REFERENCE_FILES = [
  'package.json',
  'scripts/ci/cagents-ci.sh',
  '.claude/rules/README.md',
  '.claude/rules/core/hooks.md',
  'docs/testing/running-tests.md',
  'docs/migration/v9-to-v10.md',
];

describe('REC-21 retired dead scripts are gone', () => {
  for (const rel of RETIRED) {
    it(`${rel} does not exist`, () => {
      expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(false);
    });
  }

  it('the canonical scripts/ci/validate-versions.sh is KEPT', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'scripts/ci/validate-versions.sh'))).toBe(true);
  });
});

describe('REC-21 retired scripts are unreferenced by live tooling', () => {
  // Basenames of the retired scripts (the root validate-versions.sh shares a
  // basename with the canonical ci/ one, so match its ROOT PATH specifically).
  const DEAD_TOKENS = [
    'check-quality.sh',
    'migrate-v11.1.0',
    'migrate_agent.sh',
    'verify-skill-migration.sh',
  ];

  for (const rel of LIVE_REFERENCE_FILES) {
    it(`${rel} references no retired script`, () => {
      const p = path.join(REPO_ROOT, rel);
      if (!fs.existsSync(p)) return; // absent file trivially clean
      const content = fs.readFileSync(p, 'utf8');
      for (const tok of DEAD_TOKENS) {
        expect(content, `${rel} still references retired ${tok}`).not.toContain(tok);
      }
      // The root duplicate: only flag the ROOT path, not the canonical ci/ path.
      const rootDupRefs = content
        .split('\n')
        .filter((l) => /(^|[^/])scripts\/validate-versions\.sh/.test(l));
      expect(rootDupRefs, `${rel} still references the retired root scripts/validate-versions.sh`).toHaveLength(0);
    });
  }
});

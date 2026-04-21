/**
 * version-registry.md structure regression test (added in V10.26.2).
 *
 * Bug this catches: tiny-bump cadence criteria drift out of the rules file or
 * the registry location count drifts out of sync with sync-versions.sh.
 * Could have been caught by: doc structure unit test on version-registry.md.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REGISTRY_PATH = join(
  process.cwd(),
  '.claude',
  'rules',
  'core',
  'version-registry.md',
);

const content = readFileSync(REGISTRY_PATH, 'utf8');

describe('version-registry.md structure', () => {
  it('has a "Tiny-Bump Cadence" heading', () => {
    expect(content).toMatch(/^## Tiny-Bump Cadence/m);
  });

  // Six atomicity criteria per the cluster-1 spec
  const REQUIRED_CRITERIA = [
    'One coherent change',
    'CI-green',
    'Commit-before-verify',
    'Back-compat',
    'sync-versions.sh',
    'Regression test',
  ];

  for (const criterion of REQUIRED_CRITERIA) {
    it(`lists criterion: "${criterion}"`, () => {
      expect(content).toContain(criterion);
    });
  }

  it('mentions the 21-location sync count', () => {
    expect(content).toMatch(/21 (?:total|registry|locations|locations\.)/);
  });

  it('registry table contains 21 numbered rows', () => {
    // Matches table rows starting with | 1 | through | 21 |
    const rowNumbers = [...content.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) =>
      Number(m[1]),
    );
    const unique = new Set(rowNumbers);
    for (let i = 1; i <= 21; i++) {
      expect(unique.has(i)).toBe(true);
    }
  });

  it('references CLAUDE.md Bug-Driven Testing mandate', () => {
    expect(content).toMatch(/CLAUDE\.md/);
    expect(content.toLowerCase()).toContain('bug-driven testing');
  });

  it('references CHANGELOG.md as the per-bump landing zone', () => {
    expect(content).toContain('CHANGELOG.md');
  });
});

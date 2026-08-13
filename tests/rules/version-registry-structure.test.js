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

  it('registry table contains all numbered rows (v12.2.0+: 16 locations)', () => {
    // V11.0 shrunk the registry from 21 to 17 (removed 4 SKILL.md entries for
    // context/debug/review/optimize, kept CHANGELOG). v12.1.2 then folded
    // /improve into /act, and v12.2.0 removed the /org SKILL.md slot when /org
    // was folded into /team strategic mode — leaving 16 canonical locations.
    const rowNumbers = [...content.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((m) =>
      Number(m[1]),
    );
    const unique = new Set(rowNumbers);
    for (let i = 1; i <= 16; i++) {
      expect(unique.has(i)).toBe(true);
    }
    // And no stale row 17 (would signal the registry drifted back up).
    expect(unique.has(17)).toBe(false);
  });

  it('references CLAUDE.md Bug-Driven Testing mandate', () => {
    expect(content).toMatch(/CLAUDE\.md/);
    expect(content.toLowerCase()).toContain('bug-driven testing');
  });

  it('references CHANGELOG.md as the per-bump landing zone', () => {
    expect(content).toContain('CHANGELOG.md');
  });
});

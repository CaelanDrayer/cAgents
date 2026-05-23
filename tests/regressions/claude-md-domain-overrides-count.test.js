import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.4 CLAUDE.md domain-overrides clarification,
 * updated in v12.0.0 (WI-W4.2) after the 11 legacy domain dirs were deleted.
 *
 * Original V11.2.4 bug: validate-agents.sh reported "All
 * domain_overrides.yaml agent references valid (15 files checked)" but
 * CLAUDE.md said "13 legacy domain dirs". The delta of +2 was the two
 * archetype roots (core/ and leadership/) that also ship
 * domain_overrides.yaml.
 *
 * v12 update (W4.2): the 11 legacy domain dirs slated for deletion in
 * revamp-design-v2.md § 6a were consolidated into
 * cagents-memory/_system/config/routing.yaml. Only 2 legacy dirs survive
 * (people/, shared/). validate-agents.sh now sees 4 domain_overrides.yaml
 * files: 2 legacy (people, shared) + 2 archetype-root (core, leadership).
 *
 * Test added: tests/regressions/claude-md-domain-overrides-count.test.js
 * Could have caught by: domain-config doc audit. Now codified.
 */

const ROOT = process.cwd();

function dirHasDomainOverrides(d) {
  // v12.8.0: people/shared live under agents/_overlay/, core/leadership under agents/
  return (
    existsSync(join(ROOT, 'agents', '_overlay', d, 'config/domain_overrides.yaml')) ||
    existsSync(join(ROOT, 'agents', d, 'config/domain_overrides.yaml')) ||
    existsSync(join(ROOT, d, 'config/domain_overrides.yaml'))
  );
}

// v12.0.0: only 2 legacy domain dirs retained (W4.2). The other 11 were
// consolidated into cagents-memory/_system/config/routing.yaml.
const LEGACY_DOMAINS_RETAINED = ['people', 'shared'];

const ARCHETYPE_ROOTS_WITH_OVERRIDES = ['core', 'leadership'];

// v12.0.0: 11 legacy domain dirs that MUST be deleted (W4.2).
const LEGACY_DOMAINS_DELETED = [
  'engineering', 'creative', 'business', 'growth', 'service',
  'science', 'health', 'education', 'personal', 'arts', 'trades',
];

describe('CLAUDE.md domain_overrides count is precise (v12.0.0)', () => {
  it('both retained legacy domain dirs (people, shared) have domain_overrides.yaml', () => {
    const missing = LEGACY_DOMAINS_RETAINED.filter((d) => !dirHasDomainOverrides(d));
    expect(missing, `retained legacy domains missing domain_overrides.yaml: ${missing.join(', ')}`).toEqual([]);
  });

  it('core and leadership archetype roots also have domain_overrides.yaml', () => {
    const missing = ARCHETYPE_ROOTS_WITH_OVERRIDES.filter((d) => !dirHasDomainOverrides(d));
    expect(missing, `archetype roots missing domain_overrides.yaml: ${missing.join(', ')}`).toEqual([]);
  });

  it('the 11 deleted legacy dirs no longer exist on disk', () => {
    const stillPresent = LEGACY_DOMAINS_DELETED.filter((d) => existsSync(join(ROOT, d)));
    expect(
      stillPresent,
      `v12 W4.2 expected these dirs deleted (consolidated into _system/config/routing.yaml): ${stillPresent.join(', ')}`,
    ).toEqual([]);
  });

  it('consolidated routing.yaml exists and covers all 11 deleted domains', () => {
    const routingPath = join(ROOT, 'cagents-memory/_system/config/routing.yaml');
    expect(existsSync(routingPath), 'consolidated routing.yaml must exist at cagents-memory/_system/config/routing.yaml').toBe(true);
    const content = readFileSync(routingPath, 'utf8');
    for (const d of LEGACY_DOMAINS_DELETED) {
      expect(content, `routing.yaml must contain a "${d}:" section`).toMatch(new RegExp(`^\\s{2}${d}:`, 'm'));
    }
  });

  it('CLAUDE.md mentions the 2 retained legacy dirs and the consolidation', () => {
    const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    // Must mention that people/ and shared/ are retained; CLAUDE.md prose
    // should explicitly call out the W4.2 consolidation outcome.
    expect(claudeMd, 'CLAUDE.md should mention "people" and "shared" retained').toMatch(/people.*shared|shared.*people/);
    expect(claudeMd, 'CLAUDE.md should reference routing.yaml or the v12 consolidation').toMatch(/routing\.yaml|consolidat/i);
  });
});

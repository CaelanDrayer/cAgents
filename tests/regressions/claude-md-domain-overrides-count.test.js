import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.4 CLAUDE.md domain-overrides clarification.
 *
 * Bug: validate-agents.sh reports "All domain_overrides.yaml agent references
 * valid (15 files checked)" but CLAUDE.md states "13 legacy domain dirs". The
 * delta of +2 isn't drift — it's that two archetype roots (`core/` and
 * `leadership/`) ALSO have domain_overrides.yaml files in addition to the 13
 * legacy domain dirs. Without explanation, future readers see 15 ≠ 13 and
 * either assume drift or "fix" something that isn't broken.
 *
 * Test added: tests/regressions/claude-md-domain-overrides-count.test.js —
 * asserts CLAUDE.md mentions both the 13 legacy count AND a clarification that
 * core/ and leadership/ archetype roots also ship domain_overrides.yaml,
 * bringing the validate-agents.sh count to 15.
 *
 * Could have caught by: domain-config doc audit. Now codified.
 */

const ROOT = process.cwd();

function dirHasDomainOverrides(d) {
  return existsSync(join(ROOT, d, 'config/domain_overrides.yaml'));
}

const LEGACY_DOMAINS = [
  'engineering', 'creative', 'business', 'growth', 'people', 'service',
  'shared', 'science', 'health', 'education', 'personal', 'arts', 'trades',
];

const ARCHETYPE_ROOTS_WITH_OVERRIDES = ['core', 'leadership'];

describe('CLAUDE.md domain_overrides count is precise', () => {
  it('all 13 legacy domain dirs have domain_overrides.yaml', () => {
    const missing = LEGACY_DOMAINS.filter((d) => !dirHasDomainOverrides(d));
    expect(missing, `legacy domains missing domain_overrides.yaml: ${missing.join(', ')}`).toEqual([]);
  });

  it('core and leadership archetype roots also have domain_overrides.yaml', () => {
    const missing = ARCHETYPE_ROOTS_WITH_OVERRIDES.filter((d) => !dirHasDomainOverrides(d));
    expect(missing, `archetype roots missing domain_overrides.yaml: ${missing.join(', ')}`).toEqual([]);
  });

  it('CLAUDE.md mentions both the 13 legacy and the 2 archetype-root configs', () => {
    const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
    expect(claudeMd, 'CLAUDE.md should mention "13 legacy"').toContain('13 legacy');
    // Must explicitly clarify the 15-file count from validate-agents.sh by naming
    // core/ and leadership/ as the two archetype roots that also ship domain_overrides.yaml.
    // Look for a co-located mention: a paragraph that ties "15" to "core" AND "leadership".
    const lines = claudeMd.split('\n');
    let foundClarification = false;
    for (let i = 0; i < lines.length; i++) {
      // Window of 5 consecutive lines
      const window = lines.slice(i, i + 5).join(' ');
      if (window.includes('15') && window.includes('core') && window.includes('leadership') && window.includes('domain_overrides')) {
        foundClarification = true;
        break;
      }
    }
    expect(
      foundClarification,
      'CLAUDE.md should clarify that validate-agents.sh sees 15 domain_overrides.yaml files because core/ and leadership/ archetype roots also ship one (in a single co-located passage)',
    ).toBe(true);
  });
});

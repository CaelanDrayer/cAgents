import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

describe('REC-3: MODE_REGISTRY.md coverage', () => {
  const root = process.cwd();
  const registryPath = join(root, '.claude/skills/_MODE_REGISTRY.md');
  const registry = existsSync(registryPath) ? readFileSync(registryPath, 'utf8') : '';

  it('exists', () => {
    expect(existsSync(registryPath)).toBe(true);
  });

  // v12.1.2: /improve folded into /run via keyword router. The /improve modes
  // (review/optimize/full) and flags (--baseline/--suppress/--benchmark) are
  // now under /run. The /improve section is preserved as a REMOVED marker
  // (so the section header regex still matches) but the flags are checked
  // under /run.
  it.each([
    ['/run', ['--mode debug', '--mode review', '--mode optimize', '--mode full', '--team', '--analytics', '--resume', '--dry-run', '--baseline', '--suppress', '--benchmark']],
    ['/team', ['--dry-run', '--members', '--teammate-mode', '--waves', '--template', '--no-template']],
    ['/org', ['--dry-run', '--quick', '--domains', '--resume']],
    ['/improve', ['REMOVED']],
    ['/helper', ['--troubleshoot']],
  ])('section for %s lists all expected flags', (section, flags) => {
    const sectionRegex = new RegExp(`## ${section.replace('/', '\\/')}`);
    expect(registry).toMatch(sectionRegex);
    for (const f of flags) {
      expect(registry, `${section} should mention ${f}`).toContain(f);
    }
  });
});

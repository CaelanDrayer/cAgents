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

  it.each([
    ['/run', ['--mode debug', '--team', '--analytics', '--resume', '--dry-run']],
    ['/team', ['--dry-run', '--members', '--teammate-mode', '--waves', '--template', '--no-template']],
    ['/org', ['--dry-run', '--quick', '--domains', '--resume']],
    ['/improve', ['--mode review', '--mode optimize', '--mode full', '--baseline', '--suppress', '--benchmark']],
    ['/helper', ['--troubleshoot']],
  ])('section for %s lists all expected flags', (section, flags) => {
    const sectionRegex = new RegExp(`## ${section.replace('/', '\\/')}`);
    expect(registry).toMatch(sectionRegex);
    for (const f of flags) {
      expect(registry, `${section} should mention ${f}`).toContain(f);
    }
  });
});

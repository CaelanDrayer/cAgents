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

  // v12.1.2: /improve folded into /act via keyword router. The /improve modes
  // (review/optimize/full) and flags (--baseline/--suppress/--benchmark) are
  // now under /act. The /improve section is preserved as a REMOVED marker
  // (so the section header regex still matches) but the flags are checked
  // under /act. (`/run` was renamed to `/act` — it collided with Claude
  // Code's built-in `run` skill.)
  // v12.2.0: /org absorbed into /team strategic mode. The /org section is
  // preserved as a REMOVED marker pointing at /team strategic mode for
  // migration. /team gains --strategic and --no-strategic flags.
  it.each([
    ['/act', ['--mode debug', '--mode review', '--mode optimize', '--mode full', '--team', '--analytics', '--resume', '--dry-run', '--baseline', '--suppress', '--benchmark']],
    ['/team', ['--dry-run', '--members', '--teammate-mode', '--waves', '--template', '--no-template', '--strategic', '--no-strategic']],
    ['/org', ['REMOVED']],
    ['/improve', ['REMOVED']],
    ['/helper', ['--troubleshoot']],
  ])('section for %s lists all expected flags', (section, flags) => {
    const sectionRegex = new RegExp(`## ${section.replace('/', '\\/')}`);
    expect(registry).toMatch(sectionRegex);
    for (const f of flags) {
      expect(registry, `${section} should mention ${f}`).toContain(f);
    }
  });

  // WI-4 (run_improve-skills-hooks_260703_001): the registry's § /designer phase
  // table must match the canonical 6-phase workflow defined in
  // .claude/skills/designer/SKILL.md § 6-Phase Workflow (Empathize, Define,
  // Conceptualize, Ideation, Refinement, Specification). The registry previously
  // listed a stale 4-phase table (Discovery/Architecture/Validation/Synthesis)
  // that never matched the designer skill.
  it('section for /designer lists the canonical 6 phases', () => {
    const start = registry.indexOf('## /designer');
    expect(start, 'registry should contain a ## /designer section').toBeGreaterThan(-1);
    const rest = registry.slice(start + '## /designer'.length);
    const nextHeading = rest.search(/\n## /);
    const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
    const phases = ['Empathize', 'Define', 'Conceptualize', 'Ideation', 'Refinement', 'Specification'];
    for (const phase of phases) {
      expect(section, `/designer section should list phase ${phase}`).toContain(phase);
    }
  });
});

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FIXTURE_DIR = join(ROOT, 'agents', '_deprecated', '__test_deprecated_agent__');
const FIXTURE_SKILL = join(FIXTURE_DIR, 'SKILL.md');

/**
 * REC-5: agents parked under `_deprecated/` are kept on disk for alias
 * resolution only and must never enter the live catalog.
 *
 * v12.68.0: the catalog is the flat agents/ directory, which Claude Code scans
 * NON-RECURSIVELY — so a `_deprecated/` agent is structurally undiscoverable.
 * What still needs pinning is that the repo's own tooling agrees: the flat
 * catalog excludes it, and validate-agents.sh's nested-layout guard does not
 * mistake a deliberately-deprecated agent for a mis-filed live one.
 */
describe('REC-5: _deprecated/ bucket excluded from the live catalog', () => {
  beforeAll(() => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(
      FIXTURE_SKILL,
      `---\nname: __test_deprecated_agent__\narchetype: operator\nbranch: _deprecated\ndescription: "test fixture"\nmetadata:\n  tier: support\n---\n# Test fixture\n`
    );
  });

  afterAll(() => {
    try { rmSync(join(ROOT, 'agents', '_deprecated'), { recursive: true, force: true }); } catch {}
  });

  it('the flat agents/ catalog does not include the _deprecated/ fixture', () => {
    const flat = readdirSync(join(ROOT, 'agents'), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.slice(0, -'.md'.length));
    expect(flat).not.toContain('__test_deprecated_agent__');
  });

  it('validate-agents.sh does not flag the _deprecated/ fixture as a mis-filed agent', () => {
    let stdout = '';
    let exitCode = 0;
    try {
      stdout = execSync('bash scripts/ci/validate-agents.sh', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      exitCode = err.status ?? 1;
      stdout = err.stdout?.toString() || '';
    }
    expect(stdout).not.toMatch(/_deprecated/);
    expect(exitCode, 'validate-agents.sh must stay green with a _deprecated/ agent on disk').toBe(0);
    // Confirm the script actually ran rather than failing silently.
    expect(stdout).toMatch(/AGENT VALIDATION SUMMARY/);
  });

  it('_deprecated/ SKILL.md file still exists on disk (checks are read-only)', () => {
    expect(existsSync(FIXTURE_SKILL)).toBe(true);
  });
});

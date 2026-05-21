import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FIXTURE_DIR = join(ROOT, 'operator', '_deprecated', '__test_deprecated_agent__');
const FIXTURE_SKILL = join(FIXTURE_DIR, 'SKILL.md');
const PLUGIN_JSON = join(ROOT, '.claude-plugin', 'plugin.json');

// Uses sync-agents.sh --check (non-mutating dry-run) to verify the exclusion
// logic. This avoids racing with sibling tests (e.g.
// tests/regression/sync-agents-check.test.js) that snapshot plugin.json mtime
// and would fail if this test mutated the file in parallel.

describe('REC-5: _deprecated/ bucket excluded from plugin.json', () => {
  beforeAll(() => {
    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(
      FIXTURE_SKILL,
      `---\nname: __test_deprecated_agent__\narchetype: operator\nbranch: _deprecated\ndescription: "test fixture"\nmetadata:\n  tier: support\n---\n# Test fixture\n`
    );
  });

  afterAll(() => {
    try { rmSync(join(ROOT, 'operator', '_deprecated'), { recursive: true, force: true }); } catch {}
  });

  it('sync-agents.sh does not enumerate _deprecated/ fixture as an agent', () => {
    // Property under test: the fixture path under operator/_deprecated/ must
    // NOT appear in the script's agent enumeration. We run --check (read-only)
    // and inspect its output. The test is robust to concurrent runs that may
    // have plugin.json in a temporarily-drifted state (e.g.
    // tests/regression/sync-agents-check.test.js intentionally injects drift),
    // because we assert specifically that the _deprecated/ path is absent
    // from the script's reasoning, regardless of overall In sync / DRIFT
    // state.
    let stdout = '';
    try {
      stdout = execSync('bash scripts/sync-agents.sh --check', {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      // Non-zero exit is fine here — could be unrelated DRIFT from a
      // concurrent test. We still inspect stdout for the _deprecated/ marker.
      stdout = err.stdout?.toString() || '';
    }
    // The fixture path must NEVER appear in the script's output. If the
    // exclusion logic regressed, --check would list
    // operator/_deprecated/__test_deprecated_agent__/SKILL.md under
    // "Found in tree but missing from plugin.json".
    expect(stdout).not.toMatch(/_deprecated/);
    // Also confirm script ran (not a silent failure)
    expect(stdout).toMatch(/agents/);
  });

  it('_deprecated/ SKILL.md file still exists on disk after --check (read-only verified)', () => {
    expect(existsSync(FIXTURE_SKILL)).toBe(true);
  });
});

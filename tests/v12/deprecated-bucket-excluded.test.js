import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, writeFileSync, rmSync, existsSync, readdirSync, cpSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Read-only source tree. Every write goes to TMP_ROOT, never under REPO_ROOT.
const REPO_ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'ci', 'validate-agents.sh');

let TMP_ROOT = '';
let FIXTURE_SKILL = '';

function cleanup() {
  if (TMP_ROOT) {
    try { rmSync(TMP_ROOT, { recursive: true, force: true }); } catch {}
  }
}

/**
 * REC-5: agents parked under `_deprecated/` are kept on disk for alias
 * resolution only and must never enter the live catalog.
 *
 * v12.68.0: the catalog is the flat agents/*.md set. Claude Code scans agents/
 * recursively, but plugin.json `agents` lists only the top-level files, so a
 * `_deprecated/` agent never registers.
 * What still needs pinning is that the repo's own tooling agrees: the flat
 * catalog excludes it, and validate-agents.sh's nested-layout guard does not
 * mistake a deliberately-deprecated agent for a mis-filed live one.
 *
 * v12.78.0: the fixture lives in a mkdtemp copy of only the paths
 * validate-agents.sh reads (agents/, .claude-plugin/, .claude/settings.json,
 * .claude/hooks.json, top-level .claude/hooks/*.cjs). The script is pointed at
 * it with CAGENTS_PROJECT_ROOT, so the live agents/ tree is never written.
 */
describe('REC-5: _deprecated/ bucket excluded from the live catalog', () => {
  beforeAll(() => {
    TMP_ROOT = mkdtempSync(join(tmpdir(), 'cagents-deprecated-bucket-'));
    try {
      // Skip any agents/_deprecated in the source tree. A concurrent run of an
      // older copy of this test can write it to the live repo at any time.
      cpSync(join(REPO_ROOT, 'agents'), join(TMP_ROOT, 'agents'), {
        recursive: true,
        filter: (src) => !src.startsWith(join(REPO_ROOT, 'agents', '_deprecated')),
      });
      cpSync(join(REPO_ROOT, '.claude-plugin'), join(TMP_ROOT, '.claude-plugin'), { recursive: true });
      mkdirSync(join(TMP_ROOT, '.claude', 'hooks'), { recursive: true });
      for (const f of ['settings.json', 'hooks.json']) {
        const src = join(REPO_ROOT, '.claude', f);
        if (existsSync(src)) cpSync(src, join(TMP_ROOT, '.claude', f));
      }
      for (const f of readdirSync(join(REPO_ROOT, '.claude', 'hooks'))) {
        if (f.endsWith('.cjs')) {
          cpSync(join(REPO_ROOT, '.claude', 'hooks', f), join(TMP_ROOT, '.claude', 'hooks', f));
        }
      }
      const fixtureDir = join(TMP_ROOT, 'agents', '_deprecated', '__test_deprecated_agent__');
      FIXTURE_SKILL = join(fixtureDir, 'SKILL.md');
      mkdirSync(fixtureDir, { recursive: true });
      writeFileSync(
        FIXTURE_SKILL,
        `---\nname: __test_deprecated_agent__\narchetype: operator\nbranch: _deprecated\ndescription: "test fixture"\nmetadata:\n  tier: support\n---\n# Test fixture\n`
      );
    } catch (err) {
      cleanup();
      throw err;
    }
  });

  afterAll(cleanup);

  it('the flat agents/ catalog does not include the _deprecated/ fixture', () => {
    const flat = readdirSync(join(TMP_ROOT, 'agents'), { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name.slice(0, -'.md'.length));
    expect(flat).not.toContain('__test_deprecated_agent__');
  });

  it('validate-agents.sh does not flag the _deprecated/ fixture as a mis-filed agent', () => {
    let stdout = '';
    let exitCode = 0;
    try {
      stdout = execFileSync('bash', [SCRIPT], {
        cwd: TMP_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 60000,
        env: { ...process.env, CAGENTS_PROJECT_ROOT: TMP_ROOT, CAGENTS_CI_QUIET: '0' },
      });
    } catch (err) {
      exitCode = err.status ?? 1;
      stdout = `${err.stdout?.toString() || ''}${err.stderr?.toString() || ''}`;
    }
    expect(stdout).not.toMatch(/_deprecated/);
    // Keep the FAIL and ERROR lines in the message, so that a red run explains itself.
    const failLines = stdout.split('\n').filter((l) => /FAIL|ERROR|rror/.test(l)).slice(0, 10).join('\n');
    expect(exitCode, `validate-agents.sh must stay green with a _deprecated/ agent on disk\n${failLines}`).toBe(0);
    // Confirm the script actually ran against the temp root rather than failing silently.
    expect(stdout).toMatch(/AGENT VALIDATION SUMMARY/);
    expect(stdout).toMatch(/Total agents: 60/);
  }, 70000);

  it('_deprecated/ SKILL.md file still exists in the temp root (checks are read-only)', () => {
    expect(existsSync(FIXTURE_SKILL)).toBe(true);
  });
});

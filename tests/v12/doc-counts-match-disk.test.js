/**
 * P1-5 regression: counts in docs MUST match what disk provides.
 *
 * The cAgents repo has 16+ documentation files claiming various counts:
 *   - 141 active agents across 9 archetypes
 *   - 26/36/12/19/5/8/8/15/12 per-archetype counts
 *   - 31 hook .cjs files
 *   - 28 unique registered hooks
 *   - 18 hook event types covered
 *   - 17 version-registry slots
 *
 * Historically, these counts drift: a single docs PR misses one location, and
 * "31 hooks" becomes a lie. The v12.6.0 audit found 233 drift hits across 84
 * files.
 *
 * Bug-driven testing mandate: this test would have caught
 *   (a) docs/agents/index.md "People (17 agents)" being stale (legacy 17-domain
 *       layout was retired; people/ is now config-only)
 *   (b) any future per-archetype count drift after an agent rename/cull
 *   (c) settings.json $comment claiming wrong hook count
 *
 * Could have caught by: unit test wrapping scripts/ci/validate-counts.sh.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

const REPO_ROOT = process.cwd();
const SCRIPT = join(REPO_ROOT, 'scripts', 'ci', 'validate-counts.sh');

describe('P1-5: validate-counts.sh enforces doc-vs-disk alignment', () => {
  it('the script exists and is executable', () => {
    expect(existsSync(SCRIPT),
      `Expected ${SCRIPT} to exist`).toBe(true);
    const stat = require('fs').statSync(SCRIPT);
    expect((stat.mode & 0o111) !== 0,
      `Expected ${SCRIPT} to be executable`).toBe(true);
  });

  it('exits 0 on a clean tree (current doc counts match disk)', () => {
    let exitCode = 0;
    try {
      execSync(`bash ${SCRIPT}`, { cwd: REPO_ROOT, stdio: 'pipe' });
    } catch (err) {
      exitCode = err.status;
      // Print stderr/stdout for debugging on failure
      console.error('validate-counts.sh stdout:', err.stdout?.toString());
      console.error('validate-counts.sh stderr:', err.stderr?.toString());
    }
    expect(exitCode, 'validate-counts.sh exit code on clean tree').toBe(0);
  });

  it('exits 1 when a documented count is deliberately edited to a wrong value', () => {
    // WI-1 (v12.12.1): Race-free implementation. Previously this test mutated
    // the real CLAUDE.md in place, which raced against three sibling tests
    // that read CLAUDE.md concurrently under vitest's file-fork parallelism:
    //   - tests/regressions/claude-md-counts-current.test.js
    //   - tests/regressions/claude-md-domain-overrides-count.test.js
    //   - tests/regressions/claude-md-no-stale-version-highlights.test.js
    // Under load (full `npm test`), those readers could observe the mutated
    // "999 agents" content and fail. The race was intermittent, hence the
    // initial misdiagnosis in team_plugin-sanity-pass_260601_001.
    //
    // The fix: copy CLAUDE.md to a temp dir, mutate ONLY the temp copy, and
    // point the script's Check 1 at the temp file via the new
    // CAGENTS_VALIDATE_COUNTS_CLAUDE_MD env-var override. The real CLAUDE.md
    // is never touched, eliminating the race entirely.
    const claudeMd = join(REPO_ROOT, 'CLAUDE.md');
    const original = readFileSync(claudeMd, 'utf8');
    // Find "141 agents" claim and replace ALL occurrences with bogus 999.
    const mutated = original.replace(/\b141 agents\b/g, '999 agents');
    expect(mutated).not.toBe(original); // must have actually mutated

    const tmpDir = mkdtempSync(join(tmpdir(), 'doc-counts-test-'));
    const tmpClaudeMd = join(tmpDir, 'CLAUDE.md');
    writeFileSync(tmpClaudeMd, mutated);

    let exitCode = 0;
    let output = '';
    try {
      execSync(`bash ${SCRIPT}`, {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        env: {
          ...process.env,
          CAGENTS_VALIDATE_COUNTS_CLAUDE_MD: tmpClaudeMd,
        },
      });
    } catch (err) {
      exitCode = err.status;
      output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    } finally {
      // Best-effort cleanup of temp dir
      try { unlinkSync(tmpClaudeMd); } catch {}
      try { require('fs').rmdirSync(tmpDir); } catch {}
    }

    expect(exitCode, 'validate-counts.sh exit code on mutated CLAUDE.md').toBe(1);
    expect(output, 'mismatch output should mention CLAUDE.md or the count').toMatch(
      /CLAUDE\.md|141|999|agent/i
    );
  });

  it('derives counts from disk (script reports active agent count from plugin.json)', () => {
    const output = execSync(`bash ${SCRIPT} --derive-only`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    // The --derive-only mode should print derived counts and exit 0 without
    // doing comparison.
    expect(output, 'derive-only should print active_agents=141').toMatch(
      /active_agents[=:]\s*141/
    );
    // v12.19.0 WI-5 / D1b: write-edit-dispatch.cjs is the 32nd .cjs file; the 3
    // former standalone Write|Edit hooks became dispatched sub-validators, so the
    // unique-registered count dropped to 26.
    expect(output, 'derive-only should print hook_files=32').toMatch(
      /hook_files[=:]\s*32/
    );
    expect(output, 'derive-only should print registered_hooks=26').toMatch(
      /registered_hooks[=:]\s*26/
    );
  });
});

/**
 * P1-5 regression: counts in docs MUST match what disk provides.
 *
 * The cAgents repo has 16+ documentation files claiming various counts:
 *   - 141 active agents across 9 archetypes
 *   - 26/36/12/19/5/8/8/15/12 per-archetype counts
 *   - 32 hook .cjs files
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
import { existsSync, copyFileSync, readFileSync, writeFileSync, unlinkSync, mkdtempSync, cpSync, rmSync, appendFileSync } from 'fs';
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
    // Find "60 agents" claim and replace ALL occurrences with bogus 999.
    const mutated = original.replace(/\b60 agents\b/g, '999 agents');
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
      /CLAUDE\.md|57|999|agent/i
    );
  });

  it('Check 12: flags a STALE CURRENT agent total in a docs/ live section, but not historical mentions', () => {
    // T4 (action-report): Check 12 is a docs/ live-section absence check that
    // generalizes the Check 2b README pattern. It must catch a stale current
    // total ("144 agents across 9 ...") while leaving legitimate historical
    // mentions ("consolidation from 144", "240 -> 144 agents") untouched.
    //
    // Race-free like the CLAUDE.md mutation test: copy docs/ to a temp dir,
    // mutate ONLY the copy, and point Check 12 at it via the new
    // CAGENTS_VALIDATE_COUNTS_DOCS_DIR override. The real docs/ is never touched.
    const tmpDir = mkdtempSync(join(tmpdir(), 'doc-counts-check12-'));
    const tmpDocs = join(tmpDir, 'docs');
    cpSync(join(REPO_ROOT, 'docs'), tmpDocs, { recursive: true });

    // Inject a STALE CURRENT phrasing (should be flagged) and a HISTORICAL
    // phrasing (must NOT be flagged) into a live doc file.
    const target = join(tmpDocs, 'GETTING_STARTED.md');
    appendFileSync(
      target,
      '\n\nThe system ships 144 agents across 9 builder-role archetypes today.\n' +
        'Historical: consolidation from 144 agents; 240 -> 144 agents in v12.4.0; was 144 post-v12.4.0.\n'
    );

    let exitCode = 0;
    let output = '';
    try {
      execSync(`bash ${SCRIPT}`, {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        env: { ...process.env, CAGENTS_VALIDATE_COUNTS_DOCS_DIR: tmpDocs },
      });
    } catch (err) {
      exitCode = err.status;
      output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }

    expect(exitCode, 'Check 12 should FAIL (exit 1) on stale current total').toBe(1);
    expect(output, 'mismatch output should cite the stale 144 current-total phrase').toMatch(
      /144 .*agents across 9|current-total absence check/i
    );
    // The historical-only phrasings must not themselves be reported: the single
    // flagged phrase is the "144 agents across 9" current-total. ("from 144",
    // "240 -> 144 agents", "was 144" never match the current-total anchors.)
    const flaggedLines = output.split('\n').filter((l) => /MISMATCH:.*current-total absence check/.test(l));
    expect(flaggedLines.length, 'exactly one current-total mismatch flagged').toBe(1);
  });

  it('exits 0 with the docs-dir override pointed at the real (clean) docs/', () => {
    // Sanity: the override path itself does not introduce a regression when the
    // scanned docs/ is the clean tree.
    let exitCode = 0;
    try {
      execSync(`bash ${SCRIPT}`, {
        cwd: REPO_ROOT,
        stdio: 'pipe',
        env: { ...process.env, CAGENTS_VALIDATE_COUNTS_DOCS_DIR: join(REPO_ROOT, 'docs') },
      });
    } catch (err) {
      exitCode = err.status;
      console.error('validate-counts.sh stderr:', err.stderr?.toString());
    }
    expect(exitCode, 'clean docs/ via override should still exit 0').toBe(0);
  });

  it('derives counts from disk (script reports active agent count from plugin.json)', () => {
    const output = execSync(`bash ${SCRIPT} --derive-only`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    // The --derive-only mode should print derived counts and exit 0 without
    // doing comparison.
    expect(output, 'derive-only should print active_agents=60').toMatch(
      /active_agents[=:]\s*60/
    );
    // A2-12: agent-dispatch.cjs consolidated the PreToolUse[Agent] hooks
    // (session-init-gate + model-routing-advisor) into one dispatcher; approval-gate.cjs
    // was deleted (A2-02) and eval-runner.cjs relocated to scripts/ (A2-10).
    // v12.34.0 added bash-guard-evaluator.cjs, a pure require'd library (3rd utility).
    // WO-03 surface (d) added role-manifest-injector.cjs (SubagentStart role-bundle
    // injection — the restoration half of the rules load cut). Net:
    // 34 .cjs files = 26 unique registered + 5 dispatched sub-validators + 3 utilities
    // (hook-utils.cjs, run-hook.cjs, bash-guard-evaluator.cjs).
    expect(output, 'derive-only should print hook_files=34').toMatch(
      /hook_files[=:]\s*34/
    );
    expect(output, 'derive-only should print registered_hooks=26').toMatch(
      /registered_hooks[=:]\s*26/
    );
  });
});

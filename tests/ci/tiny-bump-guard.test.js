/**
 * Tiny-bump CI guard regression test (added in V10.26.3).
 *
 * Bug this catches: check_tiny_bump silently accepting a bump that lacks a
 * CHANGELOG entry, has registry drift, or ignores the warn/block env toggle.
 * Could have been caught by: unit test on scripts/ci/cagents-ci.sh guard.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { join } from 'path';

const ROOT = process.cwd();
const CI_SCRIPT = join(ROOT, 'scripts', 'ci', 'cagents-ci.sh');

function runGuard(env = {}) {
  const mergedEnv = { ...process.env, ...env };
  try {
    const stdout = execSync(`bash "${CI_SCRIPT}" tiny-bump`, {
      env: mergedEnv,
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

describe('tiny-bump CI guard', () => {
  // Case A: no version change (OLD == NEW) — skip path.
  it('skips with no-op when OLD == NEW', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: '10.26.2',
      CAGENTS_TINY_BUMP_OLD: '10.26.2',
    });
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/no version change/);
  });

  // Case B: compliant bump (current repo HEAD is V10.26.2, CHANGELOG has it).
  it('passes compliant bump from prior version', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: '10.26.2',
      CAGENTS_TINY_BUMP_OLD: '10.26.1',
    });
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/CHANGELOG entry for \[10\.26\.2\] present/);
    expect(res.stdout).toMatch(/all criteria satisfied|criteria/);
  });

  // Case C: missing CHANGELOG entry produces a warning in warn-only mode.
  it('warns on missing CHANGELOG entry in warn-only mode (exit 0)', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: '99.99.99',
      CAGENTS_TINY_BUMP_OLD: '10.26.1',
      CAGENTS_TINY_BUMP_BLOCK: '0',
    });
    // Warn-only: guard must not fail the overall CI run.
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/CHANGELOG\.md has no entry for \[99\.99\.99\]/);
    expect(res.stdout).toMatch(/warn-only/);
  });

  // Case D: missing CHANGELOG entry blocks in block mode.
  it('blocks on missing CHANGELOG entry when CAGENTS_TINY_BUMP_BLOCK=1', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: '99.99.99',
      CAGENTS_TINY_BUMP_OLD: '10.26.1',
      CAGENTS_TINY_BUMP_BLOCK: '1',
    });
    expect(res.code).not.toBe(0);
    expect(res.stdout).toMatch(/CHANGELOG\.md has no entry for \[99\.99\.99\]/);
    expect(res.stdout).toMatch(/blocking/);
  });

  // Case E: registry drift (fake version not in package.json) is detected.
  it('detects registry drift (fake new version absent from registry files)', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: '42.0.0',
      CAGENTS_TINY_BUMP_OLD: '10.26.1',
      CAGENTS_TINY_BUMP_BLOCK: '1',
    });
    expect(res.code).not.toBe(0);
    // At least one registry file should fail to report the fake version.
    expect(res.stdout).toMatch(/does not report version 42\.0\.0/);
  });
});

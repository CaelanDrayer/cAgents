/**
 * Regression: tiny-bump guard file-count cap is PATCH-only (audit A1-F1).
 *
 * Bug this catches: check_tiny_bump in scripts/ci/cagents-ci.sh exempted ONLY
 * major bumps from the "<=5 non-sync files changed" cap, so a legitimate large
 * MINOR bump (audit / consolidation session — explicitly allowed by
 * .claude/rules/core/version-registry.md) always tripped the guard and made
 * `bash scripts/ci/cagents-ci.sh` exit 6 (RED) on committed main. A "tiny bump"
 * is by definition PATCH-level, so the <=5-file cap must apply ONLY to patch
 * bumps; minor and major bumps are exempt from the file-count cap (they still
 * require the CHANGELOG entry + registry-agreement checks).
 *
 * Failing-before / passing-after:
 *   - Before the fix, a MINOR bump with >5 non-sync files returned exit 6.
 *   - After the fix, it returns exit 0 (file-count check skipped), while a
 *     PATCH bump with >5 non-sync files STILL returns exit 6.
 *
 * Determinism: the non-sync file count is supplied via the CAGENTS_TINY_BUMP_NONSYNC
 * test seam (mirrors the CAGENTS_TINY_BUMP_NEW/OLD seams the guard already
 * exposes) so the assertions do not depend on the live HEAD~1..HEAD diff size.
 * The NEW version is read from package.json so the CHANGELOG + registry checks
 * pass at HEAD and the test tracks repo state across future bumps.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const CI_SCRIPT = join(ROOT, 'scripts', 'ci', 'cagents-ci.sh');
const CURRENT_VERSION = JSON.parse(
  readFileSync(join(ROOT, 'package.json'), 'utf8'),
).version;

const [MAJ, MIN, PAT] = CURRENT_VERSION.split('.').map(Number);
// Same major, DIFFERENT minor  -> classified as a minor bump (file-cap exempt).
const OLD_MINOR = `${MAJ}.${MIN > 0 ? MIN - 1 : MIN + 1}.0`;
// Same major AND minor, different patch -> classified as a patch bump (capped).
// (The guard only checks old != new, so a "downgrade" old value is fine and
// lets NEW stay at CURRENT_VERSION for the CHANGELOG/registry checks to pass.)
const OLD_PATCH = `${MAJ}.${MIN}.${PAT + 1}`;

const OVER_CAP = '28'; // > 5 non-sync files
const UNDER_CAP = '3'; // <= 5 non-sync files

function runGuard(env = {}) {
  // Start clean: drop any inherited CAGENTS_TINY_BUMP_* vars so the test
  // controls them explicitly.
  const cleanEnv = { ...process.env };
  for (const key of Object.keys(cleanEnv)) {
    if (key.startsWith('CAGENTS_TINY_BUMP_')) delete cleanEnv[key];
  }
  const mergedEnv = { ...cleanEnv, ...env };
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

describe('tiny-bump guard: file-count cap is patch-only (A1-F1)', () => {
  // (a) The bug: a MINOR bump with >5 non-sync files must be ALLOWED.
  it('ALLOWS a minor bump with >5 non-sync files (file-cap exempt)', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: CURRENT_VERSION,
      CAGENTS_TINY_BUMP_OLD: OLD_MINOR,
      CAGENTS_TINY_BUMP_NONSYNC: OVER_CAP,
    });
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/skipping non-sync diff size check/);
    expect(res.stdout).toMatch(/all criteria satisfied/);
  });

  // (b) The cap must NOT be disabled: a PATCH bump with >5 non-sync files blocks.
  it('BLOCKS a patch bump with >5 non-sync files', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: CURRENT_VERSION,
      CAGENTS_TINY_BUMP_OLD: OLD_PATCH,
      CAGENTS_TINY_BUMP_NONSYNC: OVER_CAP,
    });
    expect(res.code).toBe(6);
    expect(res.stdout).toMatch(/patch-bump non-sync diff touches 28 files \(>5\)/);
    expect(res.stdout).toMatch(/blocking/);
  });

  // Guardrail: a small PATCH bump (<=5 files) still passes — proves the cap is
  // enforced by threshold, not merely skipped for all patch bumps.
  it('ALLOWS a patch bump with <=5 non-sync files', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: CURRENT_VERSION,
      CAGENTS_TINY_BUMP_OLD: OLD_PATCH,
      CAGENTS_TINY_BUMP_NONSYNC: UNDER_CAP,
    });
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/patch-bump non-sync diff touches 3 files \(<=5\)/);
    expect(res.stdout).toMatch(/all criteria satisfied/);
  });

  // The CAGENTS_TINY_BUMP_BLOCK override still works: a capped patch violation
  // downgrades to warn-only (exit 0) when block mode is disabled.
  it('respects CAGENTS_TINY_BUMP_BLOCK=0 (warn-only) on a capped patch bump', () => {
    const res = runGuard({
      CAGENTS_TINY_BUMP_NEW: CURRENT_VERSION,
      CAGENTS_TINY_BUMP_OLD: OLD_PATCH,
      CAGENTS_TINY_BUMP_NONSYNC: OVER_CAP,
      CAGENTS_TINY_BUMP_BLOCK: '0',
    });
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/warn-only/);
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, lstatSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

/**
 * FU-1 regression: package.json's `description` claimed "58 agents" while every
 * other source in the repo (CLAUDE.md, README.md, AGENTS.md, plugin.json) said
 * 60.
 *
 * Bug: the stale 58 was introduced in v12.43.0 (commit ca3ab363) and survived
 * every subsequent bump — including the /run -> /act rename sweep (539c00dd),
 * whose hunk rewrote the skill list but left the count untouched.
 *
 * Root cause: scripts/ci/validate-counts.sh covered CLAUDE.md, README.md,
 * AGENTS.md, settings.json, hooks.md, version-registry.md and docs/, but NOT
 * package.json — the one root manifest with a prose count. Nothing derived the
 * true count and compared it, so the drift was invisible and CI stayed green.
 *
 * Fix: validate-counts.sh Check 15 derives ACTIVE_AGENTS (from plugin.json) and
 * USER_SKILLS (from the on-disk .claude/skills tree) and compares both against
 * package.json's description, failing loudly on mismatch.
 *
 * This test pins the count directly (mirroring
 * tests/regressions/claude-md-counts-current.test.js, which pins CLAUDE.md) AND
 * mutation-tests Check 15 itself (mirroring
 * tests/regressions/count-drift-guards.test.js) so the guard is proven to fail,
 * not merely proven to pass.
 *
 * Could have caught by: extending validate-counts.sh to package.json when the
 * description first gained a prose agent count.
 */

const REPO_ROOT = process.cwd();
const COUNTS = join(REPO_ROOT, 'scripts', 'ci', 'validate-counts.sh');

const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];

function countSkillMd(dir) {
  let count = 0;
  if (!existsSync(dir)) return 0;
  for (const entry of readdirSync(dir)) {
    // Skip _deprecated/ buckets (culled agents kept for alias resolution).
    if (entry === '_deprecated') continue;
    const full = join(dir, entry);
    let lst;
    try { lst = lstatSync(full); } catch { continue; }
    if (lst.isDirectory()) {
      count += countSkillMd(full);
    } else if (entry === 'SKILL.md') {
      count++;
    }
  }
  return count;
}

/** Run validate-counts.sh, optionally overriding the package.json it reads. */
function runCounts(env = {}) {
  try {
    const stdout = execSync(`bash ${COUNTS}`, {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      env: { ...process.env, ...env },
    });
    return { exitCode: 0, output: stdout.toString() };
  } catch (err) {
    return {
      exitCode: err.status,
      output: (err.stdout?.toString() || '') + (err.stderr?.toString() || ''),
    };
  }
}

describe('FU-1: package.json description counts match disk', () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));

  it('agent-count claim matches the actual SKILL.md count on disk', () => {
    const total = ARCHETYPES.reduce((sum, arch) => sum + countSkillMd(join(REPO_ROOT, 'agents', arch)), 0);
    expect(
      pkg.description,
      `package.json description must state "${total} agents" (actual SKILL.md count across the 9 archetypes)`,
    ).toContain(`${total} agents`);
  });

  it('agent-count claim agrees with plugin.json (the canonical registry)', () => {
    const plugin = JSON.parse(readFileSync(join(REPO_ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
    expect(pkg.description).toContain(`${plugin.agents.length} agents`);
  });

  it('user-skill claim matches the actual .claude/skills tree', () => {
    const skillsDir = join(REPO_ROOT, '.claude', 'skills');
    const skills = readdirSync(skillsDir).filter((e) => existsSync(join(skillsDir, e, 'SKILL.md')));
    expect(pkg.description).toContain(`${skills.length} user skills`);
    // Every shipped skill must be named in the description (catches a stale
    // name surviving a rename, the way "/run" did before the FU-1 sweep).
    for (const skill of skills) {
      expect(pkg.description, `description must name /${skill}`).toContain(`/${skill}`);
    }
  });
});

describe('FU-1: validate-counts.sh Check 15 — package.json coverage', () => {
  /**
   * Race-free: write a MUTATED package.json into a temp dir and point Check 15
   * at it via CAGENTS_VALIDATE_COUNTS_PACKAGE_JSON (the same override idiom
   * Check 1 uses for CLAUDE.md). The real package.json is never touched.
   */
  function withMutatedDescription(description, fn) {
    const tmpDir = mkdtempSync(join(tmpdir(), 'pkg-counts-c15-'));
    const tmpPkg = join(tmpDir, 'package.json');
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
    pkg.description = description;
    writeFileSync(tmpPkg, JSON.stringify(pkg, null, 2));
    try {
      return fn(tmpPkg);
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    }
  }

  it('FAILS (exit 1) on a stale agent count — the exact FU-1 bug', () => {
    const { exitCode, output } = withMutatedDescription(
      'Universal multi-domain agent orchestration framework. 58 agents across 9 archetypes with 4 user skills (/act, /team, /designer, /helper).',
      (tmpPkg) => runCounts({ CAGENTS_VALIDATE_COUNTS_PACKAGE_JSON: tmpPkg }),
    );
    expect(exitCode, 'Check 15 should FAIL on a stale agent count').toBe(1);
    expect(output).toMatch(/package\.json \(description\) claims '58 agents'/);
  });

  it('FAILS (exit 1) on a stale user-skill count', () => {
    const { exitCode, output } = withMutatedDescription(
      'Universal multi-domain agent orchestration framework. 60 agents across 9 archetypes with 3 user skills (/act, /team, /designer).',
      (tmpPkg) => runCounts({ CAGENTS_VALIDATE_COUNTS_PACKAGE_JSON: tmpPkg }),
    );
    expect(exitCode, 'Check 15 should FAIL on a stale user-skill count').toBe(1);
    expect(output).toMatch(/package\.json \(description\) claims '3 user skills'/);
  });

  it('exits 0 on the real (clean) package.json — no false positive', () => {
    const { exitCode, output } = runCounts();
    expect(exitCode, `validate-counts.sh on clean tree:\n${output}`).toBe(0);
  });
});

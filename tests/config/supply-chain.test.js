import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Regression test for WI-P4 (audit remediation): GHSA-h67p-54hq-rp68 —
// js-yaml 4.0.0-4.1.1 quadratic-complexity DoS in merge-key handling.
// js-yaml is cAgents' SOLE runtime dependency (Standalone Contract: zero
// external-service deps, but js-yaml is a legitimate build/config-parsing dep).
//
// This suite is HERMETIC: it asserts the on-disk lockfile SHAPE only (no
// live network `npm audit` call), so it is deterministic and offline-safe.
//
// Before the WI-P4 fix, package-lock.json recorded js-yaml@4.1.1 under
// devDependencies (`dev: true` on its node_modules entry, and the root
// `packages[""]` block had no `dependencies` key at all) even though
// package.json's `dependencies` already declared it as a production dep.
// That lockfile/manifest disagreement is what let the vulnerable 4.1.1
// resolve as an (incorrectly-classified) dev-only package. The fix is a
// lockfile-only regen (`npm install --package-lock-only` / `npm audit fix
// --package-lock-only`) that both bumps js-yaml to a patched release
// (>=4.2.0) and re-records it as a production dependency.

const PROJECT_ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(PROJECT_ROOT, 'package.json');
const LOCKFILE_PATH = join(PROJECT_ROOT, 'package-lock.json');

// GHSA-h67p-54hq-rp68 is fixed in js-yaml 4.2.0. The declared range (^4.1.1)
// is 4.x, so a major/minor numeric compare is sufficient and avoids pulling
// in a semver library just for this one check.
function isPatchedJsYamlVersion(version) {
  const parts = String(version).split('.').map((n) => parseInt(n, 10));
  const [major, minor] = parts;
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
  return major > 4 || (major === 4 && minor >= 2);
}

describe('supply-chain: js-yaml GHSA-h67p-54hq-rp68 (WI-P4)', () => {
  // package.json is COMMITTED, so this case must always run.
  it('package.json should declare js-yaml as a production dependency', () => {
    expect(existsSync(PACKAGE_JSON_PATH)).toBe(true);
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies['js-yaml']).toBeDefined();
  });

  // package-lock.json is git-ignored (.gitignore:2) and never committed, so it
  // is absent on a clean checkout. Skip the 4 lockfile-dependent cases when the
  // file is absent (matching P2's it.skipIf pattern in
  // tests/v12/alias-map-coverage.test.js and validator-bias-recheck.test.js);
  // still run them (proving the vulnerable shape is gone) when the file is
  // present — the regression contract holds: PRESENT+old-shape => FAIL,
  // PRESENT+fixed => PASS, ABSENT => SKIP (never a false-RED on clean CI).
  it.skipIf(!existsSync(LOCKFILE_PATH))('package-lock.json should parse as valid JSON', () => {
    expect(() => JSON.parse(readFileSync(LOCKFILE_PATH, 'utf8'))).not.toThrow();
  });

  it.skipIf(!existsSync(LOCKFILE_PATH))('root packages[""].dependencies should list js-yaml (not devDependencies-only)', () => {
    const lockfile = JSON.parse(readFileSync(LOCKFILE_PATH, 'utf8'));
    const root = lockfile.packages[''];
    expect(root.dependencies).toBeDefined();
    expect(root.dependencies['js-yaml']).toBeDefined();
  });

  it.skipIf(!existsSync(LOCKFILE_PATH))("node_modules/js-yaml lockfile entry should NOT be marked dev:true (must resolve as a production dep)", () => {
    const lockfile = JSON.parse(readFileSync(LOCKFILE_PATH, 'utf8'));
    const entry = lockfile.packages['node_modules/js-yaml'];
    expect(entry).toBeDefined();
    expect(entry.dev).not.toBe(true);
  });

  it.skipIf(!existsSync(LOCKFILE_PATH))('installed js-yaml version should be >= 4.2.0 (patched; excludes vulnerable 4.0.0-4.1.1 range)', () => {
    const lockfile = JSON.parse(readFileSync(LOCKFILE_PATH, 'utf8'));
    const entry = lockfile.packages['node_modules/js-yaml'];
    expect(entry).toBeDefined();
    expect(entry.version).toBeDefined();
    expect(isPatchedJsYamlVersion(entry.version)).toBe(true);
  });
});

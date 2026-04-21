/**
 * CHANGELOG.md format regression test (added in V10.26.1).
 *
 * Bug this catches: CHANGELOG.md missing, malformed, or out-of-sync with
 * package.json after a tiny-bump.
 * Could have been caught by: unit test on CHANGELOG.md format.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const CHANGELOG_PATH = join(ROOT, 'CHANGELOG.md');
const PACKAGE_PATH = join(ROOT, 'package.json');

describe('CHANGELOG.md format', () => {
  it('CHANGELOG.md exists at repo root', () => {
    expect(existsSync(CHANGELOG_PATH)).toBe(true);
  });

  const content = existsSync(CHANGELOG_PATH)
    ? readFileSync(CHANGELOG_PATH, 'utf8')
    : '';

  it('has a top-level "# Changelog" heading', () => {
    expect(content).toMatch(/^# Changelog/m);
  });

  it('references Keep a Changelog format', () => {
    expect(content.toLowerCase()).toContain('keep a changelog');
  });

  it('has an [Unreleased] section placeholder', () => {
    expect(content).toMatch(/^## \[Unreleased\]/m);
  });

  it('has at least one versioned entry matching Keep-a-Changelog style', () => {
    // Format: ## [x.y.z] - YYYY-MM-DD
    const versionEntries = content.match(/^## \[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}/gm);
    expect(versionEntries).not.toBeNull();
    expect(versionEntries.length).toBeGreaterThan(0);
  });

  it('top versioned entry matches package.json version', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8'));
    const match = content.match(/^## \[(\d+\.\d+\.\d+)\] - \d{4}-\d{2}-\d{2}/m);
    expect(match).not.toBeNull();
    expect(match[1]).toBe(pkg.version);
  });
});

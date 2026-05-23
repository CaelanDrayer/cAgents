/**
 * v12.2.0 regression: /org skill removed and absorbed into /team strategic mode.
 *
 * The standalone /org skill was removed in v12.2.0 (see CHANGELOG). The version
 * registry must no longer include `.claude/skills/org/SKILL.md` as an active
 * slot in any of the three sync surfaces:
 *   (a) .claude/rules/core/version-registry.md  -- the canonical registry
 *   (b) scripts/sync-versions.sh                -- the writer
 *   (c) scripts/ci/validate-versions.sh         -- the verifier
 *
 * Bug-driven testing mandate: this test would have caught a regression where
 *   (a) sync-versions.sh re-listed `.claude/skills/org/SKILL.md` in SKILLS=();
 *   (b) validate-versions.sh restored a `check_version ".../skills/org/..."` call;
 *   (c) the registry markdown table re-introduced an org row.
 *
 * Could have caught by: unit test that greps the three sync-surface files for
 * any active reference to `.claude/skills/org/SKILL.md`.
 *
 * Scope: this test asserts the *active* slot is gone. Historical commentary
 * (e.g., CHANGELOG entries documenting the removal, or version-registry.md
 * "Last verified" notes that *mention* the removed slot in prose) is allowed —
 * we look at the structured table rows and active script invocations only.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();

const REGISTRY_PATH = join(REPO_ROOT, '.claude', 'rules', 'core', 'version-registry.md');
const SYNC_PATH = join(REPO_ROOT, 'scripts', 'sync-versions.sh');
const VALIDATE_PATH = join(REPO_ROOT, 'scripts', 'ci', 'validate-versions.sh');

describe('v12.2.0: /org slot removed from version registry', () => {
  it('all three sync-surface files exist', () => {
    expect(existsSync(REGISTRY_PATH), `Missing: ${REGISTRY_PATH}`).toBe(true);
    expect(existsSync(SYNC_PATH), `Missing: ${SYNC_PATH}`).toBe(true);
    expect(existsSync(VALIDATE_PATH), `Missing: ${VALIDATE_PATH}`).toBe(true);
  });

  it('version-registry.md table has no active row for .claude/skills/org/SKILL.md', () => {
    const content = readFileSync(REGISTRY_PATH, 'utf8');
    // Match table rows: `| N | `.claude/skills/org/SKILL.md` | ... |`
    const tableRowPattern = /\|\s*\d+\s*\|\s*`\.claude\/skills\/org\/SKILL\.md`/;
    expect(content,
      'Expected no active table row for .claude/skills/org/SKILL.md in version-registry.md'
    ).not.toMatch(tableRowPattern);
  });

  it('version-registry.md declares 16 total locations (not 17)', () => {
    const content = readFileSync(REGISTRY_PATH, 'utf8');
    expect(content).toMatch(/Version Locations \(16 total\)/);
    expect(content).not.toMatch(/Version Locations \(17 total\)/);
  });

  it('sync-versions.sh SKILLS=() array does NOT include skills/org/SKILL.md', () => {
    const content = readFileSync(SYNC_PATH, 'utf8');
    // Strip comment lines (history mentions are allowed in `#` prose) before scanning
    const codeLines = content
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .join('\n');
    expect(codeLines,
      'Expected no active references to .claude/skills/org/SKILL.md in sync-versions.sh code'
    ).not.toMatch(/\.claude\/skills\/org\/SKILL\.md/);
  });

  it('validate-versions.sh does NOT call check_version for skills/org/SKILL.md', () => {
    const content = readFileSync(VALIDATE_PATH, 'utf8');
    const codeLines = content
      .split('\n')
      .filter(line => !line.trim().startsWith('#'))
      .join('\n');
    expect(codeLines,
      'Expected no active check_version call for .claude/skills/org/SKILL.md in validate-versions.sh'
    ).not.toMatch(/\.claude\/skills\/org\/SKILL\.md/);
  });

  it('validate-versions.sh advertises 16 canonical locations in headers and footer', () => {
    const content = readFileSync(VALIDATE_PATH, 'utf8');
    expect(content).toMatch(/16 canonical/);
    expect(content).toMatch(/Checked \$CHECKED\/16 locations/);
    expect(content).not.toMatch(/18 canonical/);
    expect(content).not.toMatch(/Checked \$CHECKED\/17 locations/);
  });

  it('sync-versions.sh header advertises 16 locations (not 17)', () => {
    const content = readFileSync(SYNC_PATH, 'utf8');
    expect(content).toMatch(/Updates version in all 16 locations/);
    expect(content).not.toMatch(/Updates version in all 17 locations/);
  });

  it('actual skill SKILL.md file at .claude/skills/org/ does not exist', () => {
    const orgSkillPath = join(REPO_ROOT, '.claude', 'skills', 'org', 'SKILL.md');
    expect(existsSync(orgSkillPath),
      'Expected .claude/skills/org/SKILL.md to NOT exist after v12.2.0 removed the /org skill'
    ).toBe(false);
  });
});

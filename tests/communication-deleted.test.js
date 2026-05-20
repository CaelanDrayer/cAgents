/**
 * WI-W4.1: cagents-memory/_communication/ deletion regression test
 *
 * Asserts the v12 cleanup of the unused agent-messaging directory is
 * permanent:
 *
 *   1. cagents-memory/_communication/ does not exist on disk.
 *   2. Zero references to '_communication/' remain in agent SKILL.md
 *      files (the v11.x-era inbox/broadcast paths were swept).
 *   3. Excluded from check: CHANGELOG.md, scripts/migration/v12-aliases.yaml,
 *      archive/, cagents-memory/sessions/, cagents-memory/_archive/,
 *      docs/RELEASE_NOTES.md (historical changelog notes that intentionally
 *      mention the removal).
 *
 * Bug-driven test mandate (CLAUDE.md): this test guards against accidental
 * re-introduction of the deleted directory or its inbox-based message
 * patterns in agent SKILL.md files.
 *
 * Could have caught by: directory-existence + content audit on SKILL.md
 * files. Now codified.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const COMM_DIR = path.join(REPO_ROOT, 'cagents-memory', '_communication');

describe('WI-W4.1: cagents-memory/_communication/ deletion is permanent', () => {
  it('cagents-memory/_communication/ directory does not exist', () => {
    expect(fs.existsSync(COMM_DIR)).toBe(false);
  });

  it('zero references to _communication/ in agent SKILL.md files', () => {
    // grep all SKILL.md files for _communication/ references, excluding
    // archive/, cagents-memory/sessions/, cagents-memory/_archive/, and
    // node_modules.
    let matches = '';
    try {
      matches = execSync(
        `grep -rln '_communication/' --include='SKILL.md' . ` +
          `| grep -v 'archive/' ` +
          `| grep -v 'cagents-memory/sessions/' ` +
          `| grep -v 'cagents-memory/_archive' ` +
          `| grep -v 'node_modules' ` +
          `|| true`,
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
    } catch (err) {
      // grep with || true should never throw; capture defensively.
      matches = '';
    }
    const offenders = matches
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });

  it('zero references to _communication/ in any .md/.yaml/.json (excluding historical/changelog files)', () => {
    // This stricter sweep excludes files where _communication/ is allowed
    // (CHANGELOG.md, alias map, archived sessions, release notes, top-level
    // changelog-style v12 callouts in CLAUDE.md/README.md/ARCHITECTURE.md).
    let matches = '';
    try {
      matches = execSync(
        `grep -rln '_communication/' --include='*.md' --include='*.yaml' --include='*.json' . ` +
          `| grep -v 'CHANGELOG' ` +
          `| grep -v 'archive/' ` +
          `| grep -v 'v12-aliases' ` +
          `| grep -v 'cagents-memory/' ` +
          `| grep -v 'node_modules' ` +
          `| grep -v 'docs/RELEASE_NOTES.md' ` +
          `| grep -v '^./CLAUDE.md$' ` +
          `| grep -v '^./README.md$' ` +
          `| grep -v '^./docs/ARCHITECTURE.md$' ` +
          `|| true`,
        { cwd: REPO_ROOT, encoding: 'utf8' }
      );
    } catch (err) {
      matches = '';
    }
    const offenders = matches
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    expect(offenders).toEqual([]);
  });
});

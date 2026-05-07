import { describe, it, expect } from 'vitest';
import { readdirSync, lstatSync, existsSync, readlinkSync, statSync } from 'fs';
import { join, resolve, dirname } from 'path';

/**
 * Regression test for V11.2.1 broken-symlink fix.
 *
 * Bug: V11.1.13 introduced .claude/skills/commit-changes as a symlink pointing
 * to ../../skills/commit-changes — but that target never existed in the cAgents
 * repo or the parent workspace. This left a broken symlink in the shipped plugin's
 * skills directory.
 *
 * Root cause: The symlink was added intentionally (V11.1.13 squashed commit) but
 * the target was expected to live elsewhere (likely a workspace-level skills/ dir
 * that was never created). The V11.1.13 commit message itself enumerates "6 skills
 * (designer/helper/improve/org/run/team)" — not including commit-changes.
 *
 * Test added: tests/skills/no-broken-symlinks.test.js — walks .claude/skills/ and
 * fails if any symlink target does not exist. This applies to .claude/hooks/,
 * .claude/rules/, and the plugin manifest paths too.
 *
 * Could have caught by: a structural integrity test on .claude/ tree.
 */

const ROOT = process.cwd();

const SCAN_DIRS = [
  '.claude/skills',
  '.claude/hooks',
  '.claude/rules',
  '.claude-plugin',
];

function* walkSymlinks(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    let lst;
    try {
      lst = lstatSync(fullPath);
    } catch {
      continue;
    }
    if (lst.isSymbolicLink()) {
      yield fullPath;
    } else if (lst.isDirectory()) {
      yield* walkSymlinks(fullPath);
    }
  }
}

describe('No broken symlinks in shipped plugin tree', () => {
  for (const dir of SCAN_DIRS) {
    it(`${dir} contains no broken symlinks`, () => {
      const broken = [];
      for (const linkPath of walkSymlinks(join(ROOT, dir))) {
        const target = readlinkSync(linkPath);
        const resolvedTarget = resolve(dirname(linkPath), target);
        if (!existsSync(resolvedTarget)) {
          broken.push({
            link: linkPath.replace(ROOT + '/', ''),
            target,
            resolved: resolvedTarget,
          });
        }
      }
      if (broken.length > 0) {
        const msg = broken
          .map((b) => `  ${b.link} -> ${b.target} (resolved: ${b.resolved}) — TARGET DOES NOT EXIST`)
          .join('\n');
        throw new Error(`Found ${broken.length} broken symlink(s) in ${dir}:\n${msg}`);
      }
      expect(broken).toEqual([]);
    });
  }
});

/**
 * settings-local-json-ignored.test.js: UD-2 (v12.79.0), SEC-UD2-1.
 *
 * .claude/settings.local.json can hold CAGENTS_BASH_GUARD_DISABLED, which
 * turns the whole bash guard off. The file must never ship. The repo's own
 * .gitignore must ignore it, without help from a user's global excludes file.
 */

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = join(__dirname, '..', '..');

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', timeout: 60000 });
  if (r.error) throw r.error;
  if (r.signal) throw new Error(`git ${args.join(' ')} killed by ${r.signal}`);
  return r;
}

describe('.claude/settings.local.json stays out of git', () => {
  it('is not tracked', () => {
    const r = git(['ls-files', '.claude/settings.local.json']);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe('');
  });

  it('is ignored by the repo .gitignore alone', () => {
    const r = git(['-c', 'core.excludesFile=/dev/null', 'check-ignore', '-q', '.claude/settings.local.json']);
    expect(r.status).toBe(0);
  });

  it('a nested copy is ignored too', () => {
    const r = git(['-c', 'core.excludesFile=/dev/null', 'check-ignore', '-q', 'sub/dir/.claude/settings.local.json']);
    expect(r.status).toBe(0);
  });
});

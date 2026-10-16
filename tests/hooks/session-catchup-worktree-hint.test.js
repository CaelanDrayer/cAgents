/**
 * FU-10 (v12.77.0): session-catchup.cjs adds one advisory line per session
 * when <project>/.claude/worktrees exists and git does not ignore it.
 *
 * Each case uses its own temp git repo as CLAUDE_PROJECT_DIR. The hook must
 * never edit .gitignore.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync, spawnSync } from 'child_process';

const HOOK = join(process.cwd(), '.claude', 'hooks', 'session-catchup.cjs');
const HINT = '.claude/worktrees/ is not git-ignored';

const dirs = [];

function makeRepo({ worktrees = true, ignore = null, git = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cagents-wt-hint-'));
  dirs.push(dir);
  if (git) execSync('git init -q', { cwd: dir, stdio: 'ignore' });
  if (worktrees) mkdirSync(join(dir, '.claude', 'worktrees'), { recursive: true });
  if (ignore !== null) writeFileSync(join(dir, '.gitignore'), ignore);
  return dir;
}

function run(projectDir, sessionId = 'sid-a') {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({ session_id: sessionId }),
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1' },
  });
  expect(r.status).toBe(0);
  return JSON.parse(r.stdout.trim()).hookSpecificOutput.additionalContext;
}

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

describe('session-catchup worktree gitignore hint (FU-10)', () => {
  it('prints the hint once per session when .claude/worktrees is not ignored', () => {
    const dir = makeRepo();
    const first = run(dir, 'sid-a');
    expect(first.split(HINT).length - 1).toBe(1);
    expect(run(dir, 'sid-a')).not.toContain(HINT);
    // A new session gets the hint again.
    expect(run(dir, 'sid-b')).toContain(HINT);
    // The hook never creates or edits .gitignore.
    expect(existsSync(join(dir, '.gitignore'))).toBe(false);
  });

  it('prints nothing when .claude/worktrees is ignored', () => {
    const dir = makeRepo({ ignore: '.claude/worktrees/\ncagents-memory/\n' });
    expect(run(dir)).not.toContain(HINT);
    expect(readFileSync(join(dir, '.gitignore'), 'utf8')).toBe('.claude/worktrees/\ncagents-memory/\n');
  });

  it('prints nothing when .claude/worktrees is absent', () => {
    expect(run(makeRepo({ worktrees: false }))).not.toContain(HINT);
  });

  it('fails silent when the dir is not a git repo', () => {
    expect(run(makeRepo({ git: false }))).not.toContain(HINT);
  });
});

/**
 * Guard regression test: no GitHub Actions workflow may be committed.
 *
 * The maintainer's standing policy is that this repo NEVER ships a GitHub
 * Actions workflow. This guard FAILS if any `.github/workflows/*.yml` or
 * `.github/workflows/*.yaml` file is either (a) tracked by git or (b) present
 * on the filesystem (untracked-but-present is caught too).
 *
 * Bug-driven testing mandate (CLAUDE.md): failing-before / passing-after.
 * RED while `.github/workflows/ci.yml` exists; GREEN once it is removed.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WORKFLOWS_DIR = path.join(REPO_ROOT, '.github', 'workflows');

const isWorkflowFile = (name) => /\.ya?ml$/i.test(name);

/** Files tracked (committed) by git under .github/workflows. */
function trackedWorkflowFiles() {
  const out = execFileSync('git', ['ls-files', '.github/workflows'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((f) => isWorkflowFile(f));
}

/** Files present on disk under .github/workflows (catches untracked ones). */
function onDiskWorkflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((name) => isWorkflowFile(name))
    .filter((name) => fs.statSync(path.join(WORKFLOWS_DIR, name)).isFile());
}

describe('no GitHub Actions workflow is committed', () => {
  it('has ZERO tracked .github/workflows/*.yml|*.yaml files', () => {
    const tracked = trackedWorkflowFiles();
    expect(
      tracked,
      `GitHub Actions workflow(s) are committed and must be removed: ${tracked.join(', ')}`,
    ).toEqual([]);
  });

  it('has ZERO .github/workflows/*.yml|*.yaml files on disk', () => {
    const onDisk = onDiskWorkflowFiles();
    expect(
      onDisk,
      `GitHub Actions workflow file(s) present on disk under .github/workflows: ${onDisk.join(', ')}`,
    ).toEqual([]);
  });
});

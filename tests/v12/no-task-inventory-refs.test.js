import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

describe('v12.5.0 rename: task-inventory -> task-state', () => {
  it('has no surviving cagents:task-inventory or core/task-inventory references in code/config (excluding CHANGELOG/docs/archive/_deprecated/sessions/own-test)', () => {
    const result = execSync(
      'grep -r "cagents:task-inventory\\|core/task-inventory" . ' +
      '--include="*.md" --include="*.yaml" --include="*.json" ' +
      '--include="*.cjs" --include="*.js" --include="*.ts" --include="*.sh" ' +
      '--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs ' +
      '--exclude-dir=archive --exclude-dir=_archive --exclude-dir=_deprecated ' +
      '--exclude-dir=sessions ' +
      '| grep -v CHANGELOG.md | grep -v RELEASE_NOTES.md ' +
      '| grep -v "tests/v12/no-task-inventory-refs.test.js" || true',
      { encoding: 'utf8' }
    ).trim();
    expect(result).toBe('');
  });
});

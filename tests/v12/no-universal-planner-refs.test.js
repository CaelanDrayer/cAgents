import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

describe('v12.5.0 rename: universal-planner -> planner', () => {
  it('has no surviving cagents:universal-planner or core/universal-planner references in code/config (excluding CHANGELOG/docs/archive/_deprecated/sessions/own-test)', () => {
    const result = execSync(
      'grep -r "cagents:universal-planner\\|core/universal-planner" . ' +
      '--include="*.md" --include="*.yaml" --include="*.json" ' +
      '--include="*.cjs" --include="*.js" --include="*.ts" --include="*.sh" ' +
      '--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs ' +
      '--exclude-dir=archive --exclude-dir=_archive --exclude-dir=_deprecated ' +
      '--exclude-dir=sessions ' +
      '| grep -v CHANGELOG.md | grep -v RELEASE_NOTES.md ' +
      // REC-07 (v12.49.0): the back-compat alias map + its resolution test are the
      // sanctioned locations for the legacy name (same policy as no-stale-agent-names.test.js).
      '| grep -v "scripts/migration/v12-aliases.yaml" ' +
      '| grep -v "tests/migration/alias-map-resolution.test.js" ' +
      '| grep -v "tests/v12/no-universal-planner-refs.test.js" || true',
      { encoding: 'utf8' }
    ).trim();
    expect(result).toBe('');
  });
});

import { execSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

// FU-3 guard: catches BARE prose mentions of the v12.5.0-renamed pipeline agents
// (universal-router/planner/validator/executor/self-correct) inside agents/**/*.md.
//
// The five existing no-universal-*-refs.test.js guards only grep for the
// `cagents:universal-*` and `core/universal-*` shapes, so bare prose tokens like
// "With universal-validator: ..." slipped through. This guard closes that gap.
//
// Exclusions: the guard test files themselves (which intentionally contain the
// literal stale names), CHANGELOG.md, docs/CHANGELOG.md, v12-aliases.yaml,
// _archive/**, cagents-memory/**, node_modules/**.
describe('FU-3: no bare universal-<name> prose references in agents/**/*.md', () => {
  it('has no bare universal-{router,planner,validator,executor,self-correct} tokens in agents/**/*.md', () => {
    const result = execSync(
      'grep -rIn "universal-\\(router\\|planner\\|validator\\|executor\\|self-correct\\)" ' +
      'agents/ --include="*.md" ' +
      '--exclude-dir=node_modules --exclude-dir=.git ' +
      '--exclude-dir=_archive --exclude-dir=_deprecated ' +
      '| grep -v "tests/v12/no-universal-" ' +
      '| grep -v "tests/v12/no-bare-universal-prose-refs.test.js" ' +
      '| grep -v "CHANGELOG.md" ' +
      '| grep -v "docs/CHANGELOG.md" ' +
      '| grep -v "scripts/migration/v12-aliases.yaml" ' +
      '| grep -v "cagents-memory/" || true',
      { encoding: 'utf8' }
    ).trim();
    expect(result).toBe('');
  });
});

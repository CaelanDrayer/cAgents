// Regression tests for V10.26.19+ — /improve skill skeleton and progressive buildout.
// Each patch in Cluster 4 adds assertions here. Failing-before state: prior to
// V10.26.19 the /improve skill did not exist on disk.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const IMPROVE_SKILL = resolve(ROOT, '.claude/skills/improve/SKILL.md');
const STATE_MACHINE = resolve(
  ROOT,
  '.claude/skills/improve/reference/state-machine.md'
);
const HELPER_DETAILS = resolve(
  ROOT,
  '.claude/skills/helper/reference/command-details.md'
);
const PLUGIN_JSON = resolve(ROOT, '.claude-plugin/plugin.json');

function frontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

describe('V10.26.19 /improve skeleton', () => {
  it('improve SKILL.md exists', () => {
    expect(existsSync(IMPROVE_SKILL)).toBe(true);
  });

  it('improve SKILL.md frontmatter is valid and marks skill user-invocable', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const fm = frontmatter(content);
    expect(fm).toMatch(/^name:\s*improve\s*$/m);
    expect(fm).toMatch(/user-invocable:\s*"true"/);
    expect(fm).toMatch(/context:\s*"fork"/);
    expect(fm).toMatch(/compatibility:\s*"Claude Code >= 2\.1\.69"/);
  });

  it('improve SKILL.md declares allowed-tools combining /review + /optimize surface', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const fm = frontmatter(content);
    expect(fm).toMatch(/allowed-tools:.*Read/);
    expect(fm).toMatch(/allowed-tools:.*Agent/);
    expect(fm).toMatch(/allowed-tools:.*Bash/);
    expect(fm).toMatch(/allowed-tools:.*Write/);
    expect(fm).toMatch(/allowed-tools:.*TodoWrite/);
  });

  it('improve SKILL.md declares the --mode argument-hint surface', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const fm = frontmatter(content);
    expect(fm).toMatch(/--mode review\|optimize\|full/);
  });

  it('reference/state-machine.md placeholder exists', () => {
    expect(existsSync(STATE_MACHINE)).toBe(true);
    const content = readFileSync(STATE_MACHINE, 'utf8');
    expect(content).toMatch(/SCOPING/);
    expect(content).toMatch(/REPORTING/);
  });

  it('helper command-details.md reserves the /improve slot (preview)', () => {
    const content = readFileSync(HELPER_DETAILS, 'utf8');
    expect(content).toMatch(/## \/improve/);
    expect(content).toMatch(/preview|Preview/);
  });

  it('improve SKILL.md stays under 600 lines (progressive disclosure)', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThan(600);
  });
});

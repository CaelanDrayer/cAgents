// Regression (F2, v12.74.0): Claude Code reads only documented agent
// frontmatter fields. It ignores `metadata.*` and `allowed-tools` on agents.
// No cAgents agent declares a top-level `model:` or `tools:` key, so every
// subagent inherits the session model and all tools. The docs must say so.
// This test fails if the docs claim that the nested values take effect.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(ROOT, 'agents');

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function agentsWithTopLevelKey(key) {
  const re = new RegExp(`^${key}:`, 'm');
  return fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .filter((f) => re.test(frontmatter(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8'))));
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('agent frontmatter claims are honest (F2)', () => {
  it('CLAUDE.md Models line says the model is advisory when no agent has a top-level model:', () => {
    if (agentsWithTopLevelKey('model').length > 0) return;
    const line = read('CLAUDE.md')
      .split('\n')
      .find((l) => l.startsWith('**Models**:'));
    expect(line, 'CLAUDE.md has no **Models**: line').toBeTruthy();
    expect(line).toMatch(/advisory|inherit/i);
  });

  it('skill-format.md does not claim allowed-tools restricts agent tools when no agent has a top-level tools:', () => {
    if (agentsWithTopLevelKey('tools').length > 0) return;
    const text = read('.claude/rules/core/skill-format.md');
    expect(text).not.toContain('is the single authoritative tool declaration');
    expect(text).not.toContain('only `translator.md` uses top-level');
  });
});

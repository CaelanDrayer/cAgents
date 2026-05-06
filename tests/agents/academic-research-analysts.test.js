// Phase 12 (V11.1.13): academic-research analyst agents regression test
// Asserts the 3 descoped Phase 12 agents exist and conform to v11.1.0+ spec:
//   (a) All 3 SKILL.md files exist under analyst/
//   (b) Each declares archetype: analyst (top-level, no branch — analyst is 2-level)
//   (c) Each declares metadata.version matching strict semver
//   (d) Each is ≤ 400 lines (size-guard friendly; the 3 ship at 124-143 lines)
//   (e) validate-agents.sh exits 0 for each (back-compat preserved)
//
// Refs:
//   - example/external-skills/RESUME_W7_FINAL_PROMPT.md § Section E (Phase 12 spec)
//   - .claude/rules/core/skill-format.md (v11.1.0+ schema)
//   - analyst/data-scientist/SKILL.md (structural template)

import { describe, test, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', '..');

const PHASE_12_AGENTS = [
  'literature-review-author',
  'citation-graph-analyzer',
  'methodology-critic',
];

const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const MAX_LINES = 400;

function agentPath(name) {
  return join(ROOT, 'analyst', name, 'SKILL.md');
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return null;
  try {
    return yaml.load(content.slice(4, end));
  } catch {
    return null;
  }
}

describe('Phase 12 (V11.1.13): academic-research analyst agents', () => {
  test('(a) All 3 Phase 12 SKILL.md files exist under analyst/', () => {
    for (const name of PHASE_12_AGENTS) {
      const p = agentPath(name);
      expect(existsSync(p), `Missing: ${p}`).toBe(true);
      expect(statSync(p).isFile(), `Not a file: ${p}`).toBe(true);
    }
  });

  test('(b) Each declares archetype: analyst at top level (no branch)', () => {
    for (const name of PHASE_12_AGENTS) {
      const fm = parseFrontmatter(readFileSync(agentPath(name), 'utf8'));
      expect(fm, `Frontmatter parse failed: ${name}`).toBeTruthy();
      expect(fm.archetype, `${name} archetype`).toBe('analyst');
      expect(fm.branch, `${name} must NOT declare branch (analyst is 2-level)`).toBeUndefined();
      expect(fm.name, `${name} name field`).toBe(name);
    }
  });

  test('(c) Each declares metadata.version matching strict semver', () => {
    for (const name of PHASE_12_AGENTS) {
      const fm = parseFrontmatter(readFileSync(agentPath(name), 'utf8'));
      expect(fm.metadata, `${name} metadata block`).toBeTruthy();
      expect(fm.metadata.version, `${name} metadata.version`).toBeTruthy();
      expect(
        SEMVER_RE.test(String(fm.metadata.version)),
        `${name} metadata.version "${fm.metadata.version}" not strict semver`
      ).toBe(true);
      // Phase 12 ships v1.0.0 specifically per Section E.1
      expect(String(fm.metadata.version), `${name} initial version`).toBe('1.0.0');
    }
  });

  test('(d) Each SKILL.md is ≤ 400 lines (size-guard friendly)', () => {
    for (const name of PHASE_12_AGENTS) {
      const lines = readFileSync(agentPath(name), 'utf8').split('\n').length;
      expect(lines, `${name} line count exceeds ${MAX_LINES}`).toBeLessThanOrEqual(MAX_LINES);
    }
  });

  test('(e) validate-agents.sh --file passes for each (back-compat preserved)', () => {
    for (const name of PHASE_12_AGENTS) {
      const rel = `analyst/${name}/SKILL.md`;
      let exitCode = 0;
      try {
        execSync(`bash scripts/ci/validate-agents.sh --file ${rel}`, {
          cwd: ROOT,
          stdio: 'pipe',
        });
      } catch (err) {
        exitCode = err.status ?? 1;
      }
      expect(exitCode, `validate-agents.sh failed for ${rel}`).toBe(0);
    }
  });

  test('(bonus) Each declares execution-friendly allowed-tools (Read/Grep/Glob/Bash/WebFetch/WebSearch)', () => {
    const required = ['Read', 'Grep', 'Glob', 'Bash', 'WebFetch', 'WebSearch'];
    for (const name of PHASE_12_AGENTS) {
      const fm = parseFrontmatter(readFileSync(agentPath(name), 'utf8'));
      const tools = String(fm['allowed-tools'] ?? '');
      for (const t of required) {
        expect(tools.includes(t), `${name} missing tool: ${t}`).toBe(true);
      }
    }
  });
});

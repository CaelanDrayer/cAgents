// Phase 12 (V11.1.13): academic-research analyst agents regression test
// Updated for v12.consolidation: citation-graph-analyzer + methodology-critic absorbed into scholar.
// Asserts the consolidated scholar agent exists and conforms to v11.1.0+ spec:
//   (a) SKILL.md exists under analyst/scholar/
//   (b) Declares archetype: analyst (top-level, no branch — analyst is 2-level)
//   (c) Declares metadata.version matching strict semver
//   (d) Is ≤ 400 lines (size-guard friendly)
//   (e) validate-agents.sh exits 0 (back-compat preserved)
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

// v12.consolidation absorbed citation-graph-analyzer and methodology-critic into
// scholar (agents/scholar.md). literature-review-author was culled
// earlier (LP-13/v12.8.0). The active-agent assertions below run against the
// surviving consolidated agent; absorbed agents are listed in PHASE_12_ARCHIVED_AGENTS
// so their absence from the active tree is explicitly asserted.
const PHASE_12_AGENTS = [
  'scholar',
];

const PHASE_12_ARCHIVED_AGENTS = [
  'literature-review-author',
  'citation-graph-analyzer',
  'methodology-critic',
];

const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const MAX_LINES = 400;

function agentPath(name) {
  return join(ROOT, 'agents', `${name}.md`);
}

function archivedAgentPath(name) {
  return join(ROOT, '_archive', '_deprecated_pre_v12.6', 'analyst', name, 'SKILL.md');
}

// _archive/ is gitignored, repo-root scratch — present only in local working
// trees, absent in a clean CI checkout. The (a2) archive-preservation
// assertion can only run where the archive directory actually exists.
const ARCHIVE_DIR = join(ROOT, '_archive', '_deprecated_pre_v12.6', 'analyst');
const HAS_ARCHIVE = existsSync(ARCHIVE_DIR);

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

describe('Phase 12 (V11.1.13): academic-research analyst agents (v12.consolidation: scholar survivor)', () => {
  test('(a) The active Phase 12 SKILL.md files exist under analyst/', () => {
    for (const name of PHASE_12_AGENTS) {
      const p = agentPath(name);
      expect(existsSync(p), `Missing: ${p}`).toBe(true);
      expect(statSync(p).isFile(), `Not a file: ${p}`).toBe(true);
    }
  });

  test.skipIf(!HAS_ARCHIVE)('(a2) Culled Phase 12 agents are preserved in the v12.8.0 archive', () => {
    for (const name of PHASE_12_ARCHIVED_AGENTS) {
      const p = archivedAgentPath(name);
      expect(existsSync(p), `Missing archived agent: ${p}`).toBe(true);
      expect(statSync(p).isFile(), `Not a file: ${p}`).toBe(true);
      // It must NOT linger in the active tree (Option B: not restored).
      expect(existsSync(agentPath(name)), `${name} should not be active`).toBe(false);
    }
  });

  // The "must not linger active" half of (a2) is checkable WITHOUT the archive,
  // so it runs unconditionally — the culled agents stay gone from the active tree.
  test('(a2b) Culled Phase 12 agents are absent from the active analyst/ tree', () => {
    for (const name of PHASE_12_ARCHIVED_AGENTS) {
      expect(existsSync(agentPath(name)), `${name} should not be active`).toBe(false);
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
      const rel = `agents/${name}.md`;
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

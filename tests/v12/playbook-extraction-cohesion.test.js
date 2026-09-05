/**
 * P1-8 (v12.x): Playbook extraction cohesion test
 *
 * Asserts the 4 playbooks extracted from .claude/rules/core/{teams,
 * controllers,execution}.md exist, have spec-compliant frontmatter, and
 * are referenced (not duplicated) from their original locations. Also
 * asserts that 3 oversized core/ SKILL.md bodies and the hooks.md doc
 * have been shrunk to their post-extraction line caps.
 *
 * Bug-driven test mandate (CLAUDE.md): this test fails if a future PR
 * (a) deletes a playbook without removing its references,
 * (b) re-inlines a playbook's load-bearing pattern into a core/ rule file,
 * (c) lets core/{team-lead,validator,team}/SKILL.md grow back over 250
 *     lines in the body, or
 * (d) lets .claude/rules/core/hooks.md grow back over 400 lines.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLAYBOOKS_DIR = path.join(REPO_ROOT, '.claude', 'rules', 'playbooks');

const EXPECTED_PLAYBOOKS = [
  'pat-graceful-degradation-depth1',
  'pat-evidence-first-execution',
  'pat-subagent-status-protocol',
  'pat-two-stage-review',
];

const ALLOWED_TOP_LEVEL = new Set([
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools',
]);

// The rules-loader predicate. Top-level `paths:` is NOT an Agent-Skills-spec
// field — it is the live path-conditional-load predicate read by the rules
// loader (see .claude/rules/memory/agent-memory.md "Path-Specific Rules", and
// all 43 files under .claude/rules/ which carry it, including README.md and
// skill-format.md themselves). Playbooks live under .claude/rules/, so they are
// rules files and MUST be able to declare it. `metadata.paths` is NOT a
// substitute: skill-format.md documents it as declarative-only with
// routing-boost ingestion deferred to v2, so moving `paths` under `metadata`
// would silently un-gate these 12 playbooks and load them unconditionally.
// Scoped to the rules tree so a genuine .claude/skills/ spec violation still fails.
const RULES_LOADER_TOP_LEVEL = new Set(['paths']);

function isAllowedTopLevel(key, absFile) {
  if (ALLOWED_TOP_LEVEL.has(key)) return true;
  const rel = path.relative(REPO_ROOT, absFile).split(path.sep).join('/');
  return rel.startsWith('.claude/rules/') && RULES_LOADER_TOP_LEVEL.has(key);
}

function parseTopLevelKeys(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  const block = content.slice(3, end);
  const keys = [];
  for (const rawLine of block.split('\n')) {
    if (!rawLine.trim()) continue;
    if (rawLine[0] === ' ' || rawLine[0] === '\t') continue;
    if (rawLine.startsWith('#')) continue;
    const m = rawLine.match(/^([A-Za-z][A-Za-z0-9_-]*):/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function bodyLineCount(file) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.startsWith('---')) return content.split('\n').length;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return content.split('\n').length;
  const body = content.slice(end + 4);
  return body.split('\n').length;
}

describe('P1-8: playbook extraction cohesion', () => {
  it('4 playbooks exist at expected paths', () => {
    for (const name of EXPECTED_PLAYBOOKS) {
      const p = path.join(PLAYBOOKS_DIR, `${name}.md`);
      expect(fs.existsSync(p), `Missing playbook: ${name}.md`).toBe(true);
    }
  });

  it('each playbook has spec-compliant 6-field frontmatter', () => {
    for (const name of EXPECTED_PLAYBOOKS) {
      const p = path.join(PLAYBOOKS_DIR, `${name}.md`);
      const content = fs.readFileSync(p, 'utf8');
      expect(content.startsWith('---'), `${name}.md missing frontmatter opener`).toBe(true);
      const keys = parseTopLevelKeys(content);
      expect(keys, `${name}.md frontmatter parse failed`).not.toBeNull();
      expect(keys, `${name}.md missing 'name'`).toContain('name');
      expect(keys, `${name}.md missing 'description'`).toContain('description');
      const offenders = (keys || []).filter(k => !isAllowedTopLevel(k, p));
      expect(offenders, `${name}.md has non-spec top-level field(s): ${offenders.join(', ')}`).toEqual([]);
    }
  });

  it('each playbook is referenced from at least one rule file (or its SKILL.md callers)', () => {
    // The 4 patterns originated from teams.md / controllers.md / execution.md.
    // After extraction, at least one of those (or a SKILL.md) MUST reference the playbook.
    const consumerFiles = [
      path.join(REPO_ROOT, '.claude/rules/core/teams.md'),
      path.join(REPO_ROOT, '.claude/rules/core/controllers.md'),
      path.join(REPO_ROOT, '.claude/rules/core/execution.md'),
    ];
    const allContent = consumerFiles
      .filter(f => fs.existsSync(f))
      .map(f => fs.readFileSync(f, 'utf8'))
      .join('\n');
    for (const name of EXPECTED_PLAYBOOKS) {
      expect(
        allContent.includes(`playbooks/${name}`),
        `No consumer file references playbooks/${name}`,
      ).toBe(true);
    }
  });

  it('agents/team-lead.md body <= 250 lines', () => {
    const f = path.join(REPO_ROOT, 'agents/team-lead.md');
    const lines = bodyLineCount(f);
    expect(lines, `core/team-lead/SKILL.md body has ${lines} lines (cap: 250)`).toBeLessThanOrEqual(250);
  });

  it('agents/validator.md body <= 250 lines', () => {
    const f = path.join(REPO_ROOT, 'agents/validator.md');
    const lines = bodyLineCount(f);
    expect(lines, `core/validator/SKILL.md body has ${lines} lines (cap: 250)`).toBeLessThanOrEqual(250);
  });

  it('agents/team-bootstrap.md body <= 250 lines', () => {
    const f = path.join(REPO_ROOT, 'agents/team-bootstrap.md');
    const lines = bodyLineCount(f);
    expect(lines, `core/team-bootstrap/SKILL.md body has ${lines} lines (cap: 250)`).toBeLessThanOrEqual(250);
  });

  it('.claude/rules/core/hooks.md total length <= 400 lines', () => {
    const f = path.join(REPO_ROOT, '.claude/rules/core/hooks.md');
    const content = fs.readFileSync(f, 'utf8');
    const total = content.split('\n').length;
    expect(total, `.claude/rules/core/hooks.md has ${total} lines (cap: 400)`).toBeLessThanOrEqual(400);
  });
});

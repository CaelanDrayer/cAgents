/**
 * WI-8 (v12.4.0): playbook frontmatter spec-compliance regression test
 *
 * Asserts every .claude/rules/playbooks/**\/*.md file has Agent Skills-spec-
 * compliant frontmatter: at most 6 top-level fields, drawn from the allowed
 * set (`name`, `description`, `license`, `compatibility`, `metadata`,
 * `allowed-tools`). Claude Code extensions live inside `metadata`.
 *
 * Bug-driven test mandate (CLAUDE.md): this test guards against future
 * playbook additions that smuggle non-spec fields to the top level. If a
 * future PR adds, e.g., `argument-hint:` at top level (instead of
 * metadata.argument-hint), this test fails.
 *
 * v12.4.0 ships the playbook directory infrastructure (README.md describing
 * conventions) with zero playbook content files. The README is exempt
 * because it doubles as an index page (already validated). New playbooks
 * must conform to the schema documented in the README.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PLAYBOOKS_DIR = path.join(REPO_ROOT, '.claude', 'rules', 'playbooks');

const ALLOWED_TOP_LEVEL = new Set([
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'
]);

function listPlaybookFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      out.push(...listPlaybookFiles(full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function parseTopLevelKeys(content) {
  // Very small YAML-aware frontmatter parser. Returns an array of top-level
  // keys (i.e., keys at indent 0 between the opening and closing ---).
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return null;
  const block = content.slice(3, end);
  const keys = [];
  for (const rawLine of block.split('\n')) {
    if (!rawLine.trim()) continue;
    // Indent-0 means the line starts with a letter (not space)
    if (rawLine[0] === ' ' || rawLine[0] === '\t') continue;
    if (rawLine.startsWith('#')) continue;
    const m = rawLine.match(/^([A-Za-z][A-Za-z0-9_-]*):/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

describe('WI-8 (v12.4.0): playbook frontmatter spec-compliance', () => {
  it('playbooks directory exists', () => {
    expect(fs.existsSync(PLAYBOOKS_DIR)).toBe(true);
  });

  it('every playbook .md file has frontmatter', () => {
    const files = listPlaybookFiles(PLAYBOOKS_DIR);
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      expect(content.startsWith('---'), `${path.relative(REPO_ROOT, f)} missing opening --- frontmatter delimiter`).toBe(true);
      const end = content.indexOf('\n---', 3);
      expect(end, `${path.relative(REPO_ROOT, f)} missing closing --- delimiter`).toBeGreaterThan(0);
    }
  });

  it('every playbook frontmatter has only spec-allowed top-level fields', () => {
    const files = listPlaybookFiles(PLAYBOOKS_DIR);
    const offenders = [];
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      const keys = parseTopLevelKeys(content);
      if (keys === null) continue;
      for (const k of keys) {
        if (!ALLOWED_TOP_LEVEL.has(k)) {
          offenders.push({ file: path.relative(REPO_ROOT, f), key: k });
        }
      }
    }
    expect(offenders, `Non-spec top-level fields found:\n${offenders.map(o => `  ${o.file}: '${o.key}'`).join('\n')}`).toEqual([]);
  });

  it('every playbook has required name + description fields', () => {
    const files = listPlaybookFiles(PLAYBOOKS_DIR);
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf8');
      const keys = parseTopLevelKeys(content);
      if (keys === null) continue;
      expect(keys, `${path.relative(REPO_ROOT, f)} missing 'name'`).toContain('name');
      expect(keys, `${path.relative(REPO_ROOT, f)} missing 'description'`).toContain('description');
    }
  });
});

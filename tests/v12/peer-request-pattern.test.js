/**
 * WI-7 (v12.14.0): Cross-Teammate Request Pattern regression test
 *
 * Per CLAUDE.md bug-driven test mandate. Asserts:
 *   (a) the playbook .claude/rules/playbooks/pat-cross-teammate-request.md exists
 *   (b) .claude/rules/core/teams.md references the playbook via @-import
 *   (c) the playbook's YAML example block parses as valid YAML
 *   (d) the playbook frontmatter conforms to the 6-field Agent Skills spec
 *
 * Failing-before / passing-after: if WI-2's playbook is deleted or renamed,
 * checks (a) and (c) fail; if WI-3's teams.md @-ref is removed, check (b)
 * fails. The test is a load-bearing guard against future doc-sweeps that
 * silently break the cross-teammate-request protocol surface.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLAYBOOK_PATH = path.join(
  REPO_ROOT,
  '.claude',
  'rules',
  'playbooks',
  'pat-cross-teammate-request.md',
);
const TEAMS_DOC_PATH = path.join(
  REPO_ROOT,
  '.claude',
  'rules',
  'core',
  'teams.md',
);
const STATUS_PROTOCOL_PATH = path.join(
  REPO_ROOT,
  '.claude',
  'rules',
  'playbooks',
  'pat-subagent-status-protocol.md',
);

const ALLOWED_TOP_LEVEL = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);

describe('cross-teammate request pattern (WI-7 regression)', () => {
  it('playbook file exists at .claude/rules/playbooks/pat-cross-teammate-request.md', () => {
    expect(fs.existsSync(PLAYBOOK_PATH)).toBe(true);
  });

  it('teams.md references the playbook via @-import', () => {
    const teamsDoc = fs.readFileSync(TEAMS_DOC_PATH, 'utf8');
    expect(teamsDoc).toContain(
      '@.claude/rules/playbooks/pat-cross-teammate-request.md',
    );
  });

  it('playbook contains at least one YAML code block that parses as valid YAML', () => {
    const content = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
    // Extract fenced YAML code blocks
    const yamlBlocks = [];
    const fenceRe = /```yaml\n([\s\S]*?)\n```/g;
    let match;
    while ((match = fenceRe.exec(content)) !== null) {
      yamlBlocks.push(match[1]);
    }
    expect(yamlBlocks.length).toBeGreaterThanOrEqual(1);
    for (const block of yamlBlocks) {
      // Each block must parse without throwing
      expect(() => yaml.load(block)).not.toThrow();
    }
  });

  it('playbook frontmatter has exactly the 6 Agent-Skills-spec top-level fields', () => {
    const content = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    expect(fmMatch).not.toBeNull();
    const fm = yaml.load(fmMatch[1]);
    const keys = Object.keys(fm);
    for (const k of keys) {
      expect(ALLOWED_TOP_LEVEL.has(k)).toBe(true);
    }
    // Required minimum: name + description
    expect(keys).toContain('name');
    expect(keys).toContain('description');
    expect(fm.name).toBe('pat-cross-teammate-request');
  });

  it('status-protocol playbook references the cross-teammate-request playbook', () => {
    const statusProto = fs.readFileSync(STATUS_PROTOCOL_PATH, 'utf8');
    expect(statusProto).toContain('pat-cross-teammate-request.md');
  });

  it('playbook documents the 4 routing branches (RELAY, SPAWN, PROMOTE, REJECT)', () => {
    const content = fs.readFileSync(PLAYBOOK_PATH, 'utf8');
    for (const branch of ['RELAY', 'SPAWN', 'PROMOTE', 'REJECT']) {
      expect(content).toContain(branch);
    }
  });
});

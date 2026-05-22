/**
 * WI-W4.4 (b): every v12-aliases.yaml `new:` target resolves to a real
 * agent or documented absorption target.
 *
 * For each alias entry:
 *   - type: rename | move | move_and_rename
 *       -> `new_path` must point to an existing file (typically SKILL.md)
 *   - type: absorb
 *       -> `new_path` (if present) must exist; otherwise the `new:` name
 *          must resolve to an existing agent SKILL.md somewhere in the tree
 *   - type: fold
 *       -> `new:` name must resolve to an existing agent SKILL.md
 *       -> if `mode_flag:` is set (e.g. `--review`), the new owner's
 *          SKILL.md MUST document that mode flag (string match)
 *   - type: rename_and_merge
 *       -> `new:` name must resolve to an existing agent SKILL.md
 *
 * This codifies the back-compat invariant: every legacy name a user could
 * type must land on a real, current target.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ALIAS_MAP_PATH = path.join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');

let aliasMap;

beforeAll(() => {
  aliasMap = yaml.load(fs.readFileSync(ALIAS_MAP_PATH, 'utf8'));
});

// Cache agent SKILL.md locations by leaf agent name.
let agentSkillByName = null;

function indexAgentSkills() {
  if (agentSkillByName) return agentSkillByName;
  agentSkillByName = new Map();
  // Find all SKILL.md under the 9 archetype roots, excluding ignored paths.
  const archetypes = [
    'developer',
    'operator',
    'advisor',
    'analyst',
    'creator',
    'writer',
    'strategist',
    'core',
    'leadership',
  ];
  for (const root of archetypes) {
    const rootAbs = path.join(REPO_ROOT, root);
    if (!fs.existsSync(rootAbs)) continue;
    const out = execSync(`find "${rootAbs}" -type f -name SKILL.md 2>/dev/null || true`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Leaf agent name = last directory component before SKILL.md
      const parts = trimmed.split(path.sep);
      const leaf = parts[parts.length - 2];
      if (leaf) agentSkillByName.set(leaf, trimmed);
    }
  }
  return agentSkillByName;
}

// Router fallback leaves: empty as of v12.5.0 (10 hard-cutover renames landed
// universal-planner -> planner, universal-validator -> validator, etc).
// All canonical v12 names now resolve directly to their own SKILL.md dir.
const ROUTER_FALLBACK_LEAF = {};

function resolveAgentName(name) {
  // name e.g. "cagents:tech-lead" -> "tech-lead"
  const leaf = name.startsWith('cagents:') ? name.slice('cagents:'.length) : name;
  const idx = indexAgentSkills();
  if (idx.has(leaf)) return idx.get(leaf);
  // Router fallback chain
  const fallback = ROUTER_FALLBACK_LEAF[leaf];
  if (fallback && idx.has(fallback)) return idx.get(fallback);
  return null;
}

describe('WI-W4.4 (b): every alias `new:` target resolves', () => {
  it('alias map parses', () => {
    expect(aliasMap).toBeDefined();
    expect(Array.isArray(aliasMap.aliases)).toBe(true);
  });

  it('move / move_and_rename / rename aliases: new_path points to an existing file', () => {
    const offenders = [];
    for (const a of aliasMap.aliases) {
      if (!['move', 'move_and_rename', 'rename'].includes(a.type)) continue;
      if (!a.new_path) {
        offenders.push(`${a.old} (${a.type}) missing new_path`);
        continue;
      }
      const abs = path.join(REPO_ROOT, a.new_path);
      if (!fs.existsSync(abs)) {
        offenders.push(`${a.old} (${a.type}) -> ${a.new_path} (not found)`);
      }
    }
    expect(offenders, `Unresolved alias paths:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('absorb aliases: new_path exists (when declared) and new agent resolves', () => {
    const offenders = [];
    for (const a of aliasMap.aliases) {
      if (a.type !== 'absorb') continue;
      // new_path is required for absorbs (per the schema convention used in
      // v12-aliases.yaml — both task-decomposer and prompt-engineer declare it)
      if (a.new_path) {
        const abs = path.join(REPO_ROOT, a.new_path);
        if (!fs.existsSync(abs)) {
          offenders.push(`${a.old} (absorb) -> ${a.new_path} (file not found)`);
        }
      }
      // The `new:` name should still resolve to a real agent (the absorbing one)
      const resolved = resolveAgentName(a.new);
      if (!resolved) {
        offenders.push(`${a.old} (absorb) -> ${a.new} (no agent SKILL.md found for absorbing agent)`);
      }
    }
    expect(offenders, `Absorb alias problems:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('fold / rename_and_merge aliases: new agent resolves to an existing SKILL.md', () => {
    const offenders = [];
    for (const a of aliasMap.aliases) {
      if (!['fold', 'rename_and_merge'].includes(a.type)) continue;
      const resolved = resolveAgentName(a.new);
      if (!resolved) {
        offenders.push(`${a.old} (${a.type}) -> ${a.new} (no SKILL.md found)`);
      }
    }
    expect(offenders, `Fold/merge alias problems:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('aliases with mode_flag: target SKILL.md documents the mode flag', () => {
    const offenders = [];
    for (const a of aliasMap.aliases) {
      if (!a.mode_flag) continue;
      const resolved = resolveAgentName(a.new);
      if (!resolved) {
        offenders.push(`${a.old} -> ${a.new} (target not found; cannot check mode_flag ${a.mode_flag})`);
        continue;
      }
      const content = fs.readFileSync(resolved, 'utf8');
      if (!content.includes(a.mode_flag)) {
        offenders.push(
          `${a.old} -> ${a.new} (${resolved}) does not document mode flag ${a.mode_flag}`,
        );
      }
    }
    expect(
      offenders,
      `Mode-flag documentation gaps:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every alias entry has type from the documented enum', () => {
    const VALID = new Set(['rename', 'rename_and_merge', 'move', 'move_and_rename', 'absorb', 'fold']);
    for (const a of aliasMap.aliases) {
      expect(VALID.has(a.type), `alias ${a.old} has unknown type ${a.type}`).toBe(true);
    }
  });
});

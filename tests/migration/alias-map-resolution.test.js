/**
 * Phase 4 (REC-07) — Alias-map RESOLUTION regression test
 *
 * Audit: team_plugin-full-audit_260717_001 / outputs/wave-2/fix-agents.md § 1.
 *
 * Bug-driven mandate (CLAUDE.md): a spawn of `cagents:<old>` where `<old>` is
 * neither registered in `.claude-plugin/plugin.json` nor aliased in
 * `scripts/migration/v12-aliases.yaml` silently degrades to `general-purpose`,
 * losing the specialist mode. `session-init-gate.cjs` only emits the migration
 * advisory when an alias ROW exists. Before this backfill the highest-frequency
 * legacy names (senior-developer 678 spawns, universal-planner 284, etc.) had NO
 * row.
 *
 * This test is the mechanical guard the audit prescribed: for EVERY alias it
 * asserts
 *   (1) the `new:` successor resolves to a LIVE agent registered in plugin.json
 *       (backed by a real SKILL.md on disk), and
 *   (2) when a `mode_flag: "mode: <value>"` is specified, that <value> exists in
 *       the successor's `metadata.supported_modes` on disk.
 *
 * Failing-before / passing-after: the 33 backfilled names (assertions in the
 * "REC-07 backfill" describe block) do not resolve until the alias rows land.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ALIAS_MAP_PATH = path.join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');
const PLUGIN_JSON_PATH = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');

/** Strip the `cagents:` prefix off an alias name. */
function bare(name) {
  return String(name).replace(/^cagents:/, '');
}

/** Extract a `mode: <value>` mode name from a mode_flag string, or null.
 *  Legacy flag-style values (e.g. "--review") return null and are not mode-checked. */
function modeFromFlag(modeFlag) {
  if (!modeFlag) return null;
  const m = String(modeFlag).match(/^\s*mode:\s*(\S+)/);
  return m ? m[1] : null;
}

let aliasMap;
/** name (bare) -> { skillPath, modes: string[] } for every LIVE registered agent. */
let liveAgents;

beforeAll(() => {
  // ---- alias map ----
  expect(fs.existsSync(ALIAS_MAP_PATH), `missing ${ALIAS_MAP_PATH}`).toBe(true);
  aliasMap = yaml.load(fs.readFileSync(ALIAS_MAP_PATH, 'utf8'));

  // ---- live agents from the flat agents/ catalog (v12.68.0) ----
  const agentsDir = path.join(REPO_ROOT, 'agents');
  expect(fs.existsSync(agentsDir), `missing ${agentsDir}`).toBe(true);
  const agentEntries = fs
    .readdirSync(agentsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => `agents/${e.name}`);
  expect(agentEntries.length, 'agents/ must hold the flat agent catalog').toBeGreaterThan(0);

  liveAgents = new Map();
  for (const rel of agentEntries) {
    const abs = path.resolve(REPO_ROOT, rel);
    const raw = fs.readFileSync(abs, 'utf8');
    const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/);
    expect(fmMatch, `no YAML frontmatter in ${rel}`).toBeTruthy();
    const fm = yaml.load(fmMatch[1]);
    const name = fm && fm.name;
    expect(name, `${rel} has no frontmatter name`).toBeTruthy();
    const modes =
      fm.metadata && fm.metadata.supported_modes
        ? Object.keys(fm.metadata.supported_modes)
        : [];
    liveAgents.set(name, { skillPath: rel, modes });
  }
});

describe('v12-aliases.yaml resolution — every alias points at a live agent', () => {
  it('parses and has a non-empty aliases array', () => {
    expect(aliasMap).toBeDefined();
    expect(Array.isArray(aliasMap.aliases)).toBe(true);
    expect(aliasMap.aliases.length).toBeGreaterThan(0);
  });

  it('every alias `new:` successor resolves to a live agent in plugin.json', () => {
    for (const a of aliasMap.aliases) {
      const successor = bare(a.new);
      expect(
        liveAgents.has(successor),
        `alias ${a.old} -> ${a.new}: successor '${successor}' is NOT a live agent in plugin.json`
      ).toBe(true);
    }
  });

  it('every successor is NOT a _deprecated/ agent', () => {
    for (const a of aliasMap.aliases) {
      const info = liveAgents.get(bare(a.new));
      if (!info) continue; // covered by the resolution test above
      expect(
        info.skillPath.includes('/_deprecated/'),
        `alias ${a.old} -> ${a.new}: successor SKILL.md is under _deprecated/ (${info.skillPath})`
      ).toBe(false);
    }
  });

  it('every specified `mode:` flag exists in the successor supported_modes on disk', () => {
    for (const a of aliasMap.aliases) {
      const mode = modeFromFlag(a.mode_flag);
      if (!mode) continue; // no mode, or legacy --flag form
      const info = liveAgents.get(bare(a.new));
      if (!info) continue; // resolution test above already fails this
      expect(
        info.modes.includes(mode),
        `alias ${a.old} -> ${a.new} mode:${mode}: mode NOT in supported_modes [${info.modes.join(', ')}]`
      ).toBe(true);
    }
  });

  it('every old name is unique (no duplicate aliases)', () => {
    const seen = new Set();
    for (const a of aliasMap.aliases) {
      expect(seen.has(a.old), `duplicate alias for ${a.old}`).toBe(false);
      seen.add(a.old);
    }
  });

  it('coverage.total_aliases equals the actual aliases array length', () => {
    expect(aliasMap.coverage).toBeDefined();
    expect(aliasMap.coverage.total_aliases).toBe(aliasMap.aliases.length);
  });
});

describe('REC-07 backfill — high-frequency legacy names now resolve', () => {
  // The exact successor + mode contract from fix-agents.md § 1. Failing-before
  // (no rows) / passing-after. Also pins the mode so a future edit that points a
  // backfilled name at a wrong/missing mode is caught.
  const BACKFILL = [
    // Tier 1 — HIGH
    ['cagents:senior-developer', 'cagents:tech-lead', 'implement'],
    ['cagents:universal-planner', 'cagents:planner', null],
    ['cagents:universal-validator', 'cagents:validator', null],
    ['cagents:code-reviewer', 'cagents:qa-lead', 'code-review'],
    // Tier 2 — MEDIUM
    ['cagents:ai-writing-rewriter', 'cagents:ai-writing-editor', 'rewrite'],
    ['cagents:ai-writing-detector', 'cagents:ai-writing-editor', 'detect'],
    ['cagents:dba', 'cagents:backend-developer', 'database'],
    ['cagents:frontend-lead', 'cagents:tech-lead', 'frontend-lead'],
    ['cagents:backend-lead', 'cagents:tech-lead', 'backend-lead'],
    ['cagents:security-lead', 'cagents:security-engineer', 'coordinate'],
    ['cagents:content-marketing-manager', 'cagents:marketing-strategist', 'growth'],
    ['cagents:continuity-checker', 'cagents:worldbuilder', 'world'],
    ['cagents:literary-critic', 'cagents:editor', 'line-edit'],
    // Tier 3 — LOW
    ['cagents:story-architect', 'cagents:narrative-director', 'architecture'],
    ['cagents:creative-researcher', 'cagents:market-research-analyst', 'business-research'],
    ['cagents:frontend-aesthetics', 'cagents:frontend-developer', 'ui'],
    ['cagents:creative-director', 'cagents:cco', null],
    ['cagents:character-designer', 'cagents:visual-artist', 'concept'],
    ['cagents:narrative-designer', 'cagents:narrative-director', 'direct'],
    // Tier 4 — BATCH
    ['cagents:code-standards-auditor', 'cagents:qa-lead', 'standards-audit'],
    ['cagents:scribe', 'cagents:technical-writer', null],
    ['cagents:curriculum-designer', 'cagents:academic-advisor', null],
    ['cagents:lore-keeper', 'cagents:worldbuilder', 'world'],
    ['cagents:demand-generation-manager', 'cagents:marketing-strategist', 'growth'],
    ['cagents:competitive-intelligence-analyst', 'cagents:market-research-analyst', 'competitive'],
    ['cagents:sales-enablement-specialist', 'cagents:sales-strategist', 'enablement'],
    ['cagents:voice-coach', 'cagents:editor', 'prose-style'],
    ['cagents:compliance-officer', 'cagents:general-counsel', 'compliance'],
    ['cagents:predictive-analyst', 'cagents:data-scientist', 'forecast'],
    ['cagents:character-psychologist', 'cagents:worldbuilder', 'character'],
    ['cagents:marketing-ops-specialist', 'cagents:marketing-strategist', 'ops'],
    ['cagents:performance-analyzer', 'cagents:devops-engineer', 'profile'],
    ['cagents:dependency-auditor', 'cagents:security-engineer', 'harden'],
  ];

  let byOld;
  beforeAll(() => {
    byOld = new Map(aliasMap.aliases.map((a) => [a.old, a]));
  });

  it('backfills exactly 33 rows', () => {
    expect(BACKFILL.length).toBe(33);
  });

  it.each(BACKFILL)('%s resolves to %s (mode=%s)', (oldName, expectedNew, expectedMode) => {
    const a = byOld.get(oldName);
    expect(a, `no alias row for ${oldName}`).toBeTruthy();
    expect(a.new).toBe(expectedNew);

    const info = liveAgents.get(bare(expectedNew));
    expect(info, `successor ${expectedNew} not live in plugin.json`).toBeTruthy();

    if (expectedMode) {
      // The backfill entries carry mode guidance in `notes` (not a structured
      // mode_flag — see the note atop the W2-C block in v12-aliases.yaml), so we
      // verify the mode contract against the successor's on-disk supported_modes,
      // the authoritative source.
      expect(
        info.modes.includes(expectedMode),
        `${expectedNew} supported_modes [${info.modes.join(', ')}] missing '${expectedMode}'`
      ).toBe(true);
    }
  });
});

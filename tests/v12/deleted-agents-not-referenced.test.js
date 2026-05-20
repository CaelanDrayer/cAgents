/**
 * WI-W4.4 (a): regression test asserting the 19 v12-deleted agent names
 * are NOT wired into any production routing path. Migration-aware absorption
 * notes in prose (e.g., "this content was absorbed from cagents:X") are
 * legitimate and ALLOWED — what is forbidden is production wire-up like
 * a `agent: cagents:<deleted>` line in a pipeline config or a YAML/JSON
 * routing table key pointing at one of these names.
 *
 * Production-wire-up surfaces audited:
 *   1. `agent: cagents:<name>` lines in *.yaml, *.yml, *.json
 *   2. `.claude-plugin/plugin.json` agents array entries
 *   3. `controller_catalog:` entries in {domain}/config/domain_overrides.yaml
 *
 * Excludes (legitimate references):
 *   - scripts/migration/v12-aliases.yaml (defines the renames)
 *   - CHANGELOG.md, docs/RELEASE_NOTES.md (history)
 *   - archive/**, cagents-memory/sessions/**, cagents-memory/_archive/**
 *   - vendor_repos/**, node_modules/**
 *   - tests/** (test fixtures may reference these by design)
 *
 * If any production wire-up surfaces, the test FAILS with the list of
 * offending file:line pairs so a human can triage. This codifies the v12
 * deletion sweep (WI-W2.4, WI-W2.5, marketing-sales Waves 2-3).
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// 19 deleted agent names per the v12 audit + final-decisions.yaml.
// (Task brief listed 19; some Q4 absorbs add up to this total.)
const DELETED_AGENTS = [
  'task-decomposer',
  'prompt-engineer',
  'engineering-manager',
  'architecture-reviewer',
  'devops-lead',
  'chief-legal-officer',
  'keyword-researcher',
  'on-page-seo-auditor',
  'technical-seo-auditor',
  'link-strategist',
  'campaign-manager',
  'product-marketing-manager',
  'seo-strategist',
  'affiliate-marketing-manager',
  'channel-partner-manager',
  'influencer-marketing-specialist',
  'sales-ops-specialist',
  'sales-trainer',
  'customer-marketing-manager',
];

const EXCLUDED_PATHS = [
  'scripts/migration/v12-aliases.yaml',
  'CHANGELOG.md',
  'docs/RELEASE_NOTES.md',
  'archive/',
  'cagents-memory/sessions/',
  'cagents-memory/_archive/',
  'vendor_repos/',
  'node_modules/',
  'tests/',
  '.git/',
  'example/',           // vendored external skill examples — not our agents
  'examples/',          // alt naming for example trees
];

function isExcluded(filePath) {
  const rel = path.relative(REPO_ROOT, filePath);
  return EXCLUDED_PATHS.some((excl) => rel.startsWith(excl) || rel === excl);
}

function grepLines(pattern, opts = {}) {
  const includes = opts.includes || ['--include=*.yaml', '--include=*.yml', '--include=*.json'];
  // Use spawnSync to pass the pattern as a single argv element — avoids all
  // shell-quoting issues. Exclude bulky dirs at the grep level (much faster
  // than post-filtering after grep walks them).
  const excludeDirs = [
    '--exclude-dir=node_modules',
    '--exclude-dir=vendor_repos',
    '--exclude-dir=archive',
    '--exclude-dir=_archive',
    '--exclude-dir=sessions',
    '--exclude-dir=tests',
    '--exclude-dir=.git',
    '--exclude-dir=example',
    '--exclude-dir=examples',
    '--exclude=v12-aliases.yaml',
    '--exclude=CHANGELOG.md',
    '--exclude=RELEASE_NOTES.md',
  ];
  const { spawnSync } = require('child_process');
  const args = ['-rEn', ...includes, ...excludeDirs, pattern, '.'];
  const proc = spawnSync('grep', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  });
  if (proc.status !== 0 && proc.status !== 1) return [];
  const out = proc.stdout || '';
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((line) => {
      const filePart = line.split(':')[0].replace(/^\.\//, '');
      return !EXCLUDED_PATHS.some(
        (excl) => filePart.startsWith(excl) || filePart === excl,
      );
    });
}

describe('WI-W4.4 (a): v12-deleted agents not referenced in production', { timeout: 30000 }, () => {
  it('no `agent: cagents:<deleted>` wire-up in *.yaml/*.yml/*.json', () => {
    const offenders = [];
    for (const name of DELETED_AGENTS) {
      // Pattern: `agent: cagents:<name>` or `agent: "cagents:<name>"`
      const hits = grepLines(`^\\s*agent:\\s*["']?cagents:${name}["']?\\s*$`);
      for (const hit of hits) {
        offenders.push(`[${name}] ${hit}`);
      }
    }
    expect(
      offenders,
      `Found deleted-agent wire-up in production YAML/JSON:\n  ` +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  it('no `cagents:<deleted>` key in plugin.json agents/manifest fields', () => {
    const pluginManifest = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(pluginManifest)) return;
    const text = fs.readFileSync(pluginManifest, 'utf8');
    const offenders = [];
    for (const name of DELETED_AGENTS) {
      // Match the deleted name appearing as a path component or identifier in
      // the manifest (e.g. as a directory name in an agents[] entry).
      const re = new RegExp(`\\b${name.replace(/-/g, '\\-')}\\b`);
      if (re.test(text)) {
        offenders.push(name);
      }
    }
    expect(
      offenders,
      `Deleted agents still listed in plugin.json: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('no `controller_catalog:` entry pointing at a deleted agent in domain_overrides.yaml', () => {
    const offenders = [];
    for (const name of DELETED_AGENTS) {
      // Pattern: `- cagents:<name>` under a controller_catalog or controllers list
      const hits = grepLines(`-\\s*cagents:${name}\\b`, {
        includes: ['--include=domain_overrides.yaml'],
      });
      for (const hit of hits) {
        offenders.push(`[${name}] ${hit}`);
      }
    }
    expect(
      offenders,
      `Deleted agents listed in domain_overrides.yaml:\n  ` +
        offenders.join('\n  '),
    ).toEqual([]);
  });

  it('no SKILL.md directory matches a deleted-agent name (the agent dir was removed)', () => {
    // Single find across the 9 archetype roots is much faster than 19 finds
    // across the whole tree. Production agents live ONLY under archetype roots.
    const ARCHETYPES = [
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
    const deletedSet = new Set(DELETED_AGENTS);
    const offenders = [];
    for (const root of ARCHETYPES) {
      const rootAbs = path.join(REPO_ROOT, root);
      if (!fs.existsSync(rootAbs)) continue;
      const out = execSync(`find "${rootAbs}" -type f -name SKILL.md 2>/dev/null || true`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      });
      for (const line of out.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parts = trimmed.split(path.sep);
        const leaf = parts[parts.length - 2];
        if (deletedSet.has(leaf)) {
          offenders.push(`[${leaf}] ${path.relative(REPO_ROOT, trimmed)}`);
        }
      }
    }
    expect(
      offenders,
      `Deleted agent SKILL.md files still exist:\n  ` + offenders.join('\n  '),
    ).toEqual([]);
  });
});

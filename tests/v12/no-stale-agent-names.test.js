import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// Stale agent identifier literals removed/renamed in v12.0.0 (consolidation release)
// and the v12.5.0 rename sweep. These are agent NAMES that should no longer appear
// as runtime identifiers in code/config/routing — i.e., as `cagents:<name>` plugin
// references or `core/<name>/` path references that would attempt to spawn or route
// to an agent that no longer exists.
//
// New renames extend this array. Historical-context prose explaining what changed
// (e.g., "task-decomposer was absorbed into planner in v12.0.0") is intentionally
// NOT caught by this test — that prose is legitimate and informative. We only catch
// LOAD-BEARING current-tense references (cagents:<stale> spawn calls, core/<stale>/
// path references in active config, etc).
//
// To add a new rename: append the name and its replacement to RENAMED_AGENTS.
const RENAMED_AGENTS = [
  { stale: 'universal-planner',     replacement: 'planner',   removed_in: 'v12.5.0' },
  { stale: 'universal-validator',   replacement: 'validator', removed_in: 'v12.5.0' },
  { stale: 'engineering-manager',   replacement: 'tech-lead', removed_in: 'v12.0.0' },
  { stale: 'architecture-reviewer', replacement: 'architect', removed_in: 'v12.0.0' },
  { stale: 'prompt-engineer',       replacement: 'planner',   removed_in: 'v12.0.0' },
  { stale: 'task-decomposer',       replacement: 'planner',   removed_in: 'v12.0.0' },
  { stale: 'chief-legal-officer',   replacement: 'clo',       removed_in: 'v12.0.0' },
  { stale: 'team-trigger',          replacement: null,        removed_in: 'v12.0.0' }, // inlined into /team SKILL.md
  { stale: 'team-lead-adapter',     replacement: null,        removed_in: 'v12.0.0' }  // inlined into /team SKILL.md
];

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.json', '.yaml', '.yml', '.js']);

// Directories to skip entirely — never enter
const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'archive',
  '_archive',
  '_deprecated',
  'cagents-memory',   // sessions, _archive, _knowledge — historical/runtime only
  'example',
  'outputs'           // session outputs (artifacts of past runs)
]);

// File path substrings (forward-slash normalized) that exempt a file from the scan.
// These hold historical / migration content where stale names legitimately appear,
// per the brief's exclusion list:
// CHANGELOG | RELEASE_NOTES | history | MIGRATION-V | archive | _archive
const SKIP_PATH_PATTERNS = [
  '/CHANGELOG.md',
  '/CHANGELOG-',
  'RELEASE_NOTES',
  '/docs/MIGRATION-V',
  '/docs/MIGRATION_GUIDE.md',
  '/scripts/migration/v12-aliases.yaml',
  '/docs/VERSION_REGISTRY_HISTORY',
  // The test file itself defines the literals
  '/tests/v12/no-stale-agent-names.test.js',
  // Existing per-name regression tests reference the literals in their describe blocks
  '/tests/v12/no-universal-planner-refs.test.js',
  '/tests/v12/no-universal-validator-refs.test.js',
  '/tests/v12/no-universal-router-refs.test.js',
  '/tests/v12/no-universal-executor-refs.test.js',
  '/tests/v12/no-universal-self-correct-refs.test.js',
  '/tests/v12/no-team-trigger-refs.test.js',
  '/tests/v12/no-team-lead-adapter-refs.test.js',
  '/tests/v12/no-task-consolidator-refs.test.js',
  '/tests/v12/no-task-inventory-refs.test.js',
  '/tests/v12/no-generic-coordinator-refs.test.js',
  '/tests/v12/alias-map-coverage.test.js',
  '/tests/v12/aliases-resolve.test.js',
  // REC-07 (v12.49.0): the alias-resolution regression test enumerates legacy
  // old names (incl. universal-planner/validator) in its BACKFILL contract table.
  '/tests/migration/alias-map-resolution.test.js',
  '/tests/v12/aliases-runtime-resolution.test.js',
  '/tests/v12/agent-name-registration-drift.test.js',
  '/tests/v12/deleted-agents-not-referenced.test.js',
  '/tests/v12/manifest-description-accuracy.test.js'
];

function shouldSkipPath(rel) {
  const normalized = '/' + rel.split(sep).join('/');
  return SKIP_PATH_PATTERNS.some((p) => normalized.includes(p));
}

function walk(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name), results);
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      if (!SCAN_EXTENSIONS.has(ext)) continue;
      results.push(join(dir, entry.name));
    }
  }
  return results;
}

// Build the load-bearing-reference patterns for a stale name.
// We catch references that would try to actually spawn or route to a stale agent:
//   - cagents:<name>           — plugin-namespaced subagent spawn
//   - core/<name>/             — config path reference to a now-deleted dir
//   - 'name' or "name"         — quoted-string entry in executable code/config
//                                  (active routing tables, agent registries)
function buildLoadBearingPatterns(stale, ext) {
  const escaped = stale.replace(/-/g, '\\-');
  const patterns = [
    { tag: 'cagents-prefix', re: new RegExp(`cagents:${escaped}(?![\\w-])`, 'g') },
    { tag: 'core-path',      re: new RegExp(`core/${escaped}(?=[/"'\\s])`, 'g') }
  ];
  // For executable code files (.cjs, .js), also catch quoted-string references.
  // These are how routing tables / agent registries reference agents at runtime.
  if (ext === '.cjs' || ext === '.js') {
    patterns.push({ tag: 'quoted-string', re: new RegExp(`['"]${escaped}['"]`, 'g') });
  }
  return patterns;
}

function findLoadBearingHits(content, stale, ext) {
  const patterns = buildLoadBearingPatterns(stale, ext);
  const hits = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const { tag, re } of patterns) {
      re.lastIndex = 0;
      const matches = lines[i].match(re);
      if (matches && matches.length > 0) {
        hits.push({
          line: i + 1,
          tag,
          match: matches[0],
          text: lines[i].trim().slice(0, 200)
        });
      }
    }
  }
  return hits;
}

describe('v12.x rename sweep: no load-bearing stale agent identifiers', () => {
  it('has no cagents:<stale> or core/<stale>/ references in scanned files', { timeout: 30000 }, () => {
    const files = walk(REPO_ROOT);
    const offenders = [];

    for (const filePath of files) {
      const rel = relative(REPO_ROOT, filePath);
      if (shouldSkipPath(rel)) continue;

      const ext = filePath.slice(filePath.lastIndexOf('.'));

      let content;
      try {
        content = readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      for (const { stale, replacement } of RENAMED_AGENTS) {
        const hits = findLoadBearingHits(content, stale, ext);
        for (const h of hits) {
          const fix = replacement
            ? `use cagents:${replacement} / core/${replacement}/`
            : `remove (agent was inlined / removed in v12.0.0)`;
          offenders.push(
            `${rel}:${h.line}: [${stale}] (${h.tag}) ${h.text}  ->  ${fix}`
          );
        }
      }
    }

    if (offenders.length > 0) {
      const message = `\nFound ${offenders.length} load-bearing stale agent reference(s):\n` +
        offenders.slice(0, 50).join('\n') +
        (offenders.length > 50 ? `\n... and ${offenders.length - 50} more` : '');
      throw new Error(message);
    }

    expect(offenders).toEqual([]);
  });

  it('RENAMED_AGENTS array is the canonical extension point for future renames', () => {
    expect(RENAMED_AGENTS.length).toBeGreaterThanOrEqual(9);
    for (const entry of RENAMED_AGENTS) {
      expect(entry.stale).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
      expect(entry).toHaveProperty('removed_in');
    }
  });
});

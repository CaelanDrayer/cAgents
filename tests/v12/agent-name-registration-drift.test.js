/**
 * WI-19 regression test: agent-name registration drift (docs-to-short sweep).
 *
 * After v12.0.0 collapsed several core agents (universal-* -> short forms,
 * generic-coordinator -> coordinator, task-consolidator -> task-merger,
 * task-inventory -> task-state) and absorbed others (task-decomposer +
 * prompt-engineer -> planner; team-trigger + team-lead-adapter removed),
 * the docs/rules/skills surfaces should no longer reference the long-form
 * agent names as if they were current.
 *
 * This test asserts:
 *   1. The 8 RENAME-class long-form names produce ZERO hits across
 *      CLAUDE.md, README.md, docs/, .claude/rules/, .claude/skills/
 *      (history-preserving CHANGELOG files are excluded).
 *   2. The 2 MISSING-class names (team-trigger, team-lead-adapter) appear
 *      ONLY in contextual / historical phrasing — never as if they were
 *      current spawnable agents in agent listings.
 *
 * If this test fails, run WI-19's mechanical sweep again or update the
 * exclusion list with rationale.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Files / paths excluded from the sweep: CHANGELOG (history),
// docs/CHANGELOG.md mirror, and any vendor/archive trees.
const EXCLUDED_PATHS = [
  'docs/CHANGELOG.md',
  'CHANGELOG.md',
  'archive/',
  'cagents-memory/',
  'vendor_repos/',
  'node_modules/',
  'example/',
  'tests/v12/agent-name-registration-drift.test.js',
  'scripts/migration/v12-aliases.yaml',
];

// 8 rename-class long names: each should have ZERO hits post-sweep
const RENAME_LONG_NAMES = [
  'universal-router',
  'universal-planner',
  'universal-validator',
  'universal-executor',
  'universal-self-correct',
  'generic-coordinator',
  'task-consolidator',
  'task-inventory',
];

const SEARCH_ROOTS = [
  'CLAUDE.md',
  'README.md',
  'docs',
  '.claude/rules',
  '.claude/skills',
];

function grepHits(pattern) {
  const roots = SEARCH_ROOTS.join(' ');
  try {
    const out = execSync(
      `grep -rEnIw "${pattern}" ${roots} 2>/dev/null || true`,
      { cwd: REPO_ROOT, encoding: 'utf8' }
    );
    return out
      .split('\n')
      .filter(Boolean)
      .filter((line) => !EXCLUDED_PATHS.some((excl) => line.startsWith(excl)));
  } catch {
    return [];
  }
}

describe('WI-19: agent-name registration drift', () => {
  it.each(RENAME_LONG_NAMES)(
    'long-form name %s has zero hits in docs/rules/skills (excluding CHANGELOG)',
    (longName) => {
      // docs/RELEASE_NOTES.md historical release entries legitimately name old
      // agents (universal-planner, universal-validator, task-consolidator, etc.)
      // as part of the accurate historical record — exactly like CHANGELOG.md
      // (already excluded). The sibling team-trigger / team-lead-adapter tests
      // below apply the same exemption. This is a historical-log allowance, not
      // a current-usage drift weakening.
      const hits = grepHits(longName).filter(
        (line) => !line.startsWith('docs/RELEASE_NOTES.md')
      );
      if (hits.length > 0) {
        console.error(`Unexpected hits for "${longName}":\n${hits.join('\n')}`);
      }
      expect(hits).toEqual([]);
    }
  );

  it('team-trigger appears only in contextual/historical phrasing, never as a current agent listing', () => {
    const hits = grepHits('team-trigger');
    // Each remaining hit must explicitly acknowledge removal in v12.0.0
    // by including one of: "removed", "absorbed", "no longer", "v12.0.0".
    const offending = hits.filter((line) => {
      const lower = line.toLowerCase();
      return !(
        lower.includes('removed') ||
        lower.includes('absorbed') ||
        lower.includes('no longer') ||
        lower.includes('v12.0.0') ||
        lower.includes('inline') ||
        lower.includes('inlined') ||
        lower.includes('replaces') ||
        // docs/RELEASE_NOTES.md historical entries are allowed
        line.startsWith('docs/RELEASE_NOTES.md')
      );
    });
    if (offending.length > 0) {
      console.error(`team-trigger used without v12-removal context:\n${offending.join('\n')}`);
    }
    expect(offending).toEqual([]);
  });

  it('team-lead-adapter appears only in contextual/historical phrasing, never as a current agent listing', () => {
    const hits = grepHits('team-lead-adapter');
    const offending = hits.filter((line) => {
      const lower = line.toLowerCase();
      return !(
        lower.includes('removed') ||
        lower.includes('absorbed') ||
        lower.includes('no longer') ||
        lower.includes('v12.0.0') ||
        lower.includes('inline') ||
        lower.includes('inlined') ||
        lower.includes('replaces') ||
        line.startsWith('docs/RELEASE_NOTES.md')
      );
    });
    if (offending.length > 0) {
      console.error(`team-lead-adapter used without v12-removal context:\n${offending.join('\n')}`);
    }
    expect(offending).toEqual([]);
  });
});

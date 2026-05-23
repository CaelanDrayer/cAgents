/**
 * WI-8 (v12.4.0): no orphaned cagents:{removed-agent} refs in active catalog
 *
 * For every agent culled in v12.4.0 P2 compression (moved to
 * {archetype}/_deprecated/), assert no surviving `cagents:{name}` reference
 * remains in the active cAgents/ tree.
 *
 * Excluded paths (where stale refs are allowed by convention):
 *   - CHANGELOG.md      (historical record)
 *   - docs/             (release notes, migration guides)
 *   - archive/          (historical docs)
 *   - **\/_deprecated/  (the culled agents themselves)
 *   - cagents-memory/_knowledge/agent-audit-*.md  (the audit report lists culled agents)
 *
 * Bug-driven test mandate (CLAUDE.md): this test fails if a future PR adds
 * a new reference to a culled agent's name. Catches reintroduction of stale
 * routing entries, planner catalog references, and skill prose mentions.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Discover culled agents by listing every {archetype}/_deprecated/{name}/ dir.
function discoverCulledAgents() {
  const ARCHETYPES = ['developer', 'operator', 'advisor', 'analyst', 'creator', 'writer', 'strategist', 'core', 'leadership'];
  const culled = [];
  for (const arch of ARCHETYPES) {
    const depDir = path.join(REPO_ROOT, 'agents', arch, '_deprecated');
    if (!fs.existsSync(depDir)) continue;
    for (const e of fs.readdirSync(depDir)) {
      const stat = fs.statSync(path.join(depDir, e));
      if (stat.isDirectory()) culled.push(e);
    }
  }
  return culled;
}

describe('WI-8 (v12.4.0): no orphaned cagents:{removed} refs in active tree', () => {
  it('discovers some culled agents in _deprecated/ buckets', () => {
    const culled = discoverCulledAgents();
    expect(culled.length).toBeGreaterThan(0);
  });

  it('every culled agent has no `cagents:{name}` reference in active tree', () => {
    const culled = discoverCulledAgents();
    // Single ripgrep pass with alternation. Build one regex
    // "cagents:(name1|name2|...)" so we only walk the tree once.
    const excludeArgs = [
      '--glob', '!CHANGELOG.md',
      '--glob', '!docs/**',
      '--glob', '!archive/**',
      '--glob', '!**/_deprecated/**',
      '--glob', '!cagents-memory/_knowledge/agent-audit-*.md',
      '--glob', '!cagents-memory/sessions/**',
      '--glob', '!node_modules/**',
      '--glob', '!.git/**',
      '--glob', '!scripts/migration/v12-aliases.yaml',
      '--glob', '!tests/v12/no-orphaned-cagents-refs.test.js',
    ];
    // Chunk to keep regex compile + arg list manageable (~50 per pass).
    const chunkSize = 50;
    const offenders = new Map(); // agent -> Set<file>
    for (let i = 0; i < culled.length; i += chunkSize) {
      const chunk = culled.slice(i, i + chunkSize);
      // Pattern: cagents:(name1|name2|...)\b
      const pattern = `cagents:(${chunk.join('|')})\\b`;
      const rgCheck = spawnSync('which', ['rg'], { encoding: 'utf8' });
      let result;
      if (rgCheck.status === 0) {
        result = spawnSync('rg', ['-n', '-H', '--no-heading', ...excludeArgs, pattern, '.'], {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
        });
      } else {
        result = spawnSync('grep', ['-rn', '-E', pattern, '.', '--exclude-dir=node_modules', '--exclude-dir=.git', '--exclude-dir=_deprecated', '--exclude-dir=docs', '--exclude-dir=archive', '--exclude-dir=sessions', '--exclude=CHANGELOG.md', '--exclude=v12-aliases.yaml', '--exclude=no-orphaned-cagents-refs.test.js'], {
          cwd: REPO_ROOT,
          encoding: 'utf8',
          maxBuffer: 32 * 1024 * 1024,
        });
      }
      const stdout = (result.stdout || '').trim();
      if (!stdout) continue;
      // Parse each line: "path:lineno:matched_text"
      const re = new RegExp(`cagents:(${chunk.join('|')})\\b`, 'g');
      for (const line of stdout.split('\n')) {
        if (!line) continue;
        const colonIdx = line.indexOf(':');
        if (colonIdx < 0) continue;
        const file = line.slice(0, colonIdx);
        if (file.includes('/_deprecated/') || file.includes('/agent-audit-')) continue;
        for (const m of line.matchAll(re)) {
          const agent = m[1];
          if (!offenders.has(agent)) offenders.set(agent, new Set());
          offenders.get(agent).add(file);
        }
      }
    }
    if (offenders.size > 0) {
      const list = [...offenders.entries()].map(([agent, files]) =>
        `  cagents:${agent} found in:\n    - ${[...files].join('\n    - ')}`
      ).join('\n');
      throw new Error(`Found ${offenders.size} culled agent(s) still referenced in the active tree:\n${list}`);
    }
    expect(offenders.size).toBe(0);
  }, 60000);

});

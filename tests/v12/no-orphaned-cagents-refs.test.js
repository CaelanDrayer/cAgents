/**
 * WI-8 (v12.4.0): no orphaned cagents:{removed-agent} refs in active catalog
 *
 * For every agent culled in v12.4.0 P2 compression (originally moved to
 * {archetype}/_deprecated/, archived to _archive/_deprecated_pre_v12.6/{arch}/
 * in v12.8.0), assert no surviving `cagents:{name}` reference remains in the
 * active cAgents/ tree.
 *
 * Excluded paths (where stale refs are allowed by convention):
 *   - CHANGELOG.md      (historical record)
 *   - docs/             (release notes, migration guides)
 *   - archive/          (historical docs)
 *   - _archive/         (v12.8.0 archived buckets + repo-root scratch)
 *   - **\/_deprecated/ and **\/_deprecated_pre_v12.6/  (the culled agents themselves)
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

// Discover culled agents.
// v12.8.0 (eef900a7) "streamline root" moved the per-archetype _deprecated/
// buckets to _archive/_deprecated_pre_v12.6/; that archive dir was subsequently
// removed entirely when the deprecated agents were physically deleted, so it no
// longer exists in the working tree. Alias resolution is name-based via
// plugin.json + scripts/migration/v12-aliases.yaml (never bucket SKILL.md
// files), so this helper now derives the culled/absorbed agent-name list
// directly from v12-aliases.yaml: every `old:` name that was renamed/folded/
// absorbed into a DIFFERENT `new:` target is a name that no longer exists as a
// live agent and must not appear as a hard `cagents:<old>` dispatch ref.
const ALIASES_FILE = path.join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');

// Returns { culled: string[], successor: Map<old,new> }.
// `culled` = removed old names (old != new). `successor` maps each removed
// old name to its `new:` target so the guard can exempt alias-documentation
// prose that legitimately lives inside the successor agent's own directory.
function discoverCulledAgentsWithSuccessors() {
  // Robust if the aliases file is missing: return empty (guard then no-ops).
  if (!fs.existsSync(ALIASES_FILE)) return { culled: [], successor: new Map() };
  const text = fs.readFileSync(ALIASES_FILE, 'utf8');
  // Lightweight line-pair parse of the `aliases:` list. Each entry is a
  // `- old: cagents:<x>` line followed (within the same block) by a
  // `new: cagents:<y>` line. We avoid a YAML dependency to keep the test
  // self-contained; the file is flat and machine-generated.
  const lines = text.split('\n');
  const culled = new Set();
  const successor = new Map();
  let pendingOld = null;
  for (const raw of lines) {
    const line = raw.trim();
    let m;
    if ((m = line.match(/^-?\s*old:\s*["']?cagents:([a-z0-9-]+)["']?\s*$/i))) {
      pendingOld = m[1];
    } else if (pendingOld && (m = line.match(/^new:\s*["']?cagents:([a-z0-9-]+)["']?\s*$/i))) {
      const newName = m[1];
      // Only flag genuine removals: old != new. Identity entries (`move`,
      // `vp-engineering`, etc.) keep the same name and are still live.
      if (newName !== pendingOld) {
        culled.add(pendingOld);
        successor.set(pendingOld, newName);
      }
      pendingOld = null;
    } else if (line.startsWith('- ') || /^old:/i.test(line)) {
      // A new list item started before a `new:` was seen; reset.
      pendingOld = null;
      if ((m = line.match(/^-?\s*old:\s*["']?cagents:([a-z0-9-]+)["']?\s*$/i))) {
        pendingOld = m[1];
      }
    }
  }
  return { culled: [...culled], successor };
}

function discoverCulledAgents() {
  return discoverCulledAgentsWithSuccessors().culled;
}

describe('WI-8 (v12.4.0): no orphaned cagents:{removed} refs in active tree', () => {
  it('discovers culled agents from v12-aliases.yaml (renamed/folded/absorbed)', () => {
    const culled = discoverCulledAgents();
    expect(culled.length).toBeGreaterThan(0);
  });

  it('every culled agent has no `cagents:{name}` reference in active tree', () => {
    const { culled, successor } = discoverCulledAgentsWithSuccessors();
    // Single ripgrep pass with alternation. Build one regex
    // "cagents:(name1|name2|...)" so we only walk the tree once.
    const excludeArgs = [
      '--glob', '!CHANGELOG.md',
      '--glob', '!docs/**',
      '--glob', '!archive/**',
      '--glob', '!_archive/**',
      '--glob', '!**/_deprecated/**',
      '--glob', '!**/_deprecated_pre_v12.6/**',
      // cagents-memory/ is gitignored runtime state (logs, knowledge, sessions);
      // it legitimately records historical spawns of now-culled agents.
      '--glob', '!cagents-memory/**',
      '--glob', '!node_modules/**',
      '--glob', '!.git/**',
      '--glob', '!scripts/migration/v12-aliases.yaml',
      // tests/ exercise the alias machinery itself (alias-map-coverage,
      // aliases-runtime-resolution, improve.test.mjs) and MUST mention old
      // names to assert resolution works — they are fixtures, not dispatch
      // sites. The guard protects the live routing surfaces (agents/,
      // .claude/skills/, .claude/rules/, scripts/), where a stale
      // cagents:<old> dispatch would actually mis-route at runtime.
      '--glob', '!tests/**',
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
        result = spawnSync('grep', ['-rn', '-E', pattern, '.', '--exclude-dir=node_modules', '--exclude-dir=.git', '--exclude-dir=_deprecated', '--exclude-dir=_deprecated_pre_v12.6', '--exclude-dir=_archive', '--exclude-dir=archive', '--exclude-dir=docs', '--exclude-dir=cagents-memory', '--exclude-dir=tests', '--exclude=CHANGELOG.md', '--exclude=v12-aliases.yaml'], {
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
        if (file.includes('/_deprecated/') || file.includes('/_deprecated_pre_v12.6/') || file.includes('/_archive/') || file.includes('/agent-audit-') || file.includes('/cagents-memory/')) continue;
        for (const m of line.matchAll(re)) {
          const agent = m[1];
          // Exempt alias-documentation prose that legitimately lives inside the
          // SUCCESSOR agent's own directory. When `old` was folded into `new`,
          // the new agent's SKILL.md/resources document the absorbed alias
          // ("cagents:<old> now resolves to cagents:<new>", "when prior docs
          // reference cagents:<old>, route to cagents:<new>"). That is the one
          // place the old name is supposed to appear. A hard stale dispatch
          // anywhere ELSE in the active tree still fails this guard.
          const newName = successor.get(agent);
          if (newName && file.includes(`/${newName}/`)) continue;
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

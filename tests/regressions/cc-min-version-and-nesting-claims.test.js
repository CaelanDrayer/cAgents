/**
 * Regression test for F4 (v12.74.0): stale Claude Code minimum version and
 * stale subagent nesting-depth claims.
 *
 * Bug 1: README.md, docs/GETTING_STARTED.md and the `compatibility` field of the
 *        4 SKILL.md files declared "Claude Code 2.1.69+". The delegation chain
 *        needs nested subagents (CC 2.1.172). The synchronous-spawn rules assume
 *        background-by-default subagents (CC 2.1.198).
 * Bug 2: Live docs claimed subagents nest "up to 5 levels deep" and
 *        pipeline_config.yaml set `max_nesting_depth: 5`. CC 2.1.219 changed the
 *        default: "Subagents can now spawn nested subagents up to depth 3 by
 *        default (was 1); set CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1 to disable
 *        nesting".
 *
 * Fix: one minimum version (2.1.198) in all 6 places, and depth 3 as the
 *      documented default ceiling.
 *
 * This test fails on the pre-fix tree.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const HARD_FLOOR = [2, 1, 172];

function parseVersion(v) {
  return v.split('.').map((n) => Number(n));
}

function atLeast(v, floor) {
  for (let i = 0; i < floor.length; i++) {
    if ((v[i] || 0) > floor[i]) return true;
    if ((v[i] || 0) < floor[i]) return false;
  }
  return true;
}

function minVersionSources() {
  const out = {};
  const readme = read('README.md').match(/\*\*Claude Code (\d+\.\d+\.\d+)\+\*\* \(required\)/);
  out['README.md'] = readme ? readme[1] : null;
  const gs = read('docs/GETTING_STARTED.md').match(/Requires Claude Code (\d+\.\d+\.\d+)\+/);
  out['docs/GETTING_STARTED.md'] = gs ? gs[1] : null;
  for (const skill of ['act', 'team', 'designer', 'helper']) {
    const rel = `.claude/skills/${skill}/SKILL.md`;
    const m = read(rel).match(/^compatibility:\s*"Claude Code >= (\d+\.\d+\.\d+)"/m);
    out[rel] = m ? m[1] : null;
  }
  return out;
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, acc);
    } else if (entry.name.endsWith('.md')) {
      acc.push(full);
    }
  }
  return acc;
}

const HISTORY_DOCS = new Set(['CHANGELOG.md', 'RELEASE_NOTES.md', 'ARCHITECTURE-HISTORY.md']);

function liveDocs() {
  const files = [path.join(ROOT, 'CLAUDE.md')];
  walk(path.join(ROOT, '.claude', 'rules'), files);
  walk(path.join(ROOT, '.claude', 'skills'), files);
  walk(path.join(ROOT, 'agents'), files);
  for (const f of walk(path.join(ROOT, 'docs'))) {
    if (!HISTORY_DOCS.has(path.basename(f))) files.push(f);
  }
  return files;
}

describe('F4: Claude Code minimum version is declared once, consistently', () => {
  it('README, GETTING_STARTED and the 4 SKILL.md compatibility fields state the same version', () => {
    const sources = minVersionSources();
    const missing = Object.entries(sources).filter(([, v]) => v === null).map(([k]) => k);
    expect(missing, `No minimum version found in: ${missing.join(', ')}`).toEqual([]);
    const distinct = [...new Set(Object.values(sources))];
    expect(distinct, `Minimum versions differ: ${JSON.stringify(sources)}`).toHaveLength(1);
  });

  it('the declared minimum is at or above the nested-subagent floor (2.1.172)', () => {
    const [version] = Object.values(minVersionSources());
    expect(version).toBeTruthy();
    expect(atLeast(parseVersion(version), HARD_FLOOR), `Declared minimum ${version} < 2.1.172`).toBe(true);
  });
});

describe('F4.nesting_depth: no live doc claims a depth-5 default', () => {
  it('no live doc says "5 levels deep" or "max_nesting_depth: 5"', () => {
    const offenders = [];
    for (const file of liveDocs()) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/5 levels deep/i.test(line) || /max_nesting_depth:\s*5\b/.test(line)) {
          offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
        }
      });
    }
    expect(offenders, `Stale depth-5 claims:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('pipeline_config.yaml max_nesting_depth is 3 or less', () => {
    const cfg = read('cagents-memory/_system/config/pipeline_config.yaml');
    const m = cfg.match(/^max_nesting_depth:\s*(\d+)/m);
    expect(m, 'max_nesting_depth missing from pipeline_config.yaml').not.toBeNull();
    expect(Number(m[1])).toBeLessThanOrEqual(3);
  });
});

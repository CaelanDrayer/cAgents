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
 * v12.74.1 extension: the depth-3 fix missed other live surfaces. The
 * graceful-degradation playbook still said "depths 1-4" on "CC 2.1.172+". A
 * hook comment said "up to 5 levels deep" across two comment lines. Two
 * scripts said Claude Code scans agents/ "non-recursively". It scans plugin
 * agents/ recursively. cAgents registers agents through the plugin.json
 * "agents" array, so nested .md files are not agents. The extended tests scan
 * live docs, .claude/hooks/*.cjs and scripts/ for these claims.
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

function walk(dir, acc = [], exts = ['.md']) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(full, acc, exts);
    } else if (exts.some((e) => entry.name.endsWith(e))) {
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

// Live docs plus executable surfaces: hooks and scripts.
function liveSurfaces() {
  const files = liveDocs();
  const hooksDir = path.join(ROOT, '.claude', 'hooks');
  for (const name of fs.readdirSync(hooksDir)) {
    if (name.endsWith('.cjs')) files.push(path.join(hooksDir, name));
  }
  walk(path.join(ROOT, 'scripts'), files, ['.cjs', '.sh', '.js']);
  return files;
}

function lineOffenders(files, re) {
  const offenders = [];
  for (const file of files) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (re.test(line)) offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
    });
  }
  return offenders;
}

// Remove comment markers and join lines, so a phrase split across two
// comment lines still matches.
function joinedText(src) {
  return src
    .split('\n')
    .map((l) => l.replace(/^\s*(\/\/+|#+|\*+|\/\*+|>+)\s?/, ''))
    .join(' ')
    .replace(/\s+/g, ' ');
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

  it('no live surface says "depth(s) 1-4"', () => {
    const offenders = lineOffenders(liveSurfaces(), /depths? 1\s*[–-]\s*4/i);
    expect(offenders, `Stale depth 1-4 claims:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no live surface says "up to 5 ... levels/deep" on one line', () => {
    const offenders = lineOffenders(liveSurfaces(), /\bup to 5\b[^\n]*\b(levels|deep)/i);
    expect(offenders, `Stale up-to-5 claims:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no live surface says "up to 5 levels deep" split across lines', () => {
    const offenders = liveSurfaces()
      .filter((f) => /up to 5 levels deep/i.test(joinedText(fs.readFileSync(f, 'utf8'))))
      .map((f) => path.relative(ROOT, f));
    expect(offenders, `Stale split up-to-5 claims:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no live surface claims agents/ is scanned non-recursively', () => {
    const re = /scanned non-recursively|non-recursive scan/i;
    const files = liveSurfaces();
    for (const rel of ['scripts/validate_agent.cjs', 'scripts/package-plugin.sh']) {
      expect(files, `${rel} must be in the scanned set`).toContain(path.join(ROOT, rel));
    }
    const offenders = lineOffenders(files, re);
    expect(offenders, `Stale non-recursive scan claims:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('no live surface ties default nesting behavior to CC 2.1.172', () => {
    // 2.1.172 introduced nesting. The depth-3 default dates from 2.1.219, and
    // 2.1.217-2.1.218 turn nesting off by default. Text is joined across lines
    // so a claim split over two lines still matches. A window that also names
    // 2.1.219 is accurate and is skipped.
    const forward = /(?:≥|>=|&gt;=)?\s*2\.1\.172\+?[^.]{0,80}?(by default|retains|keeps|ships deep|deep (subagent )?nesting)/gi;
    const reverse = /(by default|retains?|keeps?|nesting budget)[^.]{0,40}?(?:CC|Claude Code)\s*(?:≥|>=|&gt;=)\s*2\.1\.172/gi;
    const offenders = [];
    for (const file of liveSurfaces()) {
      const text = joinedText(fs.readFileSync(file, 'utf8'));
      for (const re of [forward, reverse]) {
        for (const m of text.matchAll(re)) {
          const window = text.slice(m.index, m.index + m[0].length + 40);
          if (!window.includes('2.1.219')) offenders.push(`${path.relative(ROOT, file)}: "${m[0].trim()}"`);
        }
      }
    }
    expect(offenders, `Default nesting tied to 2.1.172:\n${offenders.join('\n')}`).toEqual([]);
  });
});

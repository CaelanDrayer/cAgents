import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Drift guard: a removed skill or agent name must not return to an
 * instruction file as a live instruction.
 *
 * Removed names (see scripts/migration/v12-aliases.yaml and
 * .claude/skills/_MODE_REGISTRY.md):
 *   - /org      -> /team strategic mode (v12.2.0)
 *   - /improve  -> /act keyword router (v12.1.2)
 *   - /run      -> /act (v12.66.0)
 *   - TeamCreate, TeamDelete -> removed in Claude Code 2.1.178
 *   - task-decomposer -> absorbed into planner (v12.0.0)
 *   - security-specialist -> security-engineer
 *
 * Origin: session act_streamline-cleanup-plugin_261111_001, WI-35. The
 * WI-32/33/34 sweeps fixed the stale instructions and kept the history lines.
 * This test stops a stale instruction from coming back.
 *
 * Rule: every line in scope that names a removed name must be a history
 * note. A history note carries a history phrase from ALLOW_PATTERNS on the
 * same line (WINDOW is 0). A wrapped line whose phrase is on the line before
 * goes in the short ALLOW_LINES list. Anything else is a violation, printed
 * as path:line.
 */

const ROOT = process.cwd();

// Instruction surface: skill files, flat agent files, rules.
const SCAN = [
  { dir: '.claude/skills', recursive: true },
  { dir: 'agents', recursive: false },
  { dir: '.claude/rules', recursive: true },
];

// Removed names, as slash commands or as tool/agent names.
// A slash command must stand alone: `/run/` (a path) and `npm run` do not match.
const STALE_RE =
  /(^|[^A-Za-z0-9_./-])\/(org|improve|run)(?![A-Za-z0-9_/-])|\b(TeamCreate|TeamDelete|task-decomposer|security-specialist)\b/;

// Allow markers. Each one is a general history marker, not a per-file
// exception. Seeded from the keep rows of stale-WI-32.tsv and stale-WI-33.tsv.
export const ALLOW_PATTERNS = [
  /\babsorb(ed|s)\b/i, // "absorbed into", "absorbed from", "absorbs /org"
  /\bfolded into\b/i,
  /\blegacy `?\/(org|improve|run)\b/i, // "the legacy /org"
  /\bformerly\b|\bpreviously\b|\bcarried the name\b/i,
  /\bremoved\b|\bno longer\b|\bdeprecated\b/i,
  /\bpre-v1[0-2]\b/i, // "pre-v12 names"
  /\brenamed (to|from)\b/i,
  /\breplaced (by|with)\b|\bwas replaced\b|\breplaces `?\/(act|team|org|improve|run)\b/i,
  /\bfold(s|ed) `?\/(org|improve|run)`? into\b/i, // "folds `/improve` into"
  /\bmoved into `?\/(act|team|improve)\b/i, // "had moved into `/improve`"
  /\b(is|are|was|were) \*{0,2}historical\b/i, // "this reference is historical"
  // A release tag counts only inside a history phrase.
  /\b(in|since|as of|before|until|from|after|through) [vV]1[0-2](\.\d+)*\b/i, // "removed in v12.2.0"
  /\b[vV]1[0-2](\.\d+)* `?\/(org|improve|run)\b/, // "the V11.0 `/improve` surface"
  /\b[vV]1[0-2](\.\d+)+ (also )?(introduced|added|removed|folded|absorbed|shipped)\b/, // "V10.26.33 also introduced"
  /^\s*[-*] \*{0,2}[vV]?\d+\.\d+\.\d+\b/, // a dated changelog bullet
  /\bno `?Team(Create|Delete)`?/, // "no TeamDelete call"
  /\bdo not call\b|\bdoes not depend on\b|\bno separate\b|\bnot produce\b|\bequivalent of\b/i, // a negation or an old-to-new comparison
  /(->|→|\|)\s*`?\/(act|team)\b/, // an old -> new mapping row
  // A migration table row: a retired command in the first cell, its successor next.
  /^\|\s*`?\/(review|optimize|context|debug|org|improve|run)\b[^|]*\|\s*`?\/(act|team|improve)\b/,
];

// True history lines whose history phrase sits on the line before (prose
// wrap). The window is 0, so the matcher cannot see that phrase. Each entry
// matches by path and by a fragment of the line content, not by line number.
// Keep this list short: prefer a history phrase in ALLOW_PATTERNS.
export const ALLOW_LINES = [
  { path: '.claude/skills/helper/reference/command-details.md', text: 'situations that called for `/org` earlier' },
  { path: '.claude/skills/helper/reference/recommendation-engine.md', text: '`/improve` skill to invoke.' },
  { path: '.claude/rules/core/orchestration.md', text: 'prefixes /org, /review, /optimize, and /debug stay for archived-session' },
  { path: '.claude/rules/core/orchestration.md', text: '`TeamDelete` tool, so there is nothing to create and nothing to delete' },
  { path: '.claude/rules/core/resources/hook-catalog.md', text: '> `TeamCreate` and `TeamDelete`. The `TeammateIdle` and `TaskCompleted` hooks' },
  { path: '.claude/rules/core/teams.md', text: '`TeamCreate` and `TeamDelete` were' },
  { path: '.claude/rules/core/teams.md', text: '`TeamDelete` cleaned one up.' },
];

// Same line only. A 2-line window let 13.7 percent of planted stale lines
// pass (WI-35 round-1 review, S2-01).
export const WINDOW = 0;

function walk(root, dir, recursive) {
  const out = [];
  const full = join(root, dir);
  if (!existsSync(full)) return out;
  for (const entry of readdirSync(full)) {
    const p = join(full, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (recursive) out.push(...walk(root, join(dir, entry), recursive));
    } else if (entry.endsWith('.md')) out.push(p);
  }
  return out;
}

function isAllowed(line) {
  return ALLOW_PATTERNS.some((re) => re.test(line));
}

/** Returns the 1-based line numbers of live stale references in `text`. */
export function findStaleRefs(text) {
  const lines = text.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!STALE_RE.test(lines[i])) continue;
    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(lines.length - 1, i + WINDOW);
    let allowed = false;
    for (let j = lo; j <= hi && !allowed; j++) allowed = isAllowed(lines[j]);
    if (!allowed) hits.push(i + 1);
  }
  return hits;
}

function isAllowListed(rel, line) {
  return ALLOW_LINES.some((e) => e.path === rel && line.includes(e.text));
}

/** Scans every file under `root` in the instruction surface. Returns path:line strings. */
export function scanTree(root = ROOT) {
  const violations = [];
  for (const { dir, recursive } of SCAN) {
    for (const file of walk(root, dir, recursive)) {
      const text = readFileSync(file, 'utf8');
      const rel = relative(root, file);
      const lines = text.split('\n');
      for (const n of findStaleRefs(text)) {
        if (isAllowListed(rel, lines[n - 1])) continue;
        violations.push(`${rel}:${n}`);
      }
    }
  }
  return violations;
}

describe('skill-refs-current: removed skill and agent names stay out of instructions', () => {
  it('the instruction surface has no live reference to a removed name', () => {
    const violations = scanTree();
    if (violations.length) console.log(`Stale references:\n${violations.join('\n')}`);
    expect(violations).toEqual([]);
  });

  it('a planted stale instruction is detected', () => {
    const planted = ['# Planning', '', 'Some current text about /act.', '', 'Use /org to plan.', ''].join('\n');
    expect(findStaleRefs(planted)).toEqual([5]);
    expect(findStaleRefs('Spawn task-decomposer first.')).toHaveLength(1);
    expect(findStaleRefs('Call TeamCreate to start.')).toHaveLength(1);
  });

  // Each phrase holds a broad word that the round-1 allow list accepted
  // (migrate, replace, legacy, history, earlier, a bare release tag).
  it.each([
    'Use /run to migrate the database.',
    'Run /improve to replace stale code.',
    'Spawn security-specialist for the audit (see v12.3.0).',
    'Call TeamCreate, then the legacy cleanup.',
    'Use /org for history questions.',
    'Use /org earlier in the flow.',
    'Spawn task-decomposer to split the request into work items.',
    'Call TeamDelete after the last wave to release the team.',
    'Run /org --dry-run before /team to preview the brief.',
  ])('a stale instruction with a broad word is detected: %s', (line) => {
    expect(findStaleRefs(line)).toEqual([1]);
  });

  it('a history phrase on a neighbor line does not hide a stale instruction', () => {
    const text = ['v12.2.0 removed /org.', 'Use /org to plan.', 'The legacy flow was replaced by /team.'].join('\n');
    expect(findStaleRefs(text)).toEqual([2]);
  });

  it('each ALLOW_LINES entry still matches a stale-name line in its file', () => {
    for (const { path, text } of ALLOW_LINES) {
      const lines = readFileSync(join(ROOT, path), 'utf8').split('\n');
      const hit = lines.find((l) => l.includes(text));
      expect(hit, `${path}: ${text}`).toBeDefined();
      expect(STALE_RE.test(hit), `${path}: ${text}`).toBe(true);
    }
  });

  it('history lines, paths, and npm commands are not violations', () => {
    expect(findStaleRefs('v12.2.0 absorbed /org into /team strategic mode.')).toHaveLength(0);
    expect(findStaleRefs('| `/improve --mode review X` | `/act review X` |')).toHaveLength(0);
    expect(findStaleRefs('There is no TeamDelete call.')).toHaveLength(0);
    expect(findStaleRefs('Run npm run test and read /run/user/1000.')).toHaveLength(0);
    expect(findStaleRefs('`/org` was removed in v12.2.0 and folded into /team.')).toHaveLength(0);
    expect(findStaleRefs('| `/review <target>` | `/improve --mode review <target>` |')).toHaveLength(0);
    expect(findStaleRefs('The mode flags from the V11.0 `/improve` surface carry through.')).toHaveLength(0);
  });
});

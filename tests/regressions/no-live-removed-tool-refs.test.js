import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

/**
 * Regression test: no live instruction tells an agent to call a removed or
 * gated Claude Code tool.
 *
 * Citations (Claude Code CHANGELOG):
 *   - 2.1.178: removed the `TeamCreate` and `TeamDelete` tools.
 *   - 2.1.277: removed the deprecated `TaskOutput` tool.
 *   - 2.1.233 / 2.1.268: the task-tracking tools (TaskCreate/Get/Update/List,
 *     TodoWrite) are off by default on Opus 4.8, Sonnet 5, Fable 5, and newer
 *     models unless CLAUDE_CODE_ENABLE_TODO_TOOLS=1.
 *
 * Bug (finding F3, session act_cc-changelog-compat_261011_001): 85+ lines told
 * agents to call TodoWrite as a BLOCKING prerequisite, and CLAUDE.md made
 * TaskCreate an unconditional mandate. On a current model neither tool exists,
 * so the mandate could not be met.
 *
 * Rule: every line in scope that names one of these tools must be a
 * historical note. A historical note carries a marker word on the same line,
 * or within 2 lines of it (prose wraps). Anything else is a live instruction.
 */

const ROOT = process.cwd();

const SCAN_DIRS = ['agents', '.claude/skills', '.claude/rules', 'docs/templates'];
const SCAN_FILES = ['CLAUDE.md'];

const TOOL_RE = /\b(TodoWrite|TeamCreate|TeamDelete|TaskOutput)\b/;

// A marker word that shows the reference is historical or a "do not call" note.
const MARKER_RE =
  /removed|deprecated|legacy|historical|no longer|do not call|not call|gated|unavailable|not available|implicit|\bno `?(TeamCreate|TeamDelete)`?\b|\bno `?TeamCreate`? (step|call)|nothing to create/i;

const WINDOW = 2;

function walk(dir) {
  const out = [];
  const full = join(ROOT, dir);
  if (!existsSync(full)) return out;
  for (const entry of readdirSync(full)) {
    const p = join(full, entry);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) out.push(...walk(join(dir, entry)));
    else if (entry.endsWith('.md')) out.push(p);
  }
  return out;
}

export function findLiveRefs(text) {
  const lines = text.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    if (!TOOL_RE.test(lines[i])) continue;
    const lo = Math.max(0, i - WINDOW);
    const hi = Math.min(lines.length - 1, i + WINDOW);
    let marked = false;
    for (let j = lo; j <= hi; j++) {
      if (MARKER_RE.test(lines[j])) {
        marked = true;
        break;
      }
    }
    if (!marked) hits.push({ lineNo: i + 1, line: lines[i].trim().slice(0, 160) });
  }
  return hits;
}

describe('no live references to removed or gated Claude Code tools', () => {
  const files = [
    ...SCAN_DIRS.flatMap((d) => walk(d)),
    ...SCAN_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
  ];

  it('finds files to scan', () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it('flags an unmarked live instruction (detector self-test)', () => {
    const live = 'Call TodoWrite before you spawn.\n\n\n\nnext';
    expect(findLiveRefs(live)).toHaveLength(1);
    const hist = 'TeamCreate was removed in 2.1.178. Do not call it.';
    expect(findLiveRefs(hist)).toHaveLength(0);
  });

  it('every TodoWrite/TeamCreate/TeamDelete/TaskOutput line is a historical note', () => {
    const violations = [];
    for (const f of files) {
      for (const h of findLiveRefs(readFileSync(f, 'utf8'))) {
        violations.push(`  ${relative(ROOT, f)}:${h.lineNo}: ${h.line}`);
      }
    }
    if (violations.length) {
      throw new Error(
        `Found ${violations.length} live reference(s) to removed or gated tools. ` +
          `Rewrite them (task tools when available, else session files), or mark them historical:\n` +
          violations.join('\n'),
      );
    }
    expect(violations).toEqual([]);
  });
});

describe('CLAUDE.md TaskCreate mandate is conditional on tool availability', () => {
  const md = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const start = md.indexOf('## CRITICAL: Task Lifecycle');
  const end = md.indexOf('\n## ', start + 5);
  const section = start >= 0 ? md.slice(start, end > 0 ? end : undefined) : '';

  it('has the Task Lifecycle section', () => {
    expect(section.length).toBeGreaterThan(0);
  });

  it('states the mandate applies only when TaskCreate is available', () => {
    expect(section).toMatch(/when `?TaskCreate`? is available/i);
  });

  it('gives a session-file fallback and forbids blocking on a missing tool', () => {
    expect(section).toMatch(/CLAUDE_CODE_ENABLE_TODO_TOOLS/);
    expect(section).toMatch(/status\.yaml|coordination_log\.yaml/);
    expect(section).toMatch(/never stop or block/i);
  });

  it('keeps the "name the TASK, not the SPAWN" guidance', () => {
    expect(section).toMatch(/name the TASK, not the SPAWN/);
  });
});

/**
 * Review B-2 (session act_cc-changelog-compat_261011_001): controller agents
 * still said "MANDATORY: Call TaskCreate" or "This is not optional." with no
 * availability condition. On Opus 4.8+ without CLAUDE_CODE_ENABLE_TODO_TOOLS=1
 * that mandate cannot be met. A line that pairs TaskCreate with MANDATORY or
 * "not optional" must carry an availability qualifier on the same line or an
 * adjacent line.
 */
const MANDATE_DIRS = ['agents', '.claude/skills', '.claude/rules'];
const MANDATE_RE = /MANDATORY|not optional/i;
const QUALIFIER_RE = /\b(when|if)\b[^.\n]{0,40}\bavailable\b|CLAUDE_CODE_ENABLE_TODO_TOOLS/i;

export function findUnqualifiedTaskCreateMandates(text) {
  const lines = text.split('\n');
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!/\bTaskCreate\b/.test(l) || !MANDATE_RE.test(l)) continue;
    const lo = Math.max(0, i - 1);
    const hi = Math.min(lines.length - 1, i + 1);
    let qualified = false;
    for (let j = lo; j <= hi; j++) {
      if (QUALIFIER_RE.test(lines[j])) {
        qualified = true;
        break;
      }
    }
    if (!qualified) hits.push({ lineNo: i + 1, line: l.trim().slice(0, 160) });
  }
  return hits;
}

describe('no unconditional TaskCreate mandate (review B-2)', () => {
  const files = MANDATE_DIRS.flatMap((d) => walk(d));

  it('detector self-test: flags the pre-fix wording, passes the qualified wording', () => {
    const bad = '4. **MANDATORY: Call TaskCreate after identifying execution agents**';
    expect(findUnqualifiedTaskCreateMandates(bad)).toHaveLength(1);
    const bad2 = 'you MUST call TaskCreate to give the user visibility. This is not optional.';
    expect(findUnqualifiedTaskCreateMandates(bad2)).toHaveLength(1);
    const ok = 'MANDATORY: use TaskCreate when it is available; otherwise use coordination_log.yaml.';
    expect(findUnqualifiedTaskCreateMandates(ok)).toHaveLength(0);
    const okAdjacent = 'MANDATORY: Call TaskCreate.\nSkip this if the task tools are not available.';
    expect(findUnqualifiedTaskCreateMandates(okAdjacent)).toHaveLength(0);
  });

  it('every TaskCreate + MANDATORY/"not optional" line has an availability qualifier', () => {
    const violations = [];
    for (const f of files) {
      for (const h of findUnqualifiedTaskCreateMandates(readFileSync(f, 'utf8'))) {
        violations.push(`  ${relative(ROOT, f)}:${h.lineNo}: ${h.line}`);
      }
    }
    if (violations.length) {
      throw new Error(
        `Found ${violations.length} unconditional TaskCreate mandate(s). Add "when TaskCreate is ` +
          `available; otherwise record it in a session file and continue":\n` +
          violations.join('\n'),
      );
    }
    expect(violations).toEqual([]);
  });
});

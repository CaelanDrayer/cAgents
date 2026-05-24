import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.1.7 TodoWrite -> TaskCreate sweep.
 *
 * Per docs.claude.com/docs/en/tools.md, TodoWrite is the Agent SDK / non-interactive
 * equivalent of TaskCreate/TaskUpdate/TaskList/TaskGet. cAgents primarily runs in
 * interactive Claude Code sessions, so SKILL.md prompt bodies MUST NOT contain
 * imperative runtime instructions like "call TodoWrite", "use TodoWrite", or
 * "MUST.*TodoWrite" without contextualizing as SDK-only.
 *
 * Allowed: TodoWrite mentions when contextualized as "(SDK only)", "in SDK",
 * "Agent SDK", or as part of comparative documentation. Allowed-tools declarations
 * may also include TodoWrite for SDK fallback.
 *
 * Disallowed: imperative runtime instructions in body text.
 */

const ROOT = process.cwd();
// v12.8.0 (eef900a7) moved the 9 archetype roots under agents/.
const SCAN_DIRS = [
  '.claude/skills',
  'agents/developer',
  'agents/operator',
  'agents/advisor',
  'agents/analyst',
  'agents/creator',
  'agents/writer',
  'agents/strategist',
  'agents/core',
  'agents/leadership',
];

// Imperative patterns that should not appear in agent/skill prompt bodies
// without SDK contextualization
const FORBIDDEN_PATTERNS = [
  /\bcall TodoWrite\b/i,
  /\buse TodoWrite\b/i,
  /\bMUST\s+(?:call|use|invoke|run)\s+TodoWrite\b/i,
];

// Allowed contexts (case-insensitive substring matches per line)
// If any of these appears on the same line as a "forbidden" pattern,
// the line is allowed.
const ALLOWED_CONTEXTS = [
  '(sdk only)',
  'sdk fallback',
  'agent sdk',
  'in sdk',
  'or todowrite in sdk',
  'todowrite is the',     // comparative documentation
  'todowrite remains valid', // comparative documentation
  'sdk equivalent',
  'sdk / non-interactive',
  'or todowrite (sdk)',
];

function findSkillFiles(dir) {
  const results = [];
  const fullDir = join(ROOT, dir);
  let entries;
  try {
    entries = readdirSync(fullDir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const fullPath = join(fullDir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      results.push(...findSkillFiles(join(dir, entry)));
    } else if (entry === 'SKILL.md') {
      results.push(fullPath);
    }
  }
  return results;
}

function extractBody(content) {
  // Strip YAML frontmatter (between leading --- and next ---)
  if (!content.startsWith('---')) return content;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return content;
  return content.slice(end + 4);
}

function hasAllowedContext(line) {
  const lc = line.toLowerCase();
  return ALLOWED_CONTEXTS.some((ctx) => lc.includes(ctx));
}

describe('No TodoWrite runtime instructions in SKILL.md bodies', () => {
  const allFiles = SCAN_DIRS.flatMap((d) => findSkillFiles(d));

  it('finds SKILL.md files to scan', () => {
    expect(allFiles.length).toBeGreaterThan(50);
  });

  it('no SKILL.md prompt body contains imperative TodoWrite runtime instructions', () => {
    const violations = [];
    for (const file of allFiles) {
      const content = readFileSync(file, 'utf8');
      const body = extractBody(content);
      const lines = body.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.test(line) && !hasAllowedContext(line)) {
            violations.push({
              file: file.replace(ROOT + '/', ''),
              lineNo: i + 1,
              line: line.trim().slice(0, 200),
              pattern: pattern.source,
            });
          }
        }
      }
    }
    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}:${v.lineNo} (matches /${v.pattern}/): ${v.line}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} imperative TodoWrite reference(s) in SKILL.md bodies. ` +
          `Use TaskCreate/TaskUpdate for interactive Claude Code, or contextualize TodoWrite ` +
          `as SDK-only:\n${msg}`,
      );
    }
    expect(violations).toEqual([]);
  });
});

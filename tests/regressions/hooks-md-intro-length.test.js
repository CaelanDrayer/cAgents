import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.12 (Q-007 / F-hooks-003).
 *
 * Bug: hooks.md intro paragraph (first non-heading prose after the
 *      "# cAgents Hook System" h1) duplicates the Hook Types Overview
 *      table beneath it. Every hook add/remove requires editing the
 *      intro prose AND the table, creating a drift surface.
 * Root cause: intro evolved into a 540-char enumeration over many
 *      versions instead of staying a 2-line summary. No regression
 *      test enforced an upper bound on intro prose length.
 * Test added: this file. Locates the intro paragraph (the first
 *      non-heading prose block after the Architecture section) and
 *      asserts it stays under 250 chars (cap that catches re-bloat
 *      regression without blocking legitimate intro evolution).
 *
 * Failing-before evidence: at HEAD (v11.2.11), this test FAILS because
 *      the intro is ~900+ chars enumerating every hook-event tuple
 *      already listed in the Hook Types Overview table below.
 * Passing-after evidence: after replacing the intro paragraph with
 *      the 2-line summary directing readers to the table, intro
 *      is well under the 250-char threshold.
 */

const ROOT = process.cwd();
const HOOKS_MD_PATH = join(ROOT, '.claude', 'rules', 'core', 'hooks.md');
const INTRO_MAX_CHARS = 250;

/**
 * Extract the intro paragraph from hooks.md.
 *
 * Defined as: the first non-empty, non-heading, non-frontmatter prose
 * block. We scan past:
 *   - YAML frontmatter (between `---` markers)
 *   - The "# cAgents Hook System" h1 heading
 *   - Blank lines
 * The intro paragraph is the next contiguous block of non-blank,
 * non-heading lines. Returns the joined text (single string).
 */
function extractIntroParagraph(content) {
  const lines = content.split('\n');
  let i = 0;

  // Skip YAML frontmatter if present.
  if (lines[0] && lines[0].trim() === '---') {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '---') {
      i++;
    }
    // skip closing '---'
    if (i < lines.length) i++;
  }

  // Skip blank lines and headings until we find the first prose line.
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      i++;
      continue;
    }
    break;
  }

  // Collect contiguous non-blank, non-heading lines.
  const paragraphLines = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) {
      break;
    }
    paragraphLines.push(line);
    i++;
  }

  return paragraphLines.join(' ').trim();
}

describe('hooks-md-intro-length: intro paragraph stays a 2-line summary', () => {
  it('hooks.md exists', () => {
    expect(existsSync(HOOKS_MD_PATH)).toBe(true);
  });

  it('intro paragraph is extractable (non-empty)', () => {
    const content = readFileSync(HOOKS_MD_PATH, 'utf8');
    const intro = extractIntroParagraph(content);
    expect(intro.length).toBeGreaterThan(0);
  });

  it(`intro paragraph is under ${INTRO_MAX_CHARS} chars (no enumeration bloat)`, () => {
    const content = readFileSync(HOOKS_MD_PATH, 'utf8');
    const intro = extractIntroParagraph(content);
    if (intro.length >= INTRO_MAX_CHARS) {
      throw new Error(
        `hooks.md intro paragraph is ${intro.length} chars (max ${INTRO_MAX_CHARS}). ` +
          `Intro should be a 2-line summary, not duplicate the Hook Types Overview table. ` +
          `Current intro starts: "${intro.slice(0, 120)}..."`,
      );
    }
    expect(intro.length).toBeLessThan(INTRO_MAX_CHARS);
  });

  it('intro paragraph does not enumerate per-event hook details (no [Matcher] tuples)', () => {
    const content = readFileSync(HOOKS_MD_PATH, 'utf8');
    const intro = extractIntroParagraph(content);
    // Enumeration smell: phrases like "PreToolUse[Bash]" or "PreToolUse[Write|Edit]"
    // inline in the intro indicate it's duplicating the table.
    const tuplePattern = /(?:PreToolUse|PostToolUse|UserPromptSubmit|SessionStart|SessionEnd)\[[^\]]+\]/;
    const match = intro.match(tuplePattern);
    if (match) {
      throw new Error(
        `hooks.md intro contains per-event tuple "${match[0]}" — this is enumeration that belongs in the table, not the intro.`,
      );
    }
    expect(match).toBeNull();
  });
});

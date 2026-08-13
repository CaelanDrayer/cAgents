import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.10 (Q-005 / F-skills-001).
 *
 * Bug: The /act skill and rules/core/skill-format.md advertise two flags —
 *      `--from-review` and `--from-designer` — in argument-hint, body parser,
 *      reference/flags.md, reference/strategic-brief-integration.md, and the
 *      "Skill Chaining (V10.18.0)" section of skill-format.md. The underlying
 *      `output_contract` / `input_from` skill-chaining feature was tagged
 *      ASPIRATIONAL in skill-format.md and never implemented. No skill declares
 *      `output_contract` or `input_from` frontmatter blocks. The two flags
 *      silently no-op'd at runtime — dead-end advertisements.
 *
 * Root cause: V10.18.0 designed the chaining pattern and added flag
 *      advertisements assuming implementation would follow. Implementation
 *      never landed. No regression test guarded against advertising flags
 *      whose underlying feature was tagged ASPIRATIONAL.
 *
 * Test added: this file. Scans the three /act views and skill-format.md and
 *      asserts no occurrence of `--from-review` or `--from-designer`. The test
 *      will fail if anyone re-adds these flag advertisements without re-adding
 *      the underlying implementation.
 *
 * Failing-before evidence: at HEAD (v11.2.9), this test FAILS — the four
 *      scanned files contain multiple occurrences of both tokens.
 * Passing-after evidence: after Q-005 removes the advertisements, none of the
 *      four files contain either token.
 *
 * Future work: if the output_contract / input_from chaining pattern is
 *      ever implemented, this test MUST be deleted in the same bump that
 *      lands the implementation. Re-adding the flag advertisements without
 *      working implementation is the regression this test guards against.
 */

const ROOT = process.cwd();

const SCANNED_FILES = [
  '.claude/skills/act/SKILL.md',
  '.claude/skills/act/reference/flags.md',
  '.claude/skills/act/reference/strategic-brief-integration.md',
  '.claude/rules/core/skill-format.md',
];

const ASPIRATIONAL_TOKENS = [
  '--from-review',
  '--from-designer',
];

describe('Q-005 regression: no aspirational skill chaining advertisements', () => {
  for (const relPath of SCANNED_FILES) {
    const absPath = join(ROOT, relPath);

    describe(`file: ${relPath}`, () => {
      const content = readFileSync(absPath, 'utf8');

      for (const token of ASPIRATIONAL_TOKENS) {
        it(`MUST NOT mention "${token}" anywhere`, () => {
          // Count occurrences for clear failure message.
          const matches = content.split(token).length - 1;
          expect(
            matches,
            `${relPath} contains ${matches} occurrence(s) of "${token}". ` +
            `The underlying output_contract/input_from skill-chaining feature is ` +
            `not implemented in any skill; advertising the flag is a dead-end ` +
            `pointer. Remove the advertisement, or land the implementation and ` +
            `delete this regression test in the same bump.`,
          ).toBe(0);
        });
      }
    });
  }

  it('walks all .claude/skills/*/SKILL.md and asserts no SKILL.md frontmatter advertises the aspirational flags', () => {
    const skillsDir = join(ROOT, '.claude', 'skills');
    const skillDirs = readdirSync(skillsDir).filter((name) => {
      try {
        return statSync(join(skillsDir, name)).isDirectory();
      } catch {
        return false;
      }
    });

    const violations = [];
    for (const skillName of skillDirs) {
      const skillMdPath = join(skillsDir, skillName, 'SKILL.md');
      let content;
      try {
        content = readFileSync(skillMdPath, 'utf8');
      } catch {
        continue; // skill directory without SKILL.md — skip
      }

      // Extract YAML frontmatter (between leading `---` lines)
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const frontmatter = frontmatterMatch ? frontmatterMatch[1] : '';

      // Extract the body (everything after frontmatter)
      const body = frontmatterMatch ? content.slice(frontmatterMatch[0].length) : content;

      for (const token of ASPIRATIONAL_TOKENS) {
        if (frontmatter.includes(token)) {
          violations.push(`${skillName}/SKILL.md frontmatter mentions ${token}`);
        }
        // Body check: only flag advertisement contexts (argument-hint reuse,
        // flag enumeration prose). We use a strict contains check here — if
        // any SKILL.md body mentions these tokens, that is a re-advertisement.
        if (body.includes(token)) {
          violations.push(`${skillName}/SKILL.md body mentions ${token}`);
        }
      }
    }

    expect(
      violations,
      `Aspirational skill-chaining flags re-advertised in:\n  ${violations.join('\n  ')}\n` +
      `The underlying output_contract/input_from feature is not implemented. ` +
      `Either land the implementation and delete this regression test in the ` +
      `same bump, or remove the advertisement.`,
    ).toEqual([]);
  });
});

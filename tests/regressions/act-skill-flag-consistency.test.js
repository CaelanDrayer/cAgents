import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.9 (Q-004 / F-skills-002).
 *
 * Bug: The /run skill (.claude/skills/run/SKILL.md) advertises one flag set in
 *      its frontmatter `argument-hint` (autocomplete display) and a different
 *      flag set in its Step 1 body-parsing prose. The two enumerations drifted
 *      by 7 flags:
 *          --stream, --skip-preflight, --template, --domain, --tier,
 *          --confidence, --mode
 *      These appear in the body parser ("Parse $ARGUMENTS for flags ...") and
 *      in the canonical .claude/skills/run/reference/flags.md table, but NOT
 *      in argument-hint. Autocomplete therefore hides 7 documented, functional
 *      flags from users.
 *
 * Root cause: no regression test enforced flag-enumeration consistency between
 *      the three views of the source-of-truth flag list (argument-hint,
 *      SKILL.md body parser prose, reference/flags.md table).
 *
 * Test added: this file. Parses all three sources, asserts set equality across
 *      every pair. Catches any future drift where one view gets a new flag
 *      and the other two are forgotten.
 *
 * Failing-before evidence: at HEAD (v11.2.8), this test FAILS — argument-hint
 *      lists 10 flags; body parser + flags.md each list 17. Delta: 7 flags
 *      missing from argument-hint.
 * Passing-after evidence: after adding the 7 missing flags to argument-hint,
 *      all three sources enumerate the same 17 flags.
 */

const ROOT = process.cwd();
const SKILL_PATH = join(ROOT, '.claude', 'skills', 'run', 'SKILL.md');
const FLAGS_MD_PATH = join(ROOT, '.claude', 'skills', 'run', 'reference', 'flags.md');

/**
 * Extract the `argument-hint:` field from SKILL.md frontmatter and return a
 * Set of every `--flag-name` token it mentions. Booleans and value-flags are
 * both returned as their bare `--name` form.
 */
function parseArgumentHintFlags(skillMd) {
  // Find the argument-hint line inside frontmatter (between the two `---`
  // fences at the top of the file).
  const frontmatterMatch = skillMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    throw new Error('SKILL.md has no frontmatter');
  }
  const frontmatter = frontmatterMatch[1];
  const hintMatch = frontmatter.match(/argument-hint:\s*"([^"]+)"/);
  if (!hintMatch) {
    throw new Error('SKILL.md frontmatter has no argument-hint field');
  }
  const hint = hintMatch[1];
  // Pull every --flag token. Strip trailing punctuation, brackets, angle args.
  const flags = new Set();
  for (const m of hint.matchAll(/--([a-z][a-z0-9-]*)/g)) {
    flags.add(`--${m[1]}`);
  }
  return flags;
}

/**
 * Parse the Step 1 body-parsing prose in SKILL.md. That section enumerates
 * boolean flags first, then value flags. Both groups are inside backticked
 * `--flag-name` tokens. Return the union as a Set.
 */
function parseBodyParserFlags(skillMd) {
  // Anchor on the "## Step 1: Parse Arguments" heading; read forward until
  // the next H2.
  const stepHeaderIdx = skillMd.indexOf('## Step 1: Parse Arguments');
  if (stepHeaderIdx === -1) {
    throw new Error('SKILL.md missing Step 1 heading');
  }
  const afterStep = skillMd.slice(stepHeaderIdx);
  const nextHeaderIdx = afterStep.indexOf('\n## ', 1);
  const section = nextHeaderIdx === -1 ? afterStep : afterStep.slice(0, nextHeaderIdx);
  // Grab the first paragraph that begins with "Parse `$ARGUMENTS` for flags".
  // It contains every flag enumerated in backticks.
  const paraMatch = section.match(/Parse `\$ARGUMENTS`[^.]*\./);
  if (!paraMatch) {
    throw new Error('SKILL.md Step 1 missing the Parse $ARGUMENTS for flags paragraph');
  }
  const para = paraMatch[0];
  const flags = new Set();
  for (const m of para.matchAll(/`--([a-z][a-z0-9-]*)`/g)) {
    flags.add(`--${m[1]}`);
  }
  return flags;
}

/**
 * Parse the canonical flag table in reference/flags.md. Each row in the
 * "Complete Flag Table" markdown table starts with `| \`--flag\` |` or
 * `| \`--flag\`, \`-q\` |`. Return the set of --flag tokens.
 */
function parseFlagsMdFlags(flagsMd) {
  const tableIdx = flagsMd.indexOf('## Complete Flag Table');
  if (tableIdx === -1) {
    throw new Error('flags.md missing Complete Flag Table heading');
  }
  const afterTable = flagsMd.slice(tableIdx);
  const nextHeaderIdx = afterTable.indexOf('\n## ', 1);
  const section = nextHeaderIdx === -1 ? afterTable : afterTable.slice(0, nextHeaderIdx);
  const flags = new Set();
  // Walk every line; lines that begin `| \`--name\`` declare a flag row.
  for (const line of section.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('| `--')) continue;
    // Within a single row, capture every primary --flag in the first cell.
    // The first cell ends at the first ` | ` separator.
    const firstCellEnd = trimmed.indexOf(' | ');
    if (firstCellEnd === -1) continue;
    const firstCell = trimmed.slice(0, firstCellEnd);
    // Only count the FIRST --flag token per row. `--analytics domain` style
    // sub-modes share a row with `--analytics`; treat them as a single flag
    // for consistency with argument-hint (which lists `--analytics` once).
    const m = firstCell.match(/--([a-z][a-z0-9-]*)/);
    if (m) flags.add(`--${m[1]}`);
  }
  return flags;
}

function diff(a, b) {
  return [...a].filter((x) => !b.has(x));
}

describe('Q-004: /run skill flag enumerations are consistent', () => {
  const skillMd = readFileSync(SKILL_PATH, 'utf8');
  const flagsMd = readFileSync(FLAGS_MD_PATH, 'utf8');

  const argumentHintFlags = parseArgumentHintFlags(skillMd);
  const bodyParserFlags = parseBodyParserFlags(skillMd);
  const flagsMdFlags = parseFlagsMdFlags(flagsMd);

  it('argument-hint and body parser agree (set equality)', () => {
    const onlyInHint = diff(argumentHintFlags, bodyParserFlags);
    const onlyInBody = diff(bodyParserFlags, argumentHintFlags);
    expect(onlyInHint, `Flags in argument-hint missing from body parser: ${onlyInHint.join(', ')}`).toEqual([]);
    expect(onlyInBody, `Flags in body parser missing from argument-hint: ${onlyInBody.join(', ')}`).toEqual([]);
  });

  it('argument-hint and reference/flags.md agree (set equality)', () => {
    const onlyInHint = diff(argumentHintFlags, flagsMdFlags);
    const onlyInDoc = diff(flagsMdFlags, argumentHintFlags);
    expect(onlyInHint, `Flags in argument-hint missing from flags.md: ${onlyInHint.join(', ')}`).toEqual([]);
    expect(onlyInDoc, `Flags in flags.md missing from argument-hint: ${onlyInDoc.join(', ')}`).toEqual([]);
  });

  it('body parser and reference/flags.md agree (set equality)', () => {
    const onlyInBody = diff(bodyParserFlags, flagsMdFlags);
    const onlyInDoc = diff(flagsMdFlags, bodyParserFlags);
    expect(onlyInBody, `Flags in body parser missing from flags.md: ${onlyInBody.join(', ')}`).toEqual([]);
    expect(onlyInDoc, `Flags in flags.md missing from body parser: ${onlyInDoc.join(', ')}`).toEqual([]);
  });

  it('all three views enumerate a non-empty flag set', () => {
    expect(argumentHintFlags.size).toBeGreaterThan(0);
    expect(bodyParserFlags.size).toBeGreaterThan(0);
    expect(flagsMdFlags.size).toBeGreaterThan(0);
  });
});

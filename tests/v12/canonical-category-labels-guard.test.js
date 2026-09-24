/**
 * TASK-02: canonical-category-set guard
 *
 * The 5-step decomposition framework names its 5 component-extraction
 * categories (UNDERSTAND, DESIGN, BUILD, VERIFY, DOCUMENT) in 4 separate
 * source files. Each file spells the same 5 tokens in a different shape:
 * a bulleted bold list, an inline comma list, 5 markdown section headers,
 * and 5 lowercase YAML-example keys. Nothing enforces that the 4 files
 * stay in lockstep if one of them is edited.
 *
 * This guard extracts the 5-token set from each of the 4 sources
 * independently (via a regex scoped to the documented lines) and asserts
 * every source names the same 5 tokens, case-sensitive, order-insensitive.
 *
 * Sources:
 *   1. agents/planner/resources/decomposition.md lines 55-60
 *      (the Component Extraction bullet list; 5 bold terms)
 *   2. agents/planner.md line 81
 *      ("... break it into UNDERSTAND, DESIGN, BUILD, VERIFY, DOCUMENT")
 *   3. agents/planner/resources/component-extraction.md lines 5,29,51,81,103
 *      ("## {WORD} Components" section headers)
 *   4. agents/planner/resources/plan-output-format.md line 10
 *      (by_type: {understand: 5, design: 4, build: 12, verify: 8, document: 4})
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const CANONICAL = ['UNDERSTAND', 'DESIGN', 'BUILD', 'VERIFY', 'DOCUMENT'];
const CANONICAL_SET = [...CANONICAL].sort();

function readLines(relPath) {
  const abs = path.join(REPO_ROOT, relPath);
  return fs.readFileSync(abs, 'utf8').split('\n');
}

// Extracts every ALL-CAPS word wrapped in double-asterisk bold markers,
// e.g. "**UNDERSTAND**" -> "UNDERSTAND". Mixed-case bold spans (such as
// "**Component Extraction**") do not match, since the capture group only
// accepts A-Z.
function extractBoldAllCapsTokens(text) {
  const matches = [...text.matchAll(/\*\*([A-Z]{2,})\*\*/g)];
  return matches.map((m) => m[1]);
}

// Extracts every standalone ALL-CAPS word, e.g. from a comma-separated list.
function extractAllCapsWords(text) {
  const matches = [...text.matchAll(/\b[A-Z]{2,}\b/g)];
  return matches.map((m) => m[0]);
}

describe('TASK-02: canonical category-set guard (UNDERSTAND/DESIGN/BUILD/VERIFY/DOCUMENT)', () => {
  it('decomposition.md lines 55-60 name the 5 canonical bold terms', () => {
    const lines = readLines('agents/planner/resources/decomposition.md');
    // 1-indexed 55-60 -> 0-indexed slice(54, 60)
    const block = lines.slice(54, 60).join('\n');
    const tokens = extractBoldAllCapsTokens(block);
    expect([...tokens].sort()).toEqual(CANONICAL_SET);
  });

  it('planner.md line 81 names the 5 canonical comma-separated tokens', () => {
    const lines = readLines('agents/planner.md');
    // 1-indexed 81 -> 0-indexed 80
    const line = lines[80];
    expect(line).toContain('Component Extraction');
    const tokens = extractAllCapsWords(line);
    expect([...tokens].sort()).toEqual(CANONICAL_SET);
  });

  it('component-extraction.md section headers at lines 5,29,51,81,103 name the 5 canonical words', () => {
    const lines = readLines('agents/planner/resources/component-extraction.md');
    const headerLineNumbers = [5, 29, 51, 81, 103];
    const tokens = headerLineNumbers.map((lineNo) => {
      const line = lines[lineNo - 1];
      const match = line.match(/^## ([A-Z]+) Components$/);
      expect(match, `line ${lineNo} ("${line}") did not match "## {WORD} Components"`).not.toBeNull();
      return match[1];
    });
    expect([...tokens].sort()).toEqual(CANONICAL_SET);
  });

  it('plan-output-format.md line 10 names the 5 canonical keys (lowercased)', () => {
    const lines = readLines('agents/planner/resources/plan-output-format.md');
    // 1-indexed 10 -> 0-indexed 9
    const line = lines[9];
    expect(line).toContain('by_type:');
    const matches = [...line.matchAll(/(\w+):\s*\d+/g)];
    const tokens = matches.map((m) => m[1].toUpperCase());
    expect([...tokens].sort()).toEqual(CANONICAL_SET);
  });

  it('all 4 sources agree on the same 5-token category set, pairwise', () => {
    const decompositionLines = readLines('agents/planner/resources/decomposition.md');
    const decompositionTokens = extractBoldAllCapsTokens(decompositionLines.slice(54, 60).join('\n'));

    const plannerLines = readLines('agents/planner.md');
    const plannerTokens = extractAllCapsWords(plannerLines[80]);

    const componentExtractionLines = readLines('agents/planner/resources/component-extraction.md');
    const componentExtractionTokens = [5, 29, 51, 81, 103].map((lineNo) => {
      const match = componentExtractionLines[lineNo - 1].match(/^## ([A-Z]+) Components$/);
      return match[1];
    });

    const planOutputLines = readLines('agents/planner/resources/plan-output-format.md');
    const planOutputTokens = [...planOutputLines[9].matchAll(/(\w+):\s*\d+/g)].map((m) =>
      m[1].toUpperCase()
    );

    const sources = {
      'decomposition.md': decompositionTokens,
      'planner.md': plannerTokens,
      'component-extraction.md': componentExtractionTokens,
      'plan-output-format.md': planOutputTokens,
    };

    const entries = Object.entries(sources);
    for (const [name, tokens] of entries) {
      expect([...tokens].sort(), `${name} token set`).toEqual(CANONICAL_SET);
    }

    // Explicit pairwise cross-check, so a future divergence between any two
    // specific files (not just against the canonical constant) fails loudly.
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [nameA, tokensA] = entries[i];
        const [nameB, tokensB] = entries[j];
        expect(
          [...tokensA].sort(),
          `${nameA} vs ${nameB} token sets diverge`
        ).toEqual([...tokensB].sort());
      }
    }
  });
});

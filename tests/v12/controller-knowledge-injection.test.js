/**
 * LP-21 (v12.7.x): Pre-emptive knowledge consultation in delegation prompts
 *
 * Locks the LP-21 contract: the planner (which assembles controller
 * delegation prompts in v12.0.0+) MUST document a "Pre-emptive consultation"
 * step that scans cagents-memory/_knowledge/*.md for relevance against work
 * item keywords (title + description + filename heuristics + optional
 * frontmatter keywords:), and includes @-references to relevant notes in
 * the assembled delegation prompts.
 *
 * Why a contract test instead of behavioral simulation: the planner is a
 * prompt-engineered agent — its "behavior" is the SKILL.md instructions an
 * LLM follows at runtime, not a JS function we can call directly. The test
 * asserts the SKILL.md and resources/prompt-templates.md document the
 * contract clearly enough that a future edit cannot silently drop the
 * knowledge-injection step.
 *
 * Bug-driven testing mandate: this test would have caught a regression
 * where (a) the SKILL.md drops the "Pre-emptive consultation" section,
 * (b) the prompt-templates resource stops mentioning @-references to
 * _knowledge/*.md, or (c) the relevance-matching heuristics (substring
 * match on WI title/description vs filename or frontmatter keywords) are
 * removed.
 *
 * Could have caught by: contract test on the planner SKILL.md +
 * fixture-based simulation of the keyword-matching heuristic against a
 * real _knowledge/ directory listing.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const PLANNER_SKILL = path.join(REPO_ROOT, 'agents', 'planner.md');
const PROMPT_TEMPLATES = path.join(
  REPO_ROOT,
  'agents',
  'planner',
  'resources',
  'prompt-templates.md'
);
const KNOWLEDGE_DIR = path.join(REPO_ROOT, 'cagents-memory', '_knowledge');

describe('LP-21: knowledge-injection in controller delegation prompts', () => {
  describe('Invariant 1 — planner SKILL.md documents pre-emptive consultation', () => {
    it('agents/planner.md exists', () => {
      expect(fs.existsSync(PLANNER_SKILL)).toBe(true);
    });

    it('SKILL.md mentions a "Pre-emptive consultation" step (case-insensitive)', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      expect(content).toMatch(/pre-?emptive consultation/i);
    });

    it('SKILL.md references the _knowledge/ scan target', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      expect(content).toMatch(/cagents-memory\/_knowledge\/\*\.md|_knowledge\/\*\.md/);
    });

    it('SKILL.md documents @-reference inclusion in delegation prompts', () => {
      const content = fs.readFileSync(PLANNER_SKILL, 'utf8');
      // Must mention @-reference syntax for knowledge notes — either an
      // explicit @cagents-memory/_knowledge/ example or the @-syntax + the
      // _knowledge/ scan target close enough to be unambiguous.
      const hasExplicitAtRef = /@cagents-memory\/_knowledge\//.test(content);
      const hasSyntaxAndScanTarget =
        /@[A-Za-z0-9_\-./]*_knowledge\//.test(content) ||
        (/@-reference/i.test(content) && /_knowledge\//.test(content));
      expect(hasExplicitAtRef || hasSyntaxAndScanTarget).toBe(true);
    });
  });

  describe('Invariant 2 — relevance heuristic is documented', () => {
    it('SKILL.md or prompt-templates.md describes keyword matching (title/description vs filename/frontmatter)', () => {
      const skill = fs.readFileSync(PLANNER_SKILL, 'utf8');
      const tmpl = fs.existsSync(PROMPT_TEMPLATES)
        ? fs.readFileSync(PROMPT_TEMPLATES, 'utf8')
        : '';
      const combined = skill + '\n' + tmpl;
      // Heuristic must mention BOTH a matching source (WI title or
      // description) AND a matching target (filename or frontmatter keywords).
      const hasSource = /work item (title|description)|WI (title|description)/i.test(
        combined
      );
      const hasTarget = /filename|frontmatter|keywords/i.test(combined);
      expect(hasSource && hasTarget).toBe(true);
    });
  });

  describe('Invariant 3 — knowledge directory exists and is scannable', () => {
    it('cagents-memory/_knowledge/ directory exists', () => {
      expect(fs.existsSync(KNOWLEDGE_DIR)).toBe(true);
      expect(fs.statSync(KNOWLEDGE_DIR).isDirectory()).toBe(true);
    });

    it('_knowledge/ contains at least one .md file', () => {
      const entries = fs
        .readdirSync(KNOWLEDGE_DIR)
        .filter((f) => f.endsWith('.md'));
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Invariant 4 — relevance heuristic resolves a known case', () => {
    /**
     * Behavioural simulation of the heuristic the SKILL.md documents.
     * If a WI mentions "depth-1 stripping" or "graceful degradation",
     * the heuristic should surface agent-tool-depth1-stripping.md.
     * This catches the case where the SKILL.md documents a heuristic
     * but the underlying _knowledge/ note vanishes (the @-reference
     * would 404 at runtime).
     */
    it('a "depth-1 graceful degradation" WI surfaces agent-tool-depth1-stripping.md', () => {
      const wi = {
        title: 'Implement graceful degradation for depth-1 agents',
        description:
          'When the Agent tool is stripped at depth-1, agents must self-validate without spawning reviewers.',
      };

      const entries = fs
        .readdirSync(KNOWLEDGE_DIR)
        .filter((f) => f.endsWith('.md'));

      // Mirror the heuristic the SKILL.md documents: substring match on
      // WI title + description against filename (case-insensitive, with
      // hyphens treated as word boundaries).
      const haystack = `${wi.title} ${wi.description}`.toLowerCase();
      const matches = entries.filter((filename) => {
        const slug = filename.replace(/\.md$/, '').toLowerCase();
        const tokens = slug.split(/[-_]/).filter((t) => t.length >= 3);
        // A file matches if ANY of its meaningful tokens appears in the
        // WI text. This is the simplest defensible heuristic and is what
        // the SKILL.md will document.
        return tokens.some((tok) => haystack.includes(tok));
      });

      expect(matches.length).toBeGreaterThan(0);
      expect(matches).toContain('agent-tool-depth1-stripping.md');
    });
  });
});

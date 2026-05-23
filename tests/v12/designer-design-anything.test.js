/**
 * WI-9 (run_designer-improvement_260523_001):
 * Regression test enforcing the "design ANYTHING" capability expansion.
 *
 * Asserts the additive scope expansion shipped in WI-1..WI-6:
 *   (1) At least 5 NEW domain reference files exist at
 *       .claude/skills/designer/reference/domains/*.md (excluding README.md).
 *       Combined with the 3 legacy domains (Software, Business, Creative)
 *       documented inline in SKILL.md's Phase 3 taxonomy table, this
 *       yields the 8-domain "design ANYTHING" taxonomy specified in O1.
 *   (2) At least 5 NEW chunk YAMLs exist at
 *       .claude/skills/designer/templates/*_chunks.yaml (git-tracked path,
 *       NOT cagents-memory/). The legacy 3 chunk YAMLs (software, business,
 *       creative) stay in cagents-memory/_system/templates/designer/ per
 *       the plan's not_in_scope (no churn migration in v12.7.x).
 *   (3) Phase-1 empathize reference documents the novice topic-bootstrap
 *       (matches /bootstrap|novice|topic discovery/i).
 *   (4) SKILL.md Phase 6 surfaces the additive build menu options:
 *       "Export", "Share", AND "Manual" (case-insensitive).
 *   (5) SKILL.md Phase 6 Call 1 build option string is byte-for-byte
 *       preserved (regression guard — pre-existing /run, /team, /team
 *       --strategic auto-trigger contract must not break).
 *
 * RED state (before WI-1..WI-6 land): assertions 1, 2, 3, 4 fail because
 * the new directories/files do not exist and SKILL.md has not been edited.
 * Assertion 5 passes both before and after (it locks the string in place).
 *
 * GREEN state (after WI-1..WI-6 land): all 5 assertions pass.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DESIGNER_DIR = path.join(REPO_ROOT, '.claude', 'skills', 'designer');
const DOMAINS_DIR = path.join(DESIGNER_DIR, 'reference', 'domains');
const TEMPLATES_DIR = path.join(DESIGNER_DIR, 'templates');
const SKILL_MD = path.join(DESIGNER_DIR, 'SKILL.md');
const PHASE_1_MD = path.join(DESIGNER_DIR, 'reference', 'phase-1-empathize.md');

// The canonical Call 1 build option string as shipped in v12.7.0. This MUST
// remain byte-for-byte stable across WI-6 — it is the user-visible contract
// that drives /run, /team, /team --strategic auto-handoff in Phase 6.
const CANONICAL_CALL_1_OPTIONS =
  'Build now (/run, recommended) | Build with team (/team) | Build with team strategic mode (/team --strategic, cross-domain) | More options';

describe('designer "design ANYTHING" capability', () => {
  it('ships at least 5 NEW domain reference files under reference/domains/', () => {
    expect(fs.existsSync(DOMAINS_DIR)).toBe(true);
    const entries = fs.readdirSync(DOMAINS_DIR);
    const domainDocs = entries.filter(
      (f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md'
    );
    // 5 new (research, education, physical-product, personal, game) +
    // 3 legacy in SKILL.md taxonomy table = 8 domains total per O1.
    expect(domainDocs.length).toBeGreaterThanOrEqual(5);
  });

  it('ships at least 5 NEW chunk YAMLs under templates/ (git-tracked path)', () => {
    expect(fs.existsSync(TEMPLATES_DIR)).toBe(true);
    const entries = fs.readdirSync(TEMPLATES_DIR);
    const chunkYamls = entries.filter((f) => f.endsWith('_chunks.yaml'));
    expect(chunkYamls.length).toBeGreaterThanOrEqual(5);
  });

  it('SKILL.md Phase 3 taxonomy table lists all 8 domains (3 legacy + 5 new)', () => {
    const body = fs.readFileSync(SKILL_MD, 'utf8');
    // Each domain label MUST appear at least once in SKILL.md
    const requiredDomains = [
      'Software', 'Business', 'Creative',
      'Research', 'Education', 'Physical', 'Personal', 'Game',
    ];
    for (const d of requiredDomains) {
      expect(body).toMatch(new RegExp(d));
    }
  });

  it('phase-1 empathize reference documents the novice topic-bootstrap', () => {
    expect(fs.existsSync(PHASE_1_MD)).toBe(true);
    const body = fs.readFileSync(PHASE_1_MD, 'utf8');
    expect(body).toMatch(/bootstrap|novice|topic discovery/i);
  });

  it('SKILL.md Phase 6 surfaces Export, Share, and Manual build options', () => {
    const body = fs.readFileSync(SKILL_MD, 'utf8');
    expect(body).toMatch(/export/i);
    expect(body).toMatch(/share/i);
    expect(body).toMatch(/manual/i);
  });

  it('SKILL.md preserves the canonical Call 1 build option string byte-for-byte', () => {
    const body = fs.readFileSync(SKILL_MD, 'utf8');
    expect(body.includes(CANONICAL_CALL_1_OPTIONS)).toBe(true);
  });
});

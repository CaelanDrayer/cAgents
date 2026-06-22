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
 *   (5) The /run, /team, /team --strategic build-handoff option strings
 *       remain present and reachable in SKILL.md Phase 6 (auto-trigger
 *       contract must not break), AND the continuation gate is
 *       refinement-first (build/export options are gated behind an
 *       explicit "I'm done refining" choice — designer never
 *       self-terminates). Updated in the endless-refinement fix
 *       (session: clear-up-plugin) — the prior version locked the
 *       build-FIRST ordering byte-for-byte, which was the behavior users
 *       reported as "designer just creates things and finishes."
 *
 * RED state (before WI-1..WI-6 land): assertions 1, 2, 3, 4 fail because
 * the new directories/files do not exist and SKILL.md has not been edited.
 *
 * GREEN state (after WI-1..WI-6 land + endless-refinement fix): all
 * assertions pass.
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

// The build-handoff option substrings that MUST remain present and reachable
// in Phase 6 — they drive the /run, /team, /team --strategic auto-handoff.
// They now live in Call 2 (after the user explicitly says they're done
// refining) rather than Call 1, per the endless-refinement fix.
const BUILD_HANDOFF_OPTIONS = [
  'Build now (/run',
  'Build with team (/team)',
  '/team --strategic',
];

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

  it('SKILL.md keeps the /run, /team, /team --strategic build-handoff options reachable', () => {
    const body = fs.readFileSync(SKILL_MD, 'utf8');
    for (const opt of BUILD_HANDOFF_OPTIONS) {
      expect(body.includes(opt)).toBe(true);
    }
  });

  it('SKILL.md continuation gate is refinement-first (designer never self-terminates)', () => {
    const body = fs.readFileSync(SKILL_MD, 'utf8');
    // The recommended/default option at the continuation gate is refinement,
    // not build.
    expect(body).toMatch(/Refine a specific area \(Recommended\)/i);
    // Build/export options are gated behind an explicit "done refining" choice.
    expect(body).toMatch(/done refining/i);
    // The endless-refinement posture is stated as a hard rule.
    expect(body).toMatch(/never self-terminate/i);
  });
});

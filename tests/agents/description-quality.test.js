/**
 * REC-28 (audit team_plugin-full-audit_260717_001, v12.53.0): agent description
 * quality regression test.
 *
 * Problem the audit found (fix-agents.md § 4): 24 agent descriptions opened with
 * "Consolidated X agent." — that describes consolidation HISTORY, not the
 * user-facing purpose, and gives the router no trigger to pick between agents
 * that share the same opener (three literally shared "Consolidated strategist
 * agent."). 57/58 agents had no NOT-for boundary, the single biggest
 * router-disambiguation lever.
 *
 * This test pins the rewrite for the REWRITTEN_AGENTS set so a future edit can't
 * silently regress a description back to a SELFREF opener or drop its modes /
 * NOT-for boundary. The bar (per ex-skill-authoring-pushy-description.md):
 *   1. Purpose-first — MUST NOT open with "Consolidated".
 *   2. Advertise ALL modes — every metadata.supported_modes key appears in the
 *      description (so the router can reach each mode).
 *   3. NOT-for boundary — the description names an adjacent scope to steer away
 *      from ("NOT for: ...").
 *   4. Length window — long enough to carry triggers, within the spec cap.
 *
 * Failing-before / passing-after: the pre-rewrite descriptions (all opening
 * "Consolidated ...", no "NOT for") fail checks 1 and 3; the rewrite passes all.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');

// The 24 SELFREF descriptions rewritten in v12.53.0 (grep of agents/**/SKILL.md
// for `^description: "Consolidated` at the time of the rewrite).
const REWRITTEN_AGENTS = [
  'agents/advisor/health/medical-advisor/SKILL.md',
  'agents/advisor/legal/general-counsel/SKILL.md',
  'agents/advisor/personal/life-coach/SKILL.md',
  'agents/analyst/data-scientist/SKILL.md',
  'agents/analyst/market-research-analyst/SKILL.md',
  'agents/analyst/scholar/SKILL.md',
  'agents/analyst/social-scientist/SKILL.md',
  'agents/core/task-state/SKILL.md',
  'agents/creator/visual-artist/SKILL.md',
  'agents/developer/backend/backend-developer/SKILL.md',
  'agents/developer/frontend/frontend-developer/SKILL.md',
  'agents/developer/fullstack/data-lead/SKILL.md',
  'agents/developer/fullstack/tech-lead/SKILL.md',
  'agents/developer/infrastructure/devops-engineer/SKILL.md',
  'agents/developer/infrastructure/security-engineer/SKILL.md',
  'agents/developer/quality/qa-lead/SKILL.md',
  'agents/operator/marketing-sales/marketing-strategist/SKILL.md',
  'agents/operator/marketing-sales/sales-strategist/SKILL.md',
  'agents/operator/people-ops/hr-manager/SKILL.md',
  'agents/operator/support/support-director/SKILL.md',
  'agents/strategist/game-designer/SKILL.md',
  'agents/strategist/product-owner/SKILL.md',
  'agents/strategist/strategic-planner/SKILL.md',
  'agents/writer/narrative-director/SKILL.md',
];

// Extract the (single-line) description string from SKILL.md frontmatter.
function extractDescription(content) {
  const m = content.match(/^description:\s*"((?:[^"\\]|\\.)*)"/m);
  return m ? m[1] : null;
}

// Extract the supported_modes keys from the metadata block. Mode keys may
// contain digits (e.g. `a11y`) and hyphens (e.g. `mental-health`).
function extractModeKeys(content) {
  const lines = content.split('\n');
  const keys = [];
  let inBlock = false;
  for (const line of lines) {
    if (/^\s{2}supported_modes:\s*$/.test(line)) { inBlock = true; continue; }
    if (inBlock) {
      // A key is indented 4 spaces under supported_modes:.
      const km = line.match(/^\s{4}([a-z0-9][a-z0-9-]*):/);
      if (km) { keys.push(km[1]); continue; }
      // Any line at <=2-space indent ends the block.
      if (/^\s{0,2}\S/.test(line)) break;
    }
  }
  return keys;
}

describe('REC-28: rewritten agent descriptions meet the quality bar', () => {
  it('all rewritten SKILL.md files exist', () => {
    for (const rel of REWRITTEN_AGENTS) {
      expect(fs.existsSync(path.join(REPO_ROOT, rel)), `${rel} not found`).toBe(true);
    }
  });

  it('no rewritten description opens with "Consolidated" (purpose-first)', () => {
    const offenders = [];
    for (const rel of REWRITTEN_AGENTS) {
      const desc = extractDescription(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
      if (!desc) { offenders.push(`${rel}: no description parsed`); continue; }
      if (/^Consolidated\b/.test(desc)) offenders.push(`${rel}: still opens with "Consolidated"`);
    }
    expect(offenders, `\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every rewritten description carries a NOT-for boundary', () => {
    const offenders = [];
    for (const rel of REWRITTEN_AGENTS) {
      const desc = extractDescription(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
      if (!/NOT for:/i.test(desc || '')) offenders.push(`${rel}: missing "NOT for:" boundary`);
    }
    expect(offenders, `\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every rewritten description advertises ALL of its supported modes', () => {
    const offenders = [];
    for (const rel of REWRITTEN_AGENTS) {
      const content = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      const desc = extractDescription(content) || '';
      const modes = extractModeKeys(content);
      expect(modes.length, `${rel}: no supported_modes parsed`).toBeGreaterThan(0);
      const missing = modes.filter((m) => !desc.includes(m));
      if (missing.length) offenders.push(`${rel}: description omits mode(s) ${missing.join(', ')}`);
    }
    expect(offenders, `\n${offenders.join('\n')}`).toEqual([]);
  });

  it('every rewritten description is within the length window (120-1024 chars)', () => {
    const offenders = [];
    for (const rel of REWRITTEN_AGENTS) {
      const desc = extractDescription(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8')) || '';
      if (desc.length < 120) offenders.push(`${rel}: description too short (${desc.length} chars)`);
      if (desc.length > 1024) offenders.push(`${rel}: description too long (${desc.length} chars, spec cap 1024)`);
    }
    expect(offenders, `\n${offenders.join('\n')}`).toEqual([]);
  });
});

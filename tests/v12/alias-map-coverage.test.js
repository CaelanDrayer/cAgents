/**
 * WI-W1.1: Alias map coverage regression test
 *
 * Asserts that scripts/migration/v12-aliases.yaml covers every rename/merge
 * target slated in:
 *   - cagents-memory/sessions/run_full-plugin-revamp-plan_260520_001/outputs/final-decisions.yaml
 *   - cagents-memory/sessions/team_v12-audits-only_260520_001/outputs/wave-1/marketing-sales-audit.md
 *
 * Bug-driven test mandate (CLAUDE.md): this test guards against future
 * regressions where someone adds a new rename/merge decision but forgets to
 * extend the alias map (breaking router back-compat).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const ALIAS_MAP_PATH = path.join(REPO_ROOT, 'scripts', 'migration', 'v12-aliases.yaml');
const FINAL_DECISIONS_PATH = path.join(
  REPO_ROOT,
  'cagents-memory',
  'sessions',
  'run_full-plugin-revamp-plan_260520_001',
  'outputs',
  'final-decisions.yaml'
);

// Marketing-sales merge targets per the audit (G1..G6).
// Hardcoded here because the audit is markdown prose, not structured YAML —
// the test pins the audit's 16 removals as the contract surface for v12.
const REQUIRED_MARKETING_SALES_OLDS = [
  // G1 SEO collapse (4 removals)
  'cagents:keyword-researcher',
  'cagents:on-page-seo-auditor',
  'cagents:technical-seo-auditor',
  'cagents:link-strategist',
  // G2 Controller bloat (3 removals)
  'cagents:campaign-manager',
  'cagents:product-marketing-manager',
  'cagents:seo-strategist',
  // G3 Partnerships (3 removals)
  'cagents:affiliate-marketing-manager',
  'cagents:channel-partner-manager',
  'cagents:influencer-marketing-specialist',
  // G4 Ops merge (1 removal)
  'cagents:sales-ops-specialist',
  // G5 Enablement merge (1 removal)
  'cagents:sales-trainer',
  // G6 Customer-marketing fold (1 removal)
  'cagents:customer-marketing-manager',
];

// Engineering renames/moves per final-decisions.yaml Q1..Q7.
const REQUIRED_ENGINEERING_OLDS = [
  // Q1 absorbs
  'cagents:task-decomposer',
  'cagents:prompt-engineer',
  // Q2 moves
  'cagents:engine-developer',
  'cagents:game-programmer',
  // Q3 rename
  'cagents:chief-legal-officer',
  // Q4 merge / fold
  'cagents:engineering-manager',
  'cagents:architecture-reviewer',
  // Q7 move + rename
  'cagents:devops-lead',
  'cagents:vp-engineering',
];

const VALID_ALIAS_TYPES = new Set([
  'rename',
  'rename_and_merge',
  'move',
  'move_and_rename',
  'absorb',
  'fold',
]);

const VALID_DECISIONS = new Set(['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8']);

let aliasMap;
let aliasesByOld;

beforeAll(() => {
  expect(fs.existsSync(ALIAS_MAP_PATH)).toBe(true);
  const raw = fs.readFileSync(ALIAS_MAP_PATH, 'utf8');
  aliasMap = yaml.load(raw);
  aliasesByOld = new Map();
  for (const a of aliasMap.aliases) {
    aliasesByOld.set(a.old, a);
  }
});

describe('v12-aliases.yaml schema', () => {
  it('parses as YAML', () => {
    expect(aliasMap).toBeDefined();
    expect(aliasMap.schema_version).toBe('1');
  });

  it('declares target_version 12.0.0 and source_version 11.3.0', () => {
    expect(String(aliasMap.target_version)).toBe('12.0.0');
    expect(String(aliasMap.source_version)).toBe('11.3.0');
  });

  it('has a non-empty aliases array', () => {
    expect(Array.isArray(aliasMap.aliases)).toBe(true);
    expect(aliasMap.aliases.length).toBeGreaterThan(0);
  });

  it('every alias has required fields (old, new, type, decision, notes)', () => {
    for (const a of aliasMap.aliases) {
      expect(a.old, `alias missing 'old': ${JSON.stringify(a)}`).toBeTruthy();
      expect(a.new, `alias ${a.old} missing 'new'`).toBeTruthy();
      expect(a.type, `alias ${a.old} missing 'type'`).toBeTruthy();
      expect(a.decision, `alias ${a.old} missing 'decision'`).toBeTruthy();
      expect(a.notes, `alias ${a.old} missing 'notes'`).toBeTruthy();
    }
  });

  it('every alias type is a valid enum value', () => {
    for (const a of aliasMap.aliases) {
      expect(VALID_ALIAS_TYPES.has(a.type), `alias ${a.old} has invalid type '${a.type}'`).toBe(true);
    }
  });

  it('every alias decision is Q1..Q8', () => {
    for (const a of aliasMap.aliases) {
      expect(VALID_DECISIONS.has(a.decision), `alias ${a.old} has invalid decision '${a.decision}'`).toBe(true);
    }
  });

  it('every old name is unique (no duplicate aliases)', () => {
    const seen = new Set();
    for (const a of aliasMap.aliases) {
      expect(seen.has(a.old), `duplicate alias for ${a.old}`).toBe(false);
      seen.add(a.old);
    }
  });

  it('cagents: prefix is consistent on every old AND new name', () => {
    for (const a of aliasMap.aliases) {
      expect(a.old.startsWith('cagents:'), `old name ${a.old} missing cagents: prefix`).toBe(true);
      expect(a.new.startsWith('cagents:'), `new name ${a.new} missing cagents: prefix`).toBe(true);
    }
  });

  it('move and move_and_rename entries declare new_path', () => {
    for (const a of aliasMap.aliases) {
      if (a.type === 'move' || a.type === 'move_and_rename') {
        expect(a.new_path, `${a.type} alias ${a.old} missing new_path`).toBeTruthy();
        // new_path should end in /SKILL.md
        expect(a.new_path.endsWith('/SKILL.md'), `new_path ${a.new_path} should end in /SKILL.md`).toBe(true);
      }
    }
  });
});

describe('v12-aliases.yaml engineering coverage (Q1..Q7)', () => {
  it('covers every engineering rename/move target from final-decisions.yaml', () => {
    for (const oldName of REQUIRED_ENGINEERING_OLDS) {
      expect(aliasesByOld.has(oldName), `missing engineering alias for ${oldName}`).toBe(true);
    }
  });

  it('Q1 absorbs map task-decomposer and prompt-engineer to cagents:planner', () => {
    const td = aliasesByOld.get('cagents:task-decomposer');
    expect(td.type).toBe('absorb');
    expect(td.new).toBe('cagents:planner');
    expect(td.decision).toBe('Q1');

    const pe = aliasesByOld.get('cagents:prompt-engineer');
    expect(pe.type).toBe('absorb');
    expect(pe.new).toBe('cagents:planner');
    expect(pe.decision).toBe('Q1');
  });

  it('Q3 folds chief-legal-officer -> general-counsel (clo was deleted in Wave 8)', () => {
    const clo = aliasesByOld.get('cagents:chief-legal-officer');
    expect(clo.new).toBe('cagents:general-counsel');
    expect(clo.type).toBe('fold');
    expect(clo.decision).toBe('Q3');
  });

  it('Q4 merges engineering-manager -> tech-lead', () => {
    const em = aliasesByOld.get('cagents:engineering-manager');
    expect(em.new).toBe('cagents:tech-lead');
    expect(em.type).toBe('rename_and_merge');
    expect(em.decision).toBe('Q4');
  });

  it('Q7 folds devops-lead -> devops-engineer and vp-engineering -> cto (both absorbed in Wave 8)', () => {
    const dl = aliasesByOld.get('cagents:devops-lead');
    expect(dl.new).toBe('cagents:devops-engineer');
    expect(dl.type).toBe('fold');
    expect(dl.decision).toBe('Q7');

    const vp = aliasesByOld.get('cagents:vp-engineering');
    expect(vp.new).toBe('cagents:cto');
    expect(vp.type).toBe('fold');
    expect(vp.decision).toBe('Q7');
  });
});

describe('v12-aliases.yaml marketing-sales coverage (G1..G6)', () => {
  it('covers all 13 marketing-sales removals from the audit', () => {
    for (const oldName of REQUIRED_MARKETING_SALES_OLDS) {
      expect(aliasesByOld.has(oldName), `missing marketing-sales alias for ${oldName}`).toBe(true);
    }
  });

  it('G1 SEO collapse: all 4 specialist agents fold into marketing-analyst (seo-specialist absorbed in v12.18)', () => {
    const g1 = ['keyword-researcher', 'on-page-seo-auditor', 'technical-seo-auditor', 'link-strategist'];
    for (const name of g1) {
      const a = aliasesByOld.get(`cagents:${name}`);
      expect(a.new).toBe('cagents:marketing-analyst');
      expect(a.type).toBe('fold');
      expect(a.merge_group).toBe('G1');
    }
  });

  it('G2 Controller bloat: campaign-manager, product-marketing-manager, seo-strategist all fold into marketing-strategist', () => {
    const g2 = ['campaign-manager', 'product-marketing-manager', 'seo-strategist'];
    for (const name of g2) {
      const a = aliasesByOld.get(`cagents:${name}`);
      expect(a.new).toBe('cagents:marketing-strategist');
      expect(a.type).toBe('fold');
      expect(a.merge_group).toBe('G2');
    }
  });

  it('G3 Partnerships: 3 agents fold into marketing-strategist (partnership-marketing-manager absorbed in v12.18)', () => {
    const g3 = ['affiliate-marketing-manager', 'channel-partner-manager', 'influencer-marketing-specialist'];
    for (const name of g3) {
      const a = aliasesByOld.get(`cagents:${name}`);
      expect(a.new).toBe('cagents:marketing-strategist');
      expect(a.type).toBe('fold');
      expect(a.merge_group).toBe('G3');
    }
  });

  it('G4 Ops merge: sales-ops-specialist -> sales-strategist (revenue-operations-manager absorbed in v12.18)', () => {
    const a = aliasesByOld.get('cagents:sales-ops-specialist');
    expect(a.new).toBe('cagents:sales-strategist');
    expect(a.merge_group).toBe('G4');
  });

  it('G5 Enablement: sales-trainer -> sales-strategist (sales-enablement-specialist absorbed in v12.18)', () => {
    const a = aliasesByOld.get('cagents:sales-trainer');
    expect(a.new).toBe('cagents:sales-strategist');
    expect(a.merge_group).toBe('G5');
  });

  it('G6 Customer-marketing fold: customer-marketing-manager -> marketing-strategist (growth-marketer absorbed in v12.18)', () => {
    const a = aliasesByOld.get('cagents:customer-marketing-manager');
    expect(a.new).toBe('cagents:marketing-strategist');
    expect(a.merge_group).toBe('G6');
  });
});

describe('v12-aliases.yaml total coverage', () => {
  it('combined engineering + marketing-sales coverage matches expected total (>= 22 aliases)', () => {
    const totalRequired = REQUIRED_ENGINEERING_OLDS.length + REQUIRED_MARKETING_SALES_OLDS.length;
    // 9 engineering + 13 marketing-sales = 22
    expect(totalRequired).toBe(22);
    expect(aliasMap.aliases.length).toBeGreaterThanOrEqual(totalRequired);
  });

  it('every required old name appears exactly once in the alias map', () => {
    const allRequired = [...REQUIRED_ENGINEERING_OLDS, ...REQUIRED_MARKETING_SALES_OLDS];
    for (const oldName of allRequired) {
      const matches = aliasMap.aliases.filter((a) => a.old === oldName);
      expect(matches.length, `${oldName} should appear exactly once, found ${matches.length}`).toBe(1);
    }
  });

  // FINAL_DECISIONS_PATH points at an optional session artifact
  // (cagents-memory/sessions/run_full-plugin-revamp-plan_260520_001/outputs/final-decisions.yaml)
  // that is git-ignored and was never committed, so it is absent on a clean
  // checkout. Skip the sanity check when the artifact is absent; still run it
  // (validating the test's hardcoded pins against the real file) when present.
  it.skipIf(!fs.existsSync(FINAL_DECISIONS_PATH))('final-decisions.yaml exists and is referenced (sanity check on test pins)', () => {
    expect(fs.existsSync(FINAL_DECISIONS_PATH)).toBe(true);
    const fd = yaml.load(fs.readFileSync(FINAL_DECISIONS_PATH, 'utf8'));
    // Sanity-check the test's hardcoded engineering renames against final-decisions.yaml.
    // Q3 rename: chief-legal-officer -> clo
    expect(fd.decisions.Q3_leadership_naming.renames[0].from).toContain('chief-legal-officer');
    expect(fd.decisions.Q3_leadership_naming.renames[0].to).toContain('clo');
  });
});

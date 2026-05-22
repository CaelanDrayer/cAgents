// Regression tests for V10.26.19+ — /improve skill skeleton and progressive buildout.
// Each patch in Cluster 4 adds assertions here. Failing-before state: prior to
// V10.26.19 the /improve skill did not exist on disk.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const IMPROVE_SKILL = resolve(ROOT, '.claude/skills/improve/SKILL.md');
const STATE_MACHINE = resolve(
  ROOT,
  '.claude/skills/improve/reference/state-machine.md'
);
const HELPER_DETAILS = resolve(
  ROOT,
  '.claude/skills/helper/reference/command-details.md'
);
const PLUGIN_JSON = resolve(ROOT, '.claude-plugin/plugin.json');

function frontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

describe('V10.26.19 /improve skeleton', () => {
  it('improve SKILL.md exists', () => {
    expect(existsSync(IMPROVE_SKILL)).toBe(true);
  });

  it('improve SKILL.md frontmatter is valid and marks skill user-invocable', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const fm = frontmatter(content);
    expect(fm).toMatch(/^name:\s*improve\s*$/m);
    expect(fm).toMatch(/user-invocable:\s*"true"/);
    expect(fm).toMatch(/context:\s*"fork"/);
    expect(fm).toMatch(/compatibility:\s*"Claude Code >= 2\.1\.69"/);
  });

  it('improve SKILL.md declares allowed-tools combining /review + /optimize surface', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const fm = frontmatter(content);
    expect(fm).toMatch(/allowed-tools:.*Read/);
    expect(fm).toMatch(/allowed-tools:.*Agent/);
    expect(fm).toMatch(/allowed-tools:.*Bash/);
    expect(fm).toMatch(/allowed-tools:.*Write/);
    expect(fm).toMatch(/allowed-tools:.*TodoWrite/);
  });

  it('improve SKILL.md declares the --mode argument-hint surface', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const fm = frontmatter(content);
    expect(fm).toMatch(/--mode review\|optimize\|full/);
  });

  it('reference/state-machine.md placeholder exists', () => {
    expect(existsSync(STATE_MACHINE)).toBe(true);
    const content = readFileSync(STATE_MACHINE, 'utf8');
    expect(content).toMatch(/SCOPING/);
    expect(content).toMatch(/REPORTING/);
  });

  it('helper command-details.md reserves the /improve slot (preview)', () => {
    const content = readFileSync(HELPER_DETAILS, 'utf8');
    expect(content).toMatch(/## \/improve/);
    expect(content).toMatch(/preview|Preview/);
  });

  it('improve SKILL.md stays under 600 lines (progressive disclosure)', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    const lineCount = content.split('\n').length;
    expect(lineCount).toBeLessThan(600);
  });
});

describe('V10.26.27 /improve --mode optimize parser stub', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');

  it('SKILL.md declares optimize parser branch wired in V10.26.27', () => {
    expect(content).toMatch(/Optimize-Mode Parser Branch.*V10\.26\.27/);
  });

  it('SKILL.md documents optimize session writes mode: optimize', () => {
    expect(content).toMatch(/mode:\s*optimize/);
  });

  it('SKILL.md documents DETECTING_PENDING state for optimize stub', () => {
    expect(content).toMatch(/DETECTING_PENDING/);
  });

  it('SKILL.md instructs stub to exit cleanly with one-time notice', () => {
    expect(content).toMatch(/parser branch live.*V10\.26\.27/);
    expect(content).toMatch(/No specialist agents are spawned/);
  });
});

describe('V10.26.25 /improve --mode review EXECUTING + VALIDATING + REPORTING', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');
  const DIRECTIVES = resolve(ROOT, '.claude/skills/improve/reference/directives.md');
  const SUPPRESSION = resolve(
    ROOT,
    '.claude/skills/improve/reference/baseline-suppression.md'
  );

  it('SKILL.md documents EXECUTING atomic snapshot→apply→test→rollback loop', () => {
    expect(content).toMatch(/snapshot/i);
    expect(content).toMatch(/apply/i);
    expect(content).toMatch(/rollback|restore/i);
    expect(content).toMatch(/git_stash_push|git stash/i);
  });

  it('SKILL.md caps auto-fix retries at 3 rounds then dead_letter', () => {
    expect(content).toMatch(/retry_count\s*<\s*3|max.*3|retry_count = 3/);
    expect(content).toMatch(/dead_letter/);
  });

  it('SKILL.md documents 12 prime directives for VALIDATING', () => {
    expect(content).toMatch(/12 [Pp]rime [Dd]irectives|12 prime|D1-D12|D1\.\.D12/);
  });

  it('SKILL.md documents quality gate formula', () => {
    expect(content).toMatch(/score\s*=\s*max\(0,.*100.*critical_count.*high_count/);
    expect(content).toMatch(/baseline_score/);
  });

  it('SKILL.md lists the legacy /review artifact set', () => {
    expect(content).toMatch(/reports\/aggregate\.yaml/);
    expect(content).toMatch(/reports\/auto_fixes\.yaml/);
    expect(content).toMatch(/reports\/quality_gates\.yaml/);
    expect(content).toMatch(/reports\/final_report\.md/);
  });

  it('SKILL.md documents history append to _projects/{hash}/improve/history.yaml', () => {
    expect(content).toMatch(/_projects\/\{hash\}\/improve\/history\.yaml/);
  });

  it('reference/directives.md ports 12 numbered directives (D1-D12)', () => {
    expect(existsSync(DIRECTIVES)).toBe(true);
    const d = readFileSync(DIRECTIVES, 'utf8');
    for (let i = 1; i <= 12; i++) {
      expect(d).toMatch(new RegExp(`\\| D${i} \\|`));
    }
  });

  it('reference/directives.md contains quality gate formula', () => {
    const d = readFileSync(DIRECTIVES, 'utf8');
    expect(d).toMatch(/score\s*=\s*max/);
    expect(d).toMatch(/PASS if/);
  });

  it('reference/baseline-suppression.md wraps legacy /review spec with new path', () => {
    expect(existsSync(SUPPRESSION)).toBe(true);
    const s = readFileSync(SUPPRESSION, 'utf8');
    expect(s).toMatch(/_projects\/\{hash\}\/improve\/baseline\.yaml/);
    expect(s).toMatch(/_projects\/\{hash\}\/review\/baseline\.yaml/);
    expect(s).toMatch(/--suppress/);
  });

  it('V10.26.25 final exit message declares feature-complete', () => {
    expect(content).toMatch(/all 7 states complete/);
    expect(content).toMatch(/auto_fixes_applied/);
    expect(content).toMatch(/quality_gate/);
  });
});

describe('V10.26.24 /improve --mode review DETECTING + PLANNING', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');
  const AGENT_GROUPS = resolve(
    ROOT,
    '.claude/skills/improve/reference/agent-groups.md'
  );

  it('SKILL.md documents 3 parallel specialist groups', () => {
    expect(content).toMatch(/Group 1.*Structural/);
    expect(content).toMatch(/Group 2.*Security.*Performance/);
    expect(content).toMatch(/Group 3.*Specialized/);
  });

  it('SKILL.md lists canonical review agent names with cagents: prefix', () => {
    expect(content).toMatch(/cagents:architecture-reviewer/);
    expect(content).toMatch(/cagents:code-standards-auditor/);
    expect(content).toMatch(/cagents:security-engineer/);
    expect(content).toMatch(/cagents:performance-analyzer/);
    // v12.4.0: test-coverage-validator culled to developer/quality/_deprecated/
    // (zero spawns in 90 days). Coverage validation now handled by qa-lead.
    expect(content).toMatch(/cagents:qa-lead/);
  });

  it('SKILL.md documents per-agent findings output path', () => {
    expect(content).toMatch(/workflow\/detection\/\{group\}\/\{agent\}\.yaml/);
  });

  it('SKILL.md documents PLANNING aggregation with severity × confidence ranking', () => {
    expect(content).toMatch(/severity_weight.*confidence|severity.*confidence.*rank/i);
    expect(content).toMatch(/workflow\/findings\.yaml/);
  });

  it('SKILL.md documents dedupe step in PLANNING', () => {
    expect(content).toMatch(/[Dd]eduplicat/);
  });

  it('SKILL.md documents IMPROVE_DRY_AGENTS=1 for test dry-run', () => {
    expect(content).toMatch(/IMPROVE_DRY_AGENTS=1/);
    expect(content).toMatch(/planned_spawns\.yaml/);
  });

  it('reference/agent-groups.md exists and points at /review source of truth', () => {
    expect(existsSync(AGENT_GROUPS)).toBe(true);
    const ag = readFileSync(AGENT_GROUPS, 'utf8');
    expect(ag).toMatch(/review\/reference\/agent-groups\.md/);
    expect(ag).toMatch(/@include/);
  });

  it('reference/agent-groups.md documents dry-run contract', () => {
    const ag = readFileSync(AGENT_GROUPS, 'utf8');
    expect(ag).toMatch(/IMPROVE_DRY_AGENTS=1/);
    expect(ag).toMatch(/planned_spawns/);
  });

  it('agent-groups source is canonical at improve/reference (V11.0)', () => {
    const improveSource = resolve(
      ROOT,
      '.claude/skills/improve/reference/agent-groups.md'
    );
    expect(existsSync(improveSource)).toBe(true);
    const legacySource = resolve(
      ROOT,
      '.claude/skills/review/reference/agent-groups.md'
    );
    expect(existsSync(legacySource)).toBe(false);
  });
});

describe('V10.26.23 /improve --mode review SCOPING + MEASURING', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');
  const REVIEW_MODE = resolve(
    ROOT,
    '.claude/skills/improve/reference/review-mode.md'
  );
  const BASELINE_MIG = resolve(
    ROOT,
    '.claude/skills/improve/reference/baseline-migration.md'
  );

  it('SKILL.md documents SCOPING: create session, write instruction.yaml', () => {
    expect(content).toMatch(/SCOPING/);
    expect(content).toMatch(/instruction\.yaml/);
    expect(content).toMatch(/session_id/);
    expect(content).toMatch(/improve_\{slug\}/);
  });

  it('SKILL.md documents MEASURING with two-path baseline lookup', () => {
    expect(content).toMatch(/_projects\/\{hash\}\/improve\/baseline\.yaml/);
    expect(content).toMatch(/_projects\/\{hash\}\/review\/baseline\.yaml/);
    expect(content).toMatch(/legacy|Legacy/);
  });

  it('SKILL.md specifies copy-forward on legacy baseline read', () => {
    expect(content).toMatch(/copy[ -]forward|copies? it forward|copy it forward/i);
    expect(content).toMatch(/atomic/i);
  });

  it('SKILL.md documents three baseline_source values', () => {
    expect(content).toMatch(/placeholder/);
    expect(content).toMatch(/legacy_review_migrated/);
    // primary is the default (new baseline exists)
  });

  it('SKILL.md still documents MEASURING completion and next-state hand-off', () => {
    // After V10.26.24 the exit message advances to include DETECTING+PLANNING.
    // The MEASURING step itself remains documented and reachable.
    expect(content).toMatch(/MEASURING/);
    expect(content).toMatch(/baseline_source/);
  });

  it('reference/review-mode.md exists and documents Steps 1-2 as implemented', () => {
    expect(existsSync(REVIEW_MODE)).toBe(true);
    const rm = readFileSync(REVIEW_MODE, 'utf8');
    expect(rm).toMatch(/Step 1:.*SCOPING.*V10\.26\.23.*implemented/);
    expect(rm).toMatch(/Step 2:.*MEASURING.*V10\.26\.23.*implemented/);
  });

  it('reference/baseline-migration.md exists and documents two-path lookup', () => {
    expect(existsSync(BASELINE_MIG)).toBe(true);
    const bm = readFileSync(BASELINE_MIG, 'utf8');
    expect(bm).toMatch(/primary/);
    expect(bm).toMatch(/legacy/);
    expect(bm).toMatch(/placeholder/);
    expect(bm).toMatch(/Atomic/);
  });

  it('baseline migration fallback rule: primary preferred, legacy fallback', () => {
    const bm = readFileSync(BASELINE_MIG, 'utf8');
    // Find the primary/legacy order in the lookup rule
    const primaryIdx = bm.indexOf('primary = cagents-memory/_projects/{hash}/improve');
    const legacyIdx = bm.indexOf('legacy  = cagents-memory/_projects/{hash}/review');
    expect(primaryIdx).toBeGreaterThan(0);
    expect(legacyIdx).toBeGreaterThan(primaryIdx);
  });

  it('baseline migration: legacy file is NOT deleted after copy-forward', () => {
    const bm = readFileSync(BASELINE_MIG, 'utf8');
    expect(bm).toMatch(/NOT deleted|not deleted|untouched/);
  });
});

describe('V10.26.22 /improve 7-state unified machine', () => {
  const STATES = [
    'SCOPING',
    'MEASURING',
    'DETECTING',
    'PLANNING',
    'EXECUTING',
    'VALIDATING',
    'REPORTING',
  ];

  it('SKILL.md enumerates all 7 canonical states', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    for (const state of STATES) {
      expect(content).toMatch(new RegExp(`\\b${state}\\b`));
    }
  });

  it('SKILL.md shows the linear flow SCOPING → ... → REPORTING', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    expect(content).toMatch(
      /SCOPING\s*→\s*MEASURING\s*→\s*DETECTING\s*→\s*PLANNING\s*→\s*EXECUTING\s*→\s*VALIDATING\s*→\s*REPORTING/
    );
  });

  it('SKILL.md documents per-mode branches (review/optimize/full) per state', () => {
    const content = readFileSync(IMPROVE_SKILL, 'utf8');
    // The state table has review/optimize/full columns
    expect(content).toMatch(/review.*optimize.*full/);
  });

  it('reference/state-machine.md documents all 7 states with specs', () => {
    const sm = readFileSync(STATE_MACHINE, 'utf8');
    for (const state of STATES) {
      expect(sm).toMatch(new RegExp(`\\b${state}\\b`));
    }
    // Verify per-state spec sections exist
    expect(sm).toMatch(/### 1\. SCOPING/);
    expect(sm).toMatch(/### 7\. REPORTING/);
  });

  it('reference/state-machine.md declares artifact locations', () => {
    const sm = readFileSync(STATE_MACHINE, 'utf8');
    expect(sm).toMatch(/_projects\/\{hash\}\/improve\/baseline\.yaml/);
    expect(sm).toMatch(/_projects\/\{hash\}\/review\/baseline\.yaml/);
    expect(sm).toMatch(/sessions\/improve_/);
  });
});

describe('V10.26.21 /improve --mode flag parser', () => {
  const content = readFileSync(IMPROVE_SKILL, 'utf8');
  const FLAGS_MD = resolve(ROOT, '.claude/skills/improve/reference/flags.md');

  it('documents accepted --mode review value', () => {
    expect(content).toMatch(/--mode review.*Accepted/s);
  });

  it('documents accepted --mode optimize value', () => {
    expect(content).toMatch(/--mode optimize.*Accepted/s);
  });

  it('documents accepted --mode full value', () => {
    expect(content).toMatch(/--mode full.*Accepted/s);
  });

  it('rejects unknown --mode values with usage message', () => {
    expect(content).toMatch(/unknown --mode value/);
    expect(content).toMatch(/Accepted: review, optimize, full/);
  });

  it('defaults to --mode review when no flag is supplied', () => {
    expect(content).toMatch(/Defaults to.*review|default.*review/i);
  });

  it('V10.26.21 parser rejection path still exits without side effects', () => {
    // After V10.26.23 wired --mode review, only the rejection path remains a
    // no-op parser stub. The rejection message and no-side-effects guard
    // stay in place (unknown --mode values must not create sessions).
    expect(content).toMatch(/Do NOT spawn agents, create sessions, or write/);
    expect(content).toMatch(/unknown --mode value/);
  });

  it('reference/flags.md exists and references the --mode selector', () => {
    expect(existsSync(FLAGS_MD)).toBe(true);
    const flags = readFileSync(FLAGS_MD, 'utf8');
    expect(flags).toMatch(/--mode/);
    expect(flags).toMatch(/review.*optimize.*full/s);
  });
});

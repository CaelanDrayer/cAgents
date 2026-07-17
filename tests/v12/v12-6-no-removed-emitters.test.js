// Regression test for v12.6.0 Pillar 4 (AC-4.1)
// Asserts that no active emitter writes to removed fields/files remain in
// .claude/skills/*/SKILL.md or core/*/SKILL.md.
//
// Removed in v12.6.0 (external-UI-only fields and files):
//   - state_history[].duration_ms
//   - status.yaml: revision_round, validation_cycles, followup_round
//   - workflow/events/EVT-*.yaml + workflow/events/index.yaml
//   - workflow/wave_structure.yaml
//   - workflow/domain_status.yaml
//   - workflow/partial_results.yaml
//   - workflow/delegation_prompts.yaml
//   - team/messages/
//
// Tier-1 SKILL.md files (top-level, actively-loaded) MUST NOT contain
// active "write" instructions for these. Past-tense / historical refs
// (e.g., "v12.6.0 dropped X", "do NOT create X") are allowed.
//
// Tier-3 reference docs in resources/ may retain past-tense refs and
// are NOT scanned by this test.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const TIER1_SKILLS = [
  '.claude/skills/run/SKILL.md',
  '.claude/skills/team/SKILL.md',
  '.claude/skills/designer/SKILL.md',
  '.claude/skills/helper/SKILL.md',
  'agents/core/planner/SKILL.md',
  'agents/core/validator/SKILL.md',
  'agents/core/orchestrator/SKILL.md',
  'agents/core/team-lead/SKILL.md',
  'agents/core/execution-monitor/SKILL.md',
];

// A line is "removing/dropping/no-longer-writes" content if it contains
// past-tense markers. Active emitter lines lack these markers.
const HISTORICAL_MARKERS = [
  'v12.6.0',           // any line that mentions v12.6.0 is a deprecation/removal note
  'v12.6',             // shorter variant
  'removed',           // covers "removed in v12.6", "X removed", etc.
  'no longer',
  'emission removed',
  'dropped',
  'do not create',
  'do not write',
  'do not emit',       // case-insensitive matches "do NOT emit" too
  'skip this step',
  'skip the field',
  'historical',
  'was an external',
  'were external',
  'external-ui',
  'external ui',
  'pre-v12',
];

function isHistoricalLine(line) {
  const lower = line.toLowerCase();
  return HISTORICAL_MARKERS.some(marker => lower.includes(marker.toLowerCase()));
}

const FORBIDDEN_PATTERNS = [
  { name: 'duration_ms', pattern: /duration_ms/ },
  { name: 'revision_round', pattern: /\brevision_round\b/ },
  { name: 'validation_cycles', pattern: /\bvalidation_cycles\b/ },
  { name: 'followup_round', pattern: /\bfollowup_round\b/ },
  { name: 'workflow/events/EVT-', pattern: /workflow\/events\/EVT-/ },
  { name: 'events/index.yaml', pattern: /events\/index\.yaml/ },
  { name: 'wave_structure.yaml', pattern: /wave_structure\.yaml/ },
  { name: 'domain_status.yaml', pattern: /domain_status\.yaml/ },
  { name: 'partial_results.yaml', pattern: /partial_results\.yaml/ },
  { name: 'delegation_prompts.yaml', pattern: /delegation_prompts\.yaml/ },
  { name: 'team/messages', pattern: /team\/messages/ },
];

describe('v12.6.0 AC-4.1: no active emitter writes for removed fields/files', () => {
  for (const skillRelPath of TIER1_SKILLS) {
    const skillPath = path.join(REPO_ROOT, skillRelPath);
    if (!existsSync(skillPath)) {
      it.skip(`${skillRelPath} (file missing)`, () => {});
      continue;
    }
    it(`${skillRelPath} has no active emitter writes for removed fields`, () => {
      const content = readFileSync(skillPath, 'utf8');
      const lines = content.split('\n');
      const activeViolations = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const { name, pattern } of FORBIDDEN_PATTERNS) {
          if (pattern.test(line) && !isHistoricalLine(line)) {
            activeViolations.push(`${skillRelPath}:${i + 1}: active ref to '${name}' — ${line.trim()}`);
          }
        }
      }
      expect(activeViolations, `Active emitter writes found:\n${activeViolations.join('\n')}`).toEqual([]);
    });
  }
});

describe('v12.6.0 AC-4.1: no DECOMPOSED/PROMPTS_READY state names in hooks', () => {
  const HOOK_FILES = [
    '.claude/hooks/verify-completion.cjs',
    '.claude/hooks/pre-compact-save.cjs',
    '.claude/hooks/subagent-tracker.cjs',
    // attention-injection.cjs removed in v12.7.0 (P2-10): 80% no-op rate;
    // post-compact-restore.cjs covers the goal-restore use case.
  ];

  for (const hookRelPath of HOOK_FILES) {
    it(`${hookRelPath} has no DECOMPOSED or PROMPTS_READY refs`, () => {
      const hookPath = path.join(REPO_ROOT, hookRelPath);
      expect(existsSync(hookPath), `${hookRelPath} must exist`).toBe(true);
      const content = readFileSync(hookPath, 'utf8');
      expect(content, `${hookRelPath} must not reference DECOMPOSED`).not.toMatch(/\bDECOMPOSED\b/);
      expect(content, `${hookRelPath} must not reference PROMPTS_READY`).not.toMatch(/\bPROMPTS_READY\b/);
    });
  }
});

describe('v12.6.0 AC-4.2: KEEP allowlist preserved', () => {
  it('audit-trail emitters still referenced in active code', () => {
    // file_changes.log, agent_tree.yaml, team/metrics/ — must still appear
    // in at least one tier-1 SKILL.md or hook (proof they are still emitted).
    const KEEP_FILES = [
      'file_changes.log',
      'agent_tree.yaml',
      'team/metrics',
      'child_controllers.yaml',
      'outputs/strategic',
    ];
    const SCAN_FILES = [
      ...TIER1_SKILLS,
      '.claude/hooks/verify-completion.cjs',
      '.claude/hooks/post-write-validator.cjs',
      '.claude/hooks/subagent-tracker.cjs',
    ];

    for (const keep of KEEP_FILES) {
      let found = false;
      for (const f of SCAN_FILES) {
        const p = path.join(REPO_ROOT, f);
        if (!existsSync(p)) continue;
        if (readFileSync(p, 'utf8').includes(keep)) {
          found = true;
          break;
        }
      }
      expect(found, `KEEP allowlist file '${keep}' must still be referenced in some active code path`).toBe(true);
    }
  });
});

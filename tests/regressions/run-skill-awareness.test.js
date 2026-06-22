/**
 * Regression: workspace skill awareness (reuse-before-rebuild).
 *
 * Ensures /run can SEE and WORK WITH skills already present in a workspace
 * instead of reinventing them. Pins:
 *   (1) /run declares the Skill tool in allowed-tools (also fixes the latent
 *       team-mode `Skill({skill:"team"})` reference that had no tool grant).
 *   (2) /run SKILL.md wires the discovery step (writes available_skills.yaml)
 *       and points at the skill-awareness reference doc.
 *   (3) The skill-awareness reference doc exists and documents the contract:
 *       available_skills.yaml, assigned_skill, and the exclusion of cAgents'
 *       own run/team/designer/helper skills.
 *   (4) The planner consults available_skills.yaml and can assign_skill.
 *   (5) controllers.md documents Skill-tool invocation + graceful fallback.
 *   (6) Every controller-tier agent actually has the Skill tool (capability is
 *       real, not just documented) — without it the invocation contract is a
 *       dead letter.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUN_SKILL = path.join(REPO_ROOT, '.claude', 'skills', 'run', 'SKILL.md');
const SKILL_AWARENESS = path.join(REPO_ROOT, '.claude', 'skills', 'run', 'reference', 'skill-awareness.md');
const PLANNER = path.join(REPO_ROOT, 'agents', 'core', 'planner', 'SKILL.md');
const CONTROLLERS_MD = path.join(REPO_ROOT, '.claude', 'rules', 'core', 'controllers.md');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');

function walkSkillMd(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSkillMd(full));
    else if (entry.name === 'SKILL.md') out.push(full);
  }
  return out;
}

describe('workspace skill awareness', () => {
  it('(1) /run declares the Skill tool in allowed-tools', () => {
    const body = fs.readFileSync(RUN_SKILL, 'utf8');
    const line = body.split('\n').find((l) => l.startsWith('allowed-tools:'));
    expect(line).toBeTruthy();
    expect(/\bSkill\b/.test(line)).toBe(true);
  });

  it('(2) /run wires skill discovery and references the doc', () => {
    const body = fs.readFileSync(RUN_SKILL, 'utf8');
    expect(body).toMatch(/available_skills\.yaml/);
    expect(body).toMatch(/skill-awareness\.md/);
    // Must exclude cAgents' own skills from discovery.
    expect(body).toMatch(/EXCLUDE[^\n]*run[^\n]*team[^\n]*designer[^\n]*helper/i);
  });

  it('(3) skill-awareness reference doc documents the contract', () => {
    expect(fs.existsSync(SKILL_AWARENESS)).toBe(true);
    const body = fs.readFileSync(SKILL_AWARENESS, 'utf8');
    expect(body).toMatch(/available_skills\.yaml/);
    expect(body).toMatch(/assigned_skill/);
    expect(body).toMatch(/reuse[- ]before[- ]rebuild/i);
    // Recursion guard: never route back into cAgents' own skills.
    expect(body).toMatch(/run.*team.*designer.*helper/);
  });

  it('(4) planner consults available_skills.yaml and can assign a skill', () => {
    const body = fs.readFileSync(PLANNER, 'utf8');
    expect(body).toMatch(/available_skills\.yaml/);
    expect(body).toMatch(/assigned_skill/);
  });

  it('(5) controllers.md documents Skill-tool invocation + fallback', () => {
    const body = fs.readFileSync(CONTROLLERS_MD, 'utf8');
    expect(body).toMatch(/assigned_skill/);
    expect(body).toMatch(/Skill\(\{\s*skill:/);
    expect(body).toMatch(/skill_fallback/);
  });

  it('(6) every controller-tier agent has the Skill tool', () => {
    const skillFiles = walkSkillMd(AGENTS_DIR);
    const offenders = [];
    for (const f of skillFiles) {
      const body = fs.readFileSync(f, 'utf8');
      if (!/^\s*tier:\s*controller\s*$/m.test(body)) continue;
      const line = body.split('\n').find((l) => l.startsWith('allowed-tools:')) || '';
      if (!/\bSkill\b/.test(line)) offenders.push(path.relative(REPO_ROOT, f));
    }
    expect(offenders).toEqual([]);
  });
});

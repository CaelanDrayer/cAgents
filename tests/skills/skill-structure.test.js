import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const SKILLS_DIR = join(process.cwd(), '.claude', 'skills');

// v12.2.0: 4 surviving user-invocable skills. /org was absorbed into
// /team strategic mode in v12.2.0. /improve was folded into /act via a
// first-word keyword router (improve|review|audit|optimize) in v12.1.2.
// V11.0 had already removed context, debug, review, optimize.
// The `run` skill was renamed to `act` (it collided with Claude Code's
// built-in `run` skill).
const SKILL_NAMES = [
  'act',
  'designer',
  'helper',
  'team',
];

// Agent Skills spec: only these 6 top-level fields are allowed
const ALLOWED_TOP_LEVEL_FIELDS = new Set([
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
]);

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Returns null if no frontmatter found.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  return yaml.load(match[1]);
}

function readSkill(skillName) {
  const skillPath = join(SKILLS_DIR, skillName, 'SKILL.md');
  return readFileSync(skillPath, 'utf8');
}

/**
 * Detect any MANDATORY / imperative TeamCreate|TeamDelete call site in a SKILL.md.
 *
 * v12.42.0: Claude Code v2.1.178 REMOVED the TeamCreate/TeamDelete tools — teams
 * are now IMPLICIT (nothing to create; cleanup is automatic at session end). The
 * /team skill was re-anchored on the concurrent-Agent wave DEFAULT model, so it
 * must NOT present TeamCreate/TeamDelete as a required step. A residual mention is
 * allowed ONLY when framed historically/negated ("removed in 2.1.178", "do NOT
 * call TeamCreate", "teams are implicit", "no TeamDelete").
 *
 * A violation is any of:
 *   (A) allowed-tools grants TeamCreate or TeamDelete (a removed tool), OR
 *   (B) a body line that — outside a historical/negated framing — either
 *       calls a removed tool ("TeamCreate(" / "TeamDelete("), declares it
 *       mandatory ("TeamCreate is mandatory"), or names it in a step heading
 *       ("## Step 3 — TeamCreate").
 *
 * Returns a list of human-readable violation strings (empty = compliant). This is
 * the bug-driven regression pin: it returns >0 for the pre-fix /team SKILL.md
 * (which listed TeamCreate/TeamDelete in allowed-tools and had a "Step 3 —
 * TeamCreate" call site) and 0 for the re-anchored concurrent-Agent model.
 */
function teamCreateMandateViolations(content) {
  const fm = parseFrontmatter(content) || {};
  const violations = [];

  // (A) allowed-tools must NOT grant the removed TeamCreate/TeamDelete tools.
  const tools = String(fm['allowed-tools'] || '')
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  for (const t of ['TeamCreate', 'TeamDelete']) {
    if (tools.includes(t)) violations.push(`allowed-tools grants removed tool ${t}`);
  }

  // (B) body must NOT present TeamCreate/TeamDelete as a required/imperative step.
  const body = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
  // A mention framed as history or negation is allowed (it is the CORRECT new prose).
  const HISTORICAL =
    /removed in|2\.1\.178|do not call|never call|no team(create|delete)|nothing to create|teams are implicit|cleanup is automatic/i;
  body.split('\n').forEach((line, i) => {
    if (!/Team(Create|Delete)/.test(line)) return;
    const stripped = line.replace(/`/g, ''); // drop markdown backticks
    if (HISTORICAL.test(stripped)) return; // historical/negated framing is allowed
    if (
      /\bTeam(Create|Delete)\s*\(/.test(stripped) || // an actual call: TeamCreate( ... )
      /Team(Create|Delete)\s+is\s+mandatory/i.test(stripped) ||
      /^#{1,6}\s.*\bTeamCreate\b/.test(stripped) // a step/section heading named TeamCreate
    ) {
      violations.push(`line ${i + 1}: ${line.trim()}`);
    }
  });
  return violations;
}

// ─── Directory and file existence ──────────────────────────────────────────

describe('Skill directories', () => {
  it.each(SKILL_NAMES)('%s directory exists under .claude/skills/', (skill) => {
    expect(existsSync(join(SKILLS_DIR, skill))).toBe(true);
  });
});

describe('SKILL.md files', () => {
  it.each(SKILL_NAMES)('%s/SKILL.md exists', (skill) => {
    expect(existsSync(join(SKILLS_DIR, skill, 'SKILL.md'))).toBe(true);
  });
});

// ─── Frontmatter structure ─────────────────────────────────────────────────

describe('SKILL.md frontmatter — required fields', () => {
  it.each(SKILL_NAMES)('%s has valid YAML frontmatter', (skill) => {
    const content = readSkill(skill);
    const fm = parseFrontmatter(content);
    expect(fm, `${skill}/SKILL.md has no parseable YAML frontmatter`).not.toBeNull();
  });

  it.each(SKILL_NAMES)('%s frontmatter has required "name" field', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    expect(typeof fm.name).toBe('string');
    expect(fm.name.length).toBeGreaterThan(0);
  });

  it.each(SKILL_NAMES)('%s frontmatter has required "description" field', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    expect(typeof fm.description).toBe('string');
    expect(fm.description.length).toBeGreaterThan(0);
  });

  it.each(SKILL_NAMES)('%s "name" matches directory name', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    expect(fm.name).toBe(skill);
  });
});

// ─── Agent Skills spec compliance: only 6 allowed top-level fields ─────────

describe('SKILL.md frontmatter — Agent Skills spec compliance (6 allowed top-level fields)', () => {
  it.each(SKILL_NAMES)('%s has only allowed top-level fields', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    const actualFields = Object.keys(fm);
    const disallowed = actualFields.filter((f) => !ALLOWED_TOP_LEVEL_FIELDS.has(f));
    expect(
      disallowed,
      `${skill}/SKILL.md has disallowed top-level fields: ${disallowed.join(', ')}`
    ).toHaveLength(0);
  });
});

// ─── metadata Claude Code extensions ──────────────────────────────────────

describe('SKILL.md frontmatter — metadata Claude Code extensions', () => {
  it.each(SKILL_NAMES)('%s has metadata map', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    expect(fm.metadata, `${skill}/SKILL.md missing metadata map`).toBeDefined();
    expect(typeof fm.metadata).toBe('object');
  });

  it.each(SKILL_NAMES)('%s metadata has "argument-hint"', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    expect(
      typeof fm.metadata['argument-hint'],
      `${skill}/SKILL.md metadata missing argument-hint`
    ).toBe('string');
  });

  it.each(SKILL_NAMES)('%s metadata has "user-invocable"', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    // Stored as a string per Agent Skills spec ("true"/"false")
    expect(
      fm.metadata['user-invocable'],
      `${skill}/SKILL.md metadata missing user-invocable`
    ).toBeDefined();
  });

  it.each(SKILL_NAMES)('%s metadata has "context"', (skill) => {
    const fm = parseFrontmatter(readSkill(skill));
    expect(
      fm.metadata['context'],
      `${skill}/SKILL.md metadata missing context`
    ).toBeDefined();
    expect(['fork', 'none']).toContain(fm.metadata['context']);
  });
});

// ─── Skill-specific content assertions ────────────────────────────────────

describe('/act SKILL.md content', () => {
  it('contains delegation enforcement section (Rationalization Kill List)', () => {
    const content = readSkill('act');
    expect(content).toContain('Rationalization Kill List');
  });

  it('contains critical delegator declaration', () => {
    const content = readSkill('act');
    expect(content).toMatch(/You Are a Delegator, Not a Doer/i);
  });
});

describe('/team SKILL.md content', () => {
  it('contains wave execution steps', () => {
    const content = readSkill('team');
    expect(content).toMatch(/wave|Wave/);
  });

  it('contains Maximize Waves directive', () => {
    const content = readSkill('team');
    expect(content).toMatch(/Maximize Waves|more waves/i);
  });

  // v12.42.0 bug-driven regression pin: Claude Code v2.1.178 removed the
  // TeamCreate/TeamDelete tools, so /team was re-anchored on the concurrent-Agent
  // wave DEFAULT model (teams are implicit). The skill must present NO mandatory
  // TeamCreate/TeamDelete call site — only historical/negated mentions are allowed.
  // This inverts the former `contains TeamCreate reference` assertion, which passed
  // even for the pre-fix skill that had `TeamCreate` in allowed-tools and a
  // `## Step 3 — TeamCreate` call site. This assertion FAILS against that pre-fix
  // SKILL.md and PASSES against the re-anchored model.
  it('has no mandatory TeamCreate/TeamDelete call site (v12.42.0: teams are implicit)', () => {
    const content = readSkill('team');
    const violations = teamCreateMandateViolations(content);
    expect(
      violations,
      `/team SKILL.md must not present TeamCreate/TeamDelete as a required step ` +
        `(removed in Claude Code v2.1.178 — teams are implicit). Offending lines:\n` +
        violations.join('\n')
    ).toHaveLength(0);
  });

  it('contains strategic mode reference (v12.2.0: absorbed /org)', () => {
    // /org was absorbed into /team strategic mode in v12.2.0. The /team
    // SKILL.md must surface strategic mode and the C-suite framing.
    const content = readSkill('team');
    expect(content).toMatch(/strategic mode|Strategic Mode/);
    expect(content).toMatch(/C-suite|corporate hierarchy/i);
  });
});

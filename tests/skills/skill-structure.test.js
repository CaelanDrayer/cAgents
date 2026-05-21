import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

const SKILLS_DIR = join(process.cwd(), '.claude', 'skills');

// v12.1.2: 5 surviving user-invocable skills. /improve was folded into
// /run via a first-word keyword router (improve|review|audit|optimize)
// in v12.1.2. V11.0 had already removed context, debug, review, optimize.
const SKILL_NAMES = [
  'designer',
  'helper',
  'org',
  'run',
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

describe('/run SKILL.md content', () => {
  it('contains delegation enforcement section (Rationalization Kill List)', () => {
    const content = readSkill('run');
    expect(content).toContain('Rationalization Kill List');
  });

  it('contains critical delegator declaration', () => {
    const content = readSkill('run');
    expect(content).toMatch(/You Are a Delegator, Not a Doer/i);
  });
});

describe('/org SKILL.md content', () => {
  it('contains Rationalization Kill List', () => {
    const content = readSkill('org');
    expect(content).toContain('Rationalization Kill List');
  });

  it('contains corporate hierarchy reference', () => {
    const content = readSkill('org');
    expect(content).toMatch(/C-suite|corporate hierarchy/i);
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

  it('contains TeamCreate reference', () => {
    const content = readSkill('team');
    expect(content).toContain('TeamCreate');
  });
});

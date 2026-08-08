/**
 * Advisory validator F2 — trigger-collision regression tests.
 *
 * Covers scripts/ci/advisory/trigger-collision.cjs:
 *   - the pure classification helpers (classifyTrigger / classifyBaiting) fire
 *     on a crafted bad case for each of TR1 / TR2 / TR3,
 *   - the four real skills (act / team / designer / helper) owning their own
 *     names do NOT produce TR2 self-collisions,
 *   - run() against the live catalog never throws and returns an array,
 *   - scanRoot() over a temp fixture tree emits the expected findings and does
 *     NOT flag a good skill that owns its own name.
 *
 * Hermetic: helper tests use no filesystem; the scan test builds a temp
 * SKILL.md tree and points scanRoot() at it. The real scripts/ci/advisory tree
 * is only exercised read-only by the "run() never throws" smoke test.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const MOD = join(ROOT, 'scripts', 'ci', 'advisory', 'trigger-collision.cjs');
const validator = require(MOD);
const {
  parseTriggers,
  extractTriggerClauses,
  classifyTrigger,
  classifyBaiting,
  isOwnerRooted,
  scanRoot,
  run,
  RESERVED_SKILLS,
  RESERVED_BUILTINS,
} = validator;

describe('trigger-collision module shape', () => {
  it('exports the advisory-validator contract', () => {
    expect(validator.meta).toBeTruthy();
    expect(validator.meta.id).toBe('trigger-collision');
    expect(typeof validator.meta.description).toBe('string');
    expect(typeof validator.run).toBe('function');
  });
});

describe('parseTriggers / extractTriggerClauses', () => {
  it('splits a comma-separated TRIGGER clause into normalized keywords', () => {
    expect(parseTriggers('run, implement, Fix , build ,')).toEqual([
      'run',
      'implement',
      'fix',
      'build',
    ]);
  });

  it('extracts TRIGGER clauses from description text (stops at first period)', () => {
    const desc =
      'Do X. TRIGGER: run, implement, fix, build, create. NOT for: parallel work.';
    expect(extractTriggerClauses(desc)).toEqual([
      'run, implement, fix, build, create',
    ]);
  });

  it('returns [] when no TRIGGER clause is present', () => {
    expect(extractTriggerClauses('A plain description with no trigger marker.')).toEqual([]);
  });
});

describe('TR1 — over-broad triggers', () => {
  it('fires on a single ultra-common word declared by a non-owner', () => {
    const hits = classifyTrigger('go', 'roadmap-runner');
    expect(hits.map((h) => h.ruleId)).toContain('trigger-tr1-overbroad');
    expect(hits.find((h) => h.ruleId === 'trigger-tr1-overbroad').severity).toBe('MEDIUM');
  });

  it('fires on a <=2 character trigger', () => {
    const hits = classifyTrigger('xy', 'some-agent');
    expect(hits.map((h) => h.ruleId)).toContain('trigger-tr1-overbroad');
  });

  it('does NOT fire on a specific multi-word or specific single-word trigger', () => {
    expect(classifyTrigger('product roadmap execution', 'roadmap-runner')).toEqual([]);
    expect(classifyTrigger('refactor', 'some-agent')).toEqual([]);
    // Specific verbs the real skills use must stay clean.
    for (const t of ['implement', 'fix', 'build', 'create', 'parallel', 'swarm', 'strategic']) {
      expect(classifyTrigger(t, 'act').filter((h) => h.ruleId === 'trigger-tr1-overbroad')).toEqual([]);
    }
  });

  it('exempts an owner-name-rooted trigger (helper owns "help")', () => {
    expect(isOwnerRooted('help', 'helper')).toBe(true);
    expect(classifyTrigger('help', 'helper').filter((h) => h.ruleId === 'trigger-tr1-overbroad')).toEqual([]);
  });

  it('does NOT over-exempt a short generic word via a long owner name', () => {
    // "do" must not be exempted just because "documentation-agent" starts with "do".
    expect(isOwnerRooted('do', 'documentation-agent')).toBe(false);
    expect(classifyTrigger('do', 'documentation-agent').map((h) => h.ruleId)).toContain(
      'trigger-tr1-overbroad',
    );
  });
});

describe('TR2 — shadow reserved names', () => {
  it('classifies `run` as a reserved BUILT-IN and `act` as a reserved cAgents SKILL', () => {
    // The `/run` -> `/act` rename: Claude Code shipped its own built-in `run`
    // skill, so `run` is no longer a cAgents skill name — it moved from
    // RESERVED_SKILLS to RESERVED_BUILTINS, and `act` took its place.
    expect([...RESERVED_SKILLS].sort()).toEqual(['act', 'designer', 'helper', 'team']);
    expect(RESERVED_BUILTINS.has('run')).toBe(true);
    expect(RESERVED_SKILLS.has('run')).toBe(false);
    expect(RESERVED_BUILTINS.has('act')).toBe(false);
    // Both sets still shadow-guard, but the finding text names the right kind.
    const asBuiltin = classifyTrigger('run', 'roadmap-runner').find(
      (h) => h.ruleId === 'trigger-tr2-shadow',
    );
    expect(asBuiltin.reason).toMatch(/reserved built-in name "run"/);
    const asSkill = classifyTrigger('act', 'roadmap-runner').find(
      (h) => h.ruleId === 'trigger-tr2-shadow',
    );
    expect(asSkill.reason).toMatch(/reserved skill name "act"/);
  });

  it('fires HIGH when a different owner claims a reserved skill name', () => {
    const hits = classifyTrigger('act', 'roadmap-runner');
    const tr2 = hits.find((h) => h.ruleId === 'trigger-tr2-shadow');
    expect(tr2).toBeTruthy();
    expect(tr2.severity).toBe('HIGH');
  });

  it('fires HIGH when any owner claims a reserved built-in name (run/memory/init)', () => {
    expect(classifyTrigger('run', 'roadmap-runner').map((h) => h.ruleId)).toContain(
      'trigger-tr2-shadow',
    );
    expect(classifyTrigger('memory', 'notes-agent').map((h) => h.ruleId)).toContain(
      'trigger-tr2-shadow',
    );
    expect(classifyTrigger('init', 'bootstrap-agent').map((h) => h.ruleId)).toContain(
      'trigger-tr2-shadow',
    );
  });

  it('does NOT fire when the owner IS the reserved name (self-ownership)', () => {
    for (const name of ['act', 'team', 'designer', 'helper']) {
      const tr2 = classifyTrigger(name, name).filter((h) => h.ruleId === 'trigger-tr2-shadow');
      expect(tr2).toEqual([]);
    }
  });
});

describe('TR3 — keyword-baiting', () => {
  it('detects engineered over-activation phrases', () => {
    expect(classifyBaiting('Use this whenever the user says anything about work.')).toBeTruthy();
    expect(classifyBaiting('Always use this agent for every task.')).toBeTruthy();
    expect(classifyBaiting('Handles for any request the user makes.')).toBeTruthy();
  });

  it('does NOT match ordinary "Use when ..." / "Execute any task ..." descriptions', () => {
    expect(classifyBaiting('Execute any task through coordinated agents. Use for building.')).toBeNull();
    expect(classifyBaiting('Use when content needs polish, prose is awkward.')).toBeNull();
    expect(classifyBaiting('Consolidated backend agent. Modes: api, database, engine.')).toBeNull();
  });
});

describe('run() over the live catalog', () => {
  it('never throws and returns an array of well-shaped findings', () => {
    const findings = run();
    expect(Array.isArray(findings)).toBe(true);
    for (const f of findings) {
      expect(['trigger-tr1-overbroad', 'trigger-tr2-shadow', 'trigger-tr3-baiting']).toContain(f.ruleId);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(f.severity);
      expect(typeof f.file).toBe('string');
    }
  });

  it('does NOT emit a TR2 self-collision for the four real skills', () => {
    const findings = run();
    const selfShadows = findings.filter(
      (f) =>
        f.ruleId === 'trigger-tr2-shadow' &&
        /\.claude\/skills\/(act|team|designer|helper)\/SKILL\.md/.test(f.file),
    );
    expect(selfShadows).toEqual([]);
  });
});

describe('scanRoot() over a temp fixture tree', () => {
  let tmp;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cagents-trigger-'));

    const writeSkill = (name, description) => {
      const dir = join(tmp, '.claude', 'skills', name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'SKILL.md'),
        `---\nname: ${name}\ndescription: "${description}"\n---\n\n# ${name}\nbody.\n`,
        'utf8',
      );
    };
    const writeAgent = (relDir, name, description) => {
      const dir = join(tmp, 'agents', relDir, name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'SKILL.md'),
        `---\nname: ${name}\ndescription: "${description}"\n---\n\n# ${name}\n- always use parameterized queries in the body (must NOT trip TR3).\n`,
        'utf8',
      );
    };

    // A GOOD skill that owns its own name (must not self-collide on TR2).
    writeSkill('act', 'Execute any task. TRIGGER: act, implement, fix, build, create. NOT for: parallel.');
    // A BAD skill: shadows /act (TR2) and declares an ultra-generic trigger (TR1).
    writeSkill('roadmap-runner', 'Roadmap runner. TRIGGER: act, roadmap, go. NOT for: nothing.');
    // A GOOD agent (no TRIGGER, clean description) — must yield 0 findings.
    writeAgent('developer/backend', 'backend-developer', 'Consolidated backend agent. Modes: api, database.');
    // A BAD agent: keyword-baiting description (TR3).
    writeAgent('operator/content', 'shout-agent', 'Use this whenever the user says anything at all.');
  });

  afterAll(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  it('flags the bad skill (TR2 + TR1) and the bad agent (TR3), not the good ones', () => {
    const findings = scanRoot(tmp);
    const by = (rule) => findings.filter((f) => f.ruleId === rule);

    // TR2: exactly the roadmap-runner shadow of /act.
    const tr2 = by('trigger-tr2-shadow');
    expect(tr2.length).toBe(1);
    expect(tr2[0].file).toMatch(/roadmap-runner/);
    expect(tr2[0].severity).toBe('HIGH');

    // TR1: "go" from roadmap-runner (and nothing from the good skill).
    const tr1 = by('trigger-tr1-overbroad');
    expect(tr1.length).toBeGreaterThanOrEqual(1);
    expect(tr1.every((f) => /roadmap-runner/.test(f.file))).toBe(true);

    // TR3: exactly the shout-agent baiting description.
    const tr3 = by('trigger-tr3-baiting');
    expect(tr3.length).toBe(1);
    expect(tr3[0].file).toMatch(/shout-agent/);

    // The good skill "act" and the clean backend-developer produce no findings.
    expect(findings.some((f) => /skills\/act\/SKILL\.md/.test(f.file))).toBe(false);
    expect(findings.some((f) => /backend-developer/.test(f.file))).toBe(false);
  });

  it('reports repo-relative paths and best-effort line numbers', () => {
    const findings = scanRoot(tmp);
    for (const f of findings) {
      expect(f.file.startsWith('/')).toBe(false);
      expect(f.file.endsWith('SKILL.md')).toBe(true);
      expect(f.line === null || typeof f.line === 'number').toBe(true);
    }
  });
});

// Regression test for REC-01 (v12.46.0): canonical terminal-state enum +
// normalizer + CI guard. Failing-before/passing-after: before this bump
// normalizeTerminalState / isTerminalState did not exist and there was no
// validate-terminal-states guard.
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const VALIDATOR = join(process.cwd(), 'scripts', 'ci', 'validate-terminal-states.cjs');

function freshUtils() {
  const p = join(HOOKS_DIR, 'hook-utils.cjs');
  delete require.cache[require.resolve(p)];
  return require(p);
}

describe('REC-01 terminal-state vocabulary', () => {
  describe('exports + canonical set', () => {
    it('exports normalizeTerminalState, isTerminalState, TERMINAL_ALIASES', () => {
      const u = freshUtils();
      expect(typeof u.normalizeTerminalState).toBe('function');
      expect(typeof u.isTerminalState).toBe('function');
      expect(typeof u.TERMINAL_ALIASES).toBe('object');
    });

    it('TERMINAL_STATES holds only canonical forms (no aliases)', () => {
      const u = freshUtils();
      expect(u.TERMINAL_STATES).toEqual(['VALIDATED', 'complete', 'failed', 'aborted', 'incomplete']);
      // aliases must NOT leak into the canonical list
      expect(u.TERMINAL_STATES).not.toContain('completed');
      expect(u.TERMINAL_STATES).not.toContain('COMPLETE');
      expect(u.TERMINAL_STATES).not.toContain('FINALIZED');
    });
  });

  describe('normalizeTerminalState', () => {
    const cases = [
      ['completed', 'complete'],
      ['COMPLETE', 'complete'],
      ['FINALIZED', 'complete'],
      ['Completed', 'complete'],   // case-insensitive alias fold
      ['finalized', 'complete'],   // case-insensitive alias fold
      ['complete', 'complete'],
      ['validated', 'VALIDATED'],  // case-insensitive canonical fold
      ['VALIDATED', 'VALIDATED'],
      ['  complete  ', 'complete'], // trims
      ['INIT', 'INIT'],            // transient passthrough
      ['TEAM_CREATED', 'TEAM_CREATED'],
    ];
    it.each(cases)('normalizeTerminalState(%s) === %s', (input, expected) => {
      const u = freshUtils();
      expect(u.normalizeTerminalState(input)).toBe(expected);
    });

    it('returns non-strings unchanged', () => {
      const u = freshUtils();
      expect(u.normalizeTerminalState(null)).toBe(null);
      expect(u.normalizeTerminalState(undefined)).toBe(undefined);
    });
  });

  describe('isTerminalState', () => {
    it('aliases resolve terminal (preserves legacy "completed" recognition)', () => {
      const u = freshUtils();
      expect(u.isTerminalState('completed')).toBe(true);
      expect(u.isTerminalState('COMPLETE')).toBe(true);
      expect(u.isTerminalState('FINALIZED')).toBe(true);
    });

    it('canonical terminals are terminal', () => {
      const u = freshUtils();
      for (const s of ['VALIDATED', 'complete', 'failed', 'aborted', 'incomplete']) {
        expect(u.isTerminalState(s)).toBe(true);
      }
    });

    it('TEAM_CREATED is NOT terminal (it is a stall)', () => {
      const u = freshUtils();
      expect(u.isTerminalState('TEAM_CREATED')).toBe(false);
    });

    it('transient + off-enum + nullish are NOT terminal', () => {
      const u = freshUtils();
      for (const s of ['INIT', 'ORCHESTRATED', 'PLANNED', 'COORDINATED', 'validating', 'DONE_MAYBE', '']) {
        expect(u.isTerminalState(s)).toBe(false);
      }
      expect(u.isTerminalState(null)).toBe(false);
      expect(u.isTerminalState(undefined)).toBe(false);
    });
  });

  describe('routed readers agree', () => {
    // Structural: the reader hooks route through isTerminalState() rather than a
    // raw TERMINAL_STATES.includes(rawValue). The only remaining raw .includes in
    // hook-utils.cjs is the canonical membership check INSIDE isTerminalState.
    it('hook-utils.cjs findMostRecentSessionDir routes through isTerminalState', () => {
      const src = readFileSync(join(HOOKS_DIR, 'hook-utils.cjs'), 'utf8');
      expect(src).toContain('isTerminalState(phase)');
    });

    it('verify-completion.cjs has no raw TERMINAL_STATES.includes reader', () => {
      const src = readFileSync(join(HOOKS_DIR, 'verify-completion.cjs'), 'utf8');
      expect(src.includes('TERMINAL_STATES.includes')).toBe(false);
      expect(src).toContain('isTerminalState(');
    });

    it('session-catchup.cjs has no raw TERMINAL_STATES.includes reader', () => {
      const src = readFileSync(join(HOOKS_DIR, 'session-catchup.cjs'), 'utf8');
      expect(src.includes('TERMINAL_STATES.includes')).toBe(false);
      expect(src).toContain('isTerminalState(');
    });

    it('behavioral: isTerminalState agrees with the pre-REC-01 accepted set', () => {
      const u = freshUtils();
      // Every value the OLD list accepted must still be terminal via the router.
      for (const s of ['completed', 'complete', 'failed', 'aborted', 'COMPLETE', 'VALIDATED']) {
        expect(u.isTerminalState(s)).toBe(true);
      }
    });
  });

  describe('CI guard: validate-terminal-states.cjs', () => {
    it('passes green against the current repo', () => {
      const r = spawnSync('node', [VALIDATOR], { encoding: 'utf8' });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('PASS');
    });

    it('rejects a fixture SKILL with a non-canonical phase: FINALIZED', () => {
      const root = mkdtempSync(join(tmpdir(), 'rec01-'));
      mkdirSync(join(root, '.claude', 'skills', 'badskill'), { recursive: true });
      writeFileSync(
        join(root, '.claude', 'skills', 'badskill', 'SKILL.md'),
        'name: bad\nphase: FINALIZED\n'
      );
      const r = spawnSync('node', [VALIDATOR], {
        encoding: 'utf8',
        env: { ...process.env, CAGENTS_PROJECT_ROOT: root },
      });
      expect(r.status).toBe(1);
      expect(r.stderr + r.stdout).toContain('FINALIZED');
    });

    it('accepts a fixture SKILL using canonical + transient values', () => {
      const root = mkdtempSync(join(tmpdir(), 'rec01ok-'));
      mkdirSync(join(root, '.claude', 'skills', 'goodskill'), { recursive: true });
      writeFileSync(
        join(root, '.claude', 'skills', 'goodskill', 'SKILL.md'),
        'name: good\nphase: complete\npipeline_state: VALIDATED\nphase: empathize\npipeline_state: INIT\n'
      );
      const r = spawnSync('node', [VALIDATOR], {
        encoding: 'utf8',
        env: { ...process.env, CAGENTS_PROJECT_ROOT: root },
      });
      expect(r.status).toBe(0);
    });

    it('rejects an off-enum pipeline_state that is neither transient nor terminal', () => {
      const root = mkdtempSync(join(tmpdir(), 'rec01off-'));
      mkdirSync(join(root, '.claude', 'skills', 'x'), { recursive: true });
      writeFileSync(join(root, '.claude', 'skills', 'x', 'SKILL.md'), 'pipeline_state: DONE_MAYBE\n');
      const r = spawnSync('node', [VALIDATOR], {
        encoding: 'utf8',
        env: { ...process.env, CAGENTS_PROJECT_ROOT: root },
      });
      expect(r.status).toBe(1);
      expect(r.stderr + r.stdout).toContain('DONE_MAYBE');
    });
  });
});

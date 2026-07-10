/**
 * Advisory-validator runner regression tests (F6).
 *
 * Covers the WARN-only runner (scripts/ci/run-advisory.cjs) and the baseline /
 * suppression library (scripts/ci/lib/validator-baseline.cjs):
 *   - a fixture validator returning 1 finding is collected,
 *   - a glob-rule baseline entry suppresses it,
 *   - an exact-fingerprint baseline entry suppresses it,
 *   - --format json emits the documented shape,
 *   - the runner exits 0 even with findings (advisory gate).
 *
 * Hermetic: the runner is pointed at a temp advisory dir + temp baseline via
 * CAGENTS_ADVISORY_DIR / CAGENTS_ADVISORY_BASELINE so the real
 * scripts/ci/advisory/ tree is never touched.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const RUNNER = join(ROOT, 'scripts', 'ci', 'run-advisory.cjs');
const LIB = join(ROOT, 'scripts', 'ci', 'lib', 'validator-baseline.cjs');
const { fingerprint, isSuppressed, loadBaseline } = require(LIB);

// The single finding the fixture validator emits.
const FIXTURE_FINDING = {
  ruleId: 'demo-rule',
  severity: 'HIGH',
  file: 'agents/foo/SKILL.md',
  line: 42,
  message: 'demo finding for the advisory runner test',
};

const FIXTURE_VALIDATOR = `'use strict';
module.exports = {
  meta: { id: 'demo-validator', description: 'fixture validator for tests' },
  run() {
    return [${JSON.stringify(FIXTURE_FINDING)}];
  },
};
`;

let tmpAdvisoryDir;

function writeBaseline(yamlText) {
  const p = join(tmpAdvisoryDir, 'baseline.yaml');
  writeFileSync(p, yamlText, 'utf8');
  return p;
}

function runRunner(args = [], extraEnv = {}) {
  const env = {
    ...process.env,
    CAGENTS_ADVISORY_DIR: tmpAdvisoryDir,
    ...extraEnv,
  };
  try {
    const stdout = execFileSync('node', [RUNNER, ...args], {
      env,
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return {
      code: err.status ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

beforeAll(() => {
  tmpAdvisoryDir = mkdtempSync(join(tmpdir(), 'cagents-advisory-'));
  // Drop the fixture validator + a README (which must be ignored).
  writeFileSync(join(tmpAdvisoryDir, 'demo-validator.cjs'), FIXTURE_VALIDATOR, 'utf8');
  writeFileSync(join(tmpAdvisoryDir, 'README.md'), '# ignored\n', 'utf8');
});

afterAll(() => {
  if (tmpAdvisoryDir) rmSync(tmpAdvisoryDir, { recursive: true, force: true });
});

describe('advisory runner (F6)', () => {
  it('collects a finding from a fixture validator (no baseline suppression)', () => {
    const baseline = writeBaseline('suppress: []\n');
    const res = runRunner(['--format', 'json'], { CAGENTS_ADVISORY_BASELINE: baseline });
    expect(res.code).toBe(0);
    const doc = JSON.parse(res.stdout);
    expect(doc.counts.findings).toBe(1);
    expect(doc.counts.suppressed).toBe(0);
    expect(doc.findings[0].ruleId).toBe('demo-rule');
    expect(doc.findings[0].file).toBe('agents/foo/SKILL.md');
    // README.md must NOT be loaded as a validator (only *.cjs discovered).
    expect(doc.counts.validators).toBe(1);
    expect(doc.validators[0].id).toBe('demo-validator');
  });

  it('suppresses the finding via a glob-rule baseline entry', () => {
    const baseline = writeBaseline(
      [
        'suppress:',
        '  - ruleId: demo-rule',
        '    file: "agents/**/SKILL.md"',
        '    reason: "test glob suppression"',
        '',
      ].join('\n'),
    );
    const res = runRunner(['--format', 'json'], { CAGENTS_ADVISORY_BASELINE: baseline });
    expect(res.code).toBe(0);
    const doc = JSON.parse(res.stdout);
    expect(doc.counts.findings).toBe(0);
    expect(doc.counts.suppressed).toBe(1);
    expect(doc.suppressed[0].suppressionReason).toBe('test glob suppression');
  });

  it('suppresses the finding via an exact-fingerprint baseline entry', () => {
    // Compute the fingerprint exactly as the runner will (ruleId + file + message).
    const fp = fingerprint(FIXTURE_FINDING);
    const baseline = writeBaseline(
      [
        'suppress:',
        `  - fingerprint: "${fp}"`,
        '    reason: "test fingerprint suppression"',
        '',
      ].join('\n'),
    );
    const res = runRunner(['--format', 'json'], { CAGENTS_ADVISORY_BASELINE: baseline });
    expect(res.code).toBe(0);
    const doc = JSON.parse(res.stdout);
    expect(doc.counts.findings).toBe(0);
    expect(doc.counts.suppressed).toBe(1);
    expect(doc.suppressed[0].suppressionReason).toBe('test fingerprint suppression');
  });

  it('emits the documented --format json shape', () => {
    const baseline = writeBaseline('suppress: []\n');
    const res = runRunner(['--format', 'json'], { CAGENTS_ADVISORY_BASELINE: baseline });
    expect(res.code).toBe(0);
    const doc = JSON.parse(res.stdout);
    expect(doc).toHaveProperty('validators');
    expect(doc).toHaveProperty('findings');
    expect(doc).toHaveProperty('suppressed');
    expect(doc).toHaveProperty('counts');
    expect(Array.isArray(doc.validators)).toBe(true);
    expect(Array.isArray(doc.findings)).toBe(true);
    expect(Array.isArray(doc.suppressed)).toBe(true);
    expect(doc.counts).toMatchObject({
      validators: expect.any(Number),
      findings: expect.any(Number),
      suppressed: expect.any(Number),
    });
    // Per-validator entry shape.
    expect(doc.validators[0]).toHaveProperty('id');
    expect(doc.validators[0]).toHaveProperty('description');
    expect(doc.validators[0]).toHaveProperty('findings');
  });

  it('exits 0 even with findings (WARN-only advisory gate)', () => {
    const baseline = writeBaseline('suppress: []\n');
    // Human summary mode (no --format json): still exit 0, still reports the finding.
    const res = runRunner([], { CAGENTS_ADVISORY_BASELINE: baseline });
    expect(res.code).toBe(0);
    expect(res.stdout).toMatch(/advisory: 1 findings across 1 validators, 0 suppressed/);
    expect(res.stdout).toMatch(/WARN-only/);
  });

  it('a throwing validator becomes a runner note, never crashes the run', () => {
    // A second temp dir with a validator whose run() throws.
    const badDir = mkdtempSync(join(tmpdir(), 'cagents-advisory-bad-'));
    try {
      writeFileSync(
        join(badDir, 'boom.cjs'),
        `'use strict';\nmodule.exports = { meta: { id: 'boom', description: 'throws' }, run() { throw new Error('kaboom'); } };\n`,
        'utf8',
      );
      const baseline = writeBaseline('suppress: []\n');
      const res = (() => {
        const env = {
          ...process.env,
          CAGENTS_ADVISORY_DIR: badDir,
          CAGENTS_ADVISORY_BASELINE: baseline,
        };
        try {
          const stdout = execFileSync('node', [RUNNER, '--format', 'json'], {
            env,
            cwd: ROOT,
            encoding: 'utf8',
          });
          return { code: 0, stdout };
        } catch (err) {
          return { code: err.status ?? 1, stdout: err.stdout?.toString() ?? '' };
        }
      })();
      expect(res.code).toBe(0);
      const doc = JSON.parse(res.stdout);
      expect(doc.counts.findings).toBe(0);
      expect(doc.counts.notes).toBeGreaterThanOrEqual(1);
      expect(doc.notes[0].note).toMatch(/threw/);
    } finally {
      rmSync(badDir, { recursive: true, force: true });
    }
  });
});

describe('validator-baseline lib (F6)', () => {
  it('loadBaseline returns empty suppress[] for a missing file', () => {
    const b = loadBaseline(join(tmpdir(), 'does-not-exist-baseline.yaml'));
    expect(b).toEqual({ suppress: [] });
  });

  it('isSuppressed matches by glob-rule and by fingerprint', () => {
    const globBaseline = {
      suppress: [{ ruleId: 'demo-rule', file: 'agents/**/SKILL.md', reason: 'x' }],
    };
    expect(isSuppressed(FIXTURE_FINDING, globBaseline)).toBe(true);

    const fpBaseline = {
      suppress: [{ fingerprint: fingerprint(FIXTURE_FINDING), reason: 'y' }],
    };
    expect(isSuppressed(FIXTURE_FINDING, fpBaseline)).toBe(true);

    // Non-matching rule does not suppress.
    const noMatch = { suppress: [{ ruleId: 'other-rule', reason: 'z' }] };
    expect(isSuppressed(FIXTURE_FINDING, noMatch)).toBe(false);
  });
});

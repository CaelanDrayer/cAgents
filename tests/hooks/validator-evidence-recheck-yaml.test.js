/**
 * Regression tests: validator-evidence-recheck.cjs YAML correctness.
 *
 * Two DISTINCT pre-existing runtime defects, both reproduced RED before the fix
 * (CLAUDE.md bug-driven test mandate). Neither is related to the run->act
 * rename — both predate that branch and exist on main.
 *
 * DEFECT A — block scalars are not parsed.
 *   parseCriteriaResults() matched `evidence:\s*"?([^"\n]+)"?` against the
 *   entry segment, so a line `evidence: |` yielded the LITERAL STRING "|"
 *   instead of the indented block that follows. A validation_report.yaml using
 *   perfectly valid YAML block-scalar syntax therefore looked to the hook like
 *   it had evidence of "|", and the hook DOWNGRADED A CORRECT PASS TO FAIL on
 *   formatting alone. Correct work was rejected because of how it was typed.
 *
 * DEFECT B — duplicate `reason:` keys in the emitted recheck block.
 *   mutateReport() spread TWO sequential .map() calls: all `- criterion:` lines
 *   first, then all `reason:` lines. With N>=2 failures the last list item
 *   absorbed every reason (and the first item lost its reason entirely),
 *   producing YAML that js-yaml rejects with `duplicated mapping key`. The
 *   corrupted file is validation_report.yaml — the exact artifact the pipeline
 *   state machine reads to decide whether to advance.
 *
 * Both are asserted black-box (spawn the hook, inspect the on-disk mutation)
 * plus white-box for the parser, so a future regression in either the parsing
 * strategy or the emitter is caught.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(
  REPO_ROOT,
  '.claude',
  'hooks',
  'validator-evidence-recheck.cjs'
);

// In-process import for white-box parser assertions. CAGENTS_DISPATCH_IMPORT
// suppresses the module's top-level createHook() so it does not contend for
// stdin inside the vitest worker (same convention as secret-detection.cjs).
process.env.CAGENTS_DISPATCH_IMPORT = '1';
const nodeRequire = createRequire(import.meta.url);
const hookModule = nodeRequire(HOOK_PATH);

const tmpDirs = [];

afterAll(() => {
  for (const d of tmpDirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {}
  }
});

function writeTempReport(content) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ver-yaml-'));
  tmpDirs.push(tmpDir);
  const filePath = path.join(tmpDir, 'validation_report.yaml');
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// Spawn the hook exactly as the harness does, then return the mutated file.
function runHookOn(filePath) {
  const result = spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: filePath },
      cwd: REPO_ROOT,
    }),
    encoding: 'utf8',
    // 60000, not a tight budget: spawnSync does NOT throw on timeout, it returns
    // status:null with empty stdout, which downstream assertions would silently
    // misread as a verdict. Fail loud on any abnormal termination instead.
    timeout: 60000,
    env: { ...process.env, CAGENTS_DISPATCH_IMPORT: '' },
  });
  const diag = () =>
    `status=${result.status} signal=${result.signal} ` +
    `error=${result.error ? result.error.message : 'none'} ` +
    `stdout=${JSON.stringify((result.stdout || '').slice(0, 300))} ` +
    `stderr=${JSON.stringify((result.stderr || '').slice(0, 600))}`;
  if (result.error) throw new Error(`runHookOn: spawnSync errored — ${diag()}`);
  if (result.status === null) throw new Error(`runHookOn: hook killed — ${diag()}`);
  if (result.status !== 0) throw new Error(`runHookOn: non-zero exit — ${diag()}`);
  return { after: fs.readFileSync(filePath, 'utf8'), stderr: result.stderr || '' };
}

// A PASS report whose evidence is a YAML block scalar carrying REAL captured
// test output. Under a correct parser this verifies (it names a runner, counts,
// and an exit code) and must NOT be downgraded.
const BLOCK_SCALAR_REPORT = [
  'classification: PASS',
  'overall_confidence: 0.95',
  'acceptance_criteria_results:',
  '  - criterion: "Test suite passes"',
  '    met: true',
  '    verification_method: "test_result"',
  '    evidence: |',
  '      vitest run tests/hooks/',
  '      Test Files  12 passed (12)',
  '      Tests  187 passed (187)',
  '      exit code 0',
  '    confidence: 0.99',
  'feedback: ""',
  'issues: []',
  '',
].join('\n');

describe('validator-evidence-recheck: DEFECT A — YAML block-scalar evidence', () => {
  it('does NOT downgrade a correct PASS whose evidence is a block scalar', () => {
    const filePath = writeTempReport(BLOCK_SCALAR_REPORT);
    const { after } = runHookOn(filePath);

    // The load-bearing assertion: valid YAML formatting must not flip the verdict.
    expect(after).toMatch(/^classification:\s*PASS\s*$/m);
    expect(after).not.toMatch(/^classification:\s*FAIL\s*$/m);
    // No recheck block should have been appended at all.
    expect(after).not.toMatch(/^recheck:/m);
  });

  it('never treats the block-scalar indicator "|" as the evidence value', () => {
    const filePath = writeTempReport(BLOCK_SCALAR_REPORT);
    const { after } = runHookOn(filePath);

    // Under the bug the appended reason read:
    //   test_result: evidence lacks captured output (...): "|"
    // which is the parser leaking the block indicator as the value.
    expect(after).not.toMatch(/lacks captured output/);
    expect(after).not.toContain(': \\"|\\"');
  });

  it('parseCriteriaResults returns the block CONTENT, not the "|" indicator', () => {
    const entries = hookModule.parseCriteriaResults(BLOCK_SCALAR_REPORT);

    expect(entries).toHaveLength(1);
    const evidence = entries[0].evidence;
    expect(evidence).not.toBe('|');
    // The parsed value must be the folded block body.
    expect(evidence).toContain('Tests  187 passed (187)');
    expect(evidence).toContain('exit code 0');
    // Sibling scalar fields must still parse.
    expect(entries[0].verification_method).toBe('test_result');
    expect(entries[0].met).toBe(true);
  });

  it('still parses plain single-line quoted evidence (no regression)', () => {
    const plain = [
      'classification: PASS',
      'acceptance_criteria_results:',
      '  - criterion: "Migration exists"',
      '    met: true',
      '    verification_method: "file_exists"',
      '    evidence: "CLAUDE.md"',
      '',
    ].join('\n');
    const entries = hookModule.parseCriteriaResults(plain);
    expect(entries).toHaveLength(1);
    expect(entries[0].evidence).toBe('CLAUDE.md');
    expect(entries[0].verification_method).toBe('file_exists');
  });
});

describe('validator-evidence-recheck: DEFECT B — duplicate reason: keys', () => {
  // Two genuinely-failing entries. The downgrade itself is CORRECT here; what
  // must not happen is the hook corrupting the artifact while recording it.
  const TWO_FAILURES = [
    'classification: PASS',
    'overall_confidence: 0.95',
    'acceptance_criteria_results:',
    '  - criterion: "Migration file created"',
    '    met: true',
    '    verification_method: "file_exists"',
    '    evidence: "migrations/20991231_NOPE_A.sql"',
    '  - criterion: "Rollback file created"',
    '    met: true',
    '    verification_method: "file_exists"',
    '    evidence: "migrations/20991231_NOPE_B.sql"',
    'feedback: ""',
    'issues: []',
    '',
  ].join('\n');

  it('emits a recheck block that js-yaml can parse', () => {
    const filePath = writeTempReport(TWO_FAILURES);
    const { after } = runHookOn(filePath);

    // The downgrade is expected and correct.
    expect(after).toMatch(/^classification:\s*FAIL\s*$/m);
    expect(after).toMatch(/^recheck:/m);

    // The artifact the pipeline state machine reads MUST remain loadable.
    let doc;
    expect(() => {
      doc = yaml.load(after);
    }).not.toThrow();
    expect(doc).toBeTruthy();
    expect(doc.classification).toBe('FAIL');
  });

  it('pairs exactly one reason: with each failing criterion', () => {
    const filePath = writeTempReport(TWO_FAILURES);
    const { after } = runHookOn(filePath);

    const doc = yaml.load(after);
    const entries = doc.recheck.failing_entries;
    expect(entries).toHaveLength(2);
    for (const e of entries) {
      expect(Object.keys(e).sort()).toEqual(['criterion', 'reason']);
      expect(typeof e.reason).toBe('string');
      expect(e.reason.length).toBeGreaterThan(0);
    }
    // Each criterion keeps ITS OWN reason — under the bug the first entry lost
    // its reason entirely and the second absorbed both.
    expect(entries[0].criterion).toBe('Migration file created');
    expect(entries[0].reason).toContain('20991231_NOPE_A.sql');
    expect(entries[1].criterion).toBe('Rollback file created');
    expect(entries[1].reason).toContain('20991231_NOPE_B.sql');
  });

  it('emits exactly one reason: line per failing entry in the raw text', () => {
    const filePath = writeTempReport(TWO_FAILURES);
    const { after } = runHookOn(filePath);

    const recheckBlock = after.slice(after.indexOf('\nrecheck:'));
    const criterionLines = (recheckBlock.match(/^\s*- criterion:/gm) || []).length;
    const reasonLines = (recheckBlock.match(/^\s*reason:/gm) || []).length;
    expect(criterionLines).toBe(2);
    expect(reasonLines).toBe(2);
    expect(reasonLines).toBe(criterionLines);
  });

  it('single-failure reports also stay parseable (boundary case)', () => {
    const one = [
      'classification: PASS',
      'acceptance_criteria_results:',
      '  - criterion: "Only failure"',
      '    met: true',
      '    verification_method: "file_exists"',
      '    evidence: "migrations/20991231_NOPE_SOLO.sql"',
      '',
    ].join('\n');
    const filePath = writeTempReport(one);
    const { after } = runHookOn(filePath);

    const doc = yaml.load(after);
    expect(doc.classification).toBe('FAIL');
    expect(doc.recheck.failing_entries).toHaveLength(1);
    expect(doc.recheck.failing_entries[0].reason).toContain('20991231_NOPE_SOLO.sql');
  });
});

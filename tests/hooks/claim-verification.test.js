/**
 * D3 (advisory-first): mechanical claim-verification pass regression test
 *
 * Tests the additive claim-verification pass in
 * .claude/hooks/validator-evidence-recheck.cjs. The pass treats the whole
 * validation_report.yaml as a set of extractable claims, dispositions each
 * mechanically (verified | failed | unsupported | unverifiable) using grep +
 * fs + math ONLY, computes passRate = verified/(verified+failed), and — when
 * passRate < 0.8 AND checkable_claims >= 2 — appends an advisory
 * `claim_verification:` block and console.error a WARN. It NEVER changes the
 * report classification or routes back to PLANNED (hard re-route deferred).
 *
 * Assertions:
 *   (a) A REVISE report with a mix of claims (true pattern_count, false
 *       pattern_count, real file_exists, snippet-in-wrong-file) gets the right
 *       dispositions, the computed passRate, a written claim_verification block,
 *       and a WARN on stderr.
 *   (b) The advisory pass never changes the classification.
 *   (c) The existing PASS->FAIL evidence-recheck downgrade is UNCHANGED.
 *   (d) A PASS report with real evidence stays PASS (no false-positive
 *       downgrade), and the advisory pass does not append a block when there
 *       are fewer than 2 checkable claims.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'validator-evidence-recheck.cjs');

// Run the hook against a report file, returning parsed stdout + raw stderr.
function runHook(reportPath, tmpDir) {
  const payload = {
    tool_name: 'Write',
    tool_input: { file_path: reportPath },
    cwd: tmpDir,
  };
  const result = spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    // 60000 (was 8000): spawnSync does NOT throw on timeout — it returns
    // status:null/SIGTERM with empty stdout, and `JSON.parse(stdout||'{}')` then
    // silently yields {} (a misleading value that lets `.not.toMatch(/^recheck:/)`
    // on the unmodified report spuriously PASS). Raise the budget and FAIL LOUD.
    timeout: 60000,
  });
  // validator-evidence-recheck.cjs (PostToolUse via createHook) ALWAYS exits 0
  // with one JSON line on stdout, so any abnormal termination is a spawn misfire.
  const diag = () => `status=${result.status} signal=${result.signal} error=${result.error ? result.error.message : 'none'} stdout=${JSON.stringify((result.stdout || '').slice(0, 200))} stderr=${JSON.stringify((result.stderr || '').slice(0, 500))}`;
  if (result.error) throw new Error(`claim-verification runHook: spawnSync errored — ${diag()}`);
  if (result.status === null) throw new Error(`claim-verification runHook: hook killed (timeout/signal) — ${diag()}`);
  if (result.status !== 0) throw new Error(`claim-verification runHook: hook exited non-zero — ${diag()}`);
  if (!result.stdout || !result.stdout.trim()) throw new Error(`claim-verification runHook: empty stdout — ${diag()}`);
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (e) {
    throw new Error(`claim-verification runHook: stdout not valid JSON — ${e.message} — ${diag()}`);
  }
  return { parsed, stdout: result.stdout, stderr: result.stderr, status: result.status };
}

describe('validator-evidence-recheck.cjs — D3 mechanical claim-verification pass', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'd3-claimverify-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  it('hook exists', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  describe('mixed-claim REVISE report', () => {
    let reportPath;

    beforeEach(() => {
      // Source files the claims cite.
      fs.writeFileSync(path.join(tmpDir, 'sample.ts'), 'ALPHA ALPHA ALPHA\nBETA\n', 'utf8');
      fs.writeFileSync(path.join(tmpDir, 'fileA.ts'), 'export const a = 1;\n', 'utf8');
      fs.writeFileSync(path.join(tmpDir, 'fileB.ts'), "export const marker = 'ZZQMARKER1234';\n", 'utf8');

      // A REVISE report whose prose carries a mix of checkable claims:
      //  - "3 occurrences of ALPHA in sample.ts"  -> verified  (sample.ts has 3)
      //  - "5 occurrences of BETA in sample.ts"   -> failed    (sample.ts has 1)
      //  - "sample.ts exists"                     -> verified
      //  - "fileA.ts:10 - ZZQMARKER1234"          -> unsupported (snippet lives in fileB.ts)
      const report = [
        'classification: REVISE',
        'overall_confidence: 0.6',
        'acceptance_criteria_results:',
        '  - criterion: "Refactor touches sample module"',
        '    met: true',
        '    verification_method: "manual"',
        '    evidence: "see notes"',
        '    confidence: 0.6',
        'notes: |',
        '  There are 3 occurrences of ALPHA in sample.ts',
        '  There are 5 occurrences of BETA in sample.ts',
        '  sample.ts exists',
        '  Snippet cited at fileA.ts:10 - ZZQMARKER1234',
        '  The token actually lives in fileB.ts',
        'feedback: ""',
        'issues: []',
        '',
      ].join('\n');
      reportPath = path.join(tmpDir, 'validation_report.yaml');
      fs.writeFileSync(reportPath, report, 'utf8');
    });

    it('dispositions each claim mechanically and writes a claim_verification block', () => {
      const res = runHook(reportPath, tmpDir);
      expect(res.parsed).toEqual({ continue: true });

      const after = fs.readFileSync(reportPath, 'utf8');
      expect(after).toMatch(/^claim_verification:/m);
      expect(after).toMatch(/advisory:\s*true/);

      // pattern_count (true) -> verified ; pattern_count (false) -> failed
      expect(after).toMatch(/type:\s*pattern_count\n\s*disposition:\s*verified/);
      expect(after).toMatch(/type:\s*pattern_count\n\s*disposition:\s*failed/);
      // file_exists -> verified
      expect(after).toMatch(/type:\s*file_exists\n\s*disposition:\s*verified/);
      // code_snippet -> unsupported via snippet_in_wrong_file guard
      expect(after).toMatch(/type:\s*code_snippet\n\s*disposition:\s*unsupported/);
      expect(after).toMatch(/snippet_in_wrong_file/);
    });

    it('computes passRate = verified/(verified+failed) and the disposition counts', () => {
      runHook(reportPath, tmpDir);
      const after = fs.readFileSync(reportPath, 'utf8');

      // verified=2, failed=1 -> checkable_claims=3, pass_rate=2/3=0.67
      expect(after).toMatch(/verified:\s*2/);
      expect(after).toMatch(/failed:\s*1/);
      expect(after).toMatch(/unsupported:\s*1/);
      expect(after).toMatch(/checkable_claims:\s*3/);

      const m = after.match(/pass_rate:\s*([\d.]+)/);
      expect(m).toBeTruthy();
      expect(parseFloat(m[1])).toBeCloseTo(0.67, 2);
    });

    it('emits a WARN on stderr when passRate < 0.8 with >= 2 checkable claims', () => {
      const res = runHook(reportPath, tmpDir);
      expect(res.stderr).toMatch(/claim-verification \(advisory\)/i);
      expect(res.stderr).toMatch(/pass_rate 0\.67/);
      expect(res.stderr).toMatch(/no pipeline re-route/i);
    });

    it('never changes the classification (advisory only)', () => {
      runHook(reportPath, tmpDir);
      const after = fs.readFileSync(reportPath, 'utf8');
      expect(after).toMatch(/^classification:\s*REVISE\s*$/m);
      // No FAIL downgrade and no recheck: block from the advisory pass.
      expect(after).not.toMatch(/^classification:\s*FAIL/m);
      expect(after).not.toMatch(/^recheck:/m);
    });

    it('is idempotent — a second run does not double-append the block', () => {
      runHook(reportPath, tmpDir);
      runHook(reportPath, tmpDir);
      const after = fs.readFileSync(reportPath, 'utf8');
      const count = (after.match(/^claim_verification:/gm) || []).length;
      expect(count).toBe(1);
    });
  });

  describe('existing PASS->FAIL evidence recheck is UNCHANGED', () => {
    it('a PASS verdict citing a non-existent file is still downgraded to FAIL + recheck block', () => {
      const report = [
        'classification: PASS',
        'overall_confidence: 0.95',
        'acceptance_criteria_results:',
        '  - criterion: "Migration file created"',
        '    met: true',
        '    verification_method: "file_exists"',
        '    evidence: "migrations/20991231_GHOST_FILE.sql"',
        '    confidence: 0.95',
        'feedback: ""',
        'issues: []',
        '',
      ].join('\n');
      const reportPath = path.join(tmpDir, 'validation_report.yaml');
      fs.writeFileSync(reportPath, report, 'utf8');

      const res = runHook(reportPath, tmpDir);
      expect(res.parsed).toEqual({ continue: true });

      const after = fs.readFileSync(reportPath, 'utf8');
      // Existing downgrade behavior preserved exactly.
      expect(after).toMatch(/classification:\s*FAIL/);
      expect(after).toMatch(/recheck:/);
    });

    it('a PASS verdict with real evidence stays PASS and gets no advisory block (< 2 checkable claims)', () => {
      // One real file, cited once with a file_exists-shaped claim -> 1 checkable claim.
      fs.writeFileSync(path.join(tmpDir, 'real.ts'), 'export const ok = true;\n', 'utf8');
      const report = [
        'classification: PASS',
        'overall_confidence: 0.95',
        'acceptance_criteria_results:',
        '  - criterion: "Module present"',
        '    met: true',
        '    verification_method: "file_exists"',
        '    evidence: "real.ts"',
        '    confidence: 0.99',
        'notes: |',
        '  real.ts exists',
        'feedback: ""',
        'issues: []',
        '',
      ].join('\n');
      const reportPath = path.join(tmpDir, 'validation_report.yaml');
      fs.writeFileSync(reportPath, report, 'utf8');

      const res = runHook(reportPath, tmpDir);
      const after = fs.readFileSync(reportPath, 'utf8');

      // No false-positive downgrade, and no advisory block (only 1 checkable claim).
      expect(after).toMatch(/classification:\s*PASS/);
      expect(after).not.toMatch(/^claim_verification:/m);
      expect(res.stderr).not.toMatch(/claim-verification \(advisory\)/i);
    });
  });
});

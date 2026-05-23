/**
 * LP-11 (v12.7.x): scripts/audit-orphans.sh regression test
 *
 * Asserts the orphan-audit script:
 *   (a) exists at scripts/audit-orphans.sh and is executable
 *   (b) exits 0 when given a temp output path
 *   (c) produces a Markdown report with the required sections
 *
 * Per LP-11 spec: "Minimal test: tests/v12/audit-orphans-runs.test.js
 * (just exit-0 sanity check)." We add light sanity assertions on the
 * report shape so a future refactor that breaks the rendering pipeline
 * surfaces immediately.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'audit-orphans.sh');

describe('LP-11 (v12.7.x): audit-orphans.sh sanity', () => {
  it('script exists at scripts/audit-orphans.sh', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('script is executable (or invokable via bash)', () => {
    // Either the file has +x or it has a #!/usr/bin/env bash shebang
    // and is invokable via `bash <path>`. We accept either.
    const stat = fs.statSync(SCRIPT_PATH);
    const mode = stat.mode & 0o777;
    const isExecutable = (mode & 0o100) !== 0;
    const head = fs.readFileSync(SCRIPT_PATH, 'utf8').split('\n')[0];
    const hasShebang = /^#!.*\bbash\b/.test(head);
    expect(isExecutable || hasShebang).toBe(true);
  });

  it('runs end-to-end, exits 0, produces Markdown report with required sections', () => {
    const tmpOut = path.join(os.tmpdir(), `orphan-audit-${Date.now()}.md`);
    const proc = spawnSync('bash', [SCRIPT_PATH, tmpOut], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 120_000,
    });
    expect(proc.status, `script stderr: ${proc.stderr}\nstdout: ${proc.stdout}`).toBe(0);
    expect(fs.existsSync(tmpOut)).toBe(true);

    const report = fs.readFileSync(tmpOut, 'utf8');
    expect(report).toMatch(/^# Agent Orphan Audit/m);
    expect(report).toMatch(/^## Totals/m);
    expect(report).toMatch(/^## Per-archetype breakdown/m);
    expect(report).toMatch(/^## Per-agent table/m);
    expect(report).toMatch(/^## Orphan list/m);
    // Cleanup
    try { fs.unlinkSync(tmpOut); } catch (_e) { /* ignore */ }
  });
});

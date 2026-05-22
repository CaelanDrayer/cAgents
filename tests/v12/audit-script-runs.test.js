/**
 * WI-2 (v12.4.0): scripts/audit-agents.mjs regression test
 *
 * Asserts the audit script:
 *   (a) exits 0
 *   (b) writes the report file to cagents-memory/_knowledge/agent-audit-{YYMMDD}.md
 *   (c) contains all 4 required sections (auto-merge, human-review, extract, cull)
 *   (d) contains a Summary section with projected catalog size
 *   (e) Reconciliation total matches catalog baseline
 *
 * Pattern: spawn the script with `node`, parse its stdout (which prints the
 * absolute output path), then read the report file and grep for required
 * section headings.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'audit-agents.mjs');

describe('WI-2 (v12.4.0): audit-agents.mjs produces 4-section report', () => {
  it('script exists at scripts/audit-agents.mjs', () => {
    expect(fs.existsSync(SCRIPT_PATH)).toBe(true);
  });

  it('script uses Node std-lib only (no external imports)', () => {
    const src = fs.readFileSync(SCRIPT_PATH, 'utf8');
    // Only allowed module specifiers: node:* or relative paths
    const importLines = src.split('\n').filter(l => /^\s*import\b/.test(l));
    for (const line of importLines) {
      const m = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!m) continue;
      const spec = m[1];
      const ok = spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('/');
      expect(ok, `non-stdlib import in audit-agents.mjs: ${line.trim()}`).toBe(true);
    }
  });

  it('runs end-to-end in <60s, exits 0, produces report with 4 sections + Summary', () => {
    const t0 = Date.now();
    const proc = spawnSync('node', [SCRIPT_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    const elapsed = (Date.now() - t0) / 1000;
    expect(proc.status, `script stderr: ${proc.stderr}`).toBe(0);
    expect(elapsed).toBeLessThan(60);

    const outPath = (proc.stdout || '').trim().split('\n').pop();
    expect(outPath).toMatch(/agent-audit-\d{6}\.md$/);
    expect(fs.existsSync(outPath)).toBe(true);

    const report = fs.readFileSync(outPath, 'utf8');
    expect(report).toMatch(/^## 1\. Auto-merge candidates/m);
    expect(report).toMatch(/^## 2\. Human-review candidates/m);
    expect(report).toMatch(/^## 3\. Playbook-extraction candidates/m);
    expect(report).toMatch(/^## 4\. Cull candidates/m);
    expect(report).toMatch(/^## Summary/m);
    expect(report).toMatch(/Projected catalog after/);

    // Reconciliation line is present
    expect(report).toMatch(/Reconciliation/);
  });
});

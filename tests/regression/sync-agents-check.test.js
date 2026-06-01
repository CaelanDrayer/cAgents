/**
 * Regression test: WI-13 (v11.1.4)
 *
 * Asserts that scripts/sync-agents.sh --check is a true dry-run:
 *   - Exits 0 when plugin.json matches archetype-tree SKILL.md inventory.
 *   - Exits 1 when drift exists.
 *   - Never mutates plugin.json.
 *
 * References:
 *   - CLAUDE.md "Bug-Driven Testing" mandate
 *   - cagents-memory/sessions/run_plugin-health-v11-1-4_260429_001/workflow/enriched_context.yaml ISSUE-3
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readFileSync, writeFileSync, statSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(__dirname, '..', '..');
const SYNC_AGENTS = resolve(REPO_ROOT, 'scripts', 'sync-agents.sh');
const PLUGIN_JSON = resolve(REPO_ROOT, '.claude-plugin', 'plugin.json');

function runCheck(pluginJsonPath) {
  // WI-1 follow-on (v12.12.1): when pluginJsonPath is provided, pass it
  // through CAGENTS_PLUGIN_JSON_PATH so sync-agents.sh operates on the
  // override path. The drift test uses this against a temp-dir copy to
  // avoid racing doc-counts-match-disk.test.js (which reads the real
  // plugin.json via validate-counts.sh --derive-only).
  const env = pluginJsonPath
    ? { ...process.env, CAGENTS_PLUGIN_JSON_PATH: pluginJsonPath }
    : process.env;
  try {
    const out = execSync(`bash "${SYNC_AGENTS}" --check`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      env,
    });
    return { exitCode: 0, stdout: out };
  } catch (err) {
    return { exitCode: err.status, stdout: err.stdout?.toString() || '', stderr: err.stderr?.toString() || '' };
  }
}

describe('sync-agents.sh --check dry-run regression', () => {
  let originalContent;
  let originalMtime;

  beforeAll(() => {
    originalContent = readFileSync(PLUGIN_JSON, 'utf8');
    originalMtime = statSync(PLUGIN_JSON).mtimeMs;
  });

  afterAll(() => {
    // Restore to original content if any test mutated it
    writeFileSync(PLUGIN_JSON, originalContent, 'utf8');
  });

  it('--help shows the --check flag', () => {
    const out = execSync(`bash "${SYNC_AGENTS}" --help`, { cwd: REPO_ROOT, encoding: 'utf8' });
    expect(out).toContain('--check');
    expect(out).toContain('Dry-run');
  });

  it('--check exits 0 when in sync', () => {
    const result = runCheck();
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/In sync/);
  });

  it('--check does NOT modify plugin.json (mtime unchanged)', () => {
    const beforeMtime = statSync(PLUGIN_JSON).mtimeMs;
    runCheck();
    const afterMtime = statSync(PLUGIN_JSON).mtimeMs;
    expect(afterMtime).toBe(beforeMtime);
  });

  it('--check exits 1 when drift exists', () => {
    // WI-1 follow-on (v12.12.1): write drift to a temp-dir copy rather than
    // mutating the canonical plugin.json. The override is passed via
    // CAGENTS_PLUGIN_JSON_PATH so sync-agents.sh --check reads the temp file.
    // This eliminates the race between this test writing "drifted" content
    // and tests/v12/doc-counts-match-disk.test.js reading the real
    // plugin.json via `validate-counts.sh --derive-only` (active_agents=141).
    const original = readFileSync(PLUGIN_JSON, 'utf8');
    const obj = JSON.parse(original);
    const driftedAgents = (obj.agents || []).slice(1);  // drop first agent
    const drifted = JSON.stringify({ ...obj, agents: driftedAgents }, null, 2) + '\n';

    const tmpDir = mkdtempSync(join(tmpdir(), 'sync-agents-drift-'));
    const tmpPluginJson = join(tmpDir, 'plugin.json');
    writeFileSync(tmpPluginJson, drifted, 'utf8');

    try {
      const result = runCheck(tmpPluginJson);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(/DRIFT/);
    } finally {
      try { unlinkSync(tmpPluginJson); } catch {}
      try { rmdirSync(tmpDir); } catch {}
    }
  });

  it('--check after drift induction, restoration leaves plugin.json byte-identical to start', () => {
    const current = readFileSync(PLUGIN_JSON, 'utf8');
    expect(current).toBe(originalContent);
  });
}, 60_000);

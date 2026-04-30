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
import { resolve } from 'node:path';
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const REPO_ROOT = resolve(__dirname, '..', '..');
const SYNC_AGENTS = resolve(REPO_ROOT, 'scripts', 'sync-agents.sh');
const PLUGIN_JSON = resolve(REPO_ROOT, '.claude-plugin', 'plugin.json');

function runCheck() {
  try {
    const out = execSync(`bash "${SYNC_AGENTS}" --check`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
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
    const original = readFileSync(PLUGIN_JSON, 'utf8');
    try {
      // Induce drift: parse, mutate agents array, write back.
      const obj = JSON.parse(original);
      const driftedAgents = (obj.agents || []).slice(1);  // drop first agent
      const drifted = JSON.stringify({ ...obj, agents: driftedAgents }, null, 2) + '\n';
      writeFileSync(PLUGIN_JSON, drifted, 'utf8');

      const result = runCheck();
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(/DRIFT/);
    } finally {
      // Always restore
      writeFileSync(PLUGIN_JSON, original, 'utf8');
    }
  });

  it('--check after drift induction, restoration leaves plugin.json byte-identical to start', () => {
    const current = readFileSync(PLUGIN_JSON, 'utf8');
    expect(current).toBe(originalContent);
  });
}, 60_000);

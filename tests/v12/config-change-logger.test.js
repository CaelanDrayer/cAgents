/**
 * LP-17 (v12.7.x): ConfigChange logger hook regression test
 *
 * Asserts the config-change-logger.cjs hook:
 *   (a) exists at .claude/hooks/config-change-logger.cjs
 *   (b) is registered under ConfigChange in .claude/settings.json
 *   (c) appends a single line per invocation to
 *       cagents-memory/_system/logs/config-changes_<YYYY-MM-DD>.log
 *       in the expected format: ISO_TS | source | path | changed_keys
 *   (d) returns continue:true (non-blocking)
 *   (e) handles missing optional fields gracefully (source-only, no path/keys)
 *
 * Pattern: spawn the hook with `node`, pipe stubbed ConfigChange payload on
 * stdin, then grep the day's log file for the expected entry. Uses a tmp
 * cagents-memory via CAGENTS_TEST_PROJECT_DIR override so we don't pollute
 * the real log file.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOK_PATH = path.join(REPO_ROOT, '.claude', 'hooks', 'config-change-logger.cjs');
const SETTINGS_PATH = path.join(REPO_ROOT, '.claude', 'settings.json');

function runHook(input, projectDir) {
  return spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: projectDir,
      VITEST: 'true', // bypass dedupGuard so repeated invocations within the test all fire
    },
    timeout: 10_000,
  });
}

function todayLogPath(projectDir) {
  const dateStr = new Date().toISOString().split('T')[0];
  return path.join(projectDir, 'cagents-memory', '_system', 'logs', `config-changes_${dateStr}.log`);
}

describe('LP-17: ConfigChange logger hook', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-lp17-'));
    // ensure logs dir exists so tests can verify *appended* lines
    fs.mkdirSync(path.join(tmpDir, 'cagents-memory', '_system', 'logs'), { recursive: true });
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  it('hook file exists at .claude/hooks/config-change-logger.cjs', () => {
    expect(fs.existsSync(HOOK_PATH)).toBe(true);
  });

  it('is registered under ConfigChange in .claude/settings.json', () => {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    expect(settings.hooks).toBeDefined();
    expect(settings.hooks.ConfigChange).toBeDefined();
    expect(Array.isArray(settings.hooks.ConfigChange)).toBe(true);
    // At least one hook entry references the config-change-logger script
    const flat = JSON.stringify(settings.hooks.ConfigChange);
    expect(flat).toMatch(/config-change-logger/);
  });

  it('appends one line to config-changes_<YYYY-MM-DD>.log on a project_settings payload', () => {
    const payload = {
      source: 'project_settings',
      path: '.claude/settings.json',
      changed_keys: ['teammateMode', 'permissions.allow'],
    };
    const result = runHook(payload, tmpDir);
    expect(result.status, `stderr: ${result.stderr}`).toBe(0);

    const logFile = todayLogPath(tmpDir);
    expect(fs.existsSync(logFile)).toBe(true);

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(1);

    const line = lines[0];
    // Format: ISO_TS | source | path | changed_keys
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(line).toContain('project_settings');
    expect(line).toContain('.claude/settings.json');
    expect(line).toContain('teammateMode');
    expect(line).toContain('permissions.allow');
  });

  it('returns continue:true (non-blocking)', () => {
    const payload = { source: 'user_settings', path: '~/.claude/settings.json', changed_keys: ['theme'] };
    const result = runHook(payload, tmpDir);
    expect(result.status).toBe(0);
    const out = JSON.parse(result.stdout.trim());
    expect(out.continue).toBe(true);
  });

  it('handles missing optional fields gracefully (source-only payload)', () => {
    const payload = { source: 'local_settings' };
    const result = runHook(payload, tmpDir);
    expect(result.status, `stderr: ${result.stderr}`).toBe(0);

    const logFile = todayLogPath(tmpDir);
    expect(fs.existsSync(logFile)).toBe(true);

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('local_settings');
  });

  it('appends additional lines on subsequent invocations (does not overwrite)', () => {
    runHook({ source: 'project_settings', path: 'a.json', changed_keys: ['x'] }, tmpDir);
    runHook({ source: 'user_settings', path: 'b.json', changed_keys: ['y'] }, tmpDir);

    const logFile = todayLogPath(tmpDir);
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(2);
    expect(lines[0]).toContain('project_settings');
    expect(lines[1]).toContain('user_settings');
  }, 15_000);
});

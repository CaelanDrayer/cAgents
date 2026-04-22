import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SETTINGS_PATH = join(ROOT, '.claude', 'settings.json');
const STATUSLINE_HOOK_PATH = join(ROOT, '.claude', 'hooks', 'statusline.cjs');
const STATUSLINE_TEST_PATH = join(ROOT, 'tests', 'hooks', 'statusline.test.js');
const STATUSLINE_RUNNER_PATH = join(ROOT, 'tests', 'hooks', 'statusline-test-runner.cjs');
const SESSION_CATCHUP_PATH = join(ROOT, '.claude', 'hooks', 'session-catchup.cjs');
const HOOKS_RULES_PATH = join(ROOT, '.claude', 'rules', 'core', 'hooks.md');

describe('V11.0.1: statusLine removal', () => {
  it('.claude/settings.json must parse as valid JSON', () => {
    const raw = readFileSync(SETTINGS_PATH, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('.claude/settings.json must NOT contain a top-level statusLine key', () => {
    const settings = JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
    expect(settings).not.toHaveProperty('statusLine');
  });

  it('.claude/hooks/statusline.cjs must not exist', () => {
    expect(existsSync(STATUSLINE_HOOK_PATH)).toBe(false);
  });

  it('tests/hooks/statusline.test.js must not exist', () => {
    expect(existsSync(STATUSLINE_TEST_PATH)).toBe(false);
  });

  it('tests/hooks/statusline-test-runner.cjs must not exist', () => {
    expect(existsSync(STATUSLINE_RUNNER_PATH)).toBe(false);
  });

  it('session-catchup.cjs must not reference statusline advisory', () => {
    const src = readFileSync(SESSION_CATCHUP_PATH, 'utf8');
    expect(src).not.toMatch(/StatusLine Advisory/);
    expect(src).not.toMatch(/statusline_advisory_shown/);
    expect(src).not.toMatch(/statusline\.cjs/);
  });

  it('hooks.md must not describe the Status Line Provider', () => {
    const src = readFileSync(HOOKS_RULES_PATH, 'utf8');
    expect(src).not.toMatch(/Status Line Provider/);
    expect(src).not.toMatch(/statusLine:\s*statusline\.cjs/);
  });
});

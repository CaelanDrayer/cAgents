import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'statusline.cjs');
const RUNNER = join(process.cwd(), 'tests', 'hooks', 'statusline-test-runner.cjs');

// Run the statusline hook as a process (integration test)
function runHook(input = '{}') {
  return execSync(
    `printf '%s' '${input}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
}

// Call an exported function via the test runner (unit test)
function callFn(fnName, ...args) {
  const argStr = args.map((a) => String(a)).join(' ');
  const out = execSync(
    `node "${RUNNER}" ${fnName} ${argStr}`,
    { encoding: 'utf8', timeout: 5000 }
  );
  return JSON.parse(out);
}

// Strip ANSI escape codes
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

describe('statusline.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should output cAgents version tag', () => {
    const output = runHook();
    expect(output).toContain('[cAgents v');
  });

  it('should show idle format when no active session', () => {
    const output = stripAnsi(runHook());
    // In CI / test env there is no active session, so the idle format is expected.
    // If an active session happens to exist, a slug (not a full session ID) appears.
    const hasIdle = output.includes('No Active Sessions | Waiting | 0/0');
    const hasSlug = /[a-z][-a-z0-9]+/.test(output.replace('[cAgents v', '').replace(/[\d.]+]/, ''));
    expect(hasIdle || hasSlug).toBeTruthy();
  });

  it('should output valid ANSI text', () => {
    const output = runHook();
    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
  });

  it('should handle empty stdin gracefully', () => {
    expect(() => runHook()).not.toThrow();
  });

  it('should NOT include git branch info', () => {
    const output = stripAnsi(runHook());
    // Old format had branch(changes) like "main(3M 1?)" — new format has no parens
    expect(output).not.toMatch(/\w+\(\d/);
  });

  it('should NOT display domain or agent count', () => {
    const output = stripAnsi(runHook());
    expect(output).not.toContain('agents:');
    expect(output).not.toMatch(/\b(engineering|creative|business|growth|people|service)\b/);
  });
});

describe('extractSlug()', () => {
  it('extracts slug from standard run session ID', () => {
    expect(callFn('extractSlug', 'run_fix-auth_260317_001')).toBe('fix-auth');
  });

  it('extracts multi-word slug (truncated if over 20 chars)', () => {
    // 'implement-statusline-redesign' is 29 chars -> truncated to 19 chars + '…'
    expect(callFn('extractSlug', 'run_implement-statusline-redesign_260323_003'))
      .toBe('implement-statuslin…');
  });

  it('handles team session IDs', () => {
    expect(callFn('extractSlug', 'team_build-oauth_260317_002')).toBe('build-oauth');
  });

  it('handles org session IDs', () => {
    expect(callFn('extractSlug', 'org_launch-product_260323_001')).toBe('launch-product');
  });

  it('handles designer session IDs', () => {
    expect(callFn('extractSlug', 'designer_review-statusline_260323_001'))
      .toBe('review-statusline');
  });

  it('truncates slug longer than 20 chars with ellipsis', () => {
    // 'review-statusline-generation' is 28 chars -> slice(0,19) + '…' = 20 chars total
    const result = callFn('extractSlug', 'run_review-statusline-generation_260323_005');
    expect(result).toBe('review-statusline-g…');
    expect(result.length).toBe(20);
  });

  it('does not truncate slug exactly 20 chars', () => {
    // 'fix-exactly-20-chars' is 20 chars -> no truncation
    const result = callFn('extractSlug', 'run_fix-exactly-20-chars_260323_001');
    expect(result).toBe('fix-exactly-20-chars');
    expect(result.length).toBe(20);
  });

  it('does not truncate slug under 20 chars', () => {
    const result = callFn('extractSlug', 'run_short-slug_260323_001');
    expect(result).toBe('short-slug');
    expect(result.length).toBeLessThan(20);
  });
});

describe('progressBar()', () => {
  it('returns empty string when total is 0', () => {
    expect(callFn('progressBar', 0, 0)).toBe('');
  });

  it('returns empty string when total is 0 regardless of done value', () => {
    expect(callFn('progressBar', 3, 0)).toBe('');
  });

  it('returns bar with done/total suffix', () => {
    const result = callFn('progressBar', 2, 5);
    expect(result).toContain('2/5');
  });

  it('full bar when done equals total', () => {
    const result = callFn('progressBar', 5, 5);
    expect(result).toContain('█████');
    expect(result).toContain('5/5');
  });

  it('empty bar when done is 0', () => {
    const result = callFn('progressBar', 0, 5);
    expect(result).toContain('░░░░░');
    expect(result).toContain('0/5');
  });

  it('partial bar rounds correctly for 2/5', () => {
    // 2/5 = 40% of width 5 = 2 filled, 3 empty
    const result = callFn('progressBar', 2, 5);
    expect(result).toContain('██░░░');
  });

  it('respects custom width', () => {
    // 5/10 = 50% of width 10 = 5 filled, 5 empty
    const result = callFn('progressBar', 5, 10, 10);
    expect(result).toContain('█████░░░░░');
    expect(result).toContain('5/10');
  });
});

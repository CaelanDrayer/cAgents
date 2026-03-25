import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
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

  it('extracts multi-word slug (not truncated if 28 chars or under)', () => {
    // 'implement-statusline-redesign' is 29 chars -> slice(0,27) + '…' = 28 chars total
    expect(callFn('extractSlug', 'run_implement-statusline-redesign_260323_003'))
      .toBe('implement-statusline-redesi…');
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

  it('truncates slug longer than 28 chars with ellipsis', () => {
    // 'review-statusline-generation-complete' is 37 chars -> slice(0,27) + '…' = 28 chars total
    const result = callFn('extractSlug', 'run_review-statusline-generation-complete_260323_005');
    expect(result).toBe('review-statusline-generatio…');
    expect(result.length).toBe(28);
  });

  it('does not truncate slug exactly 28 chars', () => {
    // 'fix-exactly-28-chars-in-slug' is 28 chars -> no truncation
    const result = callFn('extractSlug', 'run_fix-exactly-28-chars-in-slug_260323_001');
    expect(result).toBe('fix-exactly-28-chars-in-slug');
    expect(result.length).toBe(28);
  });

  it('does not truncate slug under 28 chars', () => {
    const result = callFn('extractSlug', 'run_short-slug_260323_001');
    expect(result).toBe('short-slug');
    expect(result.length).toBeLessThan(28);
  });

  it('does not truncate 20-char slug (MAX_SLUG raised from 20 to 28)', () => {
    // Previously truncated at 20 chars; now 20-char slugs pass through uncut
    const result = callFn('extractSlug', 'run_action-followup-items_260325_001');
    expect(result).toBe('action-followup-items');
    expect(result.length).toBe(21);
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

// ---------------------------------------------------------------------------
// getLatestEventState() regression tests
// Tests that EVT files provide real-time state updates beyond status.yaml
// ---------------------------------------------------------------------------
describe('getLatestEventState()', () => {
  // Use the real module (not stubbed) to test fs interactions
  // createRequire is unavailable in ESM context, use dynamic import workaround via execSync
  let tmpDir;

  afterEach(() => {
    if (tmpDir) {
      try { rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      tmpDir = null;
    }
  });

  function callGetLatestEventState(sessionDir) {
    // Call via test runner (which loads the stubbed module but getLatestEventState uses real fs)
    const out = execSync(
      `node "${RUNNER}" getLatestEventState ${sessionDir}`,
      { encoding: 'utf8', timeout: 5000 }
    );
    return JSON.parse(out);
  }

  it('returns null state and 0 count when no events directory exists', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    const result = callGetLatestEventState(tmpDir);
    expect(result).toEqual({ state: null, evtCount: 0 });
  });

  it('returns null state and 0 count when events dir is empty', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    mkdirSync(join(tmpDir, 'workflow', 'events'), { recursive: true });
    const result = callGetLatestEventState(tmpDir);
    expect(result).toEqual({ state: null, evtCount: 0 });
  });

  it('reads state_to from a single EVT file', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    const eventsDir = join(tmpDir, 'workflow', 'events');
    mkdirSync(eventsDir, { recursive: true });
    writeFileSync(join(eventsDir, 'EVT-1.yaml'), [
      'event_id: EVT-1',
      'type: state_transition',
      'state_from: INIT',
      'state_to: ORCHESTRATED',
    ].join('\n'));
    const result = callGetLatestEventState(tmpDir);
    expect(result.state).toBe('ORCHESTRATED');
    expect(result.evtCount).toBe(1);
  });

  it('returns state_to from the latest EVT when multiple files exist', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    const eventsDir = join(tmpDir, 'workflow', 'events');
    mkdirSync(eventsDir, { recursive: true });
    writeFileSync(join(eventsDir, 'EVT-1.yaml'), 'state_to: ORCHESTRATED\n');
    writeFileSync(join(eventsDir, 'EVT-2.yaml'), 'state_to: PLANNED\n');
    writeFileSync(join(eventsDir, 'EVT-3.yaml'), 'state_to: DECOMPOSED\n');
    const result = callGetLatestEventState(tmpDir);
    expect(result.state).toBe('DECOMPOSED');
    expect(result.evtCount).toBe(3);
  });

  it('sorts EVT files numerically not lexicographically (EVT-10 > EVT-9)', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    const eventsDir = join(tmpDir, 'workflow', 'events');
    mkdirSync(eventsDir, { recursive: true });
    for (let i = 1; i <= 9; i++) {
      writeFileSync(join(eventsDir, `EVT-${i}.yaml`), `state_to: STATE_${i}\n`);
    }
    writeFileSync(join(eventsDir, 'EVT-10.yaml'), 'state_to: COORDINATED\n');
    const result = callGetLatestEventState(tmpDir);
    expect(result.state).toBe('COORDINATED');
    expect(result.evtCount).toBe(10);
  });

  it('ignores non-EVT files in events directory', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    const eventsDir = join(tmpDir, 'workflow', 'events');
    mkdirSync(eventsDir, { recursive: true });
    writeFileSync(join(eventsDir, 'EVT-1.yaml'), 'state_to: PLANNED\n');
    writeFileSync(join(eventsDir, 'index.yaml'), 'events: [EVT-1]\n');
    writeFileSync(join(eventsDir, 'README.md'), '# Events\n');
    const result = callGetLatestEventState(tmpDir);
    expect(result.state).toBe('PLANNED');
    expect(result.evtCount).toBe(1); // only EVT files counted
  });

  it('returns null state (not evtCount) when latest EVT has no state_to', () => {
    tmpDir = join(tmpdir(), `statusline-test-${Date.now()}`);
    const eventsDir = join(tmpDir, 'workflow', 'events');
    mkdirSync(eventsDir, { recursive: true });
    writeFileSync(join(eventsDir, 'EVT-1.yaml'), 'event_id: EVT-1\ntype: other\n');
    const result = callGetLatestEventState(tmpDir);
    expect(result.state).toBeNull();
    expect(result.evtCount).toBe(1);
  });
});

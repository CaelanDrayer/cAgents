import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'tool-failure-tracker.cjs');
const TEST_SESSION_DIR = join(process.cwd(), 'cagents-memory', 'sessions', 'act_20260101_000000_test_tft');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('tool-failure-tracker.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue:true for empty input', () => {
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should return continue:true for missing tool_name', () => {
    const result = runHook({ error: 'some error' });
    expect(result.continue).toBe(true);
  });

  it('should handle tool_name with no session', () => {
    // If no active session found, should still return continue
    const result = runHook({ tool_name: 'Bash', error: 'command not found', session_id: 'nonexistent_session' });
    expect(result.continue).toBe(true);
  });

  describe('TOOL_ALTERNATIVES', () => {
    it('should define alternatives for common tools', () => {
      // Verify the hook file contains expected tool alternatives
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain("'Bash'");
      expect(hookContent).toContain("'Write'");
      expect(hookContent).toContain("'Edit'");
      expect(hookContent).toContain("'Task'");
      expect(hookContent).toContain("'WebFetch'");
      expect(hookContent).toContain("'Glob'");
      expect(hookContent).toContain("'Grep'");
    });
  });

  describe('pattern detection threshold', () => {
    it('should use threshold of 3 failures (2 previous + current)', () => {
      // Verify the threshold logic is in the code
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('recentCount >= 2');
    });

    it('should use 10 minute window for pattern detection', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('10 * 60 * 1000');
    });
  });

  describe('error sanitization', () => {
    it('should sanitize double quotes in error messages', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('.replace(/"/g');
    });

    it('should truncate long error messages', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('.slice(0, 200)');
    });
  });

  describe('return shape compliance (regression: V11.0.4; updated v12.x)', () => {
    // Original bug (V11.0.4): when the pattern-detection branch fired (3+
    // failures of same tool accumulated in a session's tool_failures.yaml),
    // the hook returned {hookSpecificOutput: ...} without continue:true, so
    // assertions like `expect(result.continue).toBe(true)` saw "undefined".
    //
    // v12.x update (thinking-block-immutability contract, audit
    // team_hooks-review_260602_001 / run_team-thinking-400_260531_001):
    // PostToolUseFailure is a LATEST-TURN-SUSPECT event. The pattern-detection
    // branch NO LONGER emits hookSpecificOutput.additionalContext (or a
    // systemMessage) at all — emitting content there risks attaching it to the
    // just-completed assistant turn's content[] array. The branch now returns
    // `null`; the createHook() factory transforms null into {"continue": true}
    // at the output layer, so the continue:true output contract is still
    // satisfied. The original-shape source-text scrape (expecting an inline
    // `continue: true` adjacent to `hookSpecificOutput`) is therefore obsolete.
    //
    // The contract this test now pins: the pattern-detection branch returns
    // null (which the factory renders as continue:true) and does NOT emit
    // hookSpecificOutput / systemMessage in that branch.
    it('pattern-detection branch returns null (factory yields continue:true) and emits no hookSpecificOutput / systemMessage field', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      // Isolate the pattern-detection branch: from the "Pattern detection"
      // comment up to the start of the next (first-failure) branch comment.
      const afterPatternMarker = hookContent.split('Pattern detection')[1] || '';
      const patternBranchRaw = afterPatternMarker.split('Even on first failure')[0] || '';
      // The branch must terminate by returning null (factory → continue:true).
      expect(patternBranchRaw).toContain('return null;');
      // Strip `//` line comments before asserting on emitted fields — the
      // thinking-block-immutability rationale comment in this branch
      // legitimately MENTIONS the words "systemMessage" and
      // "hookSpecificOutput" while explaining why neither is emitted. We assert
      // on the CODE, not the prose.
      const patternBranchCode = patternBranchRaw
        .split('\n')
        .filter((line) => !line.trim().startsWith('//'))
        .join('\n');
      // Per the thinking-block-immutability contract, the branch's CODE must NOT
      // emit a hookSpecificOutput object or a systemMessage field.
      expect(patternBranchCode).not.toContain('hookSpecificOutput');
      expect(patternBranchCode).not.toMatch(/systemMessage\s*:/);
    });

    // Runtime contract: regardless of branch, the hook's actual stdout always
    // carries continue:true (the createHook() factory guarantees this). This
    // is the assertion the original V11.0.4 bug cared about, now verified at
    // the behavioral (not source-text) level using a session with no prior
    // failures so the hook runs end-to-end without side effects on real state.
    it('runtime output always includes continue:true', () => {
      const result = runHook({ tool_name: 'Bash', error: 'command not found', session_id: 'nonexistent_session_tft' });
      expect(result.continue).toBe(true);
    });
  });
});

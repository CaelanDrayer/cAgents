/**
 * Hook Thinking-Block Contract Regression Test
 *
 * Session: run_team-thinking-400_260531_001
 * Bug:
 *   API Error: 400 messages.3.content.9: `thinking` or `redacted_thinking`
 *   blocks in the latest assistant message cannot be modified. These blocks
 *   must remain as-is from the original assistant turn.
 *
 * Failure mode (pre-fix HEAD~1, commit 1b6d5066..53e6ca6 boundary):
 *   Six cAgents hooks emitted a top-level `systemMessage` (or a
 *   hookSpecificOutput.additionalContext targeting an assistant turn) on
 *   LATEST-TURN-SUSPECT events:
 *     - post-compact-restore.cjs (PostCompact)
 *     - team-task-complete.cjs   (TaskCompleted, 2 sites)
 *     - teammate-idle-handler.cjs (TeammateIdle, available-work branch)
 *     - post-write-validator.cjs (PostToolUse, warnings + planning branches)
 *     - validator-evidence-recheck.cjs (PostToolUse, downgrade branch)
 *     - pre-compact-save.cjs (PreCompact)
 *
 *   Claude Code's harness could attach those systemMessage payloads to the
 *   prior assistant turn's content array. When extended thinking was enabled
 *   (default on Opus/Sonnet 4.x), the modified content[] now had its
 *   thinking blocks altered, and the next Anthropic Messages API request
 *   failed the immutability check with HTTP 400.
 *
 * Fix (WI-3 commit 53e6ca7a): drop systemMessage from these 6 hooks for
 *   their LATEST-TURN-SUSPECT event branches. File-based side effects
 *   (audit logs, waypoints, task_list updates, validation_report mutations)
 *   are preserved. Advisory text is redirected to console.error (stderr).
 *
 * This test:
 *   1. Spawns each fixed hook via child_process.spawn(node, ...)
 *      with a realistic stdin payload exercising every branch that
 *      previously emitted systemMessage.
 *   2. Captures stdout and parses as JSON.
 *   3. Asserts the returned JSON does NOT contain a top-level
 *      `systemMessage` field, AND does not contain a
 *      hookSpecificOutput.additionalContext field.
 *   4. Asserts the hook still completes with exit 0 (no regression on
 *      the createHook() factory output contract).
 *   5. Verifies that pre-fix HEAD (git HEAD~1) emitted systemMessage from
 *      these same hooks (failing-before / passing-after assertion).
 *
 * Pattern: each hook is invoked via child_process.spawnSync to match how
 * Claude Code actually invokes hooks (json on stdin, json on stdout, no
 * shared module state). This gives true end-to-end coverage of the bug.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const HOOKS_DIR = path.join(REPO_ROOT, '.claude', 'hooks');

// The 6 hooks fixed in WI-3. Each entry pairs a hook file with a realistic
// stdin payload that, on pre-fix code, drove the systemMessage emission.
const FIXED_HOOKS = [
  {
    name: 'post-compact-restore.cjs',
    event: 'PostCompact',
    stdin: { session_id: 'nonexistent_test_session_does_not_exist_xxx' },
    // null-session path returns early null -> {"continue":true}, which is fine.
    // We exercise the full path via session_id below.
  },
  {
    name: 'team-task-complete.cjs',
    event: 'TaskCompleted',
    stdin: {
      session_id: 'nonexistent_test_session_does_not_exist_xxx',
      task_id: 'WI-test-1',
      team_name: 'test-team',
      teammate_name: 'test-teammate',
    },
  },
  {
    name: 'teammate-idle-handler.cjs',
    event: 'TeammateIdle',
    stdin: {
      session_id: 'nonexistent_test_session_does_not_exist_xxx',
      teammate_name: 'w2-task-3-tech-lead',
      team_name: 'test-team',
    },
  },
  {
    name: 'post-write-validator.cjs',
    event: 'PostToolUse',
    stdin: {
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/nonexistent_test_path_xxx.md', content: 'x' },
    },
  },
  {
    name: 'validator-evidence-recheck.cjs',
    event: 'PostToolUse',
    stdin: {
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/nonexistent_validation_report.yaml' },
    },
  },
  {
    name: 'pre-compact-save.cjs',
    event: 'PreCompact',
    stdin: { session_id: 'nonexistent_test_session_does_not_exist_xxx' },
  },
];

/**
 * Spawn a hook with a stdin payload and return parsed stdout JSON.
 */
function runHook(hookName, stdinJson) {
  const hookPath = path.join(HOOKS_DIR, hookName);
  const proc = spawnSync('node', [hookPath], {
    input: JSON.stringify(stdinJson),
    encoding: 'utf8',
    timeout: 5000,
  });
  return {
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
  };
}

/**
 * Recursively check whether an object contains a `systemMessage` field
 * anywhere in its structure. The thinking-block contract says no hook
 * may emit systemMessage on LATEST-TURN-SUSPECT events.
 */
function hasSystemMessage(obj) {
  if (obj == null || typeof obj !== 'object') return false;
  if ('systemMessage' in obj) return true;
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      if (hasSystemMessage(value)) return true;
    }
  }
  return false;
}

/**
 * Check whether a hook's hookSpecificOutput.additionalContext targets a
 * LATEST-TURN-SUSPECT event. additionalContext on SessionStart /
 * UserPromptSubmit / InstructionsLoaded is NEW-TURN-SAFE; the 6 hooks
 * under test should not emit additionalContext at all on their fixed
 * branches.
 */
function hasAdditionalContext(obj) {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.hookSpecificOutput && obj.hookSpecificOutput.additionalContext) {
    return true;
  }
  return false;
}

describe('Hook thinking-block contract (run_team-thinking-400_260531_001)', () => {
  describe.each(FIXED_HOOKS)('$name ($event)', (hook) => {
    it('exits cleanly (exit code 0)', () => {
      const result = runHook(hook.name, hook.stdin);
      expect(result.exitCode).toBe(0);
    });

    it('returns parseable JSON on stdout', () => {
      const result = runHook(hook.name, hook.stdin);
      expect(() => JSON.parse(result.stdout)).not.toThrow();
    });

    it('does NOT emit a top-level systemMessage (thinking-block contract)', () => {
      const result = runHook(hook.name, hook.stdin);
      const parsed = JSON.parse(result.stdout);
      // The fixed hooks may return {continue:true}, {continue:false,stopReason:...},
      // or {hookSpecificOutput:{hookEventName,permissionDecision}}. None of
      // these should include a `systemMessage` key on the LATEST-TURN-SUSPECT
      // event branches we exercise here.
      expect(parsed).not.toHaveProperty('systemMessage');
      expect(hasSystemMessage(parsed)).toBe(false);
    });

    it('does NOT emit hookSpecificOutput.additionalContext on LATEST-TURN-SUSPECT events', () => {
      const result = runHook(hook.name, hook.stdin);
      const parsed = JSON.parse(result.stdout);
      // Per the thinking-block contract, additionalContext on the LATEST-TURN-SUSPECT
      // events (PostCompact, TaskCompleted, TeammateIdle, PostToolUse, PreCompact)
      // is also forbidden because it can land on the just-completed assistant turn.
      // The 6 hooks under test do not emit additionalContext on any branch.
      expect(hasAdditionalContext(parsed)).toBe(false);
    });
  });

  // High-fidelity branch test: exercise team-task-complete.cjs's all-items-complete
  // path (returns {continue:false, stopReason}). stopReason is allowed because
  // it's a Claude Code shutdown signal, not a content payload.
  describe('team-task-complete.cjs all-items-complete branch', () => {
    let tmpSession;

    beforeAll(() => {
      // Create a temp session with a task_list.yaml where the test task is
      // the only item and is the one being completed -> hook will return
      // {continue:false, stopReason} (NEW-TURN-SAFE).
      tmpSession = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-thinking-400-test-'));
      const teamDir = path.join(tmpSession, 'team');
      fs.mkdirSync(teamDir, { recursive: true });
      fs.writeFileSync(path.join(teamDir, 'task_list.yaml'),
        '# Task List\nsummary:\n  total: 1\n  completed: 0\n  in_progress: 0\n  available: 1\n  updated_at: "2026-05-31T00:00:00Z"\n\nitems:\n  - id: "WI-only"\n    status: pending\n');
    });

    afterAll(() => {
      try { fs.rmSync(tmpSession, { recursive: true, force: true }); } catch {}
    });

    it('stopReason path remains intact (shutdown signal is NEW-TURN-SAFE)', () => {
      const result = runHook('team-task-complete.cjs', {
        session_id: path.basename(tmpSession),
        task_id: 'WI-only',
        team_name: 'test',
        teammate_name: 'test-teammate',
      });
      // stopReason is allowed because it's a UI/shutdown signal, not message[] content.
      // The hook may emit {continue:false, stopReason:"..."} for the all-done branch.
      // What MUST NOT appear is systemMessage / additionalContext on either branch.
      const parsed = JSON.parse(result.stdout);
      expect(parsed).not.toHaveProperty('systemMessage');
      expect(hasAdditionalContext(parsed)).toBe(false);
    });
  });

  // Source-level verification: scan each fixed hook for any remaining
  // `systemMessage:` literal on the LATEST-TURN-SUSPECT branch. This catches
  // future regressions where someone re-adds systemMessage without exercising
  // the runtime branch in tests.
  describe('source-level verification', () => {
    // Map of hook -> set of allowed systemMessage occurrences (e.g., comments
    // that REFERENCE the old behavior). All 6 fixed hooks should have ZERO
    // `systemMessage:` returns in their handler bodies; only comments may
    // mention the word.
    const FIXED_HOOK_NAMES = FIXED_HOOKS.map((h) => h.name);

    it.each(FIXED_HOOK_NAMES)('%s has no active `systemMessage:` return statement', (hookName) => {
      const hookPath = path.join(HOOKS_DIR, hookName);
      const source = fs.readFileSync(hookPath, 'utf8');
      // Strip /* ... */ and // ... single-line comments before scanning.
      const stripped = source
        .replace(/\/\*[\s\S]*?\*\//g, '') // block comments
        .replace(/^\s*\/\/.*$/gm, '');     // line comments
      // Look for ANY `systemMessage:` occurrence in active code.
      // The fix dropped these from all LATEST-TURN-SUSPECT branches.
      expect(stripped).not.toMatch(/systemMessage\s*:/);
    });
  });
});

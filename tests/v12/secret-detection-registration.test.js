// Regression test for WI-1 (D1a, v12.19.0) round-2 REVISE: the secret-detection
// deny-gate must fire under the REAL production invocation path.
//
// THE BUG (failing-before / passing-after):
//   A prior change wrapped `createHook('SecretDetection', ...)` in
//   `if (require.main === module) { ... }`. cAgents loads hooks via
//   `.claude/hooks/run-hook.cjs`, which does `require(hookPath)` — it does NOT
//   run the target hook as the main module. So under the real path
//   `node run-hook.cjs secret-detection`, `require.main` is run-hook.cjs (not
//   secret-detection.cjs), the `require.main === module` guard is FALSE,
//   createHook never registers, the hook emits nothing, and secrets that were
//   previously blocked silently PASS.
//
// THE FIX: register createHook UNCONDITIONALLY at top level (same as the sibling
// deny hooks bash-validator.cjs / post-write-validator.cjs).
//
// This test drives the hook through the production launcher exactly as Claude
// Code does — spawnSync('node', ['.claude/hooks/run-hook.cjs', 'secret-detection'])
// with a Write payload carrying a critical secret on stdin — and asserts the
// emitted JSON contains a permissionDecision:"deny". On the buggy (guarded)
// build it would emit only `{"continue":true}` (no deny); on the fixed build it
// emits the deny.
//
// NOTE: the AWS sample key is built by concatenation so the literal full token
// never appears as one contiguous string in THIS file — otherwise the
// secret-detection hook would block Write/Edit of this very test file.

import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import { join } from 'path';

const RUN_HOOK = join(process.cwd(), '.claude', 'hooks', 'run-hook.cjs');

// A valid AWS Access Key ID: AKIA + 16 uppercase/digit chars. Matches
// /AKIA[0-9A-Z]{16}/ (severity: critical) in SECRET_PATTERNS. Built by
// concatenation to avoid self-blocking this test file.
const AWS_KEY = 'AKIA' + 'IOSFODNN7' + 'ABCDEFG'; // AKIA + 16 chars (9 + 7)

// Drive the hook the way Claude Code does in production: through the run-hook.cjs
// launcher (which require()s the hook — NOT main-module execution).
function runHookProduction(payload) {
  return spawnSync('node', [RUN_HOOK, 'secret-detection'], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    cwd: process.cwd(),
    timeout: 10000,
  });
}

describe('secret-detection: production-path registration (WI-1 / D1a round-2)', () => {
  it('emits permissionDecision:"deny" for an AWS secret under `node run-hook.cjs secret-detection`', () => {
    const res = runHookProduction({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/x.ts', content: `const k="${AWS_KEY}";` },
    });

    expect(res.status).toBe(0);
    // The load-bearing assertion: stdout must carry the deny. On the buggy
    // (require.main-guarded) build, createHook never registered, so stdout was
    // only {"continue":true} with no permissionDecision — this assertion fails.
    expect(res.stdout).toContain('"permissionDecision":"deny"');
    // The deny reason should name the detected secret type.
    expect(res.stdout).toContain('AWS Access Key ID');
  });

  it('does NOT deny a clean Write under the production path (no false positive)', () => {
    const res = runHookProduction({
      tool_name: 'Write',
      tool_input: { file_path: '/tmp/clean.ts', content: 'export const x = 1;' },
    });

    expect(res.status).toBe(0);
    expect(res.stdout).not.toContain('"permissionDecision":"deny"');
  });
});

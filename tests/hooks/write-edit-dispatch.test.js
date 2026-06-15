/**
 * write-edit-dispatch.cjs — D1b consolidating dispatcher (cAgents v12.19.0, WI-5)
 *
 * This is the GATING suite for the highest-risk WI of v12.19.0: a single
 * PreToolUse[Write|Edit] dispatcher that folds 3 sub-validators into one node
 * process across a HARDENED SAFETY DENY surface.
 *
 * Coverage (the acceptance criteria):
 *   (a) most-restrictive + short-circuit: any sub-deny => dispatcher denies, and
 *       the first deny short-circuits (later handlers not consulted).
 *   (b) FAIL-CLOSED: a throw in either security/governance gate => DENY; a throw
 *       in the advisory gate => CONTINUE (fail-open).
 *   (c) heterogeneous returns: no deny + >=1 systemMessage => {continue, systemMessage};
 *       all-null => null/continue. Exactly one JSON object out of the production path.
 *   (d) ordering: security reasons preferred — secret-detection deny reason wins even
 *       when a later advisory would warn.
 *
 * The dispatchHandler is built via makeDispatchHandler({secret, delegation, skillSize})
 * so the test injects stub handlers (incl. throwing stubs) while leaving the
 * production wiring intact. A separate block exercises the REAL wired handlers via
 * the run-hook.cjs production path with order-sensitive payloads.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const DISPATCH_PATH = join(HOOKS_DIR, 'write-edit-dispatch.cjs');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');

// Load the dispatcher's factory WITHOUT triggering its standalone createHook()
// registration (which would read stdin). The guard env var is set before require.
function loadFactory() {
  process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
  // Fresh module each time so the import-time side effects (sub-module require)
  // are exercised cleanly.
  delete require.cache[require.resolve('../../.claude/hooks/write-edit-dispatch.cjs')];
  const mod = require('../../.claude/hooks/write-edit-dispatch.cjs');
  delete process.env.CAGENTS_DISPATCH_TEST_IMPORT;
  return mod;
}

const DENY = (reason) => ({ deny: true, reason });
const MSG = (systemMessage) => ({ continue: true, systemMessage });
const NULL = () => null;

describe('write-edit-dispatch.cjs (D1b dispatcher)', () => {
  it('exists', () => {
    expect(existsSync(DISPATCH_PATH)).toBe(true);
  });

  it('exports makeDispatchHandler + dispatchHandler', () => {
    const mod = loadFactory();
    expect(typeof mod.makeDispatchHandler).toBe('function');
    expect(typeof mod.dispatchHandler).toBe('function');
  });

  // ── (a) most-restrictive + short-circuit ──────────────────────────────────
  describe('(a) most-restrictive + short-circuit', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('secret-detection deny => dispatcher denies, and delegation+skillSize NOT consulted', async () => {
      const secret = vi.fn(async () => DENY('AKIA secret found'));
      const delegation = vi.fn(NULL);
      const skillSize = vi.fn(NULL);
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: '/tmp/x.ts', content: 'k' } });

      expect(verdict).toEqual(DENY('AKIA secret found'));
      expect(secret).toHaveBeenCalledTimes(1);
      // SHORT-CIRCUIT: later gates must NOT be consulted once secret denies.
      expect(delegation).not.toHaveBeenCalled();
      expect(skillSize).not.toHaveBeenCalled();
    });

    it('delegation deny (secret clean) => dispatcher denies, and skillSize NOT consulted', async () => {
      const secret = vi.fn(NULL);
      const delegation = vi.fn(async () => DENY('controller write blocked'));
      const skillSize = vi.fn(NULL);
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'src/a.ts' } });

      expect(verdict).toEqual(DENY('controller write blocked'));
      expect(secret).toHaveBeenCalledTimes(1);
      expect(delegation).toHaveBeenCalledTimes(1);
      expect(skillSize).not.toHaveBeenCalled();
    });

    it('skill-size deny (>=900 lines; both prior gates clean) => dispatcher denies', async () => {
      const secret = vi.fn(NULL);
      const delegation = vi.fn(NULL);
      const skillSize = vi.fn(async () => DENY('SKILL.md exceeds 900-line block threshold'));
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'x/SKILL.md' } });

      expect(verdict.deny).toBe(true);
      expect(verdict.reason).toMatch(/900-line/);
      expect(secret).toHaveBeenCalledTimes(1);
      expect(delegation).toHaveBeenCalledTimes(1);
      expect(skillSize).toHaveBeenCalledTimes(1);
    });
  });

  // ── (b) FAIL-CLOSED / FAIL-OPEN ───────────────────────────────────────────
  describe('(b) fail-closed (security/governance) vs fail-open (advisory)', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('secret-detection THROWS => dispatcher DENIES (fail-closed), short-circuits', async () => {
      const secret = vi.fn(async () => { throw new Error('scanner crashed'); });
      const delegation = vi.fn(NULL);
      const skillSize = vi.fn(NULL);
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: '/tmp/x.ts', content: 'k' } });

      expect(verdict.deny).toBe(true);
      expect(verdict.reason).toMatch(/FAIL-CLOSED/);
      expect(verdict.reason).toMatch(/secret-detection/);
      // NOT continue:true — the createHook FAIL-OPEN must be bypassed by our inner catch.
      expect(verdict.continue).toBeUndefined();
      expect(delegation).not.toHaveBeenCalled();
      expect(skillSize).not.toHaveBeenCalled();
    });

    it('controller-delegation THROWS (secret clean) => dispatcher DENIES (fail-closed)', async () => {
      const secret = vi.fn(NULL);
      const delegation = vi.fn(async () => { throw new Error('agent_tree read crashed'); });
      const skillSize = vi.fn(NULL);
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'src/a.ts' } });

      expect(verdict.deny).toBe(true);
      expect(verdict.reason).toMatch(/FAIL-CLOSED/);
      expect(verdict.reason).toMatch(/controller-delegation-validator/);
      expect(skillSize).not.toHaveBeenCalled();
    });

    it('skill-size-monitor THROWS (advisory) => dispatcher CONTINUES (fail-open)', async () => {
      const secret = vi.fn(NULL);
      const delegation = vi.fn(NULL);
      const skillSize = vi.fn(async () => { throw new Error('fs read crashed'); });
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'x/SKILL.md' } });

      // Fail-open: no deny. null (=> createHook continue) is the expected verdict.
      expect(verdict).toBeNull();
    });
  });

  // ── (c) heterogeneous returns ─────────────────────────────────────────────
  describe('(c) heterogeneous returns', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('no deny + one systemMessage (skill-size warn) => {continue, systemMessage}', async () => {
      const secret = vi.fn(NULL);
      const delegation = vi.fn(NULL);
      const skillSize = vi.fn(async () => MSG('[skill-size-monitor] X is 650 lines'));
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'x/SKILL.md' } });

      expect(verdict.deny).toBeUndefined();
      expect(verdict.continue).toBe(true);
      expect(verdict.systemMessage).toMatch(/650 lines/);
    });

    it('no deny + two systemMessages => merged systemMessage in gate order', async () => {
      const secret = vi.fn(NULL);
      const delegation = vi.fn(async () => MSG('[delegation warn] softer path'));
      const skillSize = vi.fn(async () => MSG('[skill-size warn] 650 lines'));
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'utils/foo.ts' } });

      expect(verdict.continue).toBe(true);
      // delegation (gate 2) before skill-size (gate 3).
      expect(verdict.systemMessage.indexOf('delegation warn'))
        .toBeLessThan(verdict.systemMessage.indexOf('skill-size warn'));
    });

    it('all-null => null (createHook emits {continue:true})', async () => {
      const h = makeDispatchHandler({ secret: vi.fn(NULL), delegation: vi.fn(NULL), skillSize: vi.fn(NULL) });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: '/tmp/ok.ts', content: 'const x=1;' } });
      expect(verdict).toBeNull();
    });
  });

  // ── (d) ordering: security reason preferred ───────────────────────────────
  describe('(d) ordering — security reason preferred', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('secret denies AND skill-size would warn => deny reason is the SECRET one', async () => {
      const secret = vi.fn(async () => DENY('Secret detected: AWS Access Key ID'));
      const delegation = vi.fn(NULL);
      const skillSize = vi.fn(async () => MSG('[skill-size warn] 650 lines'));
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'x/SKILL.md' } });

      expect(verdict.deny).toBe(true);
      expect(verdict.reason).toMatch(/AWS Access Key/);
      expect(verdict.reason).not.toMatch(/skill-size/);
      // advisory never consulted because secret short-circuited.
      expect(skillSize).not.toHaveBeenCalled();
    });

    it('secret denies AND delegation would also deny => secret reason wins (first gate)', async () => {
      const secret = vi.fn(async () => DENY('Secret detected'));
      const delegation = vi.fn(async () => DENY('controller blocked'));
      const skillSize = vi.fn(NULL);
      const h = makeDispatchHandler({ secret, delegation, skillSize });
      const verdict = await h({ tool_name: 'Write', tool_input: { file_path: 'src/a.ts' } });

      expect(verdict.reason).toMatch(/Secret detected/);
      expect(delegation).not.toHaveBeenCalled();
    });
  });

  // ── Production path: REAL wired handlers via run-hook.cjs (single JSON out) ──
  describe('production path (real handlers via run-hook.cjs)', () => {
    function runDispatch(input, env = {}) {
      const jsonStr = JSON.stringify(input);
      const out = execSync(
        `printf '%s' '${jsonStr.replace(/'/g, "'\\''")}' | node "${RUN_HOOK}" write-edit-dispatch`,
        { encoding: 'utf8', timeout: 8000, stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...env } }
      );
      const lines = out.trim().split('\n').filter(Boolean);
      // SINGLE-JSON-OUTPUT: exactly one parseable JSON object on stdout.
      expect(lines.length).toBe(1);
      return JSON.parse(lines[0]);
    }

    it('AKIA secret => deny (secret gate, real)', () => {
      const akia = 'AKI' + 'AIOSFODNN7REALKEY1';
      const verdict = runDispatch({ tool_name: 'Write', tool_input: { file_path: '/tmp/x.ts', content: `const k="${akia}";` } });
      expect(verdict.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('innocuous write => continue (all gates clean, real)', () => {
      const verdict = runDispatch({ tool_name: 'Write', tool_input: { file_path: '/tmp/ok.ts', content: 'const x = 1;\n' } });
      expect(verdict.continue).toBe(true);
      expect(verdict.hookSpecificOutput).toBeUndefined();
    });

    it('>=900-line SKILL.md => deny (skill-size gate, real)', () => {
      const big = 'x\n'.repeat(950);
      const verdict = runDispatch({ tool_name: 'Write', tool_input: { file_path: '/tmp/Big/SKILL.md', content: big } });
      expect(verdict.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(verdict.hookSpecificOutput.permissionDecisionReason).toMatch(/900-line/);
    });

    it('600-799-line SKILL.md => continue + systemMessage (skill-size warn, real)', () => {
      const mid = 'x\n'.repeat(650);
      const verdict = runDispatch({ tool_name: 'Write', tool_input: { file_path: '/tmp/Mid/SKILL.md', content: mid } });
      expect(verdict.continue).toBe(true);
      expect(verdict.systemMessage).toMatch(/skill-size-monitor/);
    });

    it('non-Write|Edit-relevant payload => continue (single JSON object)', () => {
      const verdict = runDispatch({ tool_name: 'Write', tool_input: { file_path: '/tmp/empty.ts', content: '' } });
      expect(verdict.continue).toBe(true);
    });
  });
});

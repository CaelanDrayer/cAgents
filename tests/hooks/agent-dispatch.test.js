/**
 * agent-dispatch.cjs — PreToolUse[Agent] consolidating dispatcher (cAgents, A2-12)
 *
 * Mirrors tests/hooks/write-edit-dispatch.test.js. agent-dispatch folds the two
 * PreToolUse[Agent] sub-validators (session-init-gate DENY gate + model-routing-advisor
 * advisory) into one node process; the former prompt-router[Agent] no-op was dropped
 * (A2-04).
 *
 * Coverage (acceptance criteria):
 *   (a) short-circuit: session-init-gate deny => dispatcher denies, advisory NOT consulted.
 *   (b) FAIL-CLOSED: a throw in the session-presence gate => DENY; a throw in the
 *       advisory gate => CONTINUE (fail-open).
 *   (c) heterogeneous returns: no deny + advisory systemMessage => {continue, systemMessage};
 *       session-init-gate alias verdict (systemMessage + hookSpecificOutput) preserved;
 *       all-null => null.
 *   (d) production path via run-hook.cjs: deny when no active session (single JSON out),
 *       continue for non-Agent payloads.
 *
 * The dispatchHandler is built via makeDispatchHandler({sessionGate, modelAdvisor}) so
 * the test injects stub handlers (incl. throwing stubs) while leaving the production
 * wiring intact.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const DISPATCH_PATH = join(HOOKS_DIR, 'agent-dispatch.cjs');
const RUN_HOOK = join(HOOKS_DIR, 'run-hook.cjs');

// Load the dispatcher's factory WITHOUT triggering its standalone createHook()
// registration (which would read stdin). The guard env var is set before require.
function loadFactory() {
  process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
  delete require.cache[require.resolve('../../.claude/hooks/agent-dispatch.cjs')];
  const mod = require('../../.claude/hooks/agent-dispatch.cjs');
  delete process.env.CAGENTS_DISPATCH_TEST_IMPORT;
  return mod;
}

const DENY = (reason) => ({ deny: true, reason });
const MSG = (systemMessage) => ({ continue: true, systemMessage });
const NULL = () => null;

describe('agent-dispatch.cjs (PreToolUse[Agent] dispatcher)', () => {
  it('exists', () => {
    expect(existsSync(DISPATCH_PATH)).toBe(true);
  });

  it('exports makeDispatchHandler + dispatchHandler + isDeny', () => {
    const mod = loadFactory();
    expect(typeof mod.makeDispatchHandler).toBe('function');
    expect(typeof mod.dispatchHandler).toBe('function');
    expect(typeof mod.isDeny).toBe('function');
  });

  // ── (a) short-circuit ──────────────────────────────────────────────────────
  describe('(a) most-restrictive + short-circuit', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('session-init-gate deny => dispatcher denies, model-routing-advisor NOT consulted', async () => {
      const sessionGate = vi.fn(async () => DENY('no active session'));
      const modelAdvisor = vi.fn(NULL);
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } });

      expect(verdict).toEqual(DENY('no active session'));
      expect(sessionGate).toHaveBeenCalledTimes(1);
      expect(modelAdvisor).not.toHaveBeenCalled();
    });

    it('also denies on a fully-formed permissionDecision:deny verdict (not just shorthand)', async () => {
      const fullDeny = {
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'x' },
      };
      const sessionGate = vi.fn(async () => fullDeny);
      const modelAdvisor = vi.fn(NULL);
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });

      expect(verdict).toEqual(fullDeny);
      expect(modelAdvisor).not.toHaveBeenCalled();
    });
  });

  // ── (b) FAIL-CLOSED / FAIL-OPEN ───────────────────────────────────────────
  describe('(b) fail-closed (session gate) vs fail-open (advisory)', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('session-init-gate THROWS => dispatcher DENIES (fail-closed), short-circuits', async () => {
      const sessionGate = vi.fn(async () => { throw new Error('findActiveSession crashed'); });
      const modelAdvisor = vi.fn(NULL);
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });

      expect(verdict.deny).toBe(true);
      expect(verdict.reason).toMatch(/FAIL-CLOSED/);
      expect(verdict.reason).toMatch(/session-init-gate/);
      // NOT continue:true — the createHook FAIL-OPEN must be bypassed by our inner catch.
      expect(verdict.continue).toBeUndefined();
      expect(modelAdvisor).not.toHaveBeenCalled();
    });

    it('model-routing-advisor THROWS (advisory) => dispatcher CONTINUES (fail-open)', async () => {
      const sessionGate = vi.fn(NULL);
      const modelAdvisor = vi.fn(async () => { throw new Error('plugin.json read crashed'); });
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });

      // Fail-open: no deny. null (=> createHook continue) is the expected verdict.
      expect(verdict).toBeNull();
    });
  });

  // ── RF-4: fail-closed vs fail-open on gate throw ──────────────────────────
  // Failing CLOSED on an I/O error conflates "I could not look" with "there is
  // nothing there". A chmod-000 sessions dir, an unmounted network home, a
  // container bind-mount, SELinux, or a half-populated worktree threw out of
  // findActiveSession's readdirSync and DENIED every Agent spawn for as long as
  // the condition lasted — total blast radius, from a transient filesystem
  // state the gate had no opinion about. Genuine LOGIC faults still deny.
  //
  // BEFORE FIX both cases below deny; the EACCES assertions fail.
  describe('fail-closed vs fail-open on gate throw', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    /** Build an error shaped exactly like Node's fs errors. */
    function fsError(code, syscall, target) {
      const err = new Error(`${code}: ${code === 'EACCES' ? 'permission denied' : 'i/o failure'}, ${syscall} '${target}'`);
      err.code = code;
      err.syscall = syscall;
      err.path = target;
      return err;
    }

    const SESSIONS = '/mnt/nfs-home/proj/cagents-memory/sessions';

    it('EACCES-shaped throw => ALLOWS with a reason naming the errno and the path', async () => {
      const sessionGate = vi.fn(async () => { throw fsError('EACCES', 'scandir', SESSIONS); });
      const modelAdvisor = vi.fn(NULL);
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } });

      expect(verdict.deny).toBeUndefined();
      expect(verdict.hookSpecificOutput?.permissionDecision).not.toBe('deny');
      expect(verdict.continue).toBe(true);

      const reason = `${verdict.systemMessage || ''}\n${verdict.hookSpecificOutput?.permissionDecisionReason || ''}`;
      expect(reason).toMatch(/FAIL-OPEN/);
      expect(reason).toContain('EACCES');
      expect(reason).toContain(SESSIONS);
    });

    it.each(['ENOENT', 'EIO', 'ENOTDIR', 'ELOOP'])(
      '%s-shaped throw also fails OPEN with errno + path in the reason',
      async (code) => {
        const sessionGate = vi.fn(async () => { throw fsError(code, 'scandir', SESSIONS); });
        const h = makeDispatchHandler({ sessionGate, modelAdvisor: vi.fn(NULL) });
        const verdict = await h({ tool_name: 'Agent', tool_input: {} });

        expect(verdict.deny).toBeUndefined();
        const reason = `${verdict.systemMessage || ''}\n${verdict.hookSpecificOutput?.permissionDecisionReason || ''}`;
        expect(reason).toContain(code);
        expect(reason).toContain(SESSIONS);
      }
    );

    it('a genuine TypeError still DENIES (fail-closed preserved — this is not an over-correction)', async () => {
      const sessionGate = vi.fn(async () => { throw new TypeError("Cannot read properties of undefined (reading 'x')"); });
      const modelAdvisor = vi.fn(NULL);
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });

      expect(verdict.deny).toBe(true);
      expect(verdict.reason).toMatch(/FAIL-CLOSED/);
      expect(verdict.reason).toMatch(/session-init-gate/);
      expect(verdict.reason).toMatch(/LOGIC fault/);
      expect(modelAdvisor).not.toHaveBeenCalled();
    });

    it('an errno-less Error whose message carries the ERRNO prefix is still classified as I/O', async () => {
      // A rethrow can lose `err.code` while keeping Node's `ERRNO: msg` prefix.
      const sessionGate = vi.fn(async () => {
        throw new Error(`EACCES: permission denied, scandir '${SESSIONS}'`);
      });
      const h = makeDispatchHandler({ sessionGate, modelAdvisor: vi.fn(NULL) });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });

      expect(verdict.deny).toBeUndefined();
      expect(`${verdict.systemMessage}`).toContain('EACCES');
      expect(`${verdict.systemMessage}`).toContain(SESSIONS);
    });
  });

  // ── RF-4 (FS-4): the two invocation routes must agree ─────────────────────
  // The SAME throw failed CLOSED under agent-dispatch and OPEN (silently) under
  // the standalone `node run-hook.cjs session-init-gate` path, because that
  // route is handled by createHook's outer catch. Opposite semantics for one
  // condition is not a policy, it is an accident.
  describe('invocation-route parity (createHook outer catch)', () => {
    it('handlerFailureVerdict applies the same I/O-vs-logic split for SessionInitGate', () => {
      const utils = require('../../.claude/hooks/hook-utils.cjs');

      const io = new Error("EACCES: permission denied, scandir '/x/sessions'");
      io.code = 'EACCES';
      io.path = '/x/sessions';
      const ioVerdict = utils.handlerFailureVerdict('SessionInitGate', io);
      expect(ioVerdict.continue).toBe(true);
      expect(ioVerdict.hookSpecificOutput.permissionDecision).toBeUndefined();
      expect(ioVerdict.hookSpecificOutput.permissionDecisionReason).toContain('EACCES');
      expect(ioVerdict.hookSpecificOutput.permissionDecisionReason).toContain('/x/sessions');

      const logic = utils.handlerFailureVerdict('SessionInitGate', new TypeError('boom'));
      expect(logic.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(logic.hookSpecificOutput.permissionDecisionReason).toMatch(/FAIL-CLOSED/);
    });

    it('a NON-gate hook never denies on a logic throw, but is never silent either', () => {
      const utils = require('../../.claude/hooks/hook-utils.cjs');
      const v = utils.handlerFailureVerdict('SomeAdvisoryHook', new TypeError('boom'));
      expect(v.continue).toBe(true);
      expect(v.hookSpecificOutput?.permissionDecision).toBeUndefined();
      expect(v.systemMessage).toMatch(/threw and was caught/);
    });
  });

  // ── (c) heterogeneous returns ─────────────────────────────────────────────
  describe('(c) heterogeneous returns', () => {
    let makeDispatchHandler;
    beforeEach(() => { ({ makeDispatchHandler } = loadFactory()); });

    it('no deny + advisory systemMessage => {continue, systemMessage}', async () => {
      const sessionGate = vi.fn(NULL);
      const modelAdvisor = vi.fn(async () => MSG('[ModelRoutingAdvisor] routing advisory'));
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: { subagent_type: 'cagents:tech-lead', model: 'haiku' } });

      expect(verdict.deny).toBeUndefined();
      expect(verdict.continue).toBe(true);
      expect(verdict.systemMessage).toMatch(/routing advisory/);
    });

    it('session-init-gate alias verdict (systemMessage + hookSpecificOutput) is preserved + merged', async () => {
      const aliasVerdict = {
        continue: true,
        systemMessage: '[session-init-gate] cagents:old renamed to cagents:new',
        hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecisionReason: 'renamed' },
      };
      const sessionGate = vi.fn(async () => aliasVerdict);
      const modelAdvisor = vi.fn(async () => MSG('[ModelRoutingAdvisor] advisory'));
      const h = makeDispatchHandler({ sessionGate, modelAdvisor });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });

      expect(verdict.continue).toBe(true);
      // gate-1 (session) message before gate-2 (advisor) message.
      expect(verdict.systemMessage.indexOf('renamed'))
        .toBeLessThan(verdict.systemMessage.indexOf('advisory'));
      // hookSpecificOutput preserved from session-init-gate (carries permissionDecisionReason).
      expect(verdict.hookSpecificOutput.permissionDecisionReason).toBe('renamed');
    });

    it('all-null => null (createHook emits {continue:true})', async () => {
      const h = makeDispatchHandler({ sessionGate: vi.fn(NULL), modelAdvisor: vi.fn(NULL) });
      const verdict = await h({ tool_name: 'Agent', tool_input: {} });
      expect(verdict).toBeNull();
    });
  });

  // ── Production path: REAL wired handlers via run-hook.cjs (single JSON out) ──
  describe('production path (real handlers via run-hook.cjs)', () => {
    function runDispatch(input, env = {}) {
      const jsonStr = JSON.stringify(input);
      const out = execSync(
        `printf '%s' '${jsonStr.replace(/'/g, "'\\''")}' | node "${RUN_HOOK}" agent-dispatch`,
        { encoding: 'utf8', timeout: 8000, stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...env } }
      );
      const lines = out.trim().split('\n').filter(Boolean);
      // SINGLE-JSON-OUTPUT: exactly one parseable JSON object on stdout.
      expect(lines.length).toBe(1);
      return JSON.parse(lines[0]);
    }

    it('Agent spawn with NO active session => ALLOW with a loud advisory (RF-1, was deny)', () => {
      const tmpDir = join(tmpdir(), 'cagents-test-agent-dispatch-' + Date.now());
      mkdirSync(tmpDir, { recursive: true });
      try {
        const verdict = runDispatch(
          { tool_name: 'Agent', tool_input: { subagent_type: 'cagents:backend-developer' } },
          // Empty project dir => findActiveSession returns null. Pre-RF-1 this was
          // a hard deny, which is precisely what stopped delegation on every clean
          // machine (cagents-memory/ is git-ignored, so a fresh clone has none).
          // Clear the CAGENTS_SESSION_ID/ACTIVE_SESSION bypasses so the presence
          // path is genuinely exercised.
          { CLAUDE_PROJECT_DIR: tmpDir, CAGENTS_SESSION_ID: '', CAGENTS_ACTIVE_SESSION: '' }
        );
        expect(verdict.hookSpecificOutput?.permissionDecision).not.toBe('deny');
        expect(verdict.continue).toBe(true);
        expect(verdict.systemMessage || '').toMatch(/SESSION PRESENCE/);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('non-Agent payload => continue (both gates return null, single JSON object)', () => {
      const verdict = runDispatch({ tool_name: 'Bash', tool_input: { command: 'ls' } });
      expect(verdict.continue).toBe(true);
      expect(verdict.hookSpecificOutput).toBeUndefined();
    });
  });
});

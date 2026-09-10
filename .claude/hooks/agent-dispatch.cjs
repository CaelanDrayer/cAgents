#!/usr/bin/env node
/**
 * Agent Dispatch Hook (cAgents, A2-12) — PreToolUse[Agent] consolidating dispatcher
 *
 * A SINGLE dispatching PreToolUse[Agent] hook that consolidates the PreToolUse[Agent]
 * sub-validators into one node cold-start, replacing the separate
 * `node run-hook.cjs <name>` child processes that fired on every Agent spawn
 * pre-consolidation. AFTER consolidation: 1 cold-start per Agent spawn (down from 3 —
 * session-init-gate + model-routing-advisor + the prompt-router[Agent] no-op, which
 * was dropped in A2-04). Mirrors the proven D1b pattern from write-edit-dispatch.cjs.
 *
 * This touches a session-presence DENY surface. Correctness and fail-CLOSED behavior
 * outweigh perf. The control flow below is the load-bearing contract:
 *
 *   ORDER (deny-first, short-circuit on first deny):
 *     1. session-init-gate     — SESSION-PRESENCE DENY GATE (FAIL-CLOSED)
 *     2. model-routing-advisor — ADVISORY                   (FAIL-OPEN)
 *
 *   - The FIRST deny wins and SHORT-CIRCUITS: the advisory gate is NOT consulted once
 *     session-init-gate denies. (Same contract as write-edit-dispatch.)
 *   - MOST-RESTRICTIVE: any sub-deny => the dispatcher denies.
 *   - FAIL-CLOSED for the session-presence gate on a LOGIC throw: the dispatcher
 *     DENIES (naming the gate + fail-closed). This is done with an explicit try/catch
 *     INSIDE this dispatchHandler.
 *   - FAIL-OPEN + LOUD on an I/O throw (RF-4, v12.70.0): EACCES / ENOENT / EIO /
 *     ENOTDIR / ELOOP mean the gate could not LOOK, which is not evidence that there
 *     is nothing to find. Those ALLOW the spawn and attach a permissionDecisionReason
 *     naming the errno and the path. createHook's outer catch (hook-utils
 *     handlerFailureVerdict) now applies the SAME policy, so the in-process route and
 *     the standalone `node run-hook.cjs session-init-gate` route no longer have
 *     opposite failure semantics.
 *   - FAIL-OPEN for the advisory gate: a throw in model-routing-advisor is caught and
 *     treated as null (continue).
 *   - HETEROGENEOUS RETURNS: session-init-gate's non-deny verdict can carry a
 *     systemMessage AND a hookSpecificOutput (the alias-resolution case carries a
 *     permissionDecisionReason); model-routing-advisor can carry a systemMessage.
 *     With no deny, the dispatcher merges any systemMessages (in gate order) and
 *     preserves session-init-gate's hookSpecificOutput, so the emitted verdict is
 *     identical to what each sub-handler would have produced standalone.
 *   - SINGLE-JSON-OUTPUT: this module USES createHook('AgentDispatch', ...) so exactly
 *     one JSON object is emitted; the dispatchHandler returns the winning sub-handler's
 *     verdict verbatim (or a merged non-deny verdict) and createHook performs the
 *     shorthand->hookSpecificOutput transform.
 *
 * Sub-handler import: CAGENTS_DISPATCH_IMPORT is set BEFORE require()ing the 2
 * sub-modules so each module's own standalone createHook() registration is SUPPRESSED
 * — otherwise the sub-modules' run() loops would contend for stdin with this
 * dispatcher. We import only the pure handler from each.
 */

'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { createHook, isIoError, describeIoError } = require('./hook-utils.cjs');

// Suppress the standalone createHook() registration inside each sub-module while we
// require() them purely to import their handler. Set BEFORE the requires.
process.env.CAGENTS_DISPATCH_IMPORT = '1';
const sessionInitGate = require('./session-init-gate.cjs');
const modelRoutingAdvisor = require('./model-routing-advisor.cjs');
// Clear the flag after import so it does not leak into sub-handler logic or any later
// require() in the same process (defensive — handlers do not read it).
delete process.env.CAGENTS_DISPATCH_IMPORT;

/**
 * True when a sub-handler verdict represents a deny, in either shorthand
 * ({ deny: true }) or fully-formed ({ hookSpecificOutput.permissionDecision: 'deny' })
 * shape. session-init-gate denies via denyWithReason() which is the shorthand form.
 */
function isDeny(v) {
  if (!v) return false;
  if (v.deny === true) return true;
  if (v.hookSpecificOutput && v.hookSpecificOutput.permissionDecision === 'deny') return true;
  return false;
}

/**
 * Extract a human-readable reason from either deny shape.
 */
function denyReasonOf(v) {
  if (!v) return 'unspecified';
  if (typeof v.reason === 'string' && v.reason) return v.reason;
  const hso = v.hookSpecificOutput;
  if (hso && typeof hso.permissionDecisionReason === 'string' && hso.permissionDecisionReason) {
    return hso.permissionDecisionReason;
  }
  return 'unspecified';
}

/**
 * WI-B6 integration (v12.70.0) — leave a TRACE when an Agent spawn is DENIED.
 *
 * WHY THIS EXISTS: subagent-tracker.cjs is registered for SubagentStart ONLY, and
 * SubagentStart never fires for a spawn denied at PreToolUse|Agent. So before this
 * wiring, a denied spawn left NO record anywhere — agent_tree.yaml could only ever
 * contain successes. The user-reported symptom ("sub agent spawning is getting
 * blocked a lot") was invisible BY CONSTRUCTION. This makes denials observable.
 *
 * OBSERVABILITY, NOT POLICY. Every failure mode here is swallowed:
 *   - wrapped in try/catch, so a throw can never turn one failure into two;
 *   - FIRE-AND-FORGET (LOW-1, review round 1): the recorder is a DETACHED,
 *     `unref()`ed `spawn` with `stdio: 'ignore'`, NOT a `spawnSync`. The
 *     previous `spawnSync(..., { timeout: 3000 })` was a genuine BLOCKING WAIT
 *     on a deny surface — measured at ~146 ms of in-hook stall per denied spawn
 *     (a full node cold start), with a 3000 ms ceiling. Recording a denial is
 *     pure observability; it must never delay or risk the verdict it records,
 *     so the hook now returns without waiting for the child at all.
 *     `stdio: 'ignore'` is load-bearing twice over: it stops the child from
 *     holding the hook's stdout open (the harness reads hook stdout to EOF), and
 *     `detached: true` puts the child in its own process group so a group-kill
 *     of the exiting hook cannot take the recorder with it. libuv performs the
 *     fork/exec synchronously inside `spawn()`, so the child exists before this
 *     function returns even though its WRITE completes after the hook has exited.
 *   - an `error` listener is MANDATORY, not decorative: an unhandled `'error'`
 *     event on a ChildProcess throws an uncaught exception. It is attached so
 *     ENOENT / EACCES / a missing binary degrade to one stderr line;
 *   - it runs ONLY on the deny path (which is now near-dead), so it adds zero
 *     latency to the overwhelmingly common allow path;
 *   - the deny verdict is returned UNCHANGED whether recording succeeded or not.
 * A failure to record a denial must never become a second failure.
 *
 * WHY NOT AN IN-PROCESS APPEND: `subagent-tracker.cjs` exports nothing and
 * registers `createHook()` unconditionally at load, so calling `recordSpawnFailure`
 * in-process would mean either duplicating its 3-layer write (audit log + session
 * event + `spawn_failures:` under `withFileLock`) or restructuring the tracker.
 * It would also re-import the blocking wait through the back door: `withFileLock`
 * sleeps synchronously up to 100 x 20 ms = 2 s under contention. Detaching moves
 * that contention entirely out of the deny path.
 *
 * A denied spawn is EVIDENCE, not credit: subagent-tracker writes it under
 * `spawn_failures:` with `- attempt_id:` / `attempted_type:` keys that are
 * deliberately unmatchable by the child-counting / stall-detection probes, so a
 * denial can never fake delegation or mask a stall.
 */
function recordDeniedSpawn(input, reason) {
  try {
    const payload = {
      attempt_id: `denied_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      attempted_type: (input && input.tool_input && input.tool_input.subagent_type) || 'unknown',
      status: 'denied',
      reason: String(reason || 'unspecified').replace(/\s+/g, ' ').slice(0, 500),
      session_id: (input && input.session_id) || null,
      source: 'agent-dispatch.cjs',
    };
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'subagent-tracker.cjs'), '--record-failure', JSON.stringify(payload)],
      { detached: true, stdio: 'ignore' }
    );
    // Without this listener an async spawn failure (ENOENT/EACCES) raises an
    // UNHANDLED 'error' event, which would crash the hook process — turning a
    // failure to record into a second, worse failure. Swallow it loudly.
    child.on('error', (err) => {
      console.error(`[AgentDispatch] denied-spawn record failed (non-fatal, deny stands): ${err && err.message}`);
    });
    // Release the child from this process's event loop: the hook returns its
    // verdict and exits immediately; the recorder finishes on its own.
    child.unref();
  } catch (e) {
    console.error(`[AgentDispatch] denied-spawn record threw (non-fatal, deny stands): ${e && e.message}`);
  }
}

/**
 * Build the dispatch handler with injectable sub-handlers (testability).
 *
 * @param {object} handlers
 * @param {function} handlers.sessionGate  — session-init-gate handler (DENY, fail-closed)
 * @param {function} handlers.modelAdvisor — model-routing-advisor handler (ADVISORY, fail-open)
 * @returns {function(input): Promise<verdict>} dispatchHandler returning a verdict
 */
function makeDispatchHandler({ sessionGate, modelAdvisor }) {
  return async function dispatchHandler(input) {
    // ── Gate 1: session-init-gate — SESSION-PRESENCE DENY GATE (FIRST, FAIL-CLOSED) ──
    let gateVerdict;
    try {
      gateVerdict = await sessionGate(input);
    } catch (err) {
      // RF-4: an I/O errno means the gate could not LOOK — it is not evidence
      // that there is nothing to find. Failing closed on it denied every Agent
      // spawn for as long as a chmod-000 dir / unmounted home / bind-mount /
      // SELinux condition lasted. Fail OPEN and LOUD instead, naming the errno
      // and the path so the condition is fixable from the transcript.
      if (isIoError(err)) {
        const d = describeIoError(err);
        console.error(`[AgentDispatch] session-init-gate FAILED OPEN (I/O): ${d.code} at ${d.path}`);
        const reason =
          `[FAIL-OPEN] session-init-gate could not read the session store ` +
          `(${d.code} at ${d.path}: ${d.message}). "I could not look" is NOT "there is no session", ` +
          `so the Agent spawn is ALLOWED. FIX: check permissions / mount state for that path ` +
          `(network home, container bind-mount, SELinux, half-populated worktree).`;
        return {
          continue: true,
          systemMessage: reason,
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecisionReason: reason,
          },
        };
      }
      // FAIL-CLOSED: a genuine LOGIC throw in the session-presence gate must
      // DENY, not continue. (Unchanged policy — only I/O is carved out above.)
      console.error(`[AgentDispatch] session-init-gate FAILED CLOSED: ${err && err.message}`);
      recordDeniedSpawn(input, `[FAIL-CLOSED] session-init-gate logic throw: ${err && err.message}`);
      return {
        deny: true,
        reason: `[FAIL-CLOSED] session-init-gate threw during evaluation ` +
                `(${err && err.message}). Denying the Agent spawn to avoid spawning ` +
                `into an unverified/absent session through a crashed presence gate. ` +
                `This is a LOGIC fault, not an I/O fault — it is a bug in the hook.`
      };
    }
    // First deny wins + short-circuits: the advisory gate is NOT consulted.
    if (isDeny(gateVerdict)) {
      recordDeniedSpawn(input, denyReasonOf(gateVerdict));
      return gateVerdict;
    }

    // ── Gate 2: model-routing-advisor — ADVISORY (FAIL-OPEN) ──
    let advisorVerdict;
    try {
      advisorVerdict = await modelAdvisor(input);
    } catch (err) {
      // FAIL-OPEN: the advisory gate is not deny-critical; a throw is treated as null
      // (continue). Logged so the failure is not silent.
      console.error(`[AgentDispatch] model-routing-advisor failed open (advisory): ${err && err.message}`);
      advisorVerdict = null;
    }
    // Defensive: model-routing-advisor never denies today, but honor most-restrictive.
    if (isDeny(advisorVerdict)) {
      recordDeniedSpawn(input, denyReasonOf(advisorVerdict));
      return advisorVerdict;
    }

    // ── No deny from either gate. Merge heterogeneous non-deny returns. ──
    // Collect systemMessages in gate order; preserve session-init-gate's
    // hookSpecificOutput (alias case carries permissionDecisionReason).
    const messages = [];
    let hookSpecificOutput = null;
    for (const v of [gateVerdict, advisorVerdict]) {
      if (!v) continue;
      if (typeof v.systemMessage === 'string' && v.systemMessage) {
        messages.push(v.systemMessage);
      }
      if (!hookSpecificOutput && v.hookSpecificOutput) {
        hookSpecificOutput = v.hookSpecificOutput;
      }
    }
    if (messages.length > 0 || hookSpecificOutput) {
      const out = { continue: true };
      if (messages.length > 0) out.systemMessage = messages.join('\n');
      if (hookSpecificOutput) out.hookSpecificOutput = hookSpecificOutput;
      return out;
    }

    // All null / all plain-continue => null (createHook emits {continue:true}).
    return null;
  };
}

// Production wiring: the real sub-handlers imported above. session-init-gate exports
// `handler`; model-routing-advisor exports `_hookHandler` (aliased to `handler`).
const dispatchHandler = makeDispatchHandler({
  sessionGate: sessionInitGate.handler,
  modelAdvisor: modelRoutingAdvisor.handler || modelRoutingAdvisor._hookHandler,
});

// Single JSON output: createHook guarantees exactly one JSON object, and performs the
// deny/continue shorthand -> hookSpecificOutput transform on the verdict we return.
// Suppressed when this module is itself require()d for testing.
if (!process.env.CAGENTS_DISPATCH_TEST_IMPORT) {
  createHook('AgentDispatch', dispatchHandler);
}

module.exports = { makeDispatchHandler, dispatchHandler, isDeny, denyReasonOf, recordDeniedSpawn };

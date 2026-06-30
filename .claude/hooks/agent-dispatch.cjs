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
 *   - FAIL-CLOSED for the session-presence gate: if its handler THROWS, the dispatcher
 *     DENIES (naming the gate + fail-closed). This is done with an explicit try/catch
 *     INSIDE this dispatchHandler — NOT relying on createHook's own try/catch, which
 *     fails OPEN ({continue:true}).
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

const { createHook } = require('./hook-utils.cjs');

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
      // FAIL-CLOSED: a throw in the session-presence gate must DENY, not continue.
      console.error(`[AgentDispatch] session-init-gate FAILED CLOSED: ${err && err.message}`);
      return {
        deny: true,
        reason: `[FAIL-CLOSED] session-init-gate threw during evaluation ` +
                `(${err && err.message}). Denying the Agent spawn to avoid spawning ` +
                `into an unverified/absent session through a crashed presence gate.`
      };
    }
    // First deny wins + short-circuits: the advisory gate is NOT consulted.
    if (isDeny(gateVerdict)) {
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

module.exports = { makeDispatchHandler, dispatchHandler, isDeny };

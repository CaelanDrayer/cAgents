#!/usr/bin/env node
/**
 * Write|Edit Dispatch Hook (cAgents v12.19.0, WI-5 / D1b)
 *
 * A SINGLE dispatching PreToolUse[Write|Edit] hook that consolidates the 3 pure
 * Write|Edit sub-validators into one node cold-start, replacing the 3 separate
 * `node run-hook.cjs <name>` child processes that fired on every Write|Edit under
 * HEAD. AFTER consolidation: 1 cold-start per Write|Edit (down from 3) — see
 * scripts/benchmarks/hook-perf-microbench.cjs and
 * cagents-memory/_system/evals/perf/hook-perf-{before,after}.json.
 *
 * This touches a HARDENED SAFETY DENY surface. Correctness and fail-CLOSED behavior
 * outweigh perf. The control flow below is the load-bearing contract:
 *
 *   ORDER (deny-first, short-circuit on first deny):
 *     1. secret-detection                  — SECURITY DENY GATE  (FAIL-CLOSED)
 *     2. controller-delegation-validator    — GOVERNANCE DENY GATE (FAIL-CLOSED)
 *     3. skill-size-monitor                  — ADVISORY            (FAIL-OPEN)
 *
 *   - The FIRST deny wins and SHORT-CIRCUITS: later sub-handlers are NOT consulted,
 *     so a deny reason is always the highest-priority (security > governance > size)
 *     reason. (HARD REQ 1, 5d)
 *   - MOST-RESTRICTIVE: any sub-deny => the dispatcher denies. (HARD REQ 2)
 *   - FAIL-CLOSED for the two security/governance gates: if either gate's handler
 *     THROWS, the dispatcher DENIES (naming the gate + fail-closed). This is done
 *     with an explicit try/catch INSIDE this dispatchHandler — NOT relying on
 *     createHook's own try/catch, which fails OPEN ({continue:true}). (HARD REQ 3)
 *   - FAIL-OPEN for the advisory gate: a throw in skill-size-monitor is caught and
 *     treated as null (continue). (HARD REQ 3)
 *   - HETEROGENEOUS RETURNS: no deny but >=1 systemMessage => {continue, systemMessage};
 *     all null => null (createHook emits {continue:true}). (HARD REQ 4)
 *   - SINGLE-JSON-OUTPUT: this module USES createHook('WriteEditDispatch', ...) so
 *     exactly one JSON object is emitted; the dispatchHandler returns shorthand
 *     verdicts ({deny,reason} / {continue,systemMessage} / null) and createHook
 *     performs the shorthand->hookSpecificOutput transform. (HARD REQ 5)
 *
 * Sub-handler import: CAGENTS_DISPATCH_IMPORT is set BEFORE require()ing the 3
 * sub-modules so each module's own top-level createHook() registration is
 * SUPPRESSED — otherwise three extra createHook() run() loops would contend for
 * stdin with this dispatcher. We import only the pure `handler` from each.
 */

'use strict';

const { createHook } = require('./hook-utils.cjs');

// Suppress the standalone createHook() registration inside each sub-module while
// we require() them purely to import their `handler`. Set BEFORE the requires.
process.env.CAGENTS_DISPATCH_IMPORT = '1';
const secretDetection = require('./secret-detection.cjs');
const controllerDelegation = require('./controller-delegation-validator.cjs');
const skillSizeMonitor = require('./skill-size-monitor.cjs');
// Clear the flag after import so it does not leak into sub-handler logic or any
// later require() in the same process (defensive — handlers do not read it).
delete process.env.CAGENTS_DISPATCH_IMPORT;

/**
 * Build the dispatch handler with injectable sub-handlers (testability).
 *
 * @param {object} handlers
 * @param {function} handlers.secret   — secret-detection handler (SECURITY, fail-closed)
 * @param {function} handlers.delegation — controller-delegation handler (GOVERNANCE, fail-closed)
 * @param {function} handlers.skillSize — skill-size-monitor handler (ADVISORY, fail-open)
 * @returns {function(input): Promise<verdict>} dispatchHandler returning shorthand verdicts
 */
function makeDispatchHandler({ secret, delegation, skillSize }) {
  return async function dispatchHandler(input) {
    // ── Gate 1: secret-detection — SECURITY DENY GATE (runs FIRST, FAIL-CLOSED) ──
    let secretVerdict;
    try {
      secretVerdict = await secret(input);
    } catch (err) {
      // FAIL-CLOSED: a throw in the security gate must DENY, not continue.
      console.error(`[WriteEditDispatch] secret-detection FAILED CLOSED: ${err && err.message}`);
      return {
        deny: true,
        reason: `[FAIL-CLOSED] secret-detection security gate threw during evaluation ` +
                `(${err && err.message}). Denying the Write/Edit to avoid letting an ` +
                `unscanned payload through a crashed secret scanner.`
      };
    }
    // First deny wins + short-circuits: later gates NOT consulted.
    if (secretVerdict && secretVerdict.deny) {
      return secretVerdict;
    }

    // ── Gate 2: controller-delegation — GOVERNANCE DENY GATE (FAIL-CLOSED) ──
    let delegationVerdict;
    try {
      delegationVerdict = await delegation(input);
    } catch (err) {
      // FAIL-CLOSED: a throw in the governance gate must DENY, not continue.
      console.error(`[WriteEditDispatch] controller-delegation-validator FAILED CLOSED: ${err && err.message}`);
      return {
        deny: true,
        reason: `[FAIL-CLOSED] controller-delegation-validator governance gate threw ` +
                `during evaluation (${err && err.message}). Denying the Write/Edit to ` +
                `avoid letting a possibly-violating controller write through a crashed gate.`
      };
    }
    if (delegationVerdict && delegationVerdict.deny) {
      return delegationVerdict;
    }

    // ── Gate 3: skill-size-monitor — ADVISORY (runs LAST, FAIL-OPEN) ──
    let skillVerdict;
    try {
      skillVerdict = await skillSize(input);
    } catch (err) {
      // FAIL-OPEN: the advisory gate is not security-critical; a throw is treated
      // as null (continue). Logged so the failure is not silent.
      console.error(`[WriteEditDispatch] skill-size-monitor failed open (advisory): ${err && err.message}`);
      skillVerdict = null;
    }
    if (skillVerdict && skillVerdict.deny) {
      // skill-size-monitor CAN deny (>=900 lines). It is "advisory" only re: its
      // FAIL-OPEN throw policy; a real deny verdict is still honored (most-restrictive).
      return skillVerdict;
    }

    // ── No deny from any gate. Merge systemMessages (heterogeneous returns). ──
    // The only non-deny shapes that carry a message are skill-size-monitor warn and
    // controller-delegation warn. Collect any present, in gate order.
    const messages = [];
    for (const v of [secretVerdict, delegationVerdict, skillVerdict]) {
      if (v && v.continue && typeof v.systemMessage === 'string' && v.systemMessage) {
        messages.push(v.systemMessage);
      }
    }
    if (messages.length > 0) {
      return { continue: true, systemMessage: messages.join('\n\n') };
    }

    // All null / all plain-continue => null (createHook emits {continue:true}).
    return null;
  };
}

// Production wiring: the real sub-handlers imported above.
const dispatchHandler = makeDispatchHandler({
  secret: secretDetection.handler,
  delegation: controllerDelegation.handler,
  skillSize: skillSizeMonitor.handler,
});

// Single JSON output: createHook guarantees exactly one JSON object, and performs
// the deny/continue shorthand -> hookSpecificOutput transform on the verdict we
// return. Suppressed when this module is itself require()d for testing.
if (!process.env.CAGENTS_DISPATCH_TEST_IMPORT) {
  createHook('WriteEditDispatch', dispatchHandler);
}

module.exports = { makeDispatchHandler, dispatchHandler };

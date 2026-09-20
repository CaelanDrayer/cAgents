/**
 * write-edit-dispatch.cjs -- fixture excerpt, real corpus lines.
 *
 *   ORDER (deny-first, short-circuit on first deny):
 *     1. secret-detection: SECURITY DENY GATE  (FAIL-CLOSED)
 *     2. controller-delegation-validator: GOVERNANCE DENY GATE (FAIL-CLOSED)
 *     3. skill-size-monitor: ADVISORY            (FAIL-OPEN)
 *
 *   agents: <- mandatory top-level key, a LIST
 */
process.env.CAGENTS_DISPATCH_IMPORT = '1';
const secretDetection = require('./secret-detection.cjs');
const controllerDelegation = require('./controller-delegation-validator.cjs');
const skillSizeMonitor = require('./skill-size-monitor.cjs');

module.exports = { secretDetection, controllerDelegation, skillSizeMonitor };

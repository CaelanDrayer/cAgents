#!/usr/bin/env node
/**
 * Shared Hook Utilities - Common functions for cAgents hooks
 * cAgents V9.13 - Self-contained plugin via __dirname + ${CLAUDE_PLUGIN_ROOT}
 *
 * Provides:
 * - createHook(handler) - Factory that eliminates per-hook boilerplate
 * - readStdin() - Parse JSON from stdin
 * - findActiveSession(sessionHintOrOptions?) - Resolve the active session via the
 *   deterministic chain: sessionHint -> persisted SDK-UUID map -> CAGENTS_ACTIVE_SESSION
 *   -> promptHint -> null. The legacy newest-session heuristic is opt-in only
 *   ({fallbackHeuristic: true}); see the findActiveSession JSDoc below.
 * - extractYamlValue() - Extract a value from simple YAML content
 * - safeRead() - Read a file with graceful fallback
 * - countPattern() - Count regex matches in content
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Path Resolution:
 * - PLUGIN_ROOT: Where cAgents is installed. Uses __dirname resolution as primary
 *   (verified via CLAUDE.md existence), CLAUDE_PLUGIN_ROOT as fallback, cwd as last resort.
 * - PROJECT_ROOT: Where the user's project lives (where cagents-memory/ is created).
 *   Uses CLAUDE_PROJECT_DIR when running as a cross-project plugin, falls back to
 *   PLUGIN_ROOT for local dev (plugin IS the project).
 */

const fs = require('fs');
const path = require('path');

// Resolve plugin root: where cAgents is installed (for finding plugin resources).
// __dirname is .claude/hooks/ -- two levels up is the plugin root.
// Verify each candidate actually contains CLAUDE.md (proving it's the cAgents root).
const _dirnameRoot = path.resolve(__dirname, '../..');
const _envRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
const PLUGIN_ROOT = (fs.existsSync(path.join(_dirnameRoot, 'CLAUDE.md')) && _dirnameRoot)
  || (_envRoot && fs.existsSync(path.join(_envRoot, 'CLAUDE.md')) && _envRoot)
  || process.cwd();

// Resolve project root: the user's project directory (where cagents-memory/ lives).
// When loaded as a cross-project plugin, CLAUDE_PROJECT_DIR points to the user's project.
// When running locally (plugin IS the project), fall back to PLUGIN_ROOT.
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR
  || PLUGIN_ROOT;

const AGENT_MEMORY_DIR = path.join(PROJECT_ROOT, 'cagents-memory');

const SESSION_PREFIXES = ['act_', 'run_', 'optimize_', 'review_', 'designer_', 'team_', 'org_'];
// D2 carve-out (v12.66.0 /run -> /act rename): 'act_' is the go-forward prefix, but
// 'run_' MUST STAY as a legacy reader. Dropping it would make every pre-v12.66 session
// directory (at rename time: 21 live under cagents-memory/sessions/, 26 more archived)
// invisible to the Stop and verify hooks that resolve sessions through this array --
// (the consumers below readdir sessions/ and keep only prefix matches), including any
// run_* session still in flight during the cutover. 'run_' now plays exactly the role
// that 'optimize_', 'review_', and 'org_' already play here: a prefix whose command no
// longer exists but whose on-disk sessions must stay discoverable. Do NOT "tidy" it
// away.

// Canonical terminal pipeline/phase vocabulary (single source of truth, REC-01).
// TERMINAL_STATES holds ONLY canonical forms. Raw variants seen in the wild
// (older status.yaml writes, uppercase, FINALIZED, `completed` with a trailing
// 'd') resolve to a canonical form via TERMINAL_ALIASES + normalizeTerminalState().
// Readers MUST test membership through isTerminalState(), never
// `TERMINAL_STATES.includes(rawValue)` directly, so legacy on-disk values keep
// resolving. `TEAM_CREATED` is deliberately NOT terminal (a bare TEAM_CREATED is
// a stall, not a completion).
const TERMINAL_STATES = ['VALIDATED', 'complete', 'failed', 'aborted', 'incomplete'];

// Raw -> canonical aliases. Exact (case-sensitive) matches are tried first;
// normalizeTerminalState() additionally does a case-insensitive pass so arbitrary
// casing (e.g. `Completed`, `finalized`) also folds. `completed` is the
// historically-most-common status.yaml value and MUST keep resolving terminal.
const TERMINAL_ALIASES = {
  completed: 'complete',
  COMPLETE: 'complete',
  FINALIZED: 'complete',
};

/**
 * Fold a raw pipeline_state/phase value to its canonical terminal form.
 * Non-terminal / transient values (INIT, TEAM_CREATED, validating, …) and
 * non-strings are returned effectively unchanged (trimmed if a string), so
 * isTerminalState() reports them as non-terminal.
 */
function normalizeTerminalState(s) {
  if (typeof s !== 'string') return s;
  const trimmed = s.trim();
  if (!trimmed) return trimmed;
  // 1. Exact alias (fast path for the known raw variants).
  if (Object.prototype.hasOwnProperty.call(TERMINAL_ALIASES, trimmed)) {
    return TERMINAL_ALIASES[trimmed];
  }
  const lower = trimmed.toLowerCase();
  // 2. Case-insensitive match against a canonical terminal state.
  for (const canon of TERMINAL_STATES) {
    if (canon.toLowerCase() === lower) return canon;
  }
  // 3. Case-insensitive alias match (e.g. `Completed`, `finalized`).
  for (const raw in TERMINAL_ALIASES) {
    if (raw.toLowerCase() === lower) return TERMINAL_ALIASES[raw];
  }
  // 4. No mapping — transient / unknown. Return the trimmed original.
  return trimmed;
}

/**
 * True iff the (normalized) value is a canonical terminal state.
 * isTerminalState('completed') === true (alias), ('FINALIZED') === true,
 * ('TEAM_CREATED') === false, ('INIT') === false, (null) === false.
 */
function isTerminalState(s) {
  return TERMINAL_STATES.includes(normalizeTerminalState(s));
}

// SUCCESS terminal states (post-normalize): the subset of TERMINAL_STATES that
// represent a genuinely SUCCESSFUL completion. `VALIDATED` and `complete` (plus
// the aliases completed/COMPLETE/FINALIZED, which normalize to `complete`) are
// success terminals; `failed` / `aborted` / `incomplete` are terminal-but-NOT
// -success. Used by the REC-02/03/06 honesty discriminator so a stall relabelled
// `incomplete` (a terminal state) is never mistaken for a success.
const SUCCESS_TERMINAL_STATES = ['VALIDATED', 'complete'];

/**
 * True iff the (normalized) value is a SUCCESS terminal state
 * (VALIDATED / complete / completed / COMPLETE / FINALIZED). Returns false for
 * failed / aborted / incomplete and for every non-terminal / unknown / null value.
 */
function isSuccessTerminalState(s) {
  return SUCCESS_TERMINAL_STATES.includes(normalizeTerminalState(s));
}

// Grace period for accepting sessions without status.yaml (handles the race condition where
// the trigger agent hasn't written status.yaml yet). 5 minutes covers typical pipeline init time.
// Design intent: long enough to bridge session dir creation → first status write gap,
// short enough not to surface truly abandoned sessions as "active".
const SESSION_DISCOVERY_GRACE_PERIOD_MS = 5 * 60 * 1000;

// Character budgets for context injection (v10.6.0)
// These constants prevent hooks from injecting unbounded context into the model's window.
const MAX_SESSION_START_CHARS = 1500;  // Max chars for SessionStart additionalContext
const MAX_ATTENTION_CHARS = 500;       // Max chars for attention-injection systemMessage

// Fallback deadline for readStdin() when stdin never emits 'end'.
//
// INVARIANT: this MUST stay strictly below the SMALLEST `timeout` (in seconds)
// registered for any hook in `.claude/settings.json`, with enough margin for
// node cold start + the handler's own work. Pinned by
// `tests/hooks/stdin-fallback-below-hook-timeout.test.js`.
//
// BUG (fixed here): this was 3000 ms while `PreToolUse[Agent]` and
// `UserPromptSubmit` are both registered with `timeout: 3` (= 3000 ms). Equal
// deadlines are a guaranteed race, and the harness won it: over a 14-day
// transcript window, 68 `PreToolUse:Agent` and 13 `UserPromptSubmit` runs were
// cancelled at 3010-3063 ms, so those hooks produced NO verdict at all. The
// bimodal signature was unmistakable — 369 `PreToolUse:Write|Edit` runs under
// 500 ms and 36 at >=3 s, with nothing in between.
//
// Dropping to 2000 ms lets the slow path finish and emit its verdict inside
// every registered budget. It is not a semantic change: a timed-out stdin read
// resolves to `{}`, and every dispatcher returns `{"continue": true}` for an
// empty payload — the same effective outcome as being cancelled, but delivered
// cleanly and ~1 s sooner.
const STDIN_FALLBACK_MS = 2000;

/**
 * Read JSON from stdin with timeout.
 * Returns parsed object or {} on any failure.
 */
// A1: how the last readStdin() call ended. 'eof' | 'parsed' (complete JSON
// object seen before EOF) | 'eof-empty' | 'timeout-empty' | 'timeout-partial'
// | 'tty'. 'timeout-partial' also covers bytes that end at EOF and do not
// parse (a truncated payload) and a stdin 'error' after partial bytes;
// 'timeout-empty' also covers a stdin 'error' with no bytes (F1).
let lastStdinStatus = null;

function readStdin(hookName) {
  return new Promise((resolve) => {
    let data = '';
    let resolved = false;
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      lastStdinStatus = 'tty';
      resolve({});
      return;
    }

    function done(result, status) {
      if (resolved) return;
      resolved = true;
      lastStdinStatus = status;
      resolve(result);
    }

    // A1: CC writes ONE JSON object per hook run. Resolve as soon as the
    // buffered bytes parse as a complete object instead of waiting for EOF.
    // Only attempted when the last non-space char is '}' (cheap, no O(n^2)).
    process.stdin.on('data', (chunk) => {
      data += chunk;
      if (/\}\s*$/.test(data)) {
        try {
          const obj = JSON.parse(data);
          if (obj && typeof obj === 'object') done(obj, 'parsed');
        } catch { /* incomplete -- keep reading */ }
      }
    });
    process.stdin.on('end', () => {
      if (!data.trim()) { done({}, 'eof-empty'); return; }
      try { done(JSON.parse(data), 'eof'); }
      catch { done({}, 'timeout-partial'); }
    });
    // F1: a stdin 'error' mid-payload is a truncation, not a clean read. Map
    // it onto the same statuses as the fallback deadline so createHook denies
    // (partial bytes) or allows loudly (no bytes) instead of allowing silently.
    process.stdin.on('error', () => done({}, data.trim() ? 'timeout-partial' : 'timeout-empty'));

    const stdinFallbackTimer = setTimeout(() => {
      if (!resolved) console.error(hookName ? `[Hook] stdin reading timed out for hook: ${hookName}` : `[hook-utils] readStdin timeout after ${STDIN_FALLBACK_MS}ms`);
      done({}, data.trim() ? 'timeout-partial' : 'timeout-empty');
    }, STDIN_FALLBACK_MS);
    stdinFallbackTimer.unref();
  });
}

// A1: release the stdin handle after the verdict so the process exits as soon
// as pending work drains, even if the harness never closes stdin. Backstop
// timer is unref'd: it only fires if some other handle keeps the loop alive.
function releaseProcess() {
  try { process.stdin.removeAllListeners('data'); process.stdin.destroy(); } catch {}
  const t = setTimeout(() => process.exit(process.exitCode || 0), 1500);
  t.unref();
}

// A1: deny gates fail CLOSED when a payload started arriving but never became
// parseable (truncated); with NO bytes at all they fail OPEN but loud (W5:
// allow + exactly one systemMessage). Only the real guards are listed.
// SessionInitGate is advisory and fails open (HS-7); it runs inside
// AgentDispatch, which is listed here.
const NO_PAYLOAD_FAIL_CLOSED = new Set(['BashValidator', 'WriteEditDispatch', 'AgentDispatch']);

/**
 * Read a file safely, returning null on any error.
 */
function safeRead(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
  } catch {
    return null;
  }
}

/**
 * Extract a simple key: value from YAML content.
 */
function extractYamlValue(content, key) {
  if (!content) return null; // WI-8: callers pass safeRead() output, which is null when the file is absent
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * ENG-OBS-2 (second half, v12.70.0) — the SINGLE source of truth for "what phase
 * is this session in?", read from a status.yaml / session.yaml body.
 *
 * WHY THIS EXISTS: two resolvers used to answer this same question DIFFERENTLY,
 * and the disagreement silently routed a LIVE session's audit trail into a
 * STALE sibling's directory.
 *
 *   - `_tryResolveCandidate` (the deterministic SDK-UUID-map path) used key
 *     PRECEDENCE — pipeline_state > phase > current_phase — via
 *     `extractYamlValue`, which is `^`-anchored and so reads TOP-LEVEL keys only.
 *   - `findMostRecentSessionDir` (the newest-session heuristic) used
 *     `/(?:phase|pipeline_state):\s*(\S+)/`: POSITIONAL (first match wins,
 *     whichever key sits on the earlier LINE, regardless of which key it is) and
 *     UNANCHORED (an indented `  - phase: INIT` inside `state_history:` matches
 *     too, so a session could be judged by its own history instead of its state).
 *
 * OBSERVED CONSEQUENCE (session act_subagent-token-budget_260909_001): that
 * session's status.yaml opens `pipeline_state: incomplete`, so PRECEDENCE read
 * `incomplete` → terminal → the CORRECT session was refused. A five-week-stale
 * sibling's status.yaml happened to carry `phase: EXECUTING` on an EARLIER LINE
 * than its own `pipeline_state: incomplete`, so POSITION read `EXECUTING` →
 * non-terminal → the STALE session was accepted. Every SubagentStart write then
 * landed in the wrong session — and refreshed that session's mtime, so it won
 * the newest-session race again on the very next spawn. Self-reinforcing: 116
 * agents had accumulated in the wrong tree before it was caught, which is why
 * the live session's agent_tree.yaml looked like the tracker "wrote nothing"
 * when in fact it wrote plenty, just next door.
 *
 * Both resolvers now call THIS function, so they cannot drift again. Precedence
 * beats position on purpose: `pipeline_state` is the v12 pipeline's own state
 * field and is the more specific answer whenever both keys are present.
 *
 * @param {string|null} content - status.yaml (or session.yaml) body, or null.
 * @returns {string|null} resolved phase string, or null when no phase key exists.
 */
function statusPhase(content) {
  if (!content) return null;
  return extractYamlValue(content, 'pipeline_state')
    || extractYamlValue(content, 'phase')
    || extractYamlValue(content, 'current_phase');
}

/**
 * FU-9 (D1, v12.77.0) — the liveness reader every status consumer should use.
 * Returns statusPhase(content) (pipeline_state || phase || current_phase),
 * folded through normalizeTerminalState(), so /designer's `phase:` shape and
 * the pipeline's `pipeline_state:` shape read the same way.
 *
 * Handover tolerance: a /designer session that /act took over carries
 * `handover_to: <act session id>`. If the skill wrote `handover_to` but not
 * (yet) `phase: complete`, the session is still read as `complete`, so the
 * handed-over designer dir never lingers as a live/stale sibling. Either field
 * alone is enough to close it.
 *
 * @param {string|null} content - status.yaml / session.yaml body, or null.
 * @returns {string|null} normalized state, or null when no state key exists.
 */
function readSessionState(content) {
  if (!content) return null;
  const raw = statusPhase(content);
  if (raw && isTerminalState(raw)) return normalizeTerminalState(raw);
  // Review r1 #3: `handover_to: null` / `~` / empty is ABSENT, not a handover.
  const handover = extractYamlValue(content, 'handover_to');
  if (handover && !/^(null|~|""|'')$/i.test(String(handover).trim())) return 'complete';
  return raw ? normalizeTerminalState(raw) : null;
}

/**
 * Count regex pattern matches in content.
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * REC-02/03/06 (v12.47.0) — the honesty discriminator.
 *
 * True ONLY when a session is GENUINELY validated, as opposed to a stall that a
 * Stop/SessionEnd safety net laundered into `complete`/`PASS`/`completed`. This
 * is the single source of truth consumed by BOTH verify-completion.cjs (Stop) and
 * team-stop.cjs (SessionEnd), so the two hooks can never drift apart.
 *
 * ALL THREE conditions must hold:
 *   (1) the resolved pipeline_state/phase is a SUCCESS terminal
 *       (VALIDATED / complete / completed / FINALIZED) — never failed / aborted /
 *       incomplete / any non-terminal state; AND
 *   (2) a REAL validation_report.yaml exists with a PASS / PARTIAL_PASS
 *       classification that was NOT written by a hook safety net. The former stub
 *       writer (autoResolveWarnings, removed in HS-10) stamped
 *       `generated_by: verify-completion-hook-safety-net`. Such stubs can still be
 *       on disk in old sessions, so any report whose
 *       `generated_by` names a hook/safety-net stub is rejected. A MISSING report
 *       is rejected too (no verdict ⇒ not genuine); AND
 *   (3) for plan-bearing sessions (workflow/plan.yaml exists), a
 *       coordination_log.yaml with a `completed`/terminal status exists. Sessions
 *       with no plan.yaml skip this requirement.
 *
 * On ANY read/parse error this returns false — fail toward "not genuine", the
 * safe direction (a broken discriminator never launders a stall into a success).
 *
 * Provenance note: the hook-fabricated PASS stub is the ONLY code path that emits
 * a PASS report without a validator agent, and it always carries the safety-net
 * marker, so rejecting that marker reliably separates fabricated from genuine. A
 * genuine validator report carries a real `generated_by` (e.g. `cagents:validator`)
 * OR — for legacy/older reports — no marker at all; a marker-less non-stub PASS is
 * therefore accepted, preserving the pre-existing clean-session contract (a real
 * verdict that simply omits a provenance line).
 *
 * @param {string} sessionDir - absolute session directory path
 * @param {string|null} [statusContent] - status.yaml content, if already read
 * @returns {boolean}
 */
function sessionGenuinelyValidated(sessionDir, statusContent) {
  try {
    if (!sessionDir) return false;
    let status = statusContent;
    if (!status) status = safeRead(path.join(sessionDir, 'status.yaml'));
    if (!status) return false;

    // (1) SUCCESS terminal (VALIDATED / complete / …) — never a stall label.
    const state = readSessionState(status);
    if (!isSuccessTerminalState(state)) return false;

    // (2) A REAL, non-safety-net PASS/PARTIAL_PASS validation_report.
    const valRaw = safeRead(path.join(sessionDir, 'workflow', 'validation_report.yaml'));
    if (!valRaw) return false; // no validator verdict ⇒ not genuine
    const generatedBy = (extractYamlValue(valRaw, 'generated_by') || '').toLowerCase();
    if (generatedBy.includes('safety-net') || generatedBy.includes('verify-completion-hook')) {
      return false; // hook-fabricated stub ⇒ not genuine
    }
    const classification = extractYamlValue(valRaw, 'classification')
      || extractYamlValue(valRaw, 'overall_status')
      || extractYamlValue(valRaw, 'status');
    if (classification !== 'PASS' && classification !== 'PARTIAL_PASS') return false;

    // (3) Plan-bearing sessions require a SUCCESSFULLY-completed coordination_log.
    // The coordination_log must have reached success (`completed`, or a
    // success-terminal per the enum) — a `failed`/`aborted` coordination_log is
    // terminal but NOT a success and must not count toward "genuinely validated"
    // (honesty precision; `isSuccessTerminalState('completed') === true` via the
    // `completed → complete` alias, so it covers the canonical value).
    const hasPlan = fs.existsSync(path.join(sessionDir, 'workflow', 'plan.yaml'));
    if (hasPlan) {
      const coordRaw = safeRead(path.join(sessionDir, 'workflow', 'coordination_log.yaml'));
      if (!coordRaw) return false;
      const coordStatus = extractYamlValue(coordRaw, 'status');
      if (!coordStatus) return false;
      if (!isSuccessTerminalState(coordStatus)) return false;
    }

    return true;
  } catch {
    return false; // fail toward "not genuine"
  }
}

/**
 * Find the active cAgents session directory.
 *
 * v12.15.0 — Deterministic resolution chain (concurrency contract):
 *   1. `input.session_id` (passed as `sessionHint` — string or `options.sessionHint`)
 *   2. `process.env.CAGENTS_ACTIVE_SESSION`
 *   3. `options.promptHint` (string extracted from prompt text by callers like
 *      subagent-tracker.cjs Pass-3)
 *   4. `null`
 *
 * Each candidate is accepted only if:
 *   - The session directory exists, AND
 *   - Its status.yaml (or session.yaml fallback) is missing (race window) OR
 *     in a non-terminal phase.
 *
 * The legacy newest-first status pass + 5-minute grace pass + nested-org
 * subdir scan are gated behind `{fallbackHeuristic: true}` for the
 * single-session diagnostic case. This eliminates cross-session resolution
 * under two concurrent same-directory sessions (hazards H1, H2, H3, H6 per
 * session run_concurrent-session-hooks_260602_001 enriched_context.yaml).
 *
 * Cache: `_cachedActiveSessions` is a Map keyed by the stable composite key
 * `sessionHint|envSession|promptHint|fallback`. Distinct inputs do NOT share
 * cache entries (H6 fix).
 *
 * @param {string|object} [hintOrOptions] - Either a session-hint string (legacy
 *   shape, kept for back-compat with v12.14.0 callers) or an options object.
 * @param {string} [hintOrOptions.sessionHint] - Same as the string-shape arg.
 * @param {string} [hintOrOptions.promptHint] - Hint extracted from prompt
 *   text by subagent-tracker Pass-3. Consumed AFTER env var.
 * @param {boolean} [hintOrOptions.fallbackHeuristic] - When true, restores
 *   the pre-v12.15.0 status-newest-first + grace + nested-org behavior.
 *   ONLY for single-session diagnostic tooling.
 * @returns {string|null} Absolute path to session directory, or null.
 */
let _cachedActiveSessions = new Map();

function _makeCacheKey(sessionHint, envSession, promptHint, fallback, sdkUuid) {
  const base = `${sessionHint || ''}|${envSession || ''}|${promptHint || ''}|${fallback ? '1' : '0'}`;
  // The owner UUID changes what the heuristic may return, so it is part of the key.
  return sdkUuid ? `${base}|${sdkUuid}` : base;
}

/**
 * cAgents session ID format:
 *   `{command}_{slug}_{timestamp_suffix}` where command is one of
 *   act|team|designer|debug going forward (legacy run|review|optimize|org are
 *   still read — see the SESSION_PREFIXES D2 carve-out above), and the
 *   trailing segments carry a timestamp / counter. Canonical production form is
 *   `{command}_{slug}_{YYMMDD}_{NNN}` (e.g. `act_fix-auth_260317_001`); test
 *   fixtures often use a shorter base36 timestamp tail (e.g.
 *   `run_findactivesession-a_mpx7w1mu`). Both are valid cAgents shapes.
 *
 * Claude Code SDK transcript UUIDs (`8-4-4-4-12` lowercase hex, e.g.
 * `28d9d944-e2f5-4e03-b06b-d367625f1fdd`) arrive in hook payloads as
 * `input.session_id` but are NOT cAgents session directory names. When such
 * a hint is supplied to `findActiveSession`, chain step 1 must skip the
 * candidate-resolution attempt (it would always fail) and fall through to
 * step 2 (env-var) / step 3 (promptHint) / step 4 (null).
 *
 * Detection strategy: positively identify the SDK UUID shape and exclude it.
 * Everything else is treated as potentially-cAgents-shaped — even if the dir
 * does not exist on disk, the cross-write invariant is preserved by the
 * `_tryResolveCandidate` check that follows (the dir-exists + non-terminal
 * gate). The H1 fix is narrowly scoped: only UUID-shaped hints bypass step 1.
 *
 * Per H1 (session run_sessions-hung-single-dir_260602_001).
 */
const SDK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function _isSdkUuidShape(s) {
  return typeof s === 'string' && SDK_UUID_RE.test(s);
}

function _tryResolveCandidate(sessionsDir, candidate) {
  // Returns the session dir if candidate exists with non-terminal status, else null.
  const dir = path.join(sessionsDir, candidate);
  if (!fs.existsSync(dir)) return null;
  const statusFile = path.join(dir, 'status.yaml');
  const content = safeRead(statusFile) || safeRead(path.join(dir, 'session.yaml'));
  if (!content) {
    // Race window: dir exists but no status yet — trust the explicit hint.
    return dir;
  }
  const phase = readSessionState(content); // shared precedence — see statusPhase() JSDoc
  if (phase && isTerminalState(phase)) {
    return null; // Terminal — refuse to resolve.
  }
  return dir;
}

// ============================================================
// SDK-UUID -> cAgents-session persisted map (OBJ-1, WI-1)
// ============================================================
// Claude Code hook payloads carry an SDK transcript UUID in `input.session_id`,
// NOT a cAgents session directory name. To resolve a UUID deterministically to
// its owning cAgents session (instead of the fragile CAGENTS_ACTIVE_SESSION env
// var or a newest-active heuristic) we persist a reverse map:
//
//   (a) per-session marker  sessions/{id}/session.sdk_id  = the SDK UUID
//       (local ownership, self-cleaning — dies with the session dir).
//   (b) global reverse registry as a DIRECTORY OF POINTER FILES
//       _system/sdk_session_map/{sdk_uuid}  whose content is the owning
//       session_id (the session dir basename).
//
// Per-UUID atomic files give O(1) reverse lookup AND per-UUID lock isolation:
// distinct concurrent sessions never contend on a shared read-modify-write —
// the whole point of OBJ-1. A single shared YAML was rejected because concurrent
// upserts would serialize on one lock and risk the cross-session write hazard
// this map exists to eliminate. GC is a trivial per-file unlink.

function _sdkMapDir() {
  return path.join(AGENT_MEMORY_DIR, '_system', 'sdk_session_map');
}

function _sdkPointerPath(uuid) {
  return path.join(_sdkMapDir(), uuid);
}

/**
 * Opportunistic prune (WI-5 part 3): unlink any pointer whose target session no
 * longer exists or is terminal. Reuses `_tryResolveCandidate` (dir-exists +
 * non-terminal gate). Best-effort — every unlink is lock-protected and the whole
 * scan is caller-wrapped so it can NEVER throw out of upsert (fail-open).
 */
function _pruneSdkMap() {
  const dir = _sdkMapDir();
  if (!fs.existsSync(dir)) return;
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  let entries;
  try { entries = fs.readdirSync(dir); } catch { return; }
  for (const uuid of entries) {
    // Only real pointer files match the UUID shape (skips stray *.lock dirs).
    if (!_isSdkUuidShape(uuid)) continue;
    const pointerPath = _sdkPointerPath(uuid);
    const target = safeRead(pointerPath);
    if (!target) continue;
    const sessionId = target.trim();
    if (sessionId && _tryResolveCandidate(sessionsDir, sessionId)) continue; // still live (present + non-terminal)
    // ponytail (WI-2, session run_session-init-gate-flake_260723_001): ALSO keep a
    // present-but-terminal pointer. A concurrent session's upsert-time prune must not
    // reap a sibling that is momentarily terminal-but-PRESENT (revision-cycle /
    // mid-rewrite window) — that is the same destructive reap that causes the
    // session-init-gate false-DENY (WI-1). Prune ONLY genuinely-MISSING-dir pointers.
    if (sessionId && fs.existsSync(path.join(sessionsDir, sessionId))) continue; // present-but-terminal — preserve
    // Genuinely-dead (missing-dir) pointer — unlink under lock.
    try {
      withFileLock(pointerPath, () => {
        try { fs.unlinkSync(pointerPath); } catch { /* already gone */ }
      });
    } catch { /* best effort */ }
  }
}

/**
 * Persist a bidirectional SDK-UUID <-> session mapping through claimSession.
 * Writes the per-session marker only for an unclaimed session, and the global
 * pointer only when the UUID owns the session. A foreign-owned session is left
 * unchanged. Guarded by the SDK-UUID shape (a non-UUID sdkUuid is a no-op) and
 * idempotent (repeat upsert of the same pair never duplicates). Fail-open: a map-write
 * failure must NEVER throw to the caller (WI-3 hook writers stay non-blocking).
 *
 * @param {string} sdkUuid   - SDK transcript UUID (input.session_id).
 * @param {string} sessionDir - Absolute path to the owning cAgents session dir.
 */
function upsertSdkSessionMap(sdkUuid, sessionDir) {
  try {
    if (!_isSdkUuidShape(sdkUuid)) return; // guard: non-UUID → no-op
    if (!sessionDir) return;

    // Claim semantics. The marker is written only when the session is
    // unclaimed; an owned session only refreshes the map pointer. A marker
    // that names another UUID is never overwritten, and no pointer is written.
    claimSession(sessionDir, sdkUuid);

    // (WI-5 part 3) opportunistic prune — bound the registry to live + recent.
    try { _pruneSdkMap(); } catch { /* fail-open */ }
  } catch (err) {
    // Fail-open (WI-3): never throw a map-write failure back to the spawn path.
    console.error(`[upsertSdkSessionMap] non-fatal: ${err && err.message}`);
  }
}

/**
 * Resolve an SDK UUID to its owning cAgents session dir via the persisted map.
 * Returns the session dir for a live/non-terminal target, or null on a miss
 * (no pointer) OR a dead target. LAZY REAP (WI-5 part 1; narrowed WI-2,
 * run_session-init-gate-flake_260723_001): a terminal target still resolves to a
 * MISS (null) so a reused/dead UUID never mis-resolves — but the pointer is only
 * unlinked when the target session DIRECTORY is genuinely MISSING from disk. A
 * present-but-terminal target (transient revision-cycle / mid-rewrite window) keeps
 * its LIVE pointer so the deterministic map survives the transient terminal read.
 *
 * @param {string} sdkUuid - SDK transcript UUID.
 * @returns {string|null} Owning session dir, or null.
 */
function resolveSdkUuidToSession(sdkUuid) {
  if (!_isSdkUuidShape(sdkUuid)) return null; // guard
  const pointerPath = _sdkPointerPath(sdkUuid);
  const content = safeRead(pointerPath);
  if (!content) return null; // miss — no pointer
  const sessionId = content.trim();
  if (!sessionId) return null;
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  const dir = _tryResolveCandidate(sessionsDir, sessionId);
  if (dir) return dir; // live / non-terminal hit
  // Resolution GATE unchanged: a terminal target still returns a MISS (null) below,
  // so a reused/dead UUID can never mis-resolve to a stale session.
  //
  // ponytail (WI-2, session run_session-init-gate-flake_260723_001): LAZY REAP only
  // a pointer whose target session DIRECTORY is genuinely MISSING from disk — NOT one
  // that is merely present-but-terminal. A TRANSIENT terminal read (a revision-cycle
  // VALIDATED/failed window, or a mid-rewrite status.yaml) must NOT destroy the LIVE
  // pointer: doing so collapses the session off the deterministic v12.32.0 SDK-UUID
  // map onto the unreliable env-var + legacy-heuristic path and produces the
  // intermittent session-init-gate false-DENY (WI-1). Present-but-terminal => preserve
  // the pointer + return a miss; missing-dir => reap (GC / bounded-registry invariant).
  if (!fs.existsSync(path.join(sessionsDir, sessionId))) {
    try {
      withFileLock(pointerPath, () => {
        try { fs.unlinkSync(pointerPath); } catch { /* already gone */ }
      });
    } catch { /* fail-open */ }
  }
  return null;
}

/**
 * Remove the pointer for an SDK UUID (WI-5 part 2 — explicit unlink at session
 * finalization callers such as team-stop / verify-completion terminal finalize).
 * Guarded by the SDK-UUID shape, idempotent (missing pointer → no-op), and never
 * throws.
 *
 * @param {string} sdkUuid - SDK transcript UUID whose pointer to remove.
 */
function removeSdkPointer(sdkUuid) {
  try {
    if (!_isSdkUuidShape(sdkUuid)) return; // guard
    const pointerPath = _sdkPointerPath(sdkUuid);
    if (!fs.existsSync(pointerPath)) return; // idempotent no-op
    withFileLock(pointerPath, () => {
      try { fs.unlinkSync(pointerPath); } catch { /* already gone */ }
    });
  } catch { /* never throw */ }
}

// ============================================================
// Strict session ownership (act_concurrent-session-hooks_260927_001, WI-1)
// ============================================================
// Two transcripts can share one project dir. A hook that holds an SDK UUID
// must act only on a session that the UUID owns. The owner is the UUID in the
// session.sdk_id marker. The map pointer _system/sdk_session_map/{uuid} is a
// second record of the same fact. A session with no marker is unclaimed.

const SDK_MARKER_FILE = 'session.sdk_id';

/**
 * Read the owner UUID of a session from its session.sdk_id marker.
 * @param {string} sessionDir - Absolute session dir.
 * @returns {string|null} The owner UUID, or null when the session is unclaimed.
 */
function getSessionOwner(sessionDir) {
  try {
    if (!sessionDir) return null;
    const content = safeRead(path.join(sessionDir, SDK_MARKER_FILE));
    const owner = content ? content.trim() : '';
    return owner || null;
  } catch {
    return null;
  }
}

/**
 * True when the map pointer of the UUID names this session dir.
 * The pointer body is a session_id basename.
 */
function _mapPointsTo(uuid, sessionDir) {
  const content = safeRead(_sdkPointerPath(uuid));
  if (!content) return false;
  const sessionId = content.trim();
  return !!sessionId && sessionId === path.basename(sessionDir);
}

/**
 * Ownership check. The session is owned by the UUID when its marker names the
 * UUID, or when the map pointer of the UUID names the session. A marker that
 * names a different UUID always wins over a stale map pointer, so a foreign
 * session is never owned.
 * @param {string} sessionDir - Absolute session dir.
 * @param {string} uuid - SDK transcript UUID.
 * @returns {boolean}
 */
function isOwnedBy(sessionDir, uuid) {
  try {
    if (!uuid || !sessionDir) return false;
    const owner = getSessionOwner(sessionDir);
    if (owner) return owner === uuid;
    return _isSdkUuidShape(uuid) && _mapPointsTo(uuid, sessionDir);
  } catch {
    return false;
  }
}

/**
 * Filter used by the heuristic passes. With no UUID every session qualifies
 * (legacy behavior). With a UUID only an owned session qualifies.
 */
function _ownershipQualifies(sessionDir, uuid) {
  if (!uuid) return true;
  return isOwnedBy(sessionDir, uuid);
}

/** True when the session dir is usable: present, and non-terminal unless includeTerminal. */
function _sessionUsable(sessionsDir, sessionId, includeTerminal) {
  if (includeTerminal) return fs.existsSync(path.join(sessionsDir, sessionId));
  return !!_tryResolveCandidate(sessionsDir, sessionId);
}

/**
 * Resolve the session that a UUID owns. Same return convention as
 * findActiveSession: an absolute session dir path, or null.
 *
 * Order: the map pointer first, then a scan of sessions/* for a marker that
 * names the UUID. A scan hit re-seeds the map pointer (fail-open). The newest
 * owned session by mtime wins the scan. This never returns an unclaimed or a
 * foreign-owned session.
 *
 * @param {string} uuid - SDK transcript UUID.
 * @param {{includeTerminal?: boolean}} [options] - includeTerminal also accepts terminal sessions.
 * @returns {string|null} Absolute owned session dir, or null.
 */
function resolveOwnedSession(uuid, { includeTerminal = false } = {}) {
  try {
    if (!uuid || !_isSdkUuidShape(uuid)) return null;
    const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
    if (!fs.existsSync(sessionsDir)) return null;

    // Step 1: map pointer. The marker must not name a different UUID.
    const content = safeRead(_sdkPointerPath(uuid));
    const mappedId = content ? content.trim() : '';
    if (mappedId && mappedId === path.basename(mappedId)) {
      const dir = path.join(sessionsDir, mappedId);
      const owner = getSessionOwner(dir);
      if ((!owner || owner === uuid) && _sessionUsable(sessionsDir, mappedId, includeTerminal)) {
        return dir;
      }
    }

    // Step 2: marker scan.
    let entries;
    try { entries = fs.readdirSync(sessionsDir); } catch { return null; }
    let best = null;
    let bestMtime = -1;
    for (const entry of entries) {
      if (!SESSION_PREFIXES.some(p => entry.startsWith(p))) continue;
      const dir = path.join(sessionsDir, entry);
      if (getSessionOwner(dir) !== uuid) continue;
      if (!_sessionUsable(sessionsDir, entry, includeTerminal)) continue;
      let mtime = 0;
      try { mtime = fs.statSync(dir).mtimeMs; } catch { continue; }
      if (mtime > bestMtime) {
        bestMtime = mtime;
        best = dir;
      }
    }
    if (!best) return null;

    // Re-seed the map pointer. A failure here must not hide the hit.
    try {
      try { fs.mkdirSync(_sdkMapDir(), { recursive: true }); } catch { /* race-safe */ }
      const pointerPath = _sdkPointerPath(uuid);
      withFileLock(pointerPath, () => {
        fs.writeFileSync(pointerPath, path.basename(best));
      });
    } catch { /* fail-open */ }
    return best;
  } catch {
    return null;
  }
}

/**
 * Atomic claim of a session by a UUID.
 *
 * The marker is created with an exclusive link of a fully written temp file,
 * so a reader never sees a half-written marker. If the file system refuses
 * links, an exclusive 'wx' create is the fallback. The first claimant wins.
 *
 * @param {string} sessionDir - Absolute session dir.
 * @param {string} uuid - SDK transcript UUID.
 * @returns {boolean} true when the UUID owns the session after the call.
 *   false when another UUID owns it, when the input is bad, or on an I/O error.
 *   A false result writes nothing. This function never throws.
 */
function claimSession(sessionDir, uuid) {
  try {
    if (!_isSdkUuidShape(uuid) || !sessionDir) return false;
    if (!fs.existsSync(sessionDir)) return false;
    const markerPath = path.join(sessionDir, SDK_MARKER_FILE);

    let created = false;
    const tmpPath = `${markerPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    try {
      fs.writeFileSync(tmpPath, uuid, { flag: 'wx' });
      try {
        fs.linkSync(tmpPath, markerPath);
        created = true;
      } catch (err) {
        if (!err || err.code !== 'EEXIST') {
          // No link support: fall back to an exclusive create.
          try {
            fs.writeFileSync(markerPath, uuid, { flag: 'wx' });
            created = true;
          } catch (err2) {
            if (!err2 || err2.code !== 'EEXIST') return false;
          }
        }
      }
    } finally {
      try { fs.unlinkSync(tmpPath); } catch { /* already gone */ }
    }

    if (!created) {
      // The marker exists. Only the same UUID may continue.
      if (getSessionOwner(sessionDir) !== uuid) return false;
    }

    // Write or refresh the map pointer.
    try { fs.mkdirSync(_sdkMapDir(), { recursive: true }); } catch { /* race-safe */ }
    const pointerPath = _sdkPointerPath(uuid);
    withFileLock(pointerPath, () => {
      fs.writeFileSync(pointerPath, path.basename(sessionDir));
    });
    return true;
  } catch {
    return false;
  }
}

function findActiveSession(hintOrOptions) {
  // Normalize args: accept legacy string OR options object.
  let sessionHint;
  let promptHint;
  let fallbackHeuristic = false;
  let optionUuid;
  if (typeof hintOrOptions === 'string') {
    sessionHint = hintOrOptions;
  } else if (hintOrOptions && typeof hintOrOptions === 'object') {
    sessionHint = hintOrOptions.sessionHint;
    promptHint = hintOrOptions.promptHint;
    fallbackHeuristic = !!hintOrOptions.fallbackHeuristic;
    optionUuid = hintOrOptions.sdkUuid;
  }
  // The owner UUID for the heuristic passes. A UUID-shaped sessionHint is the
  // owner; options.sdkUuid is the explicit form.
  const ownerUuid = _isSdkUuidShape(sessionHint) ? sessionHint
    : (_isSdkUuidShape(optionUuid) ? optionUuid : undefined);
  const envSession = process.env.CAGENTS_ACTIVE_SESSION || undefined;
  const cacheKey = _makeCacheKey(sessionHint, envSession, promptHint, fallbackHeuristic,
    ownerUuid !== sessionHint ? ownerUuid : undefined);
  if (_cachedActiveSessions.has(cacheKey)) return _cachedActiveSessions.get(cacheKey);

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    // RF-5 (FS-1): this was the ONLY silent null-return in findActiveSession —
    // every other one logs a reason. It is also the single most likely
    // condition in production (`cagents-memory/` is git-ignored, so a fresh
    // clone or a first-time plugin install has no sessions dir at all), which
    // made the most common failure the least diagnosable one.
    console.error(
      `[findActiveSession] sessions dir does not exist: ${sessionsDir} — returning null. ` +
      'This project has never run a cAgents skill (cagents-memory/ is git-ignored, ' +
      'so it never arrives with a clone). Callers MUST NOT read this as "orphan spawn".'
    );
    _cachedActiveSessions.set(cacheKey, null);
    return null;
  }

  // Deterministic chain step 1: explicit sessionHint (from input.session_id).
  //
  // H1 fix (v12.16.0): Claude Code's `input.session_id` carries SDK transcript
  // UUIDs (8-4-4-4-12 hex), NOT cAgents session directory names. When the
  // hint matches the SDK UUID shape, skip the candidate-resolution attempt
  // (it would always fail) and fall through to step 2 (env-var). This is a
  // narrow escape hatch — the cross-write invariant is preserved because:
  //   (a) UUID hints alone never resolve to a session (only env-var/promptHint can),
  //   (b) cAgents-shaped-but-unresolvable hints still terminate at null below.
  if (sessionHint) {
    if (_isSdkUuidShape(sessionHint)) {
      // WI-2 (OBJ-1): SDK UUID — consult the persisted SDK-UUID -> session map
      // FIRST. A live hit is a DETERMINISTIC resolution (no heuristic); cache it
      // under the existing composite cacheKey.
      let mapped = resolveSdkUuidToSession(sessionHint);
      // A pointer whose target marker names another UUID is stale. Treat it as a miss.
      if (mapped && !isOwnedBy(mapped, sessionHint)) mapped = null;
      if (mapped) {
        _cachedActiveSessions.set(cacheKey, mapped);
        return mapped;
      }
      // Map MISS: SDK UUID is not a cAgents directory name and the map holds no
      // live pointer. Skip step 1. Do NOT cache null here — let env-var /
      // promptHint determine the outcome (preserves the v12.16.0 UUID-fallthrough
      // invariant so a sibling session is never resolved).
      console.error(`[findActiveSession] sessionHint="${sessionHint}" is an SDK UUID with no live map pointer; falling through to env-var/promptHint chain.`);
    } else {
      const dir = _tryResolveCandidate(sessionsDir, sessionHint);
      if (dir) {
        _cachedActiveSessions.set(cacheKey, dir);
        return dir;
      }
      // cAgents-shaped hint provided but unresolvable. Refuse to fall through
      // to other instances' sessions — that is the H1/H3 cross-session leak we
      // are closing.
      if (!fallbackHeuristic) {
        console.error(`[findActiveSession] sessionHint="${sessionHint}" provided but not resolvable; returning null (no heuristic fallback). Set fallbackHeuristic:true to override.`);
        _cachedActiveSessions.set(cacheKey, null);
        return null;
      }
    }
  }

  // Step 2: env-var.
  // With a known UUID, skip an env session owned by another UUID.
  // Unclaimed or owned sessions keep the legacy behavior.
  const envForeign = !!(envSession && ownerUuid && (() => {
    const owner = getSessionOwner(path.join(sessionsDir, envSession));
    return !!owner && owner !== ownerUuid;
  })());
  if (envForeign) {
    console.error(`[findActiveSession] CAGENTS_ACTIVE_SESSION="${envSession}" is owned by another UUID; skipping it.`);
  }
  if (envSession && !envForeign) {
    const dir = _tryResolveCandidate(sessionsDir, envSession);
    if (dir) {
      _cachedActiveSessions.set(cacheKey, dir);
      return dir;
    }
    if (!fallbackHeuristic) {
      console.error(`[findActiveSession] CAGENTS_ACTIVE_SESSION="${envSession}" unresolvable (missing or terminal); returning null.`);
      _cachedActiveSessions.set(cacheKey, null);
      return null;
    }
  }

  // Step 3: promptHint (for subagent-tracker Pass-3 substitute).
  if (promptHint) {
    let dir = _tryResolveCandidate(sessionsDir, promptHint);
    // A session owned by another UUID is foreign. Reject it.
    // An unclaimed session stays acceptable: the prompt names it.
    if (dir && ownerUuid) {
      const owner = getSessionOwner(dir);
      if (owner && owner !== ownerUuid) {
        console.error(`[findActiveSession] promptHint="${promptHint}" names a session owned by another UUID; rejecting.`);
        dir = null;
      }
    }
    if (dir) {
      _cachedActiveSessions.set(cacheKey, dir);
      return dir;
    }
    if (!fallbackHeuristic) {
      _cachedActiveSessions.set(cacheKey, null);
      return null;
    }
  }

  // Step 4 (default): null — refuse to silently resolve to "newest active" session.
  if (!fallbackHeuristic) {
    _cachedActiveSessions.set(cacheKey, null);
    return null;
  }

  // -------- LEGACY HEURISTIC PASSES (opt-in only) --------
  // RF-4: readdirSync AFTER an existsSync check is still a live I/O call — an
  // unmounted network home, a container bind-mount, a chmod-000 dir, SELinux, or
  // a half-populated worktree all throw here. An uncaught throw propagated into
  // agent-dispatch's fail-CLOSED catch and DENIED every Agent spawn for as long
  // as the condition lasted. Catch it, log it LOUDLY (the callers surface the
  // errno to the model), and return null so the caller's own classification
  // fails OPEN instead.
  let sessionEntries;
  try {
    sessionEntries = fs.readdirSync(sessionsDir);
  } catch (err) {
    console.error(
      `[findActiveSession] FAILING OPEN: could not read ${sessionsDir} ` +
      `(${(err && err.code) || 'EUNKNOWN'}: ${err && err.message}). ` +
      'This is "I could not look", NOT "there is nothing there" — returning null ' +
      'rather than throwing, so no caller mistakes an I/O fault for an absent session.'
    );
    _cachedActiveSessions.set(cacheKey, null);
    return null;
  }
  const sessions = sessionEntries
    .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)))
    .sort((a, b) => {
      // GAP-3 fix: team_* sessions sort BEFORE org_* flat sessions.
      // When a legacy org_* session spawns /team concurrently, the flat team_* session must be
      // discovered by the status pass before the org_* session is considered.
      // This prevents the nested org scan from overriding an active team session.
      const aIsTeam = a.startsWith('team_');
      const bIsTeam = b.startsWith('team_');
      if (aIsTeam && !bIsTeam) return -1;
      if (!aIsTeam && bIsTeam) return 1;
      // Within same prefix group: sort newest-first by last 2 underscore-separated segments
      // Works for both old format (run_20260317_040624 -> 20260317_040624)
      // and new format (run_fix-auth_260317_001 -> 260317_001)
      const partsA = a.split('_');
      const tsA = partsA.slice(-2).join('_');
      const partsB = b.split('_');
      const tsB = partsB.slice(-2).join('_');
      return tsB.localeCompare(tsA);
    });

  // First pass: look for sessions with status.yaml (or session.yaml fallback) in a non-terminal phase
  // Review r1 #7: a non-terminal sibling idle > 24 h (no last_updated_at /
  // state_history / started_at newer than that) is held back as a fallback, so
  // a brand-new session still in its no-status.yaml grace window wins over it.
  const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
  let staleFallback = null;
  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    let content = safeRead(statusFile);
    // Fallback: legacy designer sessions use session.yaml instead of status.yaml
    if (!content) {
      content = safeRead(path.join(sessionsDir, session, 'session.yaml'));
    }
    if (!content) continue;

    const phase = readSessionState(content); // HS-1: one phase reader (pipeline_state first), as the JSDoc promises
    if (phase && !isTerminalState(phase)) {
      // Strict ownership: with a UUID, only an owned session qualifies.
      if (!_ownershipQualifies(path.join(sessionsDir, session), ownerUuid)) continue;
      const result = path.join(sessionsDir, session);
      const actMs = _statusActivityMs(content);
      if (actMs && actMs < staleCutoff) { if (!staleFallback) staleFallback = result; continue; }
      _cachedActiveSessions.set(cacheKey, result);
      return result;
    }
  }

  // Second pass: look for recently-created sessions without status.yaml
  // (handles the race condition where trigger agent hasn't written status.yaml yet,
  //  AND legacy org_* sessions that wrote strategic_brief.yaml before instruction.yaml/status.yaml)
  const graceCutoff = Date.now() - SESSION_DISCOVERY_GRACE_PERIOD_MS;
  for (const session of sessions) {
    const sessionPath = path.join(sessionsDir, session);
    const statusFile = path.join(sessionPath, 'status.yaml');
    if (safeRead(statusFile)) continue; // Already checked in first pass
    // Strict ownership: with a UUID, only an owned session qualifies.
    if (!_ownershipQualifies(sessionPath, ownerUuid)) continue;

    try {
      // Check for any recognizable session file: instruction.yaml, strategic_brief.yaml,
      // or workflow/agent_tree.yaml — any of these indicate a valid active session
      const hasInstruction = fs.existsSync(path.join(sessionPath, 'instruction.yaml'));
      const hasBrief = fs.existsSync(path.join(sessionPath, 'strategic_brief.yaml'));
      const hasAgentTree = fs.existsSync(path.join(sessionPath, 'workflow', 'agent_tree.yaml'));

      if (hasInstruction || hasBrief || hasAgentTree) {
        const stat = fs.statSync(sessionPath);
        if (stat.mtimeMs > graceCutoff) {
          console.error(`[findActiveSession] Found recent session without status.yaml: ${session} (has: ${hasInstruction ? 'instruction' : hasBrief ? 'brief' : 'agent_tree'})`);
          _cachedActiveSessions.set(cacheKey, sessionPath);
          return sessionPath;
        }
      }
    } catch { /* skip */ }
  }

  if (staleFallback) {
    _cachedActiveSessions.set(cacheKey, staleFallback);
    return staleFallback;
  }

  // (A2-05, v12.x) The legacy "third pass: scan org_* session subdirectories for
  // nested team/domain sessions" was removed. `/org` was removed in v12.2.0 (folded
  // into `/team` strategic mode), so no new session is ever created with an `org_`
  // prefix and the nested-subdir scan only ever matched archived dirs — dead code
  // for all live sessions. The status-pass and grace-pass above remain the active
  // fallbackHeuristic behavior.

  _cachedActiveSessions.set(cacheKey, null);
  return null;
}

/**
 * Review r1 #7: newest activity timestamp (ms) parsed from a status.yaml body —
 * last_updated_at, heartbeat fields, state_history entered_at / transitioned_at,
 * started_at. 0 when none parse (caller then treats the session as not stale).
 */
function _statusActivityMs(content) {
  let max = 0;
  const re = /^\s*-?\s*(last_updated_at|updated_at|heartbeat_at|last_heartbeat|entered_at|transitioned_at|started_at|created_at):\s*["']?([^"'\n]+?)["']?\s*$/gm;
  let m;
  while ((m = re.exec(content || '')) !== null) {
    const t = Date.parse(m[2]);
    if (!Number.isNaN(t) && t > max) max = t;
  }
  return max;
}

/**
 * Clear the findActiveSession cache. Exposed for tests; production code rarely
 * needs this since cache entries are keyed by full resolution input.
 */
function _resetActiveSessionCache() {
  _cachedActiveSessions = new Map();
}

/**
 * Resolve the team session for a hook via a deterministic chain that mirrors
 * findActiveSession (H1/WI-2 concurrency contract):
 *   1. input.session_id pin:
 *        - team_* id  → that dir (terminal-tolerant) or null if absent.
 *        - non-team concrete id (run_/designer_/test) → null (this hook is in a
 *          NON-team session; do not heuristic-resolve a sibling team session).
 *        - SDK UUID   → falls through (not a cAgents dir name).
 *   2. CAGENTS_ACTIVE_SESSION env var (team_* only).
 *   3. Newest-team heuristic — LAST RESORT, only when session_id is absent/UUID
 *      and no env pin (the production "Claude Code gave us a UUID" case).
 * A provided (non-UUID) hint never falls through to the heuristic — it returns
 * its own team dir or null. This closes the cross-session bug where two
 * concurrent team_* sessions, or an unpinned non-team caller, caused a hook to
 * resolve and mutate the WRONG session's task_list.yaml.
 * @param {object} input - Hook input (may contain session_id)
 * @returns {string|null} Session directory path or null
 */
function findTeamSession(input = {}) {
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');

  // Deterministic resolution chain — mirrors findActiveSession's H1/WI-2 contract
  // so that, under two concurrent same-directory team_* sessions, each hook binds
  // to ITS OWN session instead of the newest-team heuristic resolving the WRONG
  // session's task_list.yaml. Steps 1-2 are pinned/deterministic; step 3 (the
  // legacy newest-team heuristic) survives ONLY as a last resort for genuinely
  // unpinned calls (back-compat).

  // Step 1: explicit session_id pin. SDK transcript UUIDs (8-4-4-4-12 lowercase
  // hex) arrive in hook payloads as input.session_id but are NOT cAgents session
  // directory names — when the hint matches the SDK UUID shape, skip this step
  // (it would always fail) and fall through to env-var / heuristic, exactly like
  // findActiveSession chain-step-1.
  const hint = input.session_id;
  if (hint && !_isSdkUuidShape(hint)) {
    // Concrete (non-UUID) session_id pin.
    if (hint.startsWith('team_')) {
      const dir = path.join(sessionsDir, hint);
      // Terminal-tolerant existsSync (not the non-terminal _tryResolveCandidate
      // gate): team-stop.cjs resolves its team session here at SessionEnd, when
      // the session may already be terminal, and still needs to finalize metrics.
      if (fs.existsSync(dir)) return dir;
      // A cAgents-shaped team_ hint was provided but its dir is absent: refuse to
      // resolve to a SIBLING team session (the cross-session leak this fix closes).
      // Return null instead of falling through to the newest-team heuristic.
      return null;
    }
    // Non-team concrete session_id (run_/designer_/synthetic test id): the hook is
    // firing for a NON-team session, so there is no team session to resolve. Return
    // null rather than heuristic-resolving — and writing into — a SIBLING team
    // session. This was the cross-session leak's source: an unpinned non-team
    // caller (e.g. a Stop/TaskCompleted hook for an /act or test session) was
    // resolving the newest non-terminal team_ session and mutating its task_list.
    // Production team hooks fire with an SDK UUID, which is excluded above and
    // falls through to the map / env-var / heuristic. Mirrors findActiveSession's
    // contract: a provided, non-UUID, unresolvable hint returns null (no
    // heuristic fallthrough).
    return null;
  }

  // Step 1b (WI-2 / OBJ-1): SDK-UUID map step. A production team hook fires with
  // an SDK transcript UUID in input.session_id (excluded from the concrete-id
  // block above). Consult the persisted map FIRST — a resolution to a team_
  // session is the deterministic bind. A non-team resolution means this hook is
  // NOT in a team session (mirror the non-team concrete-id contract → null). A
  // miss falls through to env-var / heuristic exactly as today.
  if (hint && _isSdkUuidShape(hint)) {
    let mapped = resolveSdkUuidToSession(hint);
    // A pointer whose target marker names another UUID is stale. Treat it as a miss.
    if (mapped && !isOwnedBy(mapped, hint)) mapped = null;
    if (mapped) {
      if (path.basename(mapped).startsWith('team_')) return mapped;
      return null; // resolved to a non-team session → not a team hook
    }
    // miss → fall through to env-var / heuristic.
  }

  // Step 2: CAGENTS_ACTIVE_SESSION env var (team_ sessions only). Same rules.
  // With a UUID hint, skip an env team session owned by another UUID.
  const envSession = process.env.CAGENTS_ACTIVE_SESSION;
  const envOwner = envSession && _isSdkUuidShape(hint)
    ? getSessionOwner(path.join(sessionsDir, envSession)) : null;
  const envForeign = !!envOwner && envOwner !== hint;
  if (envSession && !envForeign && !_isSdkUuidShape(envSession) && envSession.startsWith('team_')) {
    const dir = path.join(sessionsDir, envSession);
    if (fs.existsSync(dir)) return dir;
    return null;
  }

  // Step 3 (last resort, back-compat for genuinely unpinned calls): newest-team
  // heuristic. Reached only when neither a team_ session_id nor a team_
  // CAGENTS_ACTIVE_SESSION env var is present (e.g. an SDK-UUID-only payload with
  // no env pin). This is the historic behavior and is intentionally preserved.
  if (!fs.existsSync(sessionsDir)) return null;

  const teamSessions = fs.readdirSync(sessionsDir)
    .filter(d => d.startsWith('team_'))
    .sort((a, b) => {
      // Extract last 2 underscore-separated segments as sort key
      // Works for both old format (team_20260317_040624 -> 20260317_040624)
      // and new format (team_fix-auth_260317_001 -> 260317_001)
      const partsA = a.split('_');
      const tsA = partsA.slice(-2).join('_');
      const partsB = b.split('_');
      const tsB = partsB.slice(-2).join('_');
      return tsB.localeCompare(tsA);
    });

  // Strict ownership: with a UUID hint, only a team session it owns qualifies.
  // HS-1: one phase reader (statusPhase: pipeline_state first). Without an
  // owner UUID, the newest-name guess is taken ONLY when exactly one live team
  // session exists; with two or more it would bind to another instance's
  // session, so the answer is null.
  const ownerUuid = _isSdkUuidShape(hint) ? hint : undefined;
  const live = [];
  for (const session of teamSessions) {
    if (!_ownershipQualifies(path.join(sessionsDir, session), ownerUuid)) continue;
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = readSessionState(content);
    if (phase && !isTerminalState(phase)) {
      if (ownerUuid) return path.join(sessionsDir, session); // owned: newest owned wins
      live.push(session);
      if (live.length > 1) break;
    }
  }
  if (live.length === 1) return path.join(sessionsDir, live[0]);
  if (live.length > 1) {
    console.error(`[findTeamSession] ${live.length}+ live unowned team sessions and no pin; returning null (no newest-session guess).`);
  }

  // (A2-05, v12.x) The legacy "H-11: scan org_* session subdirectories for nested
  // team sessions" pass was removed. `/org` was removed in v12.2.0, so no live
  // session is ever created with an `org_` prefix; the nested-subdir scan only
  // matched archived dirs. The top-level team_* status scan above is the active path.

  return null;
}

/**
 * Find the most recently modified active session directory as a fallback
 * when findActiveSession() returns null. This handles the race condition
 * where a session dir exists but status.yaml hasn't been written yet.
 *
 * Includes nested org subdir scanning (e.g., org_xxx/engineering/ when
 * /team ran inside a legacy org_* session). Used by both subagent-tracker.cjs and
 * subagent-stop-tracker.cjs for consistent session discovery on fallback.
 *
 * GAP-4 fix: exported from hook-utils.cjs so start and stop trackers share
 * the same implementation, guaranteeing events land in the same agent_tree.yaml.
 */
function findMostRecentSessionDir(options) {
  const includeTerminal = options && options.includeTerminal;
  // Strict ownership: with a UUID, only an owned session qualifies.
  const ownerUuid = options && _isSdkUuidShape(options.sdkUuid) ? options.sdkUuid : undefined;
  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) return null;

  let bestDir = null;
  let bestMtime = 0;
  let entries = [];

  try {
    entries = fs.readdirSync(sessionsDir)
      .filter(d => SESSION_PREFIXES.some(p => d.startsWith(p)));

    for (const entry of entries) {
      const fullPath = path.join(sessionsDir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && stat.mtimeMs > bestMtime) {
          if (!_ownershipQualifies(fullPath, ownerUuid)) continue;
          // Skip sessions that are clearly completed/aborted
          const statusFile = path.join(fullPath, 'status.yaml');
          const statusContent = safeRead(statusFile);
          if (statusContent && !includeTerminal) {
            // ENG-OBS-2: was a POSITIONAL+UNANCHORED regex that disagreed with
            // _tryResolveCandidate and let a stale session pass as non-terminal.
            const phase = readSessionState(statusContent);
            if (phase && isTerminalState(phase)) {
              continue; // Skip finished sessions
            }
          }
          // No status.yaml or non-terminal phase (or includeTerminal): eligible
          bestMtime = stat.mtimeMs;
          bestDir = fullPath;
        }
      } catch { /* skip unreadable entries */ }
    }
  } catch { /* sessions dir unreadable */ }

  // Also scan org session subdirectories for nested team/domain sessions.
  // (e.g., org_xxx/engineering/ when /team ran inside a legacy org_* session)
  // Only scan org subdirs if no flat session was found (bestDir is null),
  // to prevent an org_*/subdir/ from overriding a flat active team session.
  if (!bestDir) {
    const orgDirs = entries.filter(d => d.startsWith('org_'));
    for (const orgDir of orgDirs) {
      const orgPath = path.join(sessionsDir, orgDir);
      try {
        const subdirs = fs.readdirSync(orgPath).filter(d => {
          try { return fs.statSync(path.join(orgPath, d)).isDirectory(); } catch { return false; }
        });
        for (const subdir of subdirs) {
          const nestedPath = path.join(orgPath, subdir);
          try {
            const stat = fs.statSync(nestedPath);
            if (stat.mtimeMs > bestMtime) {
              if (!_ownershipQualifies(nestedPath, ownerUuid)) continue;
              if (!includeTerminal) {
                const statusContent = safeRead(path.join(nestedPath, 'status.yaml'));
                if (statusContent) {
                  // ENG-OBS-2: same shared precedence as the flat scan above.
                  const phase = readSessionState(statusContent);
                  if (phase && isTerminalState(phase)) continue;
                }
              }
              bestMtime = stat.mtimeMs;
              bestDir = nestedPath;
            }
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }
  }

  return bestDir;
}

/**
 * ENG-OBS-2 (second half, v12.70.0) — OWNERSHIP resolution, deliberately
 * separated from LIVENESS judgement.
 *
 * `resolveSdkUuidToSession` answers TWO questions with ONE gate:
 *   (a) "which cAgents session does this SDK transcript UUID belong to?"
 *       — an ownership FACT, recorded in the pointer map at session start;
 *   (b) "is that session still worth resolving to?"
 *       — a liveness JUDGEMENT, derived from a mutable status.yaml label.
 *
 * Answering (a) with (b) is what broke the audit trail. When a LIVE session's
 * status.yaml carries a pessimistic terminal label — `pipeline_state: incomplete`,
 * which the engine writes onto sessions that are still progressing (observed on
 * act_subagent-token-budget_260909_001, and the same transient-terminal window
 * the WI-2 "ponytail" note describes) — ownership resolution returns a MISS even
 * though the pointer is present and CORRECT. The caller then falls through to the
 * newest-session heuristic and records the spawn in a DIFFERENT session's
 * agent_tree.yaml: a five-week-stale sibling, in the observed case.
 *
 * That trade is backwards for an audit WRITE. A pessimistic label on the right
 * directory is harmless — the record still lands where it belongs. Writing into a
 * session you do not own is actively destructive: it corrupts a stranger's
 * delegation evidence, refreshes that stranger's mtime so the heuristic picks it
 * again next time (self-reinforcing), and leaves the real session looking as if
 * nothing was ever spawned.
 *
 * So this is an ADDITIVE sibling, not a change to the existing contract: callers
 * that legitimately need the liveness gate (session-init-gate's presence check,
 * where resolving to a finished session WOULD be wrong) keep calling
 * `resolveSdkUuidToSession` and are untouched. Callers that only need to know
 * WHERE TO FILE A RECORD call this.
 *
 * Requires the directory to EXIST — a pointer to a deleted session is still a
 * miss, preserving the GC / bounded-registry invariant. Unlike
 * `resolveSdkUuidToSession` this NEVER reaps: reaping is the other function's job
 * and doing it here would race it. Never throws.
 *
 * @param {string} sdkUuid - SDK transcript UUID from `input.session_id`.
 * @returns {string|null} absolute session dir that OWNS this UUID, or null.
 */
function resolveSdkUuidOwner(sdkUuid) {
  try {
    if (!_isSdkUuidShape(sdkUuid)) return null;
    const content = safeRead(_sdkPointerPath(sdkUuid));
    if (!content) return null;
    const sessionId = content.trim();
    if (!sessionId) return null;
    // Basename-only guard: a pointer body is written by us, but refuse to let a
    // corrupted one escape the sessions dir via `..` or an absolute path.
    if (sessionId !== path.basename(sessionId)) return null;
    const dir = path.join(AGENT_MEMORY_DIR, 'sessions', sessionId);
    if (!fs.existsSync(dir)) return null;
    // A marker that names a different UUID wins over a stale pointer.
    const owner = getSessionOwner(dir);
    if (owner && owner !== sdkUuid) return null;
    return dir;
  } catch {
    return null; // ownership lookup is evidence-gathering; it never throws at a caller
  }
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

/**
 * Append one lifecycle event to a session's structured event stream
 * (`workflow/events.jsonl`, one JSON object per line). REC-16 (v12.51.0).
 *
 * Restores the per-session structured timeline that `workflow/events/` provided
 * before it was removed in v12.6.0 — but written by DETERMINISTIC hooks (spawn /
 * stop / gate / outcome), not model-dependent skill prose, so it is useful even
 * when a skill omits optional lines (the failure mode that killed the old EVT
 * files). An operator reconstructs a failed run from three greppable stores:
 * this JSONL (ordered lifecycle timeline), `agent_spawns.log` (cross-session
 * spawn context), and `status.yaml` state_history.
 *
 * Contract:
 *   - SESSION-SCOPED: the caller passes the session dir it already resolved via
 *     the deterministic chain (never the newest-active heuristic); a null/absent
 *     sessionDir is a silent no-op so an unresolved hook never cross-writes.
 *   - LOCK-PROTECTED: the append is wrapped in withFileLock (keyed on the file
 *     path) so concurrent writers in the same session never truncate each other,
 *     matching the agent_tree.yaml concurrency contract.
 *   - FAIL-OPEN: every failure is swallowed to stderr — emitting an event must
 *     NEVER break the hook that called it. Per-session + append-only ⇒ no
 *     rotation is needed (the stream dies with the session dir).
 *
 * @param {string} sessionDir - absolute session directory (resolved by caller).
 * @param {object} evt - event payload; a `ts` ISO timestamp is stamped
 *   automatically and `type` should be one of spawn|stop|gate|outcome.
 */
function appendSessionEvent(sessionDir, evt) {
  try {
    if (!sessionDir) return; // unresolved session ⇒ never cross-write
    const f = path.join(sessionDir, 'workflow', 'events.jsonl');
    ensureDir(path.dirname(f));
    const line = JSON.stringify({ ts: new Date().toISOString(), ...(evt || {}) }) + '\n';
    // HS-6: append-only. A line under 4 KB is one O_APPEND write(2), which the
    // kernel does not interleave with other appenders, so no lock is needed (a
    // lock here only added contention in spawn bursts). Bigger lines keep it.
    if (Buffer.byteLength(line) < 4096) fs.appendFileSync(f, line, { flag: 'a' });
    else withFileLock(f, () => fs.appendFileSync(f, line));
  } catch (e) {
    console.error('[appendSessionEvent] non-fatal: ' + (e && e.message));
  }
}

/**
 * Generate a filesystem-safe timestamp slug.
 * Example: "2026-02-05_09-46-24"
 */
function getTimestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/**
 * Get a waypoint file path in a session's waypoints directory.
 */
function getWaypointPath(sessionDir, type, date = new Date()) {
  const waypointsDir = ensureDir(path.join(sessionDir, 'waypoints'));
  const slug = getTimestampSlug(date);
  return path.join(waypointsDir, `wp-${type}-${slug}.yaml`);
}

/**
 * Assign a grade based on score and thresholds.
 */
function assignGrade(score, thresholds = { excellent: 85, pass: 65 }) {
  if (score >= thresholds.excellent) return 'EXCELLENT';
  if (score >= thresholds.pass) return 'PASS';
  return 'FAIL';
}

/**
 * Calculate total score from a breakdown object, floored at 0.
 */
function calculateScore(breakdown) {
  return Math.max(0, Object.values(breakdown).reduce((a, b) => a + b, 0));
}

/**
 * Parse a simple YAML task list file and return items array.
 * Handles the team/task_list.yaml format with id, name, status,
 * claimed_by, and dependencies fields.
 *
 * @param {string} filePath - Path to the task_list.yaml file
 * @returns {Array<{id: string, name?: string, status?: string, claimed_by?: string|null, dependencies: string[]}>}
 */
function parseTaskList(filePath) {
  const content = safeRead(filePath);
  if (!content) return [];

  const items = [];
  const itemBlocks = content.split(/\n\s*- id:\s*/);

  for (let i = 1; i < itemBlocks.length; i++) {
    const block = '- id: ' + itemBlocks[i];
    const item = {};

    const idMatch = block.match(/id:\s*["']?([^"'\n]+)["']?/);
    if (idMatch) item.id = idMatch[1].trim();

    const nameMatch = block.match(/name:\s*["']?([^"'\n]+)["']?/);
    if (nameMatch) item.name = nameMatch[1].trim();

    const statusMatch = block.match(/status:\s*["']?([^"'\n]+)["']?/);
    if (statusMatch) item.status = statusMatch[1].trim();

    const claimedMatch = block.match(/claimed_by:\s*["']?([^"'\n]+)["']?/);
    if (claimedMatch) {
      const val = claimedMatch[1].trim();
      item.claimed_by = (val === 'null' || val === '~') ? null : val;
    }

    const depsMatch = block.match(/dependencies:\s*\[([^\]]*)\]/);
    if (depsMatch) {
      item.dependencies = depsMatch[1]
        .split(',')
        .map(d => d.trim().replace(/["']/g, ''))
        .filter(Boolean);
    } else {
      item.dependencies = [];
    }

    if (item.id) items.push(item);
  }

  return items;
}

/**
 * Check if a work item's dependencies are all completed.
 *
 * @param {object} item - Work item to check
 * @param {Array<object>} allItems - All work items for dependency resolution
 * @returns {boolean} True if all dependencies have status 'completed'
 */
function areDependenciesMet(item, allItems) {
  if (!item.dependencies || item.dependencies.length === 0) return true;
  return item.dependencies.every(depId => {
    const dep = allItems.find(i => i.id === depId);
    return dep && dep.status === 'completed';
  });
}

/**
 * Find available (unclaimed, unblocked) work items from a task list file.
 *
 * @param {string} taskListPath - Path to the task_list.yaml file
 * @returns {Array<object>} Work items with status 'available' or 'pending', no claimed_by, and all dependencies met
 */
function findAvailableWork(taskListPath) {
  const items = parseTaskList(taskListPath);
  if (items.length === 0) return [];
  return items.filter(item =>
    (item.status === 'available' || item.status === 'pending') &&
    !item.claimed_by &&
    areDependenciesMet(item, items)
  );
}

// ============================================================
// File Locking (mkdir-based atomic mutex)
// ============================================================
// Hooks run as separate Node.js processes. When multiple agents spawn
// concurrently, their SubagentStart/SubagentStop hooks race on
// agent_tree.yaml (read-modify-write). mkdirSync is atomic on POSIX,
// so we use a .lock directory as a mutex.
// ============================================================

/**
 * Execute a function while holding a file lock.
 * Uses mkdirSync as an atomic POSIX mutex (EEXIST = lock held).
 * Falls back to running without lock after max retries.
 *
 * @param {string} filePath - Path to the file being protected
 * @param {function} fn - Function to execute while holding the lock
 * @returns {*} Return value of fn
 */
const LOCK_SKIPPED = Symbol('LOCK_SKIPPED');

function withFileLock(filePath, fn, opts = {}) {
  const lockDir = filePath + '.lock';
  const skipOnTimeout = opts.onTimeout === 'skip';
  const maxRetries = opts.maxRetries || 100;
  const retryDelayMs = 20;
  const staleLockMs = 10000; // 10s mtime-based fallback stale threshold

  // WI-7 review F5: acquisition and fn() are separate. Before, a throw from
  // fn() landed in the acquisition catch, and fn() ran AGAIN without the lock.
  // Now fn() runs once, under the lock, and its throw goes to the caller.
  let acquired = false;
  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(lockDir);
      acquired = true;
    } catch (err) {
      if (err.code === 'EEXIST') {
        // Lock held by another process - PID-based liveness check (REQ-014)
        let lockIsStale = false;
        try {
          const pidContent = safeRead(path.join(lockDir, 'pid'));
          if (pidContent) {
            const pid = parseInt(pidContent.trim(), 10);
            if (!isNaN(pid)) {
              try {
                process.kill(pid, 0); // Signal 0: check liveness without sending a signal
                // Process alive — lock is live, don't remove
              } catch (killErr) {
                if (killErr.code === 'ESRCH') {
                  // Process dead — stale lock
                  lockIsStale = true;
                }
                // EPERM: process exists but owned by different user — treat as live
              }
            }
          } else {
            // No PID file — fall back to mtime-based stale check
            const stat = fs.statSync(lockDir);
            if (Date.now() - stat.mtimeMs > staleLockMs) {
              lockIsStale = true;
            }
          }
        } catch { /* lock dir gone, retry */ continue; }

        if (lockIsStale) {
          try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* another process may have cleared it */ }
          continue; // Retry immediately after clearing stale lock
        }
        // True synchronous sleep (0% CPU) — Atomics.wait blocks this thread for
        // retryDelayMs without spinning (stdlib; minimal-solution ladder rung 2)
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelayMs);
        continue;
      }
      if (skipOnTimeout) {
        console.error(`[withFileLock] Unexpected error: ${err.message}; SKIPPING (no unlocked write)`);
        return LOCK_SKIPPED;
      }
      // Unexpected error - run without lock rather than failing
      console.error(`[withFileLock] Unexpected error: ${err.message}, proceeding without lock`);
      return fn();
    }
    break; // acquired
  }

  if (acquired) {
    // Lock acquired - write PID for liveness detection (REQ-014)
    try { fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid)); } catch { /* best effort */ }
    try {
      return fn();
    } finally {
      // Remove lock dir and PID file atomically
      try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort */ }
    }
  }

  if (skipOnTimeout) {
    console.error(`[withFileLock] Could not acquire lock after ${maxRetries} retries; SKIPPING (no unlocked write)`);
    return LOCK_SKIPPED;
  }
  // Exhausted retries - proceed without lock (better than failing)
  console.error(`[withFileLock] Could not acquire lock after ${maxRetries} retries, proceeding without lock`);
  return fn();
}

// ============================================================
// Structured Error Format (What / Why / Fix)
// ============================================================
// Provides consistent, actionable error messages across all hooks.
// Every error message answers three questions:
//   1. WHAT happened (the observable problem)
//   2. WHY it happened (root cause or context)
//   3. FIX: how to resolve it (concrete action)
// ============================================================

/**
 * Format a structured error message with What/Why/Fix sections.
 *
 * @param {object} opts - Error details
 * @param {string} opts.what - What happened (the problem)
 * @param {string} opts.why - Why it happened (root cause)
 * @param {string} opts.fix - How to fix it (concrete action)
 * @param {string} [opts.hook] - Hook name for attribution
 * @returns {string} Formatted error message
 */
function formatError({ what, why, fix, hook }) {
  const parts = [];
  if (hook) parts.push(`[${hook}]`);
  parts.push(`WHAT: ${what}`);
  parts.push(`WHY: ${why}`);
  parts.push(`FIX: ${fix}`);
  return parts.join('\n');
}

/**
 * Create a structured deny response for PreToolUse hooks.
 *
 * @param {object} opts - Error details (same as formatError)
 * @returns {object} Hook deny response with formatted reason
 */
function denyWithReason({ what, why, fix, hook }) {
  return { deny: true, reason: formatError({ what, why, fix, hook }) };
}

/**
 * Create a structured warning (continue with systemMessage).
 *
 * @param {object} opts - Warning details (same as formatError)
 * @returns {object} Hook continue response with formatted systemMessage
 */
function warnWithReason({ what, why, fix, hook }) {
  return { continue: true, systemMessage: formatError({ what, why, fix, hook }) };
}

// ============================================================
// RF-4: I/O fault vs logic fault (fail-OPEN vs fail-CLOSED)
// ============================================================
// A deny gate that fails closed on an I/O error conflates "I could not look"
// with "there is nothing there". A chmod-000 sessions dir, an unmounted network
// home, a container bind-mount, SELinux, or a half-populated worktree would
// deny EVERY Agent spawn for as long as the condition lasted. These errnos mean
// the check could not be PERFORMED, so the correct policy is allow-and-shout.
// A genuine logic fault (TypeError, ReferenceError, a thrown string) still fails
// closed on the gates that are deny surfaces.
const IO_ERRNOS = new Set(['EACCES', 'ENOENT', 'EIO', 'ENOTDIR', 'ELOOP']);

// Hooks whose handler throw must FAIL CLOSED (deny) rather than continue.
// SessionInitGate was removed (HS-7): it is advisory, so a logic throw on the
// standalone `node run-hook.cjs session-init-gate` route now fails OPEN with a
// loud systemMessage (never a bare continue). Inside AgentDispatch a session-gate
// logic throw also fails OPEN (WI-19 F2, agent-dispatch.cjs). AgentDispatch stays
// here for faults outside its sub-gate try/catch.
const FAIL_CLOSED_HOOKS = new Set(['AgentDispatch']);

/**
 * True when `err` represents an I/O fault (see IO_ERRNOS). Checks `err.code`
 * first and falls back to the `ERRNO: message` prefix that Node uses, so a
 * rethrown Error that lost its `code` property is still classified correctly.
 */
function isIoError(err) {
  if (!err) return false;
  if (typeof err.code === 'string' && IO_ERRNOS.has(err.code)) return true;
  const msg = typeof err.message === 'string' ? err.message : String(err);
  const m = msg.match(/^([A-Z]+):/);
  return !!(m && IO_ERRNOS.has(m[1]));
}

/**
 * Extract {code, path} from an error for inclusion in a hook reason string.
 * `path` falls back to the quoted path Node embeds in fs error messages
 * (e.g. `EACCES: permission denied, scandir '/x/y'`).
 */
function describeIoError(err) {
  const msg = (err && typeof err.message === 'string') ? err.message : String(err);
  let code = (err && typeof err.code === 'string') ? err.code : null;
  if (!code) {
    const m = msg.match(/^([A-Z]+):/);
    if (m) code = m[1];
  }
  let p = (err && typeof err.path === 'string') ? err.path : null;
  if (!p) {
    const m = msg.match(/'([^']+)'/);
    if (m) p = m[1];
  }
  // Node's fs messages already start with `ERRNO: ` — strip it so callers that
  // print the code separately don't emit `EACCES: EACCES: permission denied`.
  const detail = code ? msg.replace(new RegExp(`^${code}:\\s*`), '') : msg;
  return { code: code || 'EUNKNOWN', path: p || 'unknown-path', message: detail };
}

/**
 * The verdict a hook emits when its handler THROWS. RF-4 + RF-5 (FS-4):
 *  - I/O fault, any hook           -> continue, LOUD systemMessage naming errno + path.
 *  - logic fault, deny-gate hook   -> deny (fail-closed), naming the gate.
 *  - logic fault, any other hook   -> continue, LOUD systemMessage (never silent).
 */
function handlerFailureVerdict(name, err) {
  const io = isIoError(err);
  const d = describeIoError(err);
  if (io) {
    const reason =
      `[FAIL-OPEN] ${name} could not complete its check because of an I/O error ` +
      `(${d.code} at ${d.path}: ${d.message}). "Could not look" is not "nothing is there", ` +
      'so the tool call is ALLOWED. Check permissions / mount state for that path.';
    return {
      continue: true,
      systemMessage: reason,
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecisionReason: reason },
    };
  }
  if (FAIL_CLOSED_HOOKS.has(name)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `[FAIL-CLOSED] ${name} threw during evaluation (${d.message}). Denying the tool call ` +
          'rather than proceeding through a crashed gate. This is a LOGIC fault, not an I/O fault — ' +
          'it is a bug in the hook, please report it with the stderr trace.',
      },
    };
  }
  return {
    continue: true,
    systemMessage:
      `[${name}] hook handler threw and was caught (fail-open): ${d.message}. ` +
      'The tool call proceeds; this hook contributed nothing to the decision.',
  };
}

// ============================================================
// createHook() Factory
// ============================================================
// Eliminates per-hook boilerplate: try-catch wrapping, stdin reading,
// JSON output, error handling. Each hook only needs to provide a handler
// function: async (input) => result.
//
// Result can be:
//   - null/undefined: outputs {"continue": true}
//   - { continue: true, systemMessage: "..." }
//   - { decision: "block", reason: "..." }
//   - { deny: true, reason: "..." } (for PreToolUse hooks)
//   - Any valid hook response object
// ============================================================

/**
 * Create and run a hook with standard boilerplate.
 *
 * @param {string} name - Hook name for logging (e.g., "SessionCatchup")
 * @param {function} handler - async (input) => result object
 */
/**
 * Atomic dedup guard for plugin + project double-load scenarios.
 * When cAgents is both the active project AND an installed marketplace plugin,
 * Claude Code loads hooks from both paths, causing every hook to fire twice.
 * This guard uses fs.openSync('wx') (exclusive create) on a temp file keyed by
 * hook name + input content hash. First caller wins; second caller no-ops.
 * Temp files auto-clean after 2 seconds.
 */
function dedupGuard(hookName, input) {
  // Test-mode bypass: vitest sets VITEST=true; CI runners may also set it explicitly.
  // The dedup guard exists to prevent plugin+project double-load in production. Tests
  // intentionally invoke the same hook multiple times with deterministic fixtures
  // (e.g., the same session_id), so dedup must not fire and short-circuit the side
  // effects under test. If a stale /tmp/cagents-dedup-* file leaks from a prior crash
  // or cancelled run, it would cause spurious test failures — the bypass also makes
  // the test suite robust to that condition. NODE_ENV=test and CAGENTS_HOOK_DEDUP_DISABLE
  // are also honored as escape hatches.
  if (process.env.VITEST === 'true'
      || process.env.NODE_ENV === 'test'
      || process.env.CAGENTS_HOOK_DEDUP_DISABLE === '1') {
    return false;
  }
  try {
    const crypto = require('crypto');
    const os = require('os');
    // H6 (v12.20.0): key on a hash of the FULL stringified input, not a 200-char
    // prefix. The previous `JSON.stringify(input).slice(0, 200)` collided two
    // genuinely-different invocations whose first ~200 chars matched — e.g. two
    // Writes to the same long file_path that differ only in their (later)
    // `content` field, or two payloads sharing a long leading session_id/path.
    // On collision the SECOND invocation was treated as a duplicate and skipped,
    // bypassing the security gates (secret-detection, controller-delegation). A
    // full-input SHA-1 dedups ONLY truly-identical payloads, which is the intended
    // plugin+project double-load case. The window is now DEDUP_TTL_MS (A2, below).
    const fullInput = JSON.stringify(input);
    const hash = crypto.createHash('sha1').update(hookName + '\0' + fullInput).digest('hex').slice(0, 16);
    const dedupFile = path.join(os.tmpdir(), `cagents-dedup-${hookName}-${hash}`);

    // A2 (HS-2): the marker now OUTLIVES the first process for DEDUP_TTL_MS. The old
    // marker was unlinked at process exit, so a second copy that started a few
    // ms after the first had finished (the common case: 6-60 ms launch skew vs
    // ~10 ms handler time) always ran. Payloads for tool events carry a unique
    // tool_use_id, so an identical payload inside the TTL is the same event.
    // A marker older than DEDUP_TTL_MS (5 s, by mtime) never suppresses: it is
    // unlinked and re-created, so a stale file from a crash cannot block a gate.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = fs.openSync(dedupFile, 'wx');
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, t: Date.now() }));
        fs.closeSync(fd);
        _dedupFile = dedupFile;
        if (Math.random() < 0.05) sweepDedupMarkers(); // markers no longer self-delete
        return false; // first copy -- proceed
      } catch (e) {
        if (e.code !== 'EEXIST') return false;
        let age = Infinity;
        try { age = Date.now() - fs.statSync(dedupFile).mtimeMs; } catch { continue; }
        if (age <= DEDUP_TTL_MS) { _dedupFile = dedupFile; return true; }
        try { fs.unlinkSync(dedupFile); } catch {}
      }
    }
    return false;
  } catch (e) {
    return false; // never block hooks on dedup failure
  }
}

const DEDUP_TTL_MS = 5000;
function sweepDedupMarkers() {
  try {
    const os = require('os'); const dir = os.tmpdir(); const now = Date.now();
    for (const f of fs.readdirSync(dir)) {
      if (!f.startsWith('cagents-dedup-')) continue;
      const p = path.join(dir, f);
      try { if (now - fs.statSync(p).mtimeMs > 60000) fs.unlinkSync(p); } catch {}
    }
  } catch {}
}
let _dedupFile = null;

// A2: first copy records its verdict in the marker; a duplicate copy replays it
// (waits up to DEDUP_REPLAY_WAIT_MS for the first copy to finish), so both
// copies emit the same output contract. Fallback is {"continue":true}.
const DEDUP_REPLAY_WAIT_MS = 1500;
function dedupRecordVerdict(json) {
  if (!_dedupFile) return;
  try { fs.writeFileSync(_dedupFile, JSON.stringify({ pid: process.pid, t: Date.now(), verdict: json })); } catch {}
}
async function dedupReplayVerdict() {
  const deadline = Date.now() + DEDUP_REPLAY_WAIT_MS;
  while (_dedupFile && Date.now() < deadline) {
    try {
      const m = JSON.parse(fs.readFileSync(_dedupFile, 'utf8'));
      if (m && typeof m.verdict === 'string') return m.verdict;
    } catch {}
    await new Promise(r => setTimeout(r, 25));
  }
  return JSON.stringify({ continue: true });
}

function createHook(name, handler) {
  const emit = (obj) => { const j = JSON.stringify(obj); console.log(j); dedupRecordVerdict(j); };
  async function run() {
    try {
      const input = await readStdin(name);

      if (lastStdinStatus === 'timeout-partial' && NO_PAYLOAD_FAIL_CLOSED.has(name)) {
        emit(({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny',
          permissionDecisionReason: `[FAIL-CLOSED] ${name} received a truncated hook payload (no complete JSON object before stdin ended or within ${STDIN_FALLBACK_MS} ms). Denying rather than evaluating an empty command.` } }));
        return;
      }
      // W5: an EMPTY payload (no bytes at EOF or at the deadline) allows with
      // exactly one systemMessage. Nothing arrived, so there is nothing to deny.
      if ((lastStdinStatus === 'timeout-empty' || lastStdinStatus === 'eof-empty') && NO_PAYLOAD_FAIL_CLOSED.has(name)) {
        emit(({ continue: true, systemMessage: `[FAIL-OPEN] ${name} received an empty hook payload (no bytes before stdin ended or within ${STDIN_FALLBACK_MS} ms); this gate did not evaluate the tool call.` }));
        return;
      }

      // Dedup guard: skip if another invocation of the same hook with the same input is already running
      if (dedupGuard(name, input)) {
        console.log(await dedupReplayVerdict()); // A2: identical output contract
        return;
      }

      try {
        const result = await handler(input);

        if (!result) {
          emit(({ continue: true }));
          return;
        }

        // Shorthand: { deny: true, reason: "..." } -> full PreToolUse deny response
        if (result.deny) {
          emit(({
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: result.reason || 'Blocked by hook'
            }
          }));
          return;
        }

        // Shorthand: { allow: true, reason: "..." } -> full allow response
        // Supports both PreToolUse (permissionDecision) and PermissionRequest (decision.behavior)
        if (result.allow) {
          const hookEvent = result.hookEvent || 'PreToolUse';
          if (hookEvent === 'PermissionRequest') {
            emit(({
              hookSpecificOutput: {
                hookEventName: 'PermissionRequest',
                decision: {
                  behavior: 'allow'
                }
              }
            }));
          } else {
            emit(({
              hookSpecificOutput: {
                hookEventName: hookEvent,
                permissionDecision: 'allow',
                permissionDecisionReason: result.reason || 'Allowed by hook'
              }
            }));
          }
          return;
        }

        // V11.0.5: Auto-inject `continue: true` when the hook returns a
        // shape that legitimately wants the run to keep going but forgot to
        // declare it. The Claude Code hook protocol expects responses to
        // carry an explicit signal — without one, downstream consumers get
        // an `undefined` field and assertions like `result.continue === true`
        // fail spuriously (see V11.0.4 tool-failure-tracker bug). We do NOT
        // override hooks that explicitly set `continue: false`, return a
        // `decision` (Stop hook block), or carry a deny `permissionDecision`
        // — those have intentional semantics. The deny/allow shorthands
        // above already returned, so by the time we reach this branch the
        // result is some other shape.
        if (typeof result === 'object'
            && result !== null
            && result.continue === undefined
            && result.decision === undefined
            && !(result.hookSpecificOutput && result.hookSpecificOutput.permissionDecision === 'deny')) {
          result.continue = true;
        }

        emit((result));

      } catch (error) {
        // RF-4 / RF-5 (FS-4): a handler throw used to print to stderr — which the
        // model never sees — and emit a bare {continue:true}. Both invocation
        // routes now share ONE policy (see handlerFailureVerdict): I/O faults fail
        // OPEN and loud, logic faults fail CLOSED on the deny gates and loud-open
        // everywhere else. Nothing here is silent any more.
        console.error(`[${name}] Error: ${error && error.message}`);
        emit((handlerFailureVerdict(name, error)));
      }

    } catch (e) {
      // Fatal error (e.g., stdin read failure)
      emit(({ continue: true }));
    }
  }

  run().finally(releaseProcess);
}

/**
 * Update last_updated_at heartbeat in a session's status.yaml.
 * Called by hooks that write/modify status.yaml to enable stuck session detection.
 *
 * @param {string} sessionDir - Path to the session directory
 */
function updateStatusHeartbeat(sessionDir) {
  const statusFile = path.join(sessionDir, 'status.yaml');
  const content = safeRead(statusFile);
  if (!content) return;

  const now = new Date().toISOString();

  withFileLock(statusFile, () => {
    // Re-read inside lock for safety
    let current = safeRead(statusFile);
    if (!current) return;

    if (current.includes('last_updated_at:')) {
      // Replace existing value
      current = current.replace(/^last_updated_at:.*$/m, `last_updated_at: "${now}"`);
    } else {
      // Append at the end
      current = current.trimEnd() + `\nlast_updated_at: "${now}"\n`;
    }

    fs.writeFileSync(statusFile, current);
  });
}

// ============================================================
// HS-1 + HS-6 (WI-7, from wi028-B): atomic write, one session resolver,
// claim-on-any-write, append-only events, tolerant locked tree updates.
// ============================================================

/** Write via same-dir tmp + rename so a reader never sees a torn file. */
function writeFileAtomic(filePath, data) {
  const tmp = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
  fs.writeFileSync(tmp, data);
  try { fs.renameSync(tmp, filePath); }
  catch (e) { try { fs.unlinkSync(tmp); } catch { /* gone */ } throw e; }
}

// One stderr line per distinct resolver message per process (HS-1: "logs once
// per process, not per call").
const _resolveLogged = new Set();
function _resolveLog(msg) {
  if (_resolveLogged.has(msg)) return;
  _resolveLogged.add(msg);
  console.error(`[resolveSession] ${msg}`);
}

/**
 * A session dir named explicitly by a prompt (SESSION_DIR=/abs/... or
 * CAGENTS_SESSION_ID=<id>). Accepted only when it is a DIRECT child of
 * AGENT_MEMORY_DIR/sessions (absolute-root rule: never cwd-relative), exists,
 * and is unclaimed or owned by `uuid`. Returns the abs dir or null.
 */
function sessionFromPromptHint(promptText, uuid) {
  if (!promptText || typeof promptText !== 'string') return null;
  const m = promptText.match(/SESSION[_ ]DIR[:=\s]+["']?([^\s"']+)/i)
    || promptText.match(/CAGENTS_SESSION_ID[:=\s]+["']?([^\s"']+)/i);
  if (!m) return null;
  const sessionsRoot = path.resolve(AGENT_MEMORY_DIR, 'sessions');
  const hint = m[1].replace(/\/+$/, '');
  const abs = path.isAbsolute(hint) ? path.resolve(hint) : path.join(sessionsRoot, path.basename(hint));
  if (path.dirname(abs) !== sessionsRoot) return null;
  if (!SESSION_PREFIXES.some(p => path.basename(abs).startsWith(p))) return null;
  if (!fs.existsSync(abs)) { _resolveLog(`Prompt hint session not found on disk: ${path.basename(abs)}`); return null; }
  const owner = getSessionOwner(abs);
  if (owner && owner !== uuid) { _resolveLog(`Prompt hint names a foreign session; ignoring: ${path.basename(abs)}`); return null; }
  return abs;
}

/**
 * Sessions whose status.yaml / instruction.yaml a Bash command WROTE. Only a
 * write TARGET counts (WI-7 review F1): the operand right after `>` / `>>` /
 * `>|` (fd redirects such as `2>` and `&>` are ignored, and /dev/null is never
 * a session file), a `tee` file argument, or the LAST operand of cp / mv /
 * install. A path that is only read (`cat`, `grep`, `diff`, a cp SOURCE) never
 * claims. $VAR / ${VAR} paths whose VAR is assigned in the same command are
 * expanded. Relative paths resolve against input.cwd, then PROJECT_ROOT.
 * Only direct children of AGENT_MEMORY_DIR/sessions with a SESSION_PREFIXES
 * name qualify (F2, same rule as _sessionDirOfWrittenFile).
 */
function sessionDirsWrittenByBash(command, cwd) {
  if (!command || typeof command !== 'string') return [];
  if (!/(>|\btee\b|\bcp\b|\bmv\b|\binstall\b)/.test(command)) return []; // reads never claim
  const vars = {};
  const assignRe = /(?:^|[\s;&|(])(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=("([^"]*)"|'([^']*)'|([^\s;&|)]+))/g;
  let a;
  while ((a = assignRe.exec(command))) vars[a[1]] = a[3] ?? a[4] ?? a[5] ?? '';
  const expanded = command.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (all, v) => (v in vars ? vars[v] : all));
  const unquote = (s) => s.replace(/^["']|["']$/g, '');
  const operands = (argText) => (argText.match(/"[^"]*"|'[^']*'|[^\s]+/g) || []).map(unquote);
  const targets = [];
  // (a) Output redirects. The char before `>` must not be a digit, `&` or `>`
  // (that is an fd redirect, `&>`, or the second char of `>>`).
  const redirRe = /(^|[^0-9&>])(>>?|>\|)\s*("[^"]*"|'[^']*'|[^\s;&|<>()]+)/g;
  let r;
  while ((r = redirRe.exec(expanded))) {
    const tgt = unquote(r[3]);
    if (!tgt.startsWith('&')) targets.push(tgt); // `>&2` duplicates an fd
  }
  // (b) tee / cp / mv / install, per command segment (split on ; & | newline).
  for (const seg of expanded.split(/[;&|\n]+/)) {
    const m = seg.match(/^\s*(tee|cp|mv|install)\b(.*)$/);
    if (!m) continue;
    // Drop redirect clauses (handled above) and options.
    const ops = operands(m[2].replace(/\d*>>?\s*\S+/g, ' ')).filter(o => o && !o.startsWith('-'));
    if (!ops.length) continue;
    if (m[1] === 'tee') targets.push(...ops);
    else if (ops.length >= 2) targets.push(ops[ops.length - 1]);
  }
  const sessionsRoot = path.resolve(AGENT_MEMORY_DIR, 'sessions');
  const out = new Set();
  for (const raw of targets) {
    if (raw.includes('$')) continue; // unexpanded variable: no guess
    const base = path.basename(raw);
    if (base !== 'status.yaml' && base !== 'instruction.yaml') continue;
    const abs = path.resolve(cwd || PROJECT_ROOT, raw);
    const dir = path.dirname(abs);
    if (path.dirname(dir) !== sessionsRoot) continue;
    if (!SESSION_PREFIXES.some(p => path.basename(dir).startsWith(p))) continue;
    if (fs.existsSync(abs)) out.add(dir);
  }
  return [...out];
}

/** The session dir a Write/Edit/NotebookEdit file_path targets, when it is a
 * sessions/<id>/(status|instruction).yaml under AGENT_MEMORY_DIR. */
function _sessionDirOfWrittenFile(filePath, cwd) {
  if (!filePath || typeof filePath !== 'string') return null;
  const base = path.basename(filePath);
  if (base !== 'status.yaml' && base !== 'instruction.yaml') return null;
  const abs = path.resolve(cwd || PROJECT_ROOT, filePath);
  const dir = path.dirname(abs);
  if (path.dirname(dir) !== path.resolve(AGENT_MEMORY_DIR, 'sessions')) return null;
  if (!SESSION_PREFIXES.some(p => path.basename(dir).startsWith(p))) return null;
  return fs.existsSync(dir) ? dir : null;
}

/**
 * HS-1 claimFromAnyWrite: claim the session(s) a tool call just created.
 *   - PostToolUse Bash: `sessions/<id>/(status|instruction).yaml` redirects,
 *     tee, cp, mv, install (breaks the circular bootstrap: a session created
 *     with `cat > $S/status.yaml` used to be invisible to every hook).
 *   - PostToolUse Write/Edit/NotebookEdit/MultiEdit: the same two files.
 *   - PreToolUse Agent/Task: an explicit `SESSION_DIR=` in the spawn prompt.
 * Never claims a foreign session (claimSession is first-claimant-wins).
 * Returns the claimed dirs. Never throws.
 */
function claimFromAnyWrite(input) {
  try {
    const uuid = input && input.session_id;
    if (!_isSdkUuidShape(uuid)) return [];
    const ti = input.tool_input || {};
    const tool = input.tool_name;
    let dirs = [];
    if (tool === 'Bash') {
      dirs = sessionDirsWrittenByBash(ti.command, input.cwd);
    } else if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
      const d = _sessionDirOfWrittenFile(ti.file_path || ti.notebook_path, input.cwd);
      if (d) dirs = [d];
    } else if (tool === 'Agent' || tool === 'Task') {
      const d = sessionFromPromptHint(ti.prompt, uuid);
      if (d) dirs = [d];
    }
    return dirs.filter(d => claimSession(d, uuid));
  } catch {
    return [];
  }
}

/** Usable for this purpose: present, and non-terminal unless terminal is OK. */
function _usableFor(dir, terminalOk) {
  if (!dir || !fs.existsSync(dir)) return false;
  if (terminalOk) return true;
  return !!_tryResolveCandidate(path.dirname(dir), path.basename(dir));
}

/**
 * HS-1: ONE session resolver. Chain:
 *   (1) the session this transcript OWNS (map pointer, then session.sdk_id
 *       marker; resolveOwnedSession);
 *   (2) an explicit absolute SESSION_DIR (or CAGENTS_SESSION_ID) in
 *       tool_input.prompt, unclaimed or owned -> claimed when claimHint;
 *   (3) an explicit non-UUID cAgents session id in input.session_id (legacy /
 *       test payloads), else the CAGENTS_ACTIVE_SESSION env var;
 *   (4) null.
 * There is NO newest-mtime / newest-name pass: with two live sessions and no
 * owner, pin, hint or env, the answer is null. A result owned by another
 * transcript is dropped.
 *
 * purpose 'record' (default): where to FILE a record; the liveness label is
 *   ignored (a pessimistic `incomplete` must not divert this session's audit
 *   trail). purpose 'gate': a liveness-gated decision; terminal sessions do not
 *   count. `includeTerminal` overrides the purpose default when given.
 *
 * @param {object} input - hook payload (session_id, tool_input.prompt).
 * `allowEnv: false` skips the CAGENTS_ACTIVE_SESSION rung (SessionEnd uses it:
 * an env var is not ownership).
 *
 * @param {{purpose?: 'record'|'gate', includeTerminal?: boolean, claimHint?: boolean, allowEnv?: boolean}} [opts]
 * @returns {string|null} absolute session dir, or null.
 */
function resolveSession(input, { purpose = 'record', includeTerminal, claimHint = true, allowEnv = true } = {}) {
  try {
    const terminalOk = includeTerminal !== undefined ? !!includeTerminal : purpose !== 'gate';
    const sid = input && typeof input.session_id === 'string' ? input.session_id : '';
    const uuid = _isSdkUuidShape(sid) ? sid : null;
    const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
    let dir = null;

    // (1) ownership
    if (uuid) dir = resolveOwnedSession(uuid, { includeTerminal: terminalOk });

    // (2) explicit prompt hint
    if (!dir) {
      const hinted = sessionFromPromptHint(((input && input.tool_input) || {}).prompt, uuid);
      if (hinted && _usableFor(hinted, terminalOk)) {
        dir = hinted;
        _resolveLog(`Resolved session from prompt hint: ${path.basename(hinted)}`);
        if (claimHint && uuid) claimSession(hinted, uuid);
      }
    }

    // (3) explicit non-UUID pin, else env
    if (!dir) {
      if (sid && !uuid) {
        // Basename only (no path traversal). No prefix check: findActiveSession
        // never had one, and test/legacy ids use other prefixes.
        if (sid === path.basename(sid) && sid !== '.' && sid !== '..') {
          const pinned = path.join(sessionsDir, sid);
          if (_usableFor(pinned, terminalOk)) dir = pinned;
        }
      } else if (allowEnv) {
        const env = process.env.CAGENTS_ACTIVE_SESSION;
        if (env && env === path.basename(env) && env !== '.' && env !== '..') {
          const envDir = path.join(sessionsDir, env);
          if (_usableFor(envDir, terminalOk)) dir = envDir;
          else _resolveLog(`CAGENTS_ACTIVE_SESSION="${env}" unusable (missing${terminalOk ? '' : ' or terminal'})`);
        }
      }
    }

    // Foreign drop: a dir whose marker names another transcript is never ours.
    if (dir && sid) {
      const owner = getSessionOwner(dir);
      if (owner && owner !== sid) {
        _resolveLog(`session ${path.basename(dir)} is owned by another transcript; not using it`);
        return null;
      }
    }
    return dir;
  } catch (e) {
    console.error('[resolveSession] non-fatal: ' + (e && e.message));
    return null;
  }
}

/** Read workflow/events.jsonl (append-only source of truth). Bad lines skipped. */
function readSessionEvents(sessionDir) {
  const raw = safeRead(path.join(sessionDir, 'workflow', 'events.jsonl'));
  if (!raw) return [];
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* torn/hand line: skip */ }
  }
  return out;
}

/**
 * Load agent_tree.yaml tolerantly. On a parse error the bad bytes are kept in
 * agent_tree.yaml.corrupt-<ts> and a fresh { agents: [] } is returned (the
 * caller reconciles rows from events.jsonl). Returns { obj, recovered }.
 */
function loadAgentTreeTolerant(treeFile, yamlLib) {
  const content = safeRead(treeFile);
  if (!content) return { obj: { agents: [] }, recovered: null };
  try {
    const parsed = yamlLib.load(content);
    if (parsed === null || parsed === undefined) return { obj: { agents: [] }, recovered: null };
    if (typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.agents === undefined && parsed.children === undefined) parsed.agents = [];
      return { obj: parsed, recovered: null }; // non-canonical shapes: caller migrates
    }
  } catch (e) {
    const q = `${treeFile}.corrupt-${Date.now()}`;
    try { fs.writeFileSync(q, content); } catch { /* best effort */ }
    console.error(`[agent_tree] malformed YAML quarantined to ${path.basename(q)}; rebuilding from events.jsonl (${e.message.split('\n')[0]})`);
    return { obj: { agents: [] }, recovered: path.basename(q) };
  }
  const q = `${treeFile}.corrupt-${Date.now()}`;
  try { fs.writeFileSync(q, content); } catch { /* best effort */ }
  console.error(`[agent_tree] non-mapping YAML root quarantined to ${path.basename(q)}; rebuilding from events.jsonl`);
  return { obj: { agents: [] }, recovered: path.basename(q) };
}

/**
 * HS-6 updateYamlLocked: the ONE write path for agent_tree.yaml. Lock (SKIPS
 * on timeout, never an unlocked write) -> tolerant parse (quarantine +
 * rebuild) -> mutate(obj, ctx) -> tmp+rename. `mutate` may set
 * `ctx.write = false` to skip the write; its return value is passed through.
 * Returns LOCK_SKIPPED when the lock could not be taken.
 *
 * @param {string} filePath
 * @param {object} yamlLib - js-yaml
 * @param {(obj: object, ctx: {recovered: string|null, write: boolean}) => *} mutate
 * @param {{header?: string, maxRetries?: number}} [opts]
 */
function updateYamlLocked(filePath, yamlLib, mutate, { header = '', maxRetries = 50 } = {}) {
  return withFileLock(filePath, () => {
    const { obj, recovered } = loadAgentTreeTolerant(filePath, yamlLib);
    const ctx = { recovered, write: true };
    const value = mutate(obj, ctx);
    if (ctx.write) writeFileAtomic(filePath, header + yamlLib.dump(obj));
    return value;
  }, { onTimeout: 'skip', maxRetries });
}

/** Header for the hook-owned agent_tree.yaml. */
function agentTreeHeader(sessionDir) {
  return `# Agent Tree - cAgents Audit Trail (hook-owned; derived from workflow/events.jsonl)\n# Session: ${path.basename(sessionDir)}\n# Do not hand-edit. Hooks rewrite this file atomically.\n\n`;
}

/** Make the tree agree with events.jsonl: add missing spawns, apply stops. Idempotent. */
function reconcileTreeFromEvents(treeObj, sessionDir) {
  if (!Array.isArray(treeObj.agents)) return treeObj;
  const byId = new Map(treeObj.agents.filter(a => a && a.id).map(a => [a.id, a]));
  const events = readSessionEvents(sessionDir);
  for (const ev of events) {
    if (ev.type === 'spawn' && ev.agent_id && !byId.has(ev.agent_id)) {
      const row = Object.assign({ id: ev.agent_id, type: ev.agent_type || 'unknown', parent: ev.parent || 'pipeline',
        depth: typeof ev.depth === 'number' ? ev.depth : 1, spawned_at: ev.ts || null, stopped_at: null,
        session: path.basename(sessionDir) }, ev.row || {});
      treeObj.agents.push(row); byId.set(row.id, row);
    } else if (ev.type === 'stop' && ev.agent_id && byId.has(ev.agent_id)) {
      const row = byId.get(ev.agent_id);
      if (!row.stopped_at) row.stopped_at = ev.ts || new Date().toISOString();
    }
  }
  // Stops with no agent_id: k stop_anon events of type T close the k OLDEST
  // anon_<T>_ rows. Count-based, so re-running is idempotent.
  const anonStops = {};
  for (const ev of events) if (ev.type === 'stop_anon' && ev.agent_type) (anonStops[ev.agent_type] = anonStops[ev.agent_type] || []).push(ev.ts);
  for (const [t, tss] of Object.entries(anonStops)) {
    const rows = treeObj.agents.filter(a => a && typeof a.id === 'string' && a.id.startsWith(`anon_${t}_`))
      .sort((x, y) => String(x.spawned_at).localeCompare(String(y.spawned_at)));
    rows.slice(0, tss.length).forEach((r, i) => { if (!r.stopped_at) r.stopped_at = tss[i] || new Date().toISOString(); });
  }
  return treeObj;
}

/** HS-6: the single fallback id for a SubagentStart/Stop with no agent_id. */
function fallbackAgentId(agentType) {
  return `anon_${agentType || 'unknown'}_${Date.now()}_${process.pid}`;
}

// ---------------------------------------------------------------------------
// WI-028 (stop-warnings): repairSession — self-heal session state that the
// Stop gate would otherwise warn about. Every repair is guarded, idempotent,
// and appended to workflow/repairs.jsonl. It NEVER changes a verdict
// (validation_report.yaml, coordination_log status, pipeline_state) and NEVER
// writes a stub. Modes: 'stop' (owned session, evidence-only repairs) and
// 'sweep' (SessionStart, idle sessions: adds the staleness close).
// ---------------------------------------------------------------------------
const REPAIR_SWEEP_IDLE_MS = 24 * 60 * 60 * 1000;

/** ids -> ISO ts of `event=stop` lines in the global spawn audit logs. */
function stopTimesFromSpawnLogs(ids) {
  const found = new Map();
  if (!ids.length) return found;
  const want = new Set(ids);
  let files = [];
  try {
    const dir = path.join(AGENT_MEMORY_DIR, '_system', 'logs');
    files = fs.readdirSync(dir).filter(f => /^agent_spawns.*\.log$/.test(f)).map(f => path.join(dir, f));
  } catch { return found; }
  for (const f of files) {
    const raw = safeRead(f);
    if (!raw) continue;
    for (const line of raw.split('\n')) {
      if (!line.includes('event=stop')) continue;
      const m = line.match(/^(\S+) \| agent_id=([^ |]+) \|/);
      if (m && want.has(m[2]) && !found.has(m[2])) found.set(m[2], m[1]);
    }
  }
  return found;
}

function sessionLastActivityMs(sessionDir, statusContent) {
  let t = 0;
  const hb = statusContent && statusContent.match(/last_updated_at:\s*"?([^"\n]+)"?/);
  if (hb) { const v = Date.parse(hb[1]); if (!isNaN(v)) t = Math.max(t, v); }
  for (const rel of ['status.yaml', 'workflow/events.jsonl', 'workflow/agent_tree.yaml', 'workflow/coordination_log.yaml']) {
    try { t = Math.max(t, fs.statSync(path.join(sessionDir, rel)).mtimeMs); } catch { /* absent */ }
  }
  return t;
}

function deriveExecutionSummary(sessionDir, statusContent, nowIso) {
  const wf = (f) => safeRead(path.join(sessionDir, 'workflow', f)) || '';
  const coord = wf('coordination_log.yaml');
  const val = wf('validation_report.yaml');
  const tree = wf('agent_tree.yaml');
  const statusCounts = {};
  for (const m of coord.matchAll(/\bstatus:\s*["']?([A-Za-z_]+)/g)) statusCounts[m[1]] = (statusCounts[m[1]] || 0) + 1;
  const q = (s) => JSON.stringify(String(s == null ? '' : s));
  return [
    '# Derived by repairSession() from on-disk artifacts (not a stub): every value',
    '# below is copied from the cited source file; nothing is asserted by the hook.',
    `session_id: ${q(path.basename(sessionDir))}`,
    `final_state: ${q(extractYamlValue(statusContent, 'pipeline_state') || extractYamlValue(statusContent, 'phase'))}`,
    'status: "completed"',
    `validation_verdict: ${q(extractYamlValue(val, 'classification') || extractYamlValue(val, 'overall_status') || extractYamlValue(val, 'status'))}`,
    `controller: ${q(extractYamlValue(coord, 'controller'))}`,
    `work_item_status_counts: ${JSON.stringify(statusCounts)}`,
    `agent_rows: ${(tree.match(/^\s*- id:/gm) || []).length}`,
    'generated_by: repair-session-derived',
    `generated_at: ${q(nowIso)}`,
    'sources: [status.yaml, workflow/coordination_log.yaml, workflow/validation_report.yaml, workflow/agent_tree.yaml]',
    ''
  ].join('\n');
}

function repairSession(sessionDir, opts = {}) {
  const mode = opts.mode === 'sweep' ? 'sweep' : 'stop';
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const nowIso = new Date(now).toISOString();
  const staleMs = parseInt(process.env.CAGENTS_STALE_CHILD_MS || '1800000', 10) || 1800000;
  const repairs = [];
  try {
    if (!sessionDir) return repairs;
    const statusFile = path.join(sessionDir, 'status.yaml');
    const statusContent = safeRead(statusFile);
    if (!statusContent) return repairs;
    const state = readSessionState(statusContent);
    const terminal = !!state && isTerminalState(state);
    const idleMs = now - sessionLastActivityMs(sessionDir, statusContent);

    // R1 + R2: agent_tree.yaml (rebuild if unparseable; close rows with terminal evidence).
    const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
    let yamlLib = null;
    try { yamlLib = require('js-yaml'); } catch { /* no yaml: skip tree repairs */ }
    if (yamlLib && fs.existsSync(treeFile)) {
      withFileLock(treeFile, () => {
        // Guard: rebuild an unparseable tree ONLY when events.jsonl can repopulate it;
        // otherwise leave the bytes alone (no quarantine churn) and surface one line.
        let parsesOk = true;
        try { yamlLib.load(safeRead(treeFile) || ''); } catch { parsesOk = false; }
        if (!parsesOk && !readSessionEvents(sessionDir).some(e => e && e.type === 'spawn')) {
          repairs.push({ kind: 'agent_tree_unrepairable', needs_user: true,
            message: `agent_tree.yaml in ${path.basename(sessionDir)} is not valid YAML and events.jsonl cannot rebuild it; fix or delete the hand-added lines.` });
          return;
        }
        const { obj, recovered } = loadAgentTreeTolerant(treeFile, yamlLib);
        if (!Array.isArray(obj.agents)) return; // non-canonical shape: not ours to rewrite
        const before = JSON.stringify(obj.agents);
        reconcileTreeFromEvents(obj, sessionDir);
        if (recovered) repairs.push({ kind: 'agent_tree_rebuilt', quarantine: recovered, rows: obj.agents.length });
        const open = obj.agents.filter(r => r && r.id && !r.stopped_at);
        const logStops = stopTimesFromSpawnLogs(open.map(r => String(r.id)));
        for (const row of open) {
          const isRoot = row.depth === 0 || row.id === 'pipeline' || /-pipeline$/.test(String(row.type || ''));
          const spawnedMs = Date.parse(row.spawned_at);
          let reason = null; let at = null;
          if (logStops.has(String(row.id))) { reason = 'stop_logged'; at = logStops.get(String(row.id)); }
          else if (isRoot && terminal) { reason = 'root_of_terminal_session'; at = extractYamlValue(statusContent, 'last_updated_at') || nowIso; }
          else if (mode === 'sweep' && idleMs > REPAIR_SWEEP_IDLE_MS
                   && (isNaN(spawnedMs) || now - spawnedMs > staleMs)) {
            // Sweep only: the session has been idle for 24 h, so no agent of it is running.
            reason = 'stale_sweep'; at = nowIso;
          }
          if (!reason) continue;
          row.stopped_at = at; row.stop_reason = `repaired:${reason}`;
          repairs.push({ kind: 'agent_row_closed', id: row.id, type: row.type || null, reason, stopped_at: at });
        }
        if (JSON.stringify(obj.agents) !== before || recovered) {
          if (!recovered && !repairs.some(r => r.kind === 'agent_row_closed')) repairs.push({ kind: 'agent_tree_reconciled' });
          writeFileAtomic(treeFile, yamlLib.dump(obj, { lineWidth: -1, noRefs: true }));
        }
      }, { onTimeout: 'skip', maxRetries: 25 });
    }

    // R3: execution_summary.yaml derived from artifacts — ONLY for a genuinely
    // validated session (real PASS on disk). Replaces a hook stub; never overwrites
    // a summary the pipeline wrote itself.
    const execFile = path.join(sessionDir, 'workflow', 'execution_summary.yaml');
    const execRaw = safeRead(execFile);
    const isHookStub = !!execRaw && /generated_by:\s*verify-completion-hook-safety-net/.test(execRaw);
    if ((!execRaw || isHookStub) && sessionGenuinelyValidated(sessionDir, statusContent)) {
      writeFileAtomic(execFile, deriveExecutionSummary(sessionDir, statusContent, nowIso));
      repairs.push({ kind: 'execution_summary_derived', replaced_stub: isHookStub });
    }

    const applied = repairs.filter(r => !r.needs_user);
    if (applied.length) {
      const f = path.join(sessionDir, 'workflow', 'repairs.jsonl');
      const lines = applied.map(r => JSON.stringify({ ts: nowIso, mode, pid: process.pid, ...r })).join('\n') + '\n';
      withFileLock(f, () => fs.appendFileSync(f, lines), { onTimeout: 'skip', maxRetries: 25 });
      console.error(`[repairSession] ${path.basename(sessionDir)} (${mode}): ${applied.length} repair(s): ${applied.map(r => r.kind).join(', ')}`);
    }
  } catch (e) {
    console.error(`[repairSession] non-fatal: ${e && e.message}`);
  }
  return repairs;
}

module.exports = {
  repairSession, // WI-028 stop-warnings self-heal
  LOCK_SKIPPED,
  writeFileAtomic,
  sessionFromPromptHint,
  sessionDirsWrittenByBash,
  claimFromAnyWrite,
  claimFromToolInput: claimFromAnyWrite, // wi028-B name, kept as an alias
  resolveSession,
  readSessionEvents,
  loadAgentTreeTolerant,
  updateYamlLocked,
  agentTreeHeader,
  reconcileTreeFromEvents,
  fallbackAgentId,
  PROJECT_ROOT,
  PLUGIN_ROOT,
  AGENT_MEMORY_DIR,
  SESSION_PREFIXES,
  TERMINAL_STATES,
  TERMINAL_ALIASES,
  SUCCESS_TERMINAL_STATES,
  normalizeTerminalState,
  isTerminalState,
  isSuccessTerminalState,
  sessionGenuinelyValidated,
  SESSION_DISCOVERY_GRACE_PERIOD_MS,
  MAX_SESSION_START_CHARS,
  MAX_ATTENTION_CHARS,
  STDIN_FALLBACK_MS,
  createHook,
  dedupGuard,
  readStdin,
  safeRead,
  extractYamlValue,
  readSessionState, // FU-9: normalized, handover-aware liveness reader
  statusPhase, // ENG-OBS-2: shared phase-precedence reader (exported for the regression test)
  resolveSdkUuidOwner, // ENG-OBS-2: ownership (terminal-agnostic) vs. resolveSdkUuidToSession's liveness gate
  countPattern,
  findActiveSession,
  _resetActiveSessionCache,
  findMostRecentSessionDir,
  findTeamSession,
  // Strict session ownership (act_concurrent-session-hooks_260927_001, WI-1)
  getSessionOwner,
  isOwnedBy,
  resolveOwnedSession,
  claimSession,
  // SDK-UUID -> session persisted map (OBJ-1, WI-1/WI-2/WI-5)
  _sdkMapDir,
  _sdkPointerPath,
  _pruneSdkMap,
  upsertSdkSessionMap,
  resolveSdkUuidToSession,
  removeSdkPointer,
  ensureDir,
  appendSessionEvent,
  getTimestampSlug,
  getWaypointPath,
  assignGrade,
  calculateScore,
  parseTaskList,
  areDependenciesMet,
  findAvailableWork,
  withFileLock,
  formatError,
  denyWithReason,
  warnWithReason,
  // RF-4: I/O-vs-logic fault classification (shared by agent-dispatch + createHook)
  IO_ERRNOS,
  FAIL_CLOSED_HOOKS,
  isIoError,
  describeIoError,
  handlerFailureVerdict,
  updateStatusHeartbeat
};

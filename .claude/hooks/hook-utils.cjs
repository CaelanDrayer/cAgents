#!/usr/bin/env node
/**
 * Shared Hook Utilities - Common functions for cAgents hooks
 * cAgents V9.13 - Self-contained plugin via __dirname + ${CLAUDE_PLUGIN_ROOT}
 *
 * Provides:
 * - createHook(handler) - Factory that eliminates per-hook boilerplate
 * - readStdin() - Parse JSON from stdin
 * - findActiveSession(sessionHint?) - Locate the most recent non-completed session (with optional hint to prevent parallel collision)
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

const SESSION_PREFIXES = ['run_', 'optimize_', 'review_', 'designer_', 'team_', 'org_'];

// Canonical list of terminal pipeline/phase states (single source of truth).
const TERMINAL_STATES = ['completed', 'complete', 'failed', 'aborted', 'COMPLETE', 'VALIDATED'];

// Grace period for accepting sessions without status.yaml (handles the race condition where
// the trigger agent hasn't written status.yaml yet). 5 minutes covers typical pipeline init time.
// Design intent: long enough to bridge session dir creation → first status write gap,
// short enough not to surface truly abandoned sessions as "active".
const SESSION_DISCOVERY_GRACE_PERIOD_MS = 5 * 60 * 1000;

// Character budgets for context injection (v10.6.0)
// These constants prevent hooks from injecting unbounded context into the model's window.
const MAX_SESSION_START_CHARS = 1500;  // Max chars for SessionStart additionalContext
const MAX_ATTENTION_CHARS = 500;       // Max chars for attention-injection systemMessage

/**
 * Read JSON from stdin with timeout.
 * Returns parsed object or {} on any failure.
 */
function readStdin(hookName) {
  return new Promise((resolve) => {
    let data = '';
    let resolved = false;
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    function done(result) {
      if (resolved) return;
      resolved = true;
      resolve(result);
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try { done(data ? JSON.parse(data) : {}); }
      catch { done({}); }
    });
    process.stdin.on('error', () => done({}));

    setTimeout(() => {
      if (!resolved) console.error(hookName ? `[Hook] stdin reading timed out for hook: ${hookName}` : '[hook-utils] readStdin timeout after 3s');
      done({});
    }, 3000);
  });
}

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
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Count regex pattern matches in content.
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
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

function _makeCacheKey(sessionHint, envSession, promptHint, fallback) {
  return `${sessionHint || ''}|${envSession || ''}|${promptHint || ''}|${fallback ? '1' : '0'}`;
}

/**
 * cAgents session ID format:
 *   `{command}_{slug}_{timestamp_suffix}` where command is one of
 *   run|team|designer|review|optimize|debug|org and the trailing segments
 *   carry a timestamp / counter. Canonical production form is
 *   `{command}_{slug}_{YYMMDD}_{NNN}` (e.g. `run_fix-auth_260317_001`); test
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
  const phase = extractYamlValue(content, 'pipeline_state')
    || extractYamlValue(content, 'phase')
    || extractYamlValue(content, 'current_phase');
  if (phase && TERMINAL_STATES.includes(phase)) {
    return null; // Terminal — refuse to resolve.
  }
  return dir;
}

function findActiveSession(hintOrOptions) {
  // Normalize args: accept legacy string OR options object.
  let sessionHint;
  let promptHint;
  let fallbackHeuristic = false;
  if (typeof hintOrOptions === 'string') {
    sessionHint = hintOrOptions;
  } else if (hintOrOptions && typeof hintOrOptions === 'object') {
    sessionHint = hintOrOptions.sessionHint;
    promptHint = hintOrOptions.promptHint;
    fallbackHeuristic = !!hintOrOptions.fallbackHeuristic;
  }
  const envSession = process.env.CAGENTS_ACTIVE_SESSION || undefined;
  const cacheKey = _makeCacheKey(sessionHint, envSession, promptHint, fallbackHeuristic);
  if (_cachedActiveSessions.has(cacheKey)) return _cachedActiveSessions.get(cacheKey);

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
  if (!fs.existsSync(sessionsDir)) {
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
      // SDK UUID — not a cAgents directory name. Skip step 1 entirely.
      // Do NOT cache null here — let env-var / promptHint determine the outcome.
      console.error(`[findActiveSession] sessionHint="${sessionHint}" is an SDK UUID, not a cAgents session ID; falling through to env-var/promptHint chain.`);
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
  if (envSession) {
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
    const dir = _tryResolveCandidate(sessionsDir, promptHint);
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
  const sessions = fs.readdirSync(sessionsDir)
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
  for (const session of sessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    let content = safeRead(statusFile);
    // Fallback: legacy designer sessions use session.yaml instead of status.yaml
    if (!content) {
      content = safeRead(path.join(sessionsDir, session, 'session.yaml'));
    }
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
    if (phase && !TERMINAL_STATES.includes(phase)) {
      const result = path.join(sessionsDir, session);
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

  // Third pass: scan org session subdirectories for nested team/domain sessions.
  // When /team ran inside a legacy org_* session, its session dir was nested (e.g., org_xxx/engineering/).
  // These subdirs have their own status.yaml and are not found by the top-level scan.
  // Wrapped in withFileLock to prevent concurrent hook processes from both discovering
  // the same nested session (discovery-only lock scope per REQ-013).
  const nestedDiscoveryLockPath = path.join(AGENT_MEMORY_DIR, '_system', 'nested_session_discovery');
  const nestedResult = withFileLock(nestedDiscoveryLockPath, () => {
    const orgSessions = sessions.filter(s => s.startsWith('org_'));
    for (const orgSession of orgSessions) {
      const orgPath = path.join(sessionsDir, orgSession);
      try {
        const subdirs = fs.readdirSync(orgPath).filter(d => {
          try { return fs.statSync(path.join(orgPath, d)).isDirectory(); } catch { return false; }
        });
        for (const subdir of subdirs) {
          const nestedPath = path.join(orgPath, subdir);
          const nestedStatus = path.join(nestedPath, 'status.yaml');
          const content = safeRead(nestedStatus);
          if (!content) continue;
          const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'current_phase') || extractYamlValue(content, 'pipeline_state');
          if (phase && !TERMINAL_STATES.includes(phase)) {
            console.error(`[findActiveSession] Found nested session: ${orgSession}/${subdir}`);
            return nestedPath;
          }
        }
      } catch { /* skip unreadable org dirs */ }
    }
    return null;
  });

  if (nestedResult) {
    _cachedActiveSessions.set(cacheKey, nestedResult);
    return nestedResult;
  }

  _cachedActiveSessions.set(cacheKey, null);
  return null;
}

/**
 * Clear the findActiveSession cache. Exposed for tests; production code rarely
 * needs this since cache entries are keyed by full resolution input.
 */
function _resetActiveSessionCache() {
  _cachedActiveSessions = new Map();
}

/**
 * Find the most recent active team session.
 * @param {object} input - Hook input (may contain session_id)
 * @returns {string|null} Session directory path or null
 */
function findTeamSession(input = {}) {
  // Check if session_id is provided
  if (input.session_id && input.session_id.startsWith('team_')) {
    const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', input.session_id);
    if (fs.existsSync(sessionDir)) return sessionDir;
  }

  const sessionsDir = path.join(AGENT_MEMORY_DIR, 'sessions');
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

  for (const session of teamSessions) {
    const statusFile = path.join(sessionsDir, session, 'status.yaml');
    const content = safeRead(statusFile);
    if (!content) continue;

    const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'pipeline_state');
    if (phase && !TERMINAL_STATES.includes(phase)) {
      return path.join(sessionsDir, session);
    }
  }

  // H-11: Scan org session subdirectories for nested team sessions
  // (e.g., org_xxx/engineering/ when /team ran inside a legacy org_* session)
  try {
    const orgSessions = fs.readdirSync(sessionsDir)
      .filter(d => d.startsWith('org_'))
      .sort((a, b) => {
        const partsA = a.split('_');
        const tsA = partsA.slice(-2).join('_');
        const partsB = b.split('_');
        const tsB = partsB.slice(-2).join('_');
        return tsB.localeCompare(tsA);
      });

    for (const orgSession of orgSessions) {
      const orgPath = path.join(sessionsDir, orgSession);
      try {
        const subdirs = fs.readdirSync(orgPath).filter(d => {
          try { return fs.statSync(path.join(orgPath, d)).isDirectory(); } catch { return false; }
        });
        for (const subdir of subdirs) {
          const nestedPath = path.join(orgPath, subdir);
          const nestedStatus = path.join(nestedPath, 'status.yaml');
          const content = safeRead(nestedStatus);
          if (!content) continue;
          const phase = extractYamlValue(content, 'phase') || extractYamlValue(content, 'pipeline_state');
          if (phase && !TERMINAL_STATES.includes(phase)) {
            console.error(`[findTeamSession] Found nested session: ${orgSession}/${subdir}`);
            return nestedPath;
          }
        }
      } catch { /* skip unreadable org dirs */ }
    }
  } catch { /* skip */ }

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
          // Skip sessions that are clearly completed/aborted
          const statusFile = path.join(fullPath, 'status.yaml');
          const statusContent = safeRead(statusFile);
          if (statusContent && !includeTerminal) {
            const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*(\S+)/);
            if (phaseMatch) {
              const phase = phaseMatch[1];
              if (TERMINAL_STATES.includes(phase)) {
                continue; // Skip finished sessions
              }
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
              if (!includeTerminal) {
                const statusContent = safeRead(path.join(nestedPath, 'status.yaml'));
                if (statusContent) {
                  const phaseMatch = statusContent.match(/(?:phase|pipeline_state):\s*(\S+)/);
                  if (phaseMatch) {
                    const phase = phaseMatch[1];
                    if (TERMINAL_STATES.includes(phase)) continue;
                  }
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
 * Ensure a directory exists, creating it recursively if needed.
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
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
function withFileLock(filePath, fn) {
  const lockDir = filePath + '.lock';
  const maxRetries = 100;
  const retryDelayMs = 20;
  const staleLockMs = 10000; // 10s mtime-based fallback stale threshold

  for (let i = 0; i < maxRetries; i++) {
    try {
      fs.mkdirSync(lockDir);
      // Lock acquired - write PID for liveness detection (REQ-014)
      try { fs.writeFileSync(path.join(lockDir, 'pid'), String(process.pid)); } catch { /* best effort */ }
      try {
        return fn();
      } finally {
        // Remove lock dir and PID file atomically
        try { fs.rmSync(lockDir, { recursive: true, force: true }); } catch { /* best effort */ }
      }
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
        // Busy-wait (synchronous, hooks are short-lived)
        const start = Date.now();
        while (Date.now() - start < retryDelayMs) { /* spin */ }
        continue;
      }
      // Unexpected error - run without lock rather than failing
      console.error(`[withFileLock] Unexpected error: ${err.message}, proceeding without lock`);
      return fn();
    }
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
    // Key on hook name + first 200 chars of stringified input (captures tool_name, session_id, etc.)
    const inputSnippet = JSON.stringify(input).slice(0, 200);
    const hash = crypto.createHash('md5').update(hookName + inputSnippet).digest('hex').slice(0, 12);
    const dedupFile = path.join(os.tmpdir(), `cagents-dedup-${hookName}-${hash}`);

    // Exclusive create: fails with EEXIST if another invocation already created it
    const fd = fs.openSync(dedupFile, 'wx');
    fs.closeSync(fd);

    // Schedule cleanup: both on process exit (for short-lived subprocess invocations
    // where process exits before the timer fires) and via timeout fallback.
    // Without process.on('exit'), tests that run the hook via execSync would leave
    // stale dedup files that cause the next identical invocation to be skipped.
    process.on('exit', () => { try { fs.unlinkSync(dedupFile); } catch {} });
    setTimeout(() => { try { fs.unlinkSync(dedupFile); } catch {} }, 2000);
    return false; // Not a duplicate — proceed
  } catch (e) {
    if (e.code === 'EEXIST') return true; // Duplicate invocation — skip
    return false; // On any other error, proceed (don't block hooks on dedup failure)
  }
}

function createHook(name, handler) {
  async function run() {
    try {
      const input = await readStdin(name);

      // Dedup guard: skip if another invocation of the same hook with the same input is already running
      if (dedupGuard(name, input)) {
        console.log(JSON.stringify({ continue: true }));
        return;
      }

      try {
        const result = await handler(input);

        if (!result) {
          console.log(JSON.stringify({ continue: true }));
          return;
        }

        // Shorthand: { deny: true, reason: "..." } -> full PreToolUse deny response
        if (result.deny) {
          console.log(JSON.stringify({
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
            console.log(JSON.stringify({
              hookSpecificOutput: {
                hookEventName: 'PermissionRequest',
                decision: {
                  behavior: 'allow'
                }
              }
            }));
          } else {
            console.log(JSON.stringify({
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

        console.log(JSON.stringify(result));

      } catch (error) {
        console.error(`[${name}] Error: ${error.message}`);
        console.log(JSON.stringify({ continue: true }));
      }

    } catch (e) {
      // Fatal error (e.g., stdin read failure)
      console.log(JSON.stringify({ continue: true }));
    }
  }

  run();
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

module.exports = {
  PROJECT_ROOT,
  PLUGIN_ROOT,
  AGENT_MEMORY_DIR,
  SESSION_PREFIXES,
  TERMINAL_STATES,
  SESSION_DISCOVERY_GRACE_PERIOD_MS,
  MAX_SESSION_START_CHARS,
  MAX_ATTENTION_CHARS,
  createHook,
  dedupGuard,
  readStdin,
  safeRead,
  extractYamlValue,
  countPattern,
  findActiveSession,
  _resetActiveSessionCache,
  findMostRecentSessionDir,
  findTeamSession,
  ensureDir,
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
  updateStatusHeartbeat
};

#!/usr/bin/env node
/**
 * Session Stop Hook - Cleanup agent trees for ALL session types + team metrics
 * cAgents V10.24.3 - Extended from team-only to all session types
 *
 * Runs on SessionEnd to:
 * 1. Clean up agent_tree.yaml for ANY active session (act_*, team_*, org_*, designer_*, legacy run_*, etc.)
 *    by marking unstopped agents with stopped_at timestamps and computing durations.
 * 2. Finalize team-specific metrics and update status (team_* sessions only).
 *
 * NOTE: SessionEnd hooks have configurable timeout via CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS.
 * All writeFileSync calls are individually try-catch guarded for resilience
 * against partial failures or context truncation.
 *
 * Input (stdin): JSON with session context
 * Output (stdout): JSON with system message
 */

// -----------------------------------------------------------------------------
// TEAM-COORDINATION SCOPE NOTE (v12.42.0). Teams are IMPLICIT since Claude Code
// 2.1.178 (TeamCreate/TeamDelete were removed). This hook's TEAM-TEAMMATE
// COORDINATION handling — the per-teammate timing/parallelism metrics and team
// status finalization (Phase 3, team_* sessions only) — supports the OPTIONAL
// experimental named-background-teammate path (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1)
// and is a NO-OP on the DEFAULT concurrent-Agent wave model, which uses no named
// teammates.
//
// IMPORTANT — do NOT treat the whole hook as a no-op: the remaining phases are a
// UNIVERSAL SessionEnd routine that runs for EVERY session type (act_*, team_*,
// designer_*, etc.) and the default path DOES depend on them — Phase 1 agent-tree
// cleanup, Phase 2 execution_summary.yaml generation, Phase 4 pattern-extractor
// throttle, and Phase 5 SDK-UUID pointer unlink. Those must keep running on the
// default path; only Phase 3's team-teammate metrics are experimental-path-scoped.
// No behavior is changed by this note.
// -----------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
// Defensive: js-yaml is a declared dependency but guard against missing install
let yaml;
try { yaml = require('js-yaml'); } catch { yaml = null; }
const { createHook, findTeamSession, resolveSession, isOwnedBy, safeRead, extractYamlValue, countPattern, withFileLock, ensureDir, AGENT_MEMORY_DIR, removeSdkPointer, sessionGenuinelyValidated, statusPhase, isTerminalState } = require('./hook-utils.cjs');

// Defensive: REC-01 terminal-state normalizer (v12.46.0). Guarded in the same
// try/catch style as the js-yaml require above so an older hook-utils.cjs without
// these exports can't crash teardown. Consumed only to keep team-stop's inline
// terminal vocabulary consistent (Phase 2 owns the actual status-default derivation).
let _normalizeTerminalState;
try { ({ normalizeTerminalState: _normalizeTerminalState } = require('./hook-utils.cjs')); } catch { _normalizeTerminalState = null; }
const _normTerminal = (s) => (typeof _normalizeTerminalState === 'function' ? _normalizeTerminalState(s) : (typeof s === 'string' ? s.trim() : s));

// SDK transcript UUID shape (8-4-4-4-12 hex). Matches the per-session
// {sessionDir}/session.sdk_id marker written by the map-writer hooks (WI-3/WI-4).
const SDK_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Liveness guard for the Phase 2 terminal-status stamp.
 *
 * BUG THIS FIXES: Phase 2 used to rewrite `phase: completed` +
 * `pipeline_state: VALIDATED` UNCONDITIONALLY for the resolved team_* session.
 * SessionEnd fires when a CLAUDE CODE session ends, but a `/team` program can
 * span many Claude Code sessions across days — so ending any one of them
 * stamped a still-mid-flight program terminal. A terminal phase makes
 * `findActiveSession()` return null, which makes `session-init-gate.cjs`
 * hard-deny EVERY subsequent Agent spawn. The failure is silent and total.
 *
 * Observed 5 times in `team_load-cut-program_260804_001` (its status.yaml
 * carries `terminal_reset_recurrences: 5` plus per-occurrence notes); two
 * recurrences were pinned to the moment immediately after a merge, i.e. a
 * Claude Code session ending while the program was mid-wave. It was once
 * misdiagnosed as "the Agent tool is absent at depth 3".
 *
 * This mirrors the two positive signals of `sessionActivelyWorking()` in
 * `verify-completion.cjs`. It is deliberately a LOCAL copy rather than a shared
 * import: that function depends on two further local helpers in the repo's most
 * test-covered hook, and hoisting all three to hook-utils.cjs to fix a
 * teardown-ordering bug would be a refactor well past the minimum viable change
 * (see `.claude/rules/playbooks/pat-minimal-solution-ladder.md`, rung 6). The
 * REC-04 0-child gate is intentionally NOT copied: a team session that spawned
 * nothing is finished, not mid-flight, and must still be stamped terminal.
 *
 * Fails toward stamping (returns false) on any error, preserving prior behavior
 * whenever liveness cannot be established.
 *
 * @param {string} sessionDir - resolved team session directory
 * @param {string} statusContent - already-read status.yaml contents
 * @returns {boolean} true when the session looks mid-flight
 */
function teamSessionActivelyWorking(sessionDir, statusContent) {
  try {
    // (i) A running child agent: `stopped_at: null` inside the child `agents:`
    //     region. The top-level `root:` block is excluded — its stopped_at is
    //     null for the whole open session and would match everything.
    const treeContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
    if (treeContent) {
      const parts = treeContent.split(/^agents:/m);
      if (parts.length > 1 && /stopped_at:\s*null/.test(parts[1])) return true;
    }

    // (ii) A fresh heartbeat: last_updated_at inside the liveness window.
    if (statusContent) {
      const hb = statusContent.match(/last_updated_at:\s*"?([^"\n]+)"?/);
      if (hb) {
        const livenessMs = parseInt(process.env.CAGENTS_SESSION_LIVENESS_MS || '60000', 10);
        const hbMs = Date.parse(hb[1]);
        if (!isNaN(hbMs) && (Date.now() - hbMs) < livenessMs) return true;
      }
    }

    return false;
  } catch (e) {
    console.error(`[SessionStop] teamSessionActivelyWorking error (treating as not-working): ${e.message}`);
    return false;
  }
}

/**
 * HS-4 idle-lead exemption: is this /team session idle BETWEEN waves?
 *
 * Design: team_hook-session-fixes_261015_001 outputs/wave_3/WI-9/idle-lead-design.md
 * section 3 (option D). A /team lead that has finished a gated wave and has not
 * yet spawned the next one has no running child and no fresh heartbeat, so the
 * liveness signals above say "idle". This positive predicate tells that case
 * apart from a stalled new session by on-disk evidence a stall cannot produce:
 * a recorded passing gate plus a declared later wave.
 *
 * Returns true only when ALL hold:
 *   1. the session dir is `team_*`;
 *   2. its phase exists and is not terminal;
 *   3. the latest `workflow/gate_validations/wave_<K>.yaml` says
 *      `overall: PASS | CONDITIONAL_PASS` (no gates, or FAIL/HOLD -> false);
 *   4. a later wave is pending: `work_meta.yaml` `waves[].wave` max > K
 *      (else `total_waves: N`, 0-based: K < N-1), else `team/task_list.yaml`
 *      has an item with `wave:` > K and status pending/not_started/in_progress;
 *   5. last activity (status `last_updated_at`, latest gate mtime,
 *      `workflow/events.jsonl` mtime) is younger than CAGENTS_IDLE_LEAD_MAX_MS
 *      (default 24 h). status.yaml / agent_tree.yaml mtimes are excluded on
 *      purpose: hooks rewrite them, and a self-write must not refresh liveness.
 *
 * Fails toward "not idle" (false) on any error, which keeps today's behavior.
 * Exported (see module.exports at the bottom) so verify-completion.cjs can share
 * this one copy at Stop (WI-13b) instead of duplicating it.
 *
 * @param {string} sessionDir - resolved session directory
 * @param {string|null} statusContent - already-read status.yaml contents
 * @param {number} [nowMs=Date.now()] - clock injection for tests
 * @returns {{idle: true, gate: string, lastWave: number}|false}
 *   a truthy detail object when idle, false otherwise
 */
function teamIdleBetweenWaves(sessionDir, statusContent, nowMs = Date.now()) {
  try {
    // 1. team session
    if (!sessionDir || !path.basename(sessionDir).startsWith('team_')) return false;

    // 2. not terminal
    const phase = statusPhase(statusContent);
    if (!phase || isTerminalState(phase)) return false;

    // 3. latest recorded gate passed. Files: wave_<int>[suffix].yaml (wave_5b
    //    sorts after wave_5). Ordering is (int, suffix).
    const gateDir = path.join(sessionDir, 'workflow', 'gate_validations');
    let gates;
    try { gates = fs.readdirSync(gateDir); } catch { return false; }
    let latest = null;
    for (const f of gates) {
      const m = f.match(/^wave_(\d+)([a-z]*)\.yaml$/);
      if (!m) continue;
      const k = parseInt(m[1], 10);
      if (!latest || k > latest.k || (k === latest.k && m[2] > latest.suffix)) {
        latest = { k, suffix: m[2], file: f };
      }
    }
    if (!latest) return false;
    const gatePath = path.join(gateDir, latest.file);
    const gateContent = safeRead(gatePath);
    if (!gateContent || !/^\s*overall:\s*["']?(PASS|CONDITIONAL_PASS)\b/m.test(gateContent)) return false;
    const kmax = latest.k;

    // 4. a later wave is still pending
    let lastWave = null;
    const meta = safeRead(path.join(sessionDir, 'workflow', 'work_meta.yaml'));
    if (meta) {
      const waves = [...meta.matchAll(/^\s*-\s*wave:\s*["']?(\d+)/gm)].map((x) => parseInt(x[1], 10));
      if (waves.length) {
        lastWave = Math.max(...waves);
      } else {
        const tw = meta.match(/^total_waves:\s*(\d+)/m);
        if (tw) lastWave = parseInt(tw[1], 10) - 1;
      }
    }
    let pending = lastWave !== null && kmax < lastWave;
    if (lastWave === null) {
      const tasks = safeRead(path.join(sessionDir, 'team', 'task_list.yaml'));
      if (tasks) {
        for (const item of tasks.split(/^\s*-\s+/m).slice(1)) {
          const w = item.match(/^\s*wave:\s*["']?(\d+)/m);
          const st = item.match(/^\s*status:\s*["']?([a-z_]+)/m);
          if (w && st && parseInt(w[1], 10) > kmax && /^(pending|not_started|in_progress)$/.test(st[1])) {
            pending = true;
            break;
          }
        }
      }
    }
    if (!pending) return false;

    // 5. not abandoned
    const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };
    let lastActivityMs = Math.max(mtime(gatePath), mtime(path.join(sessionDir, 'workflow', 'events.jsonl')));
    const hb = statusContent && statusContent.match(/last_updated_at:\s*["']?([^"'\n]+)["']?/);
    if (hb) {
      const hbMs = Date.parse(hb[1]);
      if (!isNaN(hbMs)) lastActivityMs = Math.max(lastActivityMs, hbMs);
    }
    const maxIdleRaw = parseInt(process.env.CAGENTS_IDLE_LEAD_MAX_MS || '', 10);
    const maxIdleMs = Number.isFinite(maxIdleRaw) && maxIdleRaw > 0 ? maxIdleRaw : 86400000;
    if (!(lastActivityMs > 0) || (nowMs - lastActivityMs) >= maxIdleMs) return false;

    return { idle: true, gate: latest.file.replace(/\.yaml$/, ''), lastWave: lastWave === null ? kmax + 1 : lastWave };
  } catch (e) {
    console.error(`[SessionStop] teamIdleBetweenWaves error (treating as not idle): ${e.message}`);
    return false;
  }
}

// =============================================================================
// P1-4: Pattern Extractor Runtime Wiring (24h throttle)
// =============================================================================

/**
 * Resolve the cagents-memory root, honoring CAGENTS_TEST_ROOT for sandboxed tests.
 * Production path is AGENT_MEMORY_DIR (PROJECT_ROOT/cagents-memory), so a
 * plugin install resolves the user's project, not the plugin checkout.
 */
function resolveMemoryRoot() {
  if (process.env.CAGENTS_TEST_ROOT) {
    return path.join(process.env.CAGENTS_TEST_ROOT, 'cagents-memory');
  }
  return AGENT_MEMORY_DIR; // HS-4 (e): one memory root (CLAUDE_PROJECT_DIR-aware), not __dirname
}

/**
 * Resolve the pattern-extractor.cjs path. CAGENTS_PATTERN_EXTRACTOR_OVERRIDE
 * is honored so tests can swap in a stub script.
 */
function resolveExtractorPath() {
  if (process.env.CAGENTS_PATTERN_EXTRACTOR_OVERRIDE) {
    return process.env.CAGENTS_PATTERN_EXTRACTOR_OVERRIDE;
  }
  return path.join(__dirname, '..', '..', 'scripts', 'knowledge', 'pattern-extractor.cjs');
}

const SENTINEL_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Conditionally spawn pattern-extractor.cjs after team metrics finalize.
 *
 * Throttle: if `_knowledge/patterns/.last-extracted` was touched <24h ago,
 * skip and log "throttled". Otherwise spawn the extractor detached/unref'd
 * (fire-and-forget — never blocks team-stop) and touch the sentinel.
 *
 * Errors are swallowed — team-stop must never fail because of extraction.
 *
 * @returns {string} Status string for systemMessage: 'invoked', 'throttled',
 *   'no-extractor', or 'error: <msg>'
 */
function maybeExtractPatterns() {
  try {
    const memoryRoot = resolveMemoryRoot();
    const patternsDir = path.join(memoryRoot, '_knowledge', 'patterns');
    const sentinelPath = path.join(patternsDir, '.last-extracted');
    const extractorPath = resolveExtractorPath();

    // Check extractor exists (precondition)
    if (!fs.existsSync(extractorPath)) {
      console.error(`[SessionStop] pattern-extractor not found at ${extractorPath} — skipping`);
      return 'no-extractor';
    }

    // Sentinel throttle: skip if <24h old
    if (fs.existsSync(sentinelPath)) {
      try {
        const mtimeMs = fs.statSync(sentinelPath).mtimeMs;
        const ageMs = Date.now() - mtimeMs;
        if (ageMs < SENTINEL_THROTTLE_MS) {
          const hoursAgo = (ageMs / 3600000).toFixed(1);
          console.error(`[SessionStop] pattern-extractor throttled (last run ${hoursAgo}h ago, <24h)`);
          return 'throttled';
        }
      } catch (e) {
        console.error(`[SessionStop] sentinel stat failed: ${e.message} — proceeding with extraction`);
      }
    }

    // Ensure patterns dir exists before sentinel write
    try {
      ensureDir(patternsDir);
    } catch (e) {
      console.error(`[SessionStop] failed to ensure patterns dir: ${e.message}`);
    }

    // Spawn extractor detached + unref'd — fire-and-forget
    try {
      const child = spawn('node', [extractorPath, 'extract', '--save'], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      // Touch sentinel immediately so concurrent team-stops don't double-fire
      fs.writeFileSync(sentinelPath, new Date().toISOString() + '\n');
      console.error(`[SessionStop] pattern-extractor spawned (pid=${child.pid})`);
      return 'invoked';
    } catch (e) {
      console.error(`[SessionStop] pattern-extractor spawn failed: ${e.message}`);
      return `error: ${e.message}`;
    }
  } catch (e) {
    // Outer catch — never let extraction failures propagate
    console.error(`[SessionStop] maybeExtractPatterns outer error: ${e.message}`);
    return `error: ${e.message}`;
  }
}

// =============================================================================
// REC-19 (v12.52.0): Session GC Runtime Wiring (24h throttle)
// =============================================================================

/**
 * Resolve the session-gc.cjs path. CAGENTS_SESSION_GC_OVERRIDE is honored so
 * tests can swap in a stub script (mirrors CAGENTS_PATTERN_EXTRACTOR_OVERRIDE).
 */
function resolveSessionGcPath() {
  if (process.env.CAGENTS_SESSION_GC_OVERRIDE) {
    return process.env.CAGENTS_SESSION_GC_OVERRIDE;
  }
  return path.join(__dirname, '..', '..', 'scripts', 'maintenance', 'session-gc.cjs');
}

/**
 * Conditionally spawn scripts/maintenance/session-gc.cjs to sweep old terminal
 * sessions. Same proven fire-and-forget pattern as maybeExtractPatterns:
 *
 * Throttle: if `_system/.last-gc` was touched <24h ago, skip. Otherwise spawn
 * session-gc.cjs `--yes` detached/unref'd (fire-and-forget — never blocks
 * team-stop) and touch the sentinel. Runs for ALL session types (the sweep is a
 * global sweep of cagents-memory/sessions/, not scoped to the ending session).
 *
 * Fail-open: errors are swallowed — team-stop must never fail because of GC.
 *
 * @returns {string} 'invoked' | 'throttled' | 'no-gc' | 'error: <msg>'
 */
function maybeRunSessionGc() {
  try {
    // Test-hermeticity guard: the destructive GC (mv/rm of session dirs) must
    // never sweep the REAL repo when a test harness invokes team-stop against
    // process.cwd()/cagents-memory (e.g. tests/hooks/team-stop.test.js runs the
    // real hook un-sandboxed). Under vitest, only proceed when an explicit stub
    // override is set (the session-gc wiring test, which points at a harmless
    // stub). Production (VITEST unset) always runs. This mirrors why the
    // pattern-extractor is safe un-sandboxed (read-mostly) — GC is destructive,
    // so it needs the guard.
    if (process.env.VITEST && !process.env.CAGENTS_SESSION_GC_OVERRIDE) {
      return 'skipped-test';
    }
    const memoryRoot = resolveMemoryRoot();
    const systemDir = path.join(memoryRoot, '_system');
    const sentinelPath = path.join(systemDir, '.last-gc');
    const gcPath = resolveSessionGcPath();

    if (!fs.existsSync(gcPath)) {
      console.error(`[SessionStop] session-gc not found at ${gcPath} — skipping`);
      return 'no-gc';
    }

    // Sentinel throttle: skip if <24h old
    if (fs.existsSync(sentinelPath)) {
      try {
        const ageMs = Date.now() - fs.statSync(sentinelPath).mtimeMs;
        if (ageMs < SENTINEL_THROTTLE_MS) {
          const hoursAgo = (ageMs / 3600000).toFixed(1);
          console.error(`[SessionStop] session-gc throttled (last run ${hoursAgo}h ago, <24h)`);
          return 'throttled';
        }
      } catch (e) {
        console.error(`[SessionStop] gc sentinel stat failed: ${e.message} — proceeding with GC`);
      }
    }

    try {
      ensureDir(systemDir);
    } catch (e) {
      console.error(`[SessionStop] failed to ensure _system dir: ${e.message}`);
    }

    try {
      const child = spawn('node', [gcPath, '--yes'], { detached: true, stdio: 'ignore' });
      child.unref();
      // Touch sentinel immediately so concurrent team-stops don't double-fire
      fs.writeFileSync(sentinelPath, new Date().toISOString() + '\n');
      console.error(`[SessionStop] session-gc spawned (pid=${child.pid})`);
      return 'invoked';
    } catch (e) {
      console.error(`[SessionStop] session-gc spawn failed: ${e.message}`);
      return `error: ${e.message}`;
    }
  } catch (e) {
    console.error(`[SessionStop] maybeRunSessionGc outer error: ${e.message}`);
    return `error: ${e.message}`;
  }
}

/**
 * Clean up agent_tree.yaml: mark all unstopped agents with stopped_at,
 * compute duration_seconds from spawned_at, and set a cleanup summary.
 * Uses js-yaml for proper YAML parsing instead of regex replacement.
 *
 * @param {string} sessionDir - Session directory path
 * @param {string} now - ISO timestamp for stopped_at
 * @returns {number} Number of agents cleaned up
 */
function cleanupAgentTree(sessionDir, now) {
  const treeFile = path.join(sessionDir, 'workflow', 'agent_tree.yaml');
  const treeContent = safeRead(treeFile);
  if (!treeContent) return 0;

  // Quick check: if no unstopped agents, skip parsing
  if (!treeContent.includes('stopped_at: null')) return 0;

  let cleanedCount = 0;

  withFileLock(treeFile, () => {
    // Re-read inside lock to avoid TOCTOU race
    const lockedContent = safeRead(treeFile);
    if (!lockedContent || !lockedContent.includes('stopped_at: null')) return;

    let parsed;
    try {
      if (!yaml) throw new Error('js-yaml not available');
      parsed = yaml.load(lockedContent);
    } catch (parseErr) {
      console.error(`[SessionStop] Malformed agent_tree.yaml or js-yaml unavailable — falling back to regex cleanup: ${parseErr.message}`);
      // Fallback: regex replacement (original M-07 behavior)
      const cleaned = lockedContent.replace(/stopped_at: null/g, `stopped_at: "${now}"`);
      try { fs.writeFileSync(treeFile, cleaned); } catch (e) {
        console.error(`[SessionStop] Failed regex fallback write: ${e.message}`);
      }
      return;
    }

    if (!parsed || !Array.isArray(parsed.agents)) return;

    const nowMs = new Date(now).getTime();

    for (const agent of parsed.agents) {
      if (agent.stopped_at === null || agent.stopped_at === undefined) {
        agent.stopped_at = now;
        agent.completion_summary = 'Session ended — stop event cleanup';

        // Compute duration from spawned_at if available
        if (agent.spawned_at) {
          const spawnedMs = new Date(agent.spawned_at).getTime();
          if (!isNaN(spawnedMs) && spawnedMs > 0) {
            agent.duration_seconds = Math.max(0, Math.round((nowMs - spawnedMs) / 1000));
          }
        }

        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      try {
        fs.writeFileSync(treeFile, yaml.dump(parsed));
      } catch (e) {
        console.error(`[SessionStop] Failed to write cleaned agent_tree: ${e.message}`);
      }
    }
  });

  return cleanedCount;
}

/**
 * Generate a minimal execution_summary.yaml from status.yaml + agent_tree.yaml
 * if one does not already exist. Works for all session types.
 *
 * @param {string} sessionDir - Session directory path
 * @param {string} now - ISO timestamp
 */
function generateExecutionSummary(sessionDir, now) {
  const summaryPath = path.join(sessionDir, 'workflow', 'execution_summary.yaml');
  // Don't overwrite skill-generated summaries
  if (fs.existsSync(summaryPath)) return;

  const statusContent = safeRead(path.join(sessionDir, 'status.yaml'));
  if (!statusContent) return;

  // Extract fields from status.yaml
  const sessionId = extractYamlValue(statusContent, 'session_id') || path.basename(sessionDir);
  const pipelineState = extractYamlValue(statusContent, 'pipeline_state');
  const phase = extractYamlValue(statusContent, 'phase');
  const finalState = pipelineState || phase || 'unknown';
  const createdAt = extractYamlValue(statusContent, 'created_at');
  const result = extractYamlValue(statusContent, 'result');

  // Determine status string.
  // REC-03 honesty (v12.47.0): the default is NOT an unconditional `completed`.
  // A 0-agent / mid-flight stall (e.g. an INIT session that never spawned the
  // orchestrator) previously defaulted to `completed`, laundering a stall into a
  // success. Now only a GENUINELY-validated session (a real, non-safety-net PASS
  // report + — for plan-bearing sessions — a completed coordination_log) is
  // `completed`; everything else is `incomplete`. Explicit `failed`/`partial`
  // signals from status.yaml still win first. Shares the exact honesty
  // discriminator with verify-completion.cjs (single source of truth in
  // hook-utils.cjs) so the two hooks can never disagree.
  let status;
  if (result === 'failed' || _normTerminal(finalState) === 'failed') {
    status = 'failed';
  } else if (result === 'partial') {
    status = 'partial';
  } else if (sessionGenuinelyValidated(sessionDir, statusContent)) {
    status = 'completed';
  } else {
    status = 'incomplete';
  }

  // Count agents from agent_tree.yaml.
  // Fix M-24 (audit team_hooks-review_260602_001): subagent-tracker.cjs writes
  // entries as `- id:` (not `- agent_id:`), so the previous regex always returned 0.
  // Preferred fix is yaml.load (eliminates a class of regex-fragility bugs);
  // falls back to a corrected `- id:` regex if yaml is unavailable.
  let agentCount = 0;
  const treeContent = safeRead(path.join(sessionDir, 'workflow', 'agent_tree.yaml'));
  if (treeContent) {
    try {
      if (yaml) {
        const parsedTree = yaml.load(treeContent);
        if (parsedTree && Array.isArray(parsedTree.agents)) {
          agentCount = parsedTree.agents.length;
        }
      } else {
        throw new Error('js-yaml not available');
      }
    } catch (_e) {
      // Fallback regex matches the actual key written by subagent-tracker.cjs
      const matches = treeContent.match(/^\s*- id:/gm);
      agentCount = matches ? matches.length : 0;
    }
  }

  // Compute duration
  let durationSeconds = 0;
  if (createdAt) {
    const startMs = new Date(createdAt).getTime();
    if (!isNaN(startMs) && startMs > 0) {
      durationSeconds = Math.max(0, Math.round((Date.now() - startMs) / 1000));
    }
  }

  const summaryYaml = [
    `session_id: "${sessionId}"`,
    `final_state: ${finalState}`,
    `status: ${status}`,
    `agent_count: ${agentCount}`,
    `duration_seconds: ${durationSeconds}`,
    `started_at: "${createdAt || now}"`,
    `completed_at: "${now}"`,
    `generated_by: session-stop-hook`,
  ].join('\n') + '\n';

  try {
    ensureDir(path.join(sessionDir, 'workflow'));
    fs.writeFileSync(summaryPath, summaryYaml);
    console.error(`[SessionStop] Generated execution_summary.yaml for ${path.basename(sessionDir)}`);
  } catch (e) {
    console.error(`[SessionStop] Failed to write execution_summary.yaml: ${e.message}`);
  }
}

/**
 * WI-5 (reaping / GC): explicit unlink of the finishing session's own
 * SDK-UUID -> session pointer at finalization.
 *
 * Reads the per-session marker {sessionDir}/session.sdk_id (written best-effort
 * by the map-writer hooks/skills). If it holds an SDK-UUID-shaped value, unlink
 * that UUID's global pointer under cagents-memory/_system/sdk_session_map/ via
 * removeSdkPointer() so the registry does not retain a dead pointer once this
 * session ends. The per-session marker itself self-cleans with the session
 * directory, so it is intentionally left in place.
 *
 * Fail-open contract: this NEVER throws and NEVER blocks teardown. Every file op
 * is individually try/catch-guarded, so a mid-run SessionEnd cancellation (Claude
 * Code teardown) cannot corrupt state — worst case the pointer is reaped later by
 * the lazy-reap path inside resolveSdkUuidToSession.
 *
 * @param {string} sessionDir - The finishing session's directory, already
 *   resolved by team-stop for its own finalization. NOT a newest-session guess.
 */
function reapSdkPointer(sessionDir) {
  try {
    if (!sessionDir) return;
    const markerPath = path.join(sessionDir, 'session.sdk_id');
    let uuid;
    try {
      uuid = fs.readFileSync(markerPath, 'utf8').trim();
    } catch {
      return; // no marker (or unreadable) — nothing to reap
    }
    if (!SDK_UUID_RE.test(uuid)) return; // not an SDK UUID — no-op
    // removeSdkPointer is itself SDK_UUID_RE-guarded, idempotent, lock-protected,
    // and never throws.
    removeSdkPointer(uuid);
    console.error(`[SessionStop] Reaped SDK pointer for ${path.basename(sessionDir)} (${uuid})`);
  } catch (e) {
    // Fail-open: teardown must never fail because pointer reaping did.
    try { console.error(`[SessionStop] SDK pointer reap skipped: ${e.message}`); } catch { /* ignore */ }
  }
}

// Standalone registration. Suppressed when another hook require()s this module
// only to import teamIdleBetweenWaves (it sets CAGENTS_DISPATCH_IMPORT before the
// require, as write-edit-dispatch.cjs does), so this createHook() does not also
// read stdin. A `require.main === module` guard is not usable: under run-hook.cjs
// require.main is the launcher.
if (!process.env.CAGENTS_DISPATCH_IMPORT) createHook('SessionEnd', async (input) => {
  const now = new Date().toISOString();
  let summary = '';

  // --- Phase 1: Agent tree cleanup for ANY session type ---
  // Strict ownership. SessionEnd finalizes only the session this transcript
  // owns. A UUID payload resolves through its owned pointer/marker (terminal
  // sessions allowed, since SessionEnd finalizes them). A non-UUID payload is
  // an exact cAgents session id pin, used as a dir name. There is no newest
  // session guess: with no owned session, Phase 1 is skipped.
  // HS-1: a UUID payload uses the shared resolveSession chain, purpose 'record'
  // (terminal-inclusive, since SessionEnd finalizes terminal sessions too), no
  // claim side effect, and allowEnv:false: CAGENTS_ACTIVE_SESSION never stands
  // in for ownership here, so with no owned session Phase 1 is skipped.
  const payloadUuid = SDK_UUID_RE.test(input.session_id || '') ? input.session_id : null;
  let anySession = null;
  if (payloadUuid) {
    anySession = resolveSession(input, { purpose: 'record', claimHint: false, allowEnv: false });
  } else if (input.session_id && input.session_id === path.basename(input.session_id)) {
    // Exact cAgents session id pin (legacy / test payload): the named dir.
    const direct = path.join(AGENT_MEMORY_DIR, 'sessions', input.session_id);
    if (fs.existsSync(direct)) anySession = direct;
  }
  let agentTreeSessionDir = null;

  // ORDERING (load-bearing): capture the liveness verdict BEFORE Phase 1 runs.
  // cleanupAgentTree() rewrites every `stopped_at: null` to a timestamp, which
  // DESTROYS the running-child signal Phase 2's terminal-state guard depends on.
  // Reading it afterwards would see a tree this same hook just marked finished
  // and conclude the session is idle. Pinned by
  // tests/hooks/team-stop-liveness-guard.test.js.
  let activelyWorkingAtEntry = false;
  // HS-4 idle-lead exemption (WI-9 design section 4a): captured before Phase 1
  // for the same ordering reason. False for every non-team / terminal session.
  let idleBetweenWavesAtEntry = false;
  if (anySession) {
    const entryStatus = safeRead(path.join(anySession, 'status.yaml'));
    activelyWorkingAtEntry = teamSessionActivelyWorking(anySession, entryStatus);
    idleBetweenWavesAtEntry = teamIdleBetweenWaves(anySession, entryStatus);
  }

  if (anySession) {
    agentTreeSessionDir = anySession;
    const cleanedCount = cleanupAgentTree(anySession, now);
    if (cleanedCount > 0) {
      console.error(`[SessionStop] Cleaned ${cleanedCount} unstopped agent(s) in ${path.basename(anySession)}`);
      summary += `Agent tree cleanup: ${cleanedCount} agent(s) marked stopped in ${path.basename(anySession)}\n`;
    }
  }

  // --- Phase 1b: Generate execution_summary.yaml if missing (ALL session types) ---
  // Skipped for a /team lead idle between waves: the summary would say
  // `status: incomplete`, and nothing overwrites it once the program resumes.
  if (anySession && !idleBetweenWavesAtEntry) {
    generateExecutionSummary(anySession, now);
  }

  // --- Phase 1c: WI-5 reaping — unlink this finishing session's own SDK pointer ---
  // Explicit unlink at finalization so the sdk_session_map/ registry does not
  // retain a dead pointer. Reuses the sessionDir team-stop already resolved for
  // its own finalization (no newest-session heuristic). Fail-open — never blocks
  // teardown. Runs for ALL session types (act_/team_/designer_), since the
  // pointer is created for any of them.
  if (anySession) {
    reapSdkPointer(anySession);
  }

  // --- Phase 1d: REC-19 session GC (24h throttle, fire-and-forget, ALL session types) ---
  // The sweep is global (archives old terminal sessions, deletes long-archived
  // ones, always skips live/recent/mid-flight/fixture sessions), so it runs for
  // every session type — not just team_* — right alongside the pattern-extractor
  // pattern. Never blocks teardown.
  const gcStatus = maybeRunSessionGc();
  if (gcStatus === 'invoked') {
    console.error('[SessionStop] Session GC: spawned (background)'); // HS-11: bookkeeping, stderr only
  }

  // --- Phase 2: Team-specific metrics and status (team_* sessions only) ---
  // With a UUID payload, only a team session owned by that UUID qualifies.
  // The owned Phase 1 session is used first, because findTeamSession skips
  // terminal team sessions on its UUID path.
  // With no session_id at all, skip Phase 2. findTeamSession would fall back to
  // the newest team session, and nothing proves who owns it.
  let teamSessionDir = null;
  if (payloadUuid) {
    if (anySession && path.basename(anySession).startsWith('team_')) {
      teamSessionDir = anySession;
    } else {
      const candidate = findTeamSession(input);
      if (candidate && isOwnedBy(candidate, payloadUuid)) teamSessionDir = candidate;
    }
  } else if (input.session_id) {
    teamSessionDir = findTeamSession(input);
  }
  if (!teamSessionDir) {
    // No team session — return agent tree cleanup summary if any
    if (summary) {
      return { continue: true, systemMessage: summary.trimEnd() };
    }
    return null;
  }

  // If team session differs from the session already cleaned, also clean its agent tree
  if (teamSessionDir !== agentTreeSessionDir) {
    const teamCleaned = cleanupAgentTree(teamSessionDir, now);
    if (teamCleaned > 0) {
      console.error(`[SessionStop] Cleaned ${teamCleaned} unstopped agent(s) in team session ${path.basename(teamSessionDir)}`);
    }
  }

  const metricsDir = path.join(teamSessionDir, 'team', 'metrics');
  const statusFile = path.join(teamSessionDir, 'status.yaml');

  // HS-4 idle-lead exemption. Prefer the entry verdict when Phase 1 and Phase 2
  // resolved the same session; otherwise evaluate the Phase 2 session now.
  const idleBetweenWaves = (teamSessionDir === anySession && idleBetweenWavesAtEntry)
    || teamIdleBetweenWaves(teamSessionDir, safeRead(statusFile));

  // Calculate metrics
  const metrics = { items_completed: 0, items_total: 0, duration_seconds: 0, speedup_factor: 0 };

  const taskContent = safeRead(path.join(teamSessionDir, 'team', 'task_list.yaml'));
  if (taskContent) {
    const completedMatch = taskContent.match(/completed:\s*(\d+)/);
    const totalMatch = taskContent.match(/total:\s*(\d+)/);
    if (completedMatch) metrics.items_completed = parseInt(completedMatch[1], 10);
    if (totalMatch) metrics.items_total = parseInt(totalMatch[1], 10);
  }

  // Finalize timing
  const timingFile = path.join(metricsDir, 'timing.yaml');
  const timingContent = safeRead(timingFile);
  if (timingContent && !idleBetweenWaves) {
    // Idle between waves: the program has not finished, so completed_at /
    // total_duration_seconds are not written.
    const startMatch = timingContent.match(/started_at:\s*"([^"]+)"/);
    if (startMatch) {
      const startMs = new Date(startMatch[1]).getTime();
      // Guard against NaN/negative: only compute if startMs is a valid timestamp
      if (!isNaN(startMs) && startMs > 0) {
        const elapsed = Math.round((Date.now() - startMs) / 1000);
        metrics.duration_seconds = elapsed >= 0 ? elapsed : 0;
      }
    }
    // Validate structure before overwriting: apply defaults for missing fields
    let updated = timingContent;
    if (!updated.includes('completed_at:')) {
      updated += `\ncompleted_at: "${now}"`;
    } else {
      updated = updated.replace(/completed_at:\s*null/, `completed_at: "${now}"`);
    }
    if (!updated.includes('total_duration_seconds:')) {
      updated += `\ntotal_duration_seconds: ${metrics.duration_seconds}`;
    } else {
      updated = updated.replace(/total_duration_seconds:\s*\d+/, `total_duration_seconds: ${metrics.duration_seconds}`);
    }
    try { fs.writeFileSync(timingFile, updated); } catch (e) {
      console.error(`[SessionStop] Failed to write timing: ${e.message}`);
    }
  }

  // Get speedup factor
  const parallelismContent = safeRead(path.join(metricsDir, 'parallelism.yaml'));
  if (parallelismContent) {
    const speedupMatch = parallelismContent.match(/speedup_factor:\s*([\d.]+)/);
    if (speedupMatch) metrics.speedup_factor = parseFloat(speedupMatch[1]);
  }

  // Update status
  let statusContent = safeRead(statusFile);
  if (statusContent && idleBetweenWaves) {
    // HS-4 idle-lead exemption: a gated wave passed and a later wave is pending.
    // Leave phase, pipeline_state, completed_at and result untouched and do not
    // write status.yaml at all. Sits before the liveness and genuine-PASS
    // branches below, which are unchanged.
    console.error(
      `[SessionStop] ${path.basename(teamSessionDir)} is idle between waves ` +
      `(${idleBetweenWaves.gate} passed, last wave ${idleBetweenWaves.lastWave}); status.yaml left untouched.`,
    );
  } else if (statusContent) {
    const success = metrics.items_total > 0 ? (metrics.items_completed === metrics.items_total) : true;

    // LIVENESS GUARD: never stamp terminal state on a session that is still
    // mid-flight. SessionEnd fires per Claude Code session, but a /team program
    // can span many of them — see teamSessionActivelyWorking() for the full
    // failure mode (5 recorded recurrences) and why this guard exists.
    //
    // Prefer the verdict captured at handler entry (before Phase 1 rewrote every
    // `stopped_at: null`); re-checking here would only ever see the heartbeat,
    // because this hook already erased the running-child signal. The re-check is
    // the fallback for when Phase 1 resolved a different session than Phase 2.
    const activelyWorking = activelyWorkingAtEntry
      || teamSessionActivelyWorking(teamSessionDir, statusContent);

    if (activelyWorking) {
      // Fill the null placeholders only; leave phase/pipeline_state alone so the
      // deny gate stays disarmed and the next wave can still spawn agents.
      console.error(
        `[SessionStop] ${path.basename(teamSessionDir)} is still actively working ` +
        `(running child agent or fresh heartbeat) — leaving phase/pipeline_state untouched. ` +
        `Metrics were finalized; terminal state is not this hook's to assert on a live session.`,
      );
      // HS-11: stderr above is enough; not user-actionable.
    } else if (success && sessionGenuinelyValidated(teamSessionDir, 'pipeline_state: VALIDATED\n')) {
      // HS-4 (e): assert VALIDATED only with a genuine validator PASS on disk.
      statusContent = statusContent
        .replace(/^phase:\s*\w+/m, 'phase: completed')
        .replace(/^pipeline_state:\s*\S+/m, 'pipeline_state: VALIDATED');
    } else {
      // HS-4 (e): no genuine PASS, so the terminal state is verify-completion's
      // to decide (REC-02 honesty rule). Leave phase/pipeline_state as-is.
      console.error(`[SessionStop] ${path.basename(teamSessionDir)}: no genuine validator PASS on disk; phase/pipeline_state left as-is`);
    }

    statusContent = statusContent
      .replace(/completed_at:\s*null/, `completed_at: "${now}"`)
      .replace(/result:\s*null/, `result: ${success ? 'success' : 'partial'}`);
    try { fs.writeFileSync(statusFile, statusContent); } catch (e) {
      console.error(`[SessionStop] Failed to write status: ${e.message}`);
    }
  }

  console.error(`[SessionStop] Finalized ${path.basename(teamSessionDir)}: ${metrics.items_completed}/${metrics.items_total}`);

  // HS-11: one line. Speedup/pattern-extraction are bookkeeping (stderr only).
  if (idleBetweenWaves) {
    summary += `Team ${path.basename(teamSessionDir)}: paused between waves (${idleBetweenWaves.gate} passed, last wave ${idleBetweenWaves.lastWave}).\n`;
  } else {
    summary += `Team ${path.basename(teamSessionDir)}: ${metrics.items_completed}/${metrics.items_total} work items completed in ${metrics.duration_seconds}s.\n`;
  }
  if (metrics.speedup_factor > 1) {
    console.error(`[SessionStop] speedup ${metrics.speedup_factor.toFixed(1)}x vs sequential`);
  }

  // --- Phase 3: P1-4 pattern extraction (24h throttle, fire-and-forget) ---
  const extractionStatus = maybeExtractPatterns();
  if (extractionStatus === 'invoked' || extractionStatus === 'throttled') {
    console.error(`[SessionStop] Pattern extraction: ${extractionStatus === 'invoked' ? 'spawned (background)' : 'throttled (last run <24h ago)'}`);
  }

  return { continue: true, systemMessage: summary.trimEnd() };
});

module.exports = { teamIdleBetweenWaves, teamSessionActivelyWorking };

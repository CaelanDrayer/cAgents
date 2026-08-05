#!/usr/bin/env node
/**
 * Spawn Footprint Recorder — PostToolUse[Agent] (WO-01, session team_load-cut-program_260804_001)
 *
 * DIAGNOSTIC ONLY. This hook records numbers. It NEVER blocks, denies, fails a
 * build, gates a merge, or influences any allow/deny decision. Every code path
 * returns null (-> {"continue": true}). Every write is wrapped. It is revertible
 * by deleting its single registration in .claude/settings.json.
 *
 * There is deliberately NO threshold, budget, warning level, or comparison in
 * this file. If a future edit adds a number that something is compared against
 * to decide pass/fail, that edit is out of contract.
 *
 * ---------------------------------------------------------------------------
 * WHERE THE NUMBERS COME FROM (empirically probed, not assumed)
 * ---------------------------------------------------------------------------
 * A throwaway raw-payload probe was registered on both SubagentStop and
 * PostToolUse[Agent] and driven with real spawns. Observed:
 *
 *   SubagentStop payload keys: session_id, transcript_path, cwd, prompt_id,
 *     permission_mode, agent_id, agent_type, effort, hook_event_name,
 *     stop_hook_active, agent_transcript_path, last_assistant_message,
 *     background_tasks, session_crons
 *     -> contains NO token/usage data whatsoever.
 *
 *   PostToolUse[Agent] payload: tool_response carries
 *     status, prompt, agentId, agentType, content, resolvedModel,
 *     totalDurationMs, totalTokens, totalToolUseCount, usage, toolStats
 *     -> `usage` is the Anthropic usage object (input_tokens,
 *        cache_creation_input_tokens, cache_read_input_tokens, output_tokens...).
 *
 * Hence PostToolUse[Agent] is the ONLY event that carries the data, and this
 * hook is registered there. `.claude/rules/core/controllers.md` describes the
 * fields as coming from "the Agent tool result" — that is correct, and the Agent
 * tool result reaches a hook as tool_response on PostToolUse[Agent].
 *
 * ---------------------------------------------------------------------------
 * FIELD SEMANTICS (read this before using token_count.input)
 * ---------------------------------------------------------------------------
 * `usage.input_tokens` alone is the UNCACHED input slice and is typically 1-2
 * tokens — it does not answer "how big was this spawn". The spawn's actual input
 * footprint is the sum of the three input components. So:
 *
 *   token_count.input = input_uncached + cache_read + cache_creation
 *
 * `input` is therefore a SUPERSET of `cache_read` and `cache_creation`; the
 * components are recorded alongside it so the aggregate can never be mistaken
 * for a raw API field, and so anyone can re-derive it. Measured example: an
 * Explore spawn that touched no files recorded input=9982; an otherwise
 * identical spawn that read one workflow file (triggering path-conditional rule
 * injection) recorded input=34332.
 *
 * ---------------------------------------------------------------------------
 * WHERE IT WRITES
 * ---------------------------------------------------------------------------
 * 1. ALWAYS -> workflow/spawn_footprints.yaml (append). Durable record. This
 *    hook never creates coordination_log.yaml, so it cannot make an
 *    uncoordinated session look coordinated.
 * 2. WHEN POSSIBLE -> workflow/coordination_log.yaml, attaching token_count /
 *    tool_uses / duration_seconds to the implementation_tasks entry whose
 *    agent_id matches, per controllers.md "Task Result Metadata".
 *
 * Because a controller records agent_id only AFTER its spawn returns, the
 * matching entry usually does not exist yet at the moment this hook fires. So
 * every invocation also runs a RECONCILE pass over all previously-recorded
 * footprints, back-filling any implementation_tasks entry whose agent_id has
 * since appeared. The record is thus self-healing across a multi-spawn run.
 */

const fs = require('fs');
const path = require('path');

// js-yaml is the sole declared external dependency; a plugin install without
// `npm install` must not crash this hook at load time.
let yaml = null;
try { yaml = require('js-yaml'); } catch { yaml = null; }

const { createHook, findActiveSession, safeRead, withFileLock } = require('./hook-utils.cjs');

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Build the footprint record from a PostToolUse[Agent] tool_response.
 * Returns null when the payload carries no usage object.
 * Exported for tests.
 */
function buildFootprint(toolResponse, fallbackAgentId) {
  if (!toolResponse || typeof toolResponse !== 'object') return null;
  const usage = toolResponse.usage;
  if (!usage || typeof usage !== 'object') return null;

  const inputUncached = num(usage.input_tokens);
  const cacheRead = num(usage.cache_read_input_tokens);
  const cacheCreation = num(usage.cache_creation_input_tokens);

  return {
    agent_id: toolResponse.agentId || fallbackAgentId || null,
    agent_type: toolResponse.agentType || null,
    resolved_model: toolResponse.resolvedModel || null,
    status: toolResponse.status || null,
    recorded_at: new Date().toISOString(),
    token_count: {
      // Sum of the three input components — see FIELD SEMANTICS above.
      input: inputUncached + cacheRead + cacheCreation,
      input_uncached: inputUncached,
      cache_read: cacheRead,
      cache_creation: cacheCreation,
      output: num(usage.output_tokens),
      total: num(toolResponse.totalTokens)
    },
    tool_uses: num(toolResponse.totalToolUseCount),
    duration_seconds: Math.round(num(toolResponse.totalDurationMs) / 1000)
  };
}

/** Copy the metadata fields from a footprint onto an implementation_tasks entry. */
function applyFootprintToTask(task, fp) {
  task.token_count = fp.token_count;
  task.tool_uses = fp.tool_uses;
  task.duration_seconds = fp.duration_seconds;
  if (!task.resolved_model && fp.resolved_model) task.resolved_model = fp.resolved_model;
}

/**
 * Attach every footprint with a matching agent_id onto its implementation_tasks
 * entry. Pure function over a parsed coordination_log object; returns the number
 * of entries changed. Exported for tests.
 */
function reconcile(logObj, footprints) {
  if (!logObj || !Array.isArray(logObj.implementation_tasks)) return 0;
  const byId = new Map();
  for (const fp of footprints) {
    if (fp && fp.agent_id) byId.set(String(fp.agent_id), fp);
  }
  let changed = 0;
  for (const task of logObj.implementation_tasks) {
    if (!task || typeof task !== 'object' || !task.agent_id) continue;
    const fp = byId.get(String(task.agent_id));
    if (!fp) continue;
    // Idempotent: skip an entry that already carries this exact input figure.
    if (task.token_count && task.token_count.input === fp.token_count.input) continue;
    applyFootprintToTask(task, fp);
    changed += 1;
  }
  return changed;
}

async function handler(input) {
  try {
    const toolName = input.tool_name || '';
    if (toolName !== 'Agent' && toolName !== 'Task') return null;

    const fp = buildFootprint(input.tool_response, input.agent_id);
    if (!fp) return null;

    if (!yaml) {
      console.error('[SpawnFootprint] js-yaml unavailable — footprint not recorded (non-fatal)');
      return null;
    }

    // Deterministic session resolution per the concurrency contract. No
    // newest-session heuristic: an unresolvable session means we record nothing
    // rather than writing into a sibling session's files.
    const sessionDir = findActiveSession(input.session_id);
    if (!sessionDir) {
      console.error('[SpawnFootprint] No active session resolved — footprint not recorded');
      return null;
    }

    const workflowDir = path.join(sessionDir, 'workflow');
    const footprintFile = path.join(workflowDir, 'spawn_footprints.yaml');
    const logFile = path.join(workflowDir, 'coordination_log.yaml');

    let allFootprints = [];

    // --- 1. Durable append to spawn_footprints.yaml -------------------------
    withFileLock(footprintFile, () => {
      try {
        fs.mkdirSync(workflowDir, { recursive: true });
        let doc = { schema_version: '1', spawn_footprints: [] };
        const existing = safeRead(footprintFile);
        if (existing) {
          const parsed = yaml.load(existing);
          if (parsed && Array.isArray(parsed.spawn_footprints)) doc = parsed;
        }
        doc.spawn_footprints.push(fp);
        fs.writeFileSync(footprintFile, yaml.dump(doc));
        allFootprints = doc.spawn_footprints;
      } catch (err) {
        console.error(`[SpawnFootprint] footprint append failed (non-fatal): ${err.message}`);
      }
    });

    // --- 2. Reconcile into coordination_log.yaml ----------------------------
    // Never creates the file — only updates one that already exists.
    if (allFootprints.length && fs.existsSync(logFile)) {
      withFileLock(logFile, () => {
        try {
          const content = safeRead(logFile);
          if (!content) return;
          const logObj = yaml.load(content);
          const changed = reconcile(logObj, allFootprints);
          if (changed > 0) {
            fs.writeFileSync(logFile, yaml.dump(logObj));
            console.error(`[SpawnFootprint] attached token_count to ${changed} implementation_tasks entr${changed === 1 ? 'y' : 'ies'}`);
          }
        } catch (err) {
          console.error(`[SpawnFootprint] coordination_log reconcile failed (non-fatal): ${err.message}`);
        }
      });
    }

    console.error(`[SpawnFootprint] ${fp.agent_type || 'agent'} ${fp.agent_id} input=${fp.token_count.input} output=${fp.token_count.output}`);
  } catch (err) {
    // Fail open, always. A diagnostic instrument must never affect execution.
    console.error(`[SpawnFootprint] unexpected error (non-fatal): ${err.message}`);
  }
  return null;
}

// Self-register unless this module is being require()'d purely to import its
// pieces (tests). Same convention as secret-detection.cjs / session-init-gate.cjs.
// NOTE: `require.main === module` is NOT usable here — run-hook.cjs require()s
// this file, so require.main is run-hook.cjs in normal operation.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('SpawnFootprint', handler);
}

module.exports = { handler, buildFootprint, reconcile, applyFootprintToTask };

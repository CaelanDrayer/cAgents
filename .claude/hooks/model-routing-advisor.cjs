#!/usr/bin/env node
/**
 * Model Routing Advisor Hook - Model Routing Validation
 * cAgents (LP-16: KNOWN_AGENTS auto-generated from plugin.json)
 *
 * PreToolUse hook that validates model routing on agent/task spawns.
 * Ensures execution agents get sonnet, controllers get opusplan, support gets haiku
 * per model-routing.md guidelines.
 *
 * Advisory mode: warns on mismatches rather than blocking.
 * Logs all delegations for audit trail.
 *
 * KNOWN_AGENTS map is built once per process by reading `.claude-plugin/plugin.json`
 * and parsing the `metadata.tier:` field from each agent's SKILL.md frontmatter.
 * The hand-maintained literal previously diverged from the catalog (v12.4.0 cull
 * moved 96 agents to _deprecated/ but the literal still listed 243 entries);
 * auto-generation keeps the map in lock-step with the manifest.
 */

const fs = require('fs');
const path = require('path');
const { createHook, ensureDir, AGENT_MEMORY_DIR, findActiveSession } = require('./hook-utils.cjs');

// Expected model assignments by tier/role
const MODEL_EXPECTATIONS = {
  // Controllers should use opusplan (Opus reasoning + Sonnet execution)
  controller: { expected: 'opusplan', alternatives: ['opus'] },
  // Execution agents should use sonnet (balanced capability)
  execution: { expected: 'sonnet', alternatives: ['opus'] }, // opus OK for creative domain
  // Support agents should use haiku (lightweight)
  support: { expected: 'haiku', alternatives: ['sonnet'] },
  // Infrastructure agents can use any
  infrastructure: { expected: 'opus', alternatives: ['opusplan', 'sonnet'] },
  // Executive agents use opusplan
  executive: { expected: 'opusplan', alternatives: ['opus'] },
};

const VALID_TIERS = new Set(['controller', 'execution', 'support', 'infrastructure', 'executive']);

// Per-process memoization
let _knownAgentsCache = null;

/**
 * Resolve the cAgents repo root. Prefer CLAUDE_PLUGIN_ROOT (set by Claude Code
 * when this hook is invoked via run-hook.cjs), fall back to walking up from
 * this file's __dirname (.claude/hooks/ -> repo root).
 */
function resolveRepoRoot() {
  const envRoot = process.env.CLAUDE_PLUGIN_ROOT || process.env.CLAUDE_PROJECT_DIR;
  if (envRoot && fs.existsSync(path.join(envRoot, '.claude-plugin', 'plugin.json'))) {
    return envRoot;
  }
  // __dirname is `<repo>/.claude/hooks`; go up two levels
  const fromFile = path.resolve(__dirname, '..', '..');
  if (fs.existsSync(path.join(fromFile, '.claude-plugin', 'plugin.json'))) {
    return fromFile;
  }
  return process.cwd();
}

/**
 * Extract the `metadata.tier` value from a SKILL.md file. Hand-rolled mini
 * YAML walker (no external deps): finds the `metadata:` block in the
 * frontmatter and returns the first `tier:` value scoped under it.
 * Falls back to a top-level `tier:` if no metadata block exists.
 * Returns null when the file is unreadable or has no recognizable tier.
 */
function parseSkillTier(skillPath) {
  let src;
  try {
    src = fs.readFileSync(skillPath, 'utf8');
  } catch {
    return null;
  }
  // Frontmatter is between the first two `---` lines
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) return null;
  const frontmatter = fmMatch[1];

  const lines = frontmatter.split(/\r?\n/);
  let inMetadata = false;
  let metadataIndent = -1;

  for (const line of lines) {
    // Skip blank/comment lines
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const leading = line.match(/^( *)/)[1].length;

    // Detect entering the metadata: block
    if (/^metadata:\s*$/.test(line.trim()) && leading === 0) {
      inMetadata = true;
      metadataIndent = leading;
      continue;
    }
    // If inside metadata and we hit a same-or-lower-indented key, exit metadata
    if (inMetadata && leading <= metadataIndent && /^\S/.test(line)) {
      inMetadata = false;
    }
    if (inMetadata) {
      const m = line.match(/^\s+tier:\s*([A-Za-z][\w-]*)\s*$/);
      if (m && VALID_TIERS.has(m[1])) return m[1];
    }
  }

  // Fallback: top-level `tier:` (rare; legacy)
  for (const line of lines) {
    const m = line.match(/^tier:\s*([A-Za-z][\w-]*)\s*$/);
    if (m && VALID_TIERS.has(m[1])) return m[1];
  }
  return null;
}

/**
 * Build the {agent-name: tier} map by walking plugin.json's agents array.
 * Memoized: subsequent calls return the same object reference until process exit.
 * Excludes any `_deprecated/` paths (sync-agents.sh already excludes them from
 * plugin.json, so this is defensive — the contract is "modulo _deprecated/").
 */
function loadKnownAgents() {
  if (_knownAgentsCache !== null) return _knownAgentsCache;

  const root = resolveRepoRoot();
  const pluginPath = path.join(root, '.claude-plugin', 'plugin.json');
  const result = {};

  let plugin;
  try {
    plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  } catch {
    _knownAgentsCache = result; // empty map; hook degrades to pass-through
    return _knownAgentsCache;
  }

  const agents = Array.isArray(plugin.agents) ? plugin.agents : [];
  for (const rel of agents) {
    if (typeof rel !== 'string') continue;
    if (rel.indexOf('/_deprecated/') !== -1) continue;
    const m = rel.match(/\/([^/]+)\/SKILL\.md$/);
    if (!m) continue;
    const agentName = m[1];

    const skillPath = path.resolve(root, rel);
    const tier = parseSkillTier(skillPath);
    // Default to 'execution' when tier is unparseable so the hook still has
    // a routing opinion (matches the previous literal's bias).
    result[agentName] = tier || 'execution';
  }

  _knownAgentsCache = result;
  return _knownAgentsCache;
}

// Test-only: reset memoization (not used by the hook itself)
function _resetKnownAgentsCache() {
  _knownAgentsCache = null;
}

const _hookHandler = async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Only check Task/Agent tool calls that spawn subagents
  if (toolName !== 'Task' && toolName !== 'Agent') return null;

  const subagentType = toolInput.subagent_type || toolInput.agent_type || '';
  const model = toolInput.model || '';
  const description = toolInput.description || '';

  // Advisory: when subagent_type field is entirely absent, remind caller to set it
  const hasSubagentTypeField = 'subagent_type' in toolInput || 'agent_type' in toolInput;
  if (!hasSubagentTypeField) {
    return {
      continue: true,
      systemMessage: "[ModelRoutingAdvisor] Missing subagent_type: Task/Agent spawn has no subagent_type field. Set subagent_type to 'cagents:{agent-name}' for proper routing and audit trail. See controllers.md delegation examples."
    };
  }

  // Extract agent name from cagents:{name} format
  const agentMatch = subagentType.match(/^cagents:(.+)$/);
  if (!agentMatch) return null; // Not a cAgents agent spawn

  const agentName = agentMatch[1];
  const known = loadKnownAgents();
  const tier = known[agentName];

  // Log the delegation for audit trail.
  // REC-14 (v12.51.0): this was the only un-rotated cAgents log AND carried no
  // session id, so a delegation could not be correlated to its session. Add (a)
  // 1MB size-based rotation (the same idiom as subagent-tracker.cjs /
  // notification.cjs), (b) a `session=<basename>` field resolved via the
  // deterministic chain (falling back to the raw session_id, then `unknown`),
  // and (c) a no-signal-row skip so rows that carried zero diagnostic value
  // (empty desc AND default model) no longer bloat the log.
  try {
    const logsDir = ensureDir(path.join(AGENT_MEMORY_DIR, '_system', 'logs'));
    const logFile = path.join(logsDir, 'delegation_audit.log');

    // (a) Rotate when > 1MB (matches subagent-tracker.cjs:47-52).
    try {
      const st = fs.statSync(logFile);
      if (st.size > 1024 * 1024) {
        fs.renameSync(logFile, logFile.replace('.log', `_${new Date().toISOString().slice(0, 10)}.log`));
      }
    } catch { /* file doesn't exist yet — nothing to rotate */ }

    // (c) Skip rows with no diagnostic signal (empty desc AND default model).
    if (!(description.trim() === '' && (model || 'default') === 'default')) {
      // (b) Resolve the owning session for correlation.
      const sess = (() => {
        try {
          const d = findActiveSession(input.session_id);
          return d ? path.basename(d) : (input.session_id || 'unknown');
        } catch { return 'unknown'; }
      })();
      const timestamp = new Date().toISOString();
      const logEntry = `${timestamp} | SPAWN | session=${sess} | agent=${agentName} | tier=${tier || 'unknown'} | model=${model || 'default'} | desc=${description.substring(0, 100)}\n`;
      fs.appendFileSync(logFile, logEntry);
    }
  } catch { /* best effort logging */ }

  // If we don't know the agent's tier, skip validation
  if (!tier) return null;

  // If no model specified, skip (defaults will apply)
  if (!model) return null;

  const expectation = MODEL_EXPECTATIONS[tier];
  if (!expectation) return null;

  // Check if model matches expectations
  const modelLower = model.toLowerCase();
  const isExpected = modelLower === expectation.expected;
  const isAlternative = expectation.alternatives.includes(modelLower);

  if (!isExpected && !isAlternative) {
    // Advisory warning - do not block
    return {
      continue: true,
      systemMessage: `[ModelRoutingAdvisor] Model routing advisory: agent '${agentName}' (tier: ${tier}) is being spawned with model '${model}'. Expected '${expectation.expected}' (alternatives: ${expectation.alternatives.join(', ')}). This may affect quality or cost. See model-routing.md for guidelines.`
    };
  }

  return null;
};

// Only register the hook + read stdin when invoked as the main module. When
// require()'d from a test, this guard prevents the eager stdin read so the test can
// import `loadKnownAgents()` cheaply and synchronously. The CAGENTS_DISPATCH_IMPORT
// clause additionally suppresses registration when the agent-dispatch dispatcher
// require()s this module purely to import `_hookHandler` (A2-12), mirroring the
// write-edit-dispatch sub-validators.
if (require.main === module && !process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('ModelRoutingAdvisor', _hookHandler);
}

// Export helpers for tests (LP-16) and the agent-dispatch dispatcher (A2-12).
module.exports.loadKnownAgents = loadKnownAgents;
module.exports._resetKnownAgentsCache = _resetKnownAgentsCache;
module.exports.parseSkillTier = parseSkillTier;
module.exports._hookHandler = _hookHandler;
// `handler` alias: the agent-dispatch dispatcher imports a `handler` for symmetry
// with the other dispatched sub-validators (secret-detection, session-init-gate).
module.exports.handler = _hookHandler;

#!/usr/bin/env node
/**
 * Post-Write Validator Hook - Validate files after Write/Edit
 * cAgents V9.22.0 - PostToolUse hook for quality validation
 *
 * Runs after successful Write/Edit to:
 * 1. Validate JSON/YAML syntax
 * 2. Log writes to session file_changes audit trail
 * 3. Provide feedback if validation issues found
 *
 * Input (stdin): JSON with tool_name, tool_input from PostToolUse event
 * Output (stdout): JSON with continue status and optional systemMessage
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, ensureDir, safeRead, AGENT_MEMORY_DIR, PROJECT_ROOT } = require('./hook-utils.cjs');

// Auto-format detection cache (v10.6.0)
let _formatterCache = null;
function detectFormatter() {
  if (_formatterCache !== null) return _formatterCache;
  // Check for common formatters in the project root
  const biomeConfig = safeRead(path.join(PROJECT_ROOT, 'biome.json')) || safeRead(path.join(PROJECT_ROOT, 'biome.jsonc'));
  const prettierRc = safeRead(path.join(PROJECT_ROOT, '.prettierrc')) ||
    safeRead(path.join(PROJECT_ROOT, '.prettierrc.json')) ||
    safeRead(path.join(PROJECT_ROOT, '.prettierrc.js')) ||
    safeRead(path.join(PROJECT_ROOT, 'prettier.config.js'));
  const prettierInPkg = (() => {
    const pkg = safeRead(path.join(PROJECT_ROOT, 'package.json'));
    if (pkg) try { return JSON.parse(pkg).prettier ? true : false; } catch { return false; }
    return false;
  })();

  if (biomeConfig) _formatterCache = 'biome';
  else if (prettierRc || prettierInPkg) _formatterCache = 'prettier';
  else _formatterCache = null;
  return _formatterCache;
}

createHook('PostWriteValidator', async (input) => {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || '';

  if (!filePath) return null;

  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath);
  const warnings = [];

  // Validate JSON syntax
  if (ext === '.json') {
    try {
      const content = safeRead(filePath);
      if (content) JSON.parse(content);
    } catch (err) {
      warnings.push(`Invalid JSON in ${basename}: ${err.message}`);
    }
  }

  // Basic YAML validation
  if (ext === '.yaml' || ext === '.yml') {
    const content = safeRead(filePath);
    if (content) {
      // Tabs in YAML indentation
      if (/^\t/m.test(content)) {
        warnings.push(`YAML file ${basename} contains tabs for indentation (use spaces)`);
      }
      // Duplicate top-level keys (common YAML mistake)
      const topKeys = [];
      for (const line of content.split('\n')) {
        const match = line.match(/^(\w[\w-]*):/);
        if (match) {
          if (topKeys.includes(match[1])) {
            warnings.push(`YAML file ${basename} has duplicate top-level key: ${match[1]}`);
          }
          topKeys.push(match[1]);
        }
      }
    }
  }

  // Auto-format suggestion for JS/TS files (v10.6.0)
  const jsExtensions = ['.js', '.cjs', '.mjs', '.ts', '.tsx', '.jsx'];
  if (jsExtensions.includes(ext)) {
    const formatter = detectFormatter();
    if (formatter) {
      const cmd = formatter === 'biome' ? `npx biome format --write ${filePath}` : `npx prettier --write ${filePath}`;
      warnings.push(`[format] ${formatter} detected. Consider running: ${cmd}`);
    }
  }

  // Log to session audit trail
  const sessionDir = findActiveSession(input.session_id);
  if (sessionDir) {
    try {
      const auditDir = ensureDir(path.join(sessionDir, 'workflow'));
      const auditFile = path.join(auditDir, 'file_changes.log');
      const now = new Date().toISOString();
      const status = warnings.length > 0 ? 'WARN' : 'OK';
      // PC-03: NDJSON format for reliable parsing (replaces pipe-delimited)
      const line = JSON.stringify({
        timestamp: now,
        tool: toolName,
        status: status === 'OK' ? 'success' : status === 'WARN' ? 'success' : 'failure',
        file_path: filePath
      }) + '\n';
      fs.appendFileSync(auditFile, line);
    } catch { /* best effort */ }
  }

  // Planning reminder: nudge to update planning files after writes during active sessions
  let planningReminder = '';
  if (sessionDir) {
    const planPath = path.join(sessionDir, 'workflow', 'plan.yaml');
    const planExists = safeRead(planPath);
    if (planExists) {
      // Check if the written file is a planning file itself (don't nag about planning files)
      const isPlanningFile = filePath.includes('plan.yaml') || filePath.includes('coordination_log') ||
        filePath.includes('task_plan.md') || filePath.includes('findings.md') || filePath.includes('progress.md') ||
        filePath.includes('status.yaml') || filePath.includes('waypoint');
      if (!isPlanningFile) {
        planningReminder = '\n[planning-reminder] Implementation file updated. If this completes a phase or work item, update coordination_log.yaml status and progress.md.';
      }
    }
  }

  if (warnings.length > 0) {
    console.error(`[PostWriteValidator] Warnings: ${warnings.join('; ')}`);
    return {
      continue: true,
      systemMessage: `Post-write validation warnings:\n${warnings.map(w => `- ${w}`).join('\n')}${planningReminder}`
    };
  }

  if (planningReminder) {
    return { continue: true, systemMessage: planningReminder.trim() };
  }

  return null;
});

#!/usr/bin/env node
/**
 * ConfigChange Logger Hook (LP-17, v12.7.x)
 *
 * Fires on the Claude Code ConfigChange event when a settings.json (project,
 * user, local) or skills config file is modified. Appends a single audit line
 * per change to cagents-memory/_system/logs/config-changes_<YYYY-MM-DD>.log so
 * we can trace policy/permission drift over time.
 *
 * Log format: `ISO_TS | source | path | changed_keys`
 *   - ISO_TS: timestamp the hook ran (ISO-8601, UTC)
 *   - source: one of project_settings, user_settings, local_settings, skills
 *             (passed in by Claude Code via input.source)
 *   - path:   absolute or relative path of the changed file (input.path),
 *             "-" if not provided
 *   - changed_keys: comma-joined list of dotted key paths (input.changed_keys),
 *                   "-" if not provided
 *
 * Non-blocking: always returns { continue: true }. This is an audit-only hook;
 * config changes are NEVER blocked or denied here.
 *
 * Input (stdin): JSON ConfigChange payload from Claude Code
 *   {
 *     "source": "project_settings",
 *     "path": ".claude/settings.json",
 *     "changed_keys": ["teammateMode", "permissions.allow"]
 *   }
 *
 * Output (stdout): { "continue": true }
 */

const fs = require('fs');
const path = require('path');
const { createHook, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

createHook('ConfigChangeLogger', async (input) => {
  const source = input.source || input.config_source || 'unknown';
  const changedPath = input.path || input.file_path || '-';

  // Normalize changed_keys to a comma-joined string. Accept array (canonical),
  // object (use keys), or string (already joined).
  let changedKeys = '-';
  if (Array.isArray(input.changed_keys)) {
    changedKeys = input.changed_keys.length ? input.changed_keys.join(',') : '-';
  } else if (input.changed_keys && typeof input.changed_keys === 'object') {
    const keys = Object.keys(input.changed_keys);
    changedKeys = keys.length ? keys.join(',') : '-';
  } else if (typeof input.changed_keys === 'string' && input.changed_keys) {
    changedKeys = input.changed_keys;
  }

  const logsDir = path.join(AGENT_MEMORY_DIR, '_system', 'logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `config-changes_${dateStr}.log`);

    const ts = new Date().toISOString();
    const line = `${ts} | ${source} | ${changedPath} | ${changedKeys}\n`;
    fs.appendFileSync(logFile, line);
  } catch (error) {
    // Never fail a ConfigChange hook on log-write errors — this is audit-only.
    console.error(`[ConfigChangeLogger] Failed to log: ${error.message}`);
  }

  return null; // -> { continue: true }
});

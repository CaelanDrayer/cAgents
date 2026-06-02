#!/usr/bin/env node
/**
 * InstructionsLoaded Hook - Validate rules structure on CLAUDE.md load
 * cAgents V10.22.7
 *
 * Runs on InstructionsLoaded to verify that expected .claude/rules/ directories
 * exist, logs the count of loaded rule files to stderr, and injects lightweight
 * context into the active session if one is running.
 *
 * Input (stdin): JSON with session context (may be empty)
 * Output (stdout): JSON with optional additionalContext systemMessage
 */

const fs = require('fs');
const path = require('path');
const { createHook, PLUGIN_ROOT, findActiveSession, safeRead, extractYamlValue } = require('./hook-utils.cjs');

// Expected rules subdirectories (relative to .claude/rules/)
// M-18 (v12.12.2): added 'playbooks' to match the v12.4.0 rules directory layout
// (.claude/rules/playbooks/ holds pat-*.md cross-agent guidance referenced via @path).
const EXPECTED_RULES_DIRS = ['core', 'domains', 'quality', 'memory', 'infrastructure', 'playbooks'];

/**
 * Count .md files recursively under a directory.
 */
function countMdFiles(dir) {
  let count = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        count += countMdFiles(path.join(dir, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        count++;
      }
    }
  } catch { /* skip unreadable dirs */ }
  return count;
}

createHook('InstructionsLoaded', async (input) => {
  const rulesDir = path.join(PLUGIN_ROOT, '.claude', 'rules');

  // Check expected subdirectories and log any missing
  const missing = [];
  const present = [];
  for (const dir of EXPECTED_RULES_DIRS) {
    const fullPath = path.join(rulesDir, dir);
    if (fs.existsSync(fullPath)) {
      present.push(dir);
    } else {
      missing.push(dir);
    }
  }

  // Count total rule files
  const totalRules = countMdFiles(rulesDir);
  console.error(`[InstructionsLoaded] Rules loaded: ${totalRules} files across ${present.length}/${EXPECTED_RULES_DIRS.length} expected dirs`);

  if (missing.length > 0) {
    console.error(`[InstructionsLoaded] Missing rules dirs: ${missing.join(', ')}`);
  }

  // If there's an active session, inject a lightweight context reminder
  const sessionDir = findActiveSession(input && input.session_id);
  if (!sessionDir) {
    return null;
  }

  // Read session mission for targeted context injection
  let mission = null;
  const planFile = path.join(sessionDir, 'workflow', 'plan.yaml');
  const planContent = safeRead(planFile);
  if (planContent) {
    mission = extractYamlValue(planContent, 'mission');
  }

  const parts = [`cAgents rules loaded: ${totalRules} files.`];
  if (missing.length > 0) {
    parts.push(`Warning: missing rules dirs: ${missing.join(', ')}.`);
  }
  if (mission) {
    parts.push(`Active session mission: ${mission.substring(0, 100)}${mission.length > 100 ? '...' : ''}`);
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'InstructionsLoaded',
      additionalContext: parts.join(' ')
    }
  };
});

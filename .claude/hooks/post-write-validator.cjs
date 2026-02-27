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
const { createHook, findActiveSession, ensureDir, safeRead, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

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

  // Log to session audit trail
  const sessionDir = findActiveSession(input.session_id);
  if (sessionDir) {
    try {
      const auditDir = ensureDir(path.join(sessionDir, 'workflow'));
      const auditFile = path.join(auditDir, 'file_changes.log');
      const now = new Date().toISOString();
      const status = warnings.length > 0 ? 'WARN' : 'OK';
      const line = `${now} | ${toolName} | ${status} | ${filePath}\n`;
      fs.appendFileSync(auditFile, line);
    } catch { /* best effort */ }
  }

  if (warnings.length > 0) {
    console.error(`[PostWriteValidator] Warnings: ${warnings.join('; ')}`);
    return {
      continue: true,
      systemMessage: `Post-write validation warnings:\n${warnings.map(w => `- ${w}`).join('\n')}`
    };
  }

  return null;
});

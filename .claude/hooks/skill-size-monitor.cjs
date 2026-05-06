#!/usr/bin/env node
// Monitors SKILL.md size to prevent AP-1 bloat regression.
// Warn at 600 lines, block at 900 lines. Configurable via env.
const fs = require('fs');
const path = require('path');
const { createHook } = require('./hook-utils.cjs');

const WARN_LINES = parseInt(process.env.CAGENTS_SKILL_WARN_LINES || '600', 10);
const BLOCK_LINES = parseInt(process.env.CAGENTS_SKILL_BLOCK_LINES || '900', 10);

createHook('SkillSizeMonitor', async (input) => {
  const tool = input.tool_name || '';
  if (!['Write', 'Edit'].includes(tool)) return null;

  const filePath = input.tool_input?.file_path || '';
  if (!filePath.endsWith('SKILL.md')) return null;

  // For Write, count lines in the new content. For Edit, read the file post-edit.
  let lineCount = 0;
  try {
    if (tool === 'Write' && input.tool_input?.content) {
      lineCount = input.tool_input.content.split('\n').length;
    } else if (fs.existsSync(filePath)) {
      lineCount = fs.readFileSync(filePath, 'utf8').split('\n').length;
    }
  } catch {
    return null;  // Don't block on read errors
  }

  if (lineCount >= BLOCK_LINES) {
    return {
      deny: true,
      reason: `SKILL.md exceeds ${BLOCK_LINES}-line block threshold (got ${lineCount}). ` +
              `Split body into resources/*.md per Three-Tier Progressive Disclosure ` +
              `(see .claude/rules/core/skill-format.md). Override: CAGENTS_SKILL_BLOCK_LINES.`
    };
  }
  if (lineCount >= WARN_LINES) {
    return {
      continue: true,
      systemMessage: `[skill-size-monitor] ${path.basename(filePath)} is ${lineCount} lines ` +
                     `(warn threshold ${WARN_LINES}, block ${BLOCK_LINES}). ` +
                     `Consider splitting into resources/*.md.`
    };
  }
  return null;
});

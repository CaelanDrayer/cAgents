#!/usr/bin/env node
// Monitors SKILL.md size to prevent AP-1 bloat regression.
// Warn at 600 lines, block at 900 lines. Configurable via env.
const fs = require('fs');
const path = require('path');
const { createHook } = require('./hook-utils.cjs');

const WARN_LINES = parseInt(process.env.CAGENTS_SKILL_WARN_LINES || '600', 10);
const BLOCK_LINES = parseInt(process.env.CAGENTS_SKILL_BLOCK_LINES || '900', 10);

// Pure handler (single source of truth). Exported so the D1b Write|Edit dispatcher
// (write-edit-dispatch.cjs) can run this advisory check in-process WITHOUT a second
// cold-start. The standalone createHook() registration below is preserved so this
// hook still works if ever registered individually.
//
// ADVISORY tier (NOT a deny gate): a throw here is FAIL-OPEN — the dispatcher
// catches and treats it as null (continue). Thresholds are re-read from env on
// each call so test overrides take effect.
async function handler(input) {
  const WARN = parseInt(process.env.CAGENTS_SKILL_WARN_LINES || '600', 10);
  const BLOCK = parseInt(process.env.CAGENTS_SKILL_BLOCK_LINES || '900', 10);

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

  if (lineCount >= BLOCK) {
    return {
      deny: true,
      reason: `SKILL.md exceeds ${BLOCK}-line block threshold (got ${lineCount}). ` +
              `Split body into resources/*.md per Three-Tier Progressive Disclosure ` +
              `(see .claude/rules/core/skill-format.md). Override: CAGENTS_SKILL_BLOCK_LINES.`
    };
  }
  if (lineCount >= WARN) {
    return {
      continue: true,
      systemMessage: `[skill-size-monitor] ${path.basename(filePath)} is ${lineCount} lines ` +
                     `(warn threshold ${WARN}, block ${BLOCK}). ` +
                     `Consider splitting into resources/*.md.`
    };
  }
  return null;
}

// Standalone registration. Suppressed when the D1b dispatcher require()s this
// module purely to import `handler` (it sets CAGENTS_DISPATCH_IMPORT before the
// require so this top-level createHook() does not also fire and contend for stdin).
// NOTE: a `require.main === module` guard is deliberately NOT used here — under the
// production path (`node run-hook.cjs skill-size-monitor`) require.main is
// run-hook.cjs, not this module, so such a guard would silently disable the hook.
if (!process.env.CAGENTS_DISPATCH_IMPORT) {
  createHook('SkillSizeMonitor', handler);
}

module.exports = { handler, WARN_LINES, BLOCK_LINES };

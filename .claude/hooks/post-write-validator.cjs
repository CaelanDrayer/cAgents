#!/usr/bin/env node
/**
 * Post-Write Validator Hook - Validate files after Write/Edit
 * cAgents V10.22.1 - PostToolUse hook for quality validation
 *
 * Runs after successful Write/Edit to:
 * 1. Validate JSON/YAML syntax
 * 2. Detect AI slop patterns in prose files (anti-slop v1.0)
 * 3. Log writes to session file_changes audit trail
 * 4. Provide feedback if validation issues found
 *
 * Input (stdin): JSON with tool_name, tool_input from PostToolUse event
 * Output (stdout): JSON with continue status and optional systemMessage
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, ensureDir, safeRead, AGENT_MEMORY_DIR, PROJECT_ROOT, withFileLock } = require('./hook-utils.cjs');

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

// Anti-slop pattern detection (v10.22.1)
// High-confidence patterns only to minimize false positives.
// See .claude/rules/quality/anti-slop.md for the full ruleset.
const SLOP_PHRASES = [
  // Throat-clearing openers
  "here's the thing",
  "it turns out",
  "let me be clear",
  "can we talk about",
  "it's worth noting",
  "let me walk you through",
  "at its core",
  "in today's",
  // Emphasis crutches
  "full stop.",
  "let that sink in",
  "this matters because",
  "this is important because",
  // Business jargon (high-confidence subset)
  "deep dive",
  "game-changer",
  "game changer",
  "paradigm shift",
  "move the needle",
  "circle back",
  "lean into",
  "best-in-class",
  "best in class",
  // Meta-commentary
  "hint:",
  "plot twist:",
  "the rest of this explains",
  "as we will see",
  "it goes without saying",
  "needless to say",
  // Vague declaratives
  "the implications are significant",
  "the stakes are high",
  "the approach is comprehensive",
  "the solution is robust",
  "the results are promising",
];

function detectSlopPatterns(content) {
  // Strip YAML frontmatter (between --- markers at file start)
  let prose = content;
  if (prose.startsWith('---')) {
    const endIdx = prose.indexOf('---', 3);
    if (endIdx > 0) {
      prose = prose.slice(endIdx + 3);
    }
  }
  // Strip code blocks (``` ... ```)
  prose = prose.replace(/```[\s\S]*?```/g, '');
  // Strip inline code (`...`)
  prose = prose.replace(/`[^`]+`/g, '');
  // Strip HTML tags
  prose = prose.replace(/<[^>]+>/g, '');

  const lower = prose.toLowerCase();
  const matches = [];
  for (const phrase of SLOP_PHRASES) {
    if (lower.includes(phrase)) {
      matches.push(phrase);
    }
  }
  return matches;
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

  // Anti-slop detection for prose files (v10.22.1)
  // Checks .md and .txt files for high-confidence AI slop patterns.
  // Skips: test files, example files, SKILL.md frontmatter, planning/status files, lock files.
  const proseExtensions = ['.md', '.txt'];
  const isProseFile = proseExtensions.includes(ext);
  const isTestOrExample = /\.(test|spec|example|sample|mock|fixture)\b/i.test(basename) ||
    filePath.includes('/tests/') || filePath.includes('/test/') ||
    filePath.includes('/fixtures/') || filePath.includes('/examples/');
  const isAgentMemory = filePath.includes('Agent_Memory/');

  if (isProseFile && !isTestOrExample && !isAgentMemory) {
    const content = safeRead(filePath);
    if (content && content.length > 100) {
      const slopMatches = detectSlopPatterns(content);
      if (slopMatches.length > 0) {
        const top = slopMatches.slice(0, 5);
        warnings.push(`[anti-slop] ${slopMatches.length} AI slop pattern(s) detected in ${basename}: ${top.map(m => '"' + m + '"').join(', ')}${slopMatches.length > 5 ? ` (+${slopMatches.length - 5} more)` : ''}`);
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
      withFileLock(auditFile, () => { fs.appendFileSync(auditFile, line); });
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

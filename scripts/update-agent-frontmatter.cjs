#!/usr/bin/env node
/**
 * Batch update agent SKILL.md frontmatter with Claude Code native fields.
 *
 * Transformations applied:
 * - Convert `tools:` from comma-separated string to JSON array
 * - Add `maxTurns` based on tier and agent name
 * - Add `permissionMode` for infrastructure and controller tiers
 * - Update `model` values (opus -> opusplan for controllers)
 * - Add `memory` for controllers
 * - Add `disallowedTools` for support tier
 * - Set model to haiku for support tier
 *
 * Idempotent: running twice produces the same result.
 */

const fs = require('fs');
const path = require('path');

const ROOT = '/home/PathingIT/cAgents';

// Directories to scan (exclude example/)
const AGENT_DIRS = [
  'core/agents',
  'make/agents',
  'grow/agents',
  'operate/agents',
  'people/agents',
  'serve/agents',
  'shared/agents',
];

// Infrastructure agent maxTurns overrides
const INFRA_MAX_TURNS = {
  'orchestrator': 50,
  'trigger': 50,
  'task-consolidator': 30,
  'task-decomposer': 30,
  'task-inventory': 30,
  'hitl': 15,
  'universal-router': 15,
  'universal-planner': 40,
  'universal-executor': 40,
  'universal-validator': 40,
  'universal-self-correct': 40,
  'optimizer': 50,
  'team-trigger': 30,
  'team-lead-adapter': 30,
};

// Stats tracking
const stats = {
  total: 0,
  updated: 0,
  skipped: 0,
  errors: [],
  byTier: {
    infrastructure: 0,
    controller: 0,
    execution: 0,
    support: 0,
    unknown: 0,
  },
};

/**
 * Find all SKILL.md files in agent directories.
 */
function findAgentFiles() {
  const files = [];
  for (const dir of AGENT_DIRS) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(fullDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        files.push(skillPath);
      }
    }
  }
  return files;
}

/**
 * Parse frontmatter from markdown content.
 * Returns { frontmatterRaw, frontmatterLines, body, hasFrontmatter }
 */
function parseFrontmatter(content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    return { frontmatterRaw: '', frontmatterLines: [], body: content, hasFrontmatter: false };
  }

  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) {
    return { frontmatterRaw: '', frontmatterLines: [], body: content, hasFrontmatter: false };
  }

  const frontmatterLines = lines.slice(1, endIdx);
  const frontmatterRaw = frontmatterLines.join('\n');
  const body = lines.slice(endIdx + 1).join('\n');

  return { frontmatterRaw, frontmatterLines, body, hasFrontmatter: true };
}

/**
 * Parse a simple YAML frontmatter into key-value pairs preserving order.
 * Handles:
 * - Simple key: value
 * - Multi-line arrays (indented with -)
 * - Inline arrays [a, b]
 * - Inline objects {key: value}
 *
 * Returns array of { key, value, rawLines } objects preserving original order.
 */
function parseFrontmatterFields(frontmatterLines) {
  const fields = [];
  let i = 0;

  while (i < frontmatterLines.length) {
    const line = frontmatterLines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Match top-level key
    const keyMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:(.*)/);
    if (!keyMatch) {
      // Not a key line, skip (shouldn't happen in well-formed YAML)
      i++;
      continue;
    }

    const key = keyMatch[1];
    const restOfLine = keyMatch[2].trim();
    const rawLines = [line];

    // Collect continuation lines (indented or array items)
    let j = i + 1;
    while (j < frontmatterLines.length) {
      const nextLine = frontmatterLines[j];
      if (nextLine.trim() === '' || /^[a-zA-Z_][a-zA-Z0-9_-]*\s*:/.test(nextLine)) {
        break;
      }
      rawLines.push(nextLine);
      j++;
    }

    // Determine the value
    let value;
    if (rawLines.length === 1) {
      // Single line value
      value = restOfLine;
    } else {
      // Multi-line value (array or block)
      const subLines = rawLines.slice(1);
      value = { multiline: true, header: restOfLine, lines: subLines };
    }

    fields.push({ key, value, rawLines });
    i = j;
  }

  return fields;
}

/**
 * Convert tools from comma-separated string to JSON array format.
 */
function convertToolsToArray(toolsValue) {
  // Already an array (inline YAML)
  if (typeof toolsValue === 'string' && toolsValue.startsWith('[')) {
    return toolsValue;
  }

  // It's a comma-separated string
  if (typeof toolsValue === 'string' && toolsValue.length > 0) {
    const tools = toolsValue.split(',').map(t => t.trim()).filter(t => t.length > 0);
    return JSON.stringify(tools);
  }

  return toolsValue;
}

/**
 * Get the name from frontmatter fields.
 */
function getFieldValue(fields, key) {
  const field = fields.find(f => f.key === key);
  if (!field) return null;
  if (typeof field.value === 'string') return field.value;
  return field.value;
}

/**
 * Check if a field exists.
 */
function hasField(fields, key) {
  return fields.some(f => f.key === key);
}

/**
 * Set or update a field value (string only).
 */
function setField(fields, key, value) {
  const existing = fields.find(f => f.key === key);
  if (existing) {
    existing.value = String(value);
    existing.rawLines = [`${key}: ${value}`];
  } else {
    fields.push({ key, value: String(value), rawLines: [`${key}: ${value}`] });
  }
}

/**
 * Reconstruct frontmatter from fields.
 */
function reconstructFrontmatter(fields) {
  const lines = [];
  for (const field of fields) {
    if (typeof field.value === 'object' && field.value && field.value.multiline) {
      // Reconstruct from rawLines
      lines.push(...field.rawLines);
    } else {
      lines.push(`${field.key}: ${field.value}`);
    }
  }
  return lines.join('\n');
}

/**
 * Process a single agent file.
 */
function processAgent(filePath) {
  stats.total++;

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    stats.errors.push({ file: filePath, error: `Read error: ${err.message}` });
    stats.skipped++;
    return;
  }

  const { frontmatterLines, body, hasFrontmatter } = parseFrontmatter(content);

  if (!hasFrontmatter) {
    stats.errors.push({ file: filePath, error: 'No frontmatter found' });
    stats.skipped++;
    return;
  }

  const fields = parseFrontmatterFields(frontmatterLines);

  const name = getFieldValue(fields, 'name');
  const tier = getFieldValue(fields, 'tier');
  const model = getFieldValue(fields, 'model');

  if (!name || !tier) {
    stats.errors.push({ file: filePath, error: `Missing name (${name}) or tier (${tier})` });
    stats.skipped++;
    return;
  }

  let modified = false;

  // === Convert tools to array ===
  const toolsField = fields.find(f => f.key === 'tools');
  if (toolsField && typeof toolsField.value === 'string' && !toolsField.value.startsWith('[')) {
    const converted = convertToolsToArray(toolsField.value);
    if (converted !== toolsField.value) {
      toolsField.value = converted;
      toolsField.rawLines = [`tools: ${converted}`];
      modified = true;
    }
  }

  // === Apply tier-specific transformations ===
  switch (tier) {
    case 'infrastructure': {
      stats.byTier.infrastructure++;

      // maxTurns
      const maxTurns = INFRA_MAX_TURNS[name] || 30;
      if (getFieldValue(fields, 'maxTurns') !== String(maxTurns)) {
        setField(fields, 'maxTurns', maxTurns);
        modified = true;
      }

      // permissionMode
      if (getFieldValue(fields, 'permissionMode') !== '"bypassPermissions"') {
        setField(fields, 'permissionMode', '"bypassPermissions"');
        modified = true;
      }

      // Special: optimizer gets opusplan
      if (name === 'optimizer') {
        if (getFieldValue(fields, 'model') !== '"opusplan"') {
          setField(fields, 'model', '"opusplan"');
          modified = true;
        }
      }
      // Keep existing model values for others
      break;
    }

    case 'controller': {
      stats.byTier.controller++;

      // maxTurns
      if (getFieldValue(fields, 'maxTurns') !== '40') {
        setField(fields, 'maxTurns', 40);
        modified = true;
      }

      // permissionMode
      if (getFieldValue(fields, 'permissionMode') !== '"bypassPermissions"') {
        setField(fields, 'permissionMode', '"bypassPermissions"');
        modified = true;
      }

      // model: opus -> opusplan
      if (model === 'opus') {
        setField(fields, 'model', '"opusplan"');
        modified = true;
      }

      // memory
      if (getFieldValue(fields, 'memory') !== '{"project": true}') {
        setField(fields, 'memory', '{"project": true}');
        modified = true;
      }
      break;
    }

    case 'execution': {
      stats.byTier.execution++;

      // maxTurns
      if (getFieldValue(fields, 'maxTurns') !== '30') {
        setField(fields, 'maxTurns', 30);
        modified = true;
      }

      // model: keep or set sonnet
      if (!model || model === '') {
        setField(fields, 'model', 'sonnet');
        modified = true;
      }
      // NO permissionMode for execution agents
      break;
    }

    case 'support': {
      stats.byTier.support++;

      // maxTurns
      if (getFieldValue(fields, 'maxTurns') !== '10') {
        setField(fields, 'maxTurns', 10);
        modified = true;
      }

      // model: haiku
      if (getFieldValue(fields, 'model') !== '"haiku"') {
        setField(fields, 'model', '"haiku"');
        modified = true;
      }

      // disallowedTools
      if (getFieldValue(fields, 'disallowedTools') !== '["Task"]') {
        setField(fields, 'disallowedTools', '["Task"]');
        modified = true;
      }
      break;
    }

    default: {
      stats.byTier.unknown++;
      stats.errors.push({ file: filePath, error: `Unknown tier: ${tier}` });
      break;
    }
  }

  // Always reconstruct and compare to detect any formatting differences
  const newFrontmatter = reconstructFrontmatter(fields);
  // Ensure blank line between closing --- and body content
  const normalizedBody = body.startsWith('\n') ? body : '\n' + body;
  const newContent = `---\n${newFrontmatter}\n---\n${normalizedBody}`;
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    stats.updated++;
  } else {
    stats.skipped++;
  }
}

// Main
function main() {
  console.log('=== cAgents Agent Frontmatter Batch Update ===\n');

  const files = findAgentFiles();
  console.log(`Found ${files.length} agent SKILL.md files\n`);

  for (const file of files) {
    processAgent(file);
  }

  console.log('=== Results ===\n');
  console.log(`Total agents found: ${stats.total}`);
  console.log(`Updated:            ${stats.updated}`);
  console.log(`Skipped (no change): ${stats.skipped}`);
  console.log();
  console.log('By tier:');
  console.log(`  infrastructure: ${stats.byTier.infrastructure}`);
  console.log(`  controller:     ${stats.byTier.controller}`);
  console.log(`  execution:      ${stats.byTier.execution}`);
  console.log(`  support:        ${stats.byTier.support}`);
  console.log(`  unknown:        ${stats.byTier.unknown}`);

  if (stats.errors.length > 0) {
    console.log(`\nErrors (${stats.errors.length}):`);
    for (const err of stats.errors) {
      console.log(`  ${err.file}: ${err.error}`);
    }
  }

  console.log('\nDone.');
}

main();

#!/usr/bin/env node
/**
 * migrate-frontmatter.cjs
 * Migrate SKILL.md frontmatter to Agent Skills spec format.
 *
 * Moves non-spec fields into `metadata:` map.
 * Spec-allowed top-level fields: name, description, license, compatibility, metadata, allowed-tools
 *
 * Usage:
 *   node scripts/migrate-frontmatter.cjs [--dry-run] [--file <path>] [--domain <domain>]
 *
 * Self-contained: uses js-yaml from node_modules.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require(path.join(__dirname, '../node_modules/js-yaml'));

// Agent Skills spec: only these 6 fields may appear at top level
const SPEC_TOP_LEVEL = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);

// Preferred metadata field order (for readability)
const METADATA_FIELD_ORDER = [
  'vibe', 'tier', 'effort', 'domain', 'model', 'color',
  'capabilities', 'maxTurns', 'disallowedTools', 'memory',
  'coordination_style', 'typical_questions', 'initialPrompt',
  'not-my-scope', 'related_agents', 'related-agents', 'tools',
  'permissionMode', // deprecated, kept for transition
];

// All domains to scan
const DOMAINS = ['engineering', 'creative', 'business', 'growth', 'people', 'service', 'leadership', 'shared', 'core'];

const ROOT = path.resolve(__dirname, '..');

// CLI args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FILE_ARG = args[args.indexOf('--file') + 1] || null;
const DOMAIN_ARG = args[args.indexOf('--domain') + 1] || null;

/**
 * Split SKILL.md into frontmatter text + body text.
 * Returns null if file doesn't start with `---`.
 */
function parseFile(content) {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) return null;
  const lines = content.split('\n');
  let endIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIdx = i;
      break;
    }
  }
  if (endIdx === -1) return null;
  const frontmatterText = lines.slice(1, endIdx).join('\n');
  // Body: everything after the closing ---
  const bodyLines = lines.slice(endIdx + 1);
  // Preserve trailing newline behavior
  const body = bodyLines.join('\n');
  return { frontmatterText, body };
}

/**
 * Serialize value to YAML indented by `indent` spaces.
 * Used for metadata block reconstruction.
 */
function serializeValue(value, indent) {
  const pad = ' '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Quote strings that need it (contain special chars, look like booleans, etc.)
    const needsQuoting =
      value === '' ||
      /[:{}[\],#&*!|>'"%@`]/.test(value) ||
      value.startsWith('-') ||
      value.startsWith('?') ||
      value.includes('\n') ||
      /^(true|false|yes|no|null|~)$/i.test(value);
    if (needsQuoting) {
      // Use JSON-style double-quote encoding for safety
      return JSON.stringify(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    // Check if it's an array of simple strings
    if (value.every(item => typeof item === 'string' && !item.includes('\n'))) {
      // Short arrays can be inline
      const inline = JSON.stringify(value);
      if (inline.length < 60) return inline;
    }
    // Block array
    return '\n' + value.map(item => {
      if (typeof item === 'string') {
        const v = serializeValue(item, indent + 2);
        return `${pad}  - ${v}`;
      } else if (typeof item === 'object' && item !== null) {
        // Object in array - serialize as block mapping
        const entries = Object.entries(item);
        if (entries.length === 0) return `${pad}  - {}`;
        const firstKey = entries[0][0];
        const firstVal = serializeValue(entries[0][1], indent + 4);
        let lines = [`${pad}  - ${firstKey}: ${firstVal}`];
        for (let i = 1; i < entries.length; i++) {
          const v = serializeValue(entries[i][1], indent + 4);
          lines.push(`${pad}    ${entries[i][0]}: ${v}`);
        }
        return lines.join('\n');
      }
      return `${pad}  - ${String(item)}`;
    }).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    return '\n' + entries.map(([k, v]) => {
      const serialized = serializeValue(v, indent + 2);
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        return `${pad}  ${k}:${serialized}`;
      } else if (Array.isArray(v) && !serialized.startsWith('[')) {
        return `${pad}  ${k}:${serialized}`;
      }
      return `${pad}  ${k}: ${serialized}`;
    }).join('\n');
  }
  return String(value);
}

/**
 * Build the new frontmatter text from parsed field map.
 */
function buildFrontmatter(specFields, metadataFields) {
  const lines = [];

  // name (required, always first)
  if (specFields.name !== undefined) {
    lines.push(`name: ${serializeValue(specFields.name, 0)}`);
  }

  // description (required, always second)
  if (specFields.description !== undefined) {
    lines.push(`description: ${serializeValue(specFields.description, 0)}`);
  }

  // metadata block (ordered by METADATA_FIELD_ORDER, then remaining alphabetically)
  const metaKeys = Object.keys(metadataFields);
  if (metaKeys.length > 0) {
    lines.push('metadata:');
    // Order: preferred order first, then remaining
    const ordered = [
      ...METADATA_FIELD_ORDER.filter(k => metaKeys.includes(k)),
      ...metaKeys.filter(k => !METADATA_FIELD_ORDER.includes(k)).sort(),
    ];
    for (const key of ordered) {
      const val = metadataFields[key];
      if (val === undefined) continue;
      const serialized = serializeValue(val, 2);
      if (Array.isArray(val) && !serialized.startsWith('[')) {
        lines.push(`  ${key}:${serialized}`);
      } else if (typeof val === 'object' && val !== null && !Array.isArray(val) && !serialized.startsWith('{')) {
        lines.push(`  ${key}:${serialized}`);
      } else {
        lines.push(`  ${key}: ${serialized}`);
      }
    }
  }

  // allowed-tools (keep at top level per spec)
  if (specFields['allowed-tools'] !== undefined) {
    lines.push(`allowed-tools: ${serializeValue(specFields['allowed-tools'], 0)}`);
  }

  // license / compatibility (optional spec fields)
  if (specFields.license !== undefined) {
    lines.push(`license: ${serializeValue(specFields.license, 0)}`);
  }
  if (specFields.compatibility !== undefined) {
    lines.push(`compatibility: ${serializeValue(specFields.compatibility, 0)}`);
  }

  return lines.join('\n');
}

/**
 * Migrate a single SKILL.md file.
 * Returns { status, reason?, movedFields? }
 */
function migrateFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return { status: 'error', reason: `read error: ${e.message}` };
  }

  const parsed = parseFile(content);
  if (!parsed) return { status: 'skip', reason: 'no frontmatter' };

  let frontmatter;
  try {
    frontmatter = yaml.load(parsed.frontmatterText);
  } catch (e) {
    return { status: 'error', reason: `YAML parse error: ${e.message}` };
  }

  if (!frontmatter || typeof frontmatter !== 'object') {
    return { status: 'skip', reason: 'empty or non-object frontmatter' };
  }

  // Check if already fully compliant
  const topLevelKeys = Object.keys(frontmatter);
  const nonSpecKeys = topLevelKeys.filter(k => !SPEC_TOP_LEVEL.has(k));
  if (nonSpecKeys.length === 0) {
    return { status: 'skip', reason: 'already compliant' };
  }

  // Separate spec vs metadata fields
  const specFields = {};
  const existingMetadata = frontmatter.metadata || {};
  const metadataFields = { ...existingMetadata };

  for (const [key, value] of Object.entries(frontmatter)) {
    if (SPEC_TOP_LEVEL.has(key)) {
      if (key !== 'metadata') { // metadata is rebuilt below
        specFields[key] = value;
      }
    } else {
      // Move to metadata (don't overwrite if already there)
      if (!(key in metadataFields)) {
        metadataFields[key] = value;
      }
    }
  }

  const newFrontmatter = buildFrontmatter(specFields, metadataFields);
  const newContent = `---\n${newFrontmatter}\n---\n${parsed.body}`;

  if (DRY_RUN) {
    return { status: 'would-migrate', movedFields: nonSpecKeys };
  }

  try {
    fs.writeFileSync(filePath, newContent, 'utf8');
  } catch (e) {
    return { status: 'error', reason: `write error: ${e.message}` };
  }

  return { status: 'migrated', movedFields: nonSpecKeys };
}

/**
 * Find all agent SKILL.md files (excludes resources/, templates/, .claude/skills/).
 */
function findAgentSkillFiles(domain) {
  const agentsDir = path.join(ROOT, domain, 'agents');
  if (!fs.existsSync(agentsDir)) return [];
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip resources and templates subdirs
        if (entry.name === 'resources' || entry.name === 'templates') continue;
        walk(path.join(dir, entry.name));
      } else if (entry.name === 'SKILL.md') {
        results.push(path.join(dir, entry.name));
      }
    }
  }
  walk(agentsDir);
  return results;
}

/**
 * Main
 */
function main() {
  const stats = { migrated: 0, skipped: 0, errors: 0, total: 0 };

  if (DRY_RUN) {
    console.log('[dry-run] No files will be modified.\n');
  }

  let files = [];

  if (FILE_ARG) {
    files = [path.resolve(FILE_ARG)];
  } else {
    const domains = DOMAIN_ARG ? [DOMAIN_ARG] : DOMAINS;
    for (const domain of domains) {
      files.push(...findAgentSkillFiles(domain));
    }
  }

  console.log(`Processing ${files.length} SKILL.md files...\n`);

  for (const file of files) {
    stats.total++;
    const rel = path.relative(ROOT, file);
    const result = migrateFile(file);

    if (result.status === 'migrated' || result.status === 'would-migrate') {
      stats.migrated++;
      const verb = DRY_RUN ? 'Would migrate' : 'Migrated';
      console.log(`  ${verb}: ${rel}`);
      console.log(`    Moved: ${result.movedFields.join(', ')}`);
    } else if (result.status === 'skip') {
      stats.skipped++;
      // Silent for clean output; uncomment to debug:
      // console.log(`  Skip: ${rel} (${result.reason})`);
    } else if (result.status === 'error') {
      stats.errors++;
      console.error(`  ERROR: ${rel}: ${result.reason}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Total:    ${stats.total}`);
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Skipped:  ${stats.skipped} (already compliant or no frontmatter)`);
  console.log(`Errors:   ${stats.errors}`);
  console.log('='.repeat(50));

  if (stats.errors > 0) process.exit(1);
}

main();

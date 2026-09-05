#!/usr/bin/env node
/**
 * Batch-inject related_agents into agent frontmatter (agents/<name>.md).
 * Reads relationship_map.yaml and applies to all agents.
 *
 * Usage: node scripts/inject-relationships.cjs <map_file>
 */

const fs = require('fs');
const path = require('path');

const mapFile = process.argv[2];
if (!mapFile) {
  console.error('Usage: node scripts/inject-relationships.cjs <relationship_map.yaml>');
  process.exit(1);
}

// Simple YAML parser for our known structure
function parseRelationshipMap(content) {
  const map = {};
  let currentDomain = null;
  let currentAgent = null;

  for (const line of content.split('\n')) {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || !line.trim()) continue;

    // Top-level domain (no indent)
    const domainMatch = line.match(/^(\w[\w-]*):$/);
    if (domainMatch) {
      currentDomain = domainMatch[1];
      map[currentDomain] = {};
      currentAgent = null;
      continue;
    }

    // Agent name (2-space indent)
    const agentMatch = line.match(/^  ([\w-]+):$/);
    if (agentMatch && currentDomain) {
      currentAgent = agentMatch[1];
      map[currentDomain][currentAgent] = [];
      continue;
    }

    // Relationship entry (4-space indent, - name: value)
    const nameMatch = line.match(/^\s+- name:\s*(.+)$/);
    if (nameMatch && currentAgent) {
      map[currentDomain][currentAgent].push({ name: nameMatch[1].trim() });
      continue;
    }

    // Type field (6-space indent)
    const typeMatch = line.match(/^\s+type:\s*(.+)$/);
    if (typeMatch && currentAgent && map[currentDomain][currentAgent].length > 0) {
      const lastEntry = map[currentDomain][currentAgent][map[currentDomain][currentAgent].length - 1];
      lastEntry.type = typeMatch[1].trim();
    }
  }

  return map;
}

function buildRelatedBlock(relationships) {
  let block = 'related_agents:\n';
  for (const rel of relationships) {
    block += `  - name: ${rel.name}\n`;
    if (rel.type) block += `    type: ${rel.type}\n`;
  }
  return block;
}

function injectIntoSkillMd(filePath, relationships) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check if already has related_agents
  if (content.includes('related_agents:')) {
    return { status: 'skipped', reason: 'already has related_agents' };
  }

  // Find the closing --- of frontmatter
  const lines = content.split('\n');
  let frontmatterEnd = -1;
  let inFrontmatter = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        frontmatterEnd = i;
        break;
      }
    }
  }

  if (frontmatterEnd === -1) {
    return { status: 'error', reason: 'no frontmatter found' };
  }

  // Insert related_agents block before closing ---
  const relatedBlock = buildRelatedBlock(relationships);
  lines.splice(frontmatterEnd, 0, relatedBlock.trimEnd());

  fs.writeFileSync(filePath, lines.join('\n'));
  return { status: 'injected', count: relationships.length };
}

// Main
const mapContent = fs.readFileSync(mapFile, 'utf8');
const relationshipMap = parseRelationshipMap(mapContent);

let injected = 0;
let skipped = 0;
let errors = 0;
let notFound = 0;

for (const [domain, agents] of Object.entries(relationshipMap)) {
  for (const [agent, relationships] of Object.entries(agents)) {
    if (!relationships || relationships.length === 0) continue;

    // v12.68.0: agent definitions are flat — agents/<name>.md. The map's
    // domain key is now only a grouping label, not a path segment.
    const skillPath = path.join('agents', `${agent}.md`);
    if (!fs.existsSync(skillPath)) {
      console.error(`NOT FOUND: ${skillPath}`);
      notFound++;
      continue;
    }

    const result = injectIntoSkillMd(skillPath, relationships);
    if (result.status === 'injected') {
      console.log(`INJECTED: ${skillPath} (${result.count} relationships)`);
      injected++;
    } else if (result.status === 'skipped') {
      console.log(`SKIPPED: ${skillPath} (${result.reason})`);
      skipped++;
    } else {
      console.error(`ERROR: ${skillPath} (${result.reason})`);
      errors++;
    }
  }
}

console.log(`\nDone: ${injected} injected, ${skipped} skipped, ${errors} errors, ${notFound} not found`);

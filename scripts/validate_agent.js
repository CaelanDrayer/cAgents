#!/usr/bin/env node
/**
 * cAgents Agent Validator
 * Self-contained - NO external dependencies
 *
 * Validates agent structure and content
 *
 * Usage:
 *   node validate_agent.js <agent-dir>
 *   node validate_agent.js make/agents/backend-developer/
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse YAML frontmatter (simple key: value parser)
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { error: 'Must start with YAML frontmatter (---)' };
  }

  const parts = content.split('---');
  if (parts.length < 3) {
    return { error: 'Invalid frontmatter format - missing closing ---' };
  }

  const yamlContent = parts[1].trim();
  const frontmatter = {};

  // Simple YAML parser for key: value pairs
  yamlContent.split('\n').forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();
      // Remove quotes
      value = value.replace(/^['"]|['"]$/g, '');
      frontmatter[key] = value;
    }
  });

  return { frontmatter, body: parts.slice(2).join('---') };
}

/**
 * Validate a single agent
 */
function validateAgent(agentDir) {
  const errors = [];
  const warnings = [];

  // Check if it's a directory or single file
  const stat = fs.statSync(agentDir);
  let skillMdPath;
  let isDirectory = false;

  if (stat.isDirectory()) {
    skillMdPath = path.join(agentDir, 'SKILL.md');
    isDirectory = true;

    // For directory structure, check for SKILL.md
    if (!fs.existsSync(skillMdPath)) {
      // Try legacy .md file
      const legacyPath = agentDir + '.md';
      if (fs.existsSync(legacyPath)) {
        skillMdPath = legacyPath;
        warnings.push('Using legacy single-file format - consider migrating to directory structure');
      } else {
        errors.push('Missing SKILL.md in agent directory');
        return { errors, warnings };
      }
    }
  } else if (stat.isFile() && agentDir.endsWith('.md')) {
    skillMdPath = agentDir;
    warnings.push('Using legacy single-file format - consider migrating to directory structure');
  } else {
    errors.push('Agent path must be a directory with SKILL.md or a .md file');
    return { errors, warnings };
  }

  // Read and parse SKILL.md
  const content = fs.readFileSync(skillMdPath, 'utf8');
  const { frontmatter, error, body } = parseFrontmatter(content);

  if (error) {
    errors.push(error);
    return { errors, warnings };
  }

  // Validate required fields
  if (!frontmatter.name) {
    errors.push("Missing 'name' in frontmatter");
  }

  if (!frontmatter.description) {
    errors.push("Missing 'description' in frontmatter");
  } else if (frontmatter.description.length < 20) {
    warnings.push("Description should be at least 20 characters");
  }

  // Validate tier
  const validTiers = ['infrastructure', 'controller', 'execution', 'support'];
  if (!frontmatter.tier) {
    warnings.push("Missing 'tier' in frontmatter (infrastructure/controller/execution/support)");
  } else if (!validTiers.includes(frontmatter.tier)) {
    warnings.push(`Invalid tier '${frontmatter.tier}' - should be one of: ${validTiers.join(', ')}`);
  }

  // Validate domain
  const validDomains = ['core', 'shared', 'make', 'grow', 'operate', 'people', 'serve'];
  if (!frontmatter.domain) {
    warnings.push("Missing 'domain' in frontmatter");
  } else if (!validDomains.includes(frontmatter.domain)) {
    warnings.push(`Unusual domain '${frontmatter.domain}' - standard domains are: ${validDomains.join(', ')}`);
  }

  // Validate model
  const validModels = ['opus', 'sonnet', 'haiku', 'inherit'];
  if (!frontmatter.model) {
    warnings.push("Missing 'model' in frontmatter - will default to session model");
  } else if (!validModels.includes(frontmatter.model)) {
    warnings.push(`Invalid model '${frontmatter.model}' - should be one of: ${validModels.join(', ')}`);
  }

  // Check for common issues in body
  if (body) {
    if (body.includes('TODO')) {
      warnings.push('Contains TODO - complete before deployment');
    }
    if (body.includes('FIXME')) {
      warnings.push('Contains FIXME - resolve before deployment');
    }
    if (body.includes('Replace with')) {
      warnings.push('Contains placeholder text "Replace with" - customize content');
    }
    if (body.length < 200) {
      warnings.push('SKILL.md body seems too short (<200 chars) - add more instructions');
    }
  }

  // Directory-specific checks
  if (isDirectory) {
    // Check for resources directory
    const resourcesDir = path.join(agentDir, 'resources');
    if (!fs.existsSync(resourcesDir)) {
      warnings.push('Missing resources/ directory');
    } else {
      const resources = fs.readdirSync(resourcesDir).filter(f => !f.startsWith('.'));
      if (resources.length === 0) {
        warnings.push('resources/ directory is empty - add reference materials');
      }
    }

    // Check for templates directory
    const templatesDir = path.join(agentDir, 'templates');
    if (!fs.existsSync(templatesDir)) {
      warnings.push('Missing templates/ directory');
    }

    // Controller-specific checks
    if (frontmatter.tier === 'controller') {
      const questionsFile = path.join(resourcesDir, 'typical-questions.md');
      if (!fs.existsSync(questionsFile)) {
        warnings.push('Controller missing resources/typical-questions.md');
      }

      // Check for coordination pattern in body
      if (!body.includes('question') && !body.includes('delegate')) {
        warnings.push('Controller should document question-based delegation pattern');
      }
    }

    // Check for README.md (should NOT exist)
    if (fs.existsSync(path.join(agentDir, 'README.md'))) {
      warnings.push('README.md found - agents should not have README files (use SKILL.md)');
    }
  }

  return { errors, warnings, frontmatter };
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('cAgents Agent Validator');
  console.log('');
  console.log('Usage: node validate_agent.js <agent-dir>');
  console.log('');
  console.log('Examples:');
  console.log('  node validate_agent.js make/agents/backend-developer/');
  console.log('  node validate_agent.js make/agents/backend-developer.md');
  process.exit(0);
}

const agentDir = args[0];

if (!fs.existsSync(agentDir)) {
  console.error(`Path not found: ${agentDir}`);
  process.exit(1);
}

const { errors, warnings, frontmatter } = validateAgent(agentDir);

// Output results
if (errors.length > 0) {
  console.log('VALIDATION FAILED');
  console.log('');
  console.log('Errors:');
  errors.forEach(e => console.log(`  ERROR: ${e}`));
  console.log('');

  if (warnings.length > 0) {
    console.log('Warnings:');
    warnings.forEach(w => console.log(`  WARNING: ${w}`));
    console.log('');
  }

  process.exit(1);
}

console.log('VALIDATION PASSED');
console.log('');

if (frontmatter) {
  console.log('Frontmatter:');
  console.log(`  name: ${frontmatter.name}`);
  console.log(`  tier: ${frontmatter.tier || '(not set)'}`);
  console.log(`  domain: ${frontmatter.domain || '(not set)'}`);
  console.log(`  model: ${frontmatter.model || '(not set)'}`);
  console.log('');
}

if (warnings.length > 0) {
  console.log('Warnings:');
  warnings.forEach(w => console.log(`  - ${w}`));
  console.log('');
}

console.log('Agent is valid and ready for use.');

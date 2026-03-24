#!/usr/bin/env node
/**
 * Pattern Extractor
 * cAgents V8.0 - Extract patterns from completed workflows
 *
 * Purpose: Analyze completed workflow sessions and extract patterns
 * that correlate with successful outcomes.
 *
 * DESIGN CONSTRAINT: 100% self-contained, no external dependencies
 * Uses only built-in Node.js modules (fs, path)
 *
 * Canonical location: scripts/knowledge/pattern-extractor.js
 * (version-controlled; previously at Agent_Memory/_knowledge/learning/pattern-extractor.js)
 */

const fs = require('fs');
const path = require('path');

// =============================================================================
// Configuration
// =============================================================================

// Resolve Agent_Memory root relative to this file's location (scripts/knowledge/ -> ../../Agent_Memory/)
const AGENT_MEMORY_ROOT = path.join(__dirname, '../../Agent_Memory');

const CONFIG = {
  sessionsDir: path.join(AGENT_MEMORY_ROOT, 'sessions'),
  patternsDir: path.join(AGENT_MEMORY_ROOT, '_knowledge/patterns'),
  historyDir: path.join(AGENT_MEMORY_ROOT, '_knowledge/learning/history'),
  minSampleSize: 5,
  similarityThreshold: 0.7
};

const MAX_PATTERN_ENTRIES = 50;
const MAX_JSONL_ENTRIES = 500;

// =============================================================================
// Simple YAML Parser (inline for self-containment)
// =============================================================================

function parseSimpleYaml(content) {
  // Very basic YAML parser for our specific use case
  const result = {};
  const lines = content.split('\n');
  let currentKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();

      if (value) {
        // Simple value
        if (value === 'true') result[key] = true;
        else if (value === 'false') result[key] = false;
        else if (/^\d+$/.test(value)) result[key] = parseInt(value);
        else if (/^\d*\.\d+$/.test(value)) result[key] = parseFloat(value);
        else result[key] = value.replace(/^["']|["']$/g, '');
      } else {
        // Object or list follows
        result[key] = {};
      }
      currentKey = key;
    }
  }

  return result;
}

// =============================================================================
// Workflow Analysis
// =============================================================================

/**
 * Analyze a completed workflow session
 * @param {string} sessionPath - Path to session directory
 * @returns {Object|null} - Extracted metrics or null if invalid
 */
function analyzeSession(sessionPath) {
  try {
    const statusPath = path.join(sessionPath, 'status.yaml');
    const planPath = path.join(sessionPath, 'workflow', 'plan.yaml');
    const coordPath = path.join(sessionPath, 'workflow', 'coordination_log.yaml');
    const validationPath = path.join(sessionPath, 'validation', 'validation_report.yaml');

    // Check if required files exist
    if (!fs.existsSync(statusPath)) return null;

    const status = parseSimpleYaml(fs.readFileSync(statusPath, 'utf8'));

    // Only analyze completed workflows
    if (status.phase !== 'completed') return null;

    const metrics = {
      session_id: path.basename(sessionPath),
      analyzed_at: new Date().toISOString(),
      status: status
    };

    // Extract plan metrics if available
    if (fs.existsSync(planPath)) {
      const plan = parseSimpleYaml(fs.readFileSync(planPath, 'utf8'));
      metrics.plan = {
        tier: plan.tier,
        domain: plan.domain,
        workflow_type: plan.workflow_type || 'unknown'
      };
    }

    // Extract coordination metrics if available
    if (fs.existsSync(coordPath)) {
      const coord = parseSimpleYaml(fs.readFileSync(coordPath, 'utf8'));
      metrics.coordination = {
        controller: coord.controller,
        status: coord.status
      };
    }

    // Extract validation metrics if available
    if (fs.existsSync(validationPath)) {
      const validation = parseSimpleYaml(fs.readFileSync(validationPath, 'utf8'));
      metrics.validation = {
        status: validation.overall_status || validation.status,
        score: validation.overall_score || validation.score
      };
    }

    return metrics;
  } catch (error) {
    console.error(`Error analyzing session ${sessionPath}: ${error.message}`);
    return null;
  }
}

/**
 * Scan all sessions and extract metrics
 * @returns {Array} - Array of session metrics
 */
function scanAllSessions() {
  const metrics = [];

  if (!fs.existsSync(CONFIG.sessionsDir)) {
    console.log('No sessions directory found');
    return metrics;
  }

  const sessions = fs.readdirSync(CONFIG.sessionsDir);

  for (const session of sessions) {
    const sessionPath = path.join(CONFIG.sessionsDir, session);

    if (!fs.statSync(sessionPath).isDirectory()) continue;

    const sessionMetrics = analyzeSession(sessionPath);
    if (sessionMetrics) {
      metrics.push(sessionMetrics);
    }
  }

  return metrics;
}

// =============================================================================
// Pattern Detection
// =============================================================================

/**
 * Group workflows by type and domain
 * @param {Array} workflows - Array of workflow metrics
 * @returns {Object} - Grouped workflows
 */
function groupWorkflows(workflows) {
  const groups = {};

  for (const workflow of workflows) {
    const type = workflow.plan?.workflow_type || 'unknown';
    const domain = workflow.plan?.domain || 'unknown';
    const key = `${domain}:${type}`;

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(workflow);
  }

  return groups;
}

/**
 * Calculate success rate for a group of workflows
 * @param {Array} workflows - Array of workflow metrics
 * @returns {Object} - Success statistics
 */
function calculateSuccessRate(workflows) {
  const total = workflows.length;
  const passed = workflows.filter(w =>
    w.validation?.status === 'PASS' || w.status?.validation_result === 'PASS'
  ).length;
  const fixable = workflows.filter(w =>
    w.validation?.status === 'FIXABLE' || w.status?.validation_result === 'FIXABLE'
  ).length;
  const blocked = workflows.filter(w =>
    w.validation?.status === 'BLOCKED' || w.status?.validation_result === 'BLOCKED'
  ).length;

  return {
    total,
    passed,
    fixable,
    blocked,
    success_rate: total > 0 ? passed / total : 0
  };
}

/**
 * Extract patterns from successful workflows
 * @param {Array} workflows - Array of workflow metrics
 * @returns {Object} - Extracted patterns
 */
function extractSuccessPatterns(workflows) {
  const successful = workflows.filter(w =>
    w.validation?.status === 'PASS' || w.status?.validation_result === 'PASS'
  );

  if (successful.length < CONFIG.minSampleSize) {
    return null;
  }

  // Find common attributes
  const tiers = successful.map(w => w.plan?.tier).filter(Boolean);
  const controllers = successful.map(w => w.coordination?.controller).filter(Boolean);

  return {
    sample_size: successful.length,
    common_tier: mode(tiers),
    common_controller: mode(controllers),
    success_rate: successful.length / workflows.length
  };
}

/**
 * Calculate mode (most common value) of an array
 * @param {Array} arr - Input array
 * @returns {*} - Most common value
 */
function mode(arr) {
  if (arr.length === 0) return null;

  const counts = {};
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
  }

  let maxCount = 0;
  let modeValue = null;

  for (const [value, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      modeValue = value;
    }
  }

  return modeValue;
}

// =============================================================================
// Pattern Cap and JSONL Rotation
// =============================================================================

/**
 * Cap an array of pattern entries to MAX_PATTERN_ENTRIES, keeping highest-scoring.
 * @param {Array} patterns - Array of pattern objects with optional impact_score
 * @returns {Array} - Capped and sorted array
 */
function capPatternEntries(patterns) {
  if (!Array.isArray(patterns)) return patterns;
  patterns.sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0));
  if (patterns.length > MAX_PATTERN_ENTRIES) {
    patterns.splice(MAX_PATTERN_ENTRIES);
  }
  return patterns;
}

/**
 * Rotate a JSONL file when it exceeds MAX_JSONL_ENTRIES lines.
 * Archives older entries to a monthly archive file and keeps the most recent.
 * @param {string} filePath - Path to the .jsonl file
 */
function rotateJsonl(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length <= MAX_JSONL_ENTRIES) return;

  const archivePath = filePath.replace('.jsonl', `_archive_${new Date().toISOString().slice(0, 7)}.jsonl`);
  const toArchive = lines.slice(0, lines.length - MAX_JSONL_ENTRIES);
  fs.appendFileSync(archivePath, toArchive.join('\n') + '\n');

  const toKeep = lines.slice(-MAX_JSONL_ENTRIES);
  fs.writeFileSync(filePath, toKeep.join('\n') + '\n');

  console.log(`Rotated ${toArchive.length} entries from ${path.basename(filePath)} to archive`);
}

/**
 * Append a JSONL entry to a file, then rotate if needed.
 * @param {string} filePath - Path to the .jsonl file
 * @param {Object} entry - Object to append as a JSONL line
 */
function appendJsonl(filePath, entry) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
  rotateJsonl(filePath);
}

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Generate pattern extraction report
 * @param {Array} workflows - All workflow metrics
 * @returns {Object} - Pattern report
 */
function generateReport(workflows) {
  const groups = groupWorkflows(workflows);
  const report = {
    generated_at: new Date().toISOString(),
    total_workflows_analyzed: workflows.length,
    groups: {}
  };

  for (const [groupKey, groupWorkflows] of Object.entries(groups)) {
    const stats = calculateSuccessRate(groupWorkflows);
    const patterns = extractSuccessPatterns(groupWorkflows);

    report.groups[groupKey] = {
      workflow_count: groupWorkflows.length,
      success_stats: stats,
      patterns: patterns
    };
  }

  // Overall statistics
  report.overall = calculateSuccessRate(workflows);

  return report;
}

/**
 * Save report to history and rotate known JSONL files if needed.
 * @param {Object} report - Generated report
 */
function saveReport(report) {
  // Ensure history directory exists
  if (!fs.existsSync(CONFIG.historyDir)) {
    fs.mkdirSync(CONFIG.historyDir, { recursive: true });
  }

  const filename = `extraction_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filepath = path.join(CONFIG.historyDir, filename);

  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`Report saved to: ${filepath}`);

  // Rotate JSONL files after each report save
  const analyticsDir = path.join(AGENT_MEMORY_ROOT, '_knowledge/analytics');
  rotateJsonl(path.join(analyticsDir, 'workflow_metrics.jsonl'));
  rotateJsonl(path.join(AGENT_MEMORY_ROOT, '_knowledge/learning/agent_performance.jsonl'));
}

// =============================================================================
// Main Execution
// =============================================================================

function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'extract';

  switch (command) {
    case 'extract':
      console.log('Scanning sessions...');
      const workflows = scanAllSessions();
      console.log(`Found ${workflows.length} completed workflows`);

      if (workflows.length === 0) {
        console.log('No completed workflows to analyze');
        return;
      }

      console.log('Generating report...');
      const report = generateReport(workflows);

      console.log('\n=== Pattern Extraction Report ===\n');
      console.log(`Total workflows: ${report.total_workflows_analyzed}`);
      console.log(`Overall success rate: ${(report.overall.success_rate * 100).toFixed(1)}%`);
      console.log('\nBy group:');

      for (const [group, data] of Object.entries(report.groups)) {
        console.log(`  ${group}: ${data.workflow_count} workflows, ${(data.success_stats.success_rate * 100).toFixed(1)}% success`);
      }

      if (args.includes('--save')) {
        saveReport(report);
      }

      break;

    case 'list':
      const sessions = scanAllSessions();
      console.log(`Found ${sessions.length} completed sessions:`);
      for (const session of sessions) {
        const status = session.validation?.status || session.status?.validation_result || 'unknown';
        console.log(`  ${session.session_id}: ${status}`);
      }
      break;

    case 'maintenance':
      console.log('Running _knowledge maintenance...');
      const analyticsDir = path.join(AGENT_MEMORY_ROOT, '_knowledge/analytics');
      rotateJsonl(path.join(analyticsDir, 'workflow_metrics.jsonl'));
      rotateJsonl(path.join(AGENT_MEMORY_ROOT, '_knowledge/learning/agent_performance.jsonl'));
      console.log(`Pattern entry cap: ${MAX_PATTERN_ENTRIES} (apply via capPatternEntries() on import)`);
      console.log('Maintenance complete.');
      break;

    case 'help':
    default:
      console.log('Pattern Extractor - cAgents V8.0');
      console.log('\nUsage:');
      console.log('  node scripts/knowledge/pattern-extractor.js extract [--save]  - Extract patterns from sessions');
      console.log('  node scripts/knowledge/pattern-extractor.js list              - List completed sessions');
      console.log('  node scripts/knowledge/pattern-extractor.js maintenance       - Rotate JSONL files and enforce caps');
      console.log('  node scripts/knowledge/pattern-extractor.js help              - Show this help');
      break;
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for programmatic use
module.exports = {
  analyzeSession,
  scanAllSessions,
  generateReport,
  saveReport,
  groupWorkflows,
  calculateSuccessRate,
  extractSuccessPatterns,
  capPatternEntries,
  rotateJsonl,
  appendJsonl,
  MAX_PATTERN_ENTRIES,
  MAX_JSONL_ENTRIES
};

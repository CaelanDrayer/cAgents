#!/usr/bin/env node
/**
 * Evaluation Runner Hook
 * cAgents V8.0 - Automated Quality Assessment
 *
 * Self-contained evaluation runner that assesses decomposition,
 * coordination, and overall workflow quality.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Usage:
 *   node eval-runner.js --session <session_id>
 *   node eval-runner.js --session <session_id> --type decomposition
 *   node eval-runner.js --daily-report
 */

const fs = require('fs');
const path = require('path');

const AGENT_MEMORY_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, 'Agent_Memory')
  : path.join(process.cwd(), 'Agent_Memory');

/**
 * Simple YAML value extraction (key: value)
 */
function extractYamlValue(content, key) {
  const regex = new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, 'm');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract YAML array (simple format)
 */
function extractYamlArray(content, key) {
  const regex = new RegExp(`${key}:\\s*\\n((?:\\s+-[^\\n]+\\n?)+)`, 'm');
  const match = content.match(regex);
  if (!match) return [];

  return match[1].split('\n')
    .map(line => line.replace(/^\s*-\s*/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Count occurrences of pattern
 */
function countPattern(content, pattern) {
  const matches = content.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Evaluate decomposition quality
 */
function evaluateDecomposition(sessionDir) {
  const result = {
    score: 0,
    max_score: 100,
    breakdown: {
      acceptance_criteria: 0,
      dependencies: 0,
      implicit_discovery: 0,
      effort_estimation: 0
    },
    issues: [],
    recommendations: []
  };

  // Read decomposition.yaml
  const decompFile = path.join(sessionDir, 'workflow', 'decomposition.yaml');
  if (!fs.existsSync(decompFile)) {
    result.issues.push('Missing decomposition.yaml');
    return result;
  }

  const content = fs.readFileSync(decompFile, 'utf8');

  // Count work items
  const workItemCount = countPattern(content, /^\s*-\s*id:\s*WI-/gm);
  if (workItemCount === 0) {
    result.issues.push('No work items found');
    return result;
  }

  // 1. Check acceptance criteria (30 points)
  const criteriaCount = countPattern(content, /acceptance_criteria:/g);
  const criteriaRate = criteriaCount / workItemCount;

  if (criteriaRate >= 1.0) {
    result.breakdown.acceptance_criteria = 30;
  } else if (criteriaRate >= 0.8) {
    result.breakdown.acceptance_criteria = 15;
    result.recommendations.push('Add acceptance criteria to all work items');
  } else {
    result.issues.push(`Only ${Math.round(criteriaRate * 100)}% of work items have acceptance criteria`);
  }

  // Check for verification methods
  const verificationCount = countPattern(content, /verification_method:/g);
  if (verificationCount < criteriaCount * 0.5) {
    result.recommendations.push('Add verification_method to acceptance criteria');
  }

  // 2. Check dependencies (25 points)
  const hasDependencies = content.includes('dependencies:');
  const hasCriticalPath = content.includes('critical_path:');

  if (hasDependencies && hasCriticalPath) {
    result.breakdown.dependencies = 25;
  } else if (hasDependencies) {
    result.breakdown.dependencies = 12;
    result.recommendations.push('Add critical_path to dependency_graph');
  } else {
    result.issues.push('Missing dependency information');
  }

  // 3. Check implicit discovery (25 points)
  const hasUnderstand = content.includes('type: understand') || content.includes("type: 'understand'");
  const hasVerify = content.includes('type: verify') || content.includes("type: 'verify'");
  const hasDocument = content.includes('type: document') || content.includes("type: 'document'");

  const implicitCount = [hasUnderstand, hasVerify, hasDocument].filter(Boolean).length;

  if (implicitCount >= 3) {
    result.breakdown.implicit_discovery = 25;
  } else if (implicitCount >= 1) {
    result.breakdown.implicit_discovery = 12;
    result.recommendations.push('Include all phases: understand, verify, document');
  } else {
    result.issues.push('No implicit requirements discovered (missing understand/verify/document phases)');
  }

  // 4. Check effort estimation (20 points)
  const effortCount = countPattern(content, /effort:\s*(xs|s|m|l|xl)/gi);
  const effortRate = effortCount / workItemCount;

  if (effortRate >= 0.9) {
    result.breakdown.effort_estimation = 20;
  } else if (effortRate >= 0.7) {
    result.breakdown.effort_estimation = 10;
    result.recommendations.push('Add effort estimates to all work items');
  } else {
    result.issues.push('Missing effort estimates on most work items');
  }

  // Calculate total score
  result.score = Object.values(result.breakdown).reduce((a, b) => a + b, 0);

  // Assign grade
  if (result.score >= 90) {
    result.grade = 'EXCELLENT';
  } else if (result.score >= 70) {
    result.grade = 'PASS';
  } else {
    result.grade = 'FAIL';
  }

  return result;
}

/**
 * Evaluate coordination quality
 */
function evaluateCoordination(sessionDir) {
  const result = {
    score: 0,
    max_score: 100,
    breakdown: {
      specificity: 0,
      delegation: 0,
      synthesis: 0,
      evidence: 0
    },
    anti_patterns: [],
    issues: [],
    recommendations: []
  };

  // Read coordination_log.yaml
  const coordFile = path.join(sessionDir, 'workflow', 'coordination_log.yaml');
  if (!fs.existsSync(coordFile)) {
    result.issues.push('Missing coordination_log.yaml');
    return result;
  }

  const content = fs.readFileSync(coordFile, 'utf8');

  // Count questions
  const questionCount = countPattern(content, /question:/g);
  if (questionCount === 0) {
    result.issues.push('No questions found in coordination log');
    return result;
  }

  // 1. Check question specificity (25 points)
  // Good patterns: specific subjects
  const specificPatterns = countPattern(content, /question:.*\b(what|how|which|current|specific|existing)\b/gi);
  // Bad patterns: vague questions
  const vaguePatterns = countPattern(content, /question:.*\b(think|good|should we|maybe)\b/gi);

  const specificityRate = (specificPatterns - vaguePatterns) / questionCount;

  if (specificityRate >= 0.8) {
    result.breakdown.specificity = 25;
  } else if (specificityRate >= 0.5) {
    result.breakdown.specificity = 15;
    result.recommendations.push('Make questions more specific and answerable');
  } else {
    result.breakdown.specificity = 5;
    result.anti_patterns.push('vague_questions');
  }

  // 2. Check delegation (25 points)
  const delegatedTo = countPattern(content, /delegated_to:/g);
  const delegationRate = delegatedTo / questionCount;

  if (delegationRate >= 0.95) {
    result.breakdown.delegation = 25;
  } else if (delegationRate >= 0.8) {
    result.breakdown.delegation = 15;
    result.recommendations.push('Ensure all questions are delegated to specialists');
  } else {
    result.breakdown.delegation = 5;
    result.anti_patterns.push('incomplete_delegation');
  }

  // Check for self-answered questions
  const selfAnswered = countPattern(content, /answered_by:\s*(controller|self)/gi);
  if (selfAnswered > 0) {
    result.anti_patterns.push('self_answered_questions');
    result.breakdown.delegation -= 20;
  }

  // 3. Check synthesis (30 points)
  const hasSynthesis = content.includes('synthesized_solution:');
  const hasApproach = content.includes('approach:');
  const hasRationale = content.includes('rationale:');

  if (hasSynthesis && hasApproach && hasRationale) {
    result.breakdown.synthesis = 30;
  } else if (hasSynthesis) {
    result.breakdown.synthesis = 15;
    result.recommendations.push('Include approach and rationale in synthesis');
  } else {
    result.issues.push('Missing synthesized solution');
    result.anti_patterns.push('missing_synthesis');
  }

  // 4. Check evidence (20 points)
  const evidenceCount = countPattern(content, /evidence:\s*["'][^"']+["']/g);
  const emptyEvidence = countPattern(content, /evidence:\s*(\[\]|null|"")/g);
  const workItemCount = countPattern(content, /id:\s*WI-/g);

  if (workItemCount > 0) {
    const evidenceRate = (evidenceCount - emptyEvidence) / Math.max(workItemCount, 1);

    if (evidenceRate >= 0.9) {
      result.breakdown.evidence = 20;
    } else if (evidenceRate >= 0.7) {
      result.breakdown.evidence = 10;
      result.recommendations.push('Capture evidence for all completed work items');
    } else {
      result.issues.push('Many work items missing evidence');
    }
  }

  // Calculate total score
  result.score = Math.max(0, Object.values(result.breakdown).reduce((a, b) => a + b, 0));

  // Assign grade
  if (result.score >= 85) {
    result.grade = 'EXCELLENT';
  } else if (result.score >= 65) {
    result.grade = 'PASS';
  } else {
    result.grade = 'FAIL';
  }

  return result;
}

/**
 * Generate evaluation report
 */
function generateReport(sessionId, decomp, coord) {
  const timestamp = new Date().toISOString();
  const overallScore = Math.round((decomp.score + coord.score) / 2);

  let overallGrade;
  if (overallScore >= 87) {
    overallGrade = 'EXCELLENT';
  } else if (overallScore >= 67) {
    overallGrade = 'PASS';
  } else {
    overallGrade = 'FAIL';
  }

  const report = `# Evaluation Report: ${sessionId}
generated_at: "${timestamp}"
evaluator: eval-runner.js
version: "8.0.0"

## Overall Assessment
overall_score: ${overallScore}
overall_grade: "${overallGrade}"

## Decomposition Quality
score: ${decomp.score}
grade: "${decomp.grade}"
breakdown:
  acceptance_criteria: ${decomp.breakdown.acceptance_criteria}
  dependencies: ${decomp.breakdown.dependencies}
  implicit_discovery: ${decomp.breakdown.implicit_discovery}
  effort_estimation: ${decomp.breakdown.effort_estimation}
${decomp.issues.length > 0 ? `issues:\n${decomp.issues.map(i => `  - "${i}"`).join('\n')}` : 'issues: []'}
${decomp.recommendations.length > 0 ? `recommendations:\n${decomp.recommendations.map(r => `  - "${r}"`).join('\n')}` : 'recommendations: []'}

## Coordination Quality
score: ${coord.score}
grade: "${coord.grade}"
breakdown:
  specificity: ${coord.breakdown.specificity}
  delegation: ${coord.breakdown.delegation}
  synthesis: ${coord.breakdown.synthesis}
  evidence: ${coord.breakdown.evidence}
${coord.anti_patterns.length > 0 ? `anti_patterns:\n${coord.anti_patterns.map(a => `  - "${a}"`).join('\n')}` : 'anti_patterns: []'}
${coord.issues.length > 0 ? `issues:\n${coord.issues.map(i => `  - "${i}"`).join('\n')}` : 'issues: []'}
${coord.recommendations.length > 0 ? `recommendations:\n${coord.recommendations.map(r => `  - "${r}"`).join('\n')}` : 'recommendations: []'}

## Summary
All issues:
${[...decomp.issues, ...coord.issues].map(i => `  - "${i}"`).join('\n') || '  - (none)'}

All recommendations:
${[...decomp.recommendations, ...coord.recommendations].map(r => `  - "${r}"`).join('\n') || '  - (none)'}
`;

  return report;
}

/**
 * Run evaluation for a session
 */
function runEvaluation(sessionId) {
  const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', sessionId);

  if (!fs.existsSync(sessionDir)) {
    console.error(`Session not found: ${sessionId}`);
    process.exit(1);
  }

  console.log(`Evaluating session: ${sessionId}`);

  // Run evaluations
  const decomp = evaluateDecomposition(sessionDir);
  const coord = evaluateCoordination(sessionDir);

  // Generate report
  const report = generateReport(sessionId, decomp, coord);

  // Save report
  const evalsDir = path.join(sessionDir, 'evals');
  if (!fs.existsSync(evalsDir)) {
    fs.mkdirSync(evalsDir, { recursive: true });
  }

  const reportFile = path.join(evalsDir, 'evaluation_report.yaml');
  fs.writeFileSync(reportFile, report);

  // Output summary
  console.log('');
  console.log('='.repeat(50));
  console.log('EVALUATION COMPLETE');
  console.log('='.repeat(50));
  console.log('');
  console.log(`Decomposition: ${decomp.score}/100 (${decomp.grade})`);
  console.log(`Coordination:  ${coord.score}/100 (${coord.grade})`);
  console.log(`Overall:       ${Math.round((decomp.score + coord.score) / 2)}/100`);
  console.log('');
  console.log(`Report saved to: ${reportFile}`);

  return { decomp, coord };
}

// Parse command line arguments
const args = process.argv.slice(2);
let sessionId = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--session' && args[i + 1]) {
    sessionId = args[++i];
  }
}

if (!sessionId) {
  console.log('cAgents Evaluation Runner');
  console.log('');
  console.log('Usage:');
  console.log('  node eval-runner.js --session <session_id>');
  console.log('');
  console.log('Example:');
  console.log('  node eval-runner.js --session run_20260127_165825');
  process.exit(0);
}

runEvaluation(sessionId);

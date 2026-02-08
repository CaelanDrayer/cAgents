#!/usr/bin/env node
/**
 * Subagent Tracker Hook - Log subagent spawns and track agent chains
 * cAgents V9.5 - Refactored
 *
 * Logs subagent spawns to active session's workflow/agent_tree.yaml.
 *
 * Input (stdin): JSON with agent_type, agent_id from SubagentStart event
 * Output (stdout): JSON with continue status and agent hierarchy context
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, safeRead, ensureDir } = require('./hook-utils.cjs');

createHook('SubagentTracker', async (input) => {
  // SubagentStart provides agent_id and agent_type per Claude Code docs
  const subagentType = input.agent_type || 'unknown';
  const agentId = input.agent_id || `agent_${Date.now()}`;
  const description = (input.description || '').slice(0, 100);
  const parentAgent = input.parent_agent || 'root';

  const sessionDir = findActiveSession();
  if (!sessionDir) return null;

  const workflowDir = ensureDir(path.join(sessionDir, 'workflow'));
  const treeFile = path.join(workflowDir, 'agent_tree.yaml');

  const existingContent = safeRead(treeFile);
  const safeDesc = description.replace(/"/g, "'").replace(/\n/g, ' ');
  const now = new Date().toISOString();
  const newEntry = `\n- id: "${agentId}"\n  type: "${subagentType}"\n  description: "${safeDesc}"\n  parent: "${parentAgent}"\n  spawned_at: "${now}"\n`;

  if (!existingContent) {
    fs.writeFileSync(treeFile, `# Agent Tree\n# Session: ${path.basename(sessionDir)}\n\nagents:${newEntry}`);
  } else {
    fs.appendFileSync(treeFile, newEntry);
  }

  // Count existing agents by type
  const typeMatches = (existingContent || '').match(/type: "([^"]+)"/g) || [];
  const total = typeMatches.length + 1;

  console.error(`[SubagentTracker] Spawned ${subagentType} (parent: ${parentAgent})`);

  return {
    continue: true,
    systemMessage: `Agent tree: ${total} agents spawned (latest: ${subagentType})`
  };
});

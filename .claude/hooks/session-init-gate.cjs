#!/usr/bin/env node
/**
 * Session Init Gate Hook - PreToolUse[Task] Guard
 * cAgents V10.22.6
 *
 * Denies agent spawns (Agent tool calls) when no active session directory
 * with status.yaml exists. Enforces the V10.22.0 session initialization
 * gate: every skill must create its session dir before spawning agents.
 *
 * Bypass: CAGENTS_SESSION_ID env var set AND session dir does NOT yet exist —
 * skill is currently creating the session directory using that ID. Allow the
 * spawn so the session can bootstrap. If the dir already exists, fall through
 * to the standard findActiveSession check.
 */

const fs = require('fs');
const path = require('path');
const { createHook, findActiveSession, AGENT_MEMORY_DIR, denyWithReason } = require('./hook-utils.cjs');

createHook('SessionInitGate', async (input) => {
  const toolName = input.tool_name || '';

  // Only gate Agent tool calls (agent spawns)
  if (toolName !== 'Agent') return null;

  // Bypass only when the session dir doesn't exist yet — skill is bootstrapping
  if (process.env.CAGENTS_SESSION_ID) {
    const sessionDir = path.join(AGENT_MEMORY_DIR, 'sessions', process.env.CAGENTS_SESSION_ID);
    if (!fs.existsSync(sessionDir)) return null;
    // Dir already exists — fall through to standard check below
  }

  // Check for an active session with status.yaml
  const sessionDir = findActiveSession(input.session_id);
  if (sessionDir) return null;

  // No active session found — block the spawn
  const expectedPath = path.join(AGENT_MEMORY_DIR, 'sessions', '<session_id>', 'status.yaml');

  return denyWithReason({
    hook: 'SessionInitGate',
    what: 'Agent spawn blocked — no active session directory found',
    why: 'Every skill must initialize a session directory with status.yaml before spawning agents (V10.22.0 session init gate)',
    fix: `Run a skill first (/run, /team, /org, etc.) to create the session. Expected: ${expectedPath}`
  });
});

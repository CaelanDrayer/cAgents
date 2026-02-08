#!/usr/bin/env node
/**
 * Notification Hook - Status notifications for cAgents workflows
 * cAgents V8.0 - Hook System Enhancement
 *
 * This hook handles the Notification event type for status updates.
 * Can be used to track phase transitions, completions, and alerts.
 *
 * 100% Self-Contained: Uses only built-in Node.js modules.
 *
 * Input (stdin): JSON with notification context
 * Output (stdout): JSON with continue status
 */

// CRITICAL: Wrap everything in try-catch for plugin resilience
try {

const fs = require('fs');
const path = require('path');

// Try to load hook-utils, fall back to inline implementations
let utils;
try {
  utils = require('./hook-utils.cjs');
} catch {
  // Minimal inline fallbacks for plugin mode
  utils = {
    readStdin: () => Promise.resolve({}),
    AGENT_MEMORY_DIR: path.join(process.cwd(), 'Agent_Memory')
  };
}

const { readStdin, AGENT_MEMORY_DIR } = utils;

/**
 * Log notification to file
 */
function logNotification(notification) {
  const logsDir = path.join(AGENT_MEMORY_DIR, '_system', 'logs');

  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const date = new Date();
    const dateStr = date.toISOString().split('T')[0];
    const logFile = path.join(logsDir, `notifications_${dateStr}.log`);

    const entry = {
      timestamp: date.toISOString(),
      ...notification
    };

    // Log rotation: truncate if over 1MB to prevent unbounded growth
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > 1024 * 1024) {
        // Keep last 100 lines
        const lines = fs.readFileSync(logFile, 'utf8').split('\n');
        fs.writeFileSync(logFile, lines.slice(-100).join('\n') + '\n');
      }
    } catch { /* file may not exist yet, ignore */ }

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error(`[Notification] Failed to log: ${error.message}`);
  }
}

/**
 * Get notification type and message from context
 */
function parseNotification(input) {
  return {
    type: input.notification_type || input.type || 'info',
    message: input.message || input.content || '',
    session_id: input.session_id || 'unknown',
    phase: input.phase || null,
    instruction_id: input.instruction_id || null,
    metadata: input.metadata || {}
  };
}

/**
 * Main hook execution
 */
async function main() {
  const input = await readStdin();

  try {
    const notification = parseNotification(input);

    // Log the notification
    logNotification(notification);

    // Log to stderr by type
    const logMessages = {
      phase_complete: `Phase complete: ${notification.phase}`,
      workflow_complete: `Workflow complete: ${notification.instruction_id}`,
      error: `Error: ${notification.message}`,
      hitl_required: `HITL approval required: ${notification.message}`
    };
    const msg = logMessages[notification.type] || notification.message;
    if (msg) console.error(`[Notification] ${msg}`);

    // Always continue - notifications are non-blocking
    console.log(JSON.stringify({ continue: true }));

  } catch (error) {
    console.error(`[Notification] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

} catch (e) {
  // Top-level catch for plugin resilience - always output valid JSON
  console.log(JSON.stringify({ continue: true }));
}

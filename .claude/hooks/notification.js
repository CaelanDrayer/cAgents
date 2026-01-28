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

const fs = require('fs');
const path = require('path');

const AGENT_MEMORY_DIR = process.env.CLAUDE_PROJECT_DIR
  ? path.join(process.env.CLAUDE_PROJECT_DIR, 'Agent_Memory')
  : path.join(process.cwd(), 'Agent_Memory');

/**
 * Read JSON from stdin
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');

    if (process.stdin.isTTY) {
      resolve({});
      return;
    }

    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        resolve({});
      }
    });
    process.stdin.on('error', () => resolve({}));

    setTimeout(() => resolve({}), 1000);
  });
}

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

    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error(`[Notification] Failed to log: ${error.message}`);
  }
}

/**
 * Get notification type and message from context
 */
function parseNotification(input) {
  // Notification context may vary - extract what we can
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

    // Handle specific notification types
    switch (notification.type) {
      case 'phase_complete':
        console.error(`[Notification] Phase complete: ${notification.phase}`);
        break;

      case 'workflow_complete':
        console.error(`[Notification] Workflow complete: ${notification.instruction_id}`);
        break;

      case 'error':
        console.error(`[Notification] Error: ${notification.message}`);
        break;

      case 'hitl_required':
        console.error(`[Notification] HITL approval required: ${notification.message}`);
        break;

      default:
        if (notification.message) {
          console.error(`[Notification] ${notification.message}`);
        }
    }

    // Always continue - notifications are non-blocking
    console.log(JSON.stringify({ continue: true }));

  } catch (error) {
    console.error(`[Notification] Error: ${error.message}`);
    console.log(JSON.stringify({ continue: true }));
  }
}

main();

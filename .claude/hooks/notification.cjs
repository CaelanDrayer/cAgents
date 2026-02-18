#!/usr/bin/env node
/**
 * Notification Hook - Status notifications for cAgents workflows
 * cAgents V9.10 - Refactored
 *
 * Handles the Notification event type for status updates.
 * Logs notifications to daily log files.
 *
 * Input (stdin): JSON with notification context
 * Output (stdout): JSON with continue status
 */

const fs = require('fs');
const path = require('path');
const { createHook, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

createHook('Notification', async (input) => {
  const notification = {
    type: input.notification_type || input.type || 'info',
    message: input.message || input.content || '',
    session_id: input.session_id || 'unknown',
    phase: input.phase || null
  };

  // Log to file
  const logsDir = path.join(AGENT_MEMORY_DIR, '_system', 'logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `notifications_${dateStr}.log`);

    // Rotation: truncate if over 1MB
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > 1024 * 1024) {
        const lines = fs.readFileSync(logFile, 'utf8').split('\n');
        fs.writeFileSync(logFile, lines.slice(-100).join('\n') + '\n');
      }
    } catch { /* file may not exist yet */ }

    const entry = { timestamp: new Date().toISOString(), ...notification };
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch (error) {
    console.error(`[Notification] Failed to log: ${error.message}`);
  }

  // Log to stderr
  const msg = notification.message || `${notification.type}: ${notification.session_id}`;
  if (msg) console.error(`[Notification] ${msg}`);

  return null;  // Non-blocking
});

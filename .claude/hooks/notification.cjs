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

  // LP-15: idle_prompt notifications accounted for 75%+ of log volume in the
  // audit and provide no diagnostic value to cAgents (teammate-idle-handler.cjs
  // covers the work-routing path). Drop them at the front of the hook before
  // any disk I/O so they don't accumulate noise in notifications_<date>.log.
  if (notification.type === 'idle_prompt') {
    return null;  // Non-blocking, no log write
  }

  // Log to file
  const logsDir = path.join(AGENT_MEMORY_DIR, '_system', 'logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const dateStr = new Date().toISOString().split('T')[0];
    const logFile = path.join(logsDir, `notifications_${dateStr}.log`);

    // Rotation: if over 1MB, read last 32KB instead of full file (avoid O(n) memory)
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > 1024 * 1024) {
        const fd = fs.openSync(logFile, 'r');
        const tailSize = 32 * 1024;
        const buf = Buffer.alloc(tailSize);
        fs.readSync(fd, buf, 0, tailSize, stats.size - tailSize);
        fs.closeSync(fd);
        const tail = buf.toString('utf8');
        // Find first complete line
        const firstNewline = tail.indexOf('\n');
        fs.writeFileSync(logFile, tail.slice(firstNewline + 1));
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

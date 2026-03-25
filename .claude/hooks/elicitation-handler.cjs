#!/usr/bin/env node
/**
 * Elicitation Handler Hook - Logs MCP elicitation requests and user responses
 * cAgents V10.22.7
 *
 * Handles two event types registered in settings.json:
 *   Elicitation      - MCP server requests user input; logs the request and
 *                      validates the server name is known.
 *   ElicitationResult - User responded; logs the action and result preview.
 *
 * Both handlers return null (pass-through, logging only).
 *
 * Input (stdin): JSON with event context from Claude Code
 * Output (stdout): {"continue": true}
 */

const fs = require('fs');
const path = require('path');
const { createHook, AGENT_MEMORY_DIR } = require('./hook-utils.cjs');

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function getLogFile() {
  const logsDir = path.join(AGENT_MEMORY_DIR, '_system', 'logs');
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  } catch { /* best-effort */ }
  const dateStr = new Date().toISOString().split('T')[0];
  return path.join(logsDir, `elicitations_${dateStr}.log`);
}

function appendLog(entry) {
  try {
    fs.appendFileSync(getLogFile(), JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error(`[ElicitationHandler] Failed to write log: ${err.message}`);
  }
}

/**
 * Detect whether the input is an Elicitation or ElicitationResult event.
 *
 * Elicitation:       has `prompt` or `schema`
 * ElicitationResult: has `result`
 * Falls back to explicit `event_type` field if Claude Code provides it.
 */
function detectEventType(input) {
  if (input.event_type) return input.event_type;
  if (input.result !== undefined) return 'ElicitationResult';
  if (input.prompt !== undefined || input.schema !== undefined) return 'Elicitation';
  return 'unknown';
}

// Known MCP server name fragments (warn when unrecognized, never block)
const KNOWN_SERVERS = [
  'filesystem', 'github', 'postgres', 'puppeteer', 'brave-search',
  'sequential-thinking', 'gmail', 'cwm-dispatch'
];

// --------------------------------------------------------------------------
// Hook — handles both Elicitation and ElicitationResult
// --------------------------------------------------------------------------

createHook('ElicitationHandler', async (input) => {
  const eventType = detectEventType(input);
  const timestamp = new Date().toISOString();

  if (eventType === 'Elicitation') {
    const serverName = input.mcp_server_name || input.server_name || 'unknown';
    const elicitationId = input.elicitation_id || input.request_id || null;
    const promptText = input.prompt || input.message || '';
    const hasSchema = input.schema != null;

    const isKnown = serverName === 'unknown'
      || KNOWN_SERVERS.some(s => serverName.includes(s));

    if (!isKnown) {
      console.error(
        `[ElicitationHandler] WARNING: Elicitation from unrecognized server: ${serverName}`
      );
    }

    appendLog({
      timestamp,
      event: 'Elicitation',
      server_name: serverName,
      elicitation_id: elicitationId,
      prompt: promptText.slice(0, 200),
      has_schema: hasSchema,
      session_id: input.session_id || null,
      known_server: isKnown
    });

    console.error(
      `[ElicitationHandler] Elicitation from ${serverName}: ${promptText.slice(0, 80)}`
    );

  } else if (eventType === 'ElicitationResult') {
    const serverName = input.mcp_server_name || input.server_name || 'unknown';
    const elicitationId = input.elicitation_id || input.request_id || null;
    const action = input.action || 'unknown';
    const resultPreview = input.result !== undefined
      ? JSON.stringify(input.result).slice(0, 200)
      : null;

    appendLog({
      timestamp,
      event: 'ElicitationResult',
      server_name: serverName,
      elicitation_id: elicitationId,
      action,
      result_preview: resultPreview,
      session_id: input.session_id || null
    });

    console.error(
      `[ElicitationHandler] ElicitationResult from ${serverName}: action=${action}`
    );

  } else {
    appendLog({ timestamp, event: 'unknown', raw_keys: Object.keys(input) });
    console.error(
      '[ElicitationHandler] Unknown event shape — logged and passed through'
    );
  }

  return null; // pass-through — logging only
});

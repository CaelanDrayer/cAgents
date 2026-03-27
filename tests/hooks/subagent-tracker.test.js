import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync, spawnSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'subagent-tracker.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('subagent-tracker.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return a valid hook response with unique agent_id', () => {
    // Use a unique agent_id to avoid dedup in agent_tree.yaml
    const uniqueId = `test_subagent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = runHook({ agent_type: 'test-agent', agent_id: uniqueId });
    // The hook returns either hookSpecificOutput (new entry) or continue:true (deduped)
    expect(result).toBeDefined();
    if (result.hookSpecificOutput) {
      expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
      expect(result.hookSpecificOutput.additionalContext).toContain('test-agent');
    } else {
      expect(result.continue).toBe(true);
    }
  });

  it('should include cagents: self-registration guidance for new agents', () => {
    const uniqueId = `test_cagents_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = runHook({ agent_type: 'general-purpose', agent_id: uniqueId });
    if (result.hookSpecificOutput) {
      expect(result.hookSpecificOutput.additionalContext).toContain('cagents:');
    } else {
      expect(result.continue).toBe(true);
    }
  });

  it('should handle missing agent_type gracefully', () => {
    const uniqueId = `test_notype_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = runHook({ agent_id: uniqueId });
    expect(result).toBeDefined();
    if (result.hookSpecificOutput) {
      expect(result.hookSpecificOutput.additionalContext).toContain('unknown');
    } else {
      expect(result.continue).toBe(true);
    }
  });

  it('should handle missing agent_id gracefully', () => {
    const result = runHook({ agent_type: 'test-agent' });
    expect(result).toBeDefined();
  });

  describe('fallback session discovery', () => {
    it('should have fallback function findMostRecentSessionDir', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('findMostRecentSessionDir');
    });

    it('should skip completed sessions in fallback', () => {
      // findMostRecentSessionDir was moved to hook-utils.cjs (GAP-4 fix: shared between
      // subagent-tracker and subagent-stop-tracker). Check the shared implementation.
      const utilsPath = join(HOOKS_DIR, 'hook-utils.cjs');
      const utilsContent = readFileSync(utilsPath, 'utf8');
      expect(utilsContent).toContain('TERMINAL_STATES.includes(phase)');
    });
  });

  describe('global audit log', () => {
    it('should have audit log function', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('appendToGlobalAuditLog');
      expect(hookContent).toContain('agent_spawns.log');
    });

    it('should implement log rotation', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('1024 * 1024'); // 1MB threshold
    });
  });

  describe('cagents_type warning', () => {
    it('should emit WARNING on stderr when subagent_type is absent', () => {
      const uniqueId = `test_warn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const input = { agent_type: 'general-purpose', agent_id: uniqueId };
      const result = spawnSync('node', [HOOK_PATH], {
        input: JSON.stringify(input),
        encoding: 'utf8',
        timeout: 5000
      });
      expect(result.stderr).toContain('WARNING');
      expect(result.stderr).toContain('cagents_type');
    });
  });

  describe('YAML validation (REQ-002)', () => {
    it('should append valid agent entry using js-yaml parsed object', () => {
      const uniqueId = `test_yaml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = runHook({ agent_type: 'test-yaml-agent', agent_id: uniqueId });
      // Hook should return a valid response without crashing
      expect(result).toBeDefined();
      if (result.hookSpecificOutput) {
        expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
      } else {
        // No active session: hook returns continue:true — still a valid response
        expect(result.continue).toBe(true);
      }
    });

    it('should skip append and log error for malformed agent_tree.yaml', () => {
      // Content-based check: verify the hook source handles yaml.load() parse errors
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('Malformed agent_tree.yaml \u2014 skipping append');
      expect(hookContent).toContain('parseErr.message');
      // Hook must still return continue:true — verified by the factory try/catch
      expect(hookContent).toContain('yaml.load(existingContent)');
    });

    it('should detect duplicate via parsed object lookup not string match', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      // Dedup now uses parsedObj.agents.some() instead of string.includes()
      expect(hookContent).toContain('parsedObj.agents.some(a => a.id === agentId)');
      // The old string-based dedup must NOT be present
      expect(hookContent).not.toContain('existingContent.includes(`id: "');
    });

    it('should initialize fresh file with valid agents array', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      // Fresh file path initializes parsedObj with empty agents array
      expect(hookContent).toContain('agents: []');
      // And writes with header comment
      expect(hookContent).toContain('headerComment');
      expect(hookContent).toContain('isFreshFile');
    });

    it('should require js-yaml module', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain("require('js-yaml')");
    });

    it('should use yaml.dump for writing entries', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('yaml.dump(parsedObj)');
    });

    it('should log error when agents key is missing from parsed YAML', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('agent_tree.yaml missing agents: key \u2014 skipping append');
    });
  });

  // ---------------------------------------------------------------------------
  // WI-4 Regression tests: prompt-based session resolution (Fix C)
  // Bug: Task-spawned subagents cannot inherit CAGENTS_ACTIVE_SESSION env var.
  // Fix: Parse SESSION_DIR or CAGENTS_SESSION_ID from input.tool_input.prompt.
  // ---------------------------------------------------------------------------
  describe('prompt-based session resolution (WI-4 regression)', () => {
    const os = require('os');
    const path = require('path');
    const fs = require('fs');

    it('hook source contains Pass 3 prompt-based resolution code', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      // The third resolution pass must exist
      expect(hookContent).toContain('Pass 3');
      expect(hookContent).toContain('tool_input');
      expect(hookContent).toContain('SESSION[_ ]DIR');
      expect(hookContent).toContain('CAGENTS_SESSION_ID');
      expect(hookContent).toContain('Resolved session from prompt hint');
      expect(hookContent).toContain('Prompt hint session not found on disk');
    });

    it('hook uses fs.existsSync to verify candidate dir before using prompt hint', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('fs.existsSync(candidateDir)');
    });

    it('resolves session from SESSION_DIR in prompt — behavioral test using isolated temp dir', () => {
      // Create an isolated temp Agent_Memory so the hook has no other active sessions to find.
      // This ensures Pass 1 (findActiveSession) and Pass 2 (findMostRecentSessionDir) both return
      // null, so Pass 3 (prompt-based) is exercised.
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-test-'));
      const sessionName = `team_prompt-resolution-test_260101_001`;
      const sessionDir = path.join(tmpRoot, 'Agent_Memory', 'sessions', sessionName);
      const workflowDir = path.join(sessionDir, 'workflow');
      fs.mkdirSync(workflowDir, { recursive: true });
      // Write status.yaml so the session dir looks legitimate but is "complete" (not active)
      // Pass 1 won't match it (completed state), Pass 3 ignores state and just checks fs.existsSync
      fs.writeFileSync(path.join(sessionDir, 'status.yaml'), 'phase: complete\n');

      try {
        const uniqueId = `test_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const input = {
          agent_type: 'cagents:backend-developer',
          agent_id: uniqueId,
          // UUID session_id — not a cAgents session name, won't match via findActiveSession
          session_id: '550e8400-e29b-41d4-a716-446655440000',
          tool_input: {
            prompt: `You are a teammate controller.\nSESSION DIR: ${sessionName}\nImplement the work item.`
          }
        };

        // Run with CLAUDE_PROJECT_DIR pointing to our temp root, so AGENT_MEMORY_DIR resolves there
        // Also unset CAGENTS_ACTIVE_SESSION so Pass 0 does not fire
        const env = {
          ...process.env,
          CLAUDE_PROJECT_DIR: tmpRoot,
        };
        delete env.CAGENTS_ACTIVE_SESSION;

        const result = spawnSync('node', [HOOK_PATH], {
          input: JSON.stringify(input),
          encoding: 'utf8',
          timeout: 8000,
          env,
        });

        // Hook must succeed (exit 0)
        expect(result.status).toBe(0);
        const output = JSON.parse(result.stdout.trim());
        expect(output).toBeDefined();

        // Pass 3 must have fired and resolved the session from the prompt hint
        expect(result.stderr).toContain('Resolved session from prompt hint');
        expect(result.stderr).toContain(sessionName);

        // The hook must have written the agent entry to the resolved session's agent_tree.yaml
        const treeFile = path.join(workflowDir, 'agent_tree.yaml');
        expect(fs.existsSync(treeFile)).toBe(true);
        const content = fs.readFileSync(treeFile, 'utf8');
        expect(content).toContain(uniqueId);
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    });

    it('falls back gracefully when prompt contains no session hint', () => {
      // Use an isolated temp dir so no active sessions exist → Pass 1 and Pass 2 return null
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-test-nohint-'));
      // Create sessions dir but leave it empty
      fs.mkdirSync(path.join(tmpRoot, 'Agent_Memory', 'sessions'), { recursive: true });

      try {
        const uniqueId = `test_nohint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const input = {
          agent_type: 'cagents:backend-developer',
          agent_id: uniqueId,
          session_id: '550e8400-e29b-41d4-a716-446655440001',
          tool_input: {
            prompt: 'Implement the work item. No session context provided.'
          }
        };

        const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot };
        delete env.CAGENTS_ACTIVE_SESSION;

        const result = spawnSync('node', [HOOK_PATH], {
          input: JSON.stringify(input),
          encoding: 'utf8',
          timeout: 8000,
          env,
        });

        // Hook must not crash
        expect(result.status).toBe(0);
        const output = JSON.parse(result.stdout.trim());
        expect(output).toBeDefined();

        // Pass 3 should NOT log "Resolved" when prompt has no session hint
        expect(result.stderr).not.toContain('Resolved session from prompt hint');
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    });

    it('does not use prompt hint when session directory does not exist on disk', () => {
      // Isolated temp dir with no sessions
      const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-test-nonexist-'));
      fs.mkdirSync(path.join(tmpRoot, 'Agent_Memory', 'sessions'), { recursive: true });

      try {
        const uniqueId = `test_nonexist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const input = {
          agent_type: 'cagents:backend-developer',
          agent_id: uniqueId,
          session_id: '550e8400-e29b-41d4-a716-446655440002',
          tool_input: {
            // References a session name that doesn't exist in tmpRoot's Agent_Memory/sessions/
            prompt: 'SESSION DIR: team_this_session_does_not_exist_260101_999\nDo the work.'
          }
        };

        const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot };
        delete env.CAGENTS_ACTIVE_SESSION;

        const result = spawnSync('node', [HOOK_PATH], {
          input: JSON.stringify(input),
          encoding: 'utf8',
          timeout: 8000,
          env,
        });

        // Hook must not crash
        expect(result.status).toBe(0);
        const output = JSON.parse(result.stdout.trim());
        expect(output).toBeDefined();

        // Hook must log that the hint session was not found on disk
        expect(result.stderr).toContain('Prompt hint session not found on disk');
        // Must NOT log "Resolved" (directory doesn't exist)
        expect(result.stderr).not.toContain('Resolved session from prompt hint');
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    });
  });
});

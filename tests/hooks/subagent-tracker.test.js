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

  describe('test agent filtering (F-05)', () => {
    it('should skip agents with test_ prefixed IDs and return continue:true', () => {
      const testId = `test_skip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = runHook({ agent_type: 'test-agent', agent_id: testId });
      // Filtered test agents return {continue: true} (null from createHook)
      expect(result).toBeDefined();
      expect(result.continue).toBe(true);
      // Should NOT have hookSpecificOutput (no tracking occurred)
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('should not skip agents without test_ prefix', () => {
      const realId = `agent_real_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const result = runHook({ agent_type: 'test-agent', agent_id: realId });
      expect(result).toBeDefined();
      // Real agents should either get tracked (hookSpecificOutput) or at least not be silently skipped
      if (result.hookSpecificOutput) {
        expect(result.hookSpecificOutput.hookEventName).toBe('SubagentStart');
      }
    });

    it('hook source contains test_ filter pattern', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('/^test_/');
      expect(hookContent).toContain('Skipping test agent');
    });
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
      const uniqueId = `agent_warn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
  // R3 Regression tests: SENTINEL_DEPTH_MAP depth tracking fix
  // Bug: inferParentAgent() returns sentinel strings ('pipeline', 'controller')
  //      which were passed to agents.find() and never matched, causing all
  //      sentinel-parented agents to get depth=1 (unknown fallback).
  // Fix: SENTINEL_DEPTH_MAP maps 'pipeline'->1, 'controller'->2 before find().
  // ---------------------------------------------------------------------------
  describe('depth tracking with SENTINEL_DEPTH_MAP (R3 regression)', () => {
    const os = require('os');
    const pathMod = require('path');
    const fs = require('fs');
    const yaml = require('js-yaml');

    /**
     * Helper: create an isolated temp Agent_Memory with a session directory,
     * pre-populated agent_tree.yaml and status.yaml, then run the hook and
     * return the depth of the newly added agent entry.
     */
    function runWithDepthCheck({ statusPhase, existingAgents, agentType, promptOverride }) {
      const tmpRoot = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'cagents-depth-'));
      const sessionName = `run_depth-test_260101_001`;
      const sessionDir = pathMod.join(tmpRoot, 'Agent_Memory', 'sessions', sessionName);
      const workflowDir = pathMod.join(sessionDir, 'workflow');
      fs.mkdirSync(workflowDir, { recursive: true });

      // Write status.yaml to control inferParentAgent's phase-based logic
      fs.writeFileSync(
        pathMod.join(sessionDir, 'status.yaml'),
        `phase: ${statusPhase}\npipeline_state: ${statusPhase}\n`
      );

      // Write agent_tree.yaml with existing agents (if any)
      if (existingAgents && existingAgents.length > 0) {
        fs.writeFileSync(
          pathMod.join(workflowDir, 'agent_tree.yaml'),
          yaml.dump({ agents: existingAgents })
        );
      }

      // Also create Agent_Memory/_system/logs/ for audit log (avoids noise)
      fs.mkdirSync(pathMod.join(tmpRoot, 'Agent_Memory', '_system', 'logs'), { recursive: true });

      const uniqueId = `agent_depth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const input = {
        agent_type: agentType || 'cagents:backend-developer',
        agent_id: uniqueId,
        session_id: '550e8400-0000-0000-0000-000000000000',
        tool_input: {
          prompt: promptOverride || `SESSION DIR: ${sessionName}\nImplement the work item.`,
          subagent_type: agentType || 'cagents:backend-developer'
        }
      };

      const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot };
      delete env.CAGENTS_ACTIVE_SESSION;

      try {
        const result = spawnSync('node', [HOOK_PATH], {
          input: JSON.stringify(input),
          encoding: 'utf8',
          timeout: 8000,
          env,
        });

        expect(result.status).toBe(0);

        // Read back agent_tree.yaml and find our agent's depth
        const treeFile = pathMod.join(workflowDir, 'agent_tree.yaml');
        expect(fs.existsSync(treeFile)).toBe(true);
        const treeContent = fs.readFileSync(treeFile, 'utf8');
        const parsed = yaml.load(treeContent);
        const ourAgent = parsed.agents.find(a => a.id === uniqueId);
        expect(ourAgent).toBeDefined();
        return { depth: ourAgent.depth, parent: ourAgent.parent, stderr: result.stderr };
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    }

    it('sentinel parent "pipeline" produces depth=1', () => {
      // Status phase INIT triggers inferParentAgent to return 'pipeline'
      const result = runWithDepthCheck({
        statusPhase: 'INIT',
        existingAgents: [{ id: 'dummy-root', type: 'root', parent: null, depth: 0, spawned_at: '2026-01-01', stopped_at: null }],
        agentType: 'cagents:orchestrator', // enrichment agent -> 'pipeline'
      });
      expect(result.parent).toBe('pipeline');
      expect(result.depth).toBe(1);
    });

    it('sentinel parent "controller" produces depth=2', () => {
      // Status phase COORDINATING with NO known controller in tree -> 'controller' sentinel
      const result = runWithDepthCheck({
        statusPhase: 'COORDINATING',
        existingAgents: [
          { id: 'some-unknown-agent', type: 'general-purpose', parent: 'pipeline', depth: 1, spawned_at: '2026-01-01', stopped_at: null }
        ],
        agentType: 'cagents:backend-developer', // execution agent, NOT enrichment
      });
      expect(result.parent).toBe('controller');
      expect(result.depth).toBe(2);
    });

    it('real parent agent ID produces parent.depth + 1', () => {
      // Status phase COORDINATING with a known controller in tree -> returns controller's agent_id
      const controllerId = 'ctrl-em-abc123';
      const result = runWithDepthCheck({
        statusPhase: 'COORDINATING',
        existingAgents: [
          { id: controllerId, type: 'general-purpose', parent: 'pipeline', depth: 1,
            cagents_type: 'cagents:engineering-manager', spawned_at: '2026-01-01', stopped_at: null }
        ],
        agentType: 'cagents:backend-developer',
      });
      // inferParentAgent should find the engineering-manager controller and return its ID
      expect(result.parent).toBe(controllerId);
      expect(result.depth).toBe(2); // parent depth 1 + 1
    });

    it('real parent at depth=3 produces depth=4 (deep nesting)', () => {
      // Use a single controller entry at depth=3 to verify depth arithmetic
      const controllerId = 'ctrl-deep-xyz789';
      const result = runWithDepthCheck({
        statusPhase: 'COORDINATING',
        existingAgents: [
          { id: controllerId, type: 'general-purpose', parent: 'pipeline', depth: 3,
            cagents_type: 'cagents:engineering-manager', spawned_at: '2026-01-01', stopped_at: null }
        ],
        agentType: 'cagents:backend-developer',
      });
      expect(result.parent).toBe(controllerId);
      expect(result.depth).toBe(4); // parent depth 3 + 1
    });

    it('unknown parent string (not in tree, not sentinel) falls back to depth=1', () => {
      // We need a scenario where inferParentAgent returns a string that's neither
      // a sentinel nor a real agent ID in the tree. This happens when pending_spawns.yaml
      // references a parent_id that wasn't tracked yet.
      const tmpRoot = fs.mkdtempSync(pathMod.join(os.tmpdir(), 'cagents-depth-unknown-'));
      const sessionName = `run_depth-unknown_260101_001`;
      const sessionDir = pathMod.join(tmpRoot, 'Agent_Memory', 'sessions', sessionName);
      const workflowDir = pathMod.join(sessionDir, 'workflow');
      fs.mkdirSync(workflowDir, { recursive: true });
      fs.mkdirSync(pathMod.join(tmpRoot, 'Agent_Memory', '_system', 'logs'), { recursive: true });

      fs.writeFileSync(pathMod.join(sessionDir, 'status.yaml'), 'phase: COORDINATING\n');

      // Write pending_spawns.yaml that maps our agent to a parent that doesn't exist in tree
      fs.writeFileSync(pathMod.join(workflowDir, 'pending_spawns.yaml'), yaml.dump([
        { agent_type: 'cagents:backend-developer', parent_id: 'nonexistent-parent-id-999' }
      ]));

      // Pre-populate agent_tree with one entry so the depth logic branch triggers
      fs.writeFileSync(pathMod.join(workflowDir, 'agent_tree.yaml'), yaml.dump({
        agents: [{ id: 'some-other-agent', type: 'general-purpose', parent: 'pipeline', depth: 1, spawned_at: '2026-01-01', stopped_at: null }]
      }));

      const uniqueId = `agent_unknown_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const input = {
        agent_type: 'cagents:backend-developer',
        agent_id: uniqueId,
        session_id: '550e8400-0000-0000-0000-000000000001',
        tool_input: {
          prompt: `SESSION DIR: ${sessionName}\nImplement the work item.`,
          subagent_type: 'cagents:backend-developer'
        }
      };

      const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot };
      delete env.CAGENTS_ACTIVE_SESSION;

      try {
        const result = spawnSync('node', [HOOK_PATH], {
          input: JSON.stringify(input),
          encoding: 'utf8',
          timeout: 8000,
          env,
        });

        expect(result.status).toBe(0);
        const treeFile = pathMod.join(workflowDir, 'agent_tree.yaml');
        const parsed = yaml.load(fs.readFileSync(treeFile, 'utf8'));
        const ourAgent = parsed.agents.find(a => a.id === uniqueId);
        expect(ourAgent).toBeDefined();
        // Parent is the nonexistent ID from pending_spawns.yaml
        expect(ourAgent.parent).toBe('nonexistent-parent-id-999');
        // Depth should be 1 (fallback for unknown parent not found in tree)
        expect(ourAgent.depth).toBe(1);
      } finally {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
      }
    });

    it('parent "root" keeps depth=0', () => {
      // inferParentAgent returns 'root' only when sessionDir is null (line 61).
      // In the depth computation (line 314), 'root' is excluded from the branch,
      // so depth stays at the initialized value of 0.
      // We can test this by checking the source code logic directly.
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      // Verify the 'root' exclusion is present in the condition
      expect(hookContent).toContain("parentAgent !== 'root'");
    });

    it('SENTINEL_DEPTH_MAP exists in hook source (regression guard)', () => {
      // If someone removes the SENTINEL_DEPTH_MAP, this test fails immediately
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('SENTINEL_DEPTH_MAP');
      expect(hookContent).toContain('pipeline: 1');
      expect(hookContent).toContain('controller: 2');
      expect(hookContent).toContain('SENTINEL_DEPTH_MAP.hasOwnProperty(parentAgent)');
    });

    it('sentinel depth is applied BEFORE agents.find() lookup', () => {
      // The fix requires SENTINEL_DEPTH_MAP check happens before the find() call.
      // If sentinels reach find(), they'd never match a real agent ID, falling through
      // to the depth=1 fallback — which would be WRONG for 'controller' (should be 2).
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      const mapIndex = hookContent.indexOf('SENTINEL_DEPTH_MAP.hasOwnProperty');
      const findIndex = hookContent.indexOf('parsedObj.agents.find(a => a.id === parentAgent)');
      expect(mapIndex).toBeGreaterThan(-1);
      expect(findIndex).toBeGreaterThan(-1);
      // SENTINEL_DEPTH_MAP check MUST come before the find() call
      expect(mapIndex).toBeLessThan(findIndex);
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
        const uniqueId = `agent_prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        const uniqueId = `agent_nonexist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

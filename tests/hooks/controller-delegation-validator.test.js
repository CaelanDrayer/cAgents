import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'controller-delegation-validator.cjs');
const AGENT_MEMORY_DIR = join(process.cwd(), 'cagents-memory');
const TEST_SESSION = 'test_delegation_validator_260406_001';
const SESSION_DIR = join(AGENT_MEMORY_DIR, 'sessions', TEST_SESSION);
const WORKFLOW_DIR = join(SESSION_DIR, 'workflow');

// Agent tree YAML with an active controller (stopped_at: null)
const ACTIVE_CONTROLLER_TREE = `agents:
  - agent_id: "agent-001"
    cagents_type: "cagents:tech-lead"
    spawned_at: "2026-04-06T10:00:00Z"
    stopped_at: null
    description: "Coordinate auth fix"
`;

// Agent tree with no active controller (all stopped)
const NO_ACTIVE_CONTROLLER_TREE = `agents:
  - agent_id: "agent-001"
    cagents_type: "cagents:tech-lead"
    spawned_at: "2026-04-06T10:00:00Z"
    stopped_at: "2026-04-06T10:05:00Z"
    description: "Coordinate auth fix"
`;

const STATUS_YAML = `pipeline_state: coordinating
phase: coordinating
current_phase: coordinating
`;

/**
 * Clear dedup guard files to prevent false pass-throughs between tests.
 */
function clearDedupFiles() {
  try {
    const files = readdirSync('/tmp').filter(f => f.startsWith('cagents-dedup-ControllerDelegationValidator-'));
    files.forEach(f => { try { unlinkSync('/tmp/' + f); } catch {} });
  } catch {}
}

/**
 * Run the hook with given input and optional env overrides.
 */
function runHook(input, env = {}) {
  clearDedupFiles();
  const result = execSync(`node "${HOOK_PATH}"`, {
    encoding: 'utf8',
    timeout: 5000,
    input: JSON.stringify(input),
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...env }
  });
  return JSON.parse(result.trim());
}

/**
 * Create the test session directory with agent_tree.yaml and status.yaml.
 */
function setupTestSession(agentTree = ACTIVE_CONTROLLER_TREE) {
  mkdirSync(WORKFLOW_DIR, { recursive: true });
  writeFileSync(join(WORKFLOW_DIR, 'agent_tree.yaml'), agentTree);
  writeFileSync(join(SESSION_DIR, 'status.yaml'), STATUS_YAML);
}

/**
 * Remove the test session directory.
 */
function cleanupTestSession() {
  try { rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
}

/** Implementation file write input — triggers violation when controller is active */
function implFileInput() {
  return {
    tool_name: 'Write',
    tool_input: { file_path: '/project/src/auth/login.ts', content: 'export function login() {}' }
  };
}

/** Workflow file write input — should always bypass enforcement */
function workflowFileInput() {
  return {
    tool_name: 'Write',
    tool_input: { file_path: join(SESSION_DIR, 'workflow', 'coordination_log.yaml'), content: 'status: completed' }
  };
}

/** cagents-memory file write input — should always bypass enforcement */
function agentMemoryFileInput() {
  return {
    tool_name: 'Edit',
    tool_input: { file_path: join(AGENT_MEMORY_DIR, 'sessions', 'run_test', 'status.yaml'), old_string: 'a', new_string: 'b' }
  };
}

/** YAML file write input — allowed by ALLOWED_PATTERNS */
function yamlFileInput() {
  return {
    tool_name: 'Write',
    tool_input: { file_path: '/project/config/plan.yaml', content: 'plan_id: test' }
  };
}

describe('controller-delegation-validator.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('enforcement mode: warn', () => {
    beforeEach(() => {
      setupTestSession();
    });
    afterEach(() => {
      cleanupTestSession();
    });

    it('returns systemMessage warning for implementation file writes', () => {
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'warn'
      });
      // warn mode: continue true, systemMessage with warning
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeDefined();
      expect(result.systemMessage).toContain('CONTROLLER DELEGATION WARNING');
      expect(result.systemMessage).toContain('tech-lead');
      // Must NOT have deny/block
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('warn mode warns (does not deny) for a HARD-DENY src/ path when a controller is active', () => {
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'warn'
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('CONTROLLER DELEGATION WARNING');
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('enforcement mode: block', () => {
    beforeEach(() => {
      setupTestSession();
    });
    afterEach(() => {
      cleanupTestSession();
    });

    it('returns deny decision for implementation file writes', () => {
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      // block mode: hookSpecificOutput with permissionDecision deny
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('CONTROLLER DELEGATION BLOCKED');
      // P1-7 (v12.7.1): src/ is a HARD-DENY path. The deny message is
      // path-based and unconditional — it cites the offending implementation
      // path and the canonical delegation rule, NOT a specific controller
      // name (depth-1 stripping makes agent_tree unreliable, so the HARD-DENY
      // does not depend on / report an active controller).
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('src/auth/login.ts');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('@.claude/rules/core/delegation.md');
    });

    it('block mode is case-insensitive', () => {
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'BLOCK'
      });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('enforcement mode: off', () => {
    beforeEach(() => {
      setupTestSession();
    });
    afterEach(() => {
      cleanupTestSession();
    });

    it('returns no-op (continue: true) even for implementation file writes', () => {
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'off'
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('settings.json fallback', () => {
    // The hook reads settings.json delegation_enforcement when env var is absent.
    // We can't easily mock settings.json in the test, but we can verify that:
    // 1. When env var IS set, it takes precedence over whatever settings.json says
    // 2. When env var is set to invalid value, it falls through to settings.json

    beforeEach(() => {
      setupTestSession();
    });
    afterEach(() => {
      cleanupTestSession();
    });

    it('env var takes precedence over settings.json', () => {
      // Even if settings.json says block, env var 'off' should win
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'off'
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('invalid env var falls through to default block behavior', () => {
      // B1 (v12.18.0): default is now 'block' (was 'warn'). settings.json ships
      // CAGENTS_DELEGATION_ENFORCEMENT=block, and the hardcoded fallback is also
      // 'block'. With an active controller writing a HARD-DENY src/ path, the
      // result is a deny.
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'invalid_mode'
      });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('CONTROLLER DELEGATION BLOCKED');
    });
  });

  describe('allowed patterns bypass enforcement in ALL modes', () => {
    beforeEach(() => {
      setupTestSession();
    });
    afterEach(() => {
      cleanupTestSession();
    });

    it('workflow/ files bypass in warn mode', () => {
      const result = runHook(workflowFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'warn'
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('workflow/ files bypass in block mode', () => {
      const result = runHook(workflowFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('cagents-memory/ files bypass in block mode', () => {
      const result = runHook(agentMemoryFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('YAML files bypass in block mode', () => {
      const result = runHook(yamlFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('workflow/ files bypass in off mode', () => {
      const result = runHook(workflowFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'off'
      });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });
  });

  // B1 (v12.18.0): the hard-deny is now CONTROLLER-SCOPED, reversing the P1-7
  // (v12.7.1) unconditional behavior. The P1-7 justification (depth-1 Agent-tool
  // stripping making agent_tree unreliable) is obsolete as of v12.17.0 / Claude
  // Code 2.1.172, where subagents retain Agent and self-register reliably. An
  // unconditional deny would be a FOOTGUN — it would block the user's own direct
  // edits to src/ outside any cAgents workflow. So enforcement only fires when an
  // active controller is present in agent_tree.yaml.
  describe('controller-scoped hard-deny: no footgun on direct user edits (B1)', () => {
    afterEach(() => {
      cleanupTestSession();
    });

    it('does NOT deny a src/ write in block mode when NO controller is active (direct user edit)', () => {
      setupTestSession(NO_ACTIVE_CONTROLLER_TREE);
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('does NOT deny a src/ write in block mode when there is NO active cAgents session at all', () => {
      // No session dir on disk -> findActiveSession returns null -> no-op.
      cleanupTestSession();
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: 'nonexistent_session_260612_999',
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('DOES deny a src/ write in block mode when a controller IS active', () => {
      setupTestSession(ACTIVE_CONTROLLER_TREE);
      const result = runHook(implFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('CONTROLLER DELEGATION BLOCKED');
    });

    it('DOES deny a services/ write (newly added hard-deny path) when a controller is active', () => {
      setupTestSession(ACTIVE_CONTROLLER_TREE);
      const result = runHook({
        tool_name: 'Write',
        tool_input: { file_path: '/project/services/payments/charge.ts', content: 'export function charge() {}' }
      }, {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('DOES deny a middleware/ write (newly added hard-deny path) when a controller is active', () => {
      setupTestSession(ACTIVE_CONTROLLER_TREE);
      const result = runHook({
        tool_name: 'Write',
        tool_input: { file_path: '/project/middleware/auth.ts', content: 'export function auth() {}' }
      }, {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.hookSpecificOutput).toBeDefined();
      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('allows a controller write to a workflow/ yaml file (delegation-permitted path)', () => {
      setupTestSession(ACTIVE_CONTROLLER_TREE);
      const result = runHook(workflowFileInput(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  describe('non-Write/Edit tools — no enforcement', () => {
    it('no-ops for Read tool', () => {
      const result = runHook({
        tool_name: 'Read',
        tool_input: { file_path: '/project/src/auth/login.ts' }
      }, { CAGENTS_DELEGATION_ENFORCEMENT: 'block' });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });

    it('no-ops for Bash tool', () => {
      const result = runHook({
        tool_name: 'Bash',
        tool_input: { command: 'npm test' }
      }, { CAGENTS_DELEGATION_ENFORCEMENT: 'block' });
      expect(result.continue).toBe(true);
      expect(result.hookSpecificOutput).toBeUndefined();
    });
  });

  afterAll(() => {
    cleanupTestSession();
    clearDedupFiles();
  });
});

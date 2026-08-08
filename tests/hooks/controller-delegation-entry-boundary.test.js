// H1 (v12.20.0) regression: controller-delegation-validator must scope its
// active-controller determination to a SINGLE agent_tree.yaml entry.
//
// The pre-fix detection used `cagents_type:...[\s\S]*?stopped_at:\s*null`, whose
// non-greedy body crossed YAML entry boundaries. That produced:
//   - false-POSITIVE: a STOPPED controller wrongly flagged active because a LATER
//     (different) agent carried `stopped_at: null` — wrongly HARD-DENYing a
//     legitimate execution-agent src/ write.
//   - false-NEGATIVE: an active controller whose entry OMITS stopped_at never
//     matched `stopped_at: null`.
//
// The fix parses line-by-line with an entry boundary anchored on each
// `cagents_type:` line (mirrors subagent-tracker.cjs). These tests pin both the
// pure detector (findActiveController) and the end-to-end hook deny/allow.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'controller-delegation-validator.cjs');
const { findActiveController } = require(HOOK_PATH);

const AGENT_MEMORY_DIR = join(process.cwd(), 'cagents-memory');
const TEST_SESSION = 'test_delegation_entry_boundary_260616_001';
const SESSION_DIR = join(AGENT_MEMORY_DIR, 'sessions', TEST_SESSION);
const WORKFLOW_DIR = join(SESSION_DIR, 'workflow');
const STATUS_YAML = 'pipeline_state: coordinating\nphase: coordinating\ncurrent_phase: coordinating\n';

// (a) Active controller is the LAST entry — its own stopped_at is absent (active).
const ACTIVE_CONTROLLER_LAST = `session_id: ${TEST_SESSION}
root:
  agent: /act
  children:
    - agent: cagents:orchestrator
      cagents_type: "cagents:orchestrator"
      spawned_at: "2026-06-16T10:00:00Z"
      stopped_at: "2026-06-16T10:02:00Z"
    - agent: cagents:tech-lead
      cagents_type: "cagents:tech-lead"
      spawned_at: "2026-06-16T10:03:00Z"
`;

// (b) Stopped controller FOLLOWED BY an active non-controller (execution agent).
// The execution agent has NO stopped_at (active). The old cross-entry regex would
// scan from tech-lead's cagents_type past its own (timestamped) stopped_at into the
// backend-developer entry, but backend-developer here omits stopped_at; to also pin
// the explicit `stopped_at: null` false-positive shape see EXPLICIT_NULL below.
const STOPPED_CTRL_THEN_ACTIVE_EXEC = `session_id: ${TEST_SESSION}
root:
  agent: /act
  children:
    - agent: cagents:tech-lead
      cagents_type: "cagents:tech-lead"
      spawned_at: "2026-06-16T10:00:00Z"
      stopped_at: "2026-06-16T10:30:00Z"
    - agent: cagents:backend-developer
      cagents_type: "cagents:backend-developer"
      spawned_at: "2026-06-16T10:31:00Z"
`;

// False-positive shape with EXPLICIT stopped_at: null on the later execution agent.
// This is exactly what tricked the old regex: tech-lead (stopped) -> first
// `stopped_at: null` found belongs to backend-developer.
const STOPPED_CTRL_THEN_NULL_EXEC = `session_id: ${TEST_SESSION}
root:
  agent: /act
  children:
    - agent: cagents:tech-lead
      cagents_type: "cagents:tech-lead"
      spawned_at: "2026-06-16T10:00:00Z"
      stopped_at: "2026-06-16T10:30:00Z"
    - agent: cagents:backend-developer
      cagents_type: "cagents:backend-developer"
      spawned_at: "2026-06-16T10:31:00Z"
      stopped_at: null
`;

// Active controller whose entry OMITS stopped_at entirely (old false-negative).
const ACTIVE_CTRL_NO_STOPPED_FIELD = `session_id: ${TEST_SESSION}
root:
  agent: /act
  children:
    - agent: cagents:architect
      cagents_type: "cagents:architect"
      spawned_at: "2026-06-16T10:00:00Z"
      role_description: "Coordinating"
`;

function clearDedupFiles() {
  try {
    readdirSync('/tmp')
      .filter(f => f.startsWith('cagents-dedup-ControllerDelegationValidator-'))
      .forEach(f => { try { unlinkSync('/tmp/' + f); } catch {} });
  } catch {}
}

function setupSession(agentTree) {
  mkdirSync(WORKFLOW_DIR, { recursive: true });
  writeFileSync(join(WORKFLOW_DIR, 'agent_tree.yaml'), agentTree);
  writeFileSync(join(SESSION_DIR, 'status.yaml'), STATUS_YAML);
}

function cleanupSession() {
  try { rmSync(SESSION_DIR, { recursive: true, force: true }); } catch {}
}

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

const srcWrite = () => ({
  tool_name: 'Write',
  tool_input: { file_path: '/project/src/auth/login.ts', content: 'export function login() {}' }
});

describe('controller-delegation entry-boundary (H1)', () => {
  describe('findActiveController (pure detector)', () => {
    it('(a) detects an active controller that is the LAST entry', () => {
      expect(findActiveController(ACTIVE_CONTROLLER_LAST)).toBe('tech-lead');
    });

    it('(b) does NOT misattribute: stopped controller + active execution agent → null', () => {
      expect(findActiveController(STOPPED_CTRL_THEN_ACTIVE_EXEC)).toBeNull();
    });

    it('(b-explicit-null) stopped controller + active exec agent with stopped_at: null → null', () => {
      // The exact cross-entry false-positive the old regex hit.
      expect(findActiveController(STOPPED_CTRL_THEN_NULL_EXEC)).toBeNull();
    });

    it('detects an active controller whose entry omits stopped_at (old false-negative)', () => {
      expect(findActiveController(ACTIVE_CTRL_NO_STOPPED_FIELD)).toBe('architect');
    });

    it('returns null on empty / missing content', () => {
      expect(findActiveController('')).toBeNull();
      expect(findActiveController(null)).toBeNull();
    });
  });

  describe('end-to-end hook (block mode)', () => {
    afterEach(cleanupSession);

    it('(a) HARD-DENYs a src/ write when an active controller is the last entry', () => {
      setupSession(ACTIVE_CONTROLLER_LAST);
      const out = runHook(srcWrite(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      const decision = out?.hookSpecificOutput?.permissionDecision;
      expect(decision).toBe('deny');
    });

    it('(b) ALLOWS an execution agent src/ write when the only controller is stopped', () => {
      setupSession(STOPPED_CTRL_THEN_NULL_EXEC);
      const out = runHook(srcWrite(), {
        CAGENTS_ACTIVE_SESSION: TEST_SESSION,
        CAGENTS_DELEGATION_ENFORCEMENT: 'block'
      });
      const decision = out?.hookSpecificOutput?.permissionDecision;
      // No active controller → not a delegation violation → must NOT deny.
      expect(decision).not.toBe('deny');
      expect(out.continue).not.toBe(false);
    });
  });
});

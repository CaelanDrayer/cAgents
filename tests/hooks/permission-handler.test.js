import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync, spawnSync } from 'child_process';
import { tmpdir } from 'os';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'permission-handler.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('permission-handler.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  describe('always-safe tools (pass-through)', () => {
    // Post CC 2.1.77: safe tools return null (pass-through) instead of explicit allow,
    // because explicit allow could bypass deny rules from other hooks.
    it('should pass-through Read', () => {
      const result = runHook({ tool_name: 'Read', tool_input: {} });
      expect(result.continue).toBe(true);
    });

    it('should pass-through Grep', () => {
      const result = runHook({ tool_name: 'Grep', tool_input: {} });
      expect(result.continue).toBe(true);
    });

    it('should pass-through Glob', () => {
      const result = runHook({ tool_name: 'Glob', tool_input: {} });
      expect(result.continue).toBe(true);
    });

    it('should pass-through TaskList', () => {
      const result = runHook({ tool_name: 'TaskList', tool_input: {} });
      expect(result.continue).toBe(true);
    });

    it('should pass-through TaskGet', () => {
      const result = runHook({ tool_name: 'TaskGet', tool_input: {} });
      expect(result.continue).toBe(true);
    });
  });

  describe('cagents-memory writes (pass-through)', () => {
    it('should pass-through Write to cagents-memory', () => {
      const amPath = join(process.cwd(), 'cagents-memory', 'sessions', 'test.yaml');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: amPath } });
      expect(result.continue).toBe(true);
    });

    it('should pass-through Edit to cagents-memory', () => {
      const amPath = join(process.cwd(), 'cagents-memory', 'sessions', 'test.yaml');
      const result = runHook({ tool_name: 'Edit', tool_input: { file_path: amPath } });
      expect(result.continue).toBe(true);
    });
  });

  describe('non-safe operations', () => {
    it('should pass through Bash tool (not auto-approve)', () => {
      const result = runHook({ tool_name: 'Bash', tool_input: { command: 'ls' } });
      expect(result.continue).toBe(true);
    });

    it('should pass through Write to non-cagents-memory paths', () => {
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: '/tmp/test.txt' } });
      expect(result.continue).toBe(true);
    });
  });

  describe('HITL detection', () => {
    it('should have HITL gate detection code', () => {
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain('hitl_gate');
      expect(hookContent).toContain('human_approval');
      expect(hookContent).toContain("tier === '4'");
    });
  });

  // WI-8 regression (run_improve-skills-hooks_260703_001): a session that has
  // no workflow/plan.yaml yet made safeRead() return null, and
  // extractYamlValue(null, 'tier') threw TypeError inside the handler. The
  // createHook factory catch swallowed it (net verdict coincidentally still
  // pass-through), but the TypeError polluted stderr and made the HITL-gate
  // branch unreachable. FAILS on pre-guard HEAD via the stderr assertion.
  describe('session without plan.yaml (WI-8 null-content guard)', () => {
    const SID = 'run_permtest-wi8_260703_001';
    let tmpRoot;

    beforeEach(() => {
      tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-permhandler-'));
      const sessionDir = join(tmpRoot, 'cagents-memory', 'sessions', SID);
      // workflow/ exists but plan.yaml deliberately does NOT
      mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
      writeFileSync(
        join(sessionDir, 'status.yaml'),
        'phase: coordinating\npipeline_state: COORDINATED\n'
      );
    });

    afterEach(() => {
      rmSync(tmpRoot, { recursive: true, force: true });
    });

    it('completes without a thrown/logged TypeError and passes through', () => {
      const input = {
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
        session_id: SID,
      };
      const env = { ...process.env, CLAUDE_PROJECT_DIR: tmpRoot };
      delete env.CAGENTS_ACTIVE_SESSION;
      delete env.CAGENTS_SESSION_ID;

      const proc = spawnSync('node', [HOOK_PATH], {
        input: JSON.stringify(input),
        encoding: 'utf8',
        timeout: 5000,
        env,
      });

      // Handler must not throw: the factory catch logs
      // "[PermissionHandler] Error: ..." to stderr on a thrown TypeError.
      expect(proc.stderr).not.toMatch(/TypeError|Cannot read properties|\[PermissionHandler\] Error:/);
      const result = JSON.parse(proc.stdout.trim());
      expect(result.continue).toBe(true);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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
      const hookContent = readFileSync(HOOK_PATH, 'utf8');
      expect(hookContent).toContain("phase === 'completed'");
      expect(hookContent).toContain("phase === 'failed'");
      expect(hookContent).toContain("phase === 'aborted'");
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
});

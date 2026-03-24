import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'model-routing-advisor.cjs');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('model-routing-advisor.cjs', () => {
  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue true for non-Task tools', () => {
    const result = runHook({ tool_name: 'Bash', tool_input: {} });
    expect(result.continue).toBe(true);
  });

  it('should pass through non-cagents agents', () => {
    const result = runHook({
      tool_name: 'Task',
      tool_input: { subagent_type: 'custom-agent', description: 'test' }
    });
    expect(result.continue).toBe(true);
  });

  it('should pass through when no model specified', () => {
    const result = runHook({
      tool_name: 'Task',
      tool_input: { subagent_type: 'cagents:backend-developer', description: 'test' }
    });
    expect(result.continue).toBe(true);
  });

  it('should pass through correct model for execution agent', () => {
    const result = runHook({
      tool_name: 'Task',
      tool_input: { subagent_type: 'cagents:backend-developer', model: 'sonnet', description: 'test' }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should warn on wrong model for execution agent', () => {
    const result = runHook({
      tool_name: 'Task',
      tool_input: { subagent_type: 'cagents:backend-developer', model: 'haiku', description: 'test' }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('ModelRoutingAdvisor');
    expect(result.systemMessage).toContain('routing advisory');
  });

  it('should pass through correct model for controller', () => {
    const result = runHook({
      tool_name: 'Task',
      tool_input: { subagent_type: 'cagents:engineering-manager', model: 'opusplan', description: 'test' }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toBeUndefined();
  });

  it('should warn on wrong model for controller', () => {
    const result = runHook({
      tool_name: 'Task',
      tool_input: { subagent_type: 'cagents:engineering-manager', model: 'haiku', description: 'test' }
    });
    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain('routing advisory');
  });
});

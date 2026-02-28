import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'post-write-validator.cjs');
const TMP_DIR = join(process.cwd(), 'tests', 'fixtures', 'tmp_pwv');

function runHook(input) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

describe('post-write-validator.cjs', () => {
  beforeEach(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterEach(() => {
    try { rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
  });

  it('should exist', () => {
    expect(existsSync(HOOK_PATH)).toBe(true);
  });

  it('should return continue:true for empty input', () => {
    const result = runHook({});
    expect(result.continue).toBe(true);
  });

  it('should return continue:true for missing file_path', () => {
    const result = runHook({ tool_name: 'Write', tool_input: {} });
    expect(result.continue).toBe(true);
  });

  describe('JSON validation', () => {
    it('should pass for valid JSON files', () => {
      const jsonPath = join(TMP_DIR, 'valid.json');
      writeFileSync(jsonPath, '{"key": "value"}');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: jsonPath } });
      expect(result.continue).toBe(true);
      // No systemMessage means no warnings
      expect(result.systemMessage).toBeUndefined();
    });

    it('should warn for invalid JSON files', () => {
      const jsonPath = join(TMP_DIR, 'invalid.json');
      writeFileSync(jsonPath, '{invalid json}');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: jsonPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('Invalid JSON');
    });
  });

  describe('YAML validation', () => {
    it('should pass for valid YAML files', () => {
      const yamlPath = join(TMP_DIR, 'valid.yaml');
      writeFileSync(yamlPath, 'key: value\nlist:\n  - item1\n  - item2');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: yamlPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should warn about tabs in YAML', () => {
      const yamlPath = join(TMP_DIR, 'tabs.yaml');
      writeFileSync(yamlPath, 'key: value\n\tindented: true');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: yamlPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('tabs');
    });

    it('should warn about duplicate top-level keys', () => {
      const yamlPath = join(TMP_DIR, 'dupes.yaml');
      writeFileSync(yamlPath, 'key: value1\nother: stuff\nkey: value2');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: yamlPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('duplicate');
    });

    it('should also validate .yml extension', () => {
      const ymlPath = join(TMP_DIR, 'test.yml');
      writeFileSync(ymlPath, 'key: value\n\tindented: true');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: ymlPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('tabs');
    });
  });

  describe('non-validated files', () => {
    it('should pass through .js files without validation', () => {
      const jsPath = join(TMP_DIR, 'test.js');
      writeFileSync(jsPath, 'console.log("hello");');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: jsPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should pass through .md files without validation', () => {
      const mdPath = join(TMP_DIR, 'test.md');
      writeFileSync(mdPath, '# Heading\n\nSome content');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });
  });
});

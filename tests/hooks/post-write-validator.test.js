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
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CLAUDE_PROJECT_DIR: TMP_DIR } }
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

    it('should warn for invalid JSON files via file_changes.log status (no systemMessage per thinking-block contract)', () => {
      const jsonPath = join(TMP_DIR, 'invalid.json');
      writeFileSync(jsonPath, '{invalid json}');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: jsonPath } });
      // thinking-block 400 fix (run_team-thinking-400_260531_001): PostToolUse
      // hooks no longer emit systemMessage. Validation warnings now surface via
      // console.error (stderr → user verbose mode) only; file_changes.log has
      // the status="warn" record per the audit-trail contract. No systemMessage.
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
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

    it('should detect tabs in YAML (no systemMessage per thinking-block contract)', () => {
      const yamlPath = join(TMP_DIR, 'tabs.yaml');
      writeFileSync(yamlPath, 'key: value\n\tindented: true');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: yamlPath } });
      // thinking-block 400 fix: validation warnings go to stderr/file_changes.log,
      // not systemMessage. The hook still returns continue:true.
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should detect duplicate top-level keys (no systemMessage per thinking-block contract)', () => {
      const yamlPath = join(TMP_DIR, 'dupes.yaml');
      writeFileSync(yamlPath, 'key: value1\nother: stuff\nkey: value2');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: yamlPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should also validate .yml extension (no systemMessage per thinking-block contract)', () => {
      const ymlPath = join(TMP_DIR, 'test.yml');
      writeFileSync(ymlPath, 'key: value\n\tindented: true');
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: ymlPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });
  });

  describe('anti-slop detection', () => {
    // Anti-slop tests use /tmp paths to avoid the /tests/ exclusion in the hook
    const SLOP_TMP = '/tmp/cagents_slop_test_' + process.pid;

    beforeEach(() => {
      mkdirSync(SLOP_TMP, { recursive: true });
    });

    afterEach(() => {
      try { rmSync(SLOP_TMP, { recursive: true, force: true }); } catch {}
    });

    // thinking-block 400 fix (run_team-thinking-400_260531_001): anti-slop
    // warnings now surface via stderr/file_changes.log only. The hook returns
    // continue:true with no systemMessage.

    it('should detect throat-clearing phrases in .md files (no systemMessage)', () => {
      const mdPath = join(SLOP_TMP, 'doc.md');
      writeFileSync(mdPath, "# Guide\n\nHere's the thing about authentication. It's worth noting that tokens expire. Let me walk you through the flow. The approach is comprehensive and covers all edge cases for the system.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should detect business jargon in .md files (no systemMessage)', () => {
      const mdPath = join(SLOP_TMP, 'report.md');
      writeFileSync(mdPath, "# Report\n\nThis deep dive into the architecture reveals a game-changer for our deployment pipeline. We need to circle back on the performance metrics after the next sprint planning session is complete.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should detect vague declaratives in prose (no systemMessage)', () => {
      const mdPath = join(SLOP_TMP, 'summary.md');
      writeFileSync(mdPath, "# Summary\n\nThe implications are significant for the entire platform. The results are promising and suggest we should continue with this approach for the foreseeable future ahead of us.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should detect emphasis crutches (no systemMessage)', () => {
      const mdPath = join(SLOP_TMP, 'emphasis.md');
      writeFileSync(mdPath, "# Important\n\nSecurity matters. Full stop. Let that sink in. This matters because authentication is the foundation of every user interaction in the system.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should pass clean prose without slop warnings', () => {
      const mdPath = join(SLOP_TMP, 'clean.md');
      writeFileSync(mdPath, "# Authentication Guide\n\nThe auth middleware validates JWT tokens on every request. Expired tokens return a 401 status code with a retry-after header. The backend-developer implemented bcrypt with cost factor 12 for password hashing.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      // Clean prose should not trigger anti-slop warnings
      if (result.systemMessage) {
        expect(result.systemMessage).not.toContain('anti-slop');
      }
    });

    it('should skip slop detection for files in /tests/ directories', () => {
      // Files in TMP_DIR (which is under tests/) should be excluded
      const mdPath = join(TMP_DIR, 'sloppy.md');
      writeFileSync(mdPath, "# Sloppy Doc\n\nHere's the thing about this deep dive. Let that sink in. The approach is comprehensive and the results are promising. This is enough text to be over the threshold.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      // Should NOT contain anti-slop warnings because file is in /tests/
      if (result.systemMessage) {
        expect(result.systemMessage).not.toContain('anti-slop');
      }
    });

    it('should skip slop detection for files shorter than 100 chars', () => {
      const mdPath = join(SLOP_TMP, 'short.md');
      writeFileSync(mdPath, "# Short\n\nDeep dive.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      if (result.systemMessage) {
        expect(result.systemMessage).not.toContain('anti-slop');
      }
    });

    it('should not flag phrases inside code blocks', () => {
      const mdPath = join(SLOP_TMP, 'codeblock.md');
      writeFileSync(mdPath, "# Config Guide\n\nThe configuration file uses standard YAML format for all settings in the project.\n\n```yaml\n# Here's the thing: this is a config comment\ndescription: \"deep dive into settings\"\n```\n\nThe YAML parser handles these values automatically when the server starts up and loads configuration.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      // Phrases inside code blocks should be stripped before detection
      if (result.systemMessage) {
        expect(result.systemMessage).not.toContain('anti-slop');
      }
    });

    it('should report count of detected patterns (via stderr/file_changes.log, no systemMessage)', () => {
      const mdPath = join(SLOP_TMP, 'multi.md');
      writeFileSync(mdPath, "# Multi-Slop\n\nHere's the thing: we need a deep dive. Let that sink in. The approach is comprehensive. The results are promising. We should circle back on this topic after the next review.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      // thinking-block 400 fix: no systemMessage. Pattern count visible via
      // console.error (stderr → user verbose mode).
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });

    it('should detect slop in .txt files (no systemMessage)', () => {
      const txtPath = join(SLOP_TMP, 'notes.txt');
      writeFileSync(txtPath, "Meeting notes from the architecture review session held on Monday morning.\n\nHere's the thing about our current architecture. It's worth noting that we need to lean into microservices more aggressively going forward in this quarter.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: txtPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toBeUndefined();
    });
  });

  describe('status.yaml writes do NOT emit workflow/events/EVT-* files (Phase 10 / A8-03)', () => {
    // The v10.25.0 EVT-{state}_*.yaml auto-emitter was removed in Phase 10.
    // status.yaml writes still pass through (and update the heartbeat) but MUST
    // NOT create a workflow/events/ directory or any EVT-* file.
    const EVT_TMP = '/tmp/cagents_evt_test_' + process.pid;

    function runHookEvt(input) {
      const result = execSync(
        `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
        { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, CLAUDE_PROJECT_DIR: EVT_TMP } }
      );
      return JSON.parse(result.trim());
    }

    beforeEach(() => {
      mkdirSync(EVT_TMP, { recursive: true });
    });

    afterEach(() => {
      try { rmSync(EVT_TMP, { recursive: true, force: true }); } catch {}
    });

    it('does NOT create workflow/events/ when status.yaml has pipeline_state', () => {
      const sessionDir = join(EVT_TMP, 'cagents-memory', 'sessions', 'run_test_260331_001');
      mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
      const statusPath = join(sessionDir, 'status.yaml');
      writeFileSync(statusPath, 'pipeline_state: PLANNED\nsession_id: run_test_260331_001\n');
      const result = runHookEvt({ tool_name: 'Write', tool_input: { file_path: statusPath } });
      expect(result.continue).toBe(true);
      expect(existsSync(join(sessionDir, 'workflow', 'events'))).toBe(false);
    });

    it('does NOT create workflow/events/ when status.yaml has only a phase field', () => {
      const sessionDir = join(EVT_TMP, 'cagents-memory', 'sessions', 'run_phase_260331_001');
      mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
      const statusPath = join(sessionDir, 'status.yaml');
      writeFileSync(statusPath, 'phase: coordinating\nsession_id: run_phase_260331_001\n');
      runHookEvt({ tool_name: 'Write', tool_input: { file_path: statusPath } });
      expect(existsSync(join(sessionDir, 'workflow', 'events'))).toBe(false);
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

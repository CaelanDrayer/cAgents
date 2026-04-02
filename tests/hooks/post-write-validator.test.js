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

  describe('anti-slop detection', () => {
    // Anti-slop tests use /tmp paths to avoid the /tests/ exclusion in the hook
    const SLOP_TMP = '/tmp/cagents_slop_test_' + process.pid;

    beforeEach(() => {
      mkdirSync(SLOP_TMP, { recursive: true });
    });

    afterEach(() => {
      try { rmSync(SLOP_TMP, { recursive: true, force: true }); } catch {}
    });

    it('should detect throat-clearing phrases in .md files', () => {
      const mdPath = join(SLOP_TMP, 'doc.md');
      writeFileSync(mdPath, "# Guide\n\nHere's the thing about authentication. It's worth noting that tokens expire. Let me walk you through the flow. The approach is comprehensive and covers all edge cases for the system.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('anti-slop');
      expect(result.systemMessage).toContain("here's the thing");
    });

    it('should detect business jargon in .md files', () => {
      const mdPath = join(SLOP_TMP, 'report.md');
      writeFileSync(mdPath, "# Report\n\nThis deep dive into the architecture reveals a game-changer for our deployment pipeline. We need to circle back on the performance metrics after the next sprint planning session is complete.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('anti-slop');
      expect(result.systemMessage).toContain('deep dive');
    });

    it('should detect vague declaratives in prose', () => {
      const mdPath = join(SLOP_TMP, 'summary.md');
      writeFileSync(mdPath, "# Summary\n\nThe implications are significant for the entire platform. The results are promising and suggest we should continue with this approach for the foreseeable future ahead of us.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('anti-slop');
      expect(result.systemMessage).toContain('the implications are significant');
    });

    it('should detect emphasis crutches', () => {
      const mdPath = join(SLOP_TMP, 'emphasis.md');
      writeFileSync(mdPath, "# Important\n\nSecurity matters. Full stop. Let that sink in. This matters because authentication is the foundation of every user interaction in the system.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('anti-slop');
      expect(result.systemMessage).toContain('full stop.');
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

    it('should report count of detected patterns', () => {
      const mdPath = join(SLOP_TMP, 'multi.md');
      writeFileSync(mdPath, "# Multi-Slop\n\nHere's the thing: we need a deep dive. Let that sink in. The approach is comprehensive. The results are promising. We should circle back on this topic after the next review.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: mdPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('anti-slop');
      // Should report multiple patterns detected
      expect(result.systemMessage).toMatch(/\d+ AI slop pattern/);
    });

    it('should detect slop in .txt files', () => {
      const txtPath = join(SLOP_TMP, 'notes.txt');
      writeFileSync(txtPath, "Meeting notes from the architecture review session held on Monday morning.\n\nHere's the thing about our current architecture. It's worth noting that we need to lean into microservices more aggressively going forward in this quarter.");
      const result = runHook({ tool_name: 'Write', tool_input: { file_path: txtPath } });
      expect(result.continue).toBe(true);
      expect(result.systemMessage).toContain('anti-slop');
    });
  });

  describe('event file auto-generation on status.yaml transitions', () => {
    // Use isolated temp dirs to avoid interference with the shared TMP_DIR lifecycle
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

    it('should create event file when status.yaml has pipeline_state', () => {
      const sessionDir = join(EVT_TMP, 'Agent_Memory', 'sessions', 'run_test_260331_001');
      mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
      const statusPath = join(sessionDir, 'status.yaml');
      writeFileSync(statusPath, 'pipeline_state: PLANNED\nsession_id: run_test_260331_001\n');
      const result = runHookEvt({ tool_name: 'Write', tool_input: { file_path: statusPath } });
      expect(result.continue).toBe(true);
      const eventsDir = join(sessionDir, 'workflow', 'events');
      expect(existsSync(eventsDir)).toBe(true);
      const files = require('fs').readdirSync(eventsDir);
      const eventFile = files.find(f => f.startsWith('EVT-PLANNED_'));
      expect(eventFile).toBeDefined();
      const content = readFileSync(join(eventsDir, eventFile), 'utf8');
      expect(content).toContain('event_id: EVT-PLANNED');
      expect(content).toContain('type: state_transition');
      expect(content).toContain('state: PLANNED');
    });

    it('should not create duplicate event files for same state', () => {
      const sessionDir = join(EVT_TMP, 'Agent_Memory', 'sessions', 'run_dedup_260331_001');
      const eventsDir = join(sessionDir, 'workflow', 'events');
      mkdirSync(eventsDir, { recursive: true });
      writeFileSync(join(eventsDir, 'EVT-PLANNED_2026-03-31T00-00-00-000Z.yaml'), 'event_id: EVT-PLANNED\n');
      const statusPath = join(sessionDir, 'status.yaml');
      writeFileSync(statusPath, 'pipeline_state: PLANNED\n');
      runHookEvt({ tool_name: 'Write', tool_input: { file_path: statusPath } });
      const files = require('fs').readdirSync(eventsDir);
      const plannedFiles = files.filter(f => f.startsWith('EVT-PLANNED_'));
      expect(plannedFiles.length).toBe(1);
    });

    it('should create event file using phase field as fallback', () => {
      const sessionDir = join(EVT_TMP, 'Agent_Memory', 'sessions', 'run_phase_260331_001');
      mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
      const statusPath = join(sessionDir, 'status.yaml');
      writeFileSync(statusPath, 'phase: coordinating\nsession_id: run_phase_260331_001\n');
      runHookEvt({ tool_name: 'Write', tool_input: { file_path: statusPath } });
      const eventsDir = join(sessionDir, 'workflow', 'events');
      expect(existsSync(eventsDir)).toBe(true);
      const files = require('fs').readdirSync(eventsDir);
      const eventFile = files.find(f => f.startsWith('EVT-coordinating_'));
      expect(eventFile).toBeDefined();
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

/**
 * P0-3 regression test: verify-completion.cjs MUST NOT stamp placeholders
 * into coordination_log.yaml when self_validation or validation_checkpoints
 * are missing.
 *
 * Background: prior to P0-3, the autoResolveWarnings() function in
 * verify-completion.cjs auto-appended empty `self_validation:` and
 * `validation_checkpoints:` blocks to coordination_log.yaml whenever
 * controllers had not produced them. This was a false-claim pattern —
 * placeholder "no-op" YAML masked the absence of real self-validation
 * and validation-checkpoint data. Honest absence is preferable to a
 * stamped no-op.
 *
 * P0-3 contract:
 *   1. The hook MUST NOT modify coordination_log.yaml in any way.
 *   2. The hook MUST emit a stderr warning naming the missing fields.
 *
 * This test creates a fake session with a coordination_log lacking
 * self_validation, runs verify-completion.cjs against it via stdin,
 * records the file's SHA256 before and after, and asserts byte-identity.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');
const HOOK_PATH = join(PROJECT_ROOT, '.claude/hooks/verify-completion.cjs');

function sha256(filePath) {
  const buf = readFileSync(filePath);
  return createHash('sha256').update(buf).digest('hex');
}

describe('P0-3: verify-completion.cjs MUST NOT stamp placeholders', () => {
  let tempRoot;
  let sessionsDir;
  let sessionDir;
  let coordLogPath;

  beforeAll(() => {
    // Create a fake project-shaped temp dir so the hook's
    // cagents-memory/sessions/ discovery finds our fixture.
    tempRoot = mkdtempSync(join(tmpdir(), 'p0-3-vfc-'));
    sessionsDir = join(tempRoot, 'cagents-memory', 'sessions');
    sessionDir = join(sessionsDir, 'run_p0-3-fixture_260522_001');
    mkdirSync(join(sessionDir, 'workflow'), { recursive: true });

    // status.yaml: terminal state so autoResolveWarnings would normally
    // trigger placeholder stamping.
    const now = new Date().toISOString();
    writeFileSync(
      join(sessionDir, 'status.yaml'),
      [
        'session_id: run_p0-3-fixture_260522_001',
        'pipeline_state: complete',
        `created_at: "${now}"`,
        `updated_at: "${now}"`,
        'state_history:',
        '  - state: complete',
        `    entered_at: "${now}"`,
        '    duration_ms: 1000',
        '',
      ].join('\n')
    );

    // plan.yaml: presence implies coord_log enforcement; controller_assignment
    // satisfies the schema check.
    writeFileSync(
      join(sessionDir, 'workflow', 'plan.yaml'),
      [
        'schema_version: "1"',
        'mission: "P0-3 fixture: verify no placeholder stamping"',
        'domain: developer',
        'tier: 2',
        'controller_assignment:',
        '  primary: cagents:tech-lead',
        'objectives:',
        '  - id: O-1',
        '    description: "Test fixture objective"',
        '',
      ].join('\n')
    );

    // coordination_log.yaml WITHOUT self_validation or validation_checkpoints.
    // This is exactly the input that previously triggered placeholder
    // stamping in autoResolveWarnings (lines 376-433 of the pre-P0-3 hook).
    coordLogPath = join(sessionDir, 'workflow', 'coordination_log.yaml');
    writeFileSync(
      coordLogPath,
      [
        'schema_version: "1"',
        'controller: cagents:tech-lead',
        'status: completed',
        'objectives:',
        '  - id: O-1',
        '    description: "Test fixture objective"',
        'implementation_tasks:',
        '  - task_id: WI-1',
        '    assigned_to: cagents:backend-developer',
        '    status: completed',
        '    evidence: "src/foo.ts:42 — implemented (test fixture)"',
        '',
      ].join('\n')
    );
  });

  afterAll(() => {
    try { rmSync(tempRoot, { recursive: true, force: true }); } catch {}
  });

  it('leaves coordination_log.yaml byte-identical when self_validation is missing', () => {
    const beforeHash = sha256(coordLogPath);

    // Invoke the hook directly with a Stop payload. We point AGENT_MEMORY_DIR
    // and PROJECT_ROOT at our fixture so findActiveSession picks up the
    // synthetic session.
    const stdinPayload = JSON.stringify({
      hook_event_name: 'Stop',
      session_id: 'run_p0-3-fixture_260522_001',
      stop_hook_active: false,
    });

    const result = spawnSync(
      process.execPath,
      [HOOK_PATH],
      {
        input: stdinPayload,
        encoding: 'utf8',
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: PROJECT_ROOT,
          CLAUDE_PROJECT_DIR: tempRoot,
          CAGENTS_MEMORY_DIR: join(tempRoot, 'cagents-memory'),
        },
        timeout: 10000,
      }
    );

    // Hook should not crash
    expect(result.status, `hook crashed: ${result.stderr}`).toBe(0);

    const afterHash = sha256(coordLogPath);

    // CONTRACT 1: coordination_log.yaml must be byte-identical.
    // Any modification (append, rewrite, even whitespace change) is a
    // P0-3 violation.
    expect(
      afterHash,
      `coordination_log.yaml was modified by the hook (P0-3 violation).\n` +
      `Before SHA256: ${beforeHash}\n` +
      `After  SHA256: ${afterHash}\n` +
      `After content:\n${readFileSync(coordLogPath, 'utf8')}`
    ).toBe(beforeHash);
  });

  it('emits stderr warning naming the missing self_validation field', () => {
    const stdinPayload = JSON.stringify({
      hook_event_name: 'Stop',
      session_id: 'run_p0-3-fixture_260522_001',
      stop_hook_active: false,
    });

    const result = spawnSync(
      process.execPath,
      [HOOK_PATH],
      {
        input: stdinPayload,
        encoding: 'utf8',
        env: {
          ...process.env,
          CLAUDE_PLUGIN_ROOT: PROJECT_ROOT,
          CLAUDE_PROJECT_DIR: tempRoot,
          CAGENTS_MEMORY_DIR: join(tempRoot, 'cagents-memory'),
        },
        timeout: 10000,
      }
    );

    expect(result.status, `hook crashed: ${result.stderr}`).toBe(0);

    // CONTRACT 2: stderr must mention the missing field so the gap is
    // visible to operators instead of being silently stamped.
    const stderr = (result.stderr || '').toLowerCase();
    const mentionsMissing = stderr.includes('missing') || stderr.includes('self_validation');
    expect(
      mentionsMissing,
      `stderr should mention missing/self_validation, got:\n${result.stderr}`
    ).toBe(true);
  });
});

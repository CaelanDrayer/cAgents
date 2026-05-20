// PHASE-N1 (V11.1.13): verify-completion.cjs context-aware graceful-degradation
// downgrade regression test.
//
// Asserts that when a `team_*` session's coordination_log contains the marker
// phrase "Agent/subagent-spawn tool was not available", the hook downgrades the
// CONTROLLER SELF-HANDLING (protocol violation) warning to CONTROLLER
// SELF-HANDLED VIA GRACEFUL DEGRADATION (acceptable in /team mode). For non-
// team_ sessions or team_ sessions without the marker, the original
// protocol-violation warning is preserved.
//
// Refs:
//   - example/external-skills/RESUME_W7_FINAL_PROMPT.md § Section F (PHASE-N1 spec)
//   - .claude/rules/core/teams.md § Known Harness Limitation
//   - .claude/hooks/verify-completion.cjs lines ~604-658

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const HOOK_PATH = join(HOOKS_DIR, 'verify-completion.cjs');
const TEST_SESSIONS_DIR = join(process.cwd(), 'cagents-memory', 'sessions');

function runHook(input, sessionDir) {
  const result = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(result.trim());
}

function readSummary(sessionDir) {
  const p = join(sessionDir, 'completion_summary.yaml');
  if (!existsSync(p)) return '';
  return readFileSync(p, 'utf8');
}

function cleanDedupFiles() {
  try {
    const tmp = tmpdir();
    for (const f of readdirSync(tmp)) {
      if (f.startsWith('cagents-dedup-VerifyCompletion-')) {
        try { unlinkSync(join(tmp, f)); } catch {}
      }
    }
  } catch {}
}

function setupSession(sessionId, coordinationLogContent) {
  const sessionDir = join(TEST_SESSIONS_DIR, sessionId);
  mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
  // Use a phase the hook treats as terminal so the path through autoResolve
  // and warning-emission runs.
  writeFileSync(join(sessionDir, 'status.yaml'),
    `pipeline_state: complete\nupdated_at: "${new Date().toISOString()}"\n`);
  writeFileSync(join(sessionDir, 'workflow', 'coordination_log.yaml'), coordinationLogContent);
  // No agent_tree.yaml means executorCount === 0 — the self-handling check fires.
  return sessionDir;
}

const COORDINATION_LOG_BASE =
  'schema_version: "1"\n' +
  'controller: cagents:tech-lead\n' +
  'status: completed\n' +
  'implementation_tasks:\n' +
  '  - task_id: WI-1\n' +
  '    status: completed\n' +
  '    evidence: "done"\n';

const COORDINATION_LOG_WITH_MARKER =
  COORDINATION_LOG_BASE +
  'execution_notes:\n' +
  '  - "Agent/subagent-spawn tool was not available — graceful degradation per .claude/rules/core/teams.md"\n';

describe('PHASE-N1 (V11.1.13): verify-completion.cjs graceful-degradation downgrade', () => {
  beforeEach(() => cleanDedupFiles());

  it('downgrades severity for team_* session WITH marker phrase', () => {
    const sessionId = `team_n1_test_${Date.now()}`;
    const sessionDir = setupSession(sessionId, COORDINATION_LOG_WITH_MARKER);
    try {
      runHook({ session_id: sessionId }, sessionDir);
      const summary = readSummary(sessionDir);
      // The downgraded warning should appear (acceptable in /team mode)
      expect(summary).toContain('CONTROLLER SELF-HANDLED VIA GRACEFUL DEGRADATION');
      expect(summary).toContain('acceptable in /team mode');
      // The protocol-violation phrasing must NOT appear for the same warning
      expect(summary).not.toContain('CONTROLLER SELF-HANDLING (protocol violation)');
    } finally {
      try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('preserves protocol-violation warning for team_* session WITHOUT marker', () => {
    const sessionId = `team_n1_nomarker_${Date.now()}`;
    const sessionDir = setupSession(sessionId, COORDINATION_LOG_BASE);
    try {
      runHook({ session_id: sessionId }, sessionDir);
      const summary = readSummary(sessionDir);
      expect(summary).toContain('CONTROLLER SELF-HANDLING (protocol violation)');
      expect(summary).not.toContain('CONTROLLER SELF-HANDLED VIA GRACEFUL DEGRADATION');
    } finally {
      try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('preserves protocol-violation warning for run_* session even WITH marker', () => {
    // The downgrade is /team-only by design — under /run, controllers have
    // Agent at level 1 and MUST delegate. The marker should NOT trigger a
    // downgrade for a run_* session.
    const sessionId = `run_n1_marker_${Date.now()}`;
    const sessionDir = setupSession(sessionId, COORDINATION_LOG_WITH_MARKER);
    try {
      runHook({ session_id: sessionId }, sessionDir);
      const summary = readSummary(sessionDir);
      expect(summary).toContain('CONTROLLER SELF-HANDLING (protocol violation)');
      expect(summary).not.toContain('CONTROLLER SELF-HANDLED VIA GRACEFUL DEGRADATION');
    } finally {
      try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    }
  });
});

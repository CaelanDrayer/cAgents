// Regression test for Phase 10 / A8-01: team-artifact enforcement folded into
// the existing verify-completion.cjs Stop hook (NOT a new hook file).
//
// Contract (terminal-success team_* sessions ONLY — result: success AND a
// terminal pipeline_state):
//   - BLOCK when workflow/coordination_log.yaml is missing.
//   - PASS  when coordination_log.yaml exists.
//   - PASS  (no block) for a non-terminal / not-success team session — MUST NOT
//           fire mid-session, or it would deadlock every live /team Stop turn.
//   - PASS  for a non-team (run_*) session — the check is team-scoped.
//   - WARN (never block) when a wave run skipped its spawn briefs / gate dirs.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');
const SESSIONS_DIR = join(process.cwd(), 'cagents-memory', 'sessions');

function runHook(input) {
  const out = execSync(
    `printf '%s' '${JSON.stringify(input).replace(/'/g, "'\\''")}' | node "${HOOK_PATH}"`,
    { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  return JSON.parse(out.trim());
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

const NOW = () => new Date().toISOString();
const created = [];

function makeSession(id, statusYaml) {
  const dir = join(SESSIONS_DIR, id);
  mkdirSync(join(dir, 'workflow'), { recursive: true });
  writeFileSync(join(dir, 'status.yaml'), statusYaml);
  created.push(dir);
  return dir;
}

describe('verify-completion team-artifact enforcement (Phase 10 / A8-01)', () => {
  beforeEach(() => cleanDedupFiles());
  afterEach(() => {
    for (const d of created.splice(0)) { try { rmSync(d, { recursive: true, force: true }); } catch {} }
  });

  it('BLOCKS a terminal-success team_* session missing coordination_log.yaml', () => {
    const id = `team_artifacts_block_${Date.now()}`;
    makeSession(id, `pipeline_state: VALIDATED\nresult: success\nupdated_at: "${NOW()}"\n`);
    const r = runHook({ session_id: id });
    expect(r.decision).toBe('block');
    expect(r.reason).toMatch(/coordination_log\.yaml/);
  });

  it('PASSES a terminal-success team_* session WITH coordination_log.yaml', () => {
    const id = `team_artifacts_pass_${Date.now()}`;
    const dir = makeSession(id, `pipeline_state: VALIDATED\nresult: success\nupdated_at: "${NOW()}"\n`);
    writeFileSync(join(dir, 'workflow', 'coordination_log.yaml'),
      'schema_version: "1"\ncontroller: cagents:team-lead\nstatus: completed\n');
    const r = runHook({ session_id: id });
    expect(r.decision).not.toBe('block');
    expect(r.continue).toBe(true);
  });

  it('PASSES a NON-terminal team_* session (result: pending) — must not fire mid-session', () => {
    // Mirrors a live in-flight /team run: terminal-shaped state but result not
    // finalized to success. The check MUST stay silent so it never deadlocks.
    const id = `team_artifacts_inflight_${Date.now()}`;
    makeSession(id, `pipeline_state: complete\nresult: pending\nupdated_at: "${NOW()}"\n`);
    const r = runHook({ session_id: id });
    expect(r.decision).not.toBe('block');
    expect(r.continue).toBe(true);
  });

  it('PASSES a non-team (run_*) terminal-success session missing coordination_log — check is team-scoped', () => {
    const id = `run_artifacts_scope_${Date.now()}`;
    makeSession(id, `pipeline_state: VALIDATED\nresult: success\nupdated_at: "${NOW()}"\n`);
    const r = runHook({ session_id: id });
    expect(r.decision).not.toBe('block');
    expect(r.continue).toBe(true);
  });

  it('WARNS (never blocks) a terminal-success team_* wave run that skipped spawn briefs / gate validations', () => {
    const id = `team_artifacts_warn_${Date.now()}`;
    const dir = makeSession(id, `pipeline_state: VALIDATED\nresult: success\nupdated_at: "${NOW()}"\n`);
    writeFileSync(join(dir, 'workflow', 'coordination_log.yaml'),
      'schema_version: "1"\ncontroller: cagents:team-lead\nstatus: completed\n');
    // A wave output dir exists but no spawn_brief.md and no gate_validations/.
    mkdirSync(join(dir, 'outputs', 'wave-1'), { recursive: true });
    writeFileSync(join(dir, 'outputs', 'wave-1', 'result.md'), '# wave 1 output\n');
    const r = runHook({ session_id: id });
    expect(r.decision).not.toBe('block');
    expect(r.continue).toBe(true);
  });
});

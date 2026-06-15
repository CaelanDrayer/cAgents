// WI-2 (D3, v12.19.0): verify-completion.cjs sentinel gate — slash-less filename fact-check.
//
// BUG (failing-before state): the sentinel gate's path-extraction at lines :683 and
// :694 required `p.includes('/')` before a claimed deliverable was fact-checked. As a
// result, a coordination_log claiming a bare/slash-less filename (e.g. `README.md`,
// `CHANGELOG.md`, `Makefile`) in `files_created:` / `files_modified:` / `output:` was
// SILENTLY DROPPED — never resolved against disk, never warned about if missing. The
// existence check at :703-707 already resolves bare names against BOTH the session dir
// AND PROJECT_ROOT, so the slash filter was the only thing suppressing them.
//
// FIX: drop the `&& p.includes('/')` clause at :683 (keeping the `!p.startsWith('files_')`
// YAML-key guard) and the `p.includes('/') &&` clause at :694. Now slash-less claimed
// files are fact-checked just like path-containing ones.
//
// This stays WARNINGS-ONLY: the missing-file branch at ~:714 pushes to `warnings`, and
// the hook introduces NO permissionDecision / deny path (Test C asserts this).
//
// Pre-change: Test A FAILS (no sentinel warning for the slash-less missing file — it was
// silently dropped). Post-change: Test A passes. Tests B and C pin the no-false-positive
// and warnings-only invariants.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, mkdirSync, rmSync, readFileSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';

const HOOK_PATH = join(process.cwd(), '.claude', 'hooks', 'verify-completion.cjs');
const TEST_SESSIONS_DIR = join(process.cwd(), 'cagents-memory', 'sessions');

function runHook(input) {
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

// Build a terminal-state session with a coordination_log that claims `claimedFile`
// under files_created. A completed work item with evidence keeps the rest of the
// completion checks quiet so the sentinel warning (or its absence) is unambiguous.
function setupSession(sessionId, claimedFile) {
  const sessionDir = join(TEST_SESSIONS_DIR, sessionId);
  mkdirSync(join(sessionDir, 'workflow'), { recursive: true });
  writeFileSync(join(sessionDir, 'status.yaml'),
    `pipeline_state: complete\nupdated_at: "${new Date().toISOString()}"\n`);
  const coordinationLog =
    'schema_version: "1"\n' +
    'controller: cagents:tech-lead\n' +
    'status: completed\n' +
    'implementation_tasks:\n' +
    '  - task_id: WI-1\n' +
    '    status: completed\n' +
    '    evidence: "done"\n' +
    '    files_created:\n' +
    `      - ${claimedFile}\n`;
  writeFileSync(join(sessionDir, 'workflow', 'coordination_log.yaml'), coordinationLog);
  return sessionDir;
}

describe('WI-2 (D3): verify-completion.cjs sentinel gate — slash-less filenames', () => {
  beforeEach(() => cleanDedupFiles());

  it('Test A: warns when a slash-less claimed file does NOT exist', () => {
    // Pre-change this claim was silently dropped (slash filter) -> no warning.
    const sessionId = `run_slashless_missing_${Date.now()}`;
    const sessionDir = setupSession(sessionId, 'DOESNOTEXIST_README.md');
    try {
      runHook({ session_id: sessionId });
      const summary = readSummary(sessionDir);
      expect(summary).toContain('Sentinel gate');
      expect(summary).toContain('DOESNOTEXIST_README.md');
    } finally {
      try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('Test B: does NOT warn when a slash-less claimed file DOES exist (CLAUDE.md at PROJECT_ROOT)', () => {
    // CLAUDE.md exists at PROJECT_ROOT; the :703-707 existence check resolves the
    // bare name against PROJECT_ROOT, so it must NOT be reported missing.
    expect(existsSync(join(process.cwd(), 'CLAUDE.md'))).toBe(true);
    const sessionId = `run_slashless_exists_${Date.now()}`;
    const sessionDir = setupSession(sessionId, 'CLAUDE.md');
    try {
      runHook({ session_id: sessionId });
      const summary = readSummary(sessionDir);
      // No sentinel warning naming CLAUDE.md as a missing deliverable.
      expect(summary).not.toContain('not found on disk: CLAUDE.md');
      if (summary.includes('Sentinel gate')) {
        // If a sentinel line appears at all, it must not implicate CLAUDE.md.
        expect(summary).not.toMatch(/Sentinel gate:.*CLAUDE\.md/);
      }
    } finally {
      try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    }
  });

  it('Test C: warnings-only — missing slash-less file does NOT introduce a deny/permissionDecision', () => {
    const sessionId = `run_slashless_warnonly_${Date.now()}`;
    const sessionDir = setupSession(sessionId, 'DOESNOTEXIST_README.md');
    try {
      const out = runHook({ session_id: sessionId });
      // The hook never returns a permission decision or allow/deny — it is a Stop
      // hook that may at most return {decision: 'block'} for incompleteness. The
      // sentinel-gate fix must NOT have added any deny path.
      expect(out).not.toHaveProperty('hookSpecificOutput');
      expect(out.hookSpecificOutput).toBeUndefined();
      // No `permissionDecision` anywhere in the returned object.
      expect(JSON.stringify(out)).not.toContain('permissionDecision');
      expect(JSON.stringify(out)).not.toContain('"deny"');
      // The sentinel concern remains a warning recorded in the summary.
      const summary = readSummary(sessionDir);
      expect(summary).toContain('Sentinel gate');
    } finally {
      try { rmSync(sessionDir, { recursive: true, force: true }); } catch {}
    }
  });
});

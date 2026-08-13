/**
 * REC-20 (v12.52.0) regression test: scripts/ci/check-skill-session-paths.cjs
 *
 * The guard fails if a shipped skill body reintroduces a CWD-relative
 * session-path write (relative `cagents-memory/…` mkdir/redirect/SESSION_DIR=)
 * or an npm-into-session/scratch footgun. Covers:
 *   - the guard CATCHES a CWD-relative session path (failing-before contract)
 *   - the guard CATCHES an npm-into-session install
 *   - the real shipped skill bodies PASS (anchored on $MEM)
 *   - each shipped skill body carries the absolute $MEM anchor
 *   - cagents-ci.sh wires the guard as a blocking stage
 *
 * Bug-driven testing mandate (CLAUDE.md): failing-before / passing-after.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const GUARD = path.join(REPO_ROOT, 'scripts/ci/check-skill-session-paths.cjs');
const CI = path.join(REPO_ROOT, 'scripts/ci/cagents-ci.sh');
const guard = require(GUARD);

// Mirrors DEFAULT_FILES in scripts/ci/check-skill-session-paths.cjs. The
// `/run` -> `/act` rename moved two of these pins; if the guard's list and
// this list drift apart, the "shipped bodies PASS" test below silently stops
// covering what the guard actually scans.
const SHIPPED_BODIES = [
  '.claude/skills/act/SKILL.md',
  '.claude/skills/team/SKILL.md',
  '.claude/skills/designer/SKILL.md',
  '.claude/skills/act/reference/session-id-format.md',
].map((p) => path.join(REPO_ROOT, p));

function runGuard(args) {
  const r = spawnSync('node', [GUARD, ...args], { encoding: 'utf8', timeout: 10000 });
  return { exitCode: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

describe('REC-20 skill session-path CWD-leak guard', () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cagents-rec20-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  });

  it('CATCHES a CWD-relative SESSION_DIR assignment (exit 1)', () => {
    const bad = path.join(tmp, 'bad-sessiondir.md');
    fs.writeFileSync(bad, [
      '```bash',
      'SESSION_DIR="cagents-memory/sessions/${SESSION_ID}"',
      'mkdir -p "${SESSION_DIR}/workflow"',
      '```',
    ].join('\n'));
    const r = runGuard([bad]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/relative-session-dir-assignment/);
  });

  it('CATCHES a relative mkdir into cagents-memory/_system (exit 1)', () => {
    const bad = path.join(tmp, 'bad-mkdir.md');
    fs.writeFileSync(bad, 'mkdir -p cagents-memory/_system/sdk_session_map\n');
    const r = runGuard([bad]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/relative-mkdir/);
  });

  it('CATCHES a relative redirect write into a session path (exit 1)', () => {
    const bad = path.join(tmp, 'bad-redirect.md');
    fs.writeFileSync(bad, 'printf x > cagents-memory/_system/sdk_session_map/$SID\n');
    const r = runGuard([bad]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/relative-redirect-write/);
  });

  it('CATCHES an npm install with cwd inside a session dir (exit 1)', () => {
    const bad = path.join(tmp, 'bad-npm.md');
    fs.writeFileSync(bad, 'cd "$SESSION_DIR" && npm install\n');
    const r = runGuard([bad]);
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toMatch(/npm-into-session-or-scratch/);
  });

  it('PASSES an anchored ($MEM) session-path write (exit 0)', () => {
    const good = path.join(tmp, 'good.md');
    fs.writeFileSync(good, [
      'MEM="$CAGENTS_ROOT/cagents-memory"',
      'SESSION_DIR="$MEM/sessions/${SESSION_ID}"',
      'mkdir -p "$MEM/_system/sdk_session_map"',
      'printf x > "$MEM/_system/sdk_session_map/$SID"',
      'Read cagents-memory/_system/config/pipeline_config.yaml',  // a READ is fine
    ].join('\n'));
    const r = runGuard([good]);
    expect(r.exitCode).toBe(0);
  });

  it('the real shipped skill bodies PASS the guard (exit 0)', () => {
    const r = runGuard([]); // default set = shipped bodies
    expect(r.exitCode).toBe(0);
  });

  it('SHIPPED_BODIES mirrors the guard\'s DEFAULT_FILES exactly (no drift)', () => {
    // Without this, a rename in the guard's list (e.g. /run -> /act) leaves
    // this file asserting against paths the guard no longer scans.
    expect([...guard.DEFAULT_FILES].sort()).toEqual([...SHIPPED_BODIES].sort());
    // And every pinned body must actually exist on disk.
    for (const f of SHIPPED_BODIES) {
      expect(fs.existsSync(f), `Pinned shipped body missing: ${f}`).toBe(true);
    }
  });

  it('scanFile finds zero violations in each shipped body', () => {
    for (const f of SHIPPED_BODIES) {
      expect(guard.scanFile(f)).toHaveLength(0);
    }
  });

  it('every shipped skill body carries the absolute $MEM anchor', () => {
    for (const f of SHIPPED_BODIES) {
      const content = fs.readFileSync(f, 'utf8');
      expect(content).toMatch(/MEM="\$CAGENTS_ROOT\/cagents-memory"/);
    }
  });

  it('cagents-ci.sh wires the guard as a blocking stage (exit 9)', () => {
    const ci = fs.readFileSync(CI, 'utf8');
    expect(ci).toMatch(/check_skill_paths\(\)/);
    expect(ci).toMatch(/check-skill-session-paths\.cjs/);
    expect(ci).toMatch(/skill-paths\)/);       // case dispatch
    expect(ci).toMatch(/check_skill_paths \|\| exit_code=\$\(\(exit_code > 0 \? exit_code : 9\)\)/); // in `all`
  });
});

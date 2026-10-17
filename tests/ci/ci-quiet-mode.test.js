/**
 * ITEM-6 / WI-07 (v12.78.0): quiet mode for the scripts/ci validators.
 *
 * scripts/ci/lib/quiet.sh is sourced by validate-agents.sh, validate-versions.sh and
 * cagents-ci.sh. Quiet mode is on when CAGENTS_CI_QUIET=1, or when CLAUDECODE=1 and
 * CAGENTS_CI_QUIET is not 0. A quiet run writes the full output to a log and prints
 * only the FAIL/WARN/ERROR lines, 'N passed, M failed' and '[full output: <path>]'.
 * The exit code does not change. ANSI colors appear only on a terminal with NO_COLOR
 * unset.
 *
 * Bug this catches: each validator printed 100+ lines of PASS rows into the agent
 * context on every run. Those rows had hardcoded ANSI codes, even into a pipe.
 *
 * All writes go to mkdtemp dirs: the agent tree copy (CAGENTS_PROJECT_ROOT), and the
 * quiet logs (TMPDIR / CAGENTS_SESSION_DIR).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync, cpSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(__dirname, '..', '..');
const CI_DIR = join(REPO_ROOT, 'scripts', 'ci');
const VALIDATE_AGENTS = join(CI_DIR, 'validate-agents.sh');
const VALIDATE_VERSIONS = join(CI_DIR, 'validate-versions.sh');
const CAGENTS_CI = join(CI_DIR, 'cagents-ci.sh');
const ESC = '\u001b[';
// Each run of validate-agents.sh takes several seconds on a loaded box; some tests run it twice.
const T = { timeout: 180000 };

let TMP = '';        // parent of every temp path below
let GOOD_ROOT = '';  // copy of the tree validate-agents.sh reads
let BAD_ROOT = '';   // same copy with one broken agent
let LOG_TMP = '';    // TMPDIR for quiet logs

// Copy only the paths validate-agents.sh reads (same set as WI-04's test).
function copyTree(dest) {
  cpSync(join(REPO_ROOT, 'agents'), join(dest, 'agents'), {
    recursive: true,
    filter: (src) => !src.startsWith(join(REPO_ROOT, 'agents', '_deprecated')),
  });
  cpSync(join(REPO_ROOT, '.claude-plugin'), join(dest, '.claude-plugin'), { recursive: true });
  mkdirSync(join(dest, '.claude', 'hooks'), { recursive: true });
  for (const f of ['settings.json', 'hooks.json']) {
    const src = join(REPO_ROOT, '.claude', f);
    if (existsSync(src)) cpSync(src, join(dest, '.claude', f));
  }
  for (const f of readdirSync(join(REPO_ROOT, '.claude', 'hooks'))) {
    if (f.endsWith('.cjs')) cpSync(join(REPO_ROOT, '.claude', 'hooks', f), join(dest, '.claude', 'hooks', f));
  }
}

// Base env with every variable that changes the output policy removed.
function baseEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of ['CLAUDECODE', 'CAGENTS_CI_QUIET', 'CAGENTS_CI_QUIET_ACTIVE', 'CAGENTS_SESSION_DIR', 'NO_COLOR']) {
    delete env[k];
  }
  return { ...env, TMPDIR: LOG_TMP, ...extra };
}

function run(script, args, extraEnv) {
  const r = spawnSync('bash', [script, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 60000,
    env: baseEnv(extraEnv),
  });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

const lines = (s) => s.split('\n').filter((l) => l.trim() !== '');
const logPath = (out) => {
  const m = /^\[full output: (.+)\]$/m.exec(out);
  return m ? m[1] : '';
};
// A one-archetype run (16 agents) keeps the cheaper checks fast on a loaded box.
const CORE = ['--archetype', 'core'];
const passLines = (s) => s.split('\n').filter((l) => /\bPASS\b/.test(l));

beforeAll(() => {
  TMP = mkdtempSync(join(tmpdir(), 'cagents-ci-quiet-'));
  try {
    GOOD_ROOT = join(TMP, 'good');
    BAD_ROOT = join(TMP, 'bad');
    LOG_TMP = join(TMP, 'logs');
    mkdirSync(LOG_TMP);
    copyTree(GOOD_ROOT);
    copyTree(BAD_ROOT);
    // Break one agent: drop its frontmatter `name:` line (an ERROR in validate-agents.sh).
    const victim = join(BAD_ROOT, 'agents', 'architect.md');
    writeFileSync(victim, readFileSync(victim, 'utf8').replace(/^name:.*\n/m, ''));
  } catch (err) {
    rmSync(TMP, { recursive: true, force: true });
    throw err;
  }
}, 60000);

afterAll(() => {
  if (TMP) rmSync(TMP, { recursive: true, force: true });
});

describe('scripts/ci/lib/quiet.sh', () => {
  it('passes bash -n for the library and the 3 scripts that source it', T, () => {
    for (const f of [join(CI_DIR, 'lib', 'quiet.sh'), VALIDATE_AGENTS, VALIDATE_VERSIONS, CAGENTS_CI]) {
      const r = spawnSync('bash', ['-n', f], { encoding: 'utf8', timeout: 60000 });
      expect(r.status, `${f}: ${r.stderr}`).toBe(0);
    }
  });
});

describe('validate-agents.sh quiet mode', () => {
  it('CAGENTS_CI_QUIET=1 success: exit 0, <=10 lines, summary + log path, log holds every PASS line', T, () => {
    const full = run(VALIDATE_AGENTS, [], { CAGENTS_PROJECT_ROOT: GOOD_ROOT, CAGENTS_CI_QUIET: '0' });
    expect(full.status, full.stdout).toBe(0);
    const quiet = run(VALIDATE_AGENTS, [], { CAGENTS_PROJECT_ROOT: GOOD_ROOT, CAGENTS_CI_QUIET: '1' });
    expect(quiet.status, quiet.stdout).toBe(0);
    const out = lines(quiet.stdout);
    expect(out.length).toBeLessThanOrEqual(10);
    expect(out[out.length - 2]).toMatch(/^\d+ passed, 0 failed$/);
    expect(out[out.length - 1]).toMatch(/^\[full output: .+\]$/);
    const log = logPath(quiet.stdout);
    expect(log.startsWith(LOG_TMP)).toBe(true);
    const logText = readFileSync(log, 'utf8');
    const want = passLines(full.stdout);
    expect(want.length).toBeGreaterThan(50);
    expect(passLines(logText)).toEqual(want);
    expect(out[out.length - 2]).toBe(`${want.length} passed, 0 failed`);
  });

  it('forced failure: the quiet run prints the FAIL line and keeps the non-zero exit code', T, () => {
    const full = run(VALIDATE_AGENTS, [], { CAGENTS_PROJECT_ROOT: BAD_ROOT, CAGENTS_CI_QUIET: '0' });
    const quiet = run(VALIDATE_AGENTS, [], { CAGENTS_PROJECT_ROOT: BAD_ROOT, CAGENTS_CI_QUIET: '1' });
    expect(full.status).not.toBe(0);
    expect(quiet.status).toBe(full.status);
    expect(quiet.stdout).toMatch(/FAIL Missing 'name' field.*agents\/architect\.md/);
    expect(quiet.stdout).toMatch(/Agent validation FAILED/);
    expect(quiet.stdout).toMatch(/^\d+ passed, [1-9]\d* failed$/m);
    expect(logPath(quiet.stdout)).not.toBe('');
  });

  it('CLAUDECODE=1 turns quiet on; CAGENTS_CI_QUIET=0 turns it off again', T, () => {
    const cc = run(VALIDATE_AGENTS, CORE, { CAGENTS_PROJECT_ROOT: GOOD_ROOT, CLAUDECODE: '1' });
    expect(cc.status).toBe(0);
    expect(cc.stdout).toMatch(/\[full output: /);
    const off = run(VALIDATE_AGENTS, CORE, { CAGENTS_PROJECT_ROOT: GOOD_ROOT, CLAUDECODE: '1', CAGENTS_CI_QUIET: '0' });
    expect(off.status).toBe(0);
    expect(off.stdout).not.toMatch(/\[full output: /);
    expect(off.stdout).toMatch(/Agent validation PASSED/);
  });

  it('unset CLAUDECODE and unset CAGENTS_CI_QUIET keep the full output', T, () => {
    const r = run(VALIDATE_AGENTS, CORE, { CAGENTS_PROJECT_ROOT: GOOD_ROOT });
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/\[full output: /);
    expect(passLines(r.stdout).length).toBeGreaterThan(10);
  });

  it('--count stays un-wrapped under quiet mode (existing COUNT_ONLY gate)', T, () => {
    const r = run(VALIDATE_AGENTS, ['--count'], { CAGENTS_PROJECT_ROOT: GOOD_ROOT, CAGENTS_CI_QUIET: '1' });
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/\[full output: /);
    expect(r.stdout).toMatch(/Total agents: \d+/);
  });

  it('prints no ANSI codes when stdout is a pipe', T, () => {
    const r = run(VALIDATE_AGENTS, CORE, { CAGENTS_PROJECT_ROOT: GOOD_ROOT, CAGENTS_CI_QUIET: '0' });
    expect(r.stdout.includes(ESC)).toBe(false);
  });

  it('writes the log under $CAGENTS_SESSION_DIR/outputs/logs when that is set', T, () => {
    const session = join(TMP, 'session');
    const r = run(VALIDATE_AGENTS, CORE, {
      CAGENTS_PROJECT_ROOT: GOOD_ROOT, CAGENTS_CI_QUIET: '1', CAGENTS_SESSION_DIR: session,
    });
    expect(r.status).toBe(0);
    const log = logPath(r.stdout);
    expect(log.startsWith(join(session, 'outputs', 'logs'))).toBe(true);
    expect(existsSync(log)).toBe(true);
  });
});

describe('validate-versions.sh quiet mode', () => {
  it('CAGENTS_CI_QUIET=0 into a pipe has no ANSI codes', T, () => {
    const r = run(VALIDATE_VERSIONS, [], { CAGENTS_CI_QUIET: '0' });
    expect(r.stdout.includes(ESC)).toBe(false);
    expect(r.stdout).toMatch(/Checked \d+\/16 locations/);
  });

  it('CAGENTS_CI_QUIET=1 prints the summary and the log path, same exit code as the full run', T, () => {
    const full = run(VALIDATE_VERSIONS, [], { CAGENTS_CI_QUIET: '0' });
    const quiet = run(VALIDATE_VERSIONS, [], { CAGENTS_CI_QUIET: '1' });
    expect(quiet.status).toBe(full.status);
    expect(quiet.stdout).toMatch(/^\d+ passed, \d+ failed$/m);
    expect(readFileSync(logPath(quiet.stdout), 'utf8')).toContain('Checked ');
    expect(lines(quiet.stdout).length).toBeLessThan(lines(full.stdout).length);
  });
});

describe('cagents-ci.sh quiet mode', () => {
  it('CAGENTS_CI_QUIET=1 wraps a stage: summary + log path, exit code kept', T, () => {
    const full = run(CAGENTS_CI, ['contract'], { CAGENTS_CI_QUIET: '0' });
    const quiet = run(CAGENTS_CI, ['contract'], { CAGENTS_CI_QUIET: '1' });
    expect(quiet.status).toBe(full.status);
    expect(full.stdout).toMatch(/cAgents CI Runner/);
    expect(quiet.stdout).not.toMatch(/cAgents CI Runner/);
    expect(readFileSync(logPath(quiet.stdout), 'utf8')).toMatch(/cAgents CI Runner/);
  });

  it('an unknown command keeps its exit code 1 in quiet mode', T, () => {
    const full = run(CAGENTS_CI, ['no-such-command'], { CAGENTS_CI_QUIET: '0' });
    const quiet = run(CAGENTS_CI, ['no-such-command'], { CAGENTS_CI_QUIET: '1' });
    expect(full.status).toBe(1);
    expect(quiet.status).toBe(1);
    expect(quiet.stdout).toMatch(/^\[full output: /m);
  });
});

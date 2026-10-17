/**
 * ITEM-4 (v12.78.0): the update check reports only a newer remote version.
 *
 *   1. scripts/update-check.sh compares the versions as numeric semver. It
 *      prints the update line only when the remote version is newer than the
 *      local version. A downgrade or an equal version prints nothing.
 *   2. session-catchup.cjs injects a cached update line only when vFROM is the
 *      local package.json version and vTO is newer than vFROM.
 *
 * The script test copies update-check.sh into a temp root with its own
 * package.json. It sets HOME to a temp dir and puts a curl stub first on PATH.
 * No test uses the network or writes under the repo tree.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync, chmodSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts', 'update-check.sh');
const CATCHUP_HOOK = join(ROOT, '.claude', 'hooks', 'session-catchup.cjs');
const LOCAL_VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const dirs = [];
const tmp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); dirs.push(d); return d; };

afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

function runScript(remote, local) {
  const root = tmp('cagents-uc-root-');
  mkdirSync(join(root, 'scripts'));
  copyFileSync(SCRIPT, join(root, 'scripts', 'update-check.sh'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ version: local }));
  const home = tmp('cagents-uc-home-');
  const bin = tmp('cagents-uc-bin-');
  const curl = join(bin, 'curl');
  writeFileSync(curl, `#!/bin/sh\nprintf '%s' '{"version":"${remote}"}'\n`);
  chmodSync(curl, 0o755);
  const r = spawnSync('bash', [join(root, 'scripts', 'update-check.sh')], {
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}` },
  });
  return { ...r, root, home };
}

describe('ITEM-4: update-check.sh numeric semver compare', { timeout: 60000 }, () => {
  it('remote 12.79.0 vs local 12.78.0 prints one update line', () => {
    const r = runScript('12.79.0', '12.78.0');
    expect(r.status).toBe(0);
    const lines = r.stdout.trim().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(`cAgents update available: v12.78.0 -> v12.79.0. Run: cd ${r.root} && git pull`);
  });

  it('equal versions print nothing', () => {
    const r = runScript('12.78.0', '12.78.0');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('an older remote (downgrade) prints nothing', () => {
    const r = runScript('12.77.0', '12.78.0');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });

  it('12.10.0 is newer than 12.9.0 (numeric, not string compare)', () => {
    const r = runScript('12.10.0', '12.9.0');
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toContain('v12.9.0 -> v12.10.0');
  });

  it('a fresh cache is compared against the current local version', () => {
    const root = tmp('cagents-uc-root-');
    mkdirSync(join(root, 'scripts'));
    copyFileSync(SCRIPT, join(root, 'scripts', 'update-check.sh'));
    writeFileSync(join(root, 'package.json'), JSON.stringify({ version: '12.78.0' }));
    const home = tmp('cagents-uc-home-');
    mkdirSync(join(home, '.cache', 'cagents'), { recursive: true });
    // Cached when local was 12.76.0; local is now 12.78.0, so 12.77.0 is old.
    writeFileSync(join(home, '.cache', 'cagents', 'update-check.json'),
      JSON.stringify({ latest: '12.77.0', current: '12.76.0' }));
    const bin = tmp('cagents-uc-bin-');
    writeFileSync(join(bin, 'curl'), '#!/bin/sh\nexit 7\n');
    chmodSync(join(bin, 'curl'), 0o755);
    const r = spawnSync('bash', [join(root, 'scripts', 'update-check.sh')], {
      encoding: 'utf8',
      timeout: 60000,
      env: { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}` },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe('');
  });
});

function bump(v) {
  const [a, b, c] = v.split('.').map(Number);
  return `${a}.${b}.${c + 1}`;
}

function runCatchup(cachedLine) {
  const proj = tmp('cagents-uc-sc-');
  const sys = join(proj, 'cagents-memory', '_system');
  mkdirSync(join(proj, 'cagents-memory', 'sessions'), { recursive: true });
  mkdirSync(sys, { recursive: true });
  // Mark today's check as done so the hook does not spawn update-check.sh.
  writeFileSync(join(sys, '.update-check-ts'), new Date().toISOString().slice(0, 10));
  writeFileSync(join(sys, '.update-check-result'), cachedLine + '\n');
  const r = spawnSync('node', [CATCHUP_HOOK], {
    input: JSON.stringify({ session_id: 'item4', source: 'startup' }),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, NODE_ENV: 'test', VITEST: 'true', CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: proj },
  });
  expect(r.status).toBe(0);
  return r.stdout;
}

describe('ITEM-4: session-catchup ignores a stale cached update line', { timeout: 60000 }, () => {
  it('a cached line for another local version injects nothing', () => {
    const out = runCatchup('cAgents update available: v12.76.0 -> v12.77.0. Run: cd /opt/cagents && git pull');
    expect(out).not.toContain('cAgents update available');
  });

  it('a cached line whose vFROM is the local version and vTO is newer is injected', () => {
    const line = `cAgents update available: v${LOCAL_VERSION} -> v${bump(LOCAL_VERSION)}. Run: cd /opt/cagents && git pull`;
    expect(runCatchup(line)).toContain(line);
  });

  it('a cached downgrade line from the local version injects nothing', () => {
    const out = runCatchup(`cAgents update available: v${LOCAL_VERSION} -> v0.0.1. Run: cd /opt/cagents && git pull`);
    expect(out).not.toContain('cAgents update available');
  });
});

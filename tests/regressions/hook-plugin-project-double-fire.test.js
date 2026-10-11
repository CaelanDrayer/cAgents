import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Regression test for F5 (act_cc-changelog-compat_261011_001, WI-14).
 *
 * Bug: in the cAgents source repo with the cagents plugin enabled, every hook
 *      fired twice. Claude Code dedupes identical handlers only across settings
 *      files. "A plugin's or skill's copy of the same handler stays separate"
 *      (code.claude.com/docs/en/hooks). So the plugin copy (.claude/hooks.json
 *      via CLAUDE_PLUGIN_ROOT) and the project copy (.claude/settings.json) both
 *      ran. dedupGuard in hook-utils.cjs misses sequential runs, so append and
 *      count side effects doubled.
 * Fix: run-hook.cjs makes the PLUGIN copy stand down when the project is a
 *      cAgents source repo whose settings.json registers run-hook.cjs with THIS
 *      hook name and whose .claude/hooks/<hook>.cjs exists. Otherwise the
 *      plugin copy runs, so a hook never runs zero times (review R-C1).
 * Failing-before evidence: the plugin copy ran unconditionally, so the probe
 *      log held 2 lines in the cAgents-repo cases.
 */

const ROOT = process.cwd();
const RUN_HOOK_SRC = join(ROOT, '.claude', 'hooks', 'run-hook.cjs');
// The real registered command string, so the bash fallback chain is exercised too.
const COMMAND = JSON.parse(readFileSync(join(ROOT, '.claude', 'hooks.json'), 'utf8'))
  .hooks.SessionStart[0].hooks[0].command
  .replace(/(run-hook\.cjs" )[a-z-]+'/, "$1probe-hook'");

const PROBE = `require('fs').appendFileSync(process.env.PROBE_LOG, __dirname + '\\n');\n`;

function makeRoot(dir, { cagents, registersHooks, registeredName = 'probe-hook', hasProbe = true }) {
  mkdirSync(join(dir, '.claude', 'hooks'), { recursive: true });
  copyFileSync(RUN_HOOK_SRC, join(dir, '.claude', 'hooks', 'run-hook.cjs'));
  if (hasProbe) writeFileSync(join(dir, '.claude', 'hooks', 'probe-hook.cjs'), PROBE);
  if (cagents) {
    mkdirSync(join(dir, '.claude-plugin'), { recursive: true });
    writeFileSync(join(dir, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'cagents' }));
  }
  if (registersHooks) {
    writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: COMMAND.replace('probe-hook', registeredName) }] }] }
    }));
  }
  return dir;
}

let tmp;
let log;

function fire({ pluginRoot, projectDir }) {
  const env = { ...process.env, PROBE_LOG: log, CLAUDE_PROJECT_DIR: projectDir };
  delete env.CLAUDE_PLUGIN_ROOT;
  if (pluginRoot) env.CLAUDE_PLUGIN_ROOT = pluginRoot;
  const r = spawnSync(COMMAND, { shell: true, env, cwd: projectDir, input: '{}', encoding: 'utf8', timeout: 60000 });
  expect(r.error).toBeUndefined();
  expect(r.status).toBe(0);
  return r;
}

const runs = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean) : []);

describe('plugin + project hook copies fire exactly once (F5)', () => {
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'cagents-doublefire-'));
    log = join(tmp, 'probe.log');
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it('cAgents repo + installed plugin: only the project (dev) copy runs', () => {
    const project = makeRoot(join(tmp, 'repo'), { cagents: true, registersHooks: true });
    const plugin = makeRoot(join(tmp, 'plugin-cache'), { cagents: true, registersHooks: false });
    const pluginRun = fire({ pluginRoot: plugin, projectDir: project });
    expect(pluginRun.stdout).toBe('');
    fire({ pluginRoot: null, projectDir: project });
    expect(runs()).toEqual([join(project, '.claude', 'hooks')]);
  });

  it('cAgents repo loaded as its own plugin (--plugin-dir .): exactly one copy runs', () => {
    const project = makeRoot(join(tmp, 'repo'), { cagents: true, registersHooks: true });
    fire({ pluginRoot: project, projectDir: project });
    fire({ pluginRoot: null, projectDir: project });
    expect(runs()).toHaveLength(1);
  });

  it('normal user project: the plugin copy still runs', () => {
    const project = join(tmp, 'user-app');
    mkdirSync(join(project, '.claude'), { recursive: true });
    writeFileSync(join(project, '.claude', 'settings.json'), JSON.stringify({ permissions: {} }));
    const plugin = makeRoot(join(tmp, 'plugin-cache'), { cagents: true, registersHooks: false });
    fire({ pluginRoot: plugin, projectDir: project });
    expect(runs()).toEqual([join(plugin, '.claude', 'hooks')]);
  });

  it('a fork named something else that registers run-hook.cjs: plugin copy still runs', () => {
    const project = makeRoot(join(tmp, 'other'), { cagents: false, registersHooks: true });
    const plugin = makeRoot(join(tmp, 'plugin-cache'), { cagents: true, registersHooks: false });
    fire({ pluginRoot: plugin, projectDir: project });
    expect(runs()).toEqual([join(plugin, '.claude', 'hooks')]);
  });

  it('fails open: a malformed project settings.json leaves the plugin copy running', () => {
    const project = makeRoot(join(tmp, 'repo'), { cagents: true, registersHooks: false });
    writeFileSync(join(project, '.claude', 'settings.json'), '{not json');
    const plugin = makeRoot(join(tmp, 'plugin-cache'), { cagents: true, registersHooks: false });
    fire({ pluginRoot: plugin, projectDir: project });
    expect(runs()).toEqual([join(plugin, '.claude', 'hooks')]);
  });

  it('cAgents repo whose settings register a different hook: the plugin copy still runs', () => {
    const project = makeRoot(join(tmp, 'repo'), { cagents: true, registersHooks: true, registeredName: 'other-hook' });
    const plugin = makeRoot(join(tmp, 'plugin-cache'), { cagents: true, registersHooks: false });
    fire({ pluginRoot: plugin, projectDir: project });
    expect(runs()).toEqual([join(plugin, '.claude', 'hooks')]);
  });

  it('cAgents repo registers the hook but its hook file is missing: the plugin copy runs', () => {
    const project = makeRoot(join(tmp, 'repo'), { cagents: true, registersHooks: true, hasProbe: false });
    const plugin = makeRoot(join(tmp, 'plugin-cache'), { cagents: true, registersHooks: false });
    fire({ pluginRoot: plugin, projectDir: project });
    expect(runs()).toEqual([join(plugin, '.claude', 'hooks')]);
  });
});

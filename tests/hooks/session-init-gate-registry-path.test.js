// HS-8 (E11) regression: the session-init-gate registry lookup reads the
// CURRENT <root>/.claude-plugin/plugin.json `agents` list (not a stale cache,
// not only the agents/ directory listing) and reports WHICH file it read.
//
// E11 was a false "is not a registered agent" advisory on tech-lead, planner,
// validator and architect that could not be traced, because the gate never
// said which registry copy produced it. These tests run a COPY of the hooks
// layer from a fixture plugin root (PLUGIN_ROOT is __dirname-anchored, so an
// env override would test the real repo catalog instead).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(process.cwd(), '.claude', 'hooks');
const SID = 'act_hs8-registry_261015_001';

let pluginRoot;
let projRoot;

function writeManifest(names) {
  writeFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'),
    JSON.stringify({ name: 'cagents', version: '0.0.0-test', agents: names.map((n) => `./agents/${n}.md`) }));
}

function runGate(subagentType) {
  const hook = join(pluginRoot, '.claude', 'hooks', 'session-init-gate.cjs');
  const r = spawnSync('node', [hook], {
    input: JSON.stringify({ tool_name: 'Agent', session_id: SID, tool_input: { subagent_type: subagentType } }),
    encoding: 'utf8',
    timeout: 60000,
    env: { ...process.env, CLAUDE_PROJECT_DIR: projRoot, CAGENTS_SESSION_ID: SID },
  });
  expect(r.status, r.stderr).toBe(0);
  const out = JSON.parse(r.stdout.trim());
  const surfaced = `${out.systemMessage || ''}\n${out.hookSpecificOutput?.permissionDecisionReason || ''}`;
  return { out, surfaced, stderr: r.stderr };
}

describe('session-init-gate registry lookup (HS-8)', () => {
  beforeEach(() => {
    const tag = `${process.pid}-${Date.now()}`;
    pluginRoot = join(tmpdir(), `cagents-hs8-plug-${tag}`);
    mkdirSync(join(pluginRoot, '.claude', 'hooks'), { recursive: true });
    mkdirSync(join(pluginRoot, '.claude-plugin'), { recursive: true });
    mkdirSync(join(pluginRoot, 'agents'), { recursive: true });
    for (const f of readdirSync(HOOKS_DIR)) {
      if (f.endsWith('.cjs')) copyFileSync(join(HOOKS_DIR, f), join(pluginRoot, '.claude', 'hooks', f));
    }
    writeFileSync(join(pluginRoot, 'CLAUDE.md'), '# temp plugin root\n');
    // agents/ holds planner (catalog sentinel) + dir-only-agent; the manifest
    // lists planner + manifest-only-agent. The two sources disagree on purpose.
    writeFileSync(join(pluginRoot, 'agents', 'planner.md'), '---\nname: planner\n---\n');
    writeFileSync(join(pluginRoot, 'agents', 'dir-only-agent.md'), '---\nname: dir-only-agent\n---\n');
    writeManifest(['planner', 'manifest-only-agent']);

    projRoot = join(tmpdir(), `cagents-hs8-proj-${tag}`);
    const sd = join(projRoot, 'cagents-memory', 'sessions', SID);
    mkdirSync(join(sd, 'workflow'), { recursive: true });
    writeFileSync(join(sd, 'status.yaml'), 'phase: executing\npipeline_state: PLANNED\n');
  });

  afterEach(() => {
    rmSync(pluginRoot, { recursive: true, force: true });
    rmSync(projRoot, { recursive: true, force: true });
  });

  it('treats an agent listed in plugin.json as registered, even with no agents/<name>.md', () => {
    const { out, surfaced } = runGate('cagents:manifest-only-agent');
    expect(out.continue).toBe(true);
    expect(surfaced).not.toMatch(/is not a registered agent|Did you mean/);
  });

  it('flags an agent missing from plugin.json and names the plugin.json path it read', () => {
    const { out, surfaced } = runGate('cagents:dir-only-agent');
    expect(out.continue).toBe(true);
    expect(out.hookSpecificOutput?.permissionDecision).not.toBe('deny');
    expect(surfaced).toMatch(/not a registered agent|Did you mean/);
    expect(surfaced).toContain(`registry: ${join(pluginRoot, '.claude-plugin', 'plugin.json')}`);
    expect(surfaced).toMatch(/2 agents\)/);
  });

  it('logs the registry path it read to stderr', () => {
    const { stderr } = runGate('cagents:planner');
    expect(stderr).toContain(`agent registry read from ${join(pluginRoot, '.claude-plugin', 'plugin.json')} (plugin.json, 2 agents)`);
  });

  it('reads the CURRENT manifest: an edit is picked up on the next spawn', () => {
    expect(runGate('cagents:late-agent').surfaced).toMatch(/not a registered agent|Did you mean/);
    writeManifest(['planner', 'manifest-only-agent', 'late-agent']);
    expect(runGate('cagents:late-agent').surfaced).not.toMatch(/not a registered agent|Did you mean/);
  });

  it('falls back to the agents/ listing (and says so) when plugin.json is absent', () => {
    rmSync(join(pluginRoot, '.claude-plugin'), { recursive: true, force: true });
    const ok = runGate('cagents:dir-only-agent');
    expect(ok.surfaced).not.toMatch(/not a registered agent|Did you mean/);
    expect(ok.stderr).toContain(`agent registry read from ${join(pluginRoot, 'agents')} (agents-dir, 2 agents)`);
    const bad = runGate('cagents:manifest-only-agent');
    expect(bad.surfaced).toContain(`registry: ${join(pluginRoot, 'agents')}`);
  });

  it('falls back to the agents/ listing when plugin.json has an empty agents array', () => {
    writeManifest([]);
    const r = runGate('cagents:dir-only-agent');
    expect(r.surfaced).not.toMatch(/not a registered agent|Did you mean/);
    expect(r.stderr).toContain('(agents-dir, 2 agents)');
  });

  it('in-process: the cache is keyed on manifest mtime, so a rewritten manifest is re-read', () => {
    process.env.CAGENTS_DISPATCH_IMPORT = '1';
    try {
      const gate = require(join(pluginRoot, '.claude', 'hooks', 'session-init-gate.cjs'));
      const first = gate.loadRegisteredAgents(pluginRoot);
      expect([...first].sort()).toEqual(['manifest-only-agent', 'planner']);
      expect(gate.getRegistrySource()).toEqual({
        kind: 'plugin.json', path: join(pluginRoot, '.claude-plugin', 'plugin.json'), count: 2,
      });
      writeManifest(['planner']);
      const later = new Date(Date.now() + 5000);
      utimesSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), later, later);
      expect([...gate.loadRegisteredAgents(pluginRoot)]).toEqual(['planner']);
      expect(gate.getRegistrySource().count).toBe(1);
    } finally {
      delete process.env.CAGENTS_DISPATCH_IMPORT;
    }
  });
});

// HS-9 (E16) regression: scripts/ci/validate-agents.sh must DERIVE the
// expected registered-hook count instead of comparing against a hardcoded
// literal. The old `-ne 24` constant drifted when spawn-footprint (v12.63.0)
// and role-manifest-injector (v12.64.0) were added, and every CI run then
// printed a false "found 26 registered hooks, expected 24" warning.
//
// The derived checks: (1) settings.json registrations must match the
// "N unique registered hooks" claim in settings.json's own $comment, and
// (2) .claude/hooks.json must register the same hook names as settings.json.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const SCRIPT = join(ROOT, 'scripts', 'ci', 'validate-agents.sh');
const src = readFileSync(SCRIPT, 'utf8');

// A top-level function body, from its header to the first column-0 `}`.
function functionBody(name) {
  const start = src.indexOf(`${name}() {`);
  expect(start, `${name}() not found`).toBeGreaterThan(-1);
  const end = src.indexOf('\n}\n', start);
  return src.slice(start, end + 2);
}
const validateHooksBody = () => functionBody('validate_hooks');

// Run validate_hooks() alone against a fixture PROJECT_ROOT, with stub loggers.
function runValidateHooks(projectRoot) {
  const harness = [
    'GREEN=""; NC=""; BLUE=""; COUNT_ONLY=false',
    `PROJECT_ROOT='${projectRoot}'`,
    'log_warn() { echo "WARN $*"; }',
    'log_fail() { echo "FAIL $*"; }',
    validateHooksBody(),
    'validate_hooks',
  ].join('\n');
  const r = spawnSync('bash', ['-c', harness], { encoding: 'utf8', timeout: 60000 });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout;
}

// Run validate_domain_overrides() alone against a fixture PROJECT_ROOT, with
// the globals it reads and stub loggers (AGENT_INDEX left empty).
function runValidateDomainOverrides(projectRoot) {
  const harness = [
    'GREEN=""; NC=""; BLUE=""; COUNT_ONLY=false',
    `PROJECT_ROOT='${projectRoot}'`,
    'AGENTS_DIR="agents"',
    'LEGACY_DOMAINS=(people shared leadership core)',
    'declare -A AGENT_INDEX',
    'log_warn() { echo "WARN $*"; }',
    'log_fail() { echo "FAIL $*"; }',
    functionBody('validate_domain_overrides'),
    'validate_domain_overrides',
  ].join('\n');
  const r = spawnSync('bash', ['-c', harness], { encoding: 'utf8', timeout: 60000 });
  expect(r.status, r.stderr).toBe(0);
  return r.stdout;
}

const cmd = (name) => ({ type: 'command', command: `node "$ROOT/.claude/hooks/run-hook.cjs" ${name}` });
function registration(names) {
  return { PreToolUse: [{ matcher: '*', hooks: names.map(cmd) }] };
}

describe('validate-agents.sh hook count is derived (HS-9)', () => {
  it('has no hardcoded hook-count literal at the hook-count check', () => {
    const body = validateHooksBody();
    expect(body).not.toMatch(/hook_count\s+-ne\s+\d+/);
    expect(body).not.toMatch(/expected\s+\d+/);
    expect(body).toMatch(/unique registered hooks/);
  });

  it('passes the hook-count check against the real repo registration', () => {
    const out = runValidateHooks(ROOT);
    expect(out).not.toMatch(/Hook count mismatch/);
    expect(out).not.toMatch(/Hook registration drift/);
    expect(out).toMatch(/matches settings\.json \$comment claim/);
  });

  describe('fixture project roots', () => {
    let root;
    beforeEach(() => {
      root = join(tmpdir(), `cagents-hs9-${process.pid}-${Date.now()}`);
      mkdirSync(join(root, '.claude', 'hooks'), { recursive: true });
      for (const n of ['alpha', 'beta', 'gamma']) writeFileSync(join(root, '.claude', 'hooks', `${n}.cjs`), '');
    });
    afterEach(() => rmSync(root, { recursive: true, force: true }));

    function write(settingsComment, settingsNames, pluginNames) {
      writeFileSync(join(root, '.claude', 'settings.json'),
        JSON.stringify({ $comment: settingsComment, hooks: registration(settingsNames) }));
      if (pluginNames) {
        writeFileSync(join(root, '.claude', 'hooks.json'), JSON.stringify({ hooks: registration(pluginNames) }));
      }
    }

    it('warns when registrations disagree with the $comment claim (and names both numbers)', () => {
      write('cAgents - 3 unique registered hooks', ['alpha', 'beta'], ['alpha', 'beta']);
      const out = runValidateHooks(root);
      expect(out).toMatch(/WARN Hook count mismatch: found 2 registered hooks in settings\.json, its \$comment claims 3/);
    });

    it('is silent when registrations match the claim and hooks.json agrees', () => {
      write('cAgents - 2 unique registered hooks', ['alpha', 'beta'], ['beta', 'alpha']);
      const out = runValidateHooks(root);
      expect(out).not.toMatch(/WARN/);
      expect(out).toMatch(/Hook count 2 matches/);
    });

    it('follows the claim when a hook is added (no constant to update)', () => {
      write('cAgents - 3 unique registered hooks', ['alpha', 'beta', 'gamma'], ['alpha', 'beta', 'gamma']);
      const out = runValidateHooks(root);
      expect(out).not.toMatch(/WARN/);
    });

    it('names the hook when .claude/hooks.json and settings.json register different sets', () => {
      write('cAgents - 2 unique registered hooks', ['alpha', 'beta'], ['alpha', 'beta', 'gamma']);
      const out = runValidateHooks(root);
      expect(out).toMatch(/WARN Hook registration drift between settings\.json and \.claude\/hooks\.json: gamma/);
    });

    it('warns (does not silently pass) when the $comment has no count claim', () => {
      write('no count here', ['alpha'], null);
      const out = runValidateHooks(root);
      expect(out).toMatch(/WARN Hook count unchecked/);
    });

    // LC-SHC-01: drift compares name|event|matcher|timeout tuples, not names.
    it('matcher drift', () => {
      write('cAgents - 2 unique registered hooks', ['alpha', 'beta'], null);
      writeFileSync(join(root, '.claude', 'hooks.json'), JSON.stringify({ hooks: {
        PreToolUse: [{ matcher: '*', hooks: [cmd('beta')] }, { matcher: 'Bash', hooks: [cmd('alpha')] }],
      } }));
      const out = runValidateHooks(root);
      expect(out).toMatch(/WARN Hook registration drift .*: alpha\|/);
      expect(out).not.toMatch(/: .*beta\|/);
    });

    it('key order is not drift', () => {
      const entry = { matcher: 'Write|Edit', hooks: [{ ...cmd('alpha'), timeout: 5 }, cmd('beta')] };
      writeFileSync(join(root, '.claude', 'settings.json'), JSON.stringify({
        $comment: 'cAgents - 2 unique registered hooks', hooks: { PreToolUse: [entry] } }));
      writeFileSync(join(root, '.claude', 'hooks.json'), JSON.stringify({ hooks: { PreToolUse: [{
        hooks: [cmd('beta'), { timeout: 5, command: cmd('alpha').command, type: 'command' }], matcher: 'Write|Edit' }] } }));
      const out = runValidateHooks(root);
      expect(out).not.toMatch(/WARN/);
      expect(out).toMatch(/Hook count 2 matches/);
    });

    // LC-SHC-02: a check that examined nothing must fail, not pass.
    describe('zero registrations', () => {
      it('fails when settings.json registers 0 hooks', () => {
        writeFileSync(join(root, '.claude', 'settings.json'), '{}');
        const out = runValidateHooks(root);
        expect(out).toMatch(/FAIL .*examined 0 registrations in settings\.json/);
      });

      it('fails with the parse error when settings.json is malformed', () => {
        writeFileSync(join(root, '.claude', 'settings.json'), '{ "hooks": ');
        const out = runValidateHooks(root);
        expect(out).toMatch(/FAIL .*settings\.json.*could not be parsed: .*JSON/);
      });

      it('fails when 0 domain_overrides.yaml files exist', () => {
        const out = runValidateDomainOverrides(root);
        expect(out).toMatch(/FAIL .*examined 0 domain_overrides\.yaml files/);
      });

      it('passes with 1 domain_overrides.yaml file', () => {
        mkdirSync(join(root, 'agents', 'people', 'config'), { recursive: true });
        writeFileSync(join(root, 'agents', 'people', 'config', 'domain_overrides.yaml'), 'controller_catalog: {}\n');
        const out = runValidateDomainOverrides(root);
        expect(out).not.toMatch(/FAIL/);
        expect(out).toMatch(/\(1 files checked\)/);
      });
    });
  });
});

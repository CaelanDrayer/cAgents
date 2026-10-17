/**
 * bash-guard-cfg-tamper-quoting.test.js: v12.78.0 WI-01 (ITEM-1a).
 *
 * The guard-config tamper check matches the canonical write target, not the
 * raw text. Quotes, `./`, case, a literal cd, a variable, a glob and a
 * directory destination do not hide .claude/settings*.json, .claude/hooks.json
 * or .claude/hooks/ from the check. Each probe asks in default mode and with
 * CAGENTS_BASH_GUARD=off. Read-only commands that name .claude/ still allow.
 *
 * Each case runs through the registered launcher (run-hook.cjs bash-validator).
 * The commands are only evaluated, never executed. The test writes no file.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..', '..');
const LAUNCHER = join(ROOT, '.claude', 'hooks', 'run-hook.cjs');
const { nonWaivableAskReason } = require(join(ROOT, '.claude', 'hooks', 'bash-guard-evaluator.cjs'));
const NON_WAIVABLE = 'CAGENTS_BASH_GUARD=off does not waive this ask';

function run(command, mode) {
  const env = { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: ROOT, CAGENTS_CI_QUIET: '1' };
  delete env.CAGENTS_BASH_GUARD;
  if (mode !== undefined) env.CAGENTS_BASH_GUARD = mode;
  const r = spawnSync('node', [LAUNCHER, 'bash-validator'], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: ROOT, tool_input: { command } }),
    encoding: 'utf8',
    timeout: 60000,
    env
  });
  expect(r.status, String(r.stderr)).toBe(0);
  const out = JSON.parse(String(r.stdout).trim());
  const h = out.hookSpecificOutput || {};
  return { decision: h.permissionDecision || 'allow', reason: h.permissionDecisionReason || '' };
}

// The 9 probe forms from WI-01 acceptance criterion 1.
const PROBES = [
  'echo x > .cla""ude/settings.local.json',
  "echo x > '.claude'/settings.json",
  'echo x > .claude/./settings.local.json',
  'cd .claude && echo x > settings.local.json',
  'D=.claude; echo x > $D/settings.local.json',
  'echo x | tee .cl?ude/settings.local.json',
  'cp x .claude/',
  'echo x > .CLAUDE/SETTINGS.LOCAL.JSON',
  'echo x > .claude/hook""s/x.cjs',
];

// Read-only commands from WI-01 acceptance criterion 2.
const READS = [
  'git status .claude/',
  'grep -rn foo .claude/hooks',
  'cat .claude/settings.json',
  'ls .claude/hooks',
];

describe('WI-01: guard-config writes ask after canonicalization', () => {
  it.each(PROBES)('default mode asks: %s', (cmd) => {
    const r = run(cmd);
    expect(r.decision).toBe('ask');
    expect(nonWaivableAskReason(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(PROBES)('CAGENTS_BASH_GUARD=off keeps the ask: %s', (cmd) => {
    const r = run(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

describe('WI-01: read-only commands that name .claude/ allow', () => {
  it.each(READS)('default mode allows: %s', (cmd) => {
    expect(run(cmd).decision).toBe('allow');
    expect(nonWaivableAskReason(cmd)).toBeNull();
  });

  it.each(READS)('CAGENTS_BASH_GUARD=off allows: %s', (cmd) => {
    expect(run(cmd, 'off').decision).toBe('allow');
  });
});

// WI-01 r1: `--` ends the cd options. It is not the cd target.
const CD_DASH = [
  'cd -- .claude && cp x settings.json',
  'cd -- .claude && echo x > settings.json',
  'cd -- .claude/hooks && cp x y.cjs',
  'pushd -- .claude && cp x settings.json',
];

describe('WI-01 r1: cd -- and pushd -- keep the ask', () => {
  it.each(CD_DASH)('default mode asks: %s', (cmd) => {
    expect(run(cmd).decision).toBe('ask');
    expect(nonWaivableAskReason(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(CD_DASH)('CAGENTS_BASH_GUARD=off keeps the ask: %s', (cmd) => {
    const r = run(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

//
// WI-01 r2: a cd state that is not tracked exactly by the check gives a soft
// unknown cwd. A later config-shaped relative write then asks. These are the
// review_round2_wi01.yaml repro forms. Real bash lands in .claude for each.
const CWD_UNKNOWN = [
  'cd .claude; cd /tmp; cd -; cp x settings.json',
  'cd .claude; cd /tmp; cd "$OLDPWD"; cp x settings.json',
  'cd .claude; cd /tmp; cd $OLDPWD; cp x settings.json',
  'cd .claude; cd /tmp; cd ~-; cp x settings.json',
  'cd .claude; cd /tmp; cd ~+1; cp x settings.json',
  'pushd .claude; pushd /tmp; pushd; cp x settings.json',
  'pushd .claude; pushd /tmp; pushd +1; cp x settings.json',
  'pushd .claude; pushd /tmp; pushd -1; cp x settings.json',
  'pushd .claude; pushd /tmp; popd +1; cp x settings.json',
  'cd .claude && cd /tmp && cd - >/dev/null && cp x settings.json',
  "eval 'cd .claude' && cp x settings.json",
  "builtin eval \"cd .cla''ude\"; tee settings.json < x",
  ". /dev/stdin <<< 'cd .claude'; cp x settings.json",
  'source <(echo cd .claude); cp x settings.json',
  'CDPATH=.claude cd hooks && cp x y.cjs',
  'export CDPATH=.claude; cd hooks && cp x y.cjs',
  'cd .claude; popd; cp x settings.json',
  'cd .claude/hooks; cd /tmp; cd -; tar xf /tmp/p.tar',
  'cd .claude/hooks; cd /tmp; cd -; cp x ../settings.json',
  'cd .claude/hooks; cd /tmp; cd -; cat > run-hook.cjs',
];

// An unknown cwd does not make an ordinary command ask.
const CWD_UNKNOWN_ALLOWS = [
  'cd - && echo x > notes.txt',
  'source .venv/bin/activate && pytest tests/',
  'eval "$(ssh-agent -s)" && ssh-add key',
  'pushd src && make && popd',
  'a=$(wc -l < log); . ./env.sh; echo $a',
  'source ~/.nvm/nvm.sh && cp src/a.js dist/a.js',
  'source venv/bin/activate && python ../x.py',
];

describe('WI-01 r2: an untracked cd state keeps the ask', () => {
  it.each(CWD_UNKNOWN)('default mode asks: %s', (cmd) => {
    expect(run(cmd).decision).toBe('ask');
    expect(nonWaivableAskReason(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(CWD_UNKNOWN)('CAGENTS_BASH_GUARD=off keeps the ask: %s', (cmd) => {
    const r = run(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });

  it.each(CWD_UNKNOWN_ALLOWS)('the config check allows: %s', (cmd) => {
    expect(nonWaivableAskReason(cmd)).toBeNull();
  });
});

//
// WI-01 r1: the check has a bounded cost. A PreToolUse hook that times out
// (5 s) does not block, so a slow check is a bypass. These are the review
// repro shapes, about 20 KB each.
describe('WI-01 r1: a long cd-heavy command is fast and asks', () => {
  const { evaluate } = require(join(ROOT, '.claude', 'hooks', 'bash-guard-evaluator.cjs'));
  const SHAPES = {
    'cd with 4900 components, then 5000 words': 'cd ' + 'a/'.repeat(4900) + ' && echo ' + 'x '.repeat(5000) +
      '; echo x > .cla""ude/settings.local.json',
    'brace cd base, then 3200 cd steps': 'cd {a,b}{c,d}{e,f}{g,h}{i,j}; ' + 'cd a; '.repeat(3200) +
      'cd ' + ROOT + '/.cla""ude && cp x settings.json',
    'cd into .claude, then 4900 components': 'cd .claude/' + 'a/'.repeat(4900) + ' && cp ' + 'x '.repeat(5000),
  };
  const time = (fn) => { const t = Date.now(); const r = fn(); return { r, ms: Date.now() - t }; };

  it.each(Object.entries(SHAPES))('%s: evaluate asks within the 5 s hook timeout', (_name, cmd) => {
    expect(cmd.length).toBeGreaterThan(15000);
    const { r, ms } = time(() => evaluate(cmd));
    expect(r && r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision).toBe('ask');
    expect(ms).toBeLessThan(4000);
  });

  it.each(Object.entries(SHAPES))('%s: the off-mode check asks within the 5 s hook timeout', (_name, cmd) => {
    const { r, ms } = time(() => nonWaivableAskReason(cmd));
    expect(r).toContain(NON_WAIVABLE);
    expect(ms).toBeLessThan(4000);
  });

  it('the first shape asks through the launcher with CAGENTS_BASH_GUARD=off', () => {
    const r = run(SHAPES['cd with 4900 components, then 5000 words'], 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

// More forms that the canonical match covers. The evaluator export is enough
// here: the launcher path is the same function.
describe('WI-01: more canonical forms keep the ask', () => {
  it.each([
    'bash -c "echo x > .cla\'\'ude/settings.json"',
    "echo x > $'\\x2eclaude'/settings.json",
    'cd .claude/hooks && rm x.cjs',
    'pushd .claude; echo x > hooks.json',
    'F=.claude/hooks; cp a $F/',
    'for f in .claude/hooks/a.cjs; do echo > $f; done',
    'echo x > ~/.claude/settings.json',
    'echo x > .claude/{settings,foo}.json',
    'echo x > .c*/settings.json',
    'echo x > $(echo .claude)/settings.json',
    'echo x > .claude/hooks/../settings.json',
    'git -C .claude/hooks checkout .',
    'find .claude/hooks -delete',
    'ln -s /x .claude/hooks',
    'mv .claude /tmp/x',
    'cd "$(echo .claude)"; cd hooks; cp x y.cjs',
    'cd -L -- .claude && cp x settings.json',
  ])('non-waivable: %s', (cmd) => {
    expect(nonWaivableAskReason(cmd)).toContain(NON_WAIVABLE);
  });

  it.each([
    'L=/tmp/log.txt; npm test > $L 2>&1',
    'echo x > "$TMPDIR/out.txt"',
    'rm -rf $UNKNOWN',
    'T=$(mktemp -d); echo x > $T/out',
    'echo x > out-$(date +%s).log',
    'find .claude/hooks -name "*.cjs"',
    'node --check .claude/hooks/bash-guard-evaluator.cjs',
    'touch .claude/rules/x.md',
    'cd .claude && ls',
    'pushd .claude && popd && echo x > settings.json',
    'echo hi > .claude-notes.txt',
    'cd ' + 'a/'.repeat(70) + ' && cp x settings.json',
  ])('not a config write: %s', (cmd) => {
    expect(nonWaivableAskReason(cmd)).toBeNull();
  });
});

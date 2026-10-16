/**
 * bash-guard-wi21.test.js: WI-21 adversarial round (session
 * team_hook-session-fixes_261015_001, outputs/wave_5b/WI-21/attack_report.md).
 *
 * TP rows: each attack command from the report must ask.
 * FP rows: common benign forms must stay allowed.
 *
 * W21-1 git --output / -o file writes      W21-2 vitest --outputFile
 * W21-3 cd / git -C / env -C before runner  W21-4 unknown words in discard argv
 * W21-5 env prefixes (NODE_OPTIONS, GIT_*)  W21-6 exec-bearing git -c keys
 * W21-7 git $(echo reset) --hard, reset --hard/--keep/--merge
 * W21-9 -t never swallows an option         FP-1 -u/--coverage, FP-2 -qb
 * Plus: bash-validator fails CLOSED when the evaluator module cannot load, and a
 * persisted cwd inside cagents-memory/ with a planted repo marker asks.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, copyFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(__dirname, '..', '..', '.claude', 'hooks');
const { evaluate } = require(join(HOOKS_DIR, 'bash-guard-evaluator.cjs'));
const ROOT = join(__dirname, '..', '..');

function label(r) {
  if (!r) return 'allow';
  if (r.deny) return 'deny';
  return r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision;
}

const ROWS = [
  // W21-1 CRITICAL: git --output writes any file.
  ['W21-1 TP', "git log -1 --format='module.exports={}' --output=" + ROOT + '/.claude/hooks/bash-guard-evaluator.cjs', 'ask'],
  ['W21-1 TP', 'git log -1 --pretty=tformat:%s --output=.claude/hooks/subagent-tracker.cjs', 'ask'],
  ['W21-1 TP', 'git show -s --format=x --output=package.json HEAD', 'ask'],
  ['W21-1 TP', 'git diff HEAD --output=CLAUDE.md', 'ask'],
  ['W21-1 TP', 'git diff --output /abs/CLAUDE.md', 'ask'],
  ['W21-1 TP', 'git log --output CLAUDE.md -1', 'ask'],
  ['W21-1 TP', 'git diff --outp=CLAUDE.md', 'ask'],
  ['W21-1 TP', 'git diff --no-index a b --output=CLAUDE.md', 'ask'],
  ['W21-1 TP', 'git format-patch -o out HEAD~1', 'ask'],
  ['W21-1 TP', 'git format-patch --output-directory out HEAD~1', 'ask'],
  ['W21-1 TP', 'git archive -o x.cjs HEAD', 'ask'],
  ['W21-1 TP', 'git archive --output=x.cjs HEAD', 'ask'],
  ['W21-1 TP', 'git bundle create x.cjs HEAD', 'ask'],
  ['W21-1 TP', 'git log $(echo --output=CLAUDE.md)', 'ask'],
  ['W21-1 TP', 'git $(echo log) --output=CLAUDE.md', 'ask'],
  ['W21-1 FP', 'git diff --stat', 'allow'],
  ['W21-1 FP', 'git log --oneline -5', 'allow'],
  ['W21-1 FP', 'git show --stat HEAD', 'allow'],
  ['W21-1 FP', 'git diff HEAD -- CLAUDE.md', 'allow'],
  ['W21-1 FP', 'git log --format=%H -1', 'allow'],
  // W21-2 HIGH: --outputFile is no longer an allowed runner argument.
  ['W21-2 TP', 'npm test -- --reporter=json --outputFile=' + ROOT + '/.claude/hooks/bash-guard-evaluator.cjs', 'ask'],
  ['W21-2 TP', 'npm test -- --reporter=json --outputFile=' + ROOT + '/CLAUDE.md', 'ask'],
  ['W21-2 TP', 'npm test -- --outputFile=/tmp/x', 'ask'],
  ['W21-2 TP', 'npx vitest run --config tests/vitest.config.js --reporter=json --outputFile=.claude/settings.json', 'ask'],
  ['W21-2 TP', 'npm test -- --outputFile.json=CLAUDE.md', 'ask'],
  ['W21-2 FP', 'npm test -- --reporter=json', 'allow'],
  // W21-3 HIGH: a directory change before a runner or git asks.
  ['W21-3 TP', 'cd cagents-memory/evil && npm test', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil && git status', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil && git diff', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil && git log', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil && git commit -m x', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil; bash scripts/ci/cagents-ci.sh', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil && node scripts/ci/run-advisory.cjs', 'ask'],
  ['W21-3 TP', 'cd cagents-memory/evil && npx vitest run --config tests/vitest.config.js', 'ask'],
  ['W21-3 TP', 'pushd cagents-memory/evil && npm test', 'ask'],
  ['W21-3 TP', 'popd && npm test', 'ask'],
  ['W21-3 TP', 'cd && git status', 'ask'],
  ['W21-3 TP', '(cd cagents-memory/evil && npm test)', 'ask'],
  ['W21-3 TP', "bash -c 'cd cagents-memory/evil && npm test'", 'ask'],
  ['W21-3 TP', 'cd x && cd . && npm test', 'ask'],
  ['W21-3 TP', 'cd $D && npm test', 'ask'],
  ['W21-3 TP', 'git -C cagents-memory/evil status', 'ask'],
  ['W21-3 TP', 'git --git-dir=cagents-memory/g status', 'ask'],
  ['W21-3 TP', 'git --work-tree=/ status', 'ask'],
  ['W21-3 TP', 'git --exec-path=cagents-memory diff', 'ask'],
  ['W21-3 TP', 'env -C cagents-memory/evil npm test', 'ask'],
  ['W21-3 TP', 'env --chdir=cagents-memory/evil git status', 'ask'],
  ['W21-3 FP', 'cd ' + ROOT + ' && npx vitest run --config tests/vitest.config.js tests/config', 'allow'],
  ['W21-3 FP', 'cd ' + ROOT + '/ && npm test', 'allow'],
  ['W21-3 FP', 'cd "$CLAUDE_PROJECT_DIR" && git status', 'allow'],
  ['W21-3 FP', 'cd cagents-memory/sessions && ls -la', 'allow'],
  ['W21-3 FP', 'cd . && npm test', 'allow'],
  ['W21-3 FP', 'git -C . status', 'allow'],
  ['W21-3 FP', 'git -C "$(pwd)" rev-parse --show-toplevel', 'allow'],
  ['W21-3 FP', 'git -C ' + ROOT + ' status', 'allow'],
  ["W21-3 FP", "ssh host 'cd r && git status'", 'allow'],
  // W21-4 MEDIUM: an unknown word in a discard subcommand asks.
  ['W21-4 TP', 'git checkout -b x $(echo -f)', 'ask'],
  ['W21-4 TP', 'git checkout -b x "$(echo -f)"', 'ask'],
  ['W21-4 TP', 'git checkout -b x $Y', 'ask'],
  ['W21-4 TP', 'git checkout $X', 'ask'],
  ['W21-4 TP', 'git branch --list $(echo -D) x', 'ask'],
  ['W21-4 TP', 'git switch $(echo -f) main', 'ask'],
  ['W21-4 TP', 'git restore --staged $F', 'ask'],
  ['W21-4 TP', 'git clean $(echo -f)', 'ask'],
  ['W21-4 TP', 'git worktree remove $F wt', 'ask'],
  ['W21-4 TP', 'W=remove; git worktree $W --force wt', 'ask'],
  ['W21-4 TP', 'git reset $(echo --hard)', 'ask'],
  ['W21-4 FP', 'git checkout -b "$NAME"', 'allow'],
  ['W21-4 FP', 'git checkout -b feat/x origin/main', 'allow'],
  ['W21-4 FP', 'git stash push -m "wip $(date +%s)"', 'allow'],
  ['W21-4 FP', 'git stash push -m "wip msg"', 'allow'],
  // W21-5: env prefixes in front of a runner or git.
  ['W21-5 TP', 'NODE_OPTIONS=--require=./cagents-memory/x.cjs npm test', 'ask'],
  ['W21-5 TP', 'npm_config_script_shell=cagents-memory/sh.sh npm test', 'ask'],
  ['W21-5 TP', 'NPM_CONFIG_SCRIPT_SHELL=cagents-memory/sh.sh npm test', 'ask'],
  ['W21-5 TP', 'VITEST_RESOLVE=x npm test', 'ask'],
  ['W21-5 TP', 'NODE_OPTIONS=--require=./cagents-memory/x.cjs npx vitest run --config tests/vitest.config.js', 'ask'],
  ['W21-5 TP', 'GIT_EXTERNAL_DIFF=cagents-memory/x.sh git diff', 'ask'],
  ['W21-5 TP', 'GIT_PAGER=cagents-memory/x.sh git log', 'ask'],
  ['W21-5 TP', 'GIT_DIR=cagents-memory/g git log', 'ask'],
  ['W21-5 TP', 'GIT_CONFIG_GLOBAL=cagents-memory/gc git diff', 'ask'],
  ['W21-5 TP', 'GIT_EXEC_PATH=cagents-memory git diff', 'ask'],
  ['W21-5 TP', 'HOME=cagents-memory/h git log', 'ask'],
  ['W21-5 TP', 'env NODE_OPTIONS=--require=x npm test', 'ask'],
  ['W21-5 TP', 'export NODE_OPTIONS=--require=x; npm test', 'ask'],
  ['W21-5 TP', 'PATH=cagents-memory/bin:$PATH npm test', 'ask'],
  ['W21-5 FP', 'FOO=1 npm test', 'allow'],
  ['W21-5 FP', 'CI=1 npx vitest run --config tests/vitest.config.js', 'allow'],
  // W21-6: exec-bearing git -c keys.
  ['W21-6 TP', 'git -c core.hooksPath=cagents-memory/h commit -m x', 'ask'],
  ['W21-6 TP', 'git -c core.fsmonitor=cagents-memory/x.sh status', 'ask'],
  ['W21-6 TP', 'git -c core.pager=cagents-memory/x.sh log', 'ask'],
  ['W21-6 TP', 'git -c diff.external=cagents-memory/x.sh diff', 'ask'],
  ['W21-6 FP', 'git -c color.ui=false log --oneline -3', 'allow'],
  // W21-7: dynamic reset subcommand and reset discard modes.
  ['W21-7 TP', 'git $(echo reset) --hard', 'ask'],
  ['W21-7 TP', 'git reset --hard', 'ask'],
  ['W21-7 TP', 'git reset --keep HEAD~1', 'ask'],
  ['W21-7 TP', 'git reset --merge', 'ask'],
  ['W21-7 FP', 'git reset HEAD~1', 'allow'],
  ['W21-7 FP', 'git reset -- file.js', 'allow'],
  // W21-9: -t / --testNamePattern never take an option as their value.
  ['W21-9 TP', 'npm test -- -t --reporter=./cagents-memory/r.mjs', 'ask'],
  ['W21-9 TP', 'npm test -- --testNamePattern --reporter=./cagents-memory/r.mjs', 'ask'],
  ['W21-9 TP', 'npm test -- -t', 'ask'],
  ['W21-9 FP', 'npm test -- -t name', 'allow'],
  ['W21-9 FP', 'npm test -- -t "name with spaces"', 'allow'],
  // FP-1 / FP-2.
  ['FP-1', 'npm test -- -u', 'allow'],
  ['FP-1', 'npm test -- --update', 'allow'],
  ['FP-1', 'npm test -- --coverage', 'allow'],
  ['FP-1', 'npx vitest run --config tests/vitest.config.js tests/hooks --coverage', 'allow'],
  ['FP-2', 'git checkout -qb x origin/main', 'allow'],
  ['FP-2', 'git checkout -qb x', 'allow'],
  ['FP-2 TP', 'git checkout -qf main', 'ask'],
  // Round 2 MF-2: an unquoted -b/-B/--orphan/-qb value word-splits into -f.
  ['MF-2 TP', 'git checkout -b $(echo w1 -f)', 'ask'],
  ['MF-2 TP', 'git checkout -q -b $(echo w1 -f)', 'ask'],
  ['MF-2 TP', 'git checkout -b $X', 'ask'],
  ['MF-2 TP', 'git checkout -b ${X}', 'ask'],
  ['MF-2 TP', 'git checkout -b `echo y -f`', 'ask'],
  ['MF-2 TP', 'git checkout -qb $(echo w1 -f)', 'ask'],
  ['MF-2 TP', 'git checkout -B $(echo w1 -f)', 'ask'],
  ['MF-2 TP', 'git checkout --orphan $(echo w1 -f)', 'ask'],
  ['MF-2 TP', 'X="w2 -f"; git checkout -b $X', 'ask'],
  ['MF-2 TP', 'git stash push -m $MSG', 'ask'],
  ['MF-2 FP', 'git checkout -b "$NAME"', 'allow'],
  ['MF-2 FP', 'git checkout -b "${NAME}"', 'allow'],
  ['MF-2 FP', 'git checkout -b "$(git rev-parse --abbrev-ref HEAD)-x"', 'allow'],
  ['MF-2 FP', 'git checkout -qb "$NAME" origin/main', 'allow'],
  ['MF-2 FP', 'git checkout -b feat', 'allow'],
  ['MF-2 FP', 'git stash push -m "$MSG"', 'allow'],
  // Round 2 M-1: default/alternate expansions and reassigned names in a cd target.
  ['M-1 TP', 'cd ${CLAUDE_PROJECT_DIR:-cagents-memory/evil} && npm test', 'ask'],
  ['M-1 TP', 'cd ${CLAUDE_PROJECT_DIR:=cagents-memory/evil} && git status', 'ask'],
  ['M-1 TP', 'cd "${CLAUDE_PROJECT_DIR:+cagents-memory/evil}" && npm test', 'ask'],
  ['M-1 TP', 'CLAUDE_PROJECT_DIR=cagents-memory/evil; cd $CLAUDE_PROJECT_DIR && npm test', 'ask'],
  ['M-1 TP', 'export CLAUDE_PROJECT_DIR=cagents-memory/evil && cd "$CLAUDE_PROJECT_DIR" && git status', 'ask'],
  ['M-1 TP', 'PWD=cagents-memory/evil; cd $PWD && npm test', 'ask'],
  ['M-1 TP', 'read PWD <<< cagents-memory/evil; cd $PWD && npm test', 'ask'],
  ['M-1 TP', 'cd ${PWD:-cagents-memory/evil} && npm test', 'ask'],
  ['M-1 TP', 'eval "cd cagents-memory/evil" && npm test', 'ask'],
  ['M-1 FP', 'cd "$CLAUDE_PROJECT_DIR" && npm test', 'allow'],
  ['M-1 FP', 'cd "${CLAUDE_PROJECT_DIR}" && git status', 'allow'],
  ['M-1 FP', 'cd $PWD && npm test', 'allow'],
  ['M-1 FP', 'cd ' + ROOT + ' && npm test', 'allow'],
  ['M-1 FP', 'eval "echo hi" && npm test', 'allow'],
  // Round 2 M-2: value-less exports and indirect setters before a runner or git.
  ['M-2 TP', 'read NODE_OPTIONS <<< --require=./cagents-memory/x.cjs; export NODE_OPTIONS; npm test', 'ask'],
  ['M-2 TP', 'printf -v NODE_OPTIONS %s --require=./x.cjs; export NODE_OPTIONS; npm test', 'ask'],
  ['M-2 TP', 'NODE_OPTIONS+=--require=./x.cjs npm test', 'ask'],
  ['M-2 TP', 'env -u PATH NODE_OPTIONS=x npm test', 'ask'],
  ['M-2 TP', 'env -S "NODE_OPTIONS=x" npm test', 'ask'],
  ['M-2 TP', 'source cagents-memory/env.sh; npm test', 'ask'],
  ['M-2 TP', '. cagents-memory/env.sh && git status', 'ask'],
  ['M-2 TP', 'declare -x NODE_OPTIONS; npm test', 'ask'],
  ['M-2 TP', 'typeset NODE_OPTIONS=x; npm test', 'ask'],
  ['M-2 TP', 'export GIT_PAGER; git log', 'ask'],
  ['M-2 TP', 'export EDITOR=./cagents-memory/e.sh; git commit', 'ask'],
  ['M-2 TP', 'VISUAL=./cagents-memory/e.sh git commit', 'ask'],
  ['M-2 TP', 'eval NODE_OPTIONS=x\\; npm test', 'ask'],
  ['M-2 FP', 'FOO=1 npm test', 'allow'],
  ['M-2 FP', 'export FOO=1; npm test', 'allow'],
  ['M-2 FP', 'read -r line < f; npm test', 'allow'],
  ['M-2 FP', 'source ~/.bashrc; ls', 'allow'],
  // Round 2 L-1: xargs / parallel feeding stdin words to git or a runner.
  ['L-1 TP', 'echo --reporter=./cagents-memory/r.mjs | xargs npm test --', 'ask'],
  ['L-1 TP', 'cat cagents-memory/args | xargs -I{} git log {}', 'ask'],
  ['L-1 TP', 'echo --output=CLAUDE.md | xargs git log', 'ask'],
  ['L-1 TP', 'cat f | xargs -0 -n1 npx vitest run', 'ask'],
  ['L-1 FP', 'echo main | xargs git push origin', 'allow'],
  ['L-1 TP', 'ls | xargs -r timeout 5 git status', 'ask'],
  ['L-1 FP', 'ls | xargs wc -l', 'allow'],
  ['L-1 FP', 'git ls-files | xargs grep foo', 'allow'],
  // Round 2: glued -c<key>, a computed -c value, and more exec-bearing keys.
  ['W21-6 TP', 'git -ccore.fsmonitor=x status', 'ask'],
  ['W21-6 TP', 'git -c $K status', 'ask'],
  ['W21-6 TP', 'git -c init.templateDir=x status', 'ask'],
  ['W21-6 TP', 'git -c trailer.x.cmd=y commit -m x', 'ask'],
  ['W21-6 TP', 'git -c core.alternateRefsCommand=x log', 'ask'],
  ['W21-6 FP', 'git -c color.ui=false log', 'allow'],
  ['FP', 'git status', 'allow'],
];

describe('WI-21 adversarial fixes (evaluator)', () => {
  it.each(ROWS)('%s: %j -> %s', (_id, command, expected) => {
    expect(label(evaluate(command)), `verdict for: ${command}`).toBe(expected);
  });
});

function runHook(hookPath, payload, env = {}) {
  const out = execFileSync('node', [hookPath], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
    env: { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1', ...env }
  });
  const r = JSON.parse(out.trim());
  if (r && r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision) return r.hookSpecificOutput.permissionDecision;
  return r && r.continue ? 'allow' : 'unknown';
}

describe('WI-21 W21-2: bash-validator fails closed when the evaluator cannot load', () => {
  let dir;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'wi21-hk-'));
    for (const f of readdirSync(HOOKS_DIR)) if (f.endsWith('.cjs')) copyFileSync(join(HOOKS_DIR, f), join(dir, f));
    // A vitest JSON report written over the evaluator (the W21-2 kill chain).
    writeFileSync(join(dir, 'bash-guard-evaluator.cjs'), '{"numTotalTests":1,"success":true}');
  });
  afterAll(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} });

  it('denies every command, a benign one included', () => {
    expect(runHook(join(dir, 'bash-validator.cjs'), { tool_input: { command: 'ls' } })).toBe('deny');
    expect(runHook(join(dir, 'bash-validator.cjs'), { tool_input: { command: "npm test -- --reporter=./cagents-memory/r.mjs" } })).toBe('deny');
  });

  it('names the evaluator file and line in the deny reason', () => {
    const d2 = mkdtempSync(join(tmpdir(), 'wi21-hk2-'));
    try {
      for (const f of readdirSync(HOOKS_DIR)) if (f.endsWith('.cjs')) copyFileSync(join(HOOKS_DIR, f), join(d2, f));
      writeFileSync(join(d2, 'bash-guard-evaluator.cjs'), 'const x = ;\n');
      const out = execFileSync('node', [join(d2, 'bash-validator.cjs')], {
        input: JSON.stringify({ tool_input: { command: 'ls' } }), encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'],
        env: { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1' }
      });
      const reason = JSON.parse(out.trim()).hookSpecificOutput.permissionDecisionReason;
      expect(reason).toMatch(/bash-guard-evaluator\.cjs:1/);
      expect(reason).toMatch(/Edit/);
    } finally { try { rmSync(d2, { recursive: true, force: true }); } catch {} }
  });

  it('the intact hook still allows the benign command', () => {
    expect(runHook(join(HOOKS_DIR, 'bash-validator.cjs'), { tool_input: { command: 'ls' } })).toBe('allow');
  });
});

describe('WI-21 W21-3: persisted cwd inside cagents-memory/ with a planted repo', () => {
  let root;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'wi21-root-'));
    mkdirSync(join(root, 'cagents-memory', 'evil', '.git'), { recursive: true });
    writeFileSync(join(root, 'cagents-memory', 'evil', 'package.json'), '{"scripts":{"test":"true"}}');
    mkdirSync(join(root, 'cagents-memory', 'sessions', 's1'), { recursive: true });
  });
  afterAll(() => { try { rmSync(root, { recursive: true, force: true }); } catch {} });
  const hook = () => join(HOOKS_DIR, 'bash-validator.cjs');

  it.each([
    ['npm test', 'ask'],
    ['git status', 'ask'],
    ['bash scripts/ci/cagents-ci.sh', 'ask'],
    ['ls -la', 'allow'],
  ])('planted cwd: %j -> %s', (command, expected) => {
    const cwd = join(root, 'cagents-memory', 'evil');
    expect(runHook(hook(), { cwd, tool_input: { command } }, { CLAUDE_PROJECT_DIR: root })).toBe(expected);
  });

  it.each([
    ['session dir without markers', ['cagents-memory', 'sessions', 's1']],
    ['project root', []],
  ])('%s: git status -> allow', (_n, parts) => {
    const cwd = join(root, ...parts);
    expect(runHook(hook(), { cwd, tool_input: { command: 'git status' } }, { CLAUDE_PROJECT_DIR: root })).toBe('allow');
  });
});

describe('WI-21 round 2 MF-1: bare-format gitdir planted at or above the cwd', () => {
  let root;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'wi21-mf1-'));
    mkdirSync(join(root, '.git'), { recursive: true });
    // Bare-format gitdir: HEAD + config + objects/ + refs/ and no .git.
    const s1 = join(root, 'cagents-memory', 'sessions', 's1');
    mkdirSync(join(s1, 'objects', 'info'), { recursive: true });
    mkdirSync(join(s1, 'refs', 'heads'), { recursive: true });
    writeFileSync(join(s1, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(join(s1, 'config'), '[core]\n\trepositoryformatversion = 0\n\tbare = false\n\tfsmonitor = "touch MARK"\n');
    writeFileSync(join(s1, 'objects', 'info', 'packs'), '');
    mkdirSync(join(s1, 'outputs', 'deep'), { recursive: true });
    // commondir / gitdir files and config + objects/ alone also mark a gitdir.
    const s2 = join(root, 'cagents-memory', 'sessions', 's2');
    mkdirSync(s2, { recursive: true });
    writeFileSync(join(s2, 'commondir'), '../x\n');
    const s3 = join(root, 'cagents-memory', 'sessions', 's3');
    mkdirSync(s3, { recursive: true });
    writeFileSync(join(s3, 'gitdir'), '/x/.git\n');
    const s4 = join(root, 'cagents-memory', 'sessions', 's4');
    mkdirSync(join(s4, 'objects'), { recursive: true });
    writeFileSync(join(s4, 'config'), '[core]\n');
    mkdirSync(join(root, 'cagents-memory', 'sessions', 'clean', 'outputs'), { recursive: true });
    mkdirSync(join(root, 'tests', 'hooks'), { recursive: true });
  });
  afterAll(() => { try { rmSync(root, { recursive: true, force: true }); } catch {} });
  const hook = () => join(HOOKS_DIR, 'bash-validator.cjs');
  const at = (parts, command) => runHook(hook(), { cwd: join(root, ...parts), tool_input: { command } }, { CLAUDE_PROJECT_DIR: root });

  it.each(['git status', 'git diff', 'git add -A', 'git commit -m x', 'npm test'])('HEAD/objects/refs in the cwd: %j -> ask', (command) => {
    expect(at(['cagents-memory', 'sessions', 's1'], command)).toBe('ask');
  });
  it('HEAD/objects/refs in a parent of the cwd: git status -> ask', () => {
    expect(at(['cagents-memory', 'sessions', 's1', 'outputs', 'deep'], 'git status')).toBe('ask');
  });
  it.each([['s2 commondir'], ['s3 gitdir'], ['s4 config + objects']])('%s: git status -> ask', (n) => {
    expect(at(['cagents-memory', 'sessions', n.split(' ')[0]], 'git status')).toBe('ask');
  });
  it('a non-runner command in the planted dir stays allowed', () => {
    expect(at(['cagents-memory', 'sessions', 's1'], 'ls -la')).toBe('allow');
  });
  it.each([
    ['project root (its own .git)', []],
    ['clean session dir', ['cagents-memory', 'sessions', 'clean', 'outputs']],
    ['project subdir', ['tests', 'hooks']],
  ])('%s: git status -> allow', (_n, parts) => {
    expect(at(parts, 'git status')).toBe('allow');
  });
});

// WI-21 round 3 MF-R2-1: a cwd OUTSIDE the project root is not trusted for git
// or a runner, except inside a legit git worktree of this project.
describe('WI-21 round 3 MF-R2-1: persisted cwd outside the project root', () => {
  let root, out, wtOut;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'wi21-r3root-'));
    mkdirSync(join(root, '.git', 'worktrees'), { recursive: true });
    mkdirSync(join(root, 'cagents-memory', 'sessions', 's1'), { recursive: true });
    out = mkdtempSync(join(tmpdir(), 'wi21-r3out-'));
    // Planted package.json, planted scripts/ci, planted bare gitdir, plain dir.
    mkdirSync(join(out, 'pkg'), { recursive: true });
    writeFileSync(join(out, 'pkg', 'package.json'), '{"scripts":{"test":"touch MARK"}}');
    mkdirSync(join(out, 'ci', 'scripts', 'ci'), { recursive: true });
    writeFileSync(join(out, 'ci', 'scripts', 'ci', 'cagents-ci.sh'), 'touch MARK\n');
    writeFileSync(join(out, 'ci', 'scripts', 'ci', 'run-advisory.cjs'), 'require("fs").writeFileSync("MARK","")\n');
    const bare = join(out, 'bare');
    mkdirSync(join(bare, 'objects'), { recursive: true });
    mkdirSync(join(bare, 'refs', 'heads'), { recursive: true });
    writeFileSync(join(bare, 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(join(bare, 'config'), '[core]\n\tfsmonitor = "touch MARK"\n');
    mkdirSync(join(out, 'plain'), { recursive: true });
    // A legit worktree outside the root: .git file -> <root>/.git/worktrees/w1,
    // whose gitdir file points back at <wt>/.git.
    wtOut = join(out, 'wt1');
    mkdirSync(join(wtOut, 'tests', 'hooks'), { recursive: true });
    writeFileSync(join(wtOut, 'package.json'), '{}');
    mkdirSync(join(root, '.git', 'worktrees', 'w1'), { recursive: true });
    writeFileSync(join(wtOut, '.git'), 'gitdir: ' + join(root, '.git', 'worktrees', 'w1') + '\n');
    writeFileSync(join(root, '.git', 'worktrees', 'w1', 'gitdir'), join(wtOut, '.git') + '\n');
    // A forged worktree: .git file points at w1, but w1 points back elsewhere.
    mkdirSync(join(out, 'forged'), { recursive: true });
    writeFileSync(join(out, 'forged', 'package.json'), '{"scripts":{"test":"touch MARK"}}');
    writeFileSync(join(out, 'forged', '.git'), 'gitdir: ' + join(root, '.git', 'worktrees', 'w1') + '\n');
    // A .git file that points outside <root>/.git/worktrees/.
    mkdirSync(join(out, 'foreign', 'gd'), { recursive: true });
    writeFileSync(join(out, 'foreign', '.git'), 'gitdir: ' + join(out, 'foreign', 'gd') + '\n');
    // A legit worktree that holds a planted bare gitdir in a subdir.
    mkdirSync(join(wtOut, 'sub', 'objects'), { recursive: true });
    writeFileSync(join(wtOut, 'sub', 'HEAD'), 'ref: refs/heads/main\n');
    // A legit worktree INSIDE the root (.claude/worktrees/w2): L-R2-4.
    const wtIn = join(root, '.claude', 'worktrees', 'w2');
    mkdirSync(join(wtIn, 'tests'), { recursive: true });
    mkdirSync(join(root, '.git', 'worktrees', 'w2'), { recursive: true });
    writeFileSync(join(wtIn, '.git'), 'gitdir: ' + join(root, '.git', 'worktrees', 'w2') + '\n');
    writeFileSync(join(root, '.git', 'worktrees', 'w2', 'gitdir'), join(wtIn, '.git') + '\n');
    // An inside-root .git file that is NOT a legit worktree.
    mkdirSync(join(root, 'docs', 'fake'), { recursive: true });
    writeFileSync(join(root, 'docs', 'fake', '.git'), 'gitdir: ' + join(out, 'foreign', 'gd') + '\n');
  });
  afterAll(() => {
    for (const d of [root, out]) { try { rmSync(d, { recursive: true, force: true }); } catch {} }
  });
  const hook = () => join(HOOKS_DIR, 'bash-validator.cjs');
  const at = (cwd, command) => runHook(hook(), { cwd, tool_input: { command } }, { CLAUDE_PROJECT_DIR: root });

  const RUNNERS = ['git status', 'git diff', 'git log --oneline', 'npm test', 'npx vitest run --config tests/vitest.config.js',
    'bash scripts/ci/cagents-ci.sh', 'node scripts/ci/run-advisory.cjs'];
  it.each(RUNNERS)('planted package.json outside the root: %j -> ask', (c) => { expect(at(join(out, 'pkg'), c)).toBe('ask'); });
  it.each(RUNNERS)('planted scripts/ci outside the root: %j -> ask', (c) => { expect(at(join(out, 'ci'), c)).toBe('ask'); });
  it.each(RUNNERS)('planted bare gitdir outside the root: %j -> ask', (c) => { expect(at(join(out, 'bare'), c)).toBe('ask'); });
  it.each(['git status', 'npm test'])('plain dir outside the root (fail closed): %j -> ask', (c) => {
    expect(at(join(out, 'plain'), c)).toBe('ask');
  });
  it.each(['ls -la', 'cat package.json', 'echo hi'])('non-runner outside the root: %j -> allow', (c) => {
    expect(at(join(out, 'pkg'), c)).toBe('allow');
  });
  it('forged worktree (.git file into <root>/.git/worktrees, wrong back-pointer) -> ask', () => {
    expect(at(join(out, 'forged'), 'npm test')).toBe('ask');
    expect(at(join(out, 'forged'), 'git status')).toBe('ask');
  });
  it('.git file pointing outside <root>/.git/worktrees -> ask', () => {
    expect(at(join(out, 'foreign'), 'git status')).toBe('ask');
  });
  it('planted gitdir inside a legit worktree -> ask', () => {
    expect(at(join(wtOut, 'sub'), 'git status')).toBe('ask');
  });
  it.each(['git status', 'git diff', 'npm test', 'npx vitest run --config tests/vitest.config.js', 'git checkout -b "$NAME"'])(
    'legit worktree outside the root: %j -> allow', (c) => {
      expect(at(wtOut, c)).toBe('allow');
      expect(at(join(wtOut, 'tests', 'hooks'), c)).toBe('allow');
    });
  it.each(['git status', 'npm test', 'git log --oneline'])('legit worktree inside the root (.claude/worktrees): %j -> allow', (c) => {
    expect(at(join(root, '.claude', 'worktrees', 'w2'), c)).toBe('allow');
    expect(at(join(root, '.claude', 'worktrees', 'w2', 'tests'), c)).toBe('allow');
  });
  it('inside-root .git file that is not a legit worktree -> ask', () => {
    expect(at(join(root, 'docs', 'fake'), 'git status')).toBe('ask');
  });
  it.each(['git status', 'npm test', 'git checkout -b "$NAME"'])('project root and session dir: %j -> allow', (c) => {
    expect(at(root, c)).toBe('allow');
    expect(at(join(root, 'cagents-memory', 'sessions', 's1'), c)).toBe('allow');
  });
});

// WI-21 round 3 MF-R2-2: "$@" / "${A[@]}" expand to many words inside quotes.
describe('WI-21 round 3 MF-R2-2: quoted multi-word expansions are not one word', () => {
  it.each([
    ['A=(w1 -f); git checkout -b "${A[@]}"', 'ask'],
    ['A=(w1 -f) && git checkout -q -B "${A[@]}"', 'ask'],
    ['set -- w2 -f; git checkout -b "$@"', 'ask'],
    ['git checkout --orphan "${A[@]}"', 'ask'],
    ['git checkout -b "${@:1}"', 'ask'],
    ['git checkout -b "${A[@]:0:2}"', 'ask'],
    ['git checkout -b "${!P@}"', 'ask'],
    ['A=(-- .); git stash push -m "${A[@]}"', 'ask'],
    ['LESS=+!id git log', 'ask'],
    ['MANPAGER=x git log', 'ask'],
    ['git checkout -b "$NAME"', 'allow'],
    ['git checkout -b "$*"', 'allow'],
    ['git checkout -b "${A[*]}"', 'allow'],
    ['git checkout -b "${A[0]}"', 'allow'],
    ['git stash push -m "a msg"', 'allow'],
  ])('%j -> %s', (command, expected) => {
    expect(label(evaluate(command)), `verdict for: ${command}`).toBe(expected);
  });
});

// WI-21 round 4 MF-R3-1: indirection and backslash-newline inside the quotes.
describe('WI-21 round 4 MF-R3-1: ${!X} and backslash-newline are not one word', () => {
  it.each([
    ["A=(w1 -f); X='A[@]'; git checkout -q -b \"${!X}\"", 'ask'],
    ['set -- w4 -f; Y=@; git checkout -q -b "${!Y}"', 'ask'],
    ['set -- w2 -f; git checkout -q -b "$\\\n@"', 'ask'],
    ['A=(w3 -f); git checkout -q -b "${A[\\\n@]}"', 'ask'],
    ['A=(w3 -f); git checkout -q -b "${A[@\\\n]}"', 'ask'],
    ['set -- w5 -f; git checkout -q -b "${\\\n@}"', 'ask'],
    ["X='A[@]'; git checkout -b \"${!X:-}\"", 'ask'],
    ["X='A[@]'; git checkout -b \"${!X:0:2}\"", 'ask'],
    ["X='A[@]'; git checkout -b \"${!X#x}\"", 'ask'],
    ['git checkout -b "${A[ @ ]}"', 'ask'],
    ["X='A[@]'; git stash push -m \"${!X}\"", 'ask'],
    ['git checkout -b "$NAME"', 'allow'],
    ['git checkout -b "${NAME}"', 'allow'],
    ['git checkout -b "$*"', 'allow'],
    ['git checkout -b "${A[*]}"', 'allow'],
    ['git checkout -b "feat-$NAME"', 'allow'],
    ['git stash push -m "a msg"', 'allow'],
  ])('%j -> %s', (command, expected) => {
    expect(label(evaluate(command)), `verdict for: ${JSON.stringify(command)}`).toBe(expected);
  });
});

// WI-21 round 4 MF-R3-2: Write(cagents-memory/**) followed the cwd, so a
// cagents-memory component ANYWHERE below the root is a plant zone.
describe('WI-21 round 4 MF-R3-2: nested cagents-memory dirs are a plant zone', () => {
  let root;
  const plant = (dir) => {
    mkdirSync(join(dir, 'scripts', 'ci'), { recursive: true });
    mkdirSync(join(dir, 'tests'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{"scripts":{"test":"touch MARK"}}');
    writeFileSync(join(dir, 'scripts', 'ci', 'cagents-ci.sh'), 'touch MARK\n');
    writeFileSync(join(dir, 'scripts', 'ci', 'run-advisory.cjs'), 'require("fs").writeFileSync("MARK","")\n');
    writeFileSync(join(dir, 'tests', 'vitest.config.js'), 'export default {}\n');
  };
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'wi21-r4root-'));
    mkdirSync(join(root, '.git', 'worktrees'), { recursive: true });
    mkdirSync(join(root, 'cagents-memory', 'sessions', 's1'), { recursive: true });
    mkdirSync(join(root, 'tests', 'hooks'), { recursive: true });
    // Plant under <root>/docs/cagents-memory/x (cwd-relative Write from docs/).
    plant(join(root, 'docs', 'cagents-memory', 'x'));
    // A file-only plant: package.json directly in the nested cagents-memory dir.
    mkdirSync(join(root, 'docs', 'cagents-memory', 'y'), { recursive: true });
    writeFileSync(join(root, 'docs', 'cagents-memory', 'y', 'package.json'), '{}');
    // A legit worktree inside the root, with a plant under its cagents-memory.
    const wt = join(root, '.claude', 'worktrees', 'wi');
    mkdirSync(join(root, '.git', 'worktrees', 'wi'), { recursive: true });
    mkdirSync(wt, { recursive: true });
    writeFileSync(join(wt, '.git'), 'gitdir: ' + join(root, '.git', 'worktrees', 'wi') + '\n');
    writeFileSync(join(root, '.git', 'worktrees', 'wi', 'gitdir'), join(wt, '.git') + '\n');
    plant(join(wt, 'cagents-memory', 'sessions', 's', 'evil'));
    mkdirSync(join(wt, 'cagents-memory', 'sessions', 'clean'), { recursive: true });
  });
  afterAll(() => { try { rmSync(root, { recursive: true, force: true }); } catch {} });
  const hook = () => join(HOOKS_DIR, 'bash-validator.cjs');
  const at = (parts, command) => runHook(hook(), { cwd: join(root, ...parts), tool_input: { command } }, { CLAUDE_PROJECT_DIR: root });

  const RUNNERS = ['npm test', 'bash scripts/ci/cagents-ci.sh', 'node scripts/ci/run-advisory.cjs',
    'npx vitest run --config tests/vitest.config.js', 'git status'];
  it.each(RUNNERS)('cwd <root>/docs/cagents-memory/x with planted runner files: %j -> ask', (c) => {
    expect(at(['docs', 'cagents-memory', 'x'], c)).toBe('ask');
  });
  it.each(RUNNERS)('cwd <root>/docs/cagents-memory/x/scripts/ci: %j -> ask', (c) => {
    expect(at(['docs', 'cagents-memory', 'x', 'scripts', 'ci'], c)).toBe('ask');
  });
  it('cwd <root>/docs/cagents-memory/y with a planted package.json: npm test -> ask', () => {
    expect(at(['docs', 'cagents-memory', 'y'], 'npm test')).toBe('ask');
  });
  it.each(RUNNERS)('cwd <worktree>/cagents-memory/sessions/s/evil: %j -> ask', (c) => {
    expect(at(['.claude', 'worktrees', 'wi', 'cagents-memory', 'sessions', 's', 'evil'], c)).toBe('ask');
  });
  it('non-runner in a nested plant zone stays allowed', () => {
    expect(at(['docs', 'cagents-memory', 'x'], 'ls -la')).toBe('allow');
  });
  it.each(['git status', 'npm test', 'git checkout -b "$NAME"'])('benign cwds without plants: %j -> allow', (c) => {
    expect(at([], c)).toBe('allow');
    expect(at(['cagents-memory', 'sessions', 's1'], c)).toBe('allow');
    expect(at(['tests', 'hooks'], c)).toBe('allow');
    expect(at(['.claude', 'worktrees', 'wi'], c)).toBe('allow');
    expect(at(['.claude', 'worktrees', 'wi', 'cagents-memory', 'sessions', 'clean'], c)).toBe('allow');
  });
});

// WI-21 round 5 MF-R4-1: a word that mixes literal text with an expansion was
// read as its literal part only (t.canon), so "x$@", x"${A[@]}", w$X and H$X
// injected -f / --output=<file>. wordHasExpansion() now marks such a word as
// unknown in every git rule and in the runner allowlist.
describe('WI-21 round 5 MF-R4-1: mixed literal+expansion words are unknown', () => {
  it.each([
    // The reviewer's 9 rows (security_review_r4.md MF-R4-1).
    ['set -- w -f; git checkout -b "x$@"', 'ask'],
    ['A=(w -f); git checkout -b "x${A[@]}"', 'ask'],
    ['A=(w -f); git checkout -b x"${A[@]}"', 'ask'],
    ["A=(w -f); X='A[@]'; git checkout -b \"x${!X}\"", 'ask'],
    ['X=" -f"; git checkout -b w$X', 'ask'],
    ['X="w -f"; git checkout -b x$X', 'ask'],
    ['A=(EAD --output=/tmp/v.txt); git diff "H${A[@]}"', 'ask'],
    ['A=(EAD --output=/tmp/v.txt); git log -1 "H${A[@]}"', 'ask'],
    ['X="EAD --output=/tmp/v.txt"; git diff H$X', 'ask'],
    // Other expansion kinds inside a mixed word.
    ['git checkout -b x$((1))', 'ask'],
    ['git checkout -b x`echo y`', 'ask'],
    ['git diff H$(echo EAD)', 'ask'],
    ['git diff "H${X}"', 'ask'],
    ['git diff x"$X"', 'ask'],
    // Brace expansion, leading globs and tilde also make several or unknown words.
    ['git checkout -b {w,-f}', 'ask'],
    ['git diff {HEAD,--output=x}', 'ask'],
    ['git diff *', 'ask'],
    ['git checkout -b x -[f]', 'ask'],
    ['OLDPWD=-f; git checkout -b x ~-', 'ask'],
    // Global options and the runner allowlist.
    ['git -$X alias.status=x status', 'ask'],
    ['git --git-dir$X status', 'ask'],
    ['npm test -- {--config,evil.js}', 'ask'],
    ['npm test -- x$X', 'ask'],
    ['npm test -- --config tests/vitest.config.js$X', 'ask'],
    ['npx vitest run --config tests/vitest.config.js "x$@"', 'ask'],
    ['bash scripts/ci/cagents-ci.sh$X', 'ask'],
    // Allow rows that must stay allowed.
    ['git checkout -b "$NAME"', 'allow'],
    ['git checkout -b "feat-$NAME"', 'allow'],
    ['git checkout -qb "$NAME"', 'allow'],
    ['git checkout -b feat', 'allow'],
    ['git checkout main', 'allow'],
    ['git stash push -m "$MSG"', 'allow'],
    ['git stash push -m "wip $X"', 'allow'],
    ['git log --oneline', 'allow'],
    ['git log -1 HEAD@{1}', 'allow'],
    ['git diff', 'allow'],
    ['git diff HEAD', 'allow'],
    ['git diff HEAD~1', 'allow'],
    ['npm test -- tests/x.test.js', 'allow'],
    ['npm test -- tests/hooks/*.test.js', 'allow'],
  ])('%j -> %s', (command, expected) => {
    expect(label(evaluate(command)), `verdict for: ${JSON.stringify(command)}`).toBe(expected);
  });
});

// WI-21 round 5 sweep: for each git discard and output rule, a word that mixes
// literal text with a variable must ask. Each row would be a discard or a file
// write if X expanded to the option shown.
describe('WI-21 round 5 sweep: every git discard/output rule asks on a mixed word', () => {
  it.each([
    ['checkout', 'X=" -f"; git checkout w$X'],
    ['checkout --', 'X=" -- ."; git checkout HEAD$X'],
    ['restore', 'X=" ."; git restore w$X'],
    ['switch', 'X=" --discard-changes"; git switch w$X'],
    ['stash', 'X="rop"; git stash d$X'],
    ['stash -m value', 'A=(m -- .); git stash push -m x"${A[@]}"'],
    ['branch', 'X=" -D"; git branch w$X'],
    ['worktree', 'X=" --force w"; git worktree remove w$X'],
    ['clean', 'X="f"; git clean -$X'],
    ['clean mixed', 'X=" -f"; git clean -n$X'],
    ['reset', 'X="ard"; git reset --h$X'],
    ['push', 'X=" -f"; git push origin main$X'],
    ['push refspec', 'X="+main"; git push origin "$X"'],
    ['log --output', 'X="EAD --output=x"; git log H$X'],
    ['show --output', 'X="EAD --output=x"; git show H$X'],
    ['diff --output', 'X="EAD --output=x"; git diff H$X'],
    ['whatchanged --output', 'X="EAD --output=x"; git whatchanged H$X'],
    ['range-diff --output', 'X="EAD --output=x"; git range-diff H$X'],
    ['format-patch -o', 'X=" -o /tmp/x"; git format-patch HEAD$X'],
    ['archive -o', 'X=" -o /tmp/x"; git archive HEAD$X'],
    ['diff-tree --output', 'X="EAD --output=x"; git diff-tree H$X'],
    ['shortlog --output', 'X="EAD --output=x"; git shortlog H$X'],
    ['update-ref', 'X="d"; git update-ref -$X refs/heads/x'],
    ['reflog', 'X="xpire"; git reflog e$X'],
    ['gc', 'X="=now"; git gc --prune$X'],
    ['hidden subcommand + discard', 'X="eckout"; git ch$X -f'],
  ])('%s: %j -> ask', (_rule, command) => {
    expect(label(evaluate(command)), `verdict for: ${JSON.stringify(command)}`).toBe('ask');
  });
});

// WI-21 round 6 MF-R5-1: git parse-options accepts ANY unambiguous prefix of a
// long option (`--f`, `--fo` = --force for checkout). Every prefix of every
// dangerous long option, length 1..full, must ask (security_review_r5.md).
const prefixesOf = (name) => Array.from({ length: name.length }, (_, i) => '--' + name.slice(0, i + 1));
const R6_SWEEP = [
  ['checkout -b force', 'force', (o) => `git checkout -b x ${o}`],
  ['checkout -b force=', 'force', (o) => `git checkout -b x ${o}=`],
  ['checkout force', 'force', (o) => `git checkout ${o} main`],
  ['checkout pathspec-from-file', 'pathspec-from-file', (o) => `git checkout ${o}=list.txt`],
  ['checkout patch', 'patch', (o) => `git checkout ${o}`],
  ['checkout ours', 'ours', (o) => `git checkout ${o} f`],
  ['checkout theirs', 'theirs', (o) => `git checkout ${o} f`],
  ['checkout merge', 'merge', (o) => `git checkout ${o} f`],
  ['checkout conflict', 'conflict', (o) => `git checkout ${o}=diff3 f`],
  ['switch discard-changes', 'discard-changes', (o) => `git switch ${o} main`],
  ['switch force', 'force', (o) => `git switch ${o} main`],
  ['clean force', 'force', (o) => `git clean -d ${o}`],
  ['worktree remove force', 'force', (o) => `git worktree remove ${o} w`],
  ['branch delete', 'delete', (o) => `git branch ${o} -f x`],
  ['branch force', 'force', (o) => `git branch -d ${o} x`],
  ['reset hard', 'hard', (o) => `git reset ${o}`],
  ['reset keep', 'keep', (o) => `git reset ${o} HEAD~1`],
  ['reset merge', 'merge', (o) => `git reset ${o}`],
  ['push force', 'force', (o) => `git push origin main ${o}`],
  ['push mirror', 'mirror', (o) => `git push ${o} origin`],
  ['push delete', 'delete', (o) => `git push origin ${o} x`],
  ['push prune', 'prune', (o) => `git push ${o} origin`],
  ['log output', 'output', (o) => `git log -1 ${o}=x`],
  ['diff output', 'output', (o) => `git diff ${o}=x`],
  ['format-patch output-directory', 'output-directory', (o) => `git format-patch ${o}=d HEAD~1`],
];
describe('WI-21 round 6 MF-R5-1: every prefix of a dangerous git long option asks', () => {
  const rows = [];
  for (const [rule, name, mk] of R6_SWEEP) for (const o of prefixesOf(name)) rows.push([rule, mk(o)]);
  it.each(rows)('%s: %j -> ask', (_rule, command) => {
    expect(label(evaluate(command)), `verdict for: ${JSON.stringify(command)}`).toBe('ask');
  });
});

describe('WI-21 round 6: MF-R5-1 rows, $\'..\' globs, clean dry-run parsing, CAGENTS_* env', () => {
  it.each([
    // MF-R5-1 reviewer rows.
    ['git checkout -b x --f', 'ask'],
    ['git checkout -b x --fo', 'ask'],
    ['git checkout -b x -q --fo', 'ask'],
    ['git checkout -b x HEAD --f', 'ask'],
    ['git checkout -b x --f --', 'ask'],
    ['git checkout -b x --fo=', 'ask'],
    ['NAME=x; git checkout -b "$NAME" --fo', 'ask'],
    ['git checkout --fo -b x', 'ask'],
    ['git clean --f', 'ask'],
    ['git clean --fo -d', 'ask'],
    ['git switch --di main', 'ask'],
    ['git worktree remove --f w', 'ask'],
    ['git branch --de --fo x', 'ask'],
    ['git checkout --fo main', 'ask'],
    ['git checkout -p', 'ask'],
    ['git checkout -3 f', 'ask'],
    // clean: -e takes a value; --no-dry-run undoes -n (both delete in git 2.47).
    ['git clean -f -n --no-dry-run', 'ask'],
    ['git clean -f -n --no-d', 'ask'],
    ['git clean -f -e -n', 'ask'],
    ['git clean -f -en', 'ask'],
    ['git clean -f --exclude -n', 'ask'],
    ['git clean -f --ex -n', 'ask'],
    // push --signed takes no separate value: +main after it is a refspec.
    ['git push origin --signed +main', 'ask'],
    // L-R5-1: $'..' / $"..." words are unknown (the glob after them was hidden).
    ["git checkout -b x $'-'*", 'ask'],
    ["git checkout -b x $'\\x2d'*", 'ask'],
    ["git checkout -b x $'-'?", 'ask'],
    ["git checkout -b x $'-'[f]", 'ask'],
    ["git diff $'-'*", 'ask'],
    ["git log -1 -o.. $'-'*/.git/config", 'ask'],
    ['git checkout -b x $"-"*', 'ask'],
    ["npm test -- $'-'*", 'ask'],
    ["git checkout $'-f'", 'ask'],
    // L-R5-2: CAGENTS_* overrides before a runner or a scripts/ci command.
    ['CAGENTS_ADVISORY_DIR=x node scripts/ci/run-advisory.cjs', 'ask'],
    ['CAGENTS_PROJECT_ROOT=/tmp/p node scripts/ci/validate-terminal-states.cjs', 'ask'],
    ['export CAGENTS_ADVISORY_DIR=x; node scripts/ci/run-advisory.cjs', 'ask'],
    ['env CAGENTS_ADVISORY_DIR=x node scripts/ci/run-advisory.cjs', 'ask'],
    ['CAGENTS_ADVISORY_DIR=x npm test', 'ask'],
    // An assignment-only segment still asks when a runner runs in another segment.
    ['CAGENTS_ADVISORY_DIR=x; export CAGENTS_ADVISORY_DIR; node scripts/ci/run-advisory.cjs', 'ask'],
    ['GIT_DIR=x; git status', 'ask'],
    ['NODE_OPTIONS=--require=./x.cjs; npm test', 'ask'],
    // ...but a substitution inside its own value runs before the assignment.
    ['CAGENTS_ROOT="$(git rev-parse --show-toplevel)"', 'allow'],
    // Benign forms stay allowed.
    ['git checkout -b x', 'allow'],
    ['git checkout -b x --track origin/x', 'allow'],
    ['git checkout --track origin/x', 'allow'],
    ['git checkout --detach', 'allow'],
    ['git checkout --orphan x', 'allow'],
    ['git checkout main', 'allow'],
    ['git switch -c x', 'allow'],
    ['git switch --create x', 'allow'],
    ['git clean --dry-run -f', 'allow'],
    ['git clean -n -f', 'allow'],
    ['git clean -fn', 'allow'],
    ['git clean --d -f', 'allow'],
    ['git clean -n', 'allow'],
    ['git clean -n -e x -f', 'allow'],
    ['git log --oneline', 'allow'],
    ['git log --oneline -5', 'allow'],
    ['git diff --stat', 'allow'],
    ['git stash push --message m', 'allow'],
    ['git stash push -m msg', 'allow'],
    ['git branch -d x', 'allow'],
    ['git reset --soft HEAD~1', 'allow'],
    ['git reset --mixed', 'allow'],
    ['git push origin main', 'allow'],
    ['git push --force-with-lease origin main', 'allow'],
    ['npm test -- --reporter=verbose', 'allow'],
    ['CAGENTS_X=1 ls', 'allow'],
  ])('%j -> %s', (command, expected) => {
    expect(label(evaluate(command)), `verdict for: ${JSON.stringify(command)}`).toBe(expected);
  });
});

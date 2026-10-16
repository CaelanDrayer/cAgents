/**
 * bash-guard-shell-script-fp.test.js: v12.76.1 false-positive fix.
 *
 * A Git Bash session ran `cd <session dir>; export PATH=...:$PATH; bash tap.sh`.
 * The CWD rule and the ENV rule both asked, because `bash` was in RUNNER_WORDS.
 * A shell that runs a literal local script file is no longer a runner. A shell
 * with -c, -s, stdin, an expanded word, or a scripts/ or `..` path still is.
 * BASH_ENV and ENV still ask, because they inject code into every bash.
 *
 * The project root also matches in its Windows forms (C:/x, C:\x, /c/x).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createRequire } from 'module';
import { execFileSync } from 'child_process';

const require = createRequire(import.meta.url);
const HOOKS_DIR = join(__dirname, '..', '..', '.claude', 'hooks');
const { evaluate, mentionsRunner } = require(join(HOOKS_DIR, 'bash-guard-evaluator.cjs'));

function label(r) {
  if (!r) return 'allow';
  if (r.deny) return 'deny';
  return r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision;
}

const USER_CMD = 'cd C:/Users/Caelan/SoulRPG/cagents-memory/sessions/act_x_261016_001/workflow; ' +
  'export ANDROID_SERIAL=emulator-5558; export PATH="$LOCALAPPDATA/Android/Sdk/platform-tools:$PATH"; ' +
  'export MSYS_NO_PATHCONV=1; bash tap.sh 74 206 2; adb shell input swipe 540 1900 540 700 600; ' +
  'sleep 1.5; bash ui.sh; bash shot.sh hall_s1';

const ROWS = [
  ['FP', USER_CMD, 'allow'],
  ['FP', 'cd /x; bash tap.sh', 'allow'],
  ['FP', 'cd /x && sh ./ui.sh 1 2', 'allow'],
  ['FP', 'cd /x; bash -x tap.sh', 'allow'],
  ['FP', 'export PATH=/a:$PATH; bash tap.sh', 'allow'],
  ['FP', 'export PATH="$LOCALAPPDATA/x:$PATH"; bash tap.sh', 'allow'],
  ['FP', 'export MSYS_NO_PATHCONV=1', 'allow'],
  ['FP', 'MSYS_NO_PATHCONV=1 adb shell ls', 'allow'],
  ['FP', 'adb shell input swipe 540 1900 540 700 600', 'allow'],
  ['FP', 'sleep 1.5', 'allow'],
  ['FP', 'sleep 1.5; adb shell input tap 1 2; sleep 1', 'allow'],
  ['FP', 'export ANDROID_SERIAL=emulator-5558; adb devices', 'allow'],
  ['TP', 'export BASH_ENV=x; bash tap.sh', 'ask'],
  ['TP', 'export ENV=x; bash tap.sh', 'ask'],
  ['TP', 'BASH_ENV=x bash tap.sh', 'ask'],
  ['TP', 'cd /x; bash scripts/ci/run.sh', 'ask'],
  ['TP', 'cd /x; bash ./scripts/ci/run.sh', 'ask'],
  ['TP', 'cd /x; bash ../run.sh', 'ask'],
  ['TP', 'cd /x; npm test', 'ask'],
  ['TP', 'cd /x; node t.js', 'ask'],
  ['TP', 'cd /x; git status', 'ask'],
  ['TP', 'export PATH=x:$PATH; git status', 'ask'],
  ['TP', "cd /x; bash -c 'npm test'", 'ask'],
  ['TP', 'cd /x; bash -ec "npm test"', 'ask'],
  ['TP', 'cd /x; bash -s < t.sh', 'ask'],
  ['TP', 'cd /x; bash', 'ask'],
  ['TP', 'cd /x; bash $S', 'ask'],
  ['TP', 'cd /x; bash --rcfile r tap.sh', 'ask'],
  ['TP', 'cd /x; bash tap.sh $(git rev-parse HEAD)', 'ask'],
  ['TP', 'cd /x; sh ui.sh | git apply', 'ask'],
  ['TP', 'cd /x; bash scr?pts/ci/x.sh', 'ask'],
  ['TP', 'cd /x; bash ./scr*/ci/x.sh', 'ask'],
  ['TP', 'cd /x; bash [s]cripts/ci/x.sh', 'ask'],
  ['TP', 'cd /x; bash SCRIPTS/ci/x.sh', 'ask'],
  ['TP', 'cd /x; bash ./Scripts/ci/x.sh', 'ask'],
  ['TP', 'export LD_PRELOAD=x; bash tap.sh', 'ask'],
  ['TP', 'LD_PRELOAD=x bash tap.sh', 'ask'],
  ['TP', 'export LD_LIBRARY_PATH=x; bash tap.sh', 'ask'],
  ['TP', 'LD_LIBRARY_PATH=x bash tap.sh', 'ask'],
  ['TP', 'export LD_AUDIT=x; bash tap.sh', 'ask'],
  ['TP', 'LD_AUDIT=x bash tap.sh', 'ask'],
  ['TP', 'export DYLD_INSERT_LIBRARIES=x; bash tap.sh', 'ask'],
  ['TP', 'DYLD_INSERT_LIBRARIES=x bash tap.sh', 'ask'],
  ['TP', 'export NODE_OPTIONS=x; bash tap.sh', 'ask'],
  ['TP', 'NODE_OPTIONS=x bash tap.sh', 'ask'],
];

describe('shell running a local script is not a runner', () => {
  it.each(ROWS)('%s: %j -> %s', (_tag, command, expected) => {
    expect(label(evaluate(command))).toBe(expected);
  });

  it('mentionsRunner: a local script is not a runner, scripts/ci is', () => {
    expect(mentionsRunner('bash tap.sh')).toBe(false);
    expect(mentionsRunner('bash scripts/ci/cagents-ci.sh')).toBe(true);
    expect(mentionsRunner("bash -c 'git status'")).toBe(true);
  });

  it('the exact user command allows through bash-validator.cjs', () => {
    const out = execFileSync('node', [join(HOOKS_DIR, 'bash-validator.cjs')], {
      input: JSON.stringify({ tool_input: { command: USER_CMD } }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1' }
    });
    const r = JSON.parse(out.trim());
    expect(r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision).not.toBe('ask');
    expect(r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision).not.toBe('deny');
  });
});

describe('Windows forms of the project root', () => {
  let saved;
  beforeAll(() => { saved = process.env.CLAUDE_PROJECT_DIR; process.env.CLAUDE_PROJECT_DIR = 'C:\\Users\\Caelan\\SoulRPG'; });
  afterAll(() => { if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR; else process.env.CLAUDE_PROJECT_DIR = saved; });

  it.each([
    ['cd C:/Users/Caelan/SoulRPG && npm test', 'allow'],
    ['cd C:/Users/Caelan/SoulRPG/ && npm test', 'allow'],
    ['cd /c/Users/Caelan/SoulRPG && npm test', 'allow'],
    ['cd "C:\\Users\\Caelan\\SoulRPG" && npm test', 'allow'],
    ['cd c:/users/caelan/soulrpg && npm test', 'allow'],
    ['cd C:/Users/Caelan/SoulRPG/cagents-memory && npm test', 'ask'],
    ['cd D:/Users/Caelan/SoulRPG && npm test', 'ask'],
  ])('%j -> %s', (command, expected) => {
    expect(label(evaluate(command))).toBe(expected);
  });
});

describe('a POSIX root never matches a drive-form word', () => {
  let saved;
  beforeAll(() => { saved = process.env.CLAUDE_PROJECT_DIR; process.env.CLAUDE_PROJECT_DIR = '/c/proj'; });
  afterAll(() => { if (saved === undefined) delete process.env.CLAUDE_PROJECT_DIR; else process.env.CLAUDE_PROJECT_DIR = saved; });

  it.each([
    ['cd /c/proj && npm test', 'allow'],
    // On Linux, C:/proj is a relative dir, not the root. win32 converts /c/proj.
    ['cd C:/proj && npm test', process.platform === 'win32' ? 'allow' : 'ask'],
  ])('%j -> %s', (command, expected) => {
    expect(label(evaluate(command))).toBe(expected);
  });
});

// End to end: the registered launcher (run-hook.cjs bash-validator) with the
// exact user command, a hook cwd inside a session workflow dir, and each form
// of CLAUDE_PROJECT_DIR. No ask and no deny may come out.
describe('end to end through run-hook.cjs', () => {
  let root;
  let cwd;
  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'shfp-root-'));
    cwd = join(root, 'cagents-memory', 'sessions', 'act_x_261016_001', 'workflow');
    mkdirSync(cwd, { recursive: true });
  });
  afterAll(() => { try { rmSync(root, { recursive: true, force: true }); } catch {} });

  const decision = (projectDir, command) => {
    const out = execFileSync('node', [join(HOOKS_DIR, 'run-hook.cjs'), 'bash-validator'], {
      input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd, tool_input: { command } }),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: projectDir === null ? root : projectDir }
    });
    const r = JSON.parse(out.trim());
    return (r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision) || 'allow';
  };

  it.each([
    ['POSIX temp root', null],
    ['C:/ form', 'C:/Users/Caelan/SoulRPG'],
    ['C:\\ form', 'C:\\Users\\Caelan\\SoulRPG'],
    ['/c/ form', '/c/Users/Caelan/SoulRPG'],
  ])('exact user command, %s root: no ask or deny', (_name, projectDir) => {
    const d = decision(projectDir, USER_CMD);
    expect(d).not.toBe('ask');
    expect(d).not.toBe('deny');
  });

  it('a runner after the cd still asks end to end', () => {
    expect(decision('C:/Users/Caelan/SoulRPG', 'cd C:/Users/Caelan/SoulRPG/cagents-memory; npm test')).toBe('ask');
  });
});

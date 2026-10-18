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
 * The commands are only evaluated, never executed. The test writes no file,
 * except the WI-R2 r1 symlink block, which makes two links in a new temp dir
 * and removes that dir.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { join, basename, dirname } from 'path';
import { tmpdir } from 'os';
import { mkdtempSync, symlinkSync, rmSync } from 'fs';
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

// WI-R1 (v12.78.1): awk, sed, git and find are on the read list, but each one
// has a mode that writes a file or runs a command. These are the F-1 forms of
// validation_report.yaml, and the spellings that the WI-01 canonical match
// covers: double quotes, a backslash, upper case, `./`, a cd, a variable and a
// glob. Each probe asks in default mode and with CAGENTS_BASH_GUARD=off.
const MODE_WRITES = {
  'awk print redirect': [
    `awk '{print > ".claude/settings.json"}' x`,
    `awk "{print > \\".claude/settings.json\\"}" x`,
    `awk '{print > ".cl\\aude/settings.json"}' x`,
    `awk '{print > ".CLAUDE/Settings.json"}' x`,
    `awk '{print > "./.claude/settings.json"}' x`,
    `cd .claude && awk '{print > "settings.json"}' x`,
    `P=.claude/settings.json; awk -v p="$P" '{print > p}' x`,
    `awk '{print > ".claude/set*.json"}' x`,
    `awk '{print >> ".cl" "aude/settings.json"}' x`,
  ],
  'awk system and pipe': [
    `awk 'BEGIN{system("echo x > .claude/settings.json")}'`,
    `awk "BEGIN{system(\\"echo x > .claude/settings.json\\")}"`,
    `awk 'BEGIN{system("echo x > .cl\\aude/settings.json")}'`,
    `awk 'BEGIN{system("echo x > .CLAUDE/Settings.json")}'`,
    `awk 'BEGIN{system("echo x > ./.claude/settings.json")}'`,
    `cd .claude && awk 'BEGIN{system("echo x > settings.json")}'`,
    `P=.claude/settings.json; awk -v p="$P" 'BEGIN{system("echo x > " p)}'`,
    `awk 'BEGIN{system("echo x > .claude/set*.json")}'`,
    `awk 'BEGIN{"echo x > .claude/settings.json" | getline}'`,
    `awk '{print | "tee .claude/settings.json"}' x`,
    'awk -f prog.awk .claude/settings.json',
  ],
  'sed w command': [
    `sed -n 'w .claude/settings.json' x`,
    `sed -n "w .claude/settings.json" x`,
    `sed -n 'w .cl\\aude/settings.json' x`,
    `sed -n 'w .CLAUDE/Settings.json' x`,
    `sed -n 'w ./.claude/settings.json' x`,
    `cd .claude && sed -n 'w settings.json' x`,
    `P=.claude/settings.json; sed -n "w $P" x`,
    `sed -n 'w .claude/set*.json' x`,
    `sed -n 'W .claude/hooks/x.cjs' x`,
  ],
  'sed s///w flag': [
    `sed 's/a/b/w .claude/settings.json' x`,
    `sed "s/a/b/w .claude/settings.json" x`,
    `sed 's/a/b/w .cl\\aude/settings.json' x`,
    `sed 's/a/b/w .CLAUDE/Settings.json' x`,
    `sed 's/a/b/w ./.claude/settings.json' x`,
    `cd .claude && sed 's/a/b/w settings.json' x`,
    `P=.claude/settings.json; sed "s/a/b/w $P" x`,
    `sed 's/a/b/w .claude/set*.json' x`,
  ],
  'sed e command and e flag': [
    `sed '1e echo x > .claude/settings.json' x`,
    `sed "1e echo x > .claude/settings.json" x`,
    `sed '1e echo x > .cl\\aude/settings.json' x`,
    `sed '1e echo x > .CLAUDE/Settings.json' x`,
    `sed '1e echo x > ./.claude/settings.json' x`,
    `cd .claude && sed '1e echo x > settings.json' x`,
    `P=.claude/settings.json; sed "1e echo x > $P" x`,
    `sed '1e echo x > .claude/set*.json' x`,
    `sed 's/.*/echo x > .claude\\/settings.json/e' x`,
    'sed -f s.sed .claude/settings.json',
  ],
  'git config --file': [
    'git config --file .claude/settings.json a.b c',
    'git config --file=".claude/settings.json" a.b c',
    'git config -f .cl\\aude/settings.json a.b c',
    'git config -f .CLAUDE/Settings.json a.b c',
    'git config -f ./.claude/settings.json a.b c',
    'cd .claude && git config -f settings.json a.b c',
    'P=.claude/settings.json; git config -f $P a.b c',
    'git config -f .claude/set*.json a.b c',
    'git -C .claude config -f settings.json a.b c',
  ],
  'git diff and log --output': [
    'git diff --output=.claude/settings.json',
    'git diff --output ".claude/settings.json"',
    'git diff --output=.cl\\aude/settings.json',
    'git diff --output=.CLAUDE/Settings.json',
    'git diff --output=./.claude/settings.json',
    'cd .claude && git diff --output=settings.json',
    'P=.claude/settings.json; git diff --output=$P',
    'git diff --output=.claude/set*.json',
    'git log --output=.claude/hooks/run-hook.cjs',
    'git log --output ".claude/hooks/run-hook.cjs"',
    'git log --output=.CLAUDE/Hooks/run-hook.cjs',
    'cd .claude/hooks && git log --output=run-hook.cjs',
    'P=.claude/hooks/run-hook.cjs; git log --output=$P',
    'git format-patch -o .claude/hooks HEAD~1',
  ],
  'find -exec and -delete from a root that holds .claude': [
    'find . -name bash-validator.cjs -exec cp x {} \\;',
    'find . -name settings.json -delete',
    'find . -name settings.json -exec rm {} +',
    'find "." -name "settings.json" -delete',
    'find ".claude" -name x -delete',
    'find .cl\\aude -name x -exec rm {} +',
    'find .CLAUDE -name settings.json -delete',
    'find ./.claude -name x -exec cp y {} \\;',
    'find ./ -name settings.json -delete',
    'find .. -name settings.json -delete',
    'find -name settings.json -delete',
    'cd .claude && find hooks -name x -delete',
    'P=.claude; find $P -name x -delete',
    'find .cl* -name x -delete',
    'find .claude/set*.json -delete',
    'T=$(pwd); find "$T" -name settings.json -delete',
    'T=$(mktemp -d); find "$T/../.." -delete',
    'find . -exec sed -i s/a/b/ {} +',
  ],
};
const MODE_WRITE_CASES = Object.entries(MODE_WRITES).flatMap(([k, cmds]) => cmds.map(c => [k, c]));

describe('WI-R1: a write mode of awk, sed, git or find asks in every mode', () => {
  it.each(MODE_WRITE_CASES)('%s, default mode asks: %s', (_k, cmd) => {
    expect(run(cmd).decision).toBe('ask');
    expect(nonWaivableAskReason(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(MODE_WRITE_CASES)('%s, CAGENTS_BASH_GUARD=off keeps the ask: %s', (_k, cmd) => {
    const r = run(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

// WI-R1 (v12.78.1): the read-only forms of the same commands do not get a
// config ask. Each one allows through the launcher.
const MODE_READS = [
  `awk '{print $1}' f`,
  `awk 'NR>1' .claude/settings.json`,
  `awk -F'|' '{print $1}' .claude/settings.json`,
  `awk '{ if ($1 > 5) print $1 }' .claude/settings.json`,
  `awk 'BEGIN{FS=">"} {print $2}' .claude/settings.json`,
  `sed -n '1,5p' .claude/settings.json`,
  `sed 's/a/b/g' .claude/settings.json`,
  `sed -n '/hello world/p' .claude/hooks/run-hook.cjs`,
  `sed ':a;N;$!ba;s/\\n/ /g' .claude/settings.json`,
  `sed '1!G;h;$!d' .claude/settings.json`,
  'grep -rn x .claude/hooks',
  'git log -p .claude/settings.json',
  'git diff .claude/settings.json',
  'git config --get a.b',
  'git config --list',
  'find . -name x -print',
  "find src -name '*.js' -exec grep x {} \\;",
  'find .claude/hooks -name "*.cjs"',
];

describe('WI-R1: read-only awk, sed, git and find forms allow', () => {
  it.each(MODE_READS)('allows: %s', (cmd) => {
    expect(run(cmd).decision).toBe('allow');
    expect(nonWaivableAskReason(cmd)).toBeNull();
  });
});

// WI-R1 (v12.78.1): a find root that cannot hold .claude gets no config ask.
// The default-mode find rules still apply to these commands.
describe('WI-R1: a find root that cannot reach .claude gets no config ask', () => {
  it.each([
    'find /tmp -delete',
    'find /tmp/x -exec rm {} +',
    "find src -name '*.js' -exec grep x {} \\;",
    'find src -name "*.tmp" -delete',
    "find . -name '*.md' -exec grep -l x {} +",
    'T=$(mktemp -d); find "$T" -type f -delete',
    `awk '{print > "out.txt"}' f`,
    `sed -n 'w out.txt' f`,
    'git diff --output=/tmp/x.patch',
    'git config --file /tmp/x.cfg a.b c',
  ])('not a config write: %s', (cmd) => {
    expect(nonWaivableAskReason(cmd)).toBeNull();
  });
});

// WI-R2 (v12.78.2): R1-F1. A cd to the parent dir, to the home dir or to an
// absolute dir, then a relative find start that names the project dir or an
// ancestor of it, reaches .claude/. The guard tracks the exact cwd of each
// segment, so a find write action asks in every mode. The names come from
// ROOT, and HOME is set to the grandparent of ROOT, so the test is portable.
const P0 = basename(ROOT);
const P1 = basename(dirname(ROOT));
const GP = dirname(dirname(ROOT));
const GGP = dirname(GP);
const TOP = ROOT.split('/')[1];
function runR2(command, mode, spawnCwd) {
  const env = { ...process.env, CAGENTS_HOOK_DEDUP_DISABLE: '1', CLAUDE_PROJECT_DIR: ROOT, CAGENTS_CI_QUIET: '1', HOME: GP };
  delete env.CAGENTS_BASH_GUARD;
  if (mode !== undefined) env.CAGENTS_BASH_GUARD = mode;
  const r = spawnSync('node', [LAUNCHER, 'bash-validator'], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Bash', cwd: ROOT, tool_input: { command } }),
    encoding: 'utf8',
    timeout: 60000,
    env,
    cwd: spawnCwd || ROOT
  });
  expect(r.status, String(r.stderr)).toBe(0);
  const out = JSON.parse(String(r.stdout).trim());
  const h = out.hookSpecificOutput || {};
  return { decision: h.permissionDecision || 'allow', reason: h.permissionDecisionReason || '' };
}
function nwR2(cmd) {
  const prev = process.env.HOME;
  process.env.HOME = GP;
  try { return nonWaivableAskReason(cmd, { cwd: ROOT }); } finally { process.env.HOME = prev; }
}

const R2_WRITES = [
  `cd .. && find ${P0} -exec cp /tmp/x {} \\;`,
  `cd .. && find ${P0} -name x -delete`,
  `cd ~ && find ${P1} -name settings.json -delete`,
  `cd ${GP} && find ${P1} -name '*.cjs' -exec cp /tmp/x {} \\;`,
  `cd .. && find ${P0} -name settings.json -fprint /dev/null -delete`,
  `pushd .. && find ${P0} -delete`,
  `cd ../.. && find ${P1} -delete`,
  `cd ${GGP} && find ${basename(GP)} -name x -delete`,
  `cd / && find ${TOP} -name x -delete`,
  `cd .. && cd ${P0} && find . -delete`,
  `cd ..; find ${P0} -delete`,
  `cd .. || true; find ${P0} -delete`,
  `cd ../${P0}/.. && find ${P0} -delete`,
  `cd "$HOME" && find ${P1} -delete`,
  `pushd ${GGP} && find ${basename(GP)} -delete`,
  'pushd .. && popd && find . -delete',
  `cd ~/${P1} && find ${P0} -execdir cp /tmp/x {} \\;`,
  `cd && find ${P1} -delete`,
  `cd ${dirname(ROOT)} && find ${P0} -ok cp /tmp/x {} \\;`,
  `cd - && find ${P0} -delete`,
  `cd "$(dirname "$PWD")" && find ${P0} -delete`,
  'cd /tmp && find . -delete',
  `cd ${ROOT}/.claude && find hooks -delete`,
  `bash -c 'cd .. && find ${P0} -delete'`,
  `cd .. && bash -c 'find ${P0} -delete'`,
  // R1-F2: gfind, busybox find and xargs find are find.
  'gfind . -delete',
  'busybox find . -delete',
  'busybox find . -name settings.json -delete',
  'gfind . -name settings.json -delete',
  'gfind . -exec cp /tmp/x {} \\;',
  'busybox find . -exec cp /tmp/x {} \\;',
  `cd .. && gfind ${P0} -delete`,
  `cd .. && busybox find ${P0} -exec cp /tmp/x {} \\;`,
  'env gfind . -delete',
  'xargs find . -delete',
  // R1-F4: a -fprint* or -fls FILE in .claude asks.
  'find . -fprint .claude/settings.json',
  `cd .. && find ${P0} -fprint ${P0}/.claude/x`,
  'find . -fls .claude/x',
  'find /tmp -fprint0 .claude/hooks/a.cjs',
  "find . -name '*.js' -exec node x.js {} \\;",
  'find . -exec node --check {} --require x \\;',
];

describe('WI-R2: a cd to an ancestor and a relative find start ask in every mode', () => {
  it.each(R2_WRITES)('default mode asks: %s', (cmd) => {
    expect(runR2(cmd).decision).toBe('ask');
    expect(nwR2(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(R2_WRITES)('CAGENTS_BASH_GUARD=off keeps the ask: %s', (cmd) => {
    const r = runR2(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

// WI-R2: read forms and -fprint targets outside .claude allow in default mode.
const R2_READS = [
  'cd /tmp && find . -name x -print',
  `cd .. && find ${P0} -name '*.md'`,
  "gfind . -name '*.md'",
  'busybox find . -name x',
  'find . -fprint /tmp/list',
  'find . -fprint0 /tmp/l',
  "find . -fprintf /tmp/l '%p\\n'",
];

describe('WI-R2: read-only find forms allow', () => {
  it.each(R2_READS)('allows: %s', (cmd) => {
    expect(runR2(cmd).decision).toBe('allow');
    expect(nwR2(cmd)).toBeNull();
  });
});

// WI-R2: no config ask. A default-mode ask from the waivable find rule (W4)
// can stay, but CAGENTS_BASH_GUARD=off allows.
const R2_NO_CFG = [
  "find . -name '*.js' -exec node --check {} \\;",
  "find . -name '*.js' -exec node --check {} +",
  'find . -exec node -c {} +',
  'find /tmp -name x -delete',
  "cd src && find foo -name '*.bak' -delete",
  "find src -name '*.bak' -delete",
  'cd /tmp && find foo -delete',
  'cd ~ && find Documents -name x -delete',
];

describe('WI-R2: no config ask for these find forms', () => {
  it.each(R2_NO_CFG)('off mode allows: %s', (cmd) => {
    expect(nwR2(cmd)).toBeNull();
    expect(runR2(cmd, 'off').decision).toBe('allow');
  });
});

// WI-R2: R1-F5. The anchor dir is the payload cwd, not the hook process cwd.
describe('WI-R2: the hook process cwd is not a find anchor', () => {
  it('find /tmp -name x -delete gets no config ask from a hook cwd under /tmp', () => {
    expect(runR2('find /tmp -name x -delete', 'off', tmpdir()).decision).toBe('allow');
    expect(runR2(`find ${tmpdir()} -name x -delete`, 'off', tmpdir()).decision).toBe('allow');
  });
});

// WI-R2 r1: the defects of reviewer round 1 (D1-D4, D5) and the symlink
// residual. Each write form asks in default mode and with
// CAGENTS_BASH_GUARD=off, with the non-waivable config reason.
const R2R1_WRITES = [
  // D1: a -fprint* word as the operand of a test is not an action.
  'find . ! -name -fprint -exec cp /tmp/x {} \\;',
  `cd .. && find ${P0} ! -name -fprint -exec cp /tmp/x {} +`,
  'find . ! -name -fprint -delete',
  'find . -not -name -fprint -delete',
  'find . ! -path -fprint0 -delete',
  'find . ! -name -fprintf -delete',
  'find . -name -fls -exec cp /tmp/x {} \\;',
  'find . -newer -fprint -exec cp /tmp/x {} \\;',
  'find . -fprint -delete',
  "find . -fprintf /tmp/l '%p' -delete",
  'find . -type f -exec grep -q x {} \\; -exec cp /tmp/x {} \\;',
  'find . -exec cat {} \\; -delete',
  // D2: a cd after `||` or `|` adds to the cwd list.
  `cd .. || cd /tmp && find ${P0} -exec cp /tmp/x {} \\;`,
  `cd .. || cd /tmp && find ${P0} -delete`,
  `cd ~ || cd /tmp && find ${P1} -delete`,
  `true || cd /tmp && cd .. && find ${P0} -delete`,
  `cd .. || pushd /tmp && find ${P0} -delete`,
  `false && cd /tmp || cd .. && find ${P0} -delete`,
  `cd .. | cd /tmp && find ${P0} -delete`,
  // D3: pushd and popd options give an unknown cwd.
  `pushd -n .. && popd && find ${P0} -exec cp /tmp/x {} \\;`,
  `pushd -n .. ; popd ; find ${P0} -exec cp /tmp/x {} \\;`,
  `pushd -n .. && popd && find ${P0} -delete`,
  `pushd -n ${GP} && popd && find ${P1} -delete`,
  `pushd -n +0 .. && popd && find ${P0} -delete`,
  `pushd /tmp && pushd -n .. && popd && find ${P0} -delete`,
  `cd -x .. && find ${P0} -delete`,
  `popd +1 && find ${P0} -delete`,
  // D4: the command binds HOME or CDPATH, or sets cdable_vars.
  `HOME=${dirname(ROOT)} cd && find ${P0} -exec cp /tmp/x {} \\;`,
  `export HOME=${dirname(ROOT)} && cd ~ && find ${P0} -execdir cp /tmp/x {} \\;`,
  `HOME=${dirname(ROOT)}; cd ~/${P0}/.. && find ${P0} -exec cp /tmp/x {} \\;`,
  `shopt -s cdable_vars; p=${dirname(ROOT)}; cd p && find ${P0} -exec cp /tmp/x {} \\;`,
  `declare HOME=${dirname(ROOT)}; cd && find ${P0} -delete`,
  `CDPATH=${dirname(ROOT)} cd ${P0} && find . -name x -exec cp /tmp/x {} \\;`,
  `CDPATH=${GP}; cd ${P1} && find ${P0} -delete`,
  `bash -c 'HOME=${dirname(ROOT)}; cd; find ${P0} -delete'`,
  `HOME=${dirname(ROOT)} bash -c 'cd && find ${P0} -delete'`,
  // D5: the non-find writes after `cd ..`.
  `cd .. && echo x > ${P0}/.claude/settings.json`,
  `cd .. && sed -n 'w ${P0}/.claude/settings.json' x`,
  `cd .. && git -C ${P0} diff --output=.claude/settings.json`,
];

describe('WI-R2 r1: reviewer round 1 defects ask in every mode', () => {
  it.each(R2R1_WRITES)('default mode asks: %s', (cmd) => {
    expect(runR2(cmd).decision).toBe('ask');
    expect(nwR2(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(R2R1_WRITES)('CAGENTS_BASH_GUARD=off keeps the ask: %s', (cmd) => {
    const r = runR2(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

// WI-R2 r1: the same parse rules add no config ask to these forms.
const R2R1_READS = [
  'find . -name -fprint -print',
  "find . ! -name '*.md' -exec grep -l x {} +",
  "find . -type f -name '*.js' -exec grep -q x {} \\; -print",
  'cd /tmp || exit 1',
  'echo "$HOME" && find . -name x',
  'find . -fprint /tmp/list -name x',
];

describe('WI-R2 r1: read forms allow', () => {
  it.each(R2R1_READS)('allows: %s', (cmd) => {
    expect(runR2(cmd).decision).toBe('allow');
    expect(nwR2(cmd)).toBeNull();
  });
});

const R2R1_NO_CFG = [
  "cd src || exit 1 && find foo -name '*.bak' -delete",
  'echo $HOME && find /tmp -name x -delete',
  'find . -name -fprint -fprint /tmp/l',
];

describe('WI-R2 r1: no config ask for these forms', () => {
  it.each(R2R1_NO_CFG)('off mode allows: %s', (cmd) => {
    expect(nwR2(cmd)).toBeNull();
    expect(runR2(cmd, 'off').decision).toBe('allow');
  });
});

// WI-R2 r1: a symlink to the project dir or to .claude/hooks is resolved
// with the physical path, also after `..` and `cd -P`.
describe('WI-R2 r1: a symlink start or cwd reaches .claude/', () => {
  let S;
  beforeAll(() => {
    S = mkdtempSync(join(tmpdir(), 'wi-r2-sl-'));
    symlinkSync(ROOT, join(S, 'l'));
    symlinkSync(join(ROOT, '.claude', 'hooks'), join(S, 'h'));
  });
  afterAll(() => { if (S) rmSync(S, { recursive: true, force: true }); });

  const writes = () => [
    `find ${S}/l/ -exec cp /tmp/x {} \\;`,
    `find ${S}/l -name x -delete`,
    `find ${S}/l/.. -name x -delete`,
    `cd ${S}/l && find . -delete`,
    `cd -P ${S}/l/.. && find ${P0} -delete`,
    `cd ${S} && find l -exec cp /tmp/x {} +`,
    `cd ${S} && find l/.. -delete`,
    `find . -fprint ${S}/h/a.cjs`,
  ];

  it('each write form asks in default mode and with CAGENTS_BASH_GUARD=off', () => {
    for (const cmd of writes()) {
      expect(runR2(cmd).decision, cmd).toBe('ask');
      expect(nwR2(cmd), cmd).toContain(NON_WAIVABLE);
      const r = runR2(cmd, 'off');
      expect(r.decision, cmd).toBe('ask');
      expect(r.reason, cmd).toContain(NON_WAIVABLE);
    }
  });

  it('a link to a link and a link to settings.json ask', () => {
    symlinkSync(join(S, 'l'), join(S, 'up'));
    symlinkSync(join(ROOT, '.claude', 'settings.json'), join(S, 's'));
    for (const cmd of [`find ${S}/up/ -exec cp /tmp/x {} \\;`, `find . -fprint ${S}/s`]) {
      expect(nwR2(cmd), cmd).toContain(NON_WAIVABLE);
      expect(runR2(cmd, 'off').decision, cmd).toBe('ask');
    }
  });

  it('a temp dir with no link to the project gets no config ask', () => {
    for (const cmd of [`find ${S} -name x -print -delete`, `cd ${S} && find nothere -delete`]) {
      expect(nwR2(cmd), cmd).toBeNull();
      expect(runR2(cmd, 'off').decision, cmd).toBe('allow');
    }
  });
});

// WI-R2 r2: the defects of reviewer round 2 (E1-E4) and the extras. Each
// write form asks in default mode and with CAGENTS_BASH_GUARD=off.
const PD = dirname(ROOT);
const R2R2_WRITES = [
  // E1: a computed -exec end word hides no later action.
  `s=';'; find . -exec cat {} "$s" -exec cp /tmp/x {} \\;`,
  `find . -exec cat {} "$(echo ';')" -exec cp /tmp/x {} \\;`,
  `s=';'; find . -exec cat {} \${s:-;} -exec cp /tmp/x {} \\;`,
  'p=+; find . -exec cat {} $p -exec cp /tmp/x {} +',
  'find . -exec grep -q x {} {\\;,} -exec cp /tmp/x {} \\;',
  `s=';'; find . -exec cat {} $s -delete`,
  'find . -exec cat {} {\\;,} -delete',
  `s=';'; find . -ok cat {} "$s" -delete`,
  `s=';'; cd .. && find ${P0} -exec cat {} "$s" -exec cp /tmp/x {} \\;`,
  'find . -exec cat {} `echo \\;` -exec cp /tmp/x {} \\;',
  'find . -execdir cat {} ? -delete',
  // E2: a function or an alias can hide a cd.
  `f(){ cd ${P1}; }; cd ${GP} && f && find ${P0} -exec cp /tmp/x {} \\;`,
  `f(){ cd ${P1}; }; cd ${GP} && f && find ${P0} -delete`,
  `function g { pushd ${PD}; }; cd /tmp && g && find ${P0} -delete`,
  `f () { cd ..; }; f; find ${P0} -exec cp /tmp/x {} +`,
  `shopt -s expand_aliases; alias up='cd ..'; up; find ${P0} -delete`,
  `bash -c 'f(){ cd ..; }; f; find ${P0} -delete'`,
  // E3: env -C DIR runs find in DIR.
  `env -C .. find ${P0} -exec cp /tmp/x {} \\;`,
  `env --chdir=${PD} find ${P0} -exec cp /tmp/x {} \\;`,
  `env -C ${PD} gfind ${P0} -delete`,
  `env -C .. find ${P0} -delete`,
  `env --chdir .. find ${P0} -delete`,
  `env -C.. find ${P0} -delete`,
  `env -i -C .. find ${P0} -delete`,
  `d=..; env -C "$d" find ${P0} -delete`,
  `cd /tmp && env -C ${ROOT} find . -delete`,
  // E4: a find word after any wrapper is a find call.
  'taskset -c 0 find . -exec cp /tmp/x {} \\;',
  'flock /tmp/lk find . -delete',
  'chrt -i 0 find . -delete',
  'busybox xargs find . -delete < /dev/null',
  'ionice -c3 find . -delete',
  'stdbuf -o0 find . -delete',
  'setsid find . -delete',
  'unbuffer find . -delete',
  'nohup find . -exec cp /tmp/x {} \\;',
  'time find . -delete',
  'strace -f find . -delete',
  'ltrace find . -delete',
  'watch find . -delete',
  `cd .. && taskset -c 0 find ${P0} -exec cp /tmp/x {} \\;`,
  'xargs -a /dev/null find . -delete',
  // Extras: a path-qualified exec word is not a reader; rg --pre runs a
  // command; a computed name can bind HOME.
  'find . -exec ./node -c {} +',
  'find . -exec /tmp/node --check {} \\;',
  'find . -exec /tmp/cat {} \\;',
  'find . -exec rg --pre /tmp/evil x {} \\;',
  'find . -exec rg --pre=/tmp/evil x {} +',
  `v=HO; declare "\${v}ME=${PD}"; cd && find ${P0} -delete`,
  `v=HOME; export "$v=${PD}"; cd ~ && find ${P0} -delete`,
  `n=HOME; read -r "$n" < /tmp/h; cd && find ${P0} -delete`,
  `n=HOME; printf -v "$n" %s ${PD}; cd && find ${P0} -delete`,
];

describe('WI-R2 r2: reviewer round 2 defects ask in every mode', () => {
  it.each(R2R2_WRITES)('default mode asks: %s', (cmd) => {
    expect(runR2(cmd).decision).toBe('ask');
    expect(nwR2(cmd)).toContain(NON_WAIVABLE);
  });

  it.each(R2R2_WRITES)('CAGENTS_BASH_GUARD=off keeps the ask: %s', (cmd) => {
    const r = runR2(cmd, 'off');
    expect(r.decision).toBe('ask');
    expect(r.reason).toContain(NON_WAIVABLE);
  });
});

// WI-R2 r2: the new rules add no ask to these read forms.
const R2R2_READS = [
  'grep find x',
  'echo find . -delete',
  'git log --grep find',
  'man find',
  "printf '%s\\n' find -delete",
  'find . -exec grep -l "$PWD" {} +',
  'find . -exec cat {} \\; -print',
  'export PATH=$PATH:/x && find . -name x',
  'taskset -c 0 find . -name x',
  'env -C /tmp find . -name x -print',
];

describe('WI-R2 r2: read forms allow', () => {
  it.each(R2R2_READS)('allows: %s', (cmd) => {
    expect(runR2(cmd).decision).toBe('allow');
    expect(nwR2(cmd)).toBeNull();
  });
});

const R2R2_NO_CFG = [
  'env -C /tmp find foo -delete',
  'taskset -c 0 find /tmp -delete',
  'find . -exec grep -q "$p" {} \\; -print',
  'f(){ :; }; f; find /tmp -name x -delete',
];

describe('WI-R2 r2: no config ask for these forms', () => {
  it.each(R2R2_NO_CFG)('off mode allows: %s', (cmd) => {
    expect(nwR2(cmd)).toBeNull();
    expect(runR2(cmd, 'off').decision).toBe('allow');
  });
});

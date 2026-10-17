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

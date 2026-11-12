/**
 * bash-validator.cjs unit tests (FU2-06).
 *
 * In-process tests of handler, findWriteTargets, and findSecretHits. The hook
 * is loaded with CAGENTS_DISPATCH_TEST_IMPORT=1, so it does not read stdin.
 *
 * Secret rule. Every secret-shaped token is built at run time by string
 * concatenation. This file holds no full secret literal.
 *
 * Log isolation. hook-utils.cjs resolves AGENT_MEMORY_DIR from
 * CLAUDE_PROJECT_DIR at load time. The tests point that key at a temp dir
 * before the require, so bash_guard.log never goes to the real _system/logs.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, symlinkSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pathMod = require('path');
const ROOT = join(__dirname, '..', '..');
const HOOKS = join(ROOT, '.claude', 'hooks');
const HOOK = join(HOOKS, 'bash-validator.cjs');
const CACHED = ['hook-utils.cjs', 'secret-detection.cjs', 'bash-validator.cjs'].map(f => join(HOOKS, f));

// The three switch keys. Delete them at file start, so a user env cannot change results.
const SWITCH_KEYS = ['CAGENTS_BASH_NARROW_GUARD', 'CAGENTS_BASH_GUARD', 'CAGENTS_BASH_GUARD_DISABLED'];
const OTHER_KEYS = ['HOME', 'CLAUDE_PROJECT_DIR', 'CAGENTS_DISPATCH_TEST_IMPORT'];
const original = {};
for (const k of SWITCH_KEYS.concat(OTHER_KEYS)) original[k] = process.env[k];
for (const k of SWITCH_KEYS) delete process.env[k];

const HOME = '/home/user';
let tmpRoot;
let LOG;
let handler;
let findWriteTargets;
let findSecretHits;
let RULE_FAMILIES;

function clearCache() {
  for (const f of CACHED) { try { delete require.cache[require.resolve(f)]; } catch { /* not loaded */ } }
}

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'cagents-bashval-'));
  LOG = join(tmpRoot, 'cagents-memory', '_system', 'logs', 'bash_guard.log');
  process.env.CLAUDE_PROJECT_DIR = tmpRoot;
  process.env.HOME = HOME;
  process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
  clearCache();
  ({ handler, findWriteTargets, findSecretHits, RULE_FAMILIES } = require(HOOK));
});

afterAll(() => {
  clearCache();
  for (const k of Object.keys(original)) {
    if (original[k] === undefined) delete process.env[k];
    else process.env[k] = original[k];
  }
  try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ }
});

// Save and restore each switch key around each test.
let savedSwitches = {};
beforeEach(() => {
  savedSwitches = {};
  for (const k of SWITCH_KEYS) savedSwitches[k] = process.env[k];
});
afterEach(() => {
  for (const k of SWITCH_KEYS) {
    if (savedSwitches[k] === undefined) delete process.env[k];
    else process.env[k] = savedSwitches[k];
  }
});

// --- helpers -------------------------------------------------------------
const CHARS = 'Q7wE9rT2yU4iO6pA3sD5fG8hJ1kL0zMcV2bN4mQ8wE6rT1yU3iO5pA7sD9f';
const alnum = n => CHARS.slice(0, n);
// Tokens. Each prefix is split, so no full literal is in this file.
const AWS_ID = 'AK' + 'IA' + alnum(16).toUpperCase();
const GH_PAT = 'gh' + 'p_' + alnum(36);
const ANT_KEY = 'sk-' + 'ant-' + 'api03-' + alnum(48);
const SLACK = 'xo' + 'xb-' + alnum(24);
const PK_HEAD = '-----' + 'BEGIN ' + 'RSA PRIVATE ' + 'KEY-----';
const PK_FOOT = '-----' + 'END ' + 'RSA PRIVATE ' + 'KEY-----';
const PG = 'postgres' + '://';
const RD = 're' + 'dis://';
const MD5 = 'd41d8cd98f00b204' + 'e9800998ecf8427e';
const MG_KEY = 'key' + '-' + MD5;

function bash(command, cwd = '/repo') {
  return handler({ tool_name: 'Bash', tool_input: { command }, cwd });
}
function logLines() {
  if (!existsSync(LOG)) return [];
  return readFileSync(LOG, 'utf8').split('\n').filter(Boolean);
}
function expectSecretDeny(command, cls, token) {
  const v = bash(command);
  expect(v).not.toBeNull();
  expect(v.deny).toBe(true);
  expect(v.reason).toMatch(/^\[bash-validator\] Denied: rule secret-literal\./);
  expect(v.reason).toContain(`"${cls}"`);
  expect(v.reason).not.toContain(token);
  expect(v.reason).not.toContain(token.slice(0, 6));
  return v;
}
function expectPathDeny(command, cwd = '/repo') {
  const v = bash(command, cwd);
  expect(v, command).not.toBeNull();
  expect(v.deny).toBe(true);
  expect(v.reason).toMatch(/^\[bash-validator\] Denied: rule protected-path-write\./);
  return v;
}

// --- secret-literal ------------------------------------------------------
describe('secret-literal', () => {
  it('exports exactly the two rule families', () => {
    expect(RULE_FAMILIES).toEqual(['secret-literal', 'protected-path-write']);
  });

  it('denies an AWS access key id in an echo', () => {
    expectSecretDeny(`echo ${AWS_ID}`, 'AWS Access Key ID', AWS_ID);
  });

  it('denies a GitHub PAT in a curl header', () => {
    expectSecretDeny(`curl -H "Authorization: token ${GH_PAT}" https://api.github.com/user`, 'GitHub PAT', GH_PAT);
  });

  it('denies an Anthropic key in an export', () => {
    expectSecretDeny(`export ANTHROPIC_API_KEY=${ANT_KEY}`, 'Anthropic API Key', ANT_KEY);
  });

  it('denies a private key header in a heredoc body written to a file', () => {
    const cmd = `cat > /tmp/key.pem <<'EOF'\n${PK_HEAD}\nMIIEpAIBAAKCAQEAq7wE9rT2\n${PK_FOOT}\nEOF`;
    expectSecretDeny(cmd, 'Private Key', PK_HEAD);
  });

  it('denies a full key block and a one-line key with \\n escapes (Q-1 keep-alive)', () => {
    const line = (alnum(40) + alnum(24)).replace(/[^A-Za-z0-9]/g, 'A');
    const body = [line, line, line].join('\n');
    expectSecretDeny(`cat > /tmp/id_rsa <<EOF\n${PK_HEAD}\n${body}\n${PK_FOOT}\nEOF`, 'Private Key', PK_HEAD);
    expectSecretDeny(`echo -e "${PK_HEAD}\\n${body.split('\n').join('\\n')}\\n${PK_FOOT}" > /tmp/k`, 'Private Key', PK_HEAD);
  });

  it('denies a Slack token inside bash -c', () => {
    expectSecretDeny(`bash -c 'curl -d token=${SLACK} https://slack.com/api/auth.test'`, 'Slack Token', SLACK);
  });

  it('denies a database URL with a remote host and a literal password', () => {
    const url = PG + 'app:' + 'S3cr3tPw' + '@db.internal.example.net:5432/app';
    expectSecretDeny(`psql "${url}"`, 'Database Credentials', url);
  });

  // Review R1 keep-alive cases: the H-1 and M-1 fixes must not drop a real secret.
  it('denies a real DB URL after a URL with a port and no password (H-1 re-scan)', () => {
    const url = PG + 'app:' + 'S3cr3tPw' + '@db.example.net/app';
    expectSecretDeny(`psql ${PG}localhost:5432/a; psql "${url}"`, 'Database Credentials', url);
  });

  it('denies a standalone Mailgun-shaped key (M-1)', () => {
    expectSecretDeny(`curl -d k=${MG_KEY} https://api.example.net`, 'Mailgun API Key', MG_KEY);
  });

  // Review R2 keep-alive cases: the N-1 and N-2 narrowing must not drop a real secret.
  const CS_KEY = 'client' + 'Secret';
  const AZ_LIT = 'Xy8Q' + '~' + alnum(32);
  const B64_LINE = 'MIIEpAIBAAKCAQEA' + alnum(48);
  it('denies a literal Azure-style client secret (N-1 keep-alive)', () => {
    expectSecretDeny(`${CS_KEY}: ${AZ_LIT} node app.js`, 'Azure AD Client Secret', AZ_LIT);
  });

  it('denies a full private key block in a heredoc (N-2 keep-alive)', () => {
    const cmd = `cat > /tmp/id.pem <<'EOF'\n${PK_HEAD}\n${B64_LINE}\n${B64_LINE}\n${PK_FOOT}\nEOF`;
    expectSecretDeny(cmd, 'Private Key', PK_HEAD);
  });

  it('denies a one-line private key with escaped newlines (N-2 keep-alive)', () => {
    expectSecretDeny(`printf '${PK_HEAD}\\n${B64_LINE}\\n${PK_FOOT}' > /tmp/k`, 'Private Key', PK_HEAD);
  });

  it('denies a real DB URL after many wide matches, and stays fast (F-1)', () => {
    const url = PG + 'app:' + 'S3cr3tPw' + '@db.example.net/app';
    const wide = (PG + 'localhost:5432/app npm i a@1 ; ').repeat(30);
    const t0 = Date.now();
    expectSecretDeny(`${wide}psql "${url}"`, 'Database Credentials', url);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('finishes 150 repeats of a wide DB match in under 1 s (F-1)', () => {
    const cmd = (PG + 'h:5432/a u@v ').repeat(150);
    const t0 = Date.now();
    expect(bash(cmd)).toBeNull();
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('findSecretHits returns only the class and the offset, never the value', () => {
    const hits = findSecretHits(`echo ${AWS_ID}`);
    expect(hits).toEqual([{ type: 'AWS Access Key ID', index: 5 }]);
  });

  const passes = [
    ['a token read from gh at run time', 'export GITHUB_TOKEN=$(gh auth token)'],
    ['a length check of an env token', 'echo $CLAUDE_CODE_MESSAGING_TOKEN | wc -c'],
    ['a grep for a key prefix', 'grep -rn "sk-" tests/'],
    ['a token-shaped string built from ${VAR}', 'echo "gh' + 'p_${TOKEN_BODY}"'],
    ['a database URL whose password is ${VAR}', 'psql "' + PG + 'app:${DB_PASS}@db.internal.example.net/app"'],
    ['a loopback database URL (U-2 default)', 'psql "' + PG + 'app:' + 'devpass' + '@localhost:5432/app"'],
    ['a loopback database URL on 127.0.0.1', 'psql "' + PG + 'app:' + 'devpass' + '@127.0.0.1:5432/app"'],
    ['a medium-only finding (generic api_key of 24 chars)', 'export api_' + 'key=' + alnum(24)],
    ['a JWT (low)', 'curl -H "Authorization: Bearer ' + 'eyJ' + 'hbGciOiJIUzI1NiJ9' + '.eyJ' + 'zdWIiOiIxIn0' + '.' + 'q7wE9rT2yU4" https://api.local/x'],
    // Review R1, H-1: a DB URL with a port and no password, then a later '@'.
    ['R1 H-1: a prisma URL, then npm i pkg@version', 'DATABASE_URL=' + PG + 'localhost:5432/app npx prisma migrate dev && npm i left-pad@1.3.0'],
    ['R1 H-1: redis-cli, then git config user.email', 'redis-cli -u ' + RD + 'localhost:6379 ping; git config user.email dev@example.com'],
    ['R1 H-1: a remote psql URL, then echo me@host', 'psql ' + PG + 'db.internal:5432/app -c "select 1"; git push origin main && echo me@host'],
    // Review R1, M-1: a cache file name that ends in -key-<md5>.
    ['R1 M-1: rm of a -key-<md5> cache dir', 'rm -rf /tmp/gh-cache-' + MG_KEY],
    // Review R2, N-1: the value is an identifier reference, not a literal.
    ['R2 N-1: a grep for a client secret read from process.env', 'rg -n "client' + 'Secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET" src/'],
    ['R2 N-1: an assignment from a config object', 'sed -i "s/client' + 'Secret = config.azureCredentials.secretValueX/x/" app.js'],
    // Review R2, N-2: a PEM header with no key body after it.
    ['R2 N-2: a grep for the private key header', 'grep -rln -- "' + PK_HEAD + '" . || echo none'],
    ['R2 N-2: a grep -A for the private key header', 'grep -A3 "' + PK_HEAD + '" docs/keys.md'],
    // Review R3, Q-1: a long absolute path on the header line is not a key body.
    ['R3 Q-1: a grep for the header in a long absolute dir', "grep -rln -- '" + PK_HEAD + "' /home/PathingIT/claude/cAgents/tests/fixtures"],
    ['R3 Q-1: a printf of the header alone', "printf '%s\\n' '" + PK_HEAD + "' | wc -c"],
  ];
  for (const [name, cmd] of passes) {
    it(`allows ${name}`, () => {
      expect(bash(cmd)).toBeNull();
      expect(findSecretHits(cmd)).toEqual([]);
    });
  }
});

// --- protected-path-write -----------------------------------------------
describe('protected-path-write', () => {
  const denies = [
    ['echo x > /etc/foo'],
    ['echo x >> /usr/local/bin/x'],
    ['tee /etc/hosts'],
    ['rm -rf /etc/*'],
    ['mv /tmp/a /usr/bin/a'],
    ['cp a /bin/'],
    ['sed -i s/a/b/ /etc/hosts'],
    ['chmod 600 ~/.ssh/config'],
    ['chown root /boot/x'],
    ['truncate -s 0 /etc/motd'],
    ['dd if=/dev/zero of=/etc/x'],
    ['touch ~/.gnupg/x'],
    ['cd /etc && rm passwd'],
    ["bash -c 'rm /etc/x'"],
    ['sudo tee /etc/x'],
    ['rm ../etc/passwd', '/tmp'],
  ];
  for (const [cmd, cwd] of denies) {
    it(`denies: ${cmd}${cwd ? ` (cwd ${cwd})` : ''}`, () => {
      expectPathDeny(cmd, cwd);
    });
  }

  it('names the verb, the action, the resolved path, and the root', () => {
    const v = expectPathDeny('rm ../etc/passwd', '/tmp');
    expect(v.reason).toContain("'rm' would delete /etc/passwd (protected root /etc/)");
    const h = expectPathDeny('chmod 600 ~/.ssh/config');
    expect(h.reason).toContain(`'chmod' would change mode of ${HOME}/.ssh/config (protected root ${HOME}/.ssh/)`);
  });

  it('findWriteTargets resolves a glob delete to the protected root', () => {
    const t = findWriteTargets('rm -rf /etc/*', '/tmp');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ verb: 'rm', action: 'delete', root: '/etc/' });
  });

  it('findWriteTargets tracks a literal cd for a relative path', () => {
    const t = findWriteTargets('cd /etc && rm passwd', '/repo');
    expect(t[0]).toMatchObject({ path: '/etc/passwd', root: '/etc/' });
  });

  const passes = [
    ['cat /etc/hosts'],
    ['grep -rn /etc/passwd docs/'],
    ['ls ~/.ssh'],
    ['git diff -- /usr/share'],
    ['echo "/etc/hosts" > out.txt'],
    ['cmd 2>/dev/null'],
    ['printf x > /proc/self/fd/2'],
    ['cp /etc/hosts /tmp/x'],
    ["cat > notes.md <<'EOF'\nEdit /etc/hosts by hand, and see rm -rf /etc/x.\nEOF"],
    ['rm "$X"'],
    ['rm -rf /tmp/scratch'],
    // Review R1, M-2: a cd inside ( ... ) ends with the subshell.
    ['(cd /usr/lib && ls) ; touch out.txt'],
    // Review R1, L-1: an array literal is a word, not a command.
    ['cmds=(rm -rf /etc/foo); echo ${cmds[0]}'],
    ['arr+=(mv /tmp/a /usr/bin/a); echo ok'],
    // Review R2, N-3: '>' inside (( )), $(( )) and [[ ]] is a comparison.
    ['cd /usr/lib && if (( $# > 0 )); then echo args; fi'],
    ['cd /usr/lib && echo $(( 3 > 2 )) $(( 1 << 2 ))'],
    ['cd /usr/lib && [[ "b" > "a" ]] && echo cmp'],
  ];
  for (const [cmd] of passes) {
    it(`allows: ${cmd.split('\n')[0]}`, () => {
      expect(bash(cmd)).toBeNull();
    });
  }

  it('denies a write after a subshell cd only when the outer cd is protected (M-2)', () => {
    expectPathDeny('(cd /tmp && ls); cd /etc && touch foo');
    expectPathDeny('(cd /usr/lib && touch x)');
  });

  it('still denies a redirect after an arithmetic or a [[ ]] test (N-3 keep-alive)', () => {
    expectPathDeny('(( 1 > 0 )) && echo x > /etc/foo');
    expectPathDeny('[[ -n x ]] && echo x > /etc/foo');
    expectPathDeny('((cd /tmp; ls); echo x > /etc/foo)');
  });

  it('stays linear on 200 KB of unclosed (( and [[ openers (Q-2)', () => {
    for (const unit of ['((', '[[ x ', '(( [[ x ']) {
      const cmd = 'echo ' + unit.repeat(Math.ceil(200 * 1024 / unit.length));
      const t = Date.now();
      bash(cmd);
      expect(Date.now() - t, unit).toBeLessThan(1500);
    }
  });

  it('still denies a real write under /usr/bin (keep-alive)', () => {
    expectPathDeny('rm /usr/bin/x');
    expectPathDeny('echo x > /usr/bin/x');
  });

  // Review R1, H-2: a link into a protected root. rm, unlink, mv (source), and
  // ln act on the link itself, so they pass. A write through the link denies.
  describe('a symlink into a protected root', () => {
    let dir;
    beforeAll(() => {
      dir = mkdtempSync(join(tmpdir(), 'cagents-bashval-link-'));
      mkdirSync(join(dir, 'venv', 'bin'), { recursive: true });
      symlinkSync('/usr/bin/env', join(dir, 'venv', 'bin', 'python'));
      symlinkSync('/usr/lib', join(dir, 'libdir'));
    });
    afterAll(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ } });

    for (const cmd of [
      'rm -f venv/bin/python',
      'ln -sf /usr/bin/env venv/bin/python',
      'unlink venv/bin/python',
      'mv venv/bin/python venv/bin/python.old',
      'rm libdir',
    ]) {
      it(`allows: ${cmd}`, () => {
        expect(bash(cmd, dir)).toBeNull();
      });
    }

    it('denies a redirect through the link and an rm into the linked dir', () => {
      expectPathDeny('echo hi > venv/bin/python', dir);
      expectPathDeny('rm libdir/', dir);
    });
  });
});

// --- fail-open (D-3) ----------------------------------------------------
describe('fail-open', () => {
  it('returns null when the parser throws, and logs one error line', () => {
    const before = logLines().length;
    const spy = vi.spyOn(pathMod, 'resolve').mockImplementation(() => { throw new TypeError('stub parser failure'); });
    let v;
    let calls = 0;
    // Read the call count before mockRestore, which clears it (vitest 4).
    try { v = bash('rm /etc/x'); calls = spy.mock.calls.length; } finally { spy.mockRestore(); }
    expect(calls).toBeGreaterThan(0);
    expect(v).toBeNull();
    const lines = logLines();
    expect(lines.length - before).toBe(1);
    expect(lines[lines.length - 1]).toMatch(/\| outcome=error \| rule=none \| detail=TypeError$/);
  });

  it('returns null on an unbalanced quote, and logs one unparsed line', () => {
    const before = logLines().length;
    expect(bash('echo "unterminated > /etc/x')).toBeNull();
    const lines = logLines();
    expect(lines.length - before).toBe(1);
    expect(lines[lines.length - 1]).toMatch(/\| outcome=unparsed \| rule=protected-path-write \|/);
    expect(lines[lines.length - 1]).not.toContain('unterminated');
  });

  it('still denies a secret in a command with an unbalanced quote', () => {
    expect(() => findWriteTargets(`echo "${AWS_ID}`, '/repo')).toThrow();
    expectSecretDeny(`echo "${AWS_ID}`, 'AWS Access Key ID', AWS_ID);
  });

  it('returns null for a missing tool_input (empty payload, D-3: allow, nothing to log)', () => {
    const before = logLines().length;
    expect(handler({ tool_name: 'Bash' })).toBeNull();
    expect(handler({})).toBeNull();
    expect(handler(undefined)).toBeNull();
    expect(handler({ tool_name: 'Bash', tool_input: {} })).toBeNull();
    expect(logLines().length - before).toBe(0);
  });

  it('skips both rules on a command over 256 KB, and logs one oversize line', () => {
    const before = logLines().length;
    const cmd = `echo ${AWS_ID} > /etc/foo; ` + 'echo a; '.repeat(40000);
    expect(bash(cmd)).toBeNull();
    const lines = logLines();
    expect(lines.length - before).toBe(1);
    expect(lines[lines.length - 1]).toMatch(/\| outcome=oversize \| rule=none \|/);
  });

  it('logs one unparsed line when the bash -c string has an unbalanced quote (L-3)', () => {
    const before = logLines().length;
    expect(bash("bash -c 'echo \"x'")).toBeNull();
    const lines = logLines();
    expect(lines.length - before).toBe(1);
    expect(lines[lines.length - 1]).toMatch(/\| outcome=unparsed \| rule=protected-path-write \| detail=bash -c /);
  });

  it('logs one deny line per deny, without the value', () => {
    const before = logLines().length;
    bash(`echo ${AWS_ID}`);
    bash('tee /etc/hosts');
    const lines = logLines().slice(before);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/\| outcome=deny \| rule=secret-literal \| detail=AWS Access Key ID$/);
    expect(lines[1]).toMatch(/\| outcome=deny \| rule=protected-path-write \| detail=\/etc\/$/);
    expect(lines.join('\n')).not.toContain(AWS_ID.slice(0, 6));
  });

  it('writes the log under the temp project dir', () => {
    expect(require(join(HOOKS, 'hook-utils.cjs')).AGENT_MEMORY_DIR).toBe(join(tmpRoot, 'cagents-memory'));
    expect(LOG.startsWith(tmpRoot)).toBe(true);
    expect(existsSync(LOG)).toBe(true);
  });
});

// --- off switch (D-4) ---------------------------------------------------
describe('off switch', () => {
  const DENY_CMD = 'echo x > /etc/foo';

  it('denies by default with no switch set', () => {
    for (const k of SWITCH_KEYS) expect(process.env[k]).toBeUndefined();
    expectPathDeny(DENY_CMD);
  });

  it('CAGENTS_BASH_NARROW_GUARD=off gives null and writes no log line', () => {
    process.env.CAGENTS_BASH_NARROW_GUARD = 'off';
    const before = logLines().length;
    expect(bash(DENY_CMD)).toBeNull();
    expect(bash(`echo ${AWS_ID}`)).toBeNull();
    expect(logLines().length - before).toBe(0);
  });

  it('CAGENTS_BASH_NARROW_GUARD=OFF (any case) gives null', () => {
    process.env.CAGENTS_BASH_NARROW_GUARD = 'OFF';
    expect(bash(DENY_CMD)).toBeNull();
  });

  it('CAGENTS_BASH_NARROW_GUARD with another value keeps the guard on', () => {
    process.env.CAGENTS_BASH_NARROW_GUARD = '0';
    expectPathDeny(DENY_CMD);
  });

  it('CAGENTS_BASH_GUARD=off does NOT change a deny', () => {
    process.env.CAGENTS_BASH_GUARD = 'off';
    expectPathDeny(DENY_CMD);
    expectSecretDeny(`echo ${AWS_ID}`, 'AWS Access Key ID', AWS_ID);
  });

  it('CAGENTS_BASH_GUARD_DISABLED=1 does NOT change a deny', () => {
    process.env.CAGENTS_BASH_GUARD_DISABLED = '1';
    expectPathDeny(DENY_CMD);
    expectSecretDeny(`echo ${AWS_ID}`, 'AWS Access Key ID', AWS_ID);
  });
});

// --- deny message (D-5) -------------------------------------------------
describe('deny message', () => {
  const RE = /^\[bash-validator\] Denied: rule (secret-literal|protected-path-write)\./;

  it('the secret deny matches the format and does not name the off switch', () => {
    const v = bash(`echo ${AWS_ID}`);
    expect(v.reason).toMatch(RE);
    expect(v.reason).not.toContain('CAGENTS_BASH_NARROW_GUARD');
    expect(v.reason).toContain('The value is not shown.');
    expect(v.reason).toContain('at character 5');
  });

  it('the path deny matches the format and does not name the off switch', () => {
    const v = bash('tee /etc/hosts');
    expect(v.reason).toMatch(RE);
    expect(v.reason).not.toContain('CAGENTS_BASH_NARROW_GUARD');
    expect(v.reason).toContain('To proceed: write under the project or /tmp instead');
  });

  it('lists the first three hits, then "and N more"', () => {
    const v = bash('rm /etc/a /etc/b /etc/c /etc/d /etc/e');
    expect(v.reason).toMatch(RE);
    expect(v.reason).toContain('/etc/c');
    expect(v.reason).not.toContain('/etc/d');
    expect(v.reason).toContain('and 2 more');
  });

  it('returns the deny shorthand that createHook expects', () => {
    const v = bash('tee /etc/hosts');
    expect(Object.keys(v).sort()).toEqual(['deny', 'reason']);
  });
});

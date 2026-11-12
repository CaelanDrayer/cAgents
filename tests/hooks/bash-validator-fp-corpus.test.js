/**
 * bash-validator.cjs false-positive corpus (FU2-07).
 *
 * The fixture tests/fixtures/bash-guard/fp-corpus.json holds real, scrubbed Bash
 * commands plus construct entries. The narrow guard must allow every entry: no deny
 * and no systemMessage. Every verdict must be null.
 *
 * On a failure the test prints only the entry id and the rule. It never prints the
 * command text.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..', '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'bash-guard', 'fp-corpus.json');
const HOOK = join(ROOT, '.claude', 'hooks', 'bash-validator.cjs');

const ENV_KEYS = ['HOME', 'CAGENTS_DISPATCH_TEST_IMPORT', 'CAGENTS_BASH_NARROW_GUARD', 'CAGENTS_BASH_GUARD', 'CAGENTS_BASH_GUARD_DISABLED'];
const saved = {};
let handler;
let findWriteTargets;
let findSecretHits;

function ruleOf(verdict) {
  const m = /rule ([a-z-]+)/.exec((verdict && verdict.reason) || '');
  if (m) return m[1];
  return verdict && verdict.systemMessage ? 'systemMessage' : 'non-null-verdict';
}

beforeAll(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  delete process.env.CAGENTS_BASH_NARROW_GUARD;
  delete process.env.CAGENTS_BASH_GUARD;
  delete process.env.CAGENTS_BASH_GUARD_DISABLED;
  process.env.CAGENTS_DISPATCH_TEST_IMPORT = '1';
  process.env.HOME = '/home/user';
  ({ handler, findWriteTargets, findSecretHits } = require(HOOK));
});

afterAll(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('bash-validator false-positive corpus', () => {
  const corpus = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const entries = corpus.entries;

  it('the fixture is not truncated', () => {
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(230);
    expect(entries.filter(e => e.source === 'construct').length).toBeGreaterThanOrEqual(25);
  });

  it('every entry gets a null verdict (zero denies, zero systemMessage)', () => {
    const failures = [];
    for (const e of entries) {
      const verdict = handler({ tool_name: 'Bash', tool_input: { command: e.command }, cwd: '/repo' });
      if (verdict !== null) {
        failures.push(`${e.id} rule=${ruleOf(verdict)}`);
        continue;
      }
      // The handler fails open on an internal error. Call the parsers directly so a
      // thrown error cannot hide behind a null verdict.
      try { findSecretHits(e.command); } catch (err) { failures.push(`${e.id} rule=secret-literal error=${err && err.name}`); }
      try { findWriteTargets(e.command, '/repo'); } catch (err) {
        if (!err || err.code !== 'UNPARSED') failures.push(`${e.id} rule=protected-path-write error=${err && err.name}`);
      }
    }
    expect(failures).toEqual([]);
  });
});

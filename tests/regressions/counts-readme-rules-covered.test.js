import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';

/**
 * WI-27 regression (DR-01..DR-04): README.md and .claude/rules/README.md
 * stated hook and rule counts that disk did not match. README.md said
 * "32 .cjs files = 24 unique registered hooks ... across 18 event types".
 * .claude/rules/README.md said "Rule files: 43", "Current Rules (43 files)"
 * and "18 event types". Disk said 33 / 25 / 17 / 45.
 *
 * Root cause: scripts/ci/validate-counts.sh read the README.md agent counts
 * only, and it never read .claude/rules/README.md. So CI stayed green.
 *
 * Fix: Checks 18 and 19 in validate-counts.sh. Each check compares every
 * matching phrase with the derived count.
 *
 * Race discipline: each mutation happens on a temp-dir COPY. The script reads
 * the copy through CAGENTS_VALIDATE_COUNTS_README or
 * CAGENTS_VALIDATE_COUNTS_RULES_README. The real files are never written.
 */

const REPO_ROOT = process.cwd();
const COUNTS = join(REPO_ROOT, 'scripts', 'ci', 'validate-counts.sh');
const REAL_README = join(REPO_ROOT, 'README.md');
const REAL_RULES_README = join(REPO_ROOT, '.claude', 'rules', 'README.md');

function run(args, env) {
  const r = spawnSync('bash', [COUNTS, ...args], {
    cwd: REPO_ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 60000,
  });
  if (r.error) throw r.error; // fail loud on a spawn error or a timeout
  return { code: r.status, output: (r.stdout || '') + (r.stderr || '') };
}

function derived() {
  const { code, output } = run(['--derive-only'], {});
  expect(code).toBe(0);
  return Object.fromEntries(
    output
      .trim()
      .split('\n')
      .map((l) => l.split('='))
      .map(([k, v]) => [k, Number(v)])
  );
}

/** Copy a file to a temp dir, apply one edit, run the validator on the copy. */
function mutateAndRun(src, envVar, from, to) {
  const dir = mkdtempSync(join(tmpdir(), 'counts-readme-rules-'));
  try {
    const text = readFileSync(src, 'utf8');
    expect(text).toContain(from); // the line under test must exist
    const copy = join(dir, 'copy.md');
    writeFileSync(copy, text.replace(from, to));
    return run([], { [envVar]: copy });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('WI-27: README hook counts and rules README counts are validated', () => {
  const d = derived();

  it('the real tree passes', () => {
    const { code, output } = run([], {});
    expect(output).not.toMatch(/README\.md/);
    expect(code).toBe(0);
  });

  it.each([
    ['.cjs files', `${d.hook_files} .cjs files`, `${d.hook_files - 1} .cjs files`],
    [
      'unique registered hooks',
      `${d.registered_hooks} unique registered hooks`,
      `${d.registered_hooks - 1} unique registered hooks`,
    ],
    ['event types', `across ${d.event_types} event types`, `across ${d.event_types + 1} event types`],
  ])('README.md: a wrong %s count fails', (_label, from, to) => {
    const { code, output } = mutateAndRun(REAL_README, 'CAGENTS_VALIDATE_COUNTS_README', from, to);
    expect(code).toBe(1);
    expect(output).toContain(`claims '${to}`);
  });

  it.each([
    ['Rule files', `**Rule files**: ${d.rules_md}`, `**Rule files**: ${d.rules_md - 2}`],
    ['Current Rules', `Current Rules (${d.rules_md} files)`, `Current Rules (${d.rules_md - 2} files)`],
    ['Hook event types', `**Hook event types**: ${d.event_types}`, `**Hook event types**: ${d.event_types + 1}`],
    ['hooks.md event types', `(${d.event_types} event types)`, `(${d.event_types + 1} event types)`],
  ])('.claude/rules/README.md: a wrong %s count fails', (_label, from, to) => {
    const claim = to.startsWith('(') ? to.slice(1, -1) : to;
    const { code, output } = mutateAndRun(
      REAL_RULES_README,
      'CAGENTS_VALIDATE_COUNTS_RULES_README',
      from,
      to
    );
    expect(code).toBe(1);
    expect(output).toContain(`claims '${claim}'`);
  });
});

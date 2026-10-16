/**
 * WI-17 regression: brace expansion in the rm / find / chmod / dd checks.
 *
 * The tokenizer keeps `{a,b}` as literal text. Before WI-17 the structured
 * checks saw `/{etc,}` or `-r{f,}` and allowed. Bash expands those words before
 * exec, so the command deleted /etc. The evaluator now re-judges a segment
 * with the expanded words. An expansion that it cannot do ({1..3}, a brace in
 * a quoted word) asks for a destructive command.
 *
 * Command strings are built from fragments so this file does not trip the
 * repo's own bash guard. Nothing here is executed.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { evaluate } = require('../../.claude/hooks/bash-guard-evaluator.cjs');

const RM = 'r' + 'm';
const verdict = (c) => {
  const r = evaluate(c);
  if (!r) return 'allow';
  if (r.deny) return 'deny';
  return r.hookSpecificOutput && r.hookSpecificOutput.permissionDecision;
};

describe('WI-17: brace expansion is judged after expansion', () => {
  it.each([
    [`${RM} -rf /{etc,}`],
    [`${RM} -rf /{etc,usr}`],
    [`${RM} -r{f,} /etc`],
    [`${RM} -{rf,} /etc`],
    [`${RM} -rf {/etc,/tmp/x}`],
    [`${RM} -rf /e{t,}c`],
    [`${RM} -rf ~/{.ssh,}`],
    [`{${RM},x} -rf /etc`],
    [`find /{etc,} -delete`],
    [`find {/etc,/tmp} -delete`],
    [`find /etc -{delete,}`],
    [`chmod -R 7{7,}7 /`],
    [`chmod -{R,} 777 /etc`],
    [`nice ${RM} -rf /{etc,}`],
    [`if true; then ${RM} -rf /{etc,}; fi`],
  ])('denies %s', (cmd) => {
    expect(verdict(cmd)).toBe('deny');
  });

  it.each([
    [`${RM} -rf /tmp/{1..3}`],
    [`${RM} -rf /"{etc,}"x{a,b}`],
  ])('asks when the expansion cannot be done: %s', (cmd) => {
    expect(verdict(cmd)).toBe('ask');
  });

  it.each([
    ['mkdir -p src/{a,b}/c'],
    ['cp file.txt{,.bak}'],
    ['echo {a,b}'],
    [`${RM} -f build/{a,b}.o`],
    ['ls -d /tmp/{x,y}'],
  ])('allows a benign brace command: %s', (cmd) => {
    expect(verdict(cmd)).toBe('allow');
  });

  it('keeps a literal {} for find -exec (no brace expansion)', () => {
    expect(verdict(`find /tmp/x -name a -exec ${RM} {} \\;`)).not.toBe('deny');
  });
});

// WI-17 round 2 (F1, F2).
describe('WI-17 round 2: `#` alternatives and expansion size', () => {
  it.each([
    [`${RM} -rf {#,/}`],
    [`${RM} -rf {#,/etc}`],
    [`${RM} -rf {#,~}`],
    [`${RM} -rf {#,/*}`],
    [`${RM} -rf {#a,/etc}`],
    [`${RM} -rf {!,/etc}`],
    ['chmod -R {#,777} /'],
    [`sh -c "${RM} -rf {#,/etc}"`],
  ])('F1: a leading `#` alternative does not hide later words: %s', (cmd) => {
    expect(verdict(cmd)).toBe('deny');
  });

  it('F1: a benign `#` alternative still allows', () => {
    expect(verdict('echo {#,x}')).toBe('allow');
  });

  const E26 = '{,}'.repeat(26);
  it.each([
    [`echo ${E26}; ${RM} -rf /etc`],
    [`${RM} -rf /etc ${E26}`],
    [`echo ${'{,}'.repeat(30)}; ${RM} -rf /etc`],
  ])('F2: an exponential `{,}` word decides fast and still denies: %s', (cmd) => {
    const t = Date.now();
    const v = verdict(cmd);
    expect(Date.now() - t).toBeLessThan(1000);
    expect(v).toBe('deny');
  });

  it.each([
    [`echo ${E26}`],
    [`echo ${'{,,}'.repeat(14)}`],
    [`echo ${'{'.repeat(20)},${'}'.repeat(20)}${'{,}'.repeat(14)}`],
    [`${RM} -f x${E26}`],
  ])('F2: an over-cap expansion asks within 1 s for any command: %s', (cmd) => {
    const t = Date.now();
    const v = verdict(cmd);
    expect(Date.now() - t).toBeLessThan(1000);
    expect(v).toBe('ask');
  });
});

// WI-17 round 3 (N1): the fail-closed gate for a brace word that the guard
// cannot expand judges the resolved command, not only the raw argv[0]. A
// leading assignment or a wrapper puts the real command in a later word.
describe('WI-17 round 3: unsupported brace words behind a prefix', () => {
  it.each([
    [`X=1 ${RM} -rf {\\#,/etc}`],
    [`stdbuf -oL ${RM} -rf {"#",/usr}`],
    [`ionice -c3 ${RM} -rf {$'#',/home}`],
    [`X=1 ${RM} -rf {'#',~}`],
    [`stdbuf -o0 ${RM} -rf {\\#,/etc}`],
    [`X=1 {r,}m -rf {\\#,/etc}`],
    [`setsid ${RM} -rf /{e..e}tc`],
    [`X=1 Y=2 nice -n 5 ${RM} -rf {\\#,/etc}`],
    [`\\${RM} -rf {\\#,/etc}`],
  ])('denies or asks: %s', (cmd) => {
    expect(['deny', 'ask']).toContain(verdict(cmd));
  });

  it.each([
    ['X=1 echo {"#",b}'],
    ['stdbuf -oL echo {"#",b}'],
    ['echo {\\#,x}'],
  ])('still allows a benign command: %s', (cmd) => {
    expect(verdict(cmd)).toBe('allow');
  });
});

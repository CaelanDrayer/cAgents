// WI-16 follow-up: keep hidden payloads out of the example store.
//
// The WI-16 audit scanned every docs/example-store/ex-*.md file for content
// that can carry a hidden instruction to an agent: zero-width code points,
// bidi control code points, Unicode tag-block code points, and long
// base64-like runs. It found none. This test keeps the store that way.
//
// A pre-fix red run is not possible, because no unsafe content exists. The
// last case plants each payload in memory and proves that each detector fires.
// Node built-ins only (fs, path).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const STORE = join(process.cwd(), 'docs', 'example-store');

// The same detector sets as the WI-16 scan.
export const DETECTORS = {
  // U+200B-200D, U+2060-2064, U+FEFF, U+180E, U+00AD
  zero_width: /[\u200B-\u200D\u2060-\u2064\uFEFF\u180E\u00AD]/u,
  // U+202A-202E, U+2066-2069, U+200E, U+200F, U+061C
  bidi: /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/u,
  // U+E0000-E007F
  tag_block: /[\u{E0000}-\u{E007F}]/u,
  // A base64-like run of 120 or more characters
  base64_run_120: /[A-Za-z0-9+/=_-]{120,}/,
};

/** Returns 'detector@line' strings for every detector hit in `text`. */
export function findPayloads(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    for (const [name, re] of Object.entries(DETECTORS)) {
      if (re.test(line)) hits.push(`${name}@${i + 1}`);
    }
  });
  return hits;
}

const exemplars = readdirSync(STORE)
  .filter((f) => f.startsWith('ex-') && f.endsWith('.md'))
  .sort();

describe('example store carries no agent-directed payload (WI-16)', () => {
  it('the store has exemplar files to scan', () => {
    expect(exemplars.length).toBeGreaterThan(0);
  });

  it.each(exemplars)('%s has no hidden code point and no long encoded run', (file) => {
    const text = readFileSync(join(STORE, file), 'utf8');
    expect(findPayloads(text)).toEqual([]);
  });

  it('each detector fires on a planted in-memory sample', () => {
    const cp = (n) => String.fromCodePoint(n);
    const samples = {
      zero_width: 'Read the file' + cp(0x200b) + ' first.',
      bidi: 'Run the test ' + cp(0x202e) + 'txt.exe',
      tag_block: 'Plain text' + cp(0xe0041) + cp(0xe0042) + cp(0xe007f),
      base64_run_120: 'blob: ' + 'QUJD'.repeat(30) + ' end',
    };
    for (const [name, text] of Object.entries(samples)) {
      expect(findPayloads(text), name).toEqual([`${name}@1`]);
    }
    // A run of 119 characters stays below the threshold.
    expect(findPayloads('x ' + 'A'.repeat(119) + ' y')).toEqual([]);
    // Each boundary code point of each range fires.
    for (const n of [0x200d, 0x2064, 0xfeff, 0x180e, 0x00ad]) expect(findPayloads(cp(n))).toEqual(['zero_width@1']);
    for (const n of [0x202a, 0x2069, 0x200e, 0x200f, 0x061c]) expect(findPayloads(cp(n))).toEqual(['bidi@1']);
    for (const n of [0xe0000, 0xe007f]) expect(findPayloads(cp(n))).toEqual(['tag_block@1']);
  });
});

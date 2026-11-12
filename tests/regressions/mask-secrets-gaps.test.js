// FU-R3-B: two gaps in maskSecrets (hook-utils.cjs) found by the WI-21 reviews.
// S2-03: the Private Key pattern masked only the BEGIN line. The key body stayed in stored text.
// N-01: a database URL whose '@' lies past cut + 1024 characters was not masked.
// All fixtures are built at runtime. No line holds a complete secret literal.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { join } from 'path';

const require = createRequire(import.meta.url);
const { maskSecrets } = require(join(process.cwd(), '.claude', 'hooks', 'hook-utils.cjs'));

const DASH = '-----';
const begin = (kind) => DASH + 'BEGIN ' + kind + 'PRIVATE ' + 'KEY' + DASH;
const end = (kind) => DASH + 'END ' + kind + 'PRIVATE ' + 'KEY' + DASH;
// A fake key body: base64-shaped lines, unique marker so the test can look for it.
const BODY_LINE = 'MIIEow' + 'IBAAKCAQEA' + 'Zq9fakeBody'.repeat(4);
const body = (n) => Array.from({ length: n }, () => BODY_LINE).join('\n');

function timeMs(fn) {
  const t0 = process.hrtime.bigint();
  const out = fn();
  return { ms: Number(process.hrtime.bigint() - t0) / 1e6, out };
}

describe('maskSecrets private key block (S2-03)', () => {
  for (const kind of ['', 'RSA ', 'OPENSSH ', 'EC ']) {
    it(`masks the whole '${kind || 'plain'}' block, not only the BEGIN line`, () => {
      const text = 'before\n' + begin(kind) + '\n' + body(5) + '\n' + end(kind) + '\nafter';
      const out = maskSecrets(text);
      expect(out).not.toContain('fakeBody');
      expect(out).not.toContain('PRIVATE KEY');
      expect(out).toBe('before\n[REDACTED]\nafter');
    });
  }

  it('masks a PGP private key block with its body', () => {
    const b = DASH + 'BEGIN PGP PRIVATE ' + 'KEY BLOCK' + DASH;
    const e = DASH + 'END PGP PRIVATE ' + 'KEY BLOCK' + DASH;
    const out = maskSecrets('x ' + b + '\n' + body(3) + '\n' + e + ' y');
    expect(out).toBe('x [REDACTED] y');
  });

  it('masks a truncated block with no END line to the end of the text', () => {
    const out = maskSecrets('error: ' + begin('RSA ') + '\n' + body(4));
    expect(out).not.toContain('fakeBody');
    expect(out).toBe('error: [REDACTED]');
  });

  it('masks the key body in the cut text when the block crosses the cut', () => {
    const raw = 'x'.repeat(50) + begin('RSA ') + '\n' + body(40) + '\n' + end('RSA ') + ' tail';
    const out = maskSecrets(raw, 200);
    expect(out).not.toContain('fakeBody');
    expect(out).toBe('x'.repeat(50) + '[REDACTED]');
  });

  it('masks two blocks one by one and keeps the text between them', () => {
    const blk = begin('') + '\n' + body(2) + '\n' + end('');
    expect(maskSecrets(blk + '\nmid\n' + blk)).toBe('[REDACTED]\nmid\n[REDACTED]');
  });

  it('stays linear on 300 KB of BEGIN lines with no END line', () => {
    maskSecrets('warm up');
    const raw = (begin('RSA ') + '\n').repeat(Math.ceil((300 * 1024) / 32));
    const { ms, out } = timeMs(() => maskSecrets(raw));
    expect(ms).toBeLessThan(500);
    expect(out).toBe('[REDACTED]');
  }, 60000);
});

describe('maskSecrets database URL past the window (N-01)', () => {
  const user = 'admin';
  const url = (pwLen) => 'postgres' + '://' + user + ':' + 'p'.repeat(pwLen) + '@db.example.com/app';

  it('masks the credential when the @ lies past cut + 1024', () => {
    const out = maskSecrets('connect failed: ' + url(3000) + ' end', 200);
    expect(out).not.toContain('pppp');
    expect(out).not.toContain(user + ':');
    expect(out).toBe('connect failed: [REDACTED]');
  });

  for (const scheme of ['mysql', 'mongodb+srv', 'redis', 'postgresql']) {
    it(`masks a long ${scheme} password with cut 500`, () => {
      const raw = scheme + '://' + user + ':' + 'q'.repeat(5000) + '@h/d';
      expect(maskSecrets(raw, 500)).toBe('[REDACTED]');
    });
  }

  it('keeps a URL with no credential when the text fits in the window', () => {
    const raw = 'ECONNREFUSED postgres' + '://localhost:5432/app';
    expect(maskSecrets(raw, 200)).toBe(raw);
  });

  it('still masks a short database URL inside the window', () => {
    expect(maskSecrets('e ' + url(8) + ' z', 200)).toBe('e [REDACTED] z');
  });
});

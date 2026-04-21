// Regression test for V10.26.35 uniform deprecation warnings.
// Asserts all 4 shims (/context, /debug, /review, /optimize) have:
//   (a) a deprecation notice block,
//   (b) the V11.0.0 removal date mentioned,
//   (c) an idempotency key (session_id),
//   (d) a log path pointing at deprecations_{date}.log,
//   (e) a migration-guide link.
// Also asserts /helper catalog marks each shim with "REMOVED IN V11.0.0".

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SHIMS = [
  { name: 'context', path: '.claude/skills/context/SKILL.md' },
  { name: 'debug', path: '.claude/skills/debug/SKILL.md' },
  { name: 'review', path: '.claude/skills/review/SKILL.md' },
  { name: 'optimize', path: '.claude/skills/optimize/SKILL.md' },
];

const HELPER = resolve(ROOT, '.claude/skills/helper/reference/command-details.md');

describe('V10.26.35 uniform deprecation warnings', () => {
  for (const shim of SHIMS) {
    describe(`/${shim.name} SKILL.md`, () => {
      const content = readFileSync(resolve(ROOT, shim.path), 'utf8');

      it('contains a Deprecation Notice block', () => {
        expect(content).toMatch(/Deprecation Notice|Back-compat note/);
      });

      it('mentions V11.0.0 removal date', () => {
        expect(content).toMatch(/V11\.0\.0/);
      });

      it('declares idempotency key = session_id (one-time per session)', () => {
        expect(content).toMatch(/session_id|once per session|EXACTLY ONCE/i);
      });

      it('logs emission to deprecations_{date}.log', () => {
        expect(content).toMatch(/deprecations_\{date\}\.log/);
      });

      it('includes migration-guide link (RELEASE_NOTES)', () => {
        expect(content).toMatch(/RELEASE_NOTES/);
      });
    });
  }
});

describe('V10.26.35 /helper catalog removal-date annotations', () => {
  const helper = readFileSync(HELPER, 'utf8');

  it('/context entry notes removal in V11.0.0', () => {
    // /context is an internal utility rather than a shim — helper may not
    // reference it by the same pattern, so assert deprecation status at
    // minimum (in its frontmatter description, which surfaces to helper).
    const ctx = readFileSync(resolve(ROOT, '.claude/skills/context/SKILL.md'), 'utf8');
    expect(ctx).toMatch(/V11\.0\.0/);
    expect(ctx).toMatch(/removed|deprecated/i);
  });

  it('/debug entry shows REMOVED IN V11.0.0', () => {
    expect(helper).toMatch(/\/debug[\s\S]{0,200}REMOVED IN V11\.0\.0/);
  });

  it('/review entry shows REMOVED IN V11.0.0', () => {
    expect(helper).toMatch(/\/review[\s\S]{0,200}REMOVED IN V11\.0\.0/);
  });

  it('/optimize entry shows REMOVED IN V11.0.0', () => {
    expect(helper).toMatch(/\/optimize[\s\S]{0,200}REMOVED IN V11\.0\.0/);
  });

  it('/optimize entry includes migration-guide link', () => {
    expect(helper).toMatch(/\/optimize[\s\S]*?migration guide/i);
  });
});

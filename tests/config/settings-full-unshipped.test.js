/**
 * P5.3 regression — un-ship .claude/settings.full.json from the npm package.
 *
 * BUG (pre-fix): package.json `files[]` explicitly published
 * ".claude/settings.full.json". That file is a REFERENCE/example config (it even
 * ships the experimental-teams flag ON), not the active plugin config. Shipping
 * it to npm risks a consumer applying the stale reference settings.
 *
 * FIX: drop the explicit ".claude/settings.full.json" entry from files[]. The
 * active ".claude/settings.json" is still shipped; the reference file stays on
 * disk but is no longer published. No `.claude/`-wide glob covers it, so removing
 * the explicit entry fully excludes it.
 *
 * FAILING-BEFORE / PASSING-AFTER: pre-fix the explicit entry is present → the
 * assertion FAILS; post-fix it is absent → PASSES. settings.json must remain.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const PKG_PATH = join(process.cwd(), 'package.json');

describe('package.json — settings.full.json un-shipped (P5.3)', () => {
  const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'));
  const files = pkg.files || [];

  it('does NOT publish .claude/settings.full.json in files[]', () => {
    expect(files).not.toContain('.claude/settings.full.json');
  });

  it('does NOT publish any broad .claude/ glob that would re-include settings.full.json', () => {
    // No entry may be a directory-level ".claude/" or ".claude/**" that would
    // sweep settings.full.json back into the package.
    const broadClaudeGlobs = files.filter(
      (f) => f === '.claude/' || f === '.claude' || f === '.claude/**' || f === '.claude/*'
    );
    expect(broadClaudeGlobs).toEqual([]);
  });

  it('still publishes the active .claude/settings.json', () => {
    expect(files).toContain('.claude/settings.json');
  });
});

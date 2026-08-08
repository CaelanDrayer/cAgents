/**
 * LP-26 regression: session-catchup.cjs additionalContext MUST include
 * a one-line "/helper" tip surfacing the helper skill at SessionStart.
 *
 * Rationale: /helper exists to guide users to the right skill, but users
 * frequently don't discover it. Surfacing it in the SessionStart context
 * is a zero-cost nudge that pays off when users are choosing between
 * /act, /team, /designer, etc.
 *
 * Bug-driven testing mandate: this test would have caught
 *   (a) accidental removal of the /helper tip during a future context refactor
 *   (b) the tip being moved out of the main `cagentsContext` string into
 *       a conditional branch that doesn't always fire
 *
 * Could have caught by: unit test reading the hook source for the tip line.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(import.meta.dirname, '..', '..');
const HOOK_PATH = join(REPO_ROOT, '.claude', 'hooks', 'session-catchup.cjs');

describe('LP-26: session-catchup /helper tip', () => {
  it('session-catchup.cjs additionalContext contains a /helper tip', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    // The tip must mention /helper and skill guidance / command selection
    // so users discover the skill without us being too brittle on exact wording.
    expect(src).toMatch(/\/helper for skill guidance and command selection/);
  });

  it('/helper tip lives in the unconditional cagentsContext (not a conditional branch)', () => {
    const src = readFileSync(HOOK_PATH, 'utf8');
    // Find the `let cagentsContext = '...'` initializer and verify the tip
    // is in the initial string (not appended in a try/catch that may skip).
    const initMatch = src.match(/let cagentsContext = '([^']*)'/);
    expect(initMatch).not.toBeNull();
    expect(initMatch[1]).toMatch(/\/helper/);
  });
});

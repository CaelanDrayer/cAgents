// Regression guard: the validator treats a zero-item pass as missing evidence.
// A check that examined zero items, where items were expected, reports success
// without proof. agents/validator.md Skeptical-by-Default item 5 states this.
// The validator is a prose agent, so this test asserts the rule text.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const validator = readFileSync(resolve(__dirname, '../../agents/validator.md'), 'utf8');

describe('validator zero-item evidence rule', () => {
  it('Skeptical-by-Default item 5 names the zero-item pass as missing evidence', () => {
    const item5 = validator.split('\n').find((l) => /^5\. \*\*Default to FAIL for missing evidence/.test(l));
    expect(item5, 'item 5 line exists').toBeDefined();
    expect(item5).toContain('zero items');
  });

  it('Skeptical-by-Default item 5 makes the evidence state the examined-item count', () => {
    const item5 = validator.split('\n').find((l) => /^5\. \*\*Default to FAIL for missing evidence/.test(l));
    expect(item5, 'item 5 line exists').toBeDefined();
    expect(item5).toContain('the evidence for a check states how many items it examined');
  });
});

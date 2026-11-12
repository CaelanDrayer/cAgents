import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * ACT-01 regression: the /goal condition must name the file and the status
 * value that the verify-completion Stop hook really writes. The hook writes
 * SESSION_DIR/completion_summary.yaml (not workflow/) with a lowercase status.
 * Origin: session act_streamline-cleanup-plugin_261111_001, WI-37.
 */
const ROOT = join(__dirname, '..', '..');
const HOOK = readFileSync(join(ROOT, '.claude', 'hooks', 'verify-completion.cjs'), 'utf8');
const FILES = ['.claude/skills/act/SKILL.md', '.claude/skills/helper/SKILL.md'];

describe('ACT-01: /goal condition names the hook-written completion summary', () => {
  it('the hook writes completion_summary.yaml directly under the session dir', () => {
    expect(HOOK).toMatch(/path\.join\(sessionDir,\s*'completion_summary\.yaml'\)/);
    expect(HOOK).toMatch(/'completed'/);
  });

  for (const rel of FILES) {
    describe(rel, () => {
      const text = readFileSync(join(ROOT, rel), 'utf8');
      const goals = [...text.matchAll(/\/goal\s+["'][^\n]*completion_summary\.yaml[^\n]*/g)].map((m) => m[0]);

      it('has at least one /goal condition that references completion_summary.yaml', () => {
        expect(goals.length).toBeGreaterThanOrEqual(1);
      });

      it('never places completion_summary.yaml under workflow/', () => {
        expect(goals.filter((g) => /workflow\/completion_summary\.yaml/.test(g))).toEqual([]);
      });

      it('uses the lowercase status the hook writes', () => {
        for (const g of goals) {
          expect(g).not.toMatch(/status: COMPLETED/);
          expect(g).toMatch(/status: completed/);
        }
      });
    });
  }
});

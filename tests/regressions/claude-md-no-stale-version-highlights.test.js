import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Regression test for V11.2.15 — Q-010 / F-docs-002.
 *
 * Bug: CLAUDE.md "## V10.18.0 Highlights" section advertised pre-V11 release
 * notes as if they were current. Project is on V11.2.x; the V10.18.0 highlights
 * are 1 major + 18 minors behind and should not appear in the canonical
 * project-memory file.
 *
 * Root cause: the Highlights section was added in V10.18.0 and survived the
 * V10→V11 major bump unchanged. The triage queue (Q-010) chose OPTION B
 * (delete) over OPTION A (refresh) because README.md and docs/RELEASE_NOTES.md
 * already cover recent-features and CLAUDE.md should not duplicate that
 * drift-prone content.
 *
 * Test added: this file. Parses CLAUDE.md Quick Reference `**Version**:` line
 * to extract the current version, finds every `## V<N>.<M>.<P> Highlights`
 * heading, asserts none is more than `MAX_MINOR_LAG` (2) minor versions behind
 * the current version. Cross-major comparison is an automatic fail since any
 * earlier major is more than 2 minors behind any later major release.
 *
 * Could have caught by: a documentation-currency invariant test (this file).
 */

const ROOT = process.cwd();
const MAX_MINOR_LAG = 2;

function parseCurrentVersion(claudeMd) {
  // Quick Reference line shape: `**Version**: 11.2.15`
  const m = claudeMd.match(/^\*\*Version\*\*:\s*(\d+)\.(\d+)\.(\d+)/m);
  if (!m) return null;
  return { major: parseInt(m[1], 10), minor: parseInt(m[2], 10), patch: parseInt(m[3], 10) };
}

function findHighlightsHeadings(claudeMd) {
  // Pattern: `## V<N>.<M>.<P> Highlights` (heading line). Case-sensitive on
  // "Highlights" to avoid matching the lowercase prose `Highlights:` tag used
  // inside other sections (e.g., the `/designer, /improve, /helper` block).
  const out = [];
  const re = /^##\s+V(\d+)\.(\d+)\.(\d+)\s+Highlights\s*$/gm;
  let m;
  while ((m = re.exec(claudeMd)) !== null) {
    out.push({
      heading: m[0],
      major: parseInt(m[1], 10),
      minor: parseInt(m[2], 10),
      patch: parseInt(m[3], 10),
    });
  }
  return out;
}

describe('CLAUDE.md has no stale "Highlights" sections (Q-010)', () => {
  const claudeMd = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const current = parseCurrentVersion(claudeMd);

  it('Quick Reference Version line parses correctly', () => {
    expect(
      current,
      'CLAUDE.md must contain a Quick Reference line of the form `**Version**: X.Y.Z`',
    ).not.toBeNull();
  });

  it('no `## V<N>.<M>.<P> Highlights` heading is more than 2 minor versions behind current', () => {
    if (!current) return; // first sub-test already failed
    const headings = findHighlightsHeadings(claudeMd);
    const stale = [];
    for (const h of headings) {
      // Cross-major comparison is automatic fail. A heading with a different
      // major than `current` is by construction more than 2 minors behind any
      // version in the current major (since version policy resets minor on
      // major bump).
      if (h.major !== current.major) {
        stale.push({
          ...h,
          reason: `cross-major: heading is V${h.major}.x but current is V${current.major}.${current.minor}.${current.patch}`,
        });
        continue;
      }
      const lag = current.minor - h.minor;
      if (lag > MAX_MINOR_LAG) {
        stale.push({
          ...h,
          reason: `same-major lag ${lag} > ${MAX_MINOR_LAG} (heading V${h.major}.${h.minor}.${h.patch}, current V${current.major}.${current.minor}.${current.patch})`,
        });
      }
    }
    expect(
      stale,
      `CLAUDE.md contains stale Highlights heading(s) more than ${MAX_MINOR_LAG} minor versions behind V${current?.major}.${current?.minor}.${current?.patch}:\n` +
        stale.map((s) => `  - "${s.heading}" — ${s.reason}`).join('\n'),
    ).toEqual([]);
  });
});

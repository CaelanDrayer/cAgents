import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Regression test for the V12.67.0 release-doc accuracy fixes (DOC-1 / DOC-2).
 *
 * Bug DOC-1: `scripts/sync-versions.sh:169` rewrites the README.md "Current
 * release" Version History bullet with an in-place `sed -i` that swaps ONLY the
 * version token:
 *
 *     sed -i "s/\*\*V[0-9]*\.[0-9]*\.[0-9]*\*\* — Current release/\*\*V$VERSION\*\* — Current release/"
 *
 * Two defects fall out of that one substitution:
 *   (a) FROZEN PROSE — the ~90 words after the token are untouched, so the
 *       bullet kept describing v12.19.0's work while claiming to be the current
 *       release, dragged forward across every bump since.
 *   (b) CONSUMED PREDECESSOR — because the rewrite is in place rather than an
 *       insertion, the previous release's bullet is not pushed down, it is
 *       OVERWRITTEN. The predecessor's entry simply vanishes from the history.
 *
 * Bug DOC-2: docs/RELEASE_NOTES.md declared `**Current Version**: <v>` for a
 * version the file contained no `## V<v>` section for. A header version alone
 * is not documentation.
 *
 * Root cause: version synchronization was mechanized (token substitution) but
 * the prose those tokens label was not, and nothing asserted that a version
 * claimed in a header actually had content behind it.
 *
 * Fixed by: WI-06/WI-07 (doc content) and WI-08 (matching shell assertions in
 * `scripts/ci/validate-versions.sh` slots 13 and 15).
 *
 * Test added: this file — the Vitest half of the guard, so the invariant holds
 * under `npm test` and not only under the CI shell script.
 *
 * NOTE ON ARM 4: the byte-identity arm (arm 3) does NOT catch DOC-1(b). After an
 * in-place rewrite the bullet physically above the current one belongs to the
 * release BEFORE the consumed one, and its prose differs, so identity comparison
 * passes. Only the "predecessor bullet still present" arm detects the deletion.
 * Both arms are kept: arm 3 catches token-swapped-prose-frozen (DOC-1(a)),
 * arm 4 catches predecessor-consumed (DOC-1(b)).
 *
 * ISOLATION: this test reads ONLY git-tracked repository files. It reads no
 * `cagents-memory/` runtime state, no session directories, and no git-ignored
 * path, so it behaves identically on a fresh clone. The complete set of files
 * it opens is:
 *   - <root>/package.json          (authoritative current version)
 *   - <root>/README.md             (Version History bullets)
 *   - <root>/docs/RELEASE_NOTES.md (## V<version> section headings)
 *   - <root>/CHANGELOG.md          (## [x.y.z] headings -> previous version)
 *
 * `<root>` is this repository, resolved from the test file's own location so the
 * result does not depend on the caller's cwd. It is pinned to that location with
 * no environment override, so the files these checks read cannot be redirected
 * at runtime.
 *
 * Could have caught by: exactly this invariant — asserting that a version
 * claimed in docs has both a section of its own and prose distinct from its
 * predecessor's, and that the predecessor's entry survived the bump.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const PACKAGE_JSON = join(ROOT, 'package.json');
const README = join(ROOT, 'README.md');
const RELEASE_NOTES = join(ROOT, 'docs', 'RELEASE_NOTES.md');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** Escape a version string for safe interpolation into a RegExp. */
function reEscape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Every `## [x.y.z]` heading in CHANGELOG.md, in file order.
 * `## [Unreleased]` is not semver and is skipped by construction.
 */
function changelogVersions(text) {
  const out = [];
  const re = /^##\s+\[(\d+\.\d+\.\d+)\]/gm;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  return out;
}

/**
 * Every README Version History highlight bullet, in file order.
 * Shape: `- **V12.67.0** — <prose>`
 */
function readmeBullets(text) {
  const out = [];
  const re = /^- \*\*V(\d+\.\d+\.\d+)\*\* — (.*)$/gm;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ version: m[1], prose: m[2] });
  }
  return out;
}

/**
 * Strip the "Current release." marker so the comparison sees only the
 * descriptive prose. Without this, a frozen bullet whose only edit was the
 * version token would still differ from its predecessor by that marker alone
 * and slip past the identity check. Mirrors the `${CUR_BULLET#Current release. }`
 * parameter expansion in scripts/ci/validate-versions.sh slot 13.
 */
function proseOnly(bullet) {
  if (bullet == null) return null;
  return bullet.replace(/^Current release\.\s*/, '').trim();
}

describe('release docs describe the version they claim (DOC-1 / DOC-2)', () => {
  const pkgRaw = read(PACKAGE_JSON);
  const readmeRaw = read(README);
  const notesRaw = read(RELEASE_NOTES);
  const changelogRaw = read(CHANGELOG);

  const version = pkgRaw ? JSON.parse(pkgRaw).version : null;
  const changelogVers = changelogRaw ? changelogVersions(changelogRaw) : [];
  const bullets = readmeRaw ? readmeBullets(readmeRaw) : [];

  // The previous release is CHANGELOG.md's second `## [x.y.z]` heading in the
  // normal case where the first is the current release. Selecting "first entry
  // that is not the current version" yields that same heading while staying
  // correct if the current version has no CHANGELOG entry yet.
  const previousVersion = changelogVers.find((v) => v !== version) ?? null;

  const currentBullet = bullets.find((b) => b.version === version) ?? null;
  const previousBullet = previousVersion
    ? (bullets.find((b) => b.version === previousVersion) ?? null)
    : null;

  it('inputs parse: package.json version and at least two CHANGELOG releases', () => {
    expect(version, `package.json not found or has no version at ${PACKAGE_JSON}`).toMatch(
      /^\d+\.\d+\.\d+$/,
    );
    expect(readmeRaw, `README.md not found at ${README}`).not.toBeNull();
    expect(notesRaw, `docs/RELEASE_NOTES.md not found at ${RELEASE_NOTES}`).not.toBeNull();
    expect(
      changelogVers.length,
      `CHANGELOG.md must contain at least two \`## [x.y.z]\` release headings to derive the previous release; found ${changelogVers.length}: ${JSON.stringify(changelogVers)}`,
    ).toBeGreaterThanOrEqual(2);
  });

  // ARM 1 (DOC-2)
  it('docs/RELEASE_NOTES.md has a `## V<version>` SECTION for the current version', () => {
    const heading = new RegExp(`^## V${reEscape(version ?? 'x.y.z')}(\\s|$)`, 'm');
    expect(
      heading.test(notesRaw ?? ''),
      `docs/RELEASE_NOTES.md has no section heading matching /^## V${version}/. ` +
        'The version appearing elsewhere in the file (e.g. the "**Current Version**" ' +
        'header line) does NOT satisfy this: a header version with no section behind ' +
        'it is the DOC-2 defect. Add a `## V' +
        version +
        ' — <date> (<summary>)` section describing this release.',
    ).toBe(true);
  });

  // ARM 2
  it('README.md Version History has a highlight bullet naming the current version', () => {
    expect(
      currentBullet,
      `README.md Version History has no \`- **V${version}** — …\` bullet. ` +
        `Bullets found: ${JSON.stringify(bullets.map((b) => b.version))}`,
    ).not.toBeNull();
  });

  // ARM 3 (DOC-1a): token rewritten, prose frozen.
  it('current bullet prose is not byte-identical to the preceding version bullet', () => {
    if (!currentBullet) return; // ARM 2 owns the missing-bullet failure

    const cur = proseOnly(currentBullet.prose);

    if (previousBullet) {
      expect(
        cur,
        `README.md V${version} bullet prose is byte-identical to V${previousVersion}'s. ` +
          'This is the DOC-1 signature: sync-versions.sh rewrote the version token ' +
          'and left the prose frozen. Write prose describing what V' +
          version +
          ' actually changed.\n' +
          `  prose: "${cur}"`,
      ).not.toBe(proseOnly(previousBullet.prose));
    }

    // Non-vacuous companion: frozen prose is a defect against ANY other bullet,
    // not only the immediate predecessor's, and this arm still runs when the
    // predecessor bullet has been consumed entirely.
    const twins = bullets
      .filter((b) => b.version !== version && proseOnly(b.prose) === cur)
      .map((b) => b.version);
    expect(
      twins,
      `README.md V${version} bullet prose is byte-identical to the bullet(s) for ` +
        `${twins.join(', ')} — the version token was rewritten but the prose was not.`,
    ).toEqual([]);
  });

  // ARM 4 (DOC-1b): the arm that actually catches the in-place rewrite.
  it("previous release's bullet survived the bump (in-place rewrite consumes it)", () => {
    expect(
      previousVersion,
      'could not derive the previous release from CHANGELOG.md',
    ).not.toBeNull();

    expect(
      previousBullet,
      `README.md Version History has no bullet for the previous release V${previousVersion} ` +
        `(derived from CHANGELOG.md). An in-place version-token rewrite CONSUMES the ` +
        `predecessor's bullet instead of pushing it down, so the entry vanishes. Add a ` +
        `NEW bullet for V${version} above the retained V${previousVersion} bullet.\n` +
        `  bullets present: ${JSON.stringify(bullets.map((b) => b.version))}`,
    ).not.toBeNull();
  });
});

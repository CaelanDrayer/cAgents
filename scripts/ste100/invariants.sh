#!/usr/bin/env bash
#
# ste100 invariant guard -- enforces mandate M11 mechanically.
#
#   A rewrite may change PROSE. It may never change STRUCTURE or TECHNICAL DATA.
#
# This script only DETECTS and REPORTS. It never edits, never auto-fixes, and
# never touches a corpus file.
#
# USAGE
#   scripts/ste100/invariants.sh <git-ref> <path> [<path> ...]
#   scripts/ste100/invariants.sh <git-ref> --from-file <list>   # newline-separated paths
#   scripts/ste100/invariants.sh --compare-files <before> <after>
#
#   <git-ref> is the BEFORE state (HEAD, a stash ref, a commit sha). The working
#   tree is the AFTER state. Paths may be absolute or repo-relative; a directory
#   argument is expanded to the .md/.cjs/.js files beneath it.
#
#   --compare-files compares two arbitrary files directly with no git involved.
#   It exists so the fixture pairs in tests/fixtures/ste100/ can be checked
#   without committing anything; the invariants applied are identical.
#
# EXIT
#   0  every invariant holds
#   1  at least one invariant was violated (each violation printed as
#      path:line: INVARIANT: detail)
#   2  usage / environment error
#
# INVARIANTS (markdown)
#   1 HEADING          every ^#{1,6} heading identical in count, text and order
#   2 FENCE            every fenced block byte-identical
#   3 INLINE_CODE      multiset of `backtick spans` preserved
#   4 LINK             multiset of ](targets) and bare path-like tokens preserved
#   5 FRONTMATTER      top-level YAML key SET identical (values may move)
#   6 AT_REF           multiset of @path references preserved
#   7 NUMERAL          multiset of versions (v?N.N.N) and >=2-digit integers preserved
#   9 FILENAME         multiset of name.ext tokens preserved -- NO slash required
#
# INVARIANTS (.cjs / .js / .mjs)
#   2, 3, 6, 7, 9 as above, plus
#   8 CODE_LINE        every line that is NOT a comment (^\s*(//|/*|*)) byte-identical
#  10 GUTTER           per-file count of 2+-space runs on comment lines never drops
#
# NOTES
#   - A path that did not exist at <git-ref> is a no-op, not a violation.
#   - A path that existed at <git-ref> and is gone from the working tree IS a
#     violation (FILE_REMOVED).
#   - Invariants 3/4/6/7/9 are evaluated on non-fence lines only for markdown
#     (fence bodies are already compared byte-for-byte by invariant 2).
#   - Frontmatter is scanned by 3/4/6/7/9 like any other prose: a `description:`
#     rewrite may change wording, but it may not drop a path, version or count.
#   - Invariant 9 requires no slash ON PURPOSE. A bare filename is the shape a
#     word substitution corrupts (verify-completion.cjs -> make sure-completion.cjs)
#     and invariant 4's matcher, which requires a slash, is structurally blind to
#     it. For code files invariant 9 reads comment lines too, because that is
#     where such corruption lands.
#   - Invariant 10 is the narrow counterpart to invariant 8's comment exemption.
#     8 still ignores comment bodies wholesale; 10 only asks whether their
#     deliberate multi-space alignment gutters survived. Code files only, so the
#     markdown corpus cannot trip it.
#   - Neither 9 nor 10 looks at line count or line position, so reflowing a
#     paragraph onto one-sentence-per-line is inert to both.
#
# PERFORMANCE
#   One awk process and one node process for the whole run, one git ls-tree, one
#   git archive|tar. Each file is read exactly once per side per pass.
#   Invariants 9 and 10 live in the node pass because the system awk is mawk,
#   which mis-parses regex intervals. The node pass prints its own violations
#   and hands its count to awk as PREVIOL, so the single summary line and the
#   process exit code stay authoritative.
#
set -uo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAXV_PER_FILE="${STE100_MAX_VIOLATIONS:-25}"

die() { printf 'ste100-invariants: %s\n' "$*" >&2; exit 2; }
usage() {
  # Range must cover the whole header block above `set -uo pipefail`; widen it
  # whenever that block grows, or the invariant list is truncated mid-list.
  sed -n '3,70p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 2
}

# ---------------------------------------------------------------- awk program
AWK_PROG="$(mktemp -t ste100-inv-XXXXXX.awk)" || die "mktemp failed"
NODE_PROG="$(mktemp -t ste100-inv-XXXXXX.js)" || die "mktemp failed"
WORKDIR="$(mktemp -d -t ste100-inv-XXXXXX)" || die "mktemp -d failed"
trap 'rm -rf "$AWK_PROG" "$NODE_PROG" "$WORKDIR"' EXIT

cat > "$AWK_PROG" <<'STE100_AWK'
# Reads MANIFEST: before_path \t after_path \t display_path \t isCode
# Emits one line per violation; exits 1 if any.

function trunc(s,   t) {
  gsub(/\n/, "\\n", s)
  if (length(s) <= 100) return s
  return substr(s, 1, 97) "..."
}

function untag(k) { sub(/^[A-Z]:/, "", k); return k }

function report(disp, ln, name, detail) {
  if (VPF[disp] >= MAXV) { if (VPF[disp] == MAXV) { printf "%s: ... further violations suppressed (STE100_MAX_VIOLATIONS=%d)\n", disp, MAXV; VPF[disp]++ } ; NV++; return }
  VPF[disp]++
  NV++
  printf "%s:%d: %s: %s\n", disp, ln, name, detail
}

# Collect every protected token on one line.
function tokline(s, ln, IC, ICL, LT, LTL, AT, ATL, NU, NUL,   rest, t, tmp) {
  rest = s
  while (match(rest, "`[^`]+`")) {
    t = substr(rest, RSTART, RLENGTH)
    IC[t]++; if (!(t in ICL)) ICL[t] = ln
    rest = substr(rest, RSTART + RLENGTH)
  }
  rest = s
  while (match(rest, "\\]\\([^)]*\\)")) {
    t = "L:" substr(rest, RSTART + 2, RLENGTH - 3)
    LT[t]++; if (!(t in LTL)) LTL[t] = ln
    rest = substr(rest, RSTART + RLENGTH)
  }
  rest = s
  while (match(rest, "@[A-Za-z0-9_][A-Za-z0-9_./-]*")) {
    t = substr(rest, RSTART, RLENGTH)
    AT[t]++; if (!(t in ATL)) ATL[t] = ln
    rest = substr(rest, RSTART + RLENGTH)
  }
  # bare path-like tokens: must carry a file extension or a trailing slash, so
  # that prose pairs such as REST/GraphQL or PASS/FAIL are not treated as paths.
  rest = s
  while (match(rest, "[A-Za-z0-9_.{}*-]+/[A-Za-z0-9_.{}/*-]*")) {
    t = substr(rest, RSTART, RLENGTH)
    rest = substr(rest, RSTART + RLENGTH)
    if (t !~ "[A-Za-z0-9]/") continue
    if (t ~ "\\.[A-Za-z0-9][A-Za-z0-9]?[A-Za-z0-9]?[A-Za-z0-9]?[A-Za-z0-9]?$" || t ~ "/$") {
      t = "P:" t
      LT[t]++; if (!(t in LTL)) LTL[t] = ln
    }
  }
  rest = s; tmp = ""
  while (match(rest, "v?[0-9]+\\.[0-9]+\\.[0-9]+")) {
    t = "V:" substr(rest, RSTART, RLENGTH)
    NU[t]++; if (!(t in NUL)) NUL[t] = ln
    tmp = tmp substr(rest, 1, RSTART - 1) " "
    rest = substr(rest, RSTART + RLENGTH)
  }
  tmp = tmp rest
  while (match(tmp, "[0-9][0-9]+")) {
    t = "N:" substr(tmp, RSTART, RLENGTH)
    NU[t]++; if (!(t in NUL)) NUL[t] = ln
    tmp = substr(tmp, RSTART + RLENGTH)
  }
}

function scanfile(path, isCode, HD, HDL, FB, FBL, IC, ICL, LT, LTL, FM, AT, ATL, NU, NUL, CD, CDL, C,
                  line, ln, infence, infm, fchar, flen, cur, startln, t, key, hashes) {
  ln = 0; infence = 0; infm = 0
  C["h"] = 0; C["f"] = 0; C["c"] = 0
  while ((getline line < path) > 0) {
    ln++
    if (!isCode) {
      if (ln == 1 && line ~ "^---[ \t]*$") { infm = 1; tokline(line, ln, IC, ICL, LT, LTL, AT, ATL, NU, NUL); continue }
      if (infm) {
        if (line ~ "^(---|\\.\\.\\.)[ \t]*$") { infm = 0 }
        else if (line ~ "^[A-Za-z_][A-Za-z0-9_.-]*[ \t]*:") { key = line; sub("[ \t]*:.*", "", key); FM[key] = 1 }
        tokline(line, ln, IC, ICL, LT, LTL, AT, ATL, NU, NUL)
        continue
      }
    }
    if (infence) {
      cur = cur "\n" line
      t = line; gsub("^[ \t]+", "", t); gsub("[ \t]+$", "", t)
      if (((fchar == "`" && t ~ "^`+$") || (fchar == "~" && t ~ "^~+$")) && length(t) >= flen) {
        C["f"]++; FB[C["f"]] = cur; FBL[C["f"]] = startln; infence = 0
      }
      continue
    }
    if (line ~ "^[ \t]*(```|~~~)") {
      infence = 1; startln = ln; cur = line
      t = line; gsub("^[ \t]+", "", t)
      fchar = substr(t, 1, 1)
      flen = 0; while (substr(t, flen + 1, 1) == fchar) flen++
      continue
    }
    if (isCode) {
      if (line !~ "^[ \t]*(//|/\\*|\\*)") { C["c"]++; CD[C["c"]] = line; CDL[C["c"]] = ln }
    } else if (line ~ "^#+ ") {
      hashes = line; sub(" .*", "", hashes)
      if (length(hashes) <= 6) { C["h"]++; HD[C["h"]] = line; HDL[C["h"]] = ln }
    }
    tokline(line, ln, IC, ICL, LT, LTL, AT, ATL, NU, NUL)
  }
  close(path)
  if (infence) { C["f"]++; FB[C["f"]] = cur; FBL[C["f"]] = startln }
}

# Ordered sequence comparison (headings, fences, code lines).
function cmpseq(disp, name, B, BL, A, AL, nb, na,   i, n) {
  n = (nb < na) ? nb : na
  for (i = 1; i <= n; i++) {
    if (B[i] != A[i]) {
      report(disp, AL[i], name, sprintf("#%d changed: before(L%d)=[%s] after=[%s]", i, BL[i], trunc(B[i]), trunc(A[i])))
      return
    }
  }
  if (nb > na) report(disp, (na > 0 ? AL[na] : 1), name, sprintf("count %d -> %d; dropped #%d (before L%d)=[%s]", nb, na, na + 1, BL[na + 1], trunc(B[na + 1])))
  else if (na > nb) report(disp, AL[nb + 1], name, sprintf("count %d -> %d; added #%d=[%s]", nb, na, nb + 1, trunc(A[nb + 1])))
}

# Unordered multiset comparison (inline code, links, @refs, numerals).
function cmpmulti(disp, name, B, BL, A, AL,   k) {
  for (k in B) if (A[k] != B[k]) report(disp, BL[k], name, sprintf("[%s] occurrences %d -> %d", trunc(untag(k)), B[k], (k in A) ? A[k] : 0))
  for (k in A) if (!(k in B)) report(disp, AL[k], name, sprintf("[%s] added (%d occurrences, absent before)", trunc(untag(k)), A[k]))
}

function cmpset(disp, name, B, A,   k) {
  for (k in B) if (!(k in A)) report(disp, 1, name, sprintf("key [%s] removed", k))
  for (k in A) if (!(k in B)) report(disp, 1, name, sprintf("key [%s] added", k))
}

function compare(bpath, apath, disp, isCode,
  HDB,HDLB,FBB,FBLB,ICB,ICLB,LTB,LTLB,FMB,ATB,ATLB,NUB,NULB,CDB,CDLB,CB,
  HDA,HDLA,FBA,FBLA,ICA,ICLA,LTA,LTLA,FMA,ATA,ATLA,NUA,NULA,CDA,CDLA,CA) {
  scanfile(bpath, isCode, HDB,HDLB,FBB,FBLB,ICB,ICLB,LTB,LTLB,FMB,ATB,ATLB,NUB,NULB,CDB,CDLB,CB)
  scanfile(apath, isCode, HDA,HDLA,FBA,FBLA,ICA,ICLA,LTA,LTLA,FMA,ATA,ATLA,NUA,NULA,CDA,CDLA,CA)

  if (!isCode) cmpseq(disp, "HEADING", HDB, HDLB, HDA, HDLA, CB["h"], CA["h"])
  cmpseq(disp, "FENCE", FBB, FBLB, FBA, FBLA, CB["f"], CA["f"])
  if (isCode) cmpseq(disp, "CODE_LINE", CDB, CDLB, CDA, CDLA, CB["c"], CA["c"])
  cmpmulti(disp, "INLINE_CODE", ICB, ICLB, ICA, ICLA)
  cmpmulti(disp, "LINK",        LTB, LTLB, LTA, LTLA)
  cmpmulti(disp, "AT_REF",      ATB, ATLB, ATA, ATLA)
  cmpmulti(disp, "NUMERAL",     NUB, NULB, NUA, NULA)
  if (!isCode) cmpset(disp, "FRONTMATTER", FMB, FMA)
}

BEGIN {
  NV = 0 + PREVIOL; NF_FILES = 0
  if (MAXV == "") MAXV = 25
  while ((getline rec < MANIFEST) > 0) {
    n = split(rec, f, "\t")
    if (n < 4) continue
    NF_FILES++
    compare(f[1], f[2], f[3], (f[4] == "code") ? 1 : 0)
  }
  close(MANIFEST)
  if (NV > 0) printf "ste100-invariants: FAIL -- %d violation(s) across %d file(s)\n", NV, NF_FILES
  else printf "ste100-invariants: OK -- %d file(s), all invariants hold\n", NF_FILES
  exit (NV > 0) ? 1 : 0
}
STE100_AWK

# --------------------------------------------------------------- node program
cat > "$NODE_PROG" <<'STE100_NODE'
'use strict';
//
// ste100 invariants 9 (FILENAME) and 10 (GUTTER) -- the node half of the guard.
//
// Reads the same MANIFEST the awk pass reads:
//     before_path \t after_path \t display_path \t code|md
//
// Emits ONLY violation lines, in the shared `path:line: INVARIANT: detail`
// format. The summary line and the exit status belong to the awk pass, so the
// total violation count is written to STE100_COUNT_FILE for the caller to fold
// into awk's PREVIOL.
//
// These two live here rather than in the awk program because the system awk is
// mawk, which mis-parses regex intervals and silently returns wrong answers.
//
//  9 FILENAME  The multiset of name.ext tokens must survive byte-identical. No
//              slash is required: a slashless filename is exactly the shape a
//              word substitution corrupts, and invariant 4's bare-path matcher
//              cannot see it. Markdown skips fence bodies (invariant 2 already
//              compares those byte-for-byte); code files scan every line,
//              comments INCLUDED, because that is where the corruption landed.
// 10 GUTTER    On comment lines of code files only, the per-file count of
//              2-or-more-space runs may not decrease. The leading indent and
//              comment marker are stripped before counting, so re-indentation
//              is not counted and what is measured is the alignment gutter.
//
// Both are whole-file aggregates keyed on content, never on line number or line
// count, so a one-sentence-per-line reflow cannot trip either.

const fs = require('fs');

const MANIFEST = process.env.STE100_MANIFEST || '';
const COUNT_FILE = process.env.STE100_COUNT_FILE || '';
const MAXV = (function () {
  const n = parseInt(process.env.STE100_MAXV || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 25;
}());

// name.ext, extensions case-sensitive and exactly this list. The trailing
// lookahead is what keeps foo.js from matching inside foo.jsx and x.md from
// matching inside x.mdx. Longest-first alternation for readability.
const FILENAME_RE =
  /[A-Za-z0-9_][A-Za-z0-9_.-]*\.(?:json|yaml|mjs|cjs|yml|txt|js|md|sh|ts)(?![A-Za-z0-9])/g;
// Same comment predicate invariant 8 uses -- 8's exemption is left untouched.
const COMMENT_RE = /^[ \t]*(?:\/\/|\/\*|\*)/;
const MARKER_RE = /^[ \t]*(?:\/\/+|\/\*+|\*)/;
const RUN_RE = / {2,}/g;

let nv = 0;
const vpf = new Map();
const out = [];

function trunc(s) {
  const t = s.replace(/\n/g, '\\n');
  return t.length <= 100 ? t : t.slice(0, 97) + '...';
}

// Mirrors the awk program's report(): same format, same per-display-path cap.
function report(disp, ln, name, detail) {
  const c = vpf.get(disp) || 0;
  if (c >= MAXV) {
    if (c === MAXV) {
      out.push(disp + ': ... further violations suppressed (STE100_MAX_VIOLATIONS=' + MAXV + ')');
      vpf.set(disp, c + 1);
    }
    nv++;
    return;
  }
  vpf.set(disp, c + 1);
  nv++;
  out.push(disp + ':' + ln + ': ' + name + ': ' + detail);
}

// An unreadable side reads as empty, which is how awk's getline behaves.
function readLines(path) {
  let text;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (e) {
    return [];
  }
  if (text.endsWith('\n')) text = text.slice(0, -1);
  return text === '' ? [] : text.split('\n');
}

function addTokens(line, ln, counts, firstLine) {
  FILENAME_RE.lastIndex = 0;
  let m;
  while ((m = FILENAME_RE.exec(line)) !== null) {
    const t = m[0];
    counts.set(t, (counts.get(t) || 0) + 1);
    if (!firstLine.has(t)) firstLine.set(t, ln);
  }
}

// Markdown: mirrors the awk scanner's frontmatter and fence bookkeeping so the
// two passes agree on which lines are prose. Code: every line, no exemptions.
function scan(path, isCode) {
  const lines = readLines(path);
  const counts = new Map();
  const firstLine = new Map();
  let gutters = 0;
  let infence = false;
  let infm = false;
  let fchar = '';
  let flen = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    if (!isCode) {
      if (ln === 1 && /^---[ \t]*$/.test(line)) {
        infm = true;
        addTokens(line, ln, counts, firstLine);
        continue;
      }
      if (infm) {
        if (/^(?:---|\.\.\.)[ \t]*$/.test(line)) infm = false;
        addTokens(line, ln, counts, firstLine);
        continue;
      }
      if (infence) {
        const t = line.replace(/^[ \t]+/, '').replace(/[ \t]+$/, '');
        if (((fchar === '`' && /^`+$/.test(t)) || (fchar === '~' && /^~+$/.test(t))) &&
            t.length >= flen) {
          infence = false;
        }
        continue;
      }
      if (/^[ \t]*(?:```|~~~)/.test(line)) {
        infence = true;
        const t = line.replace(/^[ \t]+/, '');
        fchar = t.charAt(0);
        flen = 0;
        while (t.charAt(flen) === fchar) flen++;
        continue;
      }
    }

    addTokens(line, ln, counts, firstLine);

    if (isCode && COMMENT_RE.test(line)) {
      const runs = line.replace(MARKER_RE, '').match(RUN_RE);
      if (runs) gutters += runs.length;
    }
  }
  return { counts: counts, firstLine: firstLine, gutters: gutters };
}

function compare(bpath, apath, disp, isCode) {
  const B = scan(bpath, isCode);
  const A = scan(apath, isCode);

  // 9 FILENAME. A count that drops (including to 0) means a filename was eaten;
  // a token that is present after and absent before means one was invented.
  // An existing token merely occurring MORE often is not a corruption.
  B.counts.forEach(function (n, t) {
    const after = A.counts.get(t) || 0;
    if (after < n) {
      report(disp, B.firstLine.get(t), 'FILENAME',
        '[' + trunc(t) + '] occurrences ' + n + ' -> ' + after);
    }
  });
  A.counts.forEach(function (n, t) {
    if (!B.counts.has(t)) {
      report(disp, A.firstLine.get(t), 'FILENAME',
        '[' + trunc(t) + '] added (' + n + ' occurrences, absent before)');
    }
  });

  // 10 GUTTER. One per-file violation; an increase is never a violation.
  if (isCode && A.gutters < B.gutters) {
    report(disp, 1, 'GUTTER',
      'runs of 2+ spaces on comment lines ' + B.gutters + ' -> ' + A.gutters);
  }
}

function fail(msg) {
  process.stderr.write('ste100-invariants: node pass: ' + msg + '\n');
  process.exit(2);
}

if (!MANIFEST) fail('STE100_MANIFEST unset');

let rows;
try {
  rows = fs.readFileSync(MANIFEST, 'utf8').split('\n');
} catch (e) {
  fail('cannot read manifest ' + MANIFEST + ': ' + e.message);
}

for (let i = 0; i < rows.length; i++) {
  const f = rows[i].split('\t');
  if (f.length < 4) continue;
  compare(f[0], f[1], f[2], f[3] === 'code');
}

if (out.length) process.stdout.write(out.join('\n') + '\n');

if (COUNT_FILE) {
  try {
    fs.writeFileSync(COUNT_FILE, String(nv) + '\n');
  } catch (e) {
    fail('cannot write count file ' + COUNT_FILE + ': ' + e.message);
  }
}
// Violations are reported through the count file, never through this exit code:
// the awk pass owns the guard's exit status.
process.exit(0);
STE100_NODE

# Runs invariants 9 and 10 over $MANIFEST and sets NODE_VIOL. Prints its own
# violation lines but no summary; awk folds NODE_VIOL in through PREVIOL so the
# single summary line and the final exit code account for them.
NODE_VIOL=0
run_node_pass() {
  command -v node >/dev/null 2>&1 || die "node not found (needed for invariants 9/10)"
  local countfile="$WORKDIR/node-violations.count"
  printf '0\n' > "$countfile"
  STE100_MANIFEST="$MANIFEST" STE100_COUNT_FILE="$countfile" STE100_MAXV="$MAXV_PER_FILE" \
    node "$NODE_PROG"
  local rc=$?
  [ "$rc" -eq 0 ] || die "node invariant pass failed (exit $rc)"
  NODE_VIOL="$(head -n 1 "$countfile")"
  case "$NODE_VIOL" in ''|*[!0-9]*) NODE_VIOL=0 ;; esac
}

# ------------------------------------------------------------------- argument parsing
MODE=""; REF=""; FROM_FILE=""; CF_BEFORE=""; CF_AFTER=""
declare -a RAW_PATHS=()

[ $# -eq 0 ] && usage
while [ $# -gt 0 ]; do
  case "$1" in
    --compare-files)
      [ $# -ge 3 ] || die "--compare-files needs <before> <after>"
      MODE="files"; CF_BEFORE="$2"; CF_AFTER="$3"; shift 3 ;;
    --from-file)
      [ $# -ge 2 ] || die "--from-file needs <path>"
      FROM_FILE="$2"; shift 2 ;;
    -h|--help) usage ;;
    --) shift; while [ $# -gt 0 ]; do RAW_PATHS+=("$1"); shift; done ;;
    -*) die "unknown flag: $1" ;;
    *)
      if [ -z "$REF" ] && [ "$MODE" != "files" ]; then REF="$1"; else RAW_PATHS+=("$1"); fi
      shift ;;
  esac
done

MANIFEST="$WORKDIR/manifest.tsv"
: > "$MANIFEST"

kind_of() { case "$1" in *.cjs|*.js|*.mjs) printf 'code' ;; *) printf 'md' ;; esac; }

# ------------------------------------------------------------------- mode: compare-files
if [ "$MODE" = "files" ]; then
  [ -f "$CF_BEFORE" ] || die "before file not found: $CF_BEFORE"
  [ -f "$CF_AFTER" ]  || die "after file not found: $CF_AFTER"
  printf '%s\t%s\t%s\t%s\n' "$CF_BEFORE" "$CF_AFTER" "$CF_AFTER" "$(kind_of "$CF_AFTER")" >> "$MANIFEST"
  MISSING=0   # no git side here, so FILE_REMOVED cannot occur
  run_node_pass
  awk -v MANIFEST="$MANIFEST" -v MAXV="$MAXV_PER_FILE" -v PREVIOL=$((MISSING + NODE_VIOL)) -f "$AWK_PROG"
  exit $?
fi

# ------------------------------------------------------------------- mode: git ref
[ -n "$REF" ] || usage
command -v git >/dev/null 2>&1 || die "git not found"
REPO="$(git -C "$SELF_DIR" rev-parse --show-toplevel 2>/dev/null)" || die "not inside a git repository"
git -C "$REPO" rev-parse --verify --quiet "$REF^{}" >/dev/null 2>&1 || die "bad git ref: $REF"

if [ -n "$FROM_FILE" ]; then
  [ -f "$FROM_FILE" ] || die "--from-file list not found: $FROM_FILE"
  while IFS= read -r l; do
    [ -n "$l" ] || continue
    case "$l" in \#*) continue ;; esac
    RAW_PATHS+=("$l")
  done < "$FROM_FILE"
fi
[ ${#RAW_PATHS[@]} -gt 0 ] || die "no paths given (pass paths or --from-file <list>)"

# Normalise to repo-relative, expanding directories.
declare -a RELS=()
for p in "${RAW_PATHS[@]}"; do
  case "$p" in /*) abs="$p" ;; *) abs="$REPO/$p" ;; esac
  if [ -d "$abs" ]; then
    while IFS= read -r ff; do
      RELS+=("$(realpath --relative-to="$REPO" "$ff")")
    done < <(find "$abs" -type f \( -name '*.md' -o -name '*.cjs' -o -name '*.js' \) | sort)
  else
    RELS+=("$(realpath -m --relative-to="$REPO" "$abs")")
  fi
done

# Which of those paths existed at REF? One git call.
PATHLIST="$WORKDIR/paths.txt"
printf '%s\n' "${RELS[@]}" | sort -u > "$PATHLIST"
EXISTING="$WORKDIR/existing.txt"
git -C "$REPO" ls-tree -r --name-only "$REF" -- $(cat "$PATHLIST") 2>/dev/null | sort -u > "$EXISTING"

if [ ! -s "$EXISTING" ]; then
  printf 'ste100-invariants: OK -- 0 file(s), no requested path existed at %s\n' "$REF"
  exit 0
fi

# Materialise all BEFORE blobs in one shot.
BEFORE_DIR="$WORKDIR/before"
mkdir -p "$BEFORE_DIR"
command -v tar >/dev/null 2>&1 || die "tar not found (needed to materialise the before-state)"
if ! git -C "$REPO" archive "$REF" -- $(cat "$EXISTING") 2>/dev/null | tar -x -C "$BEFORE_DIR" 2>/dev/null; then
  # Fallback: one git show per file.
  while IFS= read -r rel; do
    mkdir -p "$BEFORE_DIR/$(dirname "$rel")"
    git -C "$REPO" show "$REF:$rel" > "$BEFORE_DIR/$rel" 2>/dev/null || die "cannot read $REF:$rel"
  done < "$EXISTING"
fi

MISSING=0
while IFS= read -r rel; do
  if [ ! -f "$REPO/$rel" ]; then
    printf '%s:1: FILE_REMOVED: existed at %s, absent from the working tree\n' "$rel" "$REF"
    MISSING=$((MISSING + 1))
    continue
  fi
  printf '%s\t%s\t%s\t%s\n' "$BEFORE_DIR/$rel" "$REPO/$rel" "$rel" "$(kind_of "$rel")" >> "$MANIFEST"
done < "$EXISTING"

run_node_pass
awk -v MANIFEST="$MANIFEST" -v MAXV="$MAXV_PER_FILE" -v PREVIOL=$((MISSING + NODE_VIOL)) -f "$AWK_PROG"
exit $?

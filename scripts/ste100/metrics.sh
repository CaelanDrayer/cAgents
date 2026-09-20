#!/usr/bin/env bash
#
# ste100 metrics — the single measurement tool for the STE-100 concise-writing
# rewrite. Every before/after batch measures with this script, so its patterns
# are frozen: changing one invalidates every metric already recorded.
#
# USAGE
#   scripts/ste100/metrics.sh 'agents/*.md' 'docs/**/*.md'
#   scripts/ste100/metrics.sh --from-file /path/to/list.txt
#   scripts/ste100/metrics.sh --survey-parity 'agents/*.md'     # audit mode, see below
#
#   Arguments are paths or globs. Quote globs so this script expands them
#   itself (globstar is on, so '**' crosses directories). Globs resolve
#   relative to the repo root, never to the caller's cwd.
#
# OUTPUT
#   One JSON object on stdout with exactly these keys:
#     files lines words long_lines_20 long_lines_25 em_dashes allcaps
#     passive_signal noun_cluster_gt3 hedge_hits
#   Everything else (warnings, counts, skips) goes to stderr.
#
# EXEMPTIONS
#   scripts/ste100/exempt.txt is honoured: any input path matching a glob there
#   is dropped before measurement. Rationale: exempt files are never rewritten,
#   so counting them would pin a floor under every before/after delta. If the
#   file is absent the script warns on stderr and measures everything.
#   Matching uses bash [[ == ]], where '*' also crosses '/', so 'archive/**'
#   matches at any depth. Pass --no-exempt to disable.
#
# ---------------------------------------------------------------------------
# METRIC DEFINITIONS (frozen)
# ---------------------------------------------------------------------------
#   lines  — counted lines. For .md/.json that is every line (== wc -l). For
#            .cjs/.js it is COMMENT LINES ONLY, matched by ^\s*(//|/\*|\*).
#            Every other metric below is computed over the same counted lines,
#            so code and string literals never contribute.
#   words  — whitespace-separated fields summed over counted lines (== wc -w).
#
#   long_lines_20 / long_lines_25 — counted lines with more than 20 / more than
#            25 whitespace-separated fields, after dropping table rows, fence
#            markers, headings and horizontal rules via ^\s*(\||```|#|-{3,}),
#            AND after dropping every line inside a ``` fence. Fence state is
#            tracked PER FILE (a file with an unbalanced fence cannot swallow
#            the next file). ^\s*``` toggles the state.
#
#   em_dashes        — occurrences of U+2014.
#   allcaps          — \b(CRITICAL|MANDATORY|MUST|NEVER|ALWAYS|IMPORTANT|REQUIRED|ZERO TOLERANCE)\b
#   passive_signal   — \b(is|are|was|were|be|been|being)\s+[a-z]+(ed|en)\b
#   hedge_hits       — case-insensitive, UNANCHORED alternation over:
#            basically essentially simply just actually really very quite
#            somewhat fairly rather generally typically usually often might
#            "could potentially" "in order to" "it is important to note"
#            "note that" "please note" "as needed" "as required"
#            "where appropriate" leverage utilize facilitate robust seamless
#            comprehensive holistic delve tapestry
#            CAVEAT: the specification defines this pattern without word
#            boundaries, and it is reproduced verbatim. It therefore matches
#            inside words — "every" counts as "very", "adjust" as "just". This
#            is deliberate: fidelity to the frozen definition beats linguistic
#            purity, because the metric is only ever read as a before/after
#            delta measured by this same script. Do not add \b; doing so would
#            silently rebase every recorded hedge number.
#
#   noun_cluster_gt3 — HEURISTIC, and deliberately a rough one. Counts maximal
#            runs of 4 or more consecutive qualifying tokens; each run counts
#            once, not once per token. A token qualifies when it matches
#            /^[a-z]+$/ (pure lowercase ASCII, so punctuation, digits and
#            Capitalised words all break a run) and is not in this stoplist of
#            determiners, prepositions, conjunctions, copulas, auxiliaries,
#            pronouns and common adverbs:
#              a an the of in on at to for with by from as and or but nor so
#              yet is are was were be been being am that this these those it
#              its if then than not no per via into onto over under above
#              below about up down out off through during before after
#              between within without across against when where which who
#              whom whose what why how all any each every both few more most
#              other some such only own same too very can will just should
#              now do does did has have had may might must shall would could
#              you your we our they their he she his her i me my them us
#            It approximates "noun pile-up" and nothing more. Treat movement
#            in this number as a weak signal, never as proof.
#
# ---------------------------------------------------------------------------
# CALIBRATION (measured 2026-09-17, repo @ v12.70.0, branch main)
# ---------------------------------------------------------------------------
# Targets come from outputs/wording-surface-survey.md. Results:
#
#   [PASS  exact ]  metrics.sh 'agents/*.md' -> em_dashes 301   (target 301)
#   [PASS  exact ]  metrics.sh 'agents/*.md' -> allcaps    52   (target 52)
#   [PASS  -0.71%]  corpus long_lines_25        3516            (target 3541)
#   [DELTA -1.43%]  corpus em_dashes            5947            (target 6033)
#
# "corpus" here means the seven surfaces the survey actually summed:
#   agents/*.md, agents/**/resources/**/*.md, .claude/skills/**/*.md,
#   .claude/rules/**/*.md, docs/**/*.md, CLAUDE.md, README.md
#   (+ .claude/hooks/*.cjs for em_dashes only), run with --no-exempt so the two
#   exempt docs files the survey counted are included.
#
# The one out-of-tolerance number is em_dashes, and it is not a pattern defect.
# It reconciles to the digit:
#   prose surfaces alone            5482   == survey's 6033 - 551, EXACT
#   + hooks, comment lines only    + 465    = 5947   <- this script's default
#   + hooks, whole file            + 551    = 6033   <- what the survey summed
# The survey counted em dashes inside hook CODE and STRING LITERALS. This script
# is required to measure .cjs/.js comment lines only, so 5947 is the correct
# number and the 86-em-dash gap IS the code-and-strings the spec excludes. Every
# prose surface matches the survey exactly: agents 301, agent resources 3276,
# docs 633, rules 587, skills 568, CLAUDE.md+README.md 117.
#
# long_lines_25 loses 25 lines (3541 -> 3516) to per-file fence tracking, which
# this script is required to do and the survey did not. For agents/*.md alone
# that is 181 -> 179.
#
# Independent confirmations that the line/word accounting is right. These were
# never tuned against and are not acceptance criteria:
#   allcaps over the same corpus ......  624  == the survey's published total
#   agents/*.md lines / words .........  5761 / 33992   == survey S1
#   agent resources lines / words ..... 45071 / 331887  == survey S2
#   rules lines / words ...............  8762 / 57458   == survey S5
#   CLAUDE.md + README.md .............   798 / 8517    == survey S8
#   tests comment lines / words .......  8145 / 71568   == survey S9
#   docs 13595 lines + 2550 exempted .. 16145           == survey S7
#
# --survey-parity reproduces the survey's own totals EXACTLY (em_dashes 6033,
# long_lines_25 3541). It is an AUDIT MODE: never record a before/after number
# with it. It reverts the three ways the survey's ad-hoc pipeline differed from
# a correct measurement:
#   1. No per-file fence tracking. The survey piped every file through a single
#      `cat`, so lines inside ``` fences were counted as prose.
#   2. Code measured whole-file instead of comment-only.
#   3. GNU grep binary suppression. .claude/hooks/hook-utils.cjs contains a
#      literal NUL byte, so `grep -o` silently emitted nothing for it and the
#      survey lost its 79 em dashes and 779 comment lines. Parity mode skips
#      NUL-containing files to reproduce that; default mode reads them, so the
#      true hooks whole-file em-dash count is 630, not the published 551.
#
# KNOWN DELTAS vs the survey's other published rows. Informational only; these
# were not acceptance criteria and were not used to calibrate:
#   passive_signal — agents 62 here vs 63 published, docs 311 vs 326. The
#     survey's Method section mixes rg and grep, which differ on
#     leftmost-longest alternation. The pattern above is the frozen one.
#   hedge_hits — agents 138 here vs 37 published. The survey's own table is
#     labelled "(subset pattern)"; it never ran the full alternation.
#   skills words — the survey's "S3+S4 = 74 files / 11,127 lines / 79,154 words"
#     row is internally inconsistent: 11,127 lines is the 74-file figure (which
#     this script reproduces exactly) but 79,154 words is the 76-file figure.
#     S3+S4 as specified is 76,499 words.
#
# DO NOT REIMPLEMENT THESE PATTERNS IN AWK. mawk 1.3.4 mis-parses the interval
# `-{3,}` and matches a SINGLE dash, which silently drops every markdown bullet
# line from the long-line metrics — agents/*.md reads 163 instead of 179. GNU
# grep and this script's Node counter both handle intervals correctly.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXEMPT_FILE="$REPO_ROOT/scripts/ste100/exempt.txt"

FROM_FILE=""
USE_EXEMPT=1
PARITY=0
LIST_FILES=0
declare -a PATTERNS=()
declare -a EXCLUDE=()

while [ $# -gt 0 ]; do
  case "$1" in
    --from-file) FROM_FILE="${2:-}"; [ -n "$FROM_FILE" ] || { echo "metrics.sh: --from-file needs a path" >&2; exit 2; }; shift 2 ;;
    --exclude) [ -n "${2:-}" ] || { echo "metrics.sh: --exclude needs a glob" >&2; exit 2; }; EXCLUDE+=("$2"); shift 2 ;;
    --no-exempt) USE_EXEMPT=0; shift ;;
    --survey-parity) PARITY=1; shift ;;
    --list-files) LIST_FILES=1; shift ;;
    -h|--help) awk '/^#/{print;next}{exit}' "${BASH_SOURCE[0]}" >&2; exit 0 ;;
    --*) echo "metrics.sh: unknown flag $1" >&2; exit 2 ;;
    *) PATTERNS+=("$1"); shift ;;
  esac
done

if [ -z "$FROM_FILE" ] && [ ${#PATTERNS[@]} -eq 0 ]; then
  echo "metrics.sh: no inputs. Pass globs/paths or --from-file <path>." >&2
  exit 2
fi

cd "$REPO_ROOT"
shopt -s globstar nullglob

# ---- resolve candidate paths -------------------------------------------------
declare -a CANDIDATES=()
if [ -n "$FROM_FILE" ]; then
  [ -f "$FROM_FILE" ] || { echo "metrics.sh: --from-file not found: $FROM_FILE" >&2; exit 2; }
  while IFS= read -r line; do
    line="${line%$'\r'}"
    [ -n "$line" ] || continue
    case "$line" in \#*) continue ;; esac
    CANDIDATES+=("$line")
  done < "$FROM_FILE"
fi
for pat in ${PATTERNS+"${PATTERNS[@]}"}; do
  if [ -e "$pat" ]; then
    CANDIDATES+=("$pat")
  else
    # shellcheck disable=SC2206  # intentional glob expansion of a stored pattern
    expanded=( $pat )
    if [ ${#expanded[@]} -eq 0 ]; then
      echo "metrics.sh: WARNING no match for pattern: $pat" >&2
    else
      CANDIDATES+=("${expanded[@]}")
    fi
  fi
done

# ---- exemption globs ---------------------------------------------------------
declare -a EXEMPT=()
if [ "$USE_EXEMPT" -eq 1 ]; then
  if [ -f "$EXEMPT_FILE" ]; then
    while IFS= read -r line; do
      line="${line%$'\r'}"
      case "$line" in ''|\#*) continue ;; esac
      line="${line%%#*}"                       # strip trailing '# reason'
      line="${line#"${line%%[![:space:]]*}"}"  # ltrim
      line="${line%"${line##*[![:space:]]}"}"  # rtrim
      [ -n "$line" ] && EXEMPT+=("$line")
    done < "$EXEMPT_FILE"
    echo "metrics.sh: loaded ${#EXEMPT[@]} exemption globs from $EXEMPT_FILE" >&2
  else
    echo "metrics.sh: WARNING $EXEMPT_FILE not found — measuring without exemption filtering" >&2
  fi
fi

is_exempt() {
  local p="$1" pat
  for pat in ${EXEMPT+"${EXEMPT[@]}"}; do
    # shellcheck disable=SC2053  # RHS must stay unquoted: it is a glob
    [[ "$p" == $pat ]] && return 0
  done
  return 1
}

# Same glob semantics as is_exempt, but driven by --exclude. Exemption is a
# property of the repo; exclusion is a property of ONE invocation, and exists so
# a surface can be defined as a set difference (see S4 and S11 in the coverage
# audit). It never changes how a measured line is counted.
is_excluded() {
  local p="$1" pat
  for pat in ${EXCLUDE+"${EXCLUDE[@]}"}; do
    # shellcheck disable=SC2053  # RHS must stay unquoted: it is a glob
    [[ "$p" == $pat ]] && return 0
  done
  return 1
}

# ---- filter: existing regular files, de-duplicated, not exempt ---------------
declare -a FILES=()
skipped_exempt=0
skipped_missing=0
skipped_excluded=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  if [ ! -f "$p" ]; then skipped_missing=$((skipped_missing+1)); continue; fi
  if is_exempt "$p"; then skipped_exempt=$((skipped_exempt+1)); continue; fi
  if [ ${#EXCLUDE[@]} -gt 0 ] && is_excluded "$p"; then skipped_excluded=$((skipped_excluded+1)); continue; fi
  FILES+=("$p")
done < <(printf '%s\n' ${CANDIDATES+"${CANDIDATES[@]}"} | sort -u)

echo "metrics.sh: ${#FILES[@]} files to measure (exempt-skipped $skipped_exempt, exclude-skipped $skipped_excluded, missing $skipped_missing)" >&2
[ "$LIST_FILES" -eq 1 ] && printf '%s\n' ${FILES+"${FILES[@]}"} >&2

printf '%s\n' ${FILES+"${FILES[@]}"} | STE100_PARITY="$PARITY" node -e '
"use strict";
const fs = require("fs");
const PARITY = process.env.STE100_PARITY === "1";

const RE_EM      = /—/g;
const RE_ALLCAPS = /\b(CRITICAL|MANDATORY|MUST|NEVER|ALWAYS|IMPORTANT|REQUIRED|ZERO TOLERANCE)\b/g;
const RE_PASSIVE = /\b(is|are|was|were|be|been|being)\s+[a-z]+(ed|en)\b/g;
const RE_HEDGE   = /basically|essentially|simply|just|actually|really|very|quite|somewhat|fairly|rather|generally|typically|usually|often|might|could potentially|in order to|it is important to note|note that|please note|as needed|as required|where appropriate|leverage|utilize|facilitate|robust|seamless|comprehensive|holistic|delve|tapestry/gi;

const RE_CODE    = /\.(cjs|js|mjs)$/i;
const RE_COMMENT = /^\s*(\/\/|\/\*|\*)/;
const RE_FENCE   = /^\s*```/;
const RE_NONPROSE= /^\s*(\||#|-{3,})/;

const STOP = new Set(("a an the of in on at to for with by from as and or but nor so yet " +
  "is are was were be been being am that this these those it its if then than not no per " +
  "via into onto over under above below about up down out off through during before after " +
  "between within without across against when where which who whom whose what why how all " +
  "any each every both few more most other some such only own same too very can will just " +
  "should now do does did has have had may might must shall would could you your we our " +
  "they their he she his her i me my them us").split(" "));

function count(s, re) { const m = s.match(re); return m === null ? 0 : m.length; }

function nounClusters(s) {
  const toks = s.split(/\s+/);
  let run = 0, hits = 0;
  for (const t of toks) {
    if (/^[a-z]+$/.test(t) && !STOP.has(t)) { run++; continue; }
    if (run >= 4) hits++;
    run = 0;
  }
  if (run >= 4) hits++;
  return hits;
}

const M = { files:0, lines:0, words:0, long_lines_20:0, long_lines_25:0,
            em_dashes:0, allcaps:0, passive_signal:0, noun_cluster_gt3:0, hedge_hits:0 };

let skippedBinary = 0, unreadable = 0;
const paths = fs.readFileSync(0, "utf8").split("\n").filter(Boolean);

for (const f of paths) {
  let buf;
  try { buf = fs.readFileSync(f); }
  catch (e) { unreadable++; process.stderr.write("metrics.sh: WARNING unreadable " + f + "\n"); continue; }

  // Parity mode reproduces GNU grep, which refuses to emit matches for a file
  // containing a NUL byte. Default mode reads it, which is the correct count.
  if (PARITY && buf.includes(0)) { skippedBinary++; continue; }

  const isCode = RE_CODE.test(f);
  const commentOnly = isCode && !PARITY;

  const lines = buf.toString("utf8").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  M.files++;
  let inFence = false;

  for (const line of lines) {
    if (commentOnly && !RE_COMMENT.test(line)) continue;

    M.lines++;
    const trimmed = line.trim();
    const nf = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    M.words            += nf;
    M.em_dashes        += count(line, RE_EM);
    M.allcaps          += count(line, RE_ALLCAPS);
    M.passive_signal   += count(line, RE_PASSIVE);
    M.hedge_hits       += count(line, RE_HEDGE);
    M.noun_cluster_gt3 += nounClusters(line);

    // --- prose-line gate for the long-line metrics ---
    const isFence = RE_FENCE.test(line);
    if (isFence) { if (!PARITY) inFence = !inFence; continue; }
    if (!PARITY && inFence) continue;
    if (RE_NONPROSE.test(line)) continue;
    if (nf > 25) M.long_lines_25++;
    if (nf > 20) M.long_lines_20++;
  }
}

if (skippedBinary) process.stderr.write("metrics.sh: parity mode skipped " + skippedBinary + " NUL-containing file(s)\n");
if (unreadable)    process.stderr.write("metrics.sh: " + unreadable + " unreadable file(s)\n");

process.stdout.write(JSON.stringify({
  files: M.files, lines: M.lines, words: M.words,
  long_lines_20: M.long_lines_20, long_lines_25: M.long_lines_25,
  em_dashes: M.em_dashes, allcaps: M.allcaps, passive_signal: M.passive_signal,
  noun_cluster_gt3: M.noun_cluster_gt3, hedge_hits: M.hedge_hits
}) + "\n");
'

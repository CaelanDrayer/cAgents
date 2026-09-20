#!/usr/bin/env bash
#
# validate-ste100.sh — the STE-100 gate.
#
# A THIN wrapper. Every check lives in scripts/ste100/rules.cjs, which this
# script requires in-process (controller decision CD-3). Nothing here parses
# prose, and nothing here uses awk: mawk 1.3.4 on this box reads the interval
# -{3,} as one literal dash and would void every markdown bullet (CD-7 TRAP 1).
#
# USAGE
#   scripts/ci/validate-ste100.sh <path|glob> [<path|glob> ...]
#   scripts/ci/validate-ste100.sh --from-file /path/to/list.txt
#   scripts/ci/validate-ste100.sh --stats .claude/hooks/hook-utils.cjs
#
#   Quote a glob so this script expands it (globstar is on, so ** crosses
#   directories). A glob resolves against the repo root, never the caller cwd.
#
# EXIT CODES
#   0  no violation
#   1  one or more violations
#   2  bad usage
#
# OUTPUT
#   One line per violation on stdout:  <file>:<line>: [<check>] <message>
#   Counts, skips and warnings go to stderr.
#
# CHECKS (all defined in scripts/ste100/rules.cjs)
#   sentence-20-procedural   an imperative sentence over 20 words
#   sentence-25-descriptive  a descriptive sentence over 25 words
#   em-dash                  U+2014 in instructional prose
#   paragraph-6              a paragraph over 6 sentences
#   noun-cluster-3           a noun pile-up over 3 nouns
#   passive-voice            a passive signal in an instruction
#   description-budget       an agent description over budget (CD-12 two-tier:
#                            400 chars when the description carries a mode
#                            roster, 300 chars when it does not)
#
# EXEMPTIONS
#   scripts/ste100/exempt.txt is honoured. Any input path that matches a glob
#   there is skipped. Pass --no-exempt to check everything.
#
#   ONE carve-out, listed in SELF_TEST below: this gate's own fixtures under
#   tests/fixtures/ste100/ are re-included. exempt.txt holds tests/fixtures/**
#   because vendored fixtures are consumed byte-exact, but the gate's own
#   violating.md must still fail the gate. A checker that cannot check its own
#   fixtures proves nothing.
#
# NOT MEASURED
#   Fenced code blocks and inline code spans are skipped. Fence state is tracked
#   PER FILE. For .cjs/.js/.mjs only COMMENT LINES are read, so code and string
#   literals never produce a violation. Files are read with fs.readFileSync, so
#   the NUL byte in .claude/hooks/hook-utils.cjs cannot silently drop the file
#   the way GNU grep does (CD-7 TRAP 2). Prove it with --stats.
#
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENGINE="$REPO_ROOT/scripts/ste100/rules.cjs"
EXEMPT_FILE="$REPO_ROOT/scripts/ste100/exempt.txt"

# This gate's own fixtures. exempt.txt covers tests/fixtures/** for vendored
# data; these two globs re-include the gate's self-test corpus.
SELF_TEST=( "tests/fixtures/ste100/*.md" "tests/fixtures/ste100/agents/*.md" )

FROM_FILE=""
USE_EXEMPT=1
STATS=0
QUIET=0
declare -a PATTERNS=()

while [ $# -gt 0 ]; do
  case "$1" in
    --from-file) FROM_FILE="${2:-}"; [ -n "$FROM_FILE" ] || { echo "validate-ste100.sh: --from-file needs a path" >&2; exit 2; }; shift 2 ;;
    --no-exempt) USE_EXEMPT=0; shift ;;
    --stats)     STATS=1; shift ;;
    --quiet)     QUIET=1; shift ;;
    -h|--help)   sed -n '2,/^set -uo/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//' >&2; exit 0 ;;
    --*)         echo "validate-ste100.sh: unknown flag $1" >&2; exit 2 ;;
    *)           PATTERNS+=("$1"); shift ;;
  esac
done

if [ -z "$FROM_FILE" ] && [ ${#PATTERNS[@]} -eq 0 ]; then
  echo "validate-ste100.sh: no inputs. Pass paths or globs, or --from-file <path>." >&2
  exit 2
fi
[ -f "$ENGINE" ] || { echo "validate-ste100.sh: engine not found: $ENGINE" >&2; exit 2; }

cd "$REPO_ROOT" || exit 2
shopt -s globstar nullglob

declare -a CANDIDATES=()
if [ -n "$FROM_FILE" ]; then
  [ -f "$FROM_FILE" ] || { echo "validate-ste100.sh: --from-file not found: $FROM_FILE" >&2; exit 2; }
  while IFS= read -r line; do
    line="${line%$'\r'}"
    [ -n "$line" ] || continue
    case "$line" in \#*) continue ;; esac
    CANDIDATES+=("$line")
  done < "$FROM_FILE"
fi
for pat in ${PATTERNS+"${PATTERNS[@]}"}; do
  if [ -e "$pat" ]; then
    if [ -d "$pat" ]; then
      expanded=( "$pat"/**/*.md "$pat"/**/*.cjs "$pat"/**/*.js )
      CANDIDATES+=(${expanded+"${expanded[@]}"})
    else
      CANDIDATES+=("$pat")
    fi
  else
    # shellcheck disable=SC2206  # intentional glob expansion of a stored pattern
    expanded=( $pat )
    if [ ${#expanded[@]} -eq 0 ]; then
      echo "validate-ste100.sh: WARNING no match for pattern: $pat" >&2
    else
      CANDIDATES+=("${expanded[@]}")
    fi
  fi
done

declare -a EXEMPT=()
if [ "$USE_EXEMPT" -eq 1 ]; then
  if [ -f "$EXEMPT_FILE" ]; then
    while IFS= read -r line; do
      line="${line%$'\r'}"
      case "$line" in ''|\#*) continue ;; esac
      line="${line%%#*}"
      line="${line#"${line%%[![:space:]]*}"}"
      line="${line%"${line##*[![:space:]]}"}"
      [ -n "$line" ] && EXEMPT+=("$line")
    done < "$EXEMPT_FILE"
  else
    echo "validate-ste100.sh: WARNING $EXEMPT_FILE not found; enforcing without exemption filtering" >&2
  fi
fi

is_self_test() {
  local p="$1" pat
  for pat in "${SELF_TEST[@]}"; do
    # shellcheck disable=SC2053  # RHS must stay unquoted: it is a glob
    [[ "$p" == $pat ]] && return 0
  done
  return 1
}
is_exempt() {
  local p="$1" pat
  is_self_test "$p" && return 1
  for pat in ${EXEMPT+"${EXEMPT[@]}"}; do
    # shellcheck disable=SC2053  # RHS must stay unquoted: it is a glob
    [[ "$p" == $pat ]] && return 0
  done
  return 1
}

declare -a FILES=()
skipped_exempt=0
skipped_missing=0
while IFS= read -r p; do
  [ -n "$p" ] || continue
  p="${p#./}"
  if [ ! -f "$p" ]; then skipped_missing=$((skipped_missing+1)); continue; fi
  if is_exempt "$p"; then
    skipped_exempt=$((skipped_exempt+1))
    [ "$QUIET" -eq 1 ] || echo "validate-ste100.sh: skip (exempt) $p" >&2
    continue
  fi
  FILES+=("$p")
done < <(printf '%s\n' ${CANDIDATES+"${CANDIDATES[@]}"} | sort -u)

echo "validate-ste100.sh: ${#FILES[@]} file(s) to check (exempt-skipped $skipped_exempt, missing $skipped_missing)" >&2

if [ ${#FILES[@]} -eq 0 ]; then
  echo "validate-ste100.sh: nothing to check" >&2
  exit 0
fi

printf '%s\n' "${FILES[@]}" | STE100_ENGINE="$ENGINE" STE100_STATS="$STATS" node -e '
"use strict";
const fs = require("fs");
const engine = require(process.env.STE100_ENGINE);
const stats = process.env.STE100_STATS === "1";
const paths = fs.readFileSync(0, "utf8").split("\n").filter(Boolean);
let total = 0;
const byCheck = Object.create(null);
for (const f of paths) {
  let content;
  // readFileSync, never grep: a NUL byte must not drop the file (CD-7 TRAP 2).
  try { content = fs.readFileSync(f, "utf8"); }
  catch (e) { process.stderr.write("validate-ste100.sh: WARNING unreadable " + f + "\n"); continue; }
  if (stats) {
    process.stdout.write(f + ": counted_lines=" + engine.countedLines(f, content) +
      " bytes=" + Buffer.byteLength(content) +
      " has_nul=" + (content.indexOf(String.fromCharCode(0)) >= 0) + "\n");
  }
  for (const v of engine.check(f, content)) {
    total++;
    byCheck[v.check] = (byCheck[v.check] || 0) + 1;
    process.stdout.write(f + ":" + v.line + ": [" + v.check + "] " + v.message + "\n");
  }
}
if (total === 0) {
  process.stderr.write("validate-ste100.sh: PASS, 0 violations in " + paths.length + " file(s)\n");
  process.exit(0);
}
process.stderr.write("validate-ste100.sh: FAIL, " + total + " violation(s) in " + paths.length + " file(s)\n");
for (const k of Object.keys(byCheck).sort()) {
  process.stderr.write("  " + k + ": " + byCheck[k] + "\n");
}
process.exit(1);
'

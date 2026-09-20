#!/usr/bin/env bash
#
# ste100 surface definitions — the canonical decomposition of the in-scope
# corpus into the ten measurement surfaces S1..S10 plus the residual S11.
#
#   scripts/ste100/surfaces.sh list            # surface ids + one-line identity
#   scripts/ste100/surfaces.sh globs S4        # the glob(s) defining one surface
#   scripts/ste100/surfaces.sh raw S4          # expansion BEFORE the in-scope filter
#   scripts/ste100/surfaces.sh files S4        # the file list for one surface
#   scripts/ste100/surfaces.sh metrics S4      # metrics.sh JSON for one surface
#   scripts/ste100/surfaces.sh audit           # prove the partition, exit 1 on any gap
#
# ---------------------------------------------------------------------------
# WHY SURFACES ARE INTERSECTED WITH in-scope.txt
# ---------------------------------------------------------------------------
# A surface is a VIEW of the in-scope corpus, never a second definition of it.
# Every surface list below is computed as (glob expansion) INTERSECT in-scope,
# which buys three properties that a bare glob does not:
#
#   1. No untracked leak. '.claude/rules/**/*.md' expands to 45 files on this
#      working tree but only 43 are tracked; the other 2 are in-flight drafts of
#      the STE-100 standard itself. A bare glob would have measured them and the
#      before/after delta would have been nonsense. Likewise 'cagents-memory/**'
#      expands to 70 untracked session and knowledge files.
#   2. Exemptions applied once. in-scope.txt already has exempt.txt subtracted,
#      so no surface can re-admit an exempt file by widening its glob.
#   3. A provable partition. `audit` asserts union(S1..S11) == in-scope and that
#      the surfaces are pairwise disjoint, so sum(file counts) == |in-scope|
#      by construction, not by coincidence.
#
# ---------------------------------------------------------------------------
# GLOB SEMANTICS: TWO DIFFERENT DIALECTS, DO NOT MIX THEM
# ---------------------------------------------------------------------------
# Surface globs here are expanded by the SHELL with `shopt -s globstar`, where
# '*' stops at '/' and '**' crosses it. exempt.txt globs (and metrics.sh
# --exclude) are matched with `[[ p == pat ]]`, where '*' ALSO crosses '/'.
# The same string means different things in the two dialects:
#
#   shell glob   agents/*.md  -> the 60 top-level agent files       (depth 1)
#   [[ ]] match  agents/*.md  -> EVERY .md anywhere under agents/   (any depth)
#
# That is why set differences below use `comm` against an already-expanded file
# list rather than metrics.sh --exclude. --exclude is correct only when the
# pattern is unambiguous in both dialects (S4's '.claude/skills/*/SKILL.md' is,
# because no SKILL.md exists at any other depth).
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
shopt -s globstar nullglob

IN_SCOPE="$REPO_ROOT/scripts/ste100/in-scope.txt"
[ -f "$IN_SCOPE" ] || { echo "surfaces.sh: missing $IN_SCOPE (run in-scope.sh)" >&2; exit 2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
grep -v '^#' "$IN_SCOPE" | sed '/^$/d' | sort -u > "$TMP/in.txt"

# Pure shell-glob expansion (globstar dialect: '*' stops at '/', '**' crosses).
# No filtering happens here; intersection with in-scope is a separate, explicit
# step in surface_files so the two can never be silently conflated.
shell_expand() { local p out=(); for p in "$@"; do out+=($p); done
                 printf '%s\n' ${out+"${out[@]}"} | sort -u; }

# ---------------------------------------------------------------------------
# THE GLOB TABLE — single source of truth for every surface definition.
# Declared once here; `globs`, `raw`, `files`, `metrics` and the baseline
# generator all read it, so a definition cannot drift between the measured
# numbers and the "glob" field recorded alongside them.
# ---------------------------------------------------------------------------
globs() {
  case "$1" in
    S1)  printf '%s\n' 'agents/*.md' ;;
    S2)  printf '%s\n' 'agents/**/resources/**/*.md' ;;
    S3)  printf '%s\n' '.claude/skills/*/SKILL.md' ;;
    S4)  printf '%s\n' '.claude/skills/**/*.md' ;;
    S5)  printf '%s\n' '.claude/rules/**/*.md' ;;
    S6)  printf '%s\n' '.claude/hooks/*.cjs' ;;
    S7)  printf '%s\n' 'docs/**/*.md' ;;
    S8)  printf '%s\n' 'CLAUDE.md' 'README.md' ;;
    S9)  printf '%s\n' 'tests/**/*.js' ;;
    S10) printf '%s\n' '.claude-plugin/plugin.json' '.claude-plugin/marketplace.json' ;;
    S11) printf '%s\n' 'agents/**/*.md' 'scripts/**/*.md' 'scripts/**/*.cjs' \
                        'scripts/**/*.js' 'tests/**/*.md' '.claude/hooks/**/*.md' \
                        '.claude/output-styles/**/*.md' 'cagents-memory/**/*.md' \
                        'AGENTS.md' ;;
    *) echo "surfaces.sh: unknown surface $1" >&2; exit 2 ;;
  esac
}

# Surfaces defined as a set difference name the surfaces they subtract. This is
# what keeps S3/S4 and S1/S2/S11 disjoint without relying on glob trickery.
minus() {
  case "$1" in
    S4)  echo "S3" ;;
    S11) echo "S1 S2" ;;
    *)   echo "" ;;
  esac
}

# raw: glob expansion + subtraction, BEFORE the in-scope intersection.
# The gap between `raw` and `files` is exactly the exempt + untracked drop, and
# the baseline records it per surface rather than letting it vanish.
raw() {
  local s="$1" m base sub
  mapfile -t base < <(shell_expand $(globs "$s"))
  printf '%s\n' ${base+"${base[@]}"} | sort -u > "$TMP/raw.$s"
  sub="$(minus "$s")"
  if [ -n "$sub" ]; then
    : > "$TMP/sub.$s"
    for m in $sub; do raw "$m" >> "$TMP/sub.$s"; done
    sort -u "$TMP/sub.$s" -o "$TMP/sub.$s"
    comm -23 "$TMP/raw.$s" "$TMP/sub.$s"
  else
    cat "$TMP/raw.$s"
  fi
}

surface_files() { raw "$1" | comm -12 - "$TMP/in.txt"; }

ALL="S1 S2 S3 S4 S5 S6 S7 S8 S9 S10 S11"

identity() {
  case "$1" in
    S1)  echo "agent files, flat scan = the registry" ;;
    S2)  echo "tier-3 agent resources, the largest surface" ;;
    S3)  echo "skill entry points" ;;
    S4)  echo "all other skill prose: reference/, reference/domains/, templates/, _MODE_REGISTRY.md" ;;
    S5)  echo "modular rules" ;;
    S6)  echo "hook source, COMMENT LINES ONLY" ;;
    S7)  echo "documentation tree" ;;
    S8)  echo "root repo prose" ;;
    S9)  echo "test source, COMMENT LINES ONLY" ;;
    S10) echo "plugin manifests, prose lives in description strings" ;;
    S11) echo "repo-support prose: tooling scripts, tracked templates, agent-adjacent helpers" ;;
  esac
}

case "${1:-audit}" in
  list)
    for s in $ALL; do printf '%-4s %4d  %s\n' "$s" "$(surface_files "$s" | wc -l)" "$(identity "$s")"; done ;;
  globs)   globs "${2:?surfaces.sh globs <S>}" ;;
  raw)     raw "${2:?surfaces.sh raw <S>}" ;;
  files)   surface_files "${2:?surfaces.sh files <S>}" ;;
  metrics)
    s="${2:?surfaces.sh metrics <S>}"; surface_files "$s" > "$TMP/f.txt"
    "$REPO_ROOT/scripts/ste100/metrics.sh" --from-file "$TMP/f.txt" ;;
  audit)
    : > "$TMP/multi.txt"; rc=0
    for s in $ALL; do surface_files "$s" >> "$TMP/multi.txt"; done
    sort "$TMP/multi.txt" -o "$TMP/multi.txt"; sort -u "$TMP/multi.txt" > "$TMP/union.txt"
    sum=$(wc -l < "$TMP/multi.txt"); uniq_n=$(wc -l < "$TMP/union.txt"); inn=$(wc -l < "$TMP/in.txt")
    echo "sum of surface counts : $sum"
    echo "distinct union        : $uniq_n"
    echo "in-scope              : $inn"
    if [ "$sum" -ne "$uniq_n" ]; then echo "FAIL overlap:"; uniq -d "$TMP/multi.txt" | sed 's/^/  /'; rc=1; fi
    if ! diff -q "$TMP/union.txt" "$TMP/in.txt" >/dev/null; then
      echo "FAIL uncovered (in-scope, no surface):"; comm -23 "$TMP/in.txt" "$TMP/union.txt" | sed 's/^/  /'
      echo "FAIL foreign (surface, not in-scope):"; comm -13 "$TMP/in.txt" "$TMP/union.txt" | sed 's/^/  /'
      rc=1
    fi
    [ "$rc" -eq 0 ] && echo "PASS: S1..S11 partition in-scope.txt exactly, difference 0"
    exit $rc ;;
  *) echo "surfaces.sh: unknown command ${1}" >&2; exit 2 ;;
esac

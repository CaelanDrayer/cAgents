#!/usr/bin/env bash
#
# ste100 in-scope generator — emits scripts/ste100/in-scope.txt, the DEFINITIVE
# list of files the STE-100 rewrite may touch. Every batch manifest is proved
# against this list (WI-064), so the list must be reproducible, not curated.
#
#   bash scripts/ste100/in-scope.sh > scripts/ste100/in-scope.txt
#
# DEFINITION
#   in-scope := { tracked files with extension .md .cjs .js }
#             + { .claude-plugin/plugin.json, .claude-plugin/marketplace.json }
#             - { any path matching a glob in scripts/ste100/exempt.txt }
#
# WHY git ls-files, NOT a filesystem glob
#   The working tree carries large untracked trees that are NOT cAgents plugin
#   prose (.omc/ alone holds 4252 .md/.js files; .claude/sessions/ holds 19).
#   A filesystem glob would sweep them into a rewrite pass. git ls-files cannot:
#   untracked scratch can never leak in. The matching exempt.txt entries are
#   belt-and-braces for the tools that DO glob the filesystem (mechanize.cjs,
#   validate-ste100.sh).
#
# WHY the two .claude-plugin JSON files are hand-added
#   They are surface S10. Their prose lives in "description" string values, not
#   in the file extension, and widening the filter to *.json would drag in 26
#   config and fixture files that hold no prose at all.
#
# EXEMPTION MATCHING IS DELEGATED, NOT REIMPLEMENTED
#   Filtering runs through `metrics.sh --from-file --list-files`, so exempt.txt
#   is interpreted by exactly one code path (metrics.sh is_exempt). If this
#   script re-implemented the glob loop, the two could drift and a file could be
#   measured but not rewritten, or the reverse.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git ls-files -- '*.md' '*.cjs' '*.js' \
                '.claude-plugin/plugin.json' '.claude-plugin/marketplace.json' \
  | sort -u > "$TMP/all.txt"

# --list-files prints the surviving paths to stderr; the JSON metrics on stdout
# are not wanted here.
./scripts/ste100/metrics.sh --from-file "$TMP/all.txt" --list-files \
  >/dev/null 2>"$TMP/stderr.txt"

grep -v '^metrics.sh:' "$TMP/stderr.txt" | sort -u > "$TMP/in-scope.txt"

cat <<HDR
# ste100 in-scope manifest — GENERATED, DO NOT HAND-EDIT.
#
# Regenerate with:
#   bash scripts/ste100/in-scope.sh > scripts/ste100/in-scope.txt
#
# Definition, provenance and the reason git ls-files is the source:
#   see the header of scripts/ste100/in-scope.sh
#
# Tracked candidates: $(wc -l < "$TMP/all.txt")
# Dropped by exempt.txt: $(( $(wc -l < "$TMP/all.txt") - $(wc -l < "$TMP/in-scope.txt") ))
# In scope: $(wc -l < "$TMP/in-scope.txt")
HDR

cat "$TMP/in-scope.txt"

#!/usr/bin/env bash
# Acceptance check for scripts/ste100/invariants.sh.
#   heading-rename/     : only a heading was renamed              -> guard MUST exit 1
#   prose-shorten/      : only a sentence was shortened           -> guard MUST exit 0
#   slashless-filename/ : a substitution ate a slashless filename -> guard MUST exit 1
#   comment-gutter/     : a comment alignment gutter collapsed    -> guard MUST exit 1
# The last two are the regressions R1 and R10, which the guard passed silently
# across 1008 file pairs before invariants 9 (FILENAME) and 10 (GUTTER) existed.
# Exits 0 only if every expectation holds.
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUARD="$HERE/../../../scripts/ste100/invariants.sh"
rc=0
check() { # <dir> <expected-exit> [<ext, default md>]
  local ext="${3:-md}"
  "$GUARD" --compare-files "$HERE/$1/before.$ext" "$HERE/$1/after.$ext" >/dev/null 2>&1
  local got=$?
  if [ "$got" -eq "$2" ]; then printf 'PASS  %-16s exit=%d (expected %d)\n' "$1" "$got" "$2"
  else printf 'FAIL  %-16s exit=%d (expected %d)\n' "$1" "$got" "$2"; rc=1; fi
}
check heading-rename 1
check prose-shorten 0
check slashless-filename 1
check comment-gutter 1 cjs
exit $rc

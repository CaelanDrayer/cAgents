#!/usr/bin/env bash
#
# ste100 baseline generator — measures every surface and emits baseline.json.
#
#   scripts/ste100/baseline.sh > <session>/outputs/metrics/baseline.json
#
# Each surface object keeps the original field set. The two count-integrity
# fields mean:
#   files_matched_pre_exempt  raw shell-glob expansion, before ANY filtering
#   exempt_skipped            tracked paths the raw expansion hit that
#                             exempt.txt removes
# The remainder of (files_matched_pre_exempt - exempt_skipped - files) is
# untracked working-tree noise, reported in file_count_status. Recording all
# three keeps a surface honest: a number can only move because prose moved, not
# because an untracked draft appeared next to the corpus.
#
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"
SURF="$REPO_ROOT/scripts/ste100/surfaces.sh"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

git ls-files -- '*.md' '*.cjs' '*.js' \
                '.claude-plugin/plugin.json' '.claude-plugin/marketplace.json' \
  | sort -u > "$TMP/tracked.txt"

ALL="S1 S2 S3 S4 S5 S6 S7 S8 S9 S10 S11"
for s in $ALL; do
  "$SURF" metrics "$s" 2>/dev/null                    > "$TMP/$s.metrics.json"
  "$SURF" globs   "$s"                                > "$TMP/$s.globs"
  "$SURF" raw     "$s" | sort -u                      > "$TMP/$s.raw"
  "$SURF" files   "$s" | sort -u                      > "$TMP/$s.files"
  comm -12 "$TMP/$s.raw" "$TMP/tracked.txt"           > "$TMP/$s.tracked_raw"
  comm -23 "$TMP/$s.tracked_raw" "$TMP/$s.files"      > "$TMP/$s.exempt"
done

TMP="$TMP" ALL="$ALL" node -e '
const fs = require("fs"), T = process.env.TMP;
const rd = p => fs.readFileSync(T + "/" + p, "utf8").split("\n").filter(Boolean);
const out = {};
for (const s of process.env.ALL.split(" ")) {
  const m = JSON.parse(fs.readFileSync(T + "/" + s + ".metrics.json", "utf8"));
  const globs = rd(s + ".globs"), exempt = rd(s + ".exempt");
  const raw = rd(s + ".raw").length, files = rd(s + ".files").length;
  const untracked = raw - rd(s + ".tracked_raw").length;
  let status = "MATCH";
  if (exempt.length || untracked) {
    const why = [];
    if (exempt.length) why.push(exempt.length + " dropped by scripts/ste100/exempt.txt");
    if (untracked)     why.push(untracked + " dropped as untracked (not in git ls-files)");
    status = "MATCH_PRE_FILTER (" + raw + " matched the glob; " + why.join("; ") +
             ", leaving " + files + " measured)";
  }
  out[s] = { ...m, glob: globs, files_expected: files,
             files_matched_pre_exempt: raw, exempt_skipped: exempt,
             file_count_status: status };
}
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
'

#!/usr/bin/env bash
#
# task-brief.sh — extract a single work-item block from a work_items.yaml into a
# uniquely-named brief file that a sub-agent can read in one call.
#
# Part of the cAgents file-handoff helpers. Backs the "delegation prompt under
# 300 tokens" rule (see .claude/rules/core/controllers.md): instead of pasting a
# whole work_items.yaml into a delegation prompt, hand the sub-agent a path to
# just its one work item.
#
# Convenience helper — not load-bearing pipeline code. Deps: bash, awk, sed,
# coreutils (date/dirname/mkdir/printf). No jq/yq/python.
#
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: task-brief.sh <work-item-id> <work_items.yaml> [--out-dir DIR] [--stdout]

Extract the single work-item block whose `id:` (or `task_id:`) matches
<work-item-id> from <work_items.yaml> and write it to a uniquely-named brief
file the sub-agent can read in one call.

Arguments:
  <work-item-id>     Work item id to extract, e.g. WI-3 (matched against each
                     list item's inline `id:` or `task_id:` field).
  <work_items.yaml>  Path to work_items.yaml (or any YAML list of items).

Options:
  --out-dir DIR      Directory to write the brief into. Default: the source
                     file's directory, falling back to ${TMPDIR:-/tmp} if that
                     directory is not writable.
  --stdout           Print the extracted block to stdout instead of a file.
  -h, --help         Show this help and exit 0.

Output:
  Writes <out-dir>/task-brief-<id>-<timestamp>-<pid>.yaml and prints the file
  path on stdout (unless --stdout is given). Exit 0 on success; exit 1 if the
  id is not found or required arguments are missing.

Matching note:
  The id is matched on the list-marker line (inline form), e.g. "  - id: WI-3".
  Standard cAgents work_items.yaml uses this inline form.

Examples:
  task-brief.sh WI-3 cagents-memory/sessions/act_x/workflow/work_items.yaml
  task-brief.sh WI-3 work_items.yaml --stdout
  task-brief.sh WI-3 work_items.yaml --out-dir /tmp/handoff
EOF
}

# ---- Parse arguments --------------------------------------------------------
out_dir=""
to_stdout=0
positional=()

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --out-dir)
      [ $# -ge 2 ] || { echo "task-brief.sh: --out-dir requires a value" >&2; exit 1; }
      out_dir="$2"; shift 2 ;;
    --stdout) to_stdout=1; shift ;;
    --) shift; while [ $# -gt 0 ]; do positional+=("$1"); shift; done ;;
    -*) echo "task-brief.sh: unknown option: $1" >&2; usage >&2; exit 1 ;;
    *) positional+=("$1"); shift ;;
  esac
done

id="${positional[0]:-}"
yaml_path="${positional[1]:-}"

if [ -z "$id" ] || [ -z "$yaml_path" ]; then
  echo "task-brief.sh: missing required arguments (<work-item-id> and <work_items.yaml>)" >&2
  usage >&2
  exit 1
fi

if [ ! -f "$yaml_path" ]; then
  echo "task-brief.sh: file not found: $yaml_path" >&2
  exit 1
fi

# ---- Extract the single work-item block -------------------------------------
# A list item begins at a marker line "<indent>- ". The block runs until the
# next marker at the same-or-shallower indent, or a dedent to a non-list key.
read -r -d '' AWK_PROG <<'AWK' || true
function lead_spaces(s,   n) { n = 0; while (substr(s, n+1, 1) == " ") n++; return n }
BEGIN { capturing = 0; target_indent = -1; got = 0 }
{
  line = $0
  is_marker = (line ~ /^[ ]*-[ ]/)
  mind = -1
  if (is_marker) { mind = index(line, "-") - 1 }
  lead = lead_spaces(line)

  if (capturing) {
    if (is_marker && mind <= target_indent) { capturing = 0; exit }
    if (line !~ /^[ ]*$/ && !is_marker && lead <= target_indent) { capturing = 0; exit }
    print line
    next
  }

  if (is_marker) {
    tmp = line
    sub(/^[ ]*-[ ]*/, "", tmp)          # drop the "- " marker
    if (tmp ~ /^(id|task_id):/) {
      val = tmp
      sub(/^(id|task_id):[ ]*/, "", val) # keep only the value
      sub(/[ ]*#.*$/, "", val)           # strip trailing comment
      gsub(/^["']|["']$/, "", val)       # strip surrounding quotes
      sub(/[ \r]+$/, "", val)            # strip trailing space/CR
      if (val == target) {
        capturing = 1; target_indent = mind; got = 1
        print line
      }
    }
  }
  next
}
END { if (!got) exit 3 }
AWK

block="$(awk -v target="$id" "$AWK_PROG" "$yaml_path" || true)"

if [ -z "$block" ]; then
  echo "task-brief.sh: work item '$id' not found in $yaml_path" >&2
  exit 1
fi

# ---- Emit -------------------------------------------------------------------
if [ "$to_stdout" -eq 1 ]; then
  printf '%s\n' "$block"
  exit 0
fi

# Resolve output directory (source dir, else TMPDIR).
if [ -z "$out_dir" ]; then
  out_dir="$(dirname "$yaml_path")"
  if [ ! -w "$out_dir" ]; then
    out_dir="${TMPDIR:-/tmp}"
  fi
else
  mkdir -p "$out_dir"
fi

ts="$(date +%Y%m%d-%H%M%S)"
safe_id="$(printf '%s' "$id" | sed 's#[^A-Za-z0-9._-]#_#g')"
out_file="${out_dir%/}/task-brief-${safe_id}-${ts}-$$.yaml"

{
  printf '# task-brief for %s\n' "$id"
  printf '# source: %s\n' "$yaml_path"
  printf '# generated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '%s\n' "$block"
} > "$out_file"

printf '%s\n' "$out_file"

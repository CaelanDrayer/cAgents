#!/usr/bin/env bash
# v12.6.0 migration: strip removed UI-only fields and files from existing sessions.
#
# Best-effort, idempotent. Re-runs are no-ops. Never exits non-zero on missing files.
#
# Usage:
#   bash scripts/migration/v12-6-drop-ui-fields.sh                       # default: cagents-memory/sessions/
#   bash scripts/migration/v12-6-drop-ui-fields.sh path/to/sessions      # custom sessions dir
#   bash scripts/migration/v12-6-drop-ui-fields.sh --dry-run             # preview only
#   bash scripts/migration/v12-6-drop-ui-fields.sh --dry-run path/to/s   # preview custom dir
#
# Removed in v12.6.0 (per Pillar-4 / design AC-4.5):
#   - workflow/events/                (entire dir + EVT-*.yaml + index.yaml)
#   - workflow/wave_structure.yaml
#   - workflow/domain_status.yaml
#   - workflow/partial_results.yaml
#   - workflow/delegation_prompts.yaml
#   - team/messages/                  (entire dir)
#   - status.yaml fields: state_history[].duration_ms, revision_round, validation_cycles, followup_round
#
# PRESERVED (KEEP allowlist per AC-4.2):
#   - workflow/file_changes.log
#   - workflow/agent_tree.yaml
#   - team/metrics/*
#   - workflow/child_controllers.yaml
#   - outputs/strategic/*

set -uo pipefail

DRY_RUN=0
SESSIONS_DIR=""

# Parse args
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n)
      DRY_RUN=1
      ;;
    -h|--help)
      sed -n '2,25p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$SESSIONS_DIR" ]]; then
        SESSIONS_DIR="$arg"
      fi
      ;;
  esac
done

# Default sessions dir
if [[ -z "$SESSIONS_DIR" ]]; then
  SESSIONS_DIR="cagents-memory/sessions"
fi

if [[ ! -d "$SESSIONS_DIR" ]]; then
  echo "[v12.6 migration] sessions dir not found: $SESSIONS_DIR — nothing to do."
  exit 0
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[v12.6 migration] DRY RUN — no changes will be made."
fi
echo "[v12.6 migration] scanning: $SESSIONS_DIR"

count_sessions=0
count_removed_dirs=0
count_removed_files=0
count_stripped_status=0

# Helper: remove a path (file or dir), respecting --dry-run
remove_path() {
  local path="$1"
  local kind="$2"  # "dir" or "file"
  if [[ ! -e "$path" ]]; then
    return 0
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  [DRY-RUN] would remove $kind: $path"
  else
    if [[ "$kind" == "dir" ]]; then
      rm -rf "$path" 2>/dev/null && count_removed_dirs=$((count_removed_dirs+1)) && echo "  removed dir: $path"
    else
      rm -f "$path" 2>/dev/null && count_removed_files=$((count_removed_files+1)) && echo "  removed file: $path"
    fi
  fi
}

# Helper: strip a YAML field line from status.yaml (sed line-anchored delete)
strip_yaml_field() {
  local file="$1"
  local field="$2"
  if [[ ! -f "$file" ]]; then
    return 0
  fi
  # Check if the field exists first (idempotency check)
  if ! grep -qE "^[[:space:]]*${field}:" "$file" 2>/dev/null; then
    return 0
  fi
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  [DRY-RUN] would strip field '${field}' from $file"
  else
    # Delete lines matching '<whitespace>{field}:' at any indent
    sed -i.bak "/^[[:space:]]*${field}:/d" "$file" 2>/dev/null && rm -f "${file}.bak" 2>/dev/null
    count_stripped_status=$((count_stripped_status+1))
    echo "  stripped field '${field}' from $file"
  fi
}

for session_dir in "$SESSIONS_DIR"/*/; do
  [[ ! -d "$session_dir" ]] && continue
  session_name=$(basename "$session_dir")
  count_sessions=$((count_sessions+1))

  # 1. Remove workflow/events/ (entire dir)
  remove_path "${session_dir}workflow/events" "dir"

  # 2. Remove specific workflow/*.yaml files
  for f in wave_structure.yaml domain_status.yaml partial_results.yaml delegation_prompts.yaml; do
    remove_path "${session_dir}workflow/${f}" "file"
  done

  # 3. Remove team/messages/ (entire dir, /team sessions only)
  remove_path "${session_dir}team/messages" "dir"

  # 4. Strip removed fields from status.yaml
  status_file="${session_dir}status.yaml"
  if [[ -f "$status_file" ]]; then
    strip_yaml_field "$status_file" "duration_ms"
    strip_yaml_field "$status_file" "revision_round"
    strip_yaml_field "$status_file" "validation_cycles"
    strip_yaml_field "$status_file" "followup_round"
  fi
done

echo "[v12.6 migration] processed $count_sessions session(s)."
if [[ "$DRY_RUN" -eq 0 ]]; then
  echo "[v12.6 migration] summary: removed $count_removed_dirs dir(s), $count_removed_files file(s); stripped $count_stripped_status status.yaml field(s)."
else
  echo "[v12.6 migration] (dry-run; no changes applied)"
fi

exit 0

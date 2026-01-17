#!/bin/bash
# cAgents Workflow Complete Hook
# Archive instruction, cleanup temp files
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/scripts/lib"

source "$LIB_DIR/core.sh"
source "$LIB_DIR/json.sh"
source "$LIB_DIR/logging.sh"

main() {
  # Read input from stdin
  local input
  input="$(cat)"

  # Parse input
  local instruction_id
  instruction_id="$(json_parse "$input" '.instruction_id')"

  # Log workflow completion
  log_info "Workflow complete: $instruction_id"

  # Update status.yaml
  local status_file="Agent_Memory/$instruction_id/status.yaml"
  if [[ -f "$status_file" ]]; then
    cat >> "$status_file" <<EOF
completed_at: "$(timestamp)"
final_status: "success"
EOF
  fi

  # Archive to _archive directory
  local archive_dir="Agent_Memory/_archive"
  mkdir -p "$archive_dir"
  if [[ -d "Agent_Memory/$instruction_id" ]]; then
    cp -r "Agent_Memory/$instruction_id" "$archive_dir/" 2>/dev/null || true
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Workflow archived: $instruction_id"
}

main "$@"

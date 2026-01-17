#!/bin/bash
# cAgents Workflow Fail Hook
# Log failure, notify if configured
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
  local error_message
  error_message="$(json_parse "$input" '.error_message')"

  # Log workflow failure
  log_error "Workflow failed: $instruction_id - $error_message"

  # Update status.yaml
  local status_file="Agent_Memory/$instruction_id/status.yaml"
  if [[ -f "$status_file" ]]; then
    cat >> "$status_file" <<EOF
failed_at: "$(timestamp)"
final_status: "failed"
error: "$error_message"
EOF
  fi

  # Return success (hook processed failure)
  json_build \
    "decision" "proceed" \
    "message" "Workflow failure logged: $instruction_id"
}

main "$@"

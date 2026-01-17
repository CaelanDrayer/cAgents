#!/bin/bash
# cAgents Phase Fail Hook
# Handle phase failure, determine recovery
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
  local phase
  phase="$(json_parse "$input" '.phase')"
  local error_message
  error_message="$(json_parse "$input" '.error_message')"

  # Log phase failure
  log_error "Phase failed: $instruction_id - $phase - $error_message"

  # Update status.yaml
  local status_file="Agent_Memory/$instruction_id/status.yaml"
  if [[ -f "$status_file" ]]; then
    cat >> "$status_file" <<EOF
${phase}_failed_at: "$(timestamp)"
${phase}_error: "$error_message"
EOF
  fi

  # Return proceed to allow recovery logic
  json_build \
    "decision" "proceed" \
    "message" "Phase failure logged: $phase"
}

main "$@"

#!/bin/bash
# cAgents Question Asked Hook
# Log controller question delegation
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
  local controller
  controller="$(json_parse "$input" '.controller')"
  local question
  question="$(json_parse "$input" '.question')"
  local delegated_to
  delegated_to="$(json_parse "$input" '.delegated_to')"

  # Log question delegation
  log_debug "Question asked: $controller -> $delegated_to"
  log_debug "  Question: $question"

  # Could append to coordination_log.yaml here in production
  local coord_log="Agent_Memory/$instruction_id/workflow/coordination_log.yaml"
  if [[ -f "$coord_log" ]]; then
    # Production would use proper YAML append
    echo "# Question asked at $(timestamp)" >> "$coord_log"
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Question logged"
}

main "$@"

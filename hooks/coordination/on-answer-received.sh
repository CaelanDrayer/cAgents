#!/bin/bash
# cAgents Answer Received Hook
# Log specialist answer, update coordination_log
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
  local specialist
  specialist="$(json_parse "$input" '.specialist')"
  local question
  question="$(json_parse "$input" '.question')"

  # Log answer received
  log_debug "Answer received from: $specialist"
  log_debug "  For question: $question"

  # Could append to coordination_log.yaml here in production
  local coord_log="Agent_Memory/$instruction_id/workflow/coordination_log.yaml"
  if [[ -f "$coord_log" ]]; then
    echo "# Answer received at $(timestamp)" >> "$coord_log"
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Answer logged"
}

main "$@"

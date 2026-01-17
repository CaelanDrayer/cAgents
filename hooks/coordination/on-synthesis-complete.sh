#!/bin/bash
# cAgents Synthesis Complete Hook
# Validate synthesis quality before execution
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
  local num_questions
  num_questions="$(json_parse "$input" '.num_questions')"

  # Log synthesis completion
  log_info "Synthesis complete: $controller synthesized $num_questions answers"

  # Validate coordination_log exists
  local coord_log="Agent_Memory/$instruction_id/workflow/coordination_log.yaml"
  if [[ ! -f "$coord_log" ]]; then
    log_warn "Coordination log not found: $coord_log"
    json_build \
      "decision" "block" \
      "message" "Missing coordination_log.yaml"
    return 1
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Synthesis validated"
}

main "$@"

#!/bin/bash
# cAgents Phase Complete Hook
# Validate phase outputs, prepare next phase
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

  # Log phase completion
  log_info "Phase complete: $instruction_id - $phase"

  # Update status.yaml
  local status_file="Agent_Memory/$instruction_id/status.yaml"
  if [[ -f "$status_file" ]]; then
    cat >> "$status_file" <<EOF
${phase}_completed_at: "$(timestamp)"
EOF
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Phase completed: $phase"
}

main "$@"

#!/bin/bash
# cAgents HITL Required Hook
# Prepare HITL presentation, pause workflow
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
  local gate_name
  gate_name="$(json_parse "$input" '.gate_name')"
  local reason
  reason="$(json_parse "$input" '.reason')"

  # Log HITL requirement
  log_info "HITL required: $instruction_id - Gate: $gate_name"
  log_info "  Reason: $reason"

  # Update status to paused
  local status_file="Agent_Memory/$instruction_id/status.yaml"
  if [[ -f "$status_file" ]]; then
    cat >> "$status_file" <<EOF
paused_at: "$(timestamp)"
paused_for: "$gate_name"
paused_reason: "$reason"
EOF
  fi

  # Create HITL decision file for tracking
  local hitl_file="Agent_Memory/$instruction_id/workflow/hitl_decisions.yaml"
  mkdir -p "$(dirname "$hitl_file")"
  cat >> "$hitl_file" <<EOF
- gate: "$gate_name"
  required_at: "$(timestamp)"
  reason: "$reason"
  status: "pending"
EOF

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "HITL gate prepared: $gate_name"
}

main "$@"

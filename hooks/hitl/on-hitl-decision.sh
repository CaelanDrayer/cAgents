#!/bin/bash
# cAgents HITL Decision Hook
# Record decision, resume or modify workflow
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
  local decision
  decision="$(json_parse "$input" '.decision')"
  local user_message
  user_message="$(json_parse "$input" '.user_message')"

  # Log HITL decision
  log_info "HITL decision received: $instruction_id - Gate: $gate_name"
  log_info "  Decision: $decision"
  log_info "  Message: $user_message"

  # Update HITL decisions file
  local hitl_file="Agent_Memory/$instruction_id/workflow/hitl_decisions.yaml"
  if [[ -f "$hitl_file" ]]; then
    cat >> "$hitl_file" <<EOF
  decided_at: "$(timestamp)"
  decision: "$decision"
  user_message: "$user_message"
  status: "resolved"
EOF
  fi

  # Update status to resumed
  local status_file="Agent_Memory/$instruction_id/status.yaml"
  if [[ -f "$status_file" ]]; then
    cat >> "$status_file" <<EOF
resumed_at: "$(timestamp)"
hitl_decision: "$decision"
EOF
  fi

  # Determine hook decision based on user decision
  local hook_decision="proceed"
  if [[ "$decision" == "REJECTED" ]]; then
    hook_decision="fail"
  elif [[ "$decision" == "MORE INFO" ]]; then
    hook_decision="escalate"
  fi

  # Return hook decision
  json_build \
    "decision" "$hook_decision" \
    "message" "HITL decision recorded: $decision"
}

main "$@"

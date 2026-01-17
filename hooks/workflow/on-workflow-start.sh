#!/bin/bash
# cAgents Workflow Start Hook
# Initialize instruction folder, create status.yaml
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/scripts/lib"

source "$LIB_DIR/core.sh"
source "$LIB_DIR/json.sh"
source "$LIB_DIR/logging.sh"
source "$LIB_DIR/files.sh"

main() {
  # Read input from stdin
  local input
  input="$(cat)"

  # Parse input
  local instruction_id
  instruction_id="$(json_parse "$input" '.instruction_id')"

  # Log workflow start
  log_info "Workflow starting: $instruction_id"

  # Create instruction folder structure
  local inst_dir="Agent_Memory/$instruction_id"
  mkdir -p "$inst_dir"/{workflow,tasks/{pending,in_progress,completed},outputs,validation}

  # Create initial status.yaml
  local status_file="$inst_dir/status.yaml"
  cat > "$status_file" <<EOF
instruction_id: "$instruction_id"
status: "initializing"
current_phase: "routing"
started_at: "$(timestamp)"
last_updated: "$(timestamp)"
phases_completed: []
EOF

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Workflow initialized: $instruction_id"
}

main "$@"

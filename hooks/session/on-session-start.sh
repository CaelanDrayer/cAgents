#!/bin/bash
# cAgents Session Start Hook
# Initialize session state, load context
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/scripts/lib"

source "$LIB_DIR/core.sh"
source "$LIB_DIR/json.sh"
source "$LIB_DIR/logging.sh"
source "$LIB_DIR/state.sh"

#######################################
# Hook Input Contract:
# {
#   "session_id": "sess_YYYYMMDD_HHMMSS",
#   "user": "username",
#   "working_directory": "/path/to/project"
# }
#
# Hook Output Contract:
# {
#   "decision": "proceed|block|skip|escalate|fail",
#   "message": "Human-readable message"
# }
#######################################

main() {
  # Read input from stdin
  local input
  input="$(cat)"

  # Parse input
  local session_id
  session_id="$(json_parse "$input" '.session_id')"

  # Log session start
  log_info "Session starting: $session_id"

  # Initialize session state file
  mkdir -p .claude
  local session_file=".claude/cagents-session.local.md"

  if [[ ! -f "$session_file" ]]; then
    cat > "$session_file" <<EOF
---
session_id: "$session_id"
active_instruction: null
active_phase: null
started_at: "$(timestamp)"
---

# cAgents Session State

This file tracks the current session state.
EOF
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Session initialized: $session_id"
}

main "$@"

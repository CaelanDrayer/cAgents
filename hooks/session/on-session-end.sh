#!/bin/bash
# cAgents Session End Hook
# Cleanup session state, archive if needed
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
  local session_id
  session_id="$(json_parse "$input" '.session_id')"

  # Log session end
  log_info "Session ending: $session_id"

  # Archive session file if it exists
  local session_file=".claude/cagents-session.local.md"
  if [[ -f "$session_file" ]]; then
    local archive_dir=".claude/sessions"
    mkdir -p "$archive_dir"
    cp "$session_file" "$archive_dir/${session_id}.md" 2>/dev/null || true
  fi

  # Return success
  json_build \
    "decision" "proceed" \
    "message" "Session ended: $session_id"
}

main "$@"

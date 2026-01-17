#!/bin/bash
# cAgents Stop Workflow Hook
# Ralph-style stop hook for graceful workflow termination
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/scripts/lib"

source "$LIB_DIR/core.sh"
source "$LIB_DIR/files.sh"
source "$LIB_DIR/state.sh"
source "$LIB_DIR/logging.sh"
source "$LIB_DIR/json.sh"

# Configuration
readonly AGENT_MEMORY_DIR="${CAGENTS_AGENT_MEMORY:-Agent_Memory}"

#######################################
# Hook Input Contract:
# {
#   "instruction_id": "inst_YYYYMMDD_HHMMSS",
#   "reason": "user_requested|error|timeout|complete",
#   "message": "Optional message",
#   "force": false
# }
#
# Hook Output Contract:
# {
#   "decision": "proceed|block|skip|escalate|fail",
#   "message": "Human-readable message",
#   "cleanup_performed": true,
#   "archived": false
# }
#######################################

#######################################
# Read hook input from stdin
# Outputs:
#   JSON input to stdout
#######################################
read_hook_input() {
  local input=""
  while IFS= read -r line; do
    input="$input$line"
  done
  echo "$input"
}

#######################################
# Cleanup workflow state
# Arguments:
#   $1 - Instruction ID
# Returns:
#   0 on success
#######################################
cleanup_workflow_state() {
  local instruction_id="$1"

  log_info "Cleaning up workflow state: $instruction_id"

  # Clear session state
  if [[ -f ".claude/cagents-session.local.md" ]]; then
    update_frontmatter_field ".claude/cagents-session.local.md" "active_instruction" "null"
    update_frontmatter_field ".claude/cagents-session.local.md" "active_phase" "null"
  fi

  # Clear workflow state
  local workflow_file=".claude/workflow/${instruction_id}.local.md"
  if [[ -f "$workflow_file" ]]; then
    update_frontmatter_field "$workflow_file" "status" "\"stopped\""
    update_frontmatter_field "$workflow_file" "current_phase" "\"stopped\""
    update_frontmatter_field "$workflow_file" "last_updated" "\"$(timestamp)\""
  fi

  log_debug "Workflow state cleaned up"
}

#######################################
# Update instruction status
# Arguments:
#   $1 - Instruction ID
#   $2 - Status (stopped|failed|completed)
#   $3 - Reason
# Returns:
#   0 on success
#######################################
update_instruction_status() {
  local instruction_id="$1"
  local status="$2"
  local reason="$3"
  local status_file="$AGENT_MEMORY_DIR/$instruction_id/status.yaml"

  if [[ ! -f "$status_file" ]]; then
    log_warn "Status file not found: $status_file"
    return 0
  fi

  log_info "Updating instruction status to: $status"

  # Note: Full YAML manipulation would require Python/yq
  # For now, we update the simple fields
  local temp="${status_file}.tmp.$$"
  local updated_at
  updated_at=$(timestamp)

  # Simple sed-based update for status field
  sed "s/^status: .*/status: $status/" "$status_file" > "$temp"
  mv "$temp" "$status_file"

  log_debug "Status updated to $status (reason: $reason)"
}

#######################################
# Archive workflow if configured
# Arguments:
#   $1 - Instruction ID
# Returns:
#   0 on success
#######################################
archive_workflow() {
  local instruction_id="$1"
  local src="$AGENT_MEMORY_DIR/$instruction_id"
  local dst="$AGENT_MEMORY_DIR/_archive/$instruction_id"

  if [[ ! -d "$src" ]]; then
    log_warn "Instruction folder not found: $src"
    return 0
  fi

  log_info "Archiving workflow: $instruction_id"

  ensure_dir "$AGENT_MEMORY_DIR/_archive"
  mv "$src" "$dst"

  log_debug "Archived to $dst"
}

#######################################
# Log workflow stop event
# Arguments:
#   $1 - Instruction ID
#   $2 - Reason
#   $3 - Status
#######################################
log_stop_event() {
  local instruction_id="$1"
  local reason="$2"
  local status="$3"

  log_event "workflow_stopped" \
    "instruction_id=$instruction_id" \
    "reason=$reason" \
    "final_status=$status"
}

#######################################
# Main hook function
#######################################
main() {
  # Read input from stdin (or use test input)
  local input
  if [[ -t 0 ]]; then
    # Interactive mode - use defaults for testing
    input='{"instruction_id":"test","reason":"user_requested","message":"","force":false}'
  else
    input=$(read_hook_input)
  fi

  # Parse input
  local instruction_id reason message force
  instruction_id=$(json_get "$input" ".instruction_id")
  reason=$(json_get "$input" ".reason")
  message=$(json_get "$input" ".message")
  force=$(json_get "$input" ".force")

  log_info "Stop hook invoked for: $instruction_id (reason: $reason)"

  # Validate input
  if [[ -z "$instruction_id" ]]; then
    echo '{"decision":"fail","message":"Missing instruction_id","cleanup_performed":false,"archived":false}'
    exit 1
  fi

  # Determine final status based on reason
  local final_status
  case "$reason" in
    complete)
      final_status="completed"
      ;;
    error)
      final_status="failed"
      ;;
    timeout)
      final_status="timed_out"
      ;;
    user_requested)
      final_status="stopped"
      ;;
    *)
      final_status="stopped"
      ;;
  esac

  # Perform cleanup
  cleanup_workflow_state "$instruction_id"
  update_instruction_status "$instruction_id" "$final_status" "$reason"

  # Archive if completed successfully
  local archived="false"
  if [[ "$reason" == "complete" ]]; then
    archive_workflow "$instruction_id"
    archived="true"
  fi

  # Log stop event
  log_stop_event "$instruction_id" "$reason" "$final_status"

  # Output decision
  local output_message="Workflow $instruction_id stopped (reason: $reason, status: $final_status)"
  if [[ -n "$message" ]]; then
    output_message="$output_message - $message"
  fi

  json_build \
    --decision "proceed" \
    --message "$output_message" \
    --cleanup_performed "true" \
    --archived "$archived"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi

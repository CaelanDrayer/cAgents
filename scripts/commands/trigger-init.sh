#!/bin/bash
# cAgents Trigger Initialization Script
# Handles instruction folder creation and workflow initialization
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$SCRIPT_DIR")/lib"

source "$LIB_DIR/core.sh"
source "$LIB_DIR/files.sh"
source "$LIB_DIR/state.sh"
source "$LIB_DIR/validation.sh"
source "$LIB_DIR/logging.sh"
source "$LIB_DIR/json.sh"

# Configuration
readonly AGENT_MEMORY_DIR="${CAGENTS_AGENT_MEMORY:-Agent_Memory}"

#######################################
# Generate instruction ID
# Outputs:
#   Instruction ID (e.g., inst_20260117_143022)
#######################################
generate_instruction_id() {
  echo "inst_$(date +%Y%m%d_%H%M%S)"
}

#######################################
# Create instruction folder structure
# Arguments:
#   $1 - Instruction ID
# Returns:
#   0 on success, 1 on failure
#######################################
create_instruction_folder() {
  local instruction_id="$1"
  local base_dir="$AGENT_MEMORY_DIR/$instruction_id"

  log_info "Creating instruction folder: $instruction_id"

  # Create directory structure
  ensure_dir "$base_dir"
  ensure_dir "$base_dir/workflow"
  ensure_dir "$base_dir/tasks/pending"
  ensure_dir "$base_dir/tasks/in_progress"
  ensure_dir "$base_dir/tasks/completed"
  ensure_dir "$base_dir/outputs/partial"
  ensure_dir "$base_dir/outputs/final"
  ensure_dir "$base_dir/validation"
  ensure_dir "$base_dir/episodic"

  log_debug "Created directory structure for $instruction_id"
}

#######################################
# Create instruction.yaml
# Arguments:
#   $1 - Instruction ID
#   $2 - User request
#   $3 - Domain (optional, auto-detect if empty)
#   $4 - Tier (optional, auto-classify if empty)
#   $5 - Template (optional)
# Returns:
#   0 on success
#######################################
create_instruction_yaml() {
  local instruction_id="$1"
  local request="$2"
  local domain="${3:-}"
  local tier="${4:-}"
  local template="${5:-}"
  local file="$AGENT_MEMORY_DIR/$instruction_id/instruction.yaml"

  log_info "Creating instruction.yaml"

  local created_at
  created_at=$(timestamp)

  atomic_write "$file" "# instruction.yaml (V2.0)
instruction_id: \"$instruction_id\"
created_at: \"$created_at\"
status: active

request:
  raw: \"$request\"
  parsed_at: \"$created_at\"

detection:
  domain: \"${domain:-pending}\"
  confidence: ${domain:+0.95}${domain:-null}
  method: ${domain:+\"override\"}${domain:-\"pending\"}
  intent: pending
  framework: null

template:
  matched: ${template:+\"$template\"}${template:-null}
  confidence: null
  defaults: {}

recommendations:
  tier: ${tier:-null}
  controller: null
  execution_mode: null
  estimated_duration: null
  estimated_token_budget: null
  success_probability: null
"

  log_debug "Created instruction.yaml for $instruction_id"
}

#######################################
# Create status.yaml
# Arguments:
#   $1 - Instruction ID
#   $2 - Domain
#   $3 - Tier
# Returns:
#   0 on success
#######################################
create_status_yaml() {
  local instruction_id="$1"
  local domain="${2:-pending}"
  local tier="${3:-0}"
  local file="$AGENT_MEMORY_DIR/$instruction_id/status.yaml"

  log_info "Creating status.yaml"

  local created_at
  created_at=$(timestamp)

  atomic_write "$file" "# status.yaml (V5.1 - Orchestrator Managed)
instruction_id: $instruction_id
current_phase: routing
status: active

phases:
  - name: routing
    status: in_progress
    started_at: \"$created_at\"
    completed_at: null
    result: null
  - name: planning
    status: pending
    started_at: null
    completed_at: null
    result: null
  - name: coordinating
    status: pending
    started_at: null
    completed_at: null
    result: null
  - name: executing
    status: pending
    started_at: null
    completed_at: null
    result: null
  - name: validating
    status: pending
    started_at: null
    completed_at: null
    result: null

# V5.1 Trigger V2.0 metadata (populated by trigger agent)
trigger_v2_metadata:
  domain_confidence: null
  intent_confidence: null
  template_confidence: null
  preflight_score: null
  success_probability: null

# HITL gates (populated based on tier)
hitl_gates: []

# Implementation progress (populated during execution)
implementation_progress: {}

created_at: \"$created_at\"
updated_at: \"$created_at\"
"

  log_debug "Created status.yaml for $instruction_id"
}

#######################################
# Register instruction in registry
# Arguments:
#   $1 - Instruction ID
#   $2 - Domain
#   $3 - Request summary
# Returns:
#   0 on success
#######################################
register_instruction() {
  local instruction_id="$1"
  local domain="${2:-pending}"
  local request="${3:-}"
  local registry="$AGENT_MEMORY_DIR/_system/registry.yaml"

  log_info "Registering instruction in registry"

  # Ensure _system directory exists
  ensure_dir "$AGENT_MEMORY_DIR/_system"

  # Create registry if doesn't exist
  if [[ ! -f "$registry" ]]; then
    atomic_write "$registry" "# cAgents Instruction Registry
version: \"1.0.0\"
last_updated: \"$(timestamp)\"
active_instructions: []
"
  fi

  # For now, just log - YAML manipulation in bash is limited
  # Full implementation would use Python or a proper YAML tool
  log_debug "Registered $instruction_id (domain: $domain)"
}

#######################################
# Initialize session state
# Arguments:
#   $1 - Instruction ID
# Returns:
#   0 on success
#######################################
init_session() {
  local instruction_id="$1"

  log_info "Initializing session state"

  # Use state.sh function
  init_session_state

  # Initialize workflow state
  local domain="${2:-pending}"
  local tier="${3:-0}"
  init_workflow_state "$instruction_id" "$domain" "$tier"

  log_debug "Session state initialized"
}

#######################################
# Main initialization function
# Arguments:
#   $1 - User request
#   $2 - Domain override (optional)
#   $3 - Tier override (optional)
#   $4 - Template (optional)
#   $5 - Dry run flag (optional, "true" or "false")
# Outputs:
#   JSON result to stdout
#######################################
main() {
  local request="${1:-}"
  local domain_override="${2:-}"
  local tier_override="${3:-}"
  local template="${4:-}"
  local dry_run="${5:-false}"

  # Validate request
  if [[ -z "$request" ]]; then
    log_error "Request is required"
    echo '{"success": false, "error": "Request is required"}'
    exit 1
  fi

  # Generate instruction ID
  local instruction_id
  instruction_id=$(generate_instruction_id)

  log_info "Initializing workflow: $instruction_id"
  log_event "workflow_init_start" \
    "instruction_id=$instruction_id" \
    "dry_run=$dry_run"

  # Dry run - just return what would happen
  if [[ "$dry_run" == "true" ]]; then
    log_info "Dry run mode - no changes made"
    json_build \
      --success "true" \
      --dry_run "true" \
      --instruction_id "$instruction_id" \
      --request "$request" \
      --domain "${domain_override:-auto-detect}" \
      --tier "${tier_override:-auto-classify}" \
      --template "${template:-auto-match}"
    exit 0
  fi

  # Create instruction folder
  create_instruction_folder "$instruction_id"

  # Create instruction.yaml
  create_instruction_yaml "$instruction_id" "$request" "$domain_override" "$tier_override" "$template"

  # Create status.yaml
  create_status_yaml "$instruction_id" "$domain_override" "$tier_override"

  # Register instruction
  register_instruction "$instruction_id" "$domain_override" "$request"

  # Initialize session
  init_session "$instruction_id" "$domain_override" "$tier_override"

  # Log completion
  log_event "workflow_init_complete" \
    "instruction_id=$instruction_id"

  # Output result
  json_build \
    --success "true" \
    --instruction_id "$instruction_id" \
    --folder "$AGENT_MEMORY_DIR/$instruction_id" \
    --request "$request" \
    --domain "${domain_override:-pending}" \
    --tier "${tier_override:-0}"
}

# Run if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi

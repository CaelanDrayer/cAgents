#!/bin/bash
# cAgents State Management Library
# Provides atomic operations for state files
# Version: 1.0.0

# Prevent re-sourcing
[[ -n "${CAGENTS_STATE_LOADED:-}" ]] && return 0
readonly CAGENTS_STATE_LOADED=1

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"
source "$SCRIPT_DIR/files.sh"

# Configuration
readonly CAGENTS_SESSION_FILE=".claude/cagents-session.local.md"
readonly CAGENTS_WORKFLOW_DIR=".claude/workflow"

#######################################
# Read a field from markdown frontmatter
# Arguments:
#   $1 - File path
#   $2 - Field name
# Outputs:
#   Field value to stdout (empty if not found)
#######################################
read_frontmatter_field() {
  local file="$1"
  local field="$2"

  if [[ ! -f "$file" ]]; then
    echo ""
    return
  fi

  # Extract frontmatter and get field
  sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$file" | \
    grep "^${field}:" | \
    head -1 | \
    sed "s/^${field}: *//" | \
    sed 's/^"\(.*\)"$/\1/' | \
    sed "s/^'\(.*\)'$/\1/"
}

#######################################
# Update a YAML field in markdown frontmatter
# Arguments:
#   $1 - File path
#   $2 - Field name
#   $3 - New value
# Returns:
#   0 on success, 1 on failure
#######################################
update_frontmatter_field() {
  local file="$1"
  local field="$2"
  local value="$3"

  if [[ ! -f "$file" ]]; then
    warn "File not found: $file"
    return 1
  fi

  local temp="${file}.tmp.$$"

  # Update field in frontmatter
  sed "s/^${field}: .*/${field}: ${value}/" "$file" > "$temp"
  mv "$temp" "$file"
}

#######################################
# Add a field to markdown frontmatter
# Arguments:
#   $1 - File path
#   $2 - Field name
#   $3 - Value
# Returns:
#   0 on success, 1 on failure
#######################################
add_frontmatter_field() {
  local file="$1"
  local field="$2"
  local value="$3"

  if [[ ! -f "$file" ]]; then
    warn "File not found: $file"
    return 1
  fi

  local temp="${file}.tmp.$$"

  # Add field after first ---
  awk -v field="$field" -v value="$value" '
    /^---$/ && !found { print; print field ": " value; found=1; next }
    { print }
  ' "$file" > "$temp"
  mv "$temp" "$file"
}

#######################################
# Validate state file integrity
# Arguments:
#   $1 - File path
# Returns:
#   0 if valid, 1 if corrupted
#######################################
validate_state_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    warn "File not found: $file"
    return 1
  fi

  # Check has frontmatter markers
  local marker_count
  marker_count=$(grep -c "^---$" "$file" 2>/dev/null || echo "0")

  if [[ "$marker_count" -lt 2 ]]; then
    warn "Invalid frontmatter in: $file (found $marker_count markers, need 2)"
    return 1
  fi

  return 0
}

#######################################
# Initialize session state
# Returns:
#   0 on success
#######################################
init_session_state() {
  ensure_dir ".claude"

  local session_id
  session_id="sess_$(date +%Y%m%d_%H%M%S)"

  local started_at
  started_at=$(timestamp)

  atomic_write "$CAGENTS_SESSION_FILE" "---
cagents_version: \"$CAGENTS_LIB_VERSION\"
session_id: \"${session_id}\"
started_at: \"${started_at}\"
active_instruction: null
active_phase: null
---

# cAgents Session

No active workflow.
"
}

#######################################
# Initialize workflow state
# Arguments:
#   $1 - Instruction ID
#   $2 - Domain
#   $3 - Tier
# Returns:
#   0 on success
#######################################
init_workflow_state() {
  local instruction_id="$1"
  local domain="$2"
  local tier="$3"

  ensure_dir "$CAGENTS_WORKFLOW_DIR"

  local file="${CAGENTS_WORKFLOW_DIR}/${instruction_id}.local.md"
  local started_at
  started_at=$(timestamp)

  atomic_write "$file" "---
instruction_id: \"${instruction_id}\"
domain: \"${domain}\"
tier: ${tier}
status: \"active\"
current_phase: \"routing\"
iteration: 1
max_iterations: 100
started_at: \"${started_at}\"
last_updated: \"${started_at}\"
---

# Workflow: ${instruction_id}

Initializing workflow.
"

  # Update session to point to this workflow
  if [[ -f "$CAGENTS_SESSION_FILE" ]]; then
    update_frontmatter_field "$CAGENTS_SESSION_FILE" "active_instruction" "\"${instruction_id}\""
    update_frontmatter_field "$CAGENTS_SESSION_FILE" "active_phase" "\"routing\""
  fi
}

#######################################
# Update workflow phase
# Arguments:
#   $1 - Instruction ID
#   $2 - New phase
# Returns:
#   0 on success
#######################################
update_workflow_phase() {
  local instruction_id="$1"
  local phase="$2"
  local file="${CAGENTS_WORKFLOW_DIR}/${instruction_id}.local.md"

  if [[ ! -f "$file" ]]; then
    warn "Workflow state not found: $file"
    return 1
  fi

  local updated_at
  updated_at=$(timestamp)

  update_frontmatter_field "$file" "current_phase" "\"${phase}\""
  update_frontmatter_field "$file" "last_updated" "\"${updated_at}\""

  # Also update session
  if [[ -f "$CAGENTS_SESSION_FILE" ]]; then
    update_frontmatter_field "$CAGENTS_SESSION_FILE" "active_phase" "\"${phase}\""
  fi
}

#######################################
# Increment workflow iteration
# Arguments:
#   $1 - Instruction ID
# Returns:
#   0 on success
#######################################
increment_iteration() {
  local instruction_id="$1"
  local file="${CAGENTS_WORKFLOW_DIR}/${instruction_id}.local.md"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  local current
  current=$(read_frontmatter_field "$file" "iteration")

  if [[ ! "$current" =~ ^[0-9]+$ ]]; then
    current=0
  fi

  local next=$((current + 1))
  update_frontmatter_field "$file" "iteration" "$next"

  echo "$next"
}

#######################################
# Complete workflow
# Arguments:
#   $1 - Instruction ID
#   $2 - Status (completed/failed)
# Returns:
#   0 on success
#######################################
complete_workflow() {
  local instruction_id="$1"
  local status="$2"
  local file="${CAGENTS_WORKFLOW_DIR}/${instruction_id}.local.md"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  update_frontmatter_field "$file" "status" "\"${status}\""
  update_frontmatter_field "$file" "current_phase" "\"complete\""
  update_frontmatter_field "$file" "last_updated" "\"$(timestamp)\""

  # Clear session
  if [[ -f "$CAGENTS_SESSION_FILE" ]]; then
    update_frontmatter_field "$CAGENTS_SESSION_FILE" "active_instruction" "null"
    update_frontmatter_field "$CAGENTS_SESSION_FILE" "active_phase" "null"
  fi
}

#######################################
# Get current workflow state as JSON
# Arguments:
#   $1 - Instruction ID (optional, uses active if not provided)
# Outputs:
#   JSON state object to stdout
#######################################
get_workflow_state() {
  local instruction_id="${1:-}"

  # If no instruction ID, get from session
  if [[ -z "$instruction_id" ]]; then
    if [[ -f "$CAGENTS_SESSION_FILE" ]]; then
      instruction_id=$(read_frontmatter_field "$CAGENTS_SESSION_FILE" "active_instruction")
    fi
  fi

  if [[ -z "$instruction_id" ]] || [[ "$instruction_id" == "null" ]]; then
    echo '{"active": false}'
    return
  fi

  local file="${CAGENTS_WORKFLOW_DIR}/${instruction_id}.local.md"

  if [[ ! -f "$file" ]]; then
    echo '{"active": false, "error": "workflow_not_found"}'
    return
  fi

  local phase domain tier status iteration
  phase=$(read_frontmatter_field "$file" "current_phase")
  domain=$(read_frontmatter_field "$file" "domain")
  tier=$(read_frontmatter_field "$file" "tier")
  status=$(read_frontmatter_field "$file" "status")
  iteration=$(read_frontmatter_field "$file" "iteration")

  # Build JSON with jq if available, otherwise manual
  if command_exists jq; then
    jq -n \
      --arg id "$instruction_id" \
      --arg phase "$phase" \
      --arg domain "$domain" \
      --arg tier "$tier" \
      --arg status "$status" \
      --arg iteration "$iteration" \
      '{
        active: true,
        instruction_id: $id,
        current_phase: $phase,
        domain: $domain,
        tier: ($tier | tonumber),
        status: $status,
        iteration: ($iteration | tonumber)
      }'
  else
    echo "{\"active\": true, \"instruction_id\": \"$instruction_id\", \"current_phase\": \"$phase\", \"domain\": \"$domain\", \"tier\": $tier, \"status\": \"$status\", \"iteration\": $iteration}"
  fi
}

#######################################
# Check if workflow is active
# Returns:
#   0 if active, 1 if not
#######################################
is_workflow_active() {
  local state
  state=$(get_workflow_state)

  if command_exists jq; then
    [[ $(echo "$state" | jq -r '.active') == "true" ]]
  else
    [[ "$state" == *'"active": true'* ]]
  fi
}

#######################################
# Get prompt text from workflow state
# Arguments:
#   $1 - Instruction ID
# Outputs:
#   Prompt text (content after frontmatter)
#######################################
get_workflow_prompt() {
  local instruction_id="$1"
  local file="${CAGENTS_WORKFLOW_DIR}/${instruction_id}.local.md"

  if [[ ! -f "$file" ]]; then
    return
  fi

  # Extract everything after the closing ---
  awk '/^---$/{i++; next} i>=2' "$file"
}

# Export functions for subshells
export -f read_frontmatter_field update_frontmatter_field add_frontmatter_field
export -f validate_state_file init_session_state init_workflow_state
export -f update_workflow_phase increment_iteration complete_workflow
export -f get_workflow_state is_workflow_active get_workflow_prompt

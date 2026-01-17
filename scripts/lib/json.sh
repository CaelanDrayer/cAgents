#!/bin/bash
# cAgents JSON Library
# jq-based JSON processing utilities
# Version: 1.0.0

# Prevent re-sourcing
[[ -n "${CAGENTS_JSON_LOADED:-}" ]] && return 0
readonly CAGENTS_JSON_LOADED=1

# Source core library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"

# Ensure jq is available
require_command "jq" "brew install jq OR apt-get install jq"

# Check jq version (minimum 1.5 recommended for stable features)
check_command_version "jq" "--version" "1.5" "jq-[0-9]+\.[0-9]+(\.[0-9]+)?" || true

#######################################
# Parse JSON field safely
# Arguments:
#   $1 - JSON string
#   $2 - jq path (e.g., '.field.subfield')
# Outputs:
#   Field value to stdout (empty string if not found)
#######################################
json_get() {
  local json="$1"
  local path="$2"
  echo "$json" | jq -r "$path // empty" 2>/dev/null || echo ""
}

#######################################
# Parse JSON field from file
# Arguments:
#   $1 - File path
#   $2 - jq path (e.g., '.field.subfield')
# Outputs:
#   Field value to stdout
#######################################
json_get_file() {
  local file="$1"
  local path="$2"

  if [[ ! -f "$file" ]]; then
    echo ""
    return
  fi

  jq -r "$path // empty" "$file" 2>/dev/null || echo ""
}

#######################################
# Build JSON object from key-value pairs
# Arguments:
#   Pairs of --key value
# Outputs:
#   JSON object to stdout
# Example:
#   json_build --name "test" --count 5
#   => {"name":"test","count":"5"}
#######################################
json_build() {
  local args=()
  local fields=""

  while [[ $# -gt 0 ]]; do
    case $1 in
      --*)
        local key="${1#--}"
        local value="${2:-}"
        args+=("--arg" "$key" "$value")
        if [[ -n "$fields" ]]; then
          fields="$fields, "
        fi
        fields="$fields\"$key\": \$$key"
        shift 2
        ;;
      *)
        shift
        ;;
    esac
  done

  if [[ ${#args[@]} -eq 0 ]]; then
    echo "{}"
    return
  fi

  jq -n "${args[@]}" "{$fields}"
}

#######################################
# Validate JSON syntax
# Arguments:
#   $1 - JSON string
# Returns:
#   0 if valid, 1 if invalid
#######################################
json_validate() {
  echo "$1" | jq empty 2>/dev/null
}

#######################################
# Validate JSON file syntax
# Arguments:
#   $1 - File path
# Returns:
#   0 if valid, 1 if invalid
#######################################
json_validate_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  jq empty "$file" 2>/dev/null
}

#######################################
# Pretty print JSON
# Arguments:
#   $1 - JSON string
# Outputs:
#   Formatted JSON to stdout
#######################################
json_pretty() {
  echo "$1" | jq '.'
}

#######################################
# Compact JSON (remove whitespace)
# Arguments:
#   $1 - JSON string
# Outputs:
#   Compact JSON to stdout
#######################################
json_compact() {
  echo "$1" | jq -c '.'
}

#######################################
# Merge two JSON objects
# Arguments:
#   $1 - Base JSON
#   $2 - Override JSON
# Outputs:
#   Merged JSON to stdout
#######################################
json_merge() {
  local base="$1"
  local override="$2"
  echo "$base" | jq --argjson override "$override" '. * $override'
}

#######################################
# Check if JSON has key
# Arguments:
#   $1 - JSON string
#   $2 - Key to check
# Returns:
#   0 if key exists, 1 if not
#######################################
json_has_key() {
  local json="$1"
  local key="$2"
  echo "$json" | jq -e "has(\"$key\")" >/dev/null 2>&1
}

#######################################
# Get JSON array length
# Arguments:
#   $1 - JSON array string
# Outputs:
#   Length to stdout
#######################################
json_array_length() {
  echo "$1" | jq 'length'
}

#######################################
# Add element to JSON array
# Arguments:
#   $1 - JSON array
#   $2 - Element to add (as JSON)
# Outputs:
#   Updated array to stdout
#######################################
json_array_append() {
  local array="$1"
  local element="$2"
  echo "$array" | jq --argjson elem "$element" '. + [$elem]'
}

#######################################
# Set JSON field value
# Arguments:
#   $1 - JSON string
#   $2 - Field path (e.g., '.field.subfield')
#   $3 - New value (as string)
# Outputs:
#   Updated JSON to stdout
#######################################
json_set() {
  local json="$1"
  local path="$2"
  local value="$3"
  echo "$json" | jq --arg val "$value" "$path = \$val"
}

#######################################
# Delete JSON field
# Arguments:
#   $1 - JSON string
#   $2 - Field path
# Outputs:
#   Updated JSON to stdout
#######################################
json_delete() {
  local json="$1"
  local path="$2"
  echo "$json" | jq "del($path)"
}

# Export functions for subshells
export -f json_get json_get_file json_build
export -f json_validate json_validate_file
export -f json_pretty json_compact json_merge
export -f json_has_key json_array_length json_array_append
export -f json_set json_delete

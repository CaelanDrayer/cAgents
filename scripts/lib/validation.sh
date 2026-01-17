#!/bin/bash
# cAgents Validation Library
# Input validation and schema checking
# Version: 1.0.0

# Prevent re-sourcing
[[ -n "${CAGENTS_VALIDATION_LOADED:-}" ]] && return 0
readonly CAGENTS_VALIDATION_LOADED=1

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"

#######################################
# Validate string is not empty
# Arguments:
#   $1 - Value
#   $2 - Field name (for error message)
# Returns:
#   0 if valid, exits if invalid
#######################################
require_nonempty() {
  local value="$1"
  local field="${2:-value}"

  if [[ -z "$value" ]]; then
    die "Required field is empty: $field"
  fi
}

#######################################
# Validate value is numeric
# Arguments:
#   $1 - Value
#   $2 - Field name (for error message)
# Returns:
#   0 if valid, exits if invalid
#######################################
require_numeric() {
  local value="$1"
  local field="${2:-value}"

  if [[ ! "$value" =~ ^[0-9]+$ ]]; then
    die "Field must be numeric: $field (got: '$value')"
  fi
}

#######################################
# Validate value is integer (can be negative)
# Arguments:
#   $1 - Value
#   $2 - Field name
# Returns:
#   0 if valid, exits if invalid
#######################################
require_integer() {
  local value="$1"
  local field="${2:-value}"

  if [[ ! "$value" =~ ^-?[0-9]+$ ]]; then
    die "Field must be an integer: $field (got: '$value')"
  fi
}

#######################################
# Validate file exists
# Arguments:
#   $1 - File path
#   $2 - Description (optional)
# Returns:
#   0 if exists, exits if not
#######################################
require_file() {
  local file="$1"
  local desc="${2:-file}"

  if [[ ! -f "$file" ]]; then
    die "Required $desc not found: $file"
  fi
}

#######################################
# Validate directory exists
# Arguments:
#   $1 - Directory path
#   $2 - Description (optional)
# Returns:
#   0 if exists, exits if not
#######################################
require_dir() {
  local dir="$1"
  local desc="${2:-directory}"

  if [[ ! -d "$dir" ]]; then
    die "Required $desc not found: $dir"
  fi
}

#######################################
# Validate value is one of allowed values
# Arguments:
#   $1 - Value
#   $2 - Allowed values (comma-separated)
#   $3 - Field name (optional)
# Returns:
#   0 if valid, exits if invalid
#######################################
require_oneof() {
  local value="$1"
  local allowed="$2"
  local field="${3:-value}"

  local IFS=','
  for item in $allowed; do
    if [[ "$value" == "$item" ]]; then
      return 0
    fi
  done

  die "Invalid $field: '$value' (allowed: $allowed)"
}

#######################################
# Validate value matches regex
# Arguments:
#   $1 - Value
#   $2 - Regex pattern
#   $3 - Field name (optional)
# Returns:
#   0 if valid, exits if invalid
#######################################
require_match() {
  local value="$1"
  local pattern="$2"
  local field="${3:-value}"

  if [[ ! "$value" =~ $pattern ]]; then
    die "Invalid $field format: '$value' (expected pattern: $pattern)"
  fi
}

#######################################
# Validate YAML frontmatter in markdown file
# Arguments:
#   $1 - File path
#   $2 - Required fields (comma-separated, optional)
# Returns:
#   0 if valid, 1 if invalid
#######################################
validate_frontmatter() {
  local file="$1"
  local required="${2:-}"

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

  # Check required fields
  if [[ -n "$required" ]]; then
    local IFS=','
    for field in $required; do
      if ! grep -q "^${field}:" "$file"; then
        warn "Missing required field: $field in $file"
        return 1
      fi
    done
  fi

  return 0
}

#######################################
# Validate JSON file syntax
# Arguments:
#   $1 - File path
# Returns:
#   0 if valid, 1 if invalid
#######################################
validate_json_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    warn "File not found: $file"
    return 1
  fi

  if ! command_exists jq; then
    warn "jq not installed, skipping JSON validation"
    return 0
  fi

  if ! jq empty "$file" 2>/dev/null; then
    warn "Invalid JSON in: $file"
    return 1
  fi

  return 0
}

#######################################
# Validate YAML file syntax
# Arguments:
#   $1 - File path
# Returns:
#   0 if valid, 1 if invalid
#######################################
validate_yaml_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    warn "File not found: $file"
    return 1
  fi

  # Basic YAML validation (check for common issues)
  # - Tab characters (not allowed in YAML)
  if grep -q $'\t' "$file"; then
    warn "YAML file contains tabs (use spaces): $file"
    return 1
  fi

  return 0
}

#######################################
# Validate path is within allowed directory
# Arguments:
#   $1 - Path to validate
#   $2 - Allowed base directory
# Returns:
#   0 if valid, 1 if invalid (path traversal attempt)
#######################################
validate_path() {
  local path="$1"
  local allowed_base="$2"

  # Resolve to absolute path
  local real_path
  real_path=$(realpath -m "$path" 2>/dev/null) || {
    warn "Invalid path: $path"
    return 1
  }

  # Check prefix
  if [[ "$real_path" != "$allowed_base"* ]]; then
    warn "Path outside allowed directory: $path"
    return 1
  fi

  return 0
}

#######################################
# Validate instruction ID format
# Arguments:
#   $1 - Instruction ID
# Returns:
#   0 if valid, 1 if invalid
#######################################
validate_instruction_id() {
  local id="$1"

  # Format: inst_YYYYMMDD_HHMMSS or inst_YYYYMMDD_NNN
  if [[ ! "$id" =~ ^inst_[0-9]{8}_[0-9]+$ ]]; then
    warn "Invalid instruction ID format: $id"
    return 1
  fi

  return 0
}

#######################################
# Validate domain name
# Arguments:
#   $1 - Domain name
# Returns:
#   0 if valid, 1 if invalid
#######################################
validate_domain() {
  local domain="$1"
  local valid_domains="engineering,revenue,finance-operations,people-culture,customer-experience,legal-compliance,creative,universal"

  local IFS=','
  for valid in $valid_domains; do
    if [[ "$domain" == "$valid" ]]; then
      return 0
    fi
  done

  warn "Invalid domain: $domain (valid: $valid_domains)"
  return 1
}

#######################################
# Validate tier number
# Arguments:
#   $1 - Tier number
# Returns:
#   0 if valid, 1 if invalid
#######################################
validate_tier() {
  local tier="$1"

  if [[ ! "$tier" =~ ^[0-4]$ ]]; then
    warn "Invalid tier: $tier (valid: 0-4)"
    return 1
  fi

  return 0
}

#######################################
# Soft validation (returns result, doesn't exit)
# Arguments:
#   $1 - Value
#   $2 - Validation type (nonempty, numeric, file, dir)
# Returns:
#   0 if valid, 1 if invalid
#######################################
is_valid() {
  local value="$1"
  local type="$2"

  case "$type" in
    nonempty)
      [[ -n "$value" ]]
      ;;
    numeric)
      [[ "$value" =~ ^[0-9]+$ ]]
      ;;
    integer)
      [[ "$value" =~ ^-?[0-9]+$ ]]
      ;;
    file)
      [[ -f "$value" ]]
      ;;
    dir)
      [[ -d "$value" ]]
      ;;
    *)
      return 1
      ;;
  esac
}

# Export functions for subshells
export -f require_nonempty require_numeric require_integer
export -f require_file require_dir require_oneof require_match
export -f validate_frontmatter validate_json_file validate_yaml_file
export -f validate_path validate_instruction_id validate_domain validate_tier
export -f is_valid

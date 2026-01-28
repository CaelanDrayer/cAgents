#!/bin/bash
# cAgents Core Library
# Base utilities for all scripts
# Version: 1.0.0

set -euo pipefail

# Prevent re-sourcing
[[ -n "${CAGENTS_CORE_LOADED:-}" ]] && return 0
readonly CAGENTS_CORE_LOADED=1

# Version
readonly CAGENTS_LIB_VERSION="1.0.0"

# Colors (if terminal supports)
if [[ -t 1 ]]; then
  readonly RED='\033[0;31m'
  readonly GREEN='\033[0;32m'
  readonly YELLOW='\033[1;33m'
  readonly BLUE='\033[0;34m'
  readonly NC='\033[0m'
else
  readonly RED=''
  readonly GREEN=''
  readonly YELLOW=''
  readonly BLUE=''
  readonly NC=''
fi

#######################################
# Print error message and exit
# Arguments:
#   $1 - Error message
#   $2 - Exit code (default: 1)
# Returns:
#   Exits with specified code
#######################################
die() {
  echo -e "${RED}Error:${NC} $1" >&2
  exit "${2:-1}"
}

#######################################
# Print warning message
# Arguments:
#   $1 - Warning message
#######################################
warn() {
  echo -e "${YELLOW}Warning:${NC} $1" >&2
}

#######################################
# Print info message
# Arguments:
#   $1 - Info message
#######################################
info() {
  echo -e "${BLUE}Info:${NC} $1"
}

#######################################
# Print success message
# Arguments:
#   $1 - Success message
#######################################
success() {
  echo -e "${GREEN}Success:${NC} $1"
}

#######################################
# Print error with context (Ralph-style)
# Arguments:
#   $1 - Error type
#   $2 - Error message
#   $3 - Context (optional)
#   $4 - Suggestion (optional)
#######################################
error_with_context() {
  local error_type="$1"
  local message="$2"
  local context="${3:-}"
  local suggestion="${4:-}"

  echo "" >&2
  echo -e "${RED}ERROR [$error_type]:${NC} $message" >&2

  if [[ -n "$context" ]]; then
    echo "" >&2
    echo "Context:" >&2
    echo "$context" | sed 's/^/  /' >&2
  fi

  if [[ -n "$suggestion" ]]; then
    echo "" >&2
    echo "Suggestion:" >&2
    echo "$suggestion" | sed 's/^/  /' >&2
  fi

  echo "" >&2
}

#######################################
# Check if command exists
# Arguments:
#   $1 - Command name
# Returns:
#   0 if exists, 1 if not
#######################################
command_exists() {
  command -v "$1" &>/dev/null
}

#######################################
# Require command or die
# Arguments:
#   $1 - Command name
#   $2 - Install instructions (optional)
#######################################
require_command() {
  if ! command_exists "$1"; then
    local msg="Required command not found: $1"
    if [[ -n "${2:-}" ]]; then
      msg="$msg\n  Install: $2"
    fi
    die "$msg"
  fi
}

#######################################
# Get platform (darwin, linux)
# Outputs:
#   Platform name to stdout
#######################################
get_platform() {
  case "$(uname -s)" in
    Darwin*) echo "darwin" ;;
    Linux*)  echo "linux" ;;
    *)       echo "unknown" ;;
  esac
}

#######################################
# Get current timestamp (ISO 8601)
# Outputs:
#   Timestamp to stdout
#######################################
timestamp() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

#######################################
# Generate unique ID
# Arguments:
#   $1 - Prefix (optional)
# Outputs:
#   Unique ID to stdout
#######################################
generate_id() {
  local prefix="${1:-id}"
  echo "${prefix}_$(date +%Y%m%d_%H%M%S)_$$"
}

#######################################
# Check if variable is set and non-empty
# Arguments:
#   $1 - Variable name (as string)
# Returns:
#   0 if set and non-empty, 1 otherwise
#######################################
is_set() {
  local var_name="$1"
  # Use indirect variable expansion (safer than eval)
  [[ -n "${!var_name:-}" ]]
}

#######################################
# Get script directory
# Outputs:
#   Directory path to stdout
#######################################
get_script_dir() {
  cd "$(dirname "${BASH_SOURCE[1]}")" && pwd
}

#######################################
# Resolve to absolute path
# Arguments:
#   $1 - Path (relative or absolute)
# Outputs:
#   Absolute path to stdout
#######################################
resolve_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    echo "$path"
  else
    echo "$(pwd)/$path"
  fi
}

#######################################
# Compare two version strings
# Arguments:
#   $1 - Version 1 (e.g., "1.6")
#   $2 - Version 2 (e.g., "1.5")
# Returns:
#   0 if version1 >= version2, 1 otherwise
#######################################
version_gte() {
  local version1="$1"
  local version2="$2"

  # Use sort -V for version comparison
  local highest
  highest="$(printf '%s\n%s' "$version1" "$version2" | sort -V | tail -n1)"

  [[ "$highest" == "$version1" ]]
}

#######################################
# Check command version meets minimum
# Arguments:
#   $1 - Command name
#   $2 - Version flag (e.g., "--version")
#   $3 - Minimum version required
#   $4 - Optional: regex to extract version (default: first X.Y.Z pattern)
# Returns:
#   0 if meets minimum, warns if below
#######################################
check_command_version() {
  local cmd="$1"
  local version_flag="$2"
  local min_version="$3"
  local version_regex="${4:-[0-9]+\.[0-9]+(\.[0-9]+)?}"

  if ! command_exists "$cmd"; then
    return 1
  fi

  # Get version output
  local version_output
  version_output="$($cmd $version_flag 2>&1 || true)"

  # Extract version number
  local current_version
  current_version="$(echo "$version_output" | grep -oE "$version_regex" | head -n1)"

  if [[ -z "$current_version" ]]; then
    warn "Could not detect $cmd version (expected >= $min_version)"
    return 0  # Don't fail, just warn
  fi

  if ! version_gte "$current_version" "$min_version"; then
    warn "$cmd version $current_version is below recommended $min_version"
    return 0  # Don't fail, just warn
  fi

  return 0
}

# Export functions for subshells
export -f die warn info success error_with_context
export -f command_exists require_command
export -f get_platform timestamp generate_id
export -f is_set get_script_dir resolve_path
export -f version_gte check_command_version

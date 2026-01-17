#!/bin/bash
# cAgents Files Library
# Safe file operations with atomic writes
# Version: 1.0.0

# Prevent re-sourcing
[[ -n "${CAGENTS_FILES_LOADED:-}" ]] && return 0
readonly CAGENTS_FILES_LOADED=1

# Source core library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"

# Track temp files for cleanup
declare -a CAGENTS_TEMP_FILES=()

#######################################
# Write content atomically to a file
# Arguments:
#   $1 - Target file path
#   $2 - Content to write
# Returns:
#   0 on success, 1 on failure
#######################################
atomic_write() {
  local file="$1"
  local content="$2"
  local dir
  dir=$(dirname "$file")

  # Ensure directory exists
  mkdir -p "$dir" || return 1

  # Create temp file with unique name (PID-based)
  local temp="${file}.tmp.$$"

  # Write content to temp file
  if ! echo "$content" > "$temp"; then
    rm -f "$temp" 2>/dev/null || true
    return 1
  fi

  # Atomic move
  mv "$temp" "$file"
}

#######################################
# Write file atomically from stdin
# Arguments:
#   $1 - Target file path
# Returns:
#   0 on success, 1 on failure
#######################################
atomic_write_stdin() {
  local file="$1"
  local dir
  dir=$(dirname "$file")

  mkdir -p "$dir" || return 1

  local temp="${file}.tmp.$$"

  if ! cat > "$temp"; then
    rm -f "$temp" 2>/dev/null || true
    return 1
  fi

  mv "$temp" "$file"
}

#######################################
# Append content atomically
# Arguments:
#   $1 - Target file path
#   $2 - Content to append
# Returns:
#   0 on success, 1 on failure
#######################################
atomic_append() {
  local file="$1"
  local content="$2"
  local dir
  dir=$(dirname "$file")

  mkdir -p "$dir" || return 1

  local temp="${file}.tmp.$$"

  # Copy existing content (if file exists)
  if [[ -f "$file" ]]; then
    cp "$file" "$temp" || return 1
  fi

  # Append new content
  echo "$content" >> "$temp" || { rm -f "$temp"; return 1; }

  # Atomic move
  mv "$temp" "$file"
}

#######################################
# Create temp file with automatic cleanup
# Arguments:
#   $1 - Prefix (optional)
# Outputs:
#   Temp file path to stdout
#######################################
make_temp() {
  local prefix="${1:-cagents}"
  local temp
  temp=$(mktemp "/tmp/${prefix}.XXXXXX")

  # Track for cleanup
  CAGENTS_TEMP_FILES+=("$temp")

  echo "$temp"
}

#######################################
# Clean up all tracked temp files
#######################################
cleanup_temp_files() {
  for temp in "${CAGENTS_TEMP_FILES[@]}"; do
    rm -f "$temp" 2>/dev/null || true
  done
  CAGENTS_TEMP_FILES=()
}

# Register cleanup on exit
trap cleanup_temp_files EXIT

#######################################
# Safe file delete (idempotent)
# Arguments:
#   $1 - File path
# Returns:
#   0 always
#######################################
safe_delete() {
  rm -f "$1" 2>/dev/null || true
}

#######################################
# Safe directory delete (idempotent)
# Arguments:
#   $1 - Directory path
# Returns:
#   0 always
#######################################
safe_rmdir() {
  rm -rf "$1" 2>/dev/null || true
}

#######################################
# Check file exists and is readable
# Arguments:
#   $1 - File path
# Returns:
#   0 if exists and readable, 1 otherwise
#######################################
file_readable() {
  [[ -f "$1" ]] && [[ -r "$1" ]]
}

#######################################
# Check file exists and is writable
# Arguments:
#   $1 - File path
# Returns:
#   0 if exists and writable, 1 otherwise
#######################################
file_writable() {
  if [[ -f "$1" ]]; then
    [[ -w "$1" ]]
  else
    # File doesn't exist, check if directory is writable
    local dir
    dir=$(dirname "$1")
    [[ -d "$dir" ]] && [[ -w "$dir" ]]
  fi
}

#######################################
# Check directory exists
# Arguments:
#   $1 - Directory path
# Returns:
#   0 if exists, 1 otherwise
#######################################
dir_exists() {
  [[ -d "$1" ]]
}

#######################################
# Ensure directory exists (create if needed)
# Arguments:
#   $1 - Directory path
# Returns:
#   0 on success, 1 on failure
#######################################
ensure_dir() {
  mkdir -p "$1"
}

#######################################
# Get file age in seconds
# Arguments:
#   $1 - File path
# Outputs:
#   Age in seconds to stdout, -1 if not found
#######################################
file_age() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "-1"
    return
  fi

  local now mtime
  now=$(date +%s)

  if [[ "$(get_platform)" == "darwin" ]]; then
    mtime=$(stat -f %m "$file")
  else
    mtime=$(stat -c %Y "$file")
  fi

  echo $((now - mtime))
}

#######################################
# Get file size in bytes
# Arguments:
#   $1 - File path
# Outputs:
#   Size in bytes to stdout, 0 if not found
#######################################
file_size() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo "0"
    return
  fi

  if [[ "$(get_platform)" == "darwin" ]]; then
    stat -f %z "$file"
  else
    stat -c %s "$file"
  fi
}

#######################################
# Copy file atomically
# Arguments:
#   $1 - Source file
#   $2 - Destination file
# Returns:
#   0 on success, 1 on failure
#######################################
atomic_copy() {
  local src="$1"
  local dst="$2"

  if [[ ! -f "$src" ]]; then
    return 1
  fi

  local temp="${dst}.tmp.$$"
  local dir
  dir=$(dirname "$dst")

  mkdir -p "$dir" || return 1
  cp "$src" "$temp" || { rm -f "$temp"; return 1; }
  mv "$temp" "$dst"
}

#######################################
# Create backup of file
# Arguments:
#   $1 - File path
# Returns:
#   0 on success, 1 if file doesn't exist
#######################################
backup_file() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  local backup="${file}.bak"
  cp "$file" "$backup"
}

# Export functions for subshells
export -f atomic_write atomic_write_stdin atomic_append
export -f make_temp cleanup_temp_files safe_delete safe_rmdir
export -f file_readable file_writable dir_exists ensure_dir
export -f file_age file_size atomic_copy backup_file

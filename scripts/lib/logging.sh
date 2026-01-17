#!/bin/bash
# cAgents Logging Library
# Structured logging with levels and file output
# Version: 1.0.0

# Prevent re-sourcing
[[ -n "${CAGENTS_LOGGING_LOADED:-}" ]] && return 0
readonly CAGENTS_LOGGING_LOADED=1

# Source core library
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/core.sh"
source "$SCRIPT_DIR/files.sh"

# Log levels (numeric for comparison)
readonly LOG_LEVEL_DEBUG=0
readonly LOG_LEVEL_INFO=1
readonly LOG_LEVEL_WARN=2
readonly LOG_LEVEL_ERROR=3
readonly LOG_LEVEL_FATAL=4

# Current log level (default: INFO)
CAGENTS_LOG_LEVEL="${CAGENTS_LOG_LEVEL:-$LOG_LEVEL_INFO}"

# Log file (optional)
CAGENTS_LOG_FILE="${CAGENTS_LOG_FILE:-}"

# Log format options
CAGENTS_LOG_TIMESTAMP="${CAGENTS_LOG_TIMESTAMP:-true}"
CAGENTS_LOG_LEVEL_PREFIX="${CAGENTS_LOG_LEVEL_PREFIX:-true}"

#######################################
# Set log level
# Arguments:
#   $1 - Level name (debug, info, warn, error, fatal)
# Returns:
#   0 on success, 1 if invalid level
#######################################
set_log_level() {
  local level="$1"

  case "${level,,}" in
    debug) CAGENTS_LOG_LEVEL=$LOG_LEVEL_DEBUG ;;
    info)  CAGENTS_LOG_LEVEL=$LOG_LEVEL_INFO ;;
    warn)  CAGENTS_LOG_LEVEL=$LOG_LEVEL_WARN ;;
    error) CAGENTS_LOG_LEVEL=$LOG_LEVEL_ERROR ;;
    fatal) CAGENTS_LOG_LEVEL=$LOG_LEVEL_FATAL ;;
    *)
      warn "Invalid log level: $level (valid: debug, info, warn, error, fatal)"
      return 1
      ;;
  esac
}

#######################################
# Set log file
# Arguments:
#   $1 - File path (empty to disable file logging)
# Returns:
#   0 on success
#######################################
set_log_file() {
  local file="$1"

  if [[ -n "$file" ]]; then
    local dir
    dir=$(dirname "$file")
    mkdir -p "$dir" || return 1
    CAGENTS_LOG_FILE="$file"
  else
    CAGENTS_LOG_FILE=""
  fi
}

#######################################
# Internal log function
# Arguments:
#   $1 - Level (numeric)
#   $2 - Level name
#   $3 - Message
#   $4+ - Additional context (optional)
#######################################
_log() {
  local level_num="$1"
  local level_name="$2"
  local message="$3"
  shift 3

  # Check if level is enabled
  if [[ $level_num -lt $CAGENTS_LOG_LEVEL ]]; then
    return
  fi

  # Build log line
  local log_line=""

  # Add timestamp
  if [[ "$CAGENTS_LOG_TIMESTAMP" == "true" ]]; then
    log_line="[$(timestamp)]"
  fi

  # Add level prefix
  if [[ "$CAGENTS_LOG_LEVEL_PREFIX" == "true" ]]; then
    log_line="$log_line [$level_name]"
  fi

  # Add message
  log_line="$log_line $message"

  # Add context if provided
  if [[ $# -gt 0 ]]; then
    log_line="$log_line | context: $*"
  fi

  # Output based on level
  if [[ $level_num -ge $LOG_LEVEL_WARN ]]; then
    echo "$log_line" >&2
  else
    echo "$log_line"
  fi

  # Write to file if configured
  if [[ -n "$CAGENTS_LOG_FILE" ]]; then
    echo "$log_line" >> "$CAGENTS_LOG_FILE"
  fi
}

#######################################
# Log debug message
# Arguments:
#   $1 - Message
#   $2+ - Context (optional)
#######################################
log_debug() {
  _log $LOG_LEVEL_DEBUG "DEBUG" "$@"
}

#######################################
# Log info message
# Arguments:
#   $1 - Message
#   $2+ - Context (optional)
#######################################
log_info() {
  _log $LOG_LEVEL_INFO "INFO" "$@"
}

#######################################
# Log warning message
# Arguments:
#   $1 - Message
#   $2+ - Context (optional)
#######################################
log_warn() {
  _log $LOG_LEVEL_WARN "WARN" "$@"
}

#######################################
# Log error message
# Arguments:
#   $1 - Message
#   $2+ - Context (optional)
#######################################
log_error() {
  _log $LOG_LEVEL_ERROR "ERROR" "$@"
}

#######################################
# Log fatal message and exit
# Arguments:
#   $1 - Message
#   $2 - Exit code (default: 1)
#   $3+ - Context (optional)
#######################################
log_fatal() {
  local message="$1"
  local exit_code="${2:-1}"
  shift 2 || true

  _log $LOG_LEVEL_FATAL "FATAL" "$message" "$@"
  exit "$exit_code"
}

#######################################
# Log structured event (JSON format)
# Arguments:
#   $1 - Event name
#   $2+ - Key=value pairs
# Outputs:
#   JSON event to log
#######################################
log_event() {
  local event="$1"
  shift

  if [[ $LOG_LEVEL_INFO -lt $CAGENTS_LOG_LEVEL ]]; then
    return
  fi

  local json="{"
  json="$json\"timestamp\":\"$(timestamp)\","
  json="$json\"event\":\"$event\""

  # Add key=value pairs
  while [[ $# -gt 0 ]]; do
    local key="${1%%=*}"
    local value="${1#*=}"
    json="$json,\"$key\":\"$value\""
    shift
  done

  json="$json}"

  echo "$json"

  if [[ -n "$CAGENTS_LOG_FILE" ]]; then
    echo "$json" >> "$CAGENTS_LOG_FILE"
  fi
}

#######################################
# Log phase transition
# Arguments:
#   $1 - Instruction ID
#   $2 - From phase
#   $3 - To phase
#######################################
log_phase_transition() {
  local instruction_id="$1"
  local from_phase="$2"
  local to_phase="$3"

  log_event "phase_transition" \
    "instruction_id=$instruction_id" \
    "from=$from_phase" \
    "to=$to_phase"
}

#######################################
# Log task completion
# Arguments:
#   $1 - Instruction ID
#   $2 - Task ID
#   $3 - Status (completed, failed)
#   $4 - Duration (optional)
#######################################
log_task_completion() {
  local instruction_id="$1"
  local task_id="$2"
  local status="$3"
  local duration="${4:-}"

  if [[ -n "$duration" ]]; then
    log_event "task_completion" \
      "instruction_id=$instruction_id" \
      "task_id=$task_id" \
      "status=$status" \
      "duration_ms=$duration"
  else
    log_event "task_completion" \
      "instruction_id=$instruction_id" \
      "task_id=$task_id" \
      "status=$status"
  fi
}

#######################################
# Log hook execution
# Arguments:
#   $1 - Hook name
#   $2 - Result (proceed, block, skip, escalate, fail)
#   $3 - Duration (optional)
#######################################
log_hook_execution() {
  local hook_name="$1"
  local result="$2"
  local duration="${3:-}"

  if [[ -n "$duration" ]]; then
    log_event "hook_execution" \
      "hook=$hook_name" \
      "result=$result" \
      "duration_ms=$duration"
  else
    log_event "hook_execution" \
      "hook=$hook_name" \
      "result=$result"
  fi
}

#######################################
# Start a timed operation
# Arguments:
#   $1 - Operation name
# Outputs:
#   Start time in milliseconds to stdout
#######################################
log_timer_start() {
  local operation="$1"
  log_debug "Starting: $operation"

  # Return epoch milliseconds
  if [[ "$(get_platform)" == "darwin" ]]; then
    echo $(($(date +%s) * 1000))
  else
    echo $(($(date +%s%N) / 1000000))
  fi
}

#######################################
# End a timed operation
# Arguments:
#   $1 - Operation name
#   $2 - Start time (from log_timer_start)
# Outputs:
#   Duration in milliseconds to stdout
#######################################
log_timer_end() {
  local operation="$1"
  local start_time="$2"

  local end_time
  if [[ "$(get_platform)" == "darwin" ]]; then
    end_time=$(($(date +%s) * 1000))
  else
    end_time=$(($(date +%s%N) / 1000000))
  fi

  local duration=$((end_time - start_time))
  log_debug "Completed: $operation (${duration}ms)"
  echo "$duration"
}

# Export functions for subshells
export -f set_log_level set_log_file
export -f log_debug log_info log_warn log_error log_fatal
export -f log_event log_phase_transition log_task_completion log_hook_execution
export -f log_timer_start log_timer_end

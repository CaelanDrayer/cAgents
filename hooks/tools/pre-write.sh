#!/bin/bash
# cAgents Pre-Write/Edit Hook
# Validates file operations for safety and tracking
# Version: 2.0.0
#
# Input (stdin): JSON with tool_name, tool_input (file_path, content, etc.)
# Output (stdout): JSON with hookSpecificOutput for PreToolUse
# Exit 0 = allow, Exit 2 = block

set -o pipefail

exec 3>&1
exec 1>&2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_debug() { :; }
    log_warn() { echo "[$(timestamp)] [WARN] $*"; }
    log_error() { echo "[$(timestamp)] [ERROR] $*"; }
fi

main() {
    local input
    if [[ -t 0 ]]; then
        input='{}'
    else
        input="$(cat)" || input='{}'
    fi

    local tool_name file_path
    if command -v jq &>/dev/null; then
        tool_name=$(echo "$input" | jq -r '.tool_name // "Write"')
        file_path=$(echo "$input" | jq -r '.tool_input.file_path // ""')
    else
        tool_name="Write"
        file_path=""
    fi

    log_debug "Pre-$tool_name hook: $file_path"

    # Define protected paths that should never be modified
    local protected_paths=(
        "/etc/"
        "/usr/"
        "/bin/"
        "/sbin/"
        "/boot/"
        "/sys/"
        "/proc/"
        "$HOME/.ssh/"
        "$HOME/.gnupg/"
    )

    # Check for protected paths
    for protected in "${protected_paths[@]}"; do
        if [[ "$file_path" == "$protected"* ]]; then
            log_error "Blocked write to protected path: $file_path"
            cat >&3 <<EOF
{
  "continue": false,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Cannot write to protected system path: $file_path"
  }
}
EOF
            exit 2
        fi
    done

    # Warn about sensitive files
    local warning_message=""
    local sensitive_patterns=(
        ".env"
        "credentials"
        "secrets"
        "private"
        ".pem"
        ".key"
        "password"
    )

    for pattern in "${sensitive_patterns[@]}"; do
        if [[ "$file_path" == *"$pattern"* ]]; then
            warning_message="Writing to potentially sensitive file: $file_path"
            log_warn "$warning_message"
            break
        fi
    done

    # Build response
    if [[ -n "$warning_message" ]]; then
        cat >&3 <<EOF
{
  "continue": true,
  "systemMessage": "$warning_message",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "File write allowed with warning",
    "additionalContext": "Note: $warning_message"
  }
}
EOF
    else
        echo '{"continue":true}' >&3
    fi

    exit 0
}

main "$@"

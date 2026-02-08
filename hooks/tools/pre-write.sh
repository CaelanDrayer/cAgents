#!/bin/bash
# cAgents Pre-Write/Edit Hook
# Validates file operations for safety and tracking
# Version: 2.1.0
#
# Input (stdin): JSON with tool_name, tool_input (file_path, content, etc.)
# Output (stdout): JSON with hookSpecificOutput for PreToolUse
# Exit 0 with permissionDecision: "deny" = block, Exit 0 with no JSON or "allow" = allow

# CRITICAL: Always output valid JSON on any failure
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR

set -o pipefail

exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
_HOOK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || _HOOK_SCRIPT_DIR="."
_HOOK_INIT="${_HOOK_SCRIPT_DIR}/../../scripts/lib/hook-init.sh"
if [[ -r "$_HOOK_INIT" ]]; then
    source "$_HOOK_INIT"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown"; }
    log_debug() { :; }
    log_warn() { echo "[WARN] $*" >&2; }
    log_error() { echo "[ERROR] $*" >&2; }
    hook_init() { HOOK_INPUT='{}'; [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true; }
    hook_field() { echo "${2:-}"; }
    json_escape() { local s="$1"; s="${s//\\/\\\\}"; echo "${s//\"/\\\"}"; }
fi

main() {
    hook_init

    local tool_name file_path
    tool_name=$(hook_field "tool_name" "Write")
    file_path=$(hook_field "tool_input.file_path" "")

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
    )
    # Only add $HOME-based paths if HOME is set and non-empty
    if [[ -n "${HOME:-}" ]]; then
        protected_paths+=("$HOME/.ssh/" "$HOME/.gnupg/")
    fi

    # Check for protected paths
    for protected in "${protected_paths[@]}"; do
        if [[ "$file_path" == "$protected"* ]]; then
            log_error "Blocked write to protected path: $file_path"
            local safe_path
            safe_path=$(json_escape "$file_path")
            # Use exit 0 with permissionDecision: "deny" per Claude Code docs.
            # Exit 2 would ignore JSON; exit 0 with deny JSON is the correct approach.
            trap - ERR
            cat >&3 <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Cannot write to protected system path: ${safe_path}"
  }
}
EOF
            exit 0
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
        warning_message=$(json_escape "$warning_message")
        cat >&3 <<EOF
{
  "continue": true,
  "systemMessage": "${warning_message}",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "File write allowed with warning"
  }
}
EOF
    else
        echo '{"continue":true}' >&3
    fi

    trap - ERR
    exit 0
}

main "$@"

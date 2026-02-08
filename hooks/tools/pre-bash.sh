#!/bin/bash
# cAgents Pre-Bash Hook
# Validates bash commands before execution for safety
# Version: 2.1.0
#
# Input (stdin): JSON with tool_name, tool_input (command, description, timeout)
# Output (stdout): JSON with hookSpecificOutput for PreToolUse
# Exit 0 = allow, Exit 2 = block

# CRITICAL: Always output valid JSON on any failure
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR EXIT

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
    hook_init() { HOOK_INPUT='{}'; [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true; }
    hook_field() { echo "${2:-}"; }
    json_escape() { local s="$1"; s="${s//\\/\\\\}"; echo "${s//\"/\\\"}"; }
fi

main() {
    hook_init

    local command description
    command=$(hook_field "tool_input.command" "")
    description=$(hook_field "tool_input.description" "")

    log_debug "Pre-bash hook: $description"

    # Normalize whitespace for more robust pattern matching
    # Collapse multiple spaces/tabs into single space for comparison
    local normalized_command
    normalized_command=$(echo "$command" | tr '\t' ' ' | tr -s ' ')

    # Define dangerous patterns that are BLOCKED (exit 2)
    local blocked_patterns=(
        "rm -rf /"
        "rm -rf ~"
        ":(){ :|:& };:"  # Fork bomb
        "> /dev/sda"
        "dd if=/dev/zero"
        "mkfs"
        "sudo "
    )

    for pattern in "${blocked_patterns[@]}"; do
        if [[ "$normalized_command" == *"$pattern"* ]]; then
            local block_reason
            block_reason="Blocked dangerous command: ${pattern}"
            log_warn "$block_reason"
            block_reason=$(json_escape "$block_reason")
            trap - ERR EXIT  # Clear trap before intentional block exit
            cat >&3 <<EOF
{
  "continue": false,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "${block_reason}"
  }
}
EOF
            exit 2
        fi
    done

    # Warn about destructive git commands (allow but warn)
    local warning_message=""
    if [[ "$command" == *"git push"*"--force"* ]] || \
       [[ "$command" == *"git reset --hard"* ]] || \
       [[ "$command" == *"git clean -fd"* ]]; then
        warning_message="Git command may cause data loss"
        log_warn "$warning_message"
    fi

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
    "permissionDecisionReason": "Command allowed with warning"
  }
}
EOF
    else
        # Allow silently
        echo '{"continue":true}' >&3
    fi

    trap - ERR EXIT
    exit 0
}

main "$@"

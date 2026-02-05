#!/bin/bash
# cAgents Pre-Bash Hook
# Validates bash commands before execution for safety
# Version: 2.0.0
#
# Input (stdin): JSON with tool_name, tool_input (command, description, timeout)
# Output (stdout): JSON with hookSpecificOutput for PreToolUse
# Exit 0 = allow, Exit 2 = block

set -o pipefail

exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

main() {
    hook_init

    local command description
    command=$(hook_field "tool_input.command" "")
    description=$(hook_field "tool_input.description" "")

    log_debug "Pre-bash hook: $description"

    # Define dangerous patterns that are BLOCKED (exit 2)
    local blocked_patterns=(
        "rm -rf /"
        "rm -rf ~"
        ":(){ :|:& };:"  # Fork bomb
        "> /dev/sda"
        "mkfs"
        "dd if=/dev/zero"
        "sudo "
        "sudo\t"
    )

    for pattern in "${blocked_patterns[@]}"; do
        if [[ "$command" == *"$pattern"* ]]; then
            local block_reason
            block_reason="Blocked dangerous command: ${pattern}"
            log_warn "$block_reason"
            block_reason=$(json_escape "$block_reason")
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

    exit 0
}

main "$@"

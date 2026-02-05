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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_debug() { :; }
    log_warn() { echo "[$(timestamp)] [WARN] $*"; }
fi

main() {
    hook_init

    local command description
    command=$(hook_field "tool_input.command" "")
    description=$(hook_field "tool_input.description" "")

    log_debug "Pre-bash hook: $description"

    # Define dangerous patterns to warn about (but not block)
    local dangerous_patterns=(
        "rm -rf /"
        "rm -rf ~"
        ":(){ :|:& };:"  # Fork bomb
        "> /dev/sda"
        "mkfs"
        "dd if=/dev/zero"
    )

    local warning_message=""

    for pattern in "${dangerous_patterns[@]}"; do
        if [[ "$command" == *"$pattern"* ]]; then
            warning_message="Potentially dangerous command detected: $pattern"
            log_warn "$warning_message"
            break
        fi
    done

    # Check for commands that modify git history destructively
    if [[ "$command" == *"git push"*"--force"* ]] || \
       [[ "$command" == *"git reset --hard"* ]] || \
       [[ "$command" == *"git clean -fd"* ]]; then
        warning_message="Git command may cause data loss: $command"
        log_warn "$warning_message"
    fi

    # Build response
    if [[ -n "$warning_message" ]]; then
        # Allow but with warning
        cat >&3 <<EOF
{
  "continue": true,
  "systemMessage": "$warning_message",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "permissionDecisionReason": "Command allowed with warning",
    "additionalContext": "Warning: $warning_message"
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

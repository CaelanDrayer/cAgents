#!/bin/bash
# cAgents User Prompt Submit Hook
# Intercepts user prompts to detect workflow triggers
# Version: 2.0.0
#
# Input (stdin): JSON with prompt, session_id, cwd
# Output (stdout): JSON with additionalContext for cAgents awareness
# Exit 0 = allow, Exit 2 = block

set -o pipefail

exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

main() {
    hook_init

    local prompt
    prompt=$(hook_field "prompt" "")

    log_debug "User prompt submitted"

    # Check for active workflow state
    local active_instruction
    local active_phase
    active_instruction=$(get_active_instruction "$HOOK_CWD")
    active_phase=$(get_active_phase "$HOOK_CWD")

    # Build context about current workflow state
    local context=""

    if [[ -n "$active_instruction" ]]; then
        context="[cAgents] Active workflow: $active_instruction (phase: $active_phase)"

        # Check status file for more details
        local status_file="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
        if [[ -f "$status_file" ]]; then
            local status
            status=$(grep "^status:" "$status_file" 2>/dev/null | sed 's/status: *//' | tr -d '"')
            context="$context, status: $status"
        fi
    fi

    # Detect workflow commands
    if [[ "$prompt" == /run* ]] || [[ "$prompt" == /designer* ]] || \
       [[ "$prompt" == /review* ]] || [[ "$prompt" == /optimize* ]]; then
        if [[ -n "$context" ]]; then
            context="$context | Note: New workflow command detected while workflow active"
        fi
    fi

    # Build response
    if [[ -n "$context" ]]; then
        context=$(json_escape "$context")
        cat >&3 <<EOF
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "${context}"
  }
}
EOF
    else
        echo '{"continue":true}' >&3
    fi

    exit 0
}

main "$@"

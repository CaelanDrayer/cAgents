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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_debug() { :; }
fi

readonly AGENT_MEMORY_DIR="Agent_Memory"

main() {
    local input
    if [[ -t 0 ]]; then
        input='{}'
    else
        input="$(cat)" || input='{}'
    fi

    local prompt session_id cwd
    if command -v jq &>/dev/null; then
        prompt=$(echo "$input" | jq -r '.prompt // ""')
        session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        prompt=""
        session_id="unknown"
        cwd="."
    fi

    log_debug "User prompt submitted"

    # Check for active workflow state
    local session_file="${cwd}/.claude/cagents-session.local.md"
    local active_instruction=""
    local active_phase=""

    if [[ -f "$session_file" ]]; then
        active_instruction=$(grep "^active_instruction:" "$session_file" 2>/dev/null | sed 's/active_instruction: *//' | tr -d '"')
        active_phase=$(grep "^active_phase:" "$session_file" 2>/dev/null | sed 's/active_phase: *//' | tr -d '"')
    fi

    # Build context about current workflow state
    local context=""

    if [[ -n "$active_instruction" && "$active_instruction" != "null" ]]; then
        context="[cAgents] Active workflow: $active_instruction (phase: $active_phase)"

        # Check status file for more details
        local status_file="${cwd}/${AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
        if [[ -f "$status_file" ]]; then
            local status
            status=$(grep "^status:" "$status_file" 2>/dev/null | sed 's/status: *//' | tr -d '"')
            context="$context, status: $status"
        fi
    fi

    # Detect workflow commands
    if [[ "$prompt" == /run* ]] || [[ "$prompt" == /explore* ]] || \
       [[ "$prompt" == /review* ]] || [[ "$prompt" == /optimize* ]]; then
        if [[ -n "$context" ]]; then
            context="$context | Note: New workflow command detected while workflow active"
        fi
    fi

    # Build response
    if [[ -n "$context" ]]; then
        cat >&3 <<EOF
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "$context"
  }
}
EOF
    else
        echo '{"continue":true}' >&3
    fi

    exit 0
}

main "$@"

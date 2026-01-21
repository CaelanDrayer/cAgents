#!/bin/bash
# cAgents Task Start Hook (PreToolUse for Task tool)
# Tracks when subagent tasks are spawned
# Version: 2.0.0
#
# Input (stdin): JSON with tool_input containing subagent_type, description, prompt
# Output (stdout): JSON response

set -o pipefail

exec 3>&1
exec 1>&2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_info() { echo "[$(timestamp)] [INFO] $*"; }
fi

readonly AGENT_MEMORY_DIR="Agent_Memory"

main() {
    local input
    if [[ -t 0 ]]; then
        input='{}'
    else
        input="$(cat)" || input='{}'
    fi

    local subagent_type description cwd
    if command -v jq &>/dev/null; then
        subagent_type=$(echo "$input" | jq -r '.tool_input.subagent_type // "unknown"')
        description=$(echo "$input" | jq -r '.tool_input.description // ""')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        subagent_type="unknown"
        description=""
        cwd="."
    fi

    log_info "Task starting: $subagent_type - $description"

    # Track task in session state
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        local active_instruction
        active_instruction=$(grep "^active_instruction:" "$session_file" 2>/dev/null | sed 's/active_instruction: *//' | tr -d '"')

        if [[ -n "$active_instruction" && "$active_instruction" != "null" ]]; then
            # Log task to coordination log
            local coord_log="${cwd}/${AGENT_MEMORY_DIR}/${active_instruction}/workflow/coordination_log.yaml"
            if [[ -d "$(dirname "$coord_log")" ]]; then
                {
                    echo "# Task started at $(timestamp)"
                    echo "# Agent: $subagent_type"
                    echo "# Description: $description"
                } >> "$coord_log" 2>/dev/null || true
            fi
        fi
    fi

    # Provide context about cAgents agent types
    local context=""
    case "$subagent_type" in
        cagents:*)
            context="cAgents workflow agent spawned: $subagent_type"
            ;;
        trigger|orchestrator|universal-*)
            context="cAgents core agent spawned: $subagent_type"
            ;;
    esac

    if [[ -n "$context" ]]; then
        cat >&3 <<EOF
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
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

#!/bin/bash
# cAgents Task Complete Hook (PostToolUse for Task tool)
# Tracks when subagent tasks complete
# Version: 2.0.0
#
# Input (stdin): JSON with tool_response containing task results
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

    local cwd
    if command -v jq &>/dev/null; then
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        cwd="."
    fi

    log_info "Task completed"

    # Track completion in session state
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        local active_instruction
        active_instruction=$(grep "^active_instruction:" "$session_file" 2>/dev/null | sed 's/active_instruction: *//' | tr -d '"')

        if [[ -n "$active_instruction" && "$active_instruction" != "null" ]]; then
            local coord_log="${cwd}/${AGENT_MEMORY_DIR}/${active_instruction}/workflow/coordination_log.yaml"
            if [[ -d "$(dirname "$coord_log")" ]]; then
                echo "# Task completed at $(timestamp)" >> "$coord_log" 2>/dev/null || true
            fi
        fi
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

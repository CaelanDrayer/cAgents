#!/bin/bash
# cAgents Workflow Complete Hook (SubagentStop)
# Archive instruction, cleanup temp files
# Version: 2.0.0
#
# Input (stdin): JSON from SubagentStop event
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

    local session_id cwd
    if command -v jq &>/dev/null; then
        session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        session_id="unknown"
        cwd="."
    fi

    log_info "Subagent/workflow complete"

    # Check for active instruction to archive
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        local active_instruction
        active_instruction=$(grep "^active_instruction:" "$session_file" 2>/dev/null | sed 's/active_instruction: *//' | tr -d '"')

        if [[ -n "$active_instruction" && "$active_instruction" != "null" ]]; then
            log_info "Completing workflow: $active_instruction"

            # Update status.yaml
            local status_file="${cwd}/${AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
            if [[ -f "$status_file" ]]; then
                {
                    echo "completed_at: \"$(timestamp)\""
                    echo "final_status: \"success\""
                } >> "$status_file" 2>/dev/null || true
            fi

            # Archive to _archive directory
            local archive_dir="${cwd}/${AGENT_MEMORY_DIR}/_archive"
            local inst_dir="${cwd}/${AGENT_MEMORY_DIR}/${active_instruction}"
            if [[ -d "$inst_dir" ]]; then
                mkdir -p "$archive_dir" 2>/dev/null || true
                cp -r "$inst_dir" "$archive_dir/" 2>/dev/null || true
                log_info "Archived workflow to _archive"
            fi
        fi
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

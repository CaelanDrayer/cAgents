#!/bin/bash
# cAgents Stop Workflow Hook
# Graceful workflow termination with cleanup
# Version: 2.0.0
#
# Input (stdin): JSON with session_id, reason, cwd, etc.
# Output (stdout): JSON response with continue flag
# Exit 2 to block stop (force Claude to continue)

set -o pipefail

# ALL output goes to stderr except final JSON
exec 3>&1
exec 1>&2

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_info() { echo "[$(timestamp)] [INFO] $*"; }
    log_warn() { echo "[$(timestamp)] [WARN] $*"; }
fi

# Configuration
readonly AGENT_MEMORY_DIR="Agent_Memory"

main() {
    local input
    if [[ -t 0 ]]; then
        input='{"reason":"user_requested"}'
    else
        input="$(cat)" || input='{}'
    fi

    local session_id reason cwd
    if command -v jq &>/dev/null; then
        session_id=$(echo "$input" | jq -r '.session_id // "unknown"')
        reason=$(echo "$input" | jq -r '.reason // "unknown"')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        session_id="unknown"
        reason="unknown"
        cwd="."
    fi

    log_info "Stop hook invoked (reason: $reason)"

    # Check for active workflow that shouldn't be stopped
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        local active_instruction
        active_instruction=$(grep "^active_instruction:" "$session_file" 2>/dev/null | sed 's/active_instruction: *//' | tr -d '"')

        if [[ -n "$active_instruction" && "$active_instruction" != "null" ]]; then
            log_info "Active workflow found: $active_instruction"

            # Update status file if it exists
            local status_file="${cwd}/${AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
            if [[ -f "$status_file" ]]; then
                local updated_at
                updated_at=$(timestamp)
                {
                    echo "stopped_at: \"$updated_at\""
                    echo "stop_reason: \"$reason\""
                } >> "$status_file" 2>/dev/null || true
                log_info "Updated status file"
            fi

            # Clear session state
            sed -i 's/^active_instruction:.*/active_instruction: null/' "$session_file" 2>/dev/null || true
            sed -i 's/^active_phase:.*/active_phase: null/' "$session_file" 2>/dev/null || true
        fi
    fi

    # Allow the stop to proceed
    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

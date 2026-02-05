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
    hook_init

    local reason
    reason=$(hook_field "reason" "unknown")

    log_info "Stop hook invoked (reason: $reason)"

    # Check for active workflow that shouldn't be stopped
    local active_instruction
    active_instruction=$(get_active_instruction "$HOOK_CWD")

    if [[ -n "$active_instruction" ]]; then
        log_info "Active workflow found: $active_instruction"

        # Update status file if it exists
        local status_file="${HOOK_CWD}/${AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
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
        local session_file="${HOOK_CWD}/.claude/cagents-session.local.md"
        if [[ -f "$session_file" ]]; then
            sed -i 's/^active_instruction:.*/active_instruction: null/' "$session_file" 2>/dev/null || true
            sed -i 's/^active_phase:.*/active_phase: null/' "$session_file" 2>/dev/null || true
        fi
    fi

    # Allow the stop to proceed
    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

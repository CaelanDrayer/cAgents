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

# shellcheck source=../../scripts/lib/hook-init.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

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
        local status_file="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
        if [[ -f "$status_file" ]]; then
            yaml_update_field "$status_file" "stopped_at" "$(timestamp)"
            yaml_update_field "$status_file" "stop_reason" "$reason"
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

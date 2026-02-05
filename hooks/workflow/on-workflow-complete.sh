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

# shellcheck source=../../scripts/lib/hook-init.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

main() {
    hook_init

    log_info "Subagent/workflow complete"

    # Check for active instruction to archive
    local active_instruction
    active_instruction=$(get_active_instruction "$HOOK_CWD")

    if [[ -n "$active_instruction" ]]; then
        log_info "Completing workflow: $active_instruction"

        # Update status.yaml (idempotent - replace if exists, append if not)
        local status_file="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
        if [[ -f "$status_file" ]]; then
            yaml_update_field "$status_file" "completed_at" "$(timestamp)"
            yaml_update_field "$status_file" "final_status" "completed"
        fi

        # Archive to _archive directory
        local archive_dir="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/_archive"
        local inst_dir="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/${active_instruction}"
        if [[ -d "$inst_dir" ]]; then
            mkdir -p "$archive_dir" 2>/dev/null || true
            cp -r "$inst_dir" "$archive_dir/" 2>/dev/null || true
            log_info "Archived workflow to _archive"
        fi
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

#!/bin/bash
# cAgents Session End Hook
# Cleanup session state, archive if needed
# Version: 2.0.0
#
# Input (stdin): JSON with session_id, transcript_path, cwd, etc.
# Output (stdout): JSON response with continue flag
# All logging MUST go to stderr

set -o pipefail

# ALL output goes to stderr except final JSON
exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

main() {
    hook_init

    local session_id
    session_id=$(hook_field "session_id" "unknown")

    log_info "Session ending: $session_id"

    # Archive session file if it exists
    local session_file="${HOOK_CWD}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        local archive_dir="${HOOK_CWD}/Agent_Memory/_archive"
        mkdir -p "$archive_dir" 2>/dev/null || true
        local archive_name="${session_id}_$(date +%Y%m%d_%H%M%S).md"
        cp "$session_file" "$archive_dir/$archive_name" 2>/dev/null || true
        log_info "Archived session to $archive_name"
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_info() { echo "[$(timestamp)] [INFO] $*"; }
fi

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

    log_info "Session ending: $session_id"

    # Archive session file if it exists
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        local archive_dir="${cwd}/.claude/sessions"
        mkdir -p "$archive_dir" 2>/dev/null || true
        local archive_name="${session_id}_$(date +%Y%m%d_%H%M%S).md"
        cp "$session_file" "$archive_dir/$archive_name" 2>/dev/null || true
        log_info "Archived session to $archive_name"
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

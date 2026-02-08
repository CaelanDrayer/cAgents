#!/bin/bash
# cAgents Session End Hook
# Cleanup session state, archive if needed
# Version: 2.1.0
#
# Input (stdin): JSON with session_id, transcript_path, cwd, etc.
# Output (stdout): JSON response with continue flag
# All logging MUST go to stderr

# CRITICAL: Always output valid JSON on any failure
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR

set -o pipefail

# ALL output goes to stderr except final JSON
exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
_HOOK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || _HOOK_SCRIPT_DIR="."
_HOOK_INIT="${_HOOK_SCRIPT_DIR}/../../scripts/lib/hook-init.sh"
if [[ -r "$_HOOK_INIT" ]]; then
    source "$_HOOK_INIT"
else
    # Minimal fallbacks for plugin mode
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown"; }
    log_info() { echo "[INFO] $*" >&2; }
    hook_init() {
        HOOK_INPUT='{}'; HOOK_CWD='.'
        [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true
    }
    hook_field() { echo "${2:-}"; }
fi

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

    trap - ERR  # Clear trap before normal exit
    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

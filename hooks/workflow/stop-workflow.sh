#!/bin/bash
# cAgents Stop Workflow Hook
# Graceful workflow termination with cleanup
# Version: 2.2.0
#
# Input (stdin): JSON with session_id, reason, cwd, etc.
# Output (stdout): JSON response with continue flag
# Exit 2 to block stop (force Claude to continue)

# ALL output goes to stderr except final JSON
exec 3>&1
exec 1>&2

set -o pipefail

# CRITICAL: Always output valid JSON on any failure.
# This trap must be set AFTER fd 3 is created (exec 3>&1 above).
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR EXIT

# shellcheck source=../../scripts/lib/hook-init.sh
_HOOK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || _HOOK_SCRIPT_DIR="."
_HOOK_INIT="${_HOOK_SCRIPT_DIR}/../../scripts/lib/hook-init.sh"
if [[ -r "$_HOOK_INIT" ]]; then
    source "$_HOOK_INIT"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown"; }
    log_info() { echo "[INFO] $*" >&2; }
    hook_init() { HOOK_INPUT='{}'; HOOK_CWD='.'; [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true; }
    hook_field() { echo "${2:-}"; }
    get_active_instruction() { :; }
    yaml_update_field() { :; }
    readonly CAGENTS_AGENT_MEMORY_DIR="Agent_Memory"
fi

# CRITICAL: Re-establish safety trap after sourcing libraries.
# files.sh sets 'trap cleanup_temp_files EXIT' which overwrites our trap.
# core.sh sets 'set -euo pipefail' which makes the hook fragile.
# Restore our resilient settings here.
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR EXIT
set +eu  # Disable errexit and nounset from core.sh — hooks must never fail silently
set -o pipefail

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
    trap - ERR EXIT
    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

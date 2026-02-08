#!/bin/bash
# cAgents Stop Workflow Hook
# Graceful workflow termination with cleanup
# Version: 2.3.0
#
# Input (stdin): JSON with session_id, stop_hook_active, cwd, etc.
# Output (stdout): JSON response with continue/decision fields
# Exit 2 to block stop (force Claude to continue)

set -o pipefail

# Read stdin first (before any redirects) so we can parse it
HOOK_INPUT='{}'
if [[ ! -t 0 ]]; then
    HOOK_INPUT="$(cat 2>/dev/null)" || HOOK_INPUT='{}'
fi

# Safe JSON output function - writes to stdout
emit_json() {
    echo "$1"
    exit 0
}

# CRITICAL: Always output valid JSON on any failure.
trap 'echo "{\"continue\":true}"; exit 0' ERR

# Determine project root
HOOK_CWD="."
if command -v jq &>/dev/null; then
    HOOK_CWD=$(echo "$HOOK_INPUT" | jq -r '.cwd // "."' 2>/dev/null) || HOOK_CWD="."
fi

# shellcheck source=../../scripts/lib/hook-bootstrap.sh
_HOOK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || _HOOK_SCRIPT_DIR="."
_BOOTSTRAP="${_HOOK_SCRIPT_DIR}/../../scripts/lib/hook-bootstrap.sh"

# Source bootstrap for shared functions (logging, yaml, state)
# Use inline fallbacks if bootstrap unavailable
if [[ -r "$_BOOTSTRAP" ]]; then
    source "$_BOOTSTRAP" 2>/dev/null || true
    # Reset strict mode after sourcing (core.sh may set -euo)
    set +eu 2>/dev/null || true
    set -o pipefail
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown"; }
    get_active_instruction() { :; }
    yaml_update_field() { :; }
    CAGENTS_AGENT_MEMORY_DIR="Agent_Memory"
fi

# Re-establish safety trap after sourcing libraries
trap 'echo "{\"continue\":true}"; exit 0' ERR

# Parse fields from input
hook_field() {
    local field="$1"
    local default="${2:-}"
    if command -v jq &>/dev/null; then
        echo "$HOOK_INPUT" | jq -r ".${field} // \"${default}\"" 2>/dev/null || echo "$default"
    else
        echo "$default"
    fi
}

main() {
    local reason
    reason=$(hook_field "reason" "unknown")

    echo "[INFO] Stop hook invoked (reason: $reason)" >&2

    # Check for active workflow that shouldn't be stopped
    local active_instruction
    active_instruction=$(get_active_instruction "$HOOK_CWD" 2>/dev/null) || active_instruction=""

    if [[ -n "$active_instruction" ]]; then
        echo "[INFO] Active workflow found: $active_instruction" >&2

        # Update status file if it exists (sessions/ subdirectory)
        local status_file="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/sessions/${active_instruction}/status.yaml"
        if [[ -f "$status_file" ]]; then
            yaml_update_field "$status_file" "stopped_at" "$(timestamp)" 2>/dev/null || true
            yaml_update_field "$status_file" "stop_reason" "$reason" 2>/dev/null || true
            echo "[INFO] Updated status file" >&2
        fi

        # Clear session state
        local session_file="${HOOK_CWD}/.claude/cagents-session.local.md"
        if [[ -f "$session_file" ]]; then
            sed -i 's/^active_instruction:.*/active_instruction: null/' "$session_file" 2>/dev/null || true
            sed -i 's/^active_phase:.*/active_phase: null/' "$session_file" 2>/dev/null || true
        fi
    fi

    # Allow the stop to proceed
    emit_json '{"continue":true}'
}

main "$@"

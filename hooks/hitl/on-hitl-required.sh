#!/bin/bash
# cAgents HITL Required Hook
# Prepare HITL presentation, pause workflow
# Version: 2.0.0
#
# Note: Called programmatically when tier 4 HITL gate is reached
#
# Input: JSON with instruction_id, gate_name, reason
# Output: JSON response

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

    local instruction_id gate_name reason cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        gate_name=$(echo "$input" | jq -r '.gate_name // ""')
        reason=$(echo "$input" | jq -r '.reason // ""')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        gate_name=""
        reason=""
        cwd="."
    fi

    if [[ -z "$instruction_id" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_info "HITL required: $instruction_id - Gate: $gate_name"
    log_info "  Reason: $reason"

    # Update status to paused
    local status_file="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/status.yaml"
    if [[ -f "$status_file" ]]; then
        {
            echo "status: \"paused\""
            echo "paused_at: \"$(timestamp)\""
            echo "paused_for: \"$gate_name\""
            echo "paused_reason: \"$reason\""
        } >> "$status_file" 2>/dev/null || true
    fi

    # Create HITL decision file for tracking
    local hitl_dir="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/workflow"
    mkdir -p "$hitl_dir" 2>/dev/null || true
    local hitl_file="$hitl_dir/hitl_decisions.yaml"
    {
        echo "- gate: \"$gate_name\""
        echo "  required_at: \"$(timestamp)\""
        echo "  reason: \"$reason\""
        echo "  status: \"pending\""
    } >> "$hitl_file" 2>/dev/null || true

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

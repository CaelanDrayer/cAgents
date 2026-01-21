#!/bin/bash
# cAgents HITL Decision Hook
# Record decision, resume or modify workflow
# Version: 2.0.0
#
# Note: Called programmatically when user makes HITL decision
#
# Input: JSON with instruction_id, gate_name, decision, user_message
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

    local instruction_id gate_name decision user_message cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        gate_name=$(echo "$input" | jq -r '.gate_name // ""')
        decision=$(echo "$input" | jq -r '.decision // ""')
        user_message=$(echo "$input" | jq -r '.user_message // ""')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        gate_name=""
        decision=""
        user_message=""
        cwd="."
    fi

    if [[ -z "$instruction_id" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_info "HITL decision received: $instruction_id - Gate: $gate_name"
    log_info "  Decision: $decision"
    log_info "  Message: $user_message"

    # Update HITL decisions file
    local hitl_file="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/workflow/hitl_decisions.yaml"
    if [[ -f "$hitl_file" ]]; then
        {
            echo "  decided_at: \"$(timestamp)\""
            echo "  decision: \"$decision\""
            echo "  user_message: \"$user_message\""
            echo "  status: \"resolved\""
        } >> "$hitl_file" 2>/dev/null || true
    fi

    # Update status to resumed
    local status_file="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/status.yaml"
    if [[ -f "$status_file" ]]; then
        {
            echo "status: \"active\""
            echo "resumed_at: \"$(timestamp)\""
            echo "hitl_decision: \"$decision\""
        } >> "$status_file" 2>/dev/null || true
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

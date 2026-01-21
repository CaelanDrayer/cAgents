#!/bin/bash
# cAgents Phase Start Hook
# Log phase transition, update status.yaml
# Version: 2.0.0
#
# Note: Called programmatically by orchestrator during phase transitions
#
# Input: JSON with instruction_id, phase
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

    local instruction_id phase cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        phase=$(echo "$input" | jq -r '.phase // ""')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        phase=""
        cwd="."
    fi

    if [[ -z "$instruction_id" || -z "$phase" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_info "Phase starting: $instruction_id - $phase"

    # Update status.yaml
    local status_file="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/status.yaml"
    if [[ -f "$status_file" ]]; then
        {
            echo "current_phase: \"$phase\""
            echo "${phase}_started_at: \"$(timestamp)\""
            echo "last_updated: \"$(timestamp)\""
        } >> "$status_file" 2>/dev/null || true
    fi

    # Update session state
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        sed -i "s/^active_phase:.*/active_phase: \"$phase\"/" "$session_file" 2>/dev/null || true
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

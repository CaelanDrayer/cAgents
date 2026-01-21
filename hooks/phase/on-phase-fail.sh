#!/bin/bash
# cAgents Phase Fail Hook
# Handle phase failure, determine recovery
# Version: 2.0.0
#
# Note: Called programmatically by orchestrator when phase fails
#
# Input: JSON with instruction_id, phase, error_message
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
    log_error() { echo "[$(timestamp)] [ERROR] $*"; }
fi

readonly AGENT_MEMORY_DIR="Agent_Memory"

main() {
    local input
    if [[ -t 0 ]]; then
        input='{}'
    else
        input="$(cat)" || input='{}'
    fi

    local instruction_id phase error_message cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        phase=$(echo "$input" | jq -r '.phase // ""')
        error_message=$(echo "$input" | jq -r '.error_message // "Unknown error"')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        phase=""
        error_message="Unknown error"
        cwd="."
    fi

    if [[ -z "$instruction_id" || -z "$phase" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_error "Phase failed: $instruction_id - $phase - $error_message"

    # Update status.yaml
    local status_file="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/status.yaml"
    if [[ -f "$status_file" ]]; then
        {
            echo "${phase}_failed_at: \"$(timestamp)\""
            echo "${phase}_error: \"$error_message\""
            echo "last_updated: \"$(timestamp)\""
        } >> "$status_file" 2>/dev/null || true
    fi

    # Allow recovery logic to proceed
    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

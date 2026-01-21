#!/bin/bash
# cAgents Answer Received Hook
# Log specialist answer, update coordination_log
# Version: 2.0.0
#
# Note: Called programmatically during V7.0 coordination phase
#
# Input: JSON with instruction_id, specialist, question, answer
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
    log_debug() { :; }
fi

readonly AGENT_MEMORY_DIR="Agent_Memory"

main() {
    local input
    if [[ -t 0 ]]; then
        input='{}'
    else
        input="$(cat)" || input='{}'
    fi

    local instruction_id specialist question cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        specialist=$(echo "$input" | jq -r '.specialist // ""')
        question=$(echo "$input" | jq -r '.question // ""')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        specialist=""
        question=""
        cwd="."
    fi

    if [[ -z "$instruction_id" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_debug "Answer received from: $specialist"
    log_debug "  For question: $question"

    # Append to coordination_log.yaml
    local coord_log="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/workflow/coordination_log.yaml"
    if [[ -d "$(dirname "$coord_log")" ]]; then
        {
            echo "# Answer received at $(timestamp)"
            echo "# From: $specialist"
        } >> "$coord_log" 2>/dev/null || true
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

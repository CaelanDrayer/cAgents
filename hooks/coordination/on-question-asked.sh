#!/bin/bash
# cAgents Question Asked Hook
# Log controller question delegation
# Version: 2.0.0
#
# Note: Called programmatically during V7.0 coordination phase
#
# Input: JSON with instruction_id, controller, question, delegated_to
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

    local instruction_id controller question delegated_to cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        controller=$(echo "$input" | jq -r '.controller // ""')
        question=$(echo "$input" | jq -r '.question // ""')
        delegated_to=$(echo "$input" | jq -r '.delegated_to // ""')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        controller=""
        question=""
        delegated_to=""
        cwd="."
    fi

    if [[ -z "$instruction_id" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_debug "Question asked: $controller -> $delegated_to"
    log_debug "  Question: $question"

    # Append to coordination_log.yaml
    local coord_log="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/workflow/coordination_log.yaml"
    local workflow_dir
    workflow_dir=$(dirname "$coord_log")
    mkdir -p "$workflow_dir" 2>/dev/null || true

    {
        echo "# Question asked at $(timestamp)"
        echo "# Controller: $controller"
        echo "# Delegated to: $delegated_to"
        echo "# Question: $question"
    } >> "$coord_log" 2>/dev/null || true

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

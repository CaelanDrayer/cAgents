#!/bin/bash
# cAgents Question Asked Hook
# Log controller question delegation
# Version: 1.1.0

# Use lenient error handling - hooks should not block Claude Code
set -o pipefail

# Source bootstrap (provides fallbacks if libraries unavailable)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")/scripts/lib"

# shellcheck source=../../scripts/lib/hook-bootstrap.sh
if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    # Minimal fallbacks if bootstrap itself is unavailable
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_debug() { :; }
    json_get() { echo "$1" | grep -oP "\"${2#.}\"\\s*:\\s*\"?\\K[^,\"}]+" 2>/dev/null | head -1; }
    json_parse() { json_get "$@"; }
    json_build() {
        local out="{" first=true
        while [[ $# -ge 2 ]]; do
            local k="${1#--}" v="$2"; shift 2
            [[ "$first" == "true" ]] && first=false || out="$out,"
            [[ "$v" == "true" || "$v" == "false" ]] && out="$out\"$k\":$v" || out="$out\"$k\":\"$v\""
        done
        echo "$out}"
    }
fi

main() {
    # Read input from stdin
    local input
    input="$(cat)" || input='{}'

    # Parse input
    local instruction_id
    instruction_id="$(json_parse "$input" '.instruction_id')" || instruction_id=""
    local controller
    controller="$(json_parse "$input" '.controller')" || controller=""
    local question
    question="$(json_parse "$input" '.question')" || question=""
    local delegated_to
    delegated_to="$(json_parse "$input" '.delegated_to')" || delegated_to=""

    # Validate input
    if [[ -z "$instruction_id" ]]; then
        json_build --decision "skip" "message" "No instruction_id provided"
        exit 0
    fi

    # Log question delegation
    log_debug "Question asked: $controller -> $delegated_to"
    log_debug "  Question: $question"

    # Could append to coordination_log.yaml here in production
    local coord_log="Agent_Memory/$instruction_id/workflow/coordination_log.yaml"
    if [[ -f "$coord_log" ]]; then
        echo "# Question asked at $(timestamp)" >> "$coord_log" 2>/dev/null || true
    fi

    # Return success
    json_build \
        --decision "proceed" \
        --message "Question logged"
}

main "$@"

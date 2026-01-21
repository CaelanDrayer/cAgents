#!/bin/bash
# cAgents Phase Fail Hook
# Handle phase failure, determine recovery
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
    log_error() { echo "[$(timestamp)] [ERROR] $*" >&2; }
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
    local phase
    phase="$(json_parse "$input" '.phase')" || phase=""
    local error_message
    error_message="$(json_parse "$input" '.error_message')" || error_message="Unknown error"

    # Validate input
    if [[ -z "$instruction_id" || -z "$phase" ]]; then
        json_build --decision "skip" "message" "Missing instruction_id or phase"
        exit 0
    fi

    # Log phase failure
    log_error "Phase failed: $instruction_id - $phase - $error_message"

    # Update status.yaml
    local status_file="Agent_Memory/$instruction_id/status.yaml"
    if [[ -f "$status_file" ]]; then
        cat >> "$status_file" <<EOF 2>/dev/null || true
${phase}_failed_at: "$(timestamp)"
${phase}_error: "$error_message"
EOF
    fi

    # Return proceed to allow recovery logic
    json_build \
        --decision "proceed" \
        --message "Phase failure logged: $phase"
}

main "$@"

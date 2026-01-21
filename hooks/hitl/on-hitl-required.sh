#!/bin/bash
# cAgents HITL Required Hook
# Prepare HITL presentation, pause workflow
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
    log_info() { echo "[$(timestamp)] [INFO] $*" >&2; }
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
    local gate_name
    gate_name="$(json_parse "$input" '.gate_name')" || gate_name=""
    local reason
    reason="$(json_parse "$input" '.reason')" || reason=""

    # Validate input
    if [[ -z "$instruction_id" ]]; then
        json_build --decision "skip" "message" "No instruction_id provided"
        exit 0
    fi

    # Log HITL requirement
    log_info "HITL required: $instruction_id - Gate: $gate_name"
    log_info "  Reason: $reason"

    # Update status to paused
    local status_file="Agent_Memory/$instruction_id/status.yaml"
    if [[ -f "$status_file" ]]; then
        cat >> "$status_file" <<EOF 2>/dev/null || true
paused_at: "$(timestamp)"
paused_for: "$gate_name"
paused_reason: "$reason"
EOF
    fi

    # Create HITL decision file for tracking
    local hitl_file="Agent_Memory/$instruction_id/workflow/hitl_decisions.yaml"
    mkdir -p "$(dirname "$hitl_file")" 2>/dev/null || true
    cat >> "$hitl_file" <<EOF 2>/dev/null || true
- gate: "$gate_name"
  required_at: "$(timestamp)"
  reason: "$reason"
  status: "pending"
EOF

    # Return success
    json_build \
        --decision "proceed" \
        --message "HITL gate prepared: $gate_name"
}

main "$@"

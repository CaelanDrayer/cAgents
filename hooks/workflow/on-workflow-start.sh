#!/bin/bash
# cAgents Workflow Start Hook
# Initialize instruction folder, create status.yaml
# Version: 2.0.0
#
# Note: This hook is called programmatically by cAgents trigger/orchestrator,
# not directly by Claude Code hooks. It's invoked during workflow initialization.
#
# Input: JSON with instruction_id, domain, tier
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

    local instruction_id domain tier cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        domain=$(echo "$input" | jq -r '.domain // "unknown"')
        tier=$(echo "$input" | jq -r '.tier // 2')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        domain="unknown"
        tier=2
        cwd="."
    fi

    if [[ -z "$instruction_id" ]]; then
        echo '{"continue":true,"systemMessage":"No instruction_id provided"}' >&3
        exit 0
    fi

    log_info "Workflow starting: $instruction_id (domain: $domain, tier: $tier)"

    # Create instruction folder structure
    local inst_dir="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}"
    mkdir -p "$inst_dir"/{workflow,tasks/{pending,in_progress,completed},outputs,validation} 2>/dev/null || true

    # Create initial status.yaml
    local status_file="$inst_dir/status.yaml"
    cat > "$status_file" <<EOF 2>/dev/null || true
instruction_id: "$instruction_id"
domain: "$domain"
tier: $tier
status: "initializing"
current_phase: "routing"
started_at: "$(timestamp)"
last_updated: "$(timestamp)"
phases_completed: []
EOF

    # Update session state
    local session_file="${cwd}/.claude/cagents-session.local.md"
    if [[ -f "$session_file" ]]; then
        sed -i "s/^active_instruction:.*/active_instruction: \"$instruction_id\"/" "$session_file" 2>/dev/null || true
        sed -i 's/^active_phase:.*/active_phase: "routing"/' "$session_file" 2>/dev/null || true
    fi

    log_info "Workflow initialized"

    echo "{\"continue\":true,\"systemMessage\":\"Workflow initialized: $instruction_id\"}" >&3
    exit 0
}

main "$@"

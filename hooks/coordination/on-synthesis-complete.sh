#!/bin/bash
# cAgents Synthesis Complete Hook
# Validate synthesis quality before execution
# Version: 2.0.0
#
# Note: Called programmatically after controller synthesizes answers
#
# Input: JSON with instruction_id, controller, num_questions
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
    log_warn() { echo "[$(timestamp)] [WARN] $*"; }
fi

readonly AGENT_MEMORY_DIR="Agent_Memory"

main() {
    local input
    if [[ -t 0 ]]; then
        input='{}'
    else
        input="$(cat)" || input='{}'
    fi

    local instruction_id controller num_questions cwd
    if command -v jq &>/dev/null; then
        instruction_id=$(echo "$input" | jq -r '.instruction_id // ""')
        controller=$(echo "$input" | jq -r '.controller // ""')
        num_questions=$(echo "$input" | jq -r '.num_questions // "0"')
        cwd=$(echo "$input" | jq -r '.cwd // "."')
    else
        instruction_id=""
        controller=""
        num_questions="0"
        cwd="."
    fi

    if [[ -z "$instruction_id" ]]; then
        echo '{"continue":true}' >&3
        exit 0
    fi

    log_info "Synthesis complete: $controller synthesized $num_questions answers"

    # Validate coordination_log exists (soft check - don't block)
    local coord_log="${cwd}/${AGENT_MEMORY_DIR}/${instruction_id}/workflow/coordination_log.yaml"
    if [[ ! -f "$coord_log" ]]; then
        log_warn "Coordination log not found: $coord_log"
        # Create it if missing
        local workflow_dir
        workflow_dir=$(dirname "$coord_log")
        mkdir -p "$workflow_dir" 2>/dev/null || true
        echo "# Coordination log created at $(timestamp)" > "$coord_log" 2>/dev/null || true
    fi

    # Record synthesis completion
    {
        echo "# Synthesis completed at $(timestamp)"
        echo "# Controller: $controller"
        echo "# Questions synthesized: $num_questions"
    } >> "$coord_log" 2>/dev/null || true

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

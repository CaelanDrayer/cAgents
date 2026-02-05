#!/bin/bash
# cAgents Task Complete Hook (PostToolUse for Task tool)
# Tracks when subagent tasks complete
# Version: 2.1.0
#
# Input (stdin): JSON with tool_response containing task results
# Output (stdout): JSON response

# CRITICAL: Always output valid JSON on any failure
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR EXIT

set -o pipefail

exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
_HOOK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || _HOOK_SCRIPT_DIR="."
_HOOK_INIT="${_HOOK_SCRIPT_DIR}/../../scripts/lib/hook-init.sh"
if [[ -r "$_HOOK_INIT" ]]; then
    source "$_HOOK_INIT"
else
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown"; }
    log_info() { echo "[INFO] $*" >&2; }
    hook_init() { HOOK_INPUT='{}'; HOOK_CWD='.'; [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true; }
    get_active_instruction() { :; }
fi

main() {
    hook_init

    log_info "Task completed"

    # Track completion in session state
    local active_instruction
    active_instruction=$(get_active_instruction "$HOOK_CWD")

    if [[ -n "$active_instruction" ]]; then
        log_info "Task completed for workflow: $active_instruction"
    fi

    trap - ERR EXIT
    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

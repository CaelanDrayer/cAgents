#!/bin/bash
# cAgents Task Complete Hook (PostToolUse for Task tool)
# Tracks when subagent tasks complete
# Version: 2.0.0
#
# Input (stdin): JSON with tool_response containing task results
# Output (stdout): JSON response

set -o pipefail

exec 3>&1
exec 1>&2

# shellcheck source=../../scripts/lib/hook-init.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

main() {
    hook_init

    log_info "Task completed"

    # Track completion in session state
    local active_instruction
    active_instruction=$(get_active_instruction "$HOOK_CWD")

    if [[ -n "$active_instruction" ]]; then
        log_info "Task completed for workflow: $active_instruction"
    fi

    echo '{"continue":true}' >&3
    exit 0
}

main "$@"

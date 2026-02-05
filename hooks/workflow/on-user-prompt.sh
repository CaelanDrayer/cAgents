#!/bin/bash
# cAgents User Prompt Submit Hook
# Intercepts user prompts to detect workflow triggers
# Version: 2.1.0
#
# Input (stdin): JSON with prompt, session_id, cwd
# Output (stdout): JSON with additionalContext for cAgents awareness
# Exit 0 = allow, Exit 2 = block

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
    log_debug() { :; }
    hook_init() { HOOK_INPUT='{}'; HOOK_CWD='.'; [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true; }
    hook_field() { echo "${2:-}"; }
    get_active_instruction() { :; }
    get_active_phase() { :; }
    json_escape() { local s="$1"; s="${s//\\/\\\\}"; echo "${s//\"/\\\"}"; }
    readonly CAGENTS_AGENT_MEMORY_DIR="Agent_Memory"
fi

main() {
    hook_init

    local prompt
    prompt=$(hook_field "prompt" "")

    log_debug "User prompt submitted"

    # Check for active workflow state
    local active_instruction
    local active_phase
    active_instruction=$(get_active_instruction "$HOOK_CWD")
    active_phase=$(get_active_phase "$HOOK_CWD")

    # Build context about current workflow state
    local context=""

    if [[ -n "$active_instruction" ]]; then
        context="[cAgents] Active workflow: $active_instruction (phase: $active_phase)"

        # Check status file for more details
        local status_file="${HOOK_CWD}/${CAGENTS_AGENT_MEMORY_DIR}/${active_instruction}/status.yaml"
        if [[ -f "$status_file" ]]; then
            local status
            status=$(grep "^status:" "$status_file" 2>/dev/null | sed 's/status: *//' | tr -d '"')
            context="$context, status: $status"
        fi
    fi

    # Detect workflow commands
    if [[ "$prompt" == /run* ]] || [[ "$prompt" == /designer* ]] || \
       [[ "$prompt" == /review* ]] || [[ "$prompt" == /optimize* ]]; then
        if [[ -n "$context" ]]; then
            context="$context | Note: New workflow command detected while workflow active"
        fi
    fi

    # Build response
    if [[ -n "$context" ]]; then
        context=$(json_escape "$context")
        cat >&3 <<EOF
{
  "continue": true,
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "${context}"
  }
}
EOF
    else
        echo '{"continue":true}' >&3
    fi

    trap - ERR EXIT
    exit 0
}

main "$@"

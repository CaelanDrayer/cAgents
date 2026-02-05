#!/bin/bash
# cAgents Session Start Hook
# Initialize session state, load context
# Version: 2.1.0
#
# Input (stdin): JSON with session_id, transcript_path, cwd, etc.
# Output (stdout): JSON response with continue, systemMessage, etc.
# All logging MUST go to stderr

# CRITICAL: Always output valid JSON on any failure
# This ensures hooks don't break Claude Code when running as a plugin
trap 'echo "{\"continue\":true}" >&3 2>/dev/null || echo "{\"continue\":true}"; exit 0' ERR EXIT

# Strict mode but don't exit on error - hooks should be resilient
set -o pipefail

# ALL output goes to stderr except final JSON
exec 3>&1  # Save stdout
exec 1>&2  # Redirect stdout to stderr

# Source shared hook init (provides bootstrap + fallbacks)
# shellcheck source=../../scripts/lib/hook-init.sh
_HOOK_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd)" || _HOOK_SCRIPT_DIR="."
_HOOK_INIT="${_HOOK_SCRIPT_DIR}/../../scripts/lib/hook-init.sh"
if [[ -r "$_HOOK_INIT" ]]; then
    source "$_HOOK_INIT"
else
    # Minimal fallbacks for plugin mode
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown"; }
    log_info() { echo "[INFO] $*" >&2; }
    hook_init() {
        HOOK_INPUT='{}'; HOOK_CWD='.'
        [[ ! -t 0 ]] && HOOK_INPUT="$(cat 2>/dev/null)" || true
    }
    hook_field() { echo "${2:-}"; }
fi

main() {
    hook_init

    local session_id
    session_id=$(hook_field "session_id" "unknown")

    log_info "Session starting: $session_id"
    log_info "Working directory: $HOOK_CWD"

    # Initialize session state file
    local session_dir="${HOOK_CWD}/.claude"
    mkdir -p "$session_dir" 2>/dev/null || true

    local session_file="${session_dir}/cagents-session.local.md"
    if [[ ! -f "$session_file" ]]; then
        cat > "$session_file" <<EOF 2>/dev/null || true
---
session_id: "$session_id"
active_instruction: null
active_phase: null
started_at: "$(timestamp)"
---

# cAgents Session State

This file tracks the current session state.
EOF
        log_info "Created session state file"
    fi

    # Output success JSON to original stdout (fd 3)
    # Claude Code expects: { continue: bool, systemMessage?: string }
    trap - ERR EXIT  # Clear trap before normal exit
    echo '{"continue":true,"systemMessage":"cAgents session initialized"}' >&3
    exit 0
}

main "$@"

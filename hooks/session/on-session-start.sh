#!/bin/bash
# cAgents Session Start Hook
# Initialize session state, load context
# Version: 2.0.0
#
# Input (stdin): JSON with session_id, transcript_path, cwd, etc.
# Output (stdout): JSON response with continue, systemMessage, etc.
# All logging MUST go to stderr

# Strict mode but don't exit on error - hooks should be resilient
set -o pipefail

# ALL output goes to stderr except final JSON
exec 3>&1  # Save stdout
exec 1>&2  # Redirect stdout to stderr

# Source bootstrap (provides fallbacks if libraries unavailable)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${SCRIPT_DIR}/../../scripts/lib"

# shellcheck source=../../scripts/lib/hook-bootstrap.sh
if [[ -r "$LIB_DIR/hook-bootstrap.sh" ]]; then
    source "$LIB_DIR/hook-bootstrap.sh"
else
    # Minimal fallbacks
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_info() { echo "[$(timestamp)] [INFO] $*"; }
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
    echo '{"continue":true,"systemMessage":"cAgents session initialized"}' >&3
    exit 0
}

main "$@"

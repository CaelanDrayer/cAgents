#!/bin/bash
# cAgents Session Start Hook
# Initialize session state, load context
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
    local session_id
    session_id="$(json_parse "$input" '.session_id')" || session_id="unknown"

    # Log session start
    log_info "Session starting: $session_id"

    # Initialize session state file
    mkdir -p .claude 2>/dev/null || true
    local session_file=".claude/cagents-session.local.md"

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
    fi

    # Return success - MUST use --key value format for json_build
    json_build \
        --decision "proceed" \
        --message "Session initialized: $session_id"
}

main "$@"

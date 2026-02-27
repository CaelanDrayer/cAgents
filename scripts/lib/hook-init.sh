#!/bin/bash
# cAgents Hook Init - Shared initialization for all shell hooks
# Sources hook-bootstrap.sh with comprehensive fallbacks
# Version: 1.0.0
#
# Usage: source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../../scripts/lib/hook-init.sh"

_HOOK_INIT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -r "$_HOOK_INIT_DIR/hook-bootstrap.sh" ]]; then
    # shellcheck source=hook-bootstrap.sh
    source "$_HOOK_INIT_DIR/hook-bootstrap.sh"
else
    # Comprehensive fallbacks when bootstrap unavailable
    timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
    log_info() { echo "[$(timestamp)] [INFO] $*" >&2; }
    log_warn() { echo "[$(timestamp)] [WARN] $*" >&2; }
    log_error() { echo "[$(timestamp)] [ERROR] $*" >&2; }
    log_debug() { :; }
    hook_init() {
        if [[ -t 0 ]]; then HOOK_INPUT='{}'; else HOOK_INPUT="$(cat)" || HOOK_INPUT='{}'; fi
        HOOK_CWD='.'
    }
    hook_field() { echo "${2:-}"; }
    get_active_instruction() { :; }
    get_active_phase() { :; }
    readonly CAGENTS_AGENT_MEMORY_DIR="Agent_Memory"
fi

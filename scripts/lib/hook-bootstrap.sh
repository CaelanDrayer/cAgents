#!/bin/bash
# cAgents Hook Bootstrap
# Provides fallback implementations when libraries can't be loaded
# Version: 1.0.0

# Determine library directory
HOOK_BOOTSTRAP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Track if we're using fallbacks
USING_FALLBACKS=false

# Try to source a library, provide fallback if it fails
safe_source() {
    local lib_file="$1"
    if [[ -r "$lib_file" ]]; then
        # shellcheck source=/dev/null
        source "$lib_file" 2>/dev/null && return 0
    fi
    USING_FALLBACKS=true
    return 1
}

# Attempt to load all libraries
safe_source "$HOOK_BOOTSTRAP_DIR/core.sh" || true
safe_source "$HOOK_BOOTSTRAP_DIR/json.sh" || true
safe_source "$HOOK_BOOTSTRAP_DIR/logging.sh" || true
safe_source "$HOOK_BOOTSTRAP_DIR/state.sh" || true
safe_source "$HOOK_BOOTSTRAP_DIR/files.sh" || true

# ============================================
# FALLBACK IMPLEMENTATIONS
# These are used when libraries can't be loaded
# ============================================

# Fallback: timestamp
if ! declare -f timestamp &>/dev/null; then
    timestamp() {
        date -u +"%Y-%m-%dT%H:%M:%SZ"
    }
fi

# Fallback: log functions
if ! declare -f log_info &>/dev/null; then
    log_info() {
        echo "[$(timestamp)] [INFO] $*" >&2
    }
fi

if ! declare -f log_warn &>/dev/null; then
    log_warn() {
        echo "[$(timestamp)] [WARN] $*" >&2
    }
fi

if ! declare -f log_error &>/dev/null; then
    log_error() {
        echo "[$(timestamp)] [ERROR] $*" >&2
    }
fi

if ! declare -f log_debug &>/dev/null; then
    log_debug() {
        # Debug is silent by default in fallback mode
        :
    }
fi

if ! declare -f log_event &>/dev/null; then
    log_event() {
        local event="$1"
        shift
        echo "{\"timestamp\":\"$(timestamp)\",\"event\":\"$event\",$*}" >&2
    }
fi

# Fallback: JSON parsing (requires jq, falls back to grep)
if ! declare -f json_get &>/dev/null; then
    json_get() {
        local json="$1"
        local key="$2"
        # Remove leading dot if present
        key="${key#.}"
        if command -v jq &>/dev/null; then
            echo "$json" | jq -r ".$key // empty" 2>/dev/null
        else
            # Very basic fallback - extract simple key-value pairs
            echo "$json" | grep -oP "\"$key\"\\s*:\\s*\"?\\K[^,\"}]+" 2>/dev/null | head -1
        fi
    }
fi

if ! declare -f json_parse &>/dev/null; then
    json_parse() {
        json_get "$@"
    }
fi

# Fallback: JSON building
if ! declare -f json_build &>/dev/null; then
    json_build() {
        local output="{"
        local first=true
        while [[ $# -ge 2 ]]; do
            local key="$1"
            local value="$2"
            shift 2
            # Handle --key style arguments
            key="${key#--}"
            if [[ "$first" == "true" ]]; then
                first=false
            else
                output="$output,"
            fi
            # Quote strings, leave booleans/numbers as-is
            if [[ "$value" == "true" || "$value" == "false" || "$value" =~ ^[0-9]+$ ]]; then
                output="$output\"$key\":$value"
            else
                output="$output\"$key\":\"$value\""
            fi
        done
        output="$output}"
        echo "$output"
    }
fi

# Fallback: ensure_dir
if ! declare -f ensure_dir &>/dev/null; then
    ensure_dir() {
        mkdir -p "$1" 2>/dev/null || true
    }
fi

# Fallback: update_frontmatter_field (no-op in fallback)
if ! declare -f update_frontmatter_field &>/dev/null; then
    update_frontmatter_field() {
        # No-op in fallback mode - can't safely edit YAML without proper tools
        log_debug "Skipping frontmatter update (fallback mode)"
    }
fi

# ============================================
# HOOK HELPER FUNCTIONS
# ============================================

# Read hook input from stdin
read_hook_input() {
    local input=""
    if [[ -t 0 ]]; then
        # Interactive mode - return empty JSON
        echo '{}'
    else
        while IFS= read -r line; do
            input="$input$line"
        done
        echo "$input"
    fi
}

# Return a successful hook response
hook_success() {
    local message="${1:-Hook completed successfully}"
    json_build "decision" "proceed" "message" "$message"
}

# Return a skip response (non-blocking)
hook_skip() {
    local message="${1:-Hook skipped}"
    json_build "decision" "skip" "message" "$message"
}

# Return a failure response
hook_fail() {
    local message="${1:-Hook failed}"
    json_build "decision" "fail" "message" "$message"
}

# Warn if using fallbacks
if [[ "$USING_FALLBACKS" == "true" ]]; then
    log_debug "Hook running with fallback implementations (some libraries not loaded)"
fi

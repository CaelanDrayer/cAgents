# shellcheck shell=bash
#
# scripts/ci/lib/quiet.sh - shared output policy for the scripts/ci validators.
# Sourced (not executed) by validate-agents.sh, validate-versions.sh, cagents-ci.sh.
#
# Colors:  ANSI colors only when stdout is a terminal ([ -t 1 ]) and NO_COLOR is unset.
# Quiet:   on when CAGENTS_CI_QUIET=1, or when CLAUDECODE=1 and CAGENTS_CI_QUIET is not 0.
#          A quiet run re-runs the script with its full output sent to a log file, then
#          prints only the FAIL/WARN/ERROR lines, a 'N passed, M failed' line and
#          '[full output: <path>]'. The exit code of the full run is kept.
# Log dir: $CAGENTS_SESSION_DIR/outputs/logs/ when set, else ${TMPDIR:-/tmp}.
#
# CAGENTS_CI_QUIET_ACTIVE=1 marks the inner (logged) run. Nested validators that the
# inner run calls see it and write their full output into the same log.

# Set GREEN YELLOW RED BLUE NC to ANSI codes, or to empty strings.
cagents_ci_colors() {
    if [ -t 1 ] && [ -z "${NO_COLOR+x}" ]; then
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        RED='\033[0;31m'
        BLUE='\033[0;34m'
        NC='\033[0m'
    else
        GREEN=''
        YELLOW=''
        RED=''
        BLUE=''
        NC=''
    fi
}

# Return 0 when this run must be quiet.
cagents_ci_quiet_enabled() {
    [ -n "${CAGENTS_CI_QUIET_ACTIVE:-}" ] && return 1
    case "${CAGENTS_CI_QUIET:-}" in
        1) return 0 ;;
        0) return 1 ;;
    esac
    [ "${CLAUDECODE:-}" = "1" ]
}

# Usage: cagents_ci_quiet_run <absolute-script-path> "$@"
# Returns at once when quiet mode is off. When quiet mode is on, it does not return:
# it runs the script again with full output to a log, prints the summary, and exits
# with the exit code of that run.
cagents_ci_quiet_run() {
    cagents_ci_quiet_enabled || return 0
    local script="$1"
    shift
    local name dir log rc passed failed
    name=$(basename "$script" .sh)
    if [ -n "${CAGENTS_SESSION_DIR:-}" ]; then
        dir="$CAGENTS_SESSION_DIR/outputs/logs"
    else
        dir="${TMPDIR:-/tmp}"
    fi
    mkdir -p "$dir" 2>/dev/null || dir="${TMPDIR:-/tmp}"
    log="$dir/${name}-$(date +%Y%m%d-%H%M%S)-$$.log"

    rc=0
    CAGENTS_CI_QUIET_ACTIVE=1 bash "$script" "$@" >"$log" 2>&1 || rc=$?

    grep -E 'FAIL|WARN|ERROR' "$log" || true
    passed=$(grep -cwE 'PASS|OK' "$log" || true)
    failed=$(grep -cwE 'FAIL|ERROR' "$log" || true)
    echo "${passed:-0} passed, ${failed:-0} failed"
    echo "[full output: $log]"
    exit "$rc"
}

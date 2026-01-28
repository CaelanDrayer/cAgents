#!/bin/bash
#
# cAgents Evaluation Runner
# Run quality evaluations on workflow sessions
# Version: 8.0.0
#
# Usage:
#   ./scripts/ci/run-evals.sh                    # Evaluate last 5 sessions
#   ./scripts/ci/run-evals.sh --session <id>     # Evaluate specific session
#   ./scripts/ci/run-evals.sh --all              # Evaluate all sessions
#   ./scripts/ci/run-evals.sh --today            # Evaluate today's sessions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_MEMORY="$PROJECT_ROOT/Agent_Memory"
SESSIONS_DIR="$AGENT_MEMORY/sessions"
EVAL_RUNNER="$PROJECT_ROOT/.claude/hooks/eval-runner.js"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#
# Get sessions based on filter
#
get_sessions() {
    local filter="$1"
    local sessions=""

    case "$filter" in
        all)
            sessions=$(ls -1 "$SESSIONS_DIR" 2>/dev/null | sort -r)
            ;;
        today)
            local today=$(date +%Y%m%d)
            sessions=$(ls -1 "$SESSIONS_DIR" 2>/dev/null | grep "_${today}_" | sort -r)
            ;;
        recent|*)
            sessions=$(ls -1 "$SESSIONS_DIR" 2>/dev/null | sort -r | head -5)
            ;;
    esac

    echo "$sessions"
}

#
# Run evaluation for a single session
#
evaluate_session() {
    local session="$1"
    local session_dir="$SESSIONS_DIR/$session"

    if [[ ! -d "$session_dir" ]]; then
        log_error "Session not found: $session"
        return 1
    fi

    # Check if workflow files exist
    if [[ ! -f "$session_dir/workflow/decomposition.yaml" ]] && \
       [[ ! -f "$session_dir/workflow/coordination_log.yaml" ]]; then
        log_warn "Session $session has no workflow files, skipping"
        return 0
    fi

    log_info "Evaluating: $session"
    node "$EVAL_RUNNER" --session "$session" 2>&1
    echo ""
}

#
# Generate summary report
#
generate_summary() {
    local sessions=("$@")
    local total=${#sessions[@]}
    local pass=0
    local fail=0
    local skip=0

    log_info "Generating summary..."

    for session in "${sessions[@]}"; do
        local report="$SESSIONS_DIR/$session/evals/evaluation_report.yaml"

        if [[ ! -f "$report" ]]; then
            ((skip++))
            continue
        fi

        # Extract overall grade
        local grade=$(grep "^overall_grade:" "$report" | cut -d'"' -f2)

        if [[ "$grade" == "FAIL" ]]; then
            ((fail++))
        else
            ((pass++))
        fi
    done

    echo ""
    echo "=================================================="
    echo "EVALUATION SUMMARY"
    echo "=================================================="
    echo ""
    echo "Total sessions: $total"
    echo "Passed: $pass"
    echo "Failed: $fail"
    echo "Skipped: $skip"
    echo ""

    if [[ $fail -gt 0 ]]; then
        return 1
    fi
    return 0
}

#
# Main
#
main() {
    local filter="recent"
    local specific_session=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --session)
                specific_session="$2"
                shift 2
                ;;
            --all)
                filter="all"
                shift
                ;;
            --today)
                filter="today"
                shift
                ;;
            --recent)
                filter="recent"
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Check prerequisites
    if [[ ! -f "$EVAL_RUNNER" ]]; then
        log_error "Eval runner not found: $EVAL_RUNNER"
        exit 1
    fi

    if [[ ! -d "$SESSIONS_DIR" ]]; then
        log_warn "No sessions directory found"
        exit 0
    fi

    echo ""
    echo "=================================================="
    echo "cAgents Evaluation Runner"
    echo "=================================================="
    echo ""

    if [[ -n "$specific_session" ]]; then
        # Evaluate specific session
        evaluate_session "$specific_session"
        exit $?
    fi

    # Get sessions based on filter
    local sessions_list=$(get_sessions "$filter")

    if [[ -z "$sessions_list" ]]; then
        log_info "No sessions found for filter: $filter"
        exit 0
    fi

    # Convert to array
    local sessions_array=()
    while IFS= read -r session; do
        [[ -n "$session" ]] && sessions_array+=("$session")
    done <<< "$sessions_list"

    log_info "Found ${#sessions_array[@]} sessions to evaluate"
    echo ""

    # Run evaluations
    for session in "${sessions_array[@]}"; do
        evaluate_session "$session" || true
    done

    # Generate summary
    generate_summary "${sessions_array[@]}"
    exit $?
}

main "$@"

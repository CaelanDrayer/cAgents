#!/bin/bash
#
# cAgents CI Runner
# Self-contained CI script for quality gates
# Version: 8.0.0
#
# Usage:
#   ./scripts/ci/cagents-ci.sh [command]
#
# Commands:
#   validate    - Validate all agents
#   lint        - Lint agent documentation
#   check       - Run quality checks
#   evals       - Run evaluations on recent sessions
#   all         - Run all checks
#
# Exit codes:
#   0 - All checks passed
#   1 - Validation errors
#   2 - Linting errors
#   3 - Quality check failures

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_MEMORY="$PROJECT_ROOT/Agent_Memory"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

#
# Logging functions
#
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ((ERRORS++))
}

log_section() {
    echo ""
    echo "=================================================="
    echo "$1"
    echo "=================================================="
    echo ""
}

#
# Find all agent directories
#
find_agents() {
    local domain="$1"
    local agents_dir="$PROJECT_ROOT/$domain/agents"

    if [[ -d "$agents_dir" ]]; then
        # Find directories with SKILL.md or .md files
        find "$agents_dir" -type f -name "SKILL.md" -exec dirname {} \; 2>/dev/null
        find "$agents_dir" -maxdepth 1 -type f -name "*.md" 2>/dev/null
    fi
}

#
# Validate agents
#
validate_agents() {
    log_section "AGENT VALIDATION"

    local total=0
    local passed=0
    local failed=0

    # Validate agents in each domain
    for domain in core shared make grow operate people serve; do
        log_info "Checking $domain domain..."

        # Check for agent files
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ ! -d "$domain_dir" ]]; then
            continue
        fi

        # Find and validate each agent
        while IFS= read -r agent_path; do
            ((total++))

            # Run validator if available
            if [[ -f "$PROJECT_ROOT/scripts/validate_agent.js" ]]; then
                if node "$PROJECT_ROOT/scripts/validate_agent.js" "$agent_path" > /dev/null 2>&1; then
                    ((passed++))
                else
                    log_error "Validation failed: $agent_path"
                    ((failed++))
                fi
            else
                # Basic validation: check for frontmatter
                if [[ -f "$agent_path/SKILL.md" ]]; then
                    if head -1 "$agent_path/SKILL.md" | grep -q "^---"; then
                        ((passed++))
                    else
                        log_error "Missing frontmatter: $agent_path/SKILL.md"
                        ((failed++))
                    fi
                elif [[ -f "$agent_path" ]] && [[ "$agent_path" == *.md ]]; then
                    if head -1 "$agent_path" | grep -q "^---"; then
                        ((passed++))
                    else
                        log_error "Missing frontmatter: $agent_path"
                        ((failed++))
                    fi
                fi
            fi
        done < <(find_agents "$domain")
    done

    log_info "Validation: $passed/$total passed"

    if [[ $failed -gt 0 ]]; then
        return 1
    fi
    return 0
}

#
# Lint agent documentation
#
lint_docs() {
    log_section "DOCUMENTATION LINTING"

    local issues=0

    # Check for TODO/FIXME in production agents
    log_info "Checking for TODO/FIXME in agents..."
    for domain in core shared make grow operate people serve; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ -d "$domain_dir" ]]; then
            while IFS= read -r file; do
                if grep -q "TODO\|FIXME" "$file"; then
                    log_warn "TODO/FIXME found in: $file"
                    ((issues++))
                fi
            done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
        fi
    done

    # Check for placeholder text
    log_info "Checking for placeholder text..."
    for domain in core shared make grow operate people serve; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ -d "$domain_dir" ]]; then
            while IFS= read -r file; do
                if grep -q "Replace with\|TBD\|\[INSERT\]" "$file"; then
                    log_warn "Placeholder text in: $file"
                    ((issues++))
                fi
            done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
        fi
    done

    # Check for required sections in agents
    log_info "Checking required sections..."
    for domain in core shared make grow operate people serve; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ -d "$domain_dir" ]]; then
            while IFS= read -r file; do
                if ! grep -q "^## " "$file"; then
                    log_warn "No sections found in: $file"
                    ((issues++))
                fi
            done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
        fi
    done

    log_info "Linting complete: $issues warnings"
    return 0
}

#
# Run quality checks
#
quality_checks() {
    log_section "QUALITY CHECKS"

    local checks_passed=0
    local checks_total=0

    # Check 1: Plugin manifests are valid JSON
    log_info "Checking plugin manifests..."
    ((checks_total++))
    for manifest in $(find "$PROJECT_ROOT" -name "plugin.json" -type f 2>/dev/null); do
        if ! node -e "JSON.parse(require('fs').readFileSync('$manifest', 'utf8'))" 2>/dev/null; then
            log_error "Invalid JSON: $manifest"
        else
            ((checks_passed++))
        fi
    done

    # Check 2: marketplace.json exists and is valid
    log_info "Checking marketplace.json..."
    ((checks_total++))
    if [[ -f "$PROJECT_ROOT/.claude-plugin/marketplace.json" ]]; then
        if node -e "JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/.claude-plugin/marketplace.json', 'utf8'))" 2>/dev/null; then
            ((checks_passed++))
        else
            log_error "Invalid marketplace.json"
        fi
    else
        log_error "Missing marketplace.json"
    fi

    # Check 3: Hooks are executable
    log_info "Checking hooks..."
    ((checks_total++))
    local hooks_valid=true
    for hook in $(find "$PROJECT_ROOT/.claude/hooks" -name "*.js" -type f 2>/dev/null); do
        if ! node -c "$hook" 2>/dev/null; then
            log_error "Invalid JavaScript: $hook"
            hooks_valid=false
        fi
    done
    if $hooks_valid; then
        ((checks_passed++))
    fi

    # Check 4: Required directories exist
    log_info "Checking directory structure..."
    ((checks_total++))
    local dirs_ok=true
    for dir in "core/agents" "shared/agents" "make/agents" ".claude/hooks" ".claude/rules"; do
        if [[ ! -d "$PROJECT_ROOT/$dir" ]]; then
            log_error "Missing directory: $dir"
            dirs_ok=false
        fi
    done
    if $dirs_ok; then
        ((checks_passed++))
    fi

    # Check 5: CLAUDE.md exists
    log_info "Checking CLAUDE.md..."
    ((checks_total++))
    if [[ -f "$PROJECT_ROOT/CLAUDE.md" ]]; then
        ((checks_passed++))
    else
        log_error "Missing CLAUDE.md"
    fi

    log_info "Quality checks: $checks_passed/$checks_total passed"

    if [[ $checks_passed -lt $checks_total ]]; then
        return 3
    fi
    return 0
}

#
# Run evaluations on recent sessions
#
run_evals() {
    log_section "SESSION EVALUATIONS"

    local sessions_dir="$AGENT_MEMORY/sessions"

    if [[ ! -d "$sessions_dir" ]]; then
        log_info "No sessions directory found"
        return 0
    fi

    # Find recent sessions (last 5)
    local sessions=$(ls -1t "$sessions_dir" 2>/dev/null | head -5)

    if [[ -z "$sessions" ]]; then
        log_info "No sessions to evaluate"
        return 0
    fi

    local eval_runner="$PROJECT_ROOT/.claude/hooks/eval-runner.js"
    if [[ ! -f "$eval_runner" ]]; then
        log_warn "Eval runner not found, skipping evaluations"
        return 0
    fi

    for session in $sessions; do
        log_info "Evaluating: $session"
        node "$eval_runner" --session "$session" 2>&1 || true
    done

    return 0
}

#
# Main execution
#
main() {
    local command="${1:-all}"
    local exit_code=0

    log_section "cAgents CI Runner v8.0.0"
    log_info "Project root: $PROJECT_ROOT"
    log_info "Command: $command"

    case "$command" in
        validate)
            validate_agents || exit_code=1
            ;;
        lint)
            lint_docs || exit_code=2
            ;;
        check)
            quality_checks || exit_code=3
            ;;
        evals)
            run_evals || exit_code=0
            ;;
        all)
            validate_agents || exit_code=1
            lint_docs || exit_code=$((exit_code > 0 ? exit_code : 2))
            quality_checks || exit_code=$((exit_code > 0 ? exit_code : 3))
            ;;
        *)
            echo "Unknown command: $command"
            echo "Usage: $0 [validate|lint|check|evals|all]"
            exit 1
            ;;
    esac

    log_section "SUMMARY"
    log_info "Errors: $ERRORS"
    log_info "Warnings: $WARNINGS"

    if [[ $exit_code -eq 0 ]] && [[ $ERRORS -eq 0 ]]; then
        log_info "All checks passed!"
    else
        log_error "CI failed with exit code $exit_code"
    fi

    exit $exit_code
}

main "$@"

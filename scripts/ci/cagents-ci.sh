#!/bin/bash
#
# cAgents CI Runner
# Self-contained CI script for quality gates
# Version: 10.22.7
#
# Usage:
#   ./scripts/ci/cagents-ci.sh [command]
#
# Commands:
#   validate    - Validate all agents
#   lint        - Lint agent documentation
#   check       - Run quality checks
#   test        - Run Vitest test suite
#   evals       - Run evaluations on recent sessions
#   contract    - Run contract tests (schema compatibility)
#   all         - Run all checks
#
# Exit codes:
#   0 - All checks passed
#   1 - Validation errors
#   2 - Linting errors
#   3 - Quality check failures
#   4 - Test failures
#   5 - Contract test failures

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
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    ERRORS=$((ERRORS + 1))
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

    # Delegate to validate-agents.sh which handles all domains with full schema validation.
    # Falls back to basic frontmatter checks if validate-agents.sh is not found.
    if [[ -f "$SCRIPT_DIR/validate-agents.sh" ]]; then
        log_info "Running validate-agents.sh for all domains..."
        if bash "$SCRIPT_DIR/validate-agents.sh" 2>&1; then
            log_info "Agent validation passed"
            return 0
        else
            log_error "Agent validation failed (see output above)"
            return 1
        fi
    fi

    # Fallback: basic frontmatter check when validate-agents.sh is unavailable
    log_warn "validate-agents.sh not found — running basic frontmatter check"
    local total=0
    local passed=0
    local failed=0

    for domain in core shared engineering creative business growth people service leadership; do
        log_info "Checking $domain domain..."
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        if [[ ! -d "$domain_dir" ]]; then
            continue
        fi

        while IFS= read -r agent_path; do
            ((total++))
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
    for domain in core shared engineering creative business growth people service leadership; do
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
    for domain in core shared engineering creative business growth people service leadership; do
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
    for domain in core shared engineering creative business growth people service leadership; do
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

    # Check 3: CJS hooks are valid (V9.5+: CJS-only hooks in .claude/hooks/)
    log_info "Checking CJS hooks..."
    ((checks_total++))
    local hooks_valid=true
    for hook in $(find "$PROJECT_ROOT/.claude/hooks" -name "*.cjs" -type f 2>/dev/null); do
        if ! node --check "$hook" 2>/dev/null; then
            log_error "Invalid CJS hook: $hook"
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
    for dir in "core/agents" "shared/agents" "engineering/agents" "creative/agents" "business/agents" ".claude/hooks" ".claude/rules"; do
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

    local eval_runner="$PROJECT_ROOT/.claude/hooks/eval-runner.cjs"
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
# Fetch schemas for contract tests
#
fetch_schemas() {
    log_info "Fetching schemas for contract tests..."
    if [[ -f "$SCRIPT_DIR/fetch-schemas.sh" ]]; then
        if bash "$SCRIPT_DIR/fetch-schemas.sh" 2>&1; then
            log_info "Schemas fetched successfully"
        else
            log_error "Schema fetch failed"
            return 1
        fi
    else
        log_warn "fetch-schemas.sh not found, skipping schema fetch"
        return 1
    fi
}

#
# Run contract tests
#
run_contract_tests() {
    log_section "CONTRACT TESTS"

    fetch_schemas || return 5

    if [[ ! -f "$PROJECT_ROOT/tests/contract.test.js" ]]; then
        log_warn "No contract test file found, skipping"
        return 0
    fi

    if ! command -v npx &> /dev/null; then
        log_warn "npx not available, skipping contract tests"
        return 0
    fi

    log_info "Running contract test suite..."
    if cd "$PROJECT_ROOT" && npx vitest run tests/contract.test.js --reporter=verbose 2>&1; then
        log_info "All contract tests passed"
        return 0
    else
        log_error "Contract tests failed"
        return 5
    fi
}

#
# Run Vitest tests
#
run_tests() {
    log_section "VITEST TESTS"

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        log_warn "No package.json found, skipping tests"
        return 0
    fi

    # Check if vitest is available
    if ! command -v npx &> /dev/null; then
        log_warn "npx not available, skipping tests"
        return 0
    fi

    log_info "Running Vitest test suite..."
    if cd "$PROJECT_ROOT" && npx vitest run --reporter=verbose 2>&1; then
        log_info "All tests passed"
        return 0
    else
        log_error "Test suite failed"
        return 4
    fi
}

#
# Main execution
#
main() {
    local command="${1:-all}"
    local exit_code=0

    log_section "cAgents CI Runner v10.22.7"
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
        test)
            run_tests || exit_code=4
            ;;
        contract)
            run_contract_tests || exit_code=5
            ;;
        all)
            validate_agents || exit_code=1
            lint_docs || exit_code=$((exit_code > 0 ? exit_code : 2))
            quality_checks || exit_code=$((exit_code > 0 ? exit_code : 3))
            run_tests || exit_code=$((exit_code > 0 ? exit_code : 4))
            run_contract_tests || exit_code=$((exit_code > 0 ? exit_code : 5))
            ;;
        *)
            echo "Unknown command: $command"
            echo "Usage: $0 [validate|lint|check|contract|evals|all]"
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

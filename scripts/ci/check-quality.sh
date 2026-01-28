#!/bin/bash
#
# cAgents Quality Gates
# Pre-commit/PR quality checks
# Version: 8.0.0
#
# Usage:
#   ./scripts/ci/check-quality.sh           # Run all checks
#   ./scripts/ci/check-quality.sh --quick   # Quick checks only
#   ./scripts/ci/check-quality.sh --strict  # Fail on warnings

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
ERRORS=0
WARNINGS=0
CHECKS_RUN=0
CHECKS_PASSED=0

# Options
QUICK=false
STRICT=false

log_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
    ((CHECKS_RUN++))
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((CHECKS_PASSED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARNINGS++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((ERRORS++))
}

#
# Check 1: YAML syntax (basic validation)
#
check_yaml_syntax() {
    log_check "YAML syntax validation"

    local issues=0

    # Find all yaml files in Agent_Memory/_system
    while IFS= read -r file; do
        # Basic YAML validation: check for common issues
        if grep -E '^\s+[a-zA-Z_]+:[^ ]' "$file" > /dev/null 2>&1; then
            # Missing space after colon
            log_warn "Possible YAML issue (missing space after colon): $file"
            ((issues++))
        fi
        if grep -E '^\t' "$file" > /dev/null 2>&1; then
            # Tab characters (YAML requires spaces)
            log_warn "Tab characters in YAML file: $file"
            ((issues++))
        fi
    done < <(find "$PROJECT_ROOT/Agent_Memory/_system" -name "*.yaml" -o -name "*.yml" 2>/dev/null)

    if [[ $issues -eq 0 ]]; then
        log_pass "YAML syntax OK"
        return 0
    else
        log_warn "$issues YAML warnings"
        return 0
    fi
}

#
# Check 2: JavaScript syntax
#
check_js_syntax() {
    log_check "JavaScript syntax validation"

    local errors=0

    # Check hooks
    while IFS= read -r file; do
        if ! node -c "$file" 2>/dev/null; then
            log_fail "Invalid JavaScript: $file"
            ((errors++))
        fi
    done < <(find "$PROJECT_ROOT/.claude/hooks" -name "*.js" -type f 2>/dev/null)

    # Check scripts
    while IFS= read -r file; do
        if ! node -c "$file" 2>/dev/null; then
            log_fail "Invalid JavaScript: $file"
            ((errors++))
        fi
    done < <(find "$PROJECT_ROOT/scripts" -name "*.js" -type f 2>/dev/null)

    if [[ $errors -eq 0 ]]; then
        log_pass "JavaScript syntax OK"
        return 0
    else
        return 1
    fi
}

#
# Check 3: JSON syntax
#
check_json_syntax() {
    log_check "JSON syntax validation"

    local errors=0

    while IFS= read -r file; do
        if ! node -e "JSON.parse(require('fs').readFileSync('$file', 'utf8'))" 2>/dev/null; then
            log_fail "Invalid JSON: $file"
            ((errors++))
        fi
    done < <(find "$PROJECT_ROOT" -name "*.json" -type f -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null)

    if [[ $errors -eq 0 ]]; then
        log_pass "JSON syntax OK"
        return 0
    else
        return 1
    fi
}

#
# Check 4: Agent frontmatter
#
check_agent_frontmatter() {
    log_check "Agent frontmatter validation"

    local issues=0

    for domain in core shared make grow operate people serve; do
        local domain_dir="$PROJECT_ROOT/$domain/agents"
        [[ ! -d "$domain_dir" ]] && continue

        while IFS= read -r file; do
            # Check file starts with ---
            if ! head -1 "$file" | grep -q "^---"; then
                log_fail "Missing frontmatter: $file"
                ((issues++))
                continue
            fi

            # Check for required fields
            local frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | head -10)

            if ! echo "$frontmatter" | grep -q "^name:"; then
                log_warn "Missing 'name' in frontmatter: $file"
                ((issues++))
            fi

            if ! echo "$frontmatter" | grep -q "^tier:"; then
                log_warn "Missing 'tier' in frontmatter: $file"
                ((issues++))
            fi
        done < <(find "$domain_dir" -name "*.md" -type f 2>/dev/null)
    done

    if [[ $issues -eq 0 ]]; then
        log_pass "Agent frontmatter OK"
        return 0
    else
        if [[ $STRICT == true ]]; then
            return 1
        fi
        return 0
    fi
}

#
# Check 5: Version consistency
#
check_version_consistency() {
    log_check "Version consistency"

    local marketplace_version=""
    local plugin_version=""

    if [[ -f "$PROJECT_ROOT/.claude-plugin/marketplace.json" ]]; then
        marketplace_version=$(node -p "JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/.claude-plugin/marketplace.json', 'utf8')).version" 2>/dev/null || echo "")
    fi

    if [[ -f "$PROJECT_ROOT/.claude-plugin/plugin.json" ]]; then
        plugin_version=$(node -p "JSON.parse(require('fs').readFileSync('$PROJECT_ROOT/.claude-plugin/plugin.json', 'utf8')).version" 2>/dev/null || echo "")
    fi

    if [[ -z "$marketplace_version" ]] || [[ -z "$plugin_version" ]]; then
        log_warn "Could not read version from manifests"
        return 0
    fi

    if [[ "$marketplace_version" != "$plugin_version" ]]; then
        log_fail "Version mismatch: marketplace.json ($marketplace_version) vs plugin.json ($plugin_version)"
        return 1
    fi

    log_pass "Version consistent: $marketplace_version"
    return 0
}

#
# Check 6: No secrets in code
#
check_no_secrets() {
    log_check "Secret detection"

    local patterns=(
        'AKIA[0-9A-Z]{16}'           # AWS Access Key
        'sk_live_[0-9a-zA-Z]{24}'    # Stripe Key
        'ghp_[0-9a-zA-Z]{36}'        # GitHub Token
        'sk-[a-zA-Z0-9]{48}'         # OpenAI Key
        'password\s*=\s*["\x27][^"\x27]+'  # Password assignments
    )

    local found_secrets=0

    for pattern in "${patterns[@]}"; do
        while IFS= read -r match; do
            if [[ -n "$match" ]]; then
                log_fail "Possible secret found: $(echo "$match" | head -c 100)..."
                ((found_secrets++))
            fi
        done < <(grep -rE "$pattern" "$PROJECT_ROOT" \
            --include="*.js" --include="*.ts" --include="*.yaml" --include="*.yml" --include="*.json" \
            --exclude-dir=".git" --exclude-dir="node_modules" 2>/dev/null | head -5)
    done

    if [[ $found_secrets -eq 0 ]]; then
        log_pass "No secrets detected"
        return 0
    else
        return 1
    fi
}

#
# Check 7: Required files exist
#
check_required_files() {
    log_check "Required files"

    local required=(
        "CLAUDE.md"
        ".claude-plugin/plugin.json"
        ".claude-plugin/marketplace.json"
        ".claude/settings.json"
        "core/agents/trigger.md"
        "core/agents/orchestrator.md"
    )

    local missing=0

    for file in "${required[@]}"; do
        if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
            log_fail "Missing required file: $file"
            ((missing++))
        fi
    done

    if [[ $missing -eq 0 ]]; then
        log_pass "All required files present"
        return 0
    else
        return 1
    fi
}

#
# Check 8: Shell scripts are executable
#
check_shell_scripts() {
    log_check "Shell script permissions"

    local issues=0

    while IFS= read -r script; do
        if [[ ! -x "$script" ]]; then
            log_warn "Script not executable: $script"
            ((issues++))
        fi
    done < <(find "$PROJECT_ROOT/scripts" -name "*.sh" -type f 2>/dev/null)

    while IFS= read -r script; do
        if [[ ! -x "$script" ]]; then
            log_warn "Hook script not executable: $script"
            ((issues++))
        fi
    done < <(find "$PROJECT_ROOT/hooks" -name "*.sh" -type f 2>/dev/null)

    if [[ $issues -eq 0 ]]; then
        log_pass "Shell scripts OK"
        return 0
    else
        if [[ $STRICT == true ]]; then
            return 1
        fi
        return 0
    fi
}

#
# Main
#
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --quick)
                QUICK=true
                shift
                ;;
            --strict)
                STRICT=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    echo ""
    echo "=================================================="
    echo "cAgents Quality Gates"
    echo "=================================================="
    echo ""
    echo "Mode: $(if $QUICK; then echo 'Quick'; else echo 'Full'; fi)"
    echo "Strict: $STRICT"
    echo ""

    # Always run these checks
    check_json_syntax || true
    check_js_syntax || true
    check_required_files || true
    check_version_consistency || true

    # Full checks (skip in quick mode)
    if [[ $QUICK != true ]]; then
        check_yaml_syntax || true
        check_agent_frontmatter || true
        check_no_secrets || true
        check_shell_scripts || true
    fi

    echo ""
    echo "=================================================="
    echo "QUALITY GATE SUMMARY"
    echo "=================================================="
    echo ""
    echo "Checks run: $CHECKS_RUN"
    echo "Checks passed: $CHECKS_PASSED"
    echo "Warnings: $WARNINGS"
    echo "Errors: $ERRORS"
    echo ""

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Quality gate FAILED${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]] && [[ $STRICT == true ]]; then
        echo -e "${YELLOW}Quality gate FAILED (strict mode)${NC}"
        exit 1
    else
        echo -e "${GREEN}Quality gate PASSED${NC}"
        exit 0
    fi
}

main "$@"

#!/bin/bash
#
# cAgents Agent Schema Validation
# Validates all agent SKILL.md files across all 8 domains
# Version: 10.0.0
#
# Usage:
#   ./scripts/ci/validate-agents.sh           # Validate all domains
#   ./scripts/ci/validate-agents.sh --domain engineering  # Validate one domain
#   ./scripts/ci/validate-agents.sh --strict  # Fail on warnings
#   ./scripts/ci/validate-agents.sh --count   # Just print counts
#
# Checks:
#   1. SKILL.md exists for each agent directory
#   2. Frontmatter starts with ---
#   3. Required fields: name, tier
#   4. Tier value is valid (controller, execution, support, executive)
#   5. Agent path matches plugin.json registration
#   6. No orphan agents (in directory but not in plugin.json)

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
TOTAL=0
PASSED=0
WARNINGS=0
ERRORS=0

# Options
STRICT=false
COUNT_ONLY=false
FILTER_DOMAIN=""

# All v10 domains
DOMAINS=(engineering creative business growth people service leadership shared core)

log_pass() {
    if [[ $COUNT_ONLY != true ]]; then
        echo -e "  ${GREEN}PASS${NC} $1"
    fi
    PASSED=$((PASSED + 1))
}

log_warn() {
    if [[ $COUNT_ONLY != true ]]; then
        echo -e "  ${YELLOW}WARN${NC} $1"
    fi
    WARNINGS=$((WARNINGS + 1))
}

log_fail() {
    if [[ $COUNT_ONLY != true ]]; then
        echo -e "  ${RED}FAIL${NC} $1"
    fi
    ERRORS=$((ERRORS + 1))
}

#
# Load root plugin.json agent list for cross-reference
#
load_registered_agents() {
    local plugin_json="$PROJECT_ROOT/.claude-plugin/plugin.json"
    if [[ ! -f "$plugin_json" ]]; then
        echo ""
        return
    fi
    node -e "
        const data = JSON.parse(require('fs').readFileSync('$plugin_json', 'utf8'));
        (data.agents || []).forEach(a => console.log(a));
    " 2>/dev/null || echo ""
}

REGISTERED_AGENTS=$(load_registered_agents)

#
# Validate a single agent SKILL.md
#
validate_agent() {
    local skill_md="$1"
    local relative_path="${skill_md#$PROJECT_ROOT/}"
    TOTAL=$((TOTAL + 1))

    # Check 1: File exists (should always be true since we found it)
    if [[ ! -f "$skill_md" ]]; then
        log_fail "Missing: $relative_path"
        return
    fi

    # Check 2: Starts with frontmatter ---
    local first_line
    first_line=$(head -1 "$skill_md")
    if [[ "$first_line" != "---" ]]; then
        log_fail "No frontmatter: $relative_path"
        return
    fi

    # Extract frontmatter (between first and second ---)
    local frontmatter
    frontmatter=$(sed -n '2,/^---$/p' "$skill_md" | head -n -1)

    # Check 3: Required field - name
    if ! echo "$frontmatter" | grep -q "^name:"; then
        log_fail "Missing 'name' field: $relative_path"
        return
    fi

    # Check 4: Required field - tier
    if ! echo "$frontmatter" | grep -q "^tier:"; then
        log_warn "Missing 'tier' field: $relative_path"
        return
    fi

    # Check 5: Valid tier value
    local tier_value
    tier_value=$(echo "$frontmatter" | grep "^tier:" | sed 's/^tier:\s*//' | tr -d '[:space:]' | tr -d '"' | tr -d "'")
    case "$tier_value" in
        controller|execution|support|executive|infrastructure)
            ;;
        *)
            log_warn "Unknown tier '$tier_value': $relative_path"
            return
            ;;
    esac

    # Check 6: Registered in root plugin.json
    if [[ -n "$REGISTERED_AGENTS" ]]; then
        if ! echo "$REGISTERED_AGENTS" | grep -q "^${relative_path}$"; then
            log_warn "Not in root plugin.json: $relative_path"
            return
        fi
    fi

    log_pass "$relative_path"
}

#
# Validate all agents in a domain
#
validate_domain() {
    local domain="$1"
    local agents_dir="$PROJECT_ROOT/$domain/agents"

    if [[ ! -d "$agents_dir" ]]; then
        return
    fi

    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[$domain]${NC}"
    fi

    # Find all SKILL.md files
    while IFS= read -r skill_md; do
        validate_agent "$skill_md"
    done < <(find "$agents_dir" -name "SKILL.md" -type f 2>/dev/null | sort)
}

#
# Check for orphan agents (in plugin.json but file doesn't exist)
#
check_orphans() {
    if [[ -z "$REGISTERED_AGENTS" ]]; then
        return
    fi

    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[orphan check]${NC}"
    fi

    local orphans=0
    while IFS= read -r agent_path; do
        if [[ ! -f "$PROJECT_ROOT/$agent_path" ]]; then
            log_fail "Registered but missing: $agent_path"
            orphans=$((orphans + 1))
        fi
    done <<< "$REGISTERED_AGENTS"

    if [[ $orphans -eq 0 ]] && [[ $COUNT_ONLY != true ]]; then
        echo -e "  ${GREEN}No orphan agents found${NC}"
    fi
}

#
# Main
#
main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --domain)
                FILTER_DOMAIN="$2"
                shift 2
                ;;
            --strict)
                STRICT=true
                shift
                ;;
            --count)
                COUNT_ONLY=true
                shift
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--domain <name>] [--strict] [--count]"
                exit 1
                ;;
        esac
    done

    if [[ $COUNT_ONLY != true ]]; then
        echo ""
        echo "=================================================="
        echo "cAgents Agent Validation (v10.0.0)"
        echo "=================================================="
    fi

    # Validate domains
    if [[ -n "$FILTER_DOMAIN" ]]; then
        validate_domain "$FILTER_DOMAIN"
    else
        for domain in "${DOMAINS[@]}"; do
            validate_domain "$domain"
        done
        check_orphans
    fi

    # Summary
    echo ""
    echo "=================================================="
    echo "AGENT VALIDATION SUMMARY"
    echo "=================================================="
    echo ""
    echo "Total agents: $TOTAL"
    echo -e "Passed: ${GREEN}$PASSED${NC}"
    echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
    echo -e "Errors: ${RED}$ERRORS${NC}"
    echo ""

    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Agent validation FAILED${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]] && [[ $STRICT == true ]]; then
        echo -e "${YELLOW}Agent validation FAILED (strict mode)${NC}"
        exit 1
    else
        echo -e "${GREEN}Agent validation PASSED${NC}"
        exit 0
    fi
}

main "$@"

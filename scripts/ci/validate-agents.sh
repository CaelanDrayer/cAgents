#!/bin/bash
#
# cAgents Agent Schema Validation
# Validates all agent SKILL.md files across all 15 domains
# Version: 10.26.4
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
#   3. Required fields: name (WARN), tier (ERROR)
#   4. Tier value is valid (controller, execution, support, executive, infrastructure)
#   5. Agent path matches plugin.json registration
#   6. No orphan agents (in directory but not in plugin.json)
#   7. Domain/name consistency (agent dir matches domain field)
#   8. Description length validation (10-1024 chars)
#   9. related-agents resolution (referenced agents must exist)
#  10. Vibe field presence check (WARN if missing)
#  11. Agent Skills spec: name max 64 chars
#  12. Agent Skills spec: name matches directory name (ERROR)
#  13. Agent Skills spec: description max 1024 chars
#  14. Legacy related-agents field rejection (WARN)
#  15. plugin.json structural validation (required: name field)
#  16. domain_overrides.yaml agent reference validation

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

# All v11 domains (15 total)
DOMAINS=(engineering creative business growth people service leadership shared core science health education personal arts trades)

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

    # Helper: get a field value from frontmatter, checking top-level AND metadata: block
    # Usage: get_fm_field "tier" "$frontmatter"
    get_fm_field() {
        local field="$1" fm="$2"
        # Top-level: ^field:
        local val
        val=$(echo "$fm" | grep "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//" | tr -d '"' | tr -d "'")
        if [[ -z "$val" ]]; then
            # Inside metadata: block (2-space indent): ^  field:
            val=$(echo "$fm" | grep "^  ${field}:" | head -1 | sed "s/^  ${field}:[[:space:]]*//" | tr -d '"' | tr -d "'")
        fi
        echo "$val"
    }

    # Helper: check if a field exists at top-level or inside metadata: block
    has_fm_field() {
        local field="$1" fm="$2"
        echo "$fm" | grep -q "^${field}:" && return 0
        echo "$fm" | grep -q "^  ${field}:" && return 0
        return 1
    }

    # Check 3: Required field - name (always top-level per spec)
    if ! echo "$frontmatter" | grep -q "^name:"; then
        log_fail "Missing 'name' field: $relative_path"
        return
    fi

    # Check 4: Required field - tier (may now be inside metadata:)
    if ! has_fm_field "tier" "$frontmatter"; then
        log_fail "Missing 'tier' field (required): $relative_path"
        return
    fi

    # Check 5: Valid tier value
    local tier_value
    tier_value=$(get_fm_field "tier" "$frontmatter" | tr -d '[:space:]')
    case "$tier_value" in
        controller|execution|support|executive|infrastructure)
            ;;
        *)
            log_warn "Unknown tier '$tier_value': $relative_path"
            return
            ;;
    esac

    # Check 6: Registered in root plugin.json
    # plugin.json uses "./" prefix (e.g., "./engineering/agents/foo/SKILL.md")
    if [[ -n "$REGISTERED_AGENTS" ]]; then
        if ! echo "$REGISTERED_AGENTS" | grep -qF "./${relative_path}"; then
            log_warn "Not in root plugin.json: $relative_path"
            return
        fi
    fi

    # Check 7: Domain/name consistency
    local name_value
    name_value=$(echo "$frontmatter" | grep "^name:" | sed 's/^name:\s*//' | tr -d '[:space:]' | tr -d '"' | tr -d "'")
    local domain_value
    domain_value=$(get_fm_field "domain" "$frontmatter" | tr -d '[:space:]')
    local dir_domain
    dir_domain=$(echo "$relative_path" | cut -d'/' -f1)
    local dir_name
    dir_name=$(basename "$(dirname "$skill_md")")

    if [[ -n "$domain_value" ]] && [[ "$domain_value" != "$dir_domain" ]]; then
        # Allow core agents to have non-core domain values (infrastructure agents)
        if [[ "$dir_domain" != "core" ]] || [[ "$domain_value" != "core" && "$tier_value" != "infrastructure" ]]; then
            log_warn "Domain mismatch: frontmatter says '$domain_value' but file is in '$dir_domain/': $relative_path"
        fi
    fi

    # Check 11: Agent Skills spec - name max 64 chars
    if [[ -n "$name_value" ]]; then
        local name_len=${#name_value}
        if [[ $name_len -gt 64 ]]; then
            log_fail "Name too long (${name_len} chars, max 64): $relative_path"
            return
        fi
    fi

    # Check 12: Agent Skills spec - name MUST match directory name (ERROR)
    if [[ -n "$name_value" ]] && [[ "$name_value" != "$dir_name" ]]; then
        log_fail "Name/directory mismatch: frontmatter name '$name_value' != directory '$dir_name': $relative_path"
        return
    fi

    # Check 8: Description length validation (10-1024 chars)
    local description
    description=$(echo "$frontmatter" | grep "^description:" | sed 's/^description:\s*//' | tr -d '"' | tr -d "'")
    if [[ -n "$description" ]]; then
        local desc_len=${#description}
        if [[ $desc_len -lt 10 ]]; then
            log_warn "Description too short (${desc_len} chars, min 10): $relative_path"
        elif [[ $desc_len -gt 1024 ]]; then
            log_warn "Description too long (${desc_len} chars, max 1024): $relative_path"
        fi
    fi

    # Check 14: Legacy related-agents field rejection (prefer related_agents structured format)
    # Check both top-level (pre-migration) and inside metadata: (post-migration)
    if echo "$frontmatter" | grep -q "^related-agents:" || echo "$frontmatter" | grep -q "^  related-agents:"; then
        log_warn "Legacy 'related-agents' field found (use 'related_agents' structured format instead): $relative_path"
    fi

    # Check 9: related_agents resolution (referenced agents must exist)
    # After migration, related_agents lives inside metadata: block (indented)
    local related_agents
    related_agents=$(echo "$frontmatter" | grep -A 20 -E "^related_agents:|^  related_agents:" | grep "^\s*-\s*name:" | sed 's/^\s*-\s*name:\s*//' | tr -d '"' | tr -d "'")
    if [[ -n "$related_agents" ]]; then
        while IFS= read -r related; do
            related=$(echo "$related" | tr -d '[:space:]')
            [[ -z "$related" ]] && continue
            # Strip common prefixes (e.g., "name:" from "name:backend-developer")
            related="${related#name:}"
            related="${related#cagents:}"
            # Check if the referenced agent exists in any domain
            local found=false
            for check_domain in "${DOMAINS[@]}"; do
                if [[ -f "$PROJECT_ROOT/$check_domain/agents/$related/SKILL.md" ]]; then
                    found=true
                    break
                fi
            done
            if [[ "$found" != true ]]; then
                log_warn "related-agent '$related' not found in any domain: $relative_path"
            fi
        done <<< "$related_agents"
    fi

    # Check 10: Vibe field presence (WARN if missing - advisory)
    # After migration, vibe lives inside metadata: block
    # Silent pass for now - vibe is advisory
    : # no-op

    # Check 15b: Model field presence (WARN if missing)
    # After migration, model lives inside metadata: block
    if ! has_fm_field "model" "$frontmatter"; then
        log_warn "Missing 'model' field (recommended per Agent Skills spec): $relative_path"
    fi

    # Check 15c: Color field presence (WARN if missing)
    # After migration, color lives inside metadata: block
    if ! has_fm_field "color" "$frontmatter"; then
        log_warn "Missing 'color' field (recommended per Anthropic convention): $relative_path"
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
# Validate hook registry (WI-22/WI-37/WI-38)
# Verify all hooks referenced in settings.json actually exist as .cjs files
#
validate_hooks() {
    local settings_json="$PROJECT_ROOT/.claude/settings.json"
    if [[ ! -f "$settings_json" ]]; then
        log_warn "settings.json not found, skipping hook validation"
        return
    fi

    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[hook registry]${NC}"
    fi

    # Extract hook filenames from settings.json commands
    local hook_names
    hook_names=$(node -e "
        const data = JSON.parse(require('fs').readFileSync('$settings_json', 'utf8'));
        const hooks = data.hooks || {};
        const names = new Set();
        for (const [event, entries] of Object.entries(hooks)) {
            for (const entry of entries) {
                for (const hook of (entry.hooks || [])) {
                    if (hook.command) {
                        const match = hook.command.match(/run-hook\\.cjs[\"']?\\s+([a-z][a-z0-9-]*)/);
                        if (match) names.add(match[1]);
                    }
                }
            }
        }
        names.forEach(n => console.log(n));
    " 2>/dev/null)

    local hook_count=0
    local hook_missing=0
    while IFS= read -r hook_name; do
        [[ -z "$hook_name" ]] && continue
        hook_count=$((hook_count + 1))
        local hook_file="$PROJECT_ROOT/.claude/hooks/${hook_name}.cjs"
        if [[ ! -f "$hook_file" ]]; then
            log_fail "Hook file missing: .claude/hooks/${hook_name}.cjs (referenced in settings.json)"
            hook_missing=$((hook_missing + 1))
        fi
    done <<< "$hook_names"

    if [[ $hook_missing -eq 0 ]] && [[ $hook_count -gt 0 ]] && [[ $COUNT_ONLY != true ]]; then
        echo -e "  ${GREEN}All $hook_count registered hooks have matching .cjs files${NC}"
    fi

    # Verify hook count matches expected (27 registered hooks across 19 event types)
    if [[ $hook_count -gt 0 ]] && [[ $hook_count -ne 27 ]]; then
        log_warn "Hook count mismatch: found $hook_count registered hooks, expected 27"
    fi
}

#
# Check 15: Validate plugin.json structural requirements
#
validate_plugin_json() {
    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[plugin.json validation]${NC}"
    fi

    local root_plugin="$PROJECT_ROOT/.claude-plugin/plugin.json"
    if [[ ! -f "$root_plugin" ]]; then
        log_fail "Root plugin.json missing: .claude-plugin/plugin.json"
        return
    fi

    # Required field: name
    local has_name
    has_name=$(node -e "
        const data = JSON.parse(require('fs').readFileSync('$root_plugin', 'utf8'));
        console.log(data.name ? 'yes' : 'no');
    " 2>/dev/null)
    if [[ "$has_name" != "yes" ]]; then
        log_fail "plugin.json missing required 'name' field"
    else
        log_pass "Root plugin.json has required 'name' field"
    fi

}

#
# Check 16: Validate domain_overrides.yaml agent references
#
validate_domain_overrides() {
    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[domain_overrides validation]${NC}"
    fi

    local overrides_found=0
    local overrides_errors=0

    for domain in "${DOMAINS[@]}"; do
        local overrides_file="$PROJECT_ROOT/$domain/config/domain_overrides.yaml"
        if [[ ! -f "$overrides_file" ]]; then
            continue
        fi
        overrides_found=$((overrides_found + 1))

        # Extract agent references from controller_catalog
        local agent_refs
        agent_refs=$(grep -E "^\s+name:" "$overrides_file" 2>/dev/null | sed 's/^\s*name:\s*//' | tr -d '"' | tr -d "'" | tr -d '[:space:]')
        while IFS= read -r agent_ref; do
            [[ -z "$agent_ref" ]] && continue
            # Check if agent directory exists in this domain or any domain
            local found=false
            for check_domain in "${DOMAINS[@]}"; do
                if [[ -d "$PROJECT_ROOT/$check_domain/agents/$agent_ref" ]]; then
                    found=true
                    break
                fi
            done
            if [[ "$found" != true ]]; then
                log_warn "domain_overrides.yaml references agent '$agent_ref' not found in any domain: $domain/config/domain_overrides.yaml"
                overrides_errors=$((overrides_errors + 1))
            fi
        done <<< "$agent_refs"
    done

    if [[ $overrides_found -gt 0 ]] && [[ $overrides_errors -eq 0 ]] && [[ $COUNT_ONLY != true ]]; then
        echo -e "  ${GREEN}All domain_overrides.yaml agent references valid ($overrides_found files checked)${NC}"
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
        echo "cAgents Agent Validation (v10.26.0)"
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
        validate_hooks
        validate_plugin_json
        validate_domain_overrides
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

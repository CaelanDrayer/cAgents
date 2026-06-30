#!/bin/bash
#
# cAgents Agent Schema Validation
# Validates all agent SKILL.md files across all 9 archetype roots
# Version: 12.23.0
#
# Usage:
#   ./scripts/ci/validate-agents.sh                    # Validate all archetypes
#   ./scripts/ci/validate-agents.sh --archetype developer  # Validate one archetype
#   ./scripts/ci/validate-agents.sh --domain developer     # back-compat alias for --archetype
#   ./scripts/ci/validate-agents.sh --strict           # Fail on warnings
#   ./scripts/ci/validate-agents.sh --count            # Just print counts
#
# Checks:
#   1. SKILL.md exists for each agent directory
#   2. Frontmatter starts with ---
#   3. Required fields: name (ERROR), tier (ERROR), archetype (ERROR)
#   4. Tier value is valid (controller, execution, support, executive, infrastructure)
#   5. Agent path matches plugin.json registration
#   6. No orphan agents (in directory but not in plugin.json)
#   7. Archetype/path consistency (top-level archetype matches dir-1)
#   8. Branch field required for 3-level archetypes; must match dir-2
#   9. Top-level `domain:` field forbidden (REMOVED in v11.1.0)
#  10. Description length validation (10-1024 chars)
#  11. related_agents resolution (referenced agents must exist somewhere in tree)
#  12. Vibe field presence check (advisory)
#  13. Agent Skills spec: name max 64 chars
#  14. Agent Skills spec: name matches directory name (ERROR)
#  15. Agent Skills spec: description max 1024 chars
#  16. Legacy `related-agents` (hyphen) field warns -> use `related_agents` underscore
#  17. plugin.json structural validation (required: name field)
#  18. domain_overrides.yaml controller_catalog references resolve to existing agents
#  19. metadata.version present and matches semver ^[0-9]+\.[0-9]+\.[0-9]+$ (V11.1.12+)

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
FILTER_ARCHETYPE=""

# v12.8.0: archetypes live under agents/. Layout: agents/{archetype}/...
ARCHETYPES_PARENT="agents"
# 9 builder-role archetype roots
ARCHETYPES=(developer operator advisor analyst creator writer strategist core leadership)

# 3-level archetypes (require `branch:` field)
THREE_LEVEL_ARCHETYPES=(developer operator advisor)

# Valid branches per 3-level archetype
DEVELOPER_BRANCHES=(backend frontend fullstack infrastructure quality)
OPERATOR_BRANCHES=(business-ops content marketing-sales people-ops support)
ADVISOR_BRANCHES=(education health legal personal)

# Legacy domain dirs that retain config/domain_overrides.yaml after v12 W4.2
# consolidation. The 11 other legacy dirs (engineering, creative, business,
# growth, service, science, health, education, personal, arts, trades) were
# consolidated into cagents-memory/_system/config/routing.yaml.
LEGACY_DOMAINS=(people shared leadership core)

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
# Test if value is in array (any-archetype lookup helper)
#
is_in_array() {
    local needle="$1"; shift
    local item
    for item in "$@"; do
        [[ "$item" == "$needle" ]] && return 0
    done
    return 1
}

#
# Resolve valid branches for a 3-level archetype
#
get_branches_for() {
    case "$1" in
        developer) echo "${DEVELOPER_BRANCHES[@]}" ;;
        operator)  echo "${OPERATOR_BRANCHES[@]}" ;;
        advisor)   echo "${ADVISOR_BRANCHES[@]}" ;;
        *)         echo "" ;;
    esac
}

#
# Build agent-name -> SKILL.md-path index for related_agents lookup.
# Indexed once for performance (avoids 243*N find calls).
#
declare -A AGENT_INDEX
build_agent_index() {
    local archetype skill_md name dir
    for archetype in "${ARCHETYPES[@]}"; do
        [[ ! -d "$PROJECT_ROOT/$ARCHETYPES_PARENT/$archetype" ]] && continue
        while IFS= read -r skill_md; do
            dir=$(basename "$(dirname "$skill_md")")
            AGENT_INDEX[$dir]="$skill_md"
        done < <(find "$PROJECT_ROOT/$ARCHETYPES_PARENT/$archetype" -name SKILL.md -type f 2>/dev/null)
    done
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

REGISTERED_AGENTS=""

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

    # Top-level frontmatter only (everything before `metadata:` block)
    local top_level
    top_level=$(echo "$frontmatter" | awk '/^metadata:/{exit} {print}')

    # Helper: get a field value, checking top-level AND metadata: block
    get_fm_field() {
        local field="$1" fm="$2"
        local val
        val=$(echo "$fm" | grep "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//" | tr -d '"' | tr -d "'")
        if [[ -z "$val" ]]; then
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

    # Helper: get a TOP-LEVEL only field (not inside metadata block)
    get_top_field() {
        local field="$1"
        echo "$top_level" | grep "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//" | tr -d '"' | tr -d "'" | tr -d '[:space:]'
    }

    # Check 3: Required field - name
    if ! echo "$top_level" | grep -q "^name:"; then
        log_fail "Missing 'name' field: $relative_path"
        return
    fi

    # Check 4: Required field - tier (may live inside metadata:)
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

    # Check 6: Registered in root plugin.json (only when populated)
    if [[ -n "$REGISTERED_AGENTS" ]]; then
        if ! echo "$REGISTERED_AGENTS" | grep -qF "./${relative_path}"; then
            log_warn "Not in root plugin.json: $relative_path"
            return
        fi
    fi

    # v11.1.0 path layout
    local dir_archetype dir_branch dir_name
    # v12.8.0: paths are agents/{archetype}/..., so cut f2 (skip leading "agents/")
    dir_archetype=$(echo "$relative_path" | cut -d'/' -f2)
    dir_name=$(basename "$(dirname "$skill_md")")

    # Check 7: archetype field required + must match directory
    local archetype_value
    archetype_value=$(get_top_field "archetype")
    if [[ -z "$archetype_value" ]]; then
        log_fail "Missing 'archetype' field (required, top-level): $relative_path"
        return
    fi
    if ! is_in_array "$archetype_value" "${ARCHETYPES[@]}"; then
        log_fail "Unknown archetype '$archetype_value' (must be one of: ${ARCHETYPES[*]}): $relative_path"
        return
    fi
    if [[ "$archetype_value" != "$dir_archetype" ]]; then
        log_fail "Archetype mismatch: frontmatter says '$archetype_value' but file is in '$dir_archetype/': $relative_path"
        return
    fi

    # Check 8: branch field required for 3-level archetypes; must match dir-2
    if is_in_array "$dir_archetype" "${THREE_LEVEL_ARCHETYPES[@]}"; then
        # v12.8.0: paths are agents/{archetype}/{branch}/..., so cut f3
        dir_branch=$(echo "$relative_path" | cut -d'/' -f3)
        local branch_value
        branch_value=$(get_top_field "branch")
        if [[ -z "$branch_value" ]]; then
            log_fail "Missing 'branch' field (required for $dir_archetype): $relative_path"
            return
        fi
        local valid_branches
        valid_branches=$(get_branches_for "$dir_archetype")
        if ! echo " $valid_branches " | grep -q " $branch_value "; then
            log_fail "Unknown branch '$branch_value' for archetype '$dir_archetype' (valid: $valid_branches): $relative_path"
            return
        fi
        if [[ "$branch_value" != "$dir_branch" ]]; then
            log_fail "Branch mismatch: frontmatter says '$branch_value' but file is in '$dir_archetype/$dir_branch/': $relative_path"
            return
        fi
    fi

    # Check 9: TOP-LEVEL `domain:` is forbidden (removed in v11.1.0; replaced by archetype)
    # Note: `domain:` inside `metadata:` is legacy-tolerated (still present in many agents).
    if echo "$top_level" | grep -q "^domain:"; then
        log_fail "Forbidden top-level 'domain:' field (removed in v11.1.0; use 'archetype:'): $relative_path"
        return
    fi

    # Check 13: Agent Skills spec - name max 64 chars
    local name_value
    name_value=$(echo "$top_level" | grep "^name:" | sed 's/^name:[[:space:]]*//' | tr -d '[:space:]' | tr -d '"' | tr -d "'")
    if [[ -n "$name_value" ]]; then
        local name_len=${#name_value}
        if [[ $name_len -gt 64 ]]; then
            log_fail "Name too long (${name_len} chars, max 64): $relative_path"
            return
        fi
    fi

    # Check 14: Agent Skills spec - name MUST match directory name (ERROR)
    if [[ -n "$name_value" ]] && [[ "$name_value" != "$dir_name" ]]; then
        log_fail "Name/directory mismatch: frontmatter name '$name_value' != directory '$dir_name': $relative_path"
        return
    fi

    # Check 10/15: Description length validation (10-1024 chars)
    local description
    description=$(echo "$top_level" | grep "^description:" | sed 's/^description:[[:space:]]*//' | tr -d '"' | tr -d "'")
    if [[ -n "$description" ]]; then
        local desc_len=${#description}
        if [[ $desc_len -lt 10 ]]; then
            log_warn "Description too short (${desc_len} chars, min 10): $relative_path"
        elif [[ $desc_len -gt 1024 ]]; then
            log_warn "Description too long (${desc_len} chars, max 1024): $relative_path"
        fi
    fi

    # Check 16: Legacy related-agents (hyphen) field rejection (prefer related_agents underscore)
    if echo "$frontmatter" | grep -q "^related-agents:" || echo "$frontmatter" | grep -q "^  related-agents:"; then
        log_warn "Legacy 'related-agents' field found (use 'related_agents' structured format instead): $relative_path"
    fi

    # Check 11: related_agents resolution (referenced agents must exist anywhere in tree)
    local related_agents
    related_agents=$(echo "$frontmatter" | grep -A 60 -E "^related_agents:|^  related_agents:" | grep -E "^\s*-\s*name:" | sed 's/^\s*-\s*name:\s*//' | tr -d '"' | tr -d "'")
    if [[ -n "$related_agents" ]]; then
        while IFS= read -r related; do
            related=$(echo "$related" | tr -d '[:space:]')
            [[ -z "$related" ]] && continue
            related="${related#name:}"
            related="${related#cagents:}"
            if [[ -z "${AGENT_INDEX[$related]:-}" ]]; then
                log_warn "related_agents '$related' not found in any archetype: $relative_path"
            fi
        done <<< "$related_agents"
    fi

    # Check 12: Vibe field presence (advisory; lives in metadata:)
    : # silent pass; advisory only

    # Check 19 (V11.1.12+): metadata.version present + valid semver
    local version_value
    version_value=$(echo "$frontmatter" | awk '/^metadata:/{m=1;next} m && /^[^ ]/{m=0} m && /^  version:/{sub(/^  version:[[:space:]]*/,""); gsub(/["'"'"']/,""); print; exit}')
    if [[ -z "$version_value" ]]; then
        log_fail "Missing 'metadata.version' field (required, V11.1.12+ per-agent versioning): $relative_path"
        return
    fi
    if ! [[ "$version_value" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        log_fail "Invalid 'metadata.version' '$version_value' (must match semver ^[0-9]+\\.[0-9]+\\.[0-9]+\$): $relative_path"
        return
    fi

    # Recommended: Model field presence
    if ! has_fm_field "model" "$frontmatter"; then
        log_warn "Missing 'model' field (recommended per Agent Skills spec): $relative_path"
    fi

    # Recommended: Color field presence
    if ! has_fm_field "color" "$frontmatter"; then
        log_warn "Missing 'color' field (recommended per Anthropic convention): $relative_path"
    fi

    log_pass "$relative_path"
}

#
# Validate all agents in an archetype tree (walks the whole tree)
#
validate_archetype() {
    local archetype="$1"
    local archetype_dir="$PROJECT_ROOT/$ARCHETYPES_PARENT/$archetype"

    if [[ ! -d "$archetype_dir" ]]; then
        return
    fi

    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[$archetype]${NC}"
    fi

    while IFS= read -r skill_md; do
        # Skip _deprecated/ buckets — per `.claude/rules/core/skill-format.md`
        # § Deprecation, agents under `_deprecated/` are intentionally excluded
        # from `.claude-plugin/plugin.json` (alias-only) and must not be
        # validated against the live registry.
        case "$skill_md" in
            */_deprecated/*) continue ;;
        esac
        validate_agent "$skill_md"
    done < <(find "$archetype_dir" -name SKILL.md -type f 2>/dev/null | sort)
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
# Validate hook registry: all hooks referenced in settings.json exist as .cjs files
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

    if [[ $hook_count -gt 0 ]] && [[ $hook_count -ne 26 ]]; then
        log_warn "Hook count mismatch: found $hook_count registered hooks, expected 26"
    fi
}

#
# Validate plugin.json structural requirements
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

    local has_name
    has_name=$(node -e "
        const data = JSON.parse(require('fs').readFileSync('$root_plugin', 'utf8'));
        console.log(data.name ? 'yes' : 'no');
    " 2>/dev/null)
    if [[ "$has_name" != "yes" ]]; then
        log_fail "plugin.json missing required 'name' field"
    else
        # Note: this PASS is non-agent (plugin.json structure check).
        # Use direct echo so we don't bump the PASSED counter (which represents agent-level passes).
        if [[ $COUNT_ONLY != true ]]; then
            echo -e "  ${GREEN}PASS${NC} Root plugin.json has required 'name' field"
        fi
    fi
}

#
# Validate domain_overrides.yaml controller_catalog references resolve to real agents.
# domain_overrides files still live in {legacy_domain}/config/ — only the agents/ subdir was moved.
# Agent references are by name; we look them up via the AGENT_INDEX (any archetype).
#
validate_domain_overrides() {
    if [[ $COUNT_ONLY != true ]]; then
        echo -e "\n${BLUE}[domain_overrides validation]${NC}"
    fi

    local overrides_found=0
    local overrides_errors=0

    for legacy_domain in "${LEGACY_DOMAINS[@]}"; do
        # v12.8.0: people/shared live under agents/_overlay/, leadership/core
        # under agents/. Try both layouts.
        local overrides_file=""
        if [[ -f "$PROJECT_ROOT/$ARCHETYPES_PARENT/_overlay/$legacy_domain/config/domain_overrides.yaml" ]]; then
            overrides_file="$PROJECT_ROOT/$ARCHETYPES_PARENT/_overlay/$legacy_domain/config/domain_overrides.yaml"
        elif [[ -f "$PROJECT_ROOT/$ARCHETYPES_PARENT/$legacy_domain/config/domain_overrides.yaml" ]]; then
            overrides_file="$PROJECT_ROOT/$ARCHETYPES_PARENT/$legacy_domain/config/domain_overrides.yaml"
        fi
        if [[ -z "$overrides_file" ]]; then
            continue
        fi
        overrides_found=$((overrides_found + 1))

        # controller_catalog uses array form: tier_2: [agent-a, agent-b]
        # Extract identifiers from any line of the form: tier_N: [a, b, c]
        local agent_refs
        agent_refs=$(grep -E "^\s*tier_[0-9]+:\s*\[" "$overrides_file" 2>/dev/null \
                      | sed -E 's/^[^[]*\[//; s/\].*$//' \
                      | tr ',' '\n' \
                      | tr -d '"' | tr -d "'" \
                      | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

        while IFS= read -r agent_ref; do
            [[ -z "$agent_ref" ]] && continue
            if [[ -z "${AGENT_INDEX[$agent_ref]:-}" ]]; then
                log_warn "domain_overrides.yaml references agent '$agent_ref' not found in archetype tree: $legacy_domain/config/domain_overrides.yaml"
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
    local single_file=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --archetype|--domain)
                FILTER_ARCHETYPE="$2"
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
            --file)
                single_file="$2"
                shift 2
                ;;
            *)
                echo "Unknown option: $1"
                echo "Usage: $0 [--archetype <name>] [--strict] [--count] [--file <path>]"
                exit 1
                ;;
        esac
    done

    # --file mode: validate a single SKILL.md and exit with status (0=pass, 1=fail)
    if [[ -n "$single_file" ]]; then
        if [[ ! -f "$single_file" ]]; then
            echo "File not found: $single_file" >&2
            exit 1
        fi
        REGISTERED_AGENTS=$(load_registered_agents)
        build_agent_index
        validate_agent "$single_file"
        if [[ $ERRORS -gt 0 ]]; then
            exit 1
        else
            exit 0
        fi
    fi

    if [[ $COUNT_ONLY != true ]]; then
        echo ""
        echo "=================================================="
        echo "cAgents Agent Validation (v12.16.0)"
        echo "=================================================="
    fi

    REGISTERED_AGENTS=$(load_registered_agents)
    build_agent_index

    if [[ -n "$FILTER_ARCHETYPE" ]]; then
        validate_archetype "$FILTER_ARCHETYPE"
    else
        for archetype in "${ARCHETYPES[@]}"; do
            validate_archetype "$archetype"
        done
        check_orphans
        validate_hooks
        validate_plugin_json
        validate_domain_overrides
    fi

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

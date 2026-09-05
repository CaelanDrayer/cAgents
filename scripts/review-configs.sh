#!/bin/bash
# Review config YAML files for issues

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== CONFIG YAML REVIEW ==="
echo ""

# Find all config YAML files
# v12.8.0 moved the surviving per-domain config under agents/; the pipeline
# configs live in cagents-memory/_system/config.
config_files=$(find "$REPO_ROOT/agents" "$REPO_ROOT/cagents-memory/_system/config" \
                 -type f -name "*.yaml" 2>/dev/null | sort)

echo "Config files found: $(echo "$config_files" | wc -l)"
echo ""

# Check for valid YAML syntax
echo "=== CHECKING YAML SYNTAX ==="
syntax_errors=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Try to parse with Python
        # safe_load_all, not safe_load: several config templates legitimately
        # carry a second YAML document (usage notes) after a --- separator.
        python3 -c "import yaml,sys; list(yaml.safe_load_all(open(sys.argv[1])))" "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "SYNTAX ERROR: $file"
            ((syntax_errors++))
        fi
    fi
done <<< "$config_files"

echo "Syntax errors: $syntax_errors"
echo ""

# Check for controller_catalog consistency
echo "=== CHECKING CONTROLLER CATALOGS ==="

# v12.68.0: the surviving overrides live under agents/, and agent definitions
# are flat (agents/<name>.md).
for overrides in \
    "$REPO_ROOT/agents/core/config/domain_overrides.yaml" \
    "$REPO_ROOT/agents/leadership/config/domain_overrides.yaml" \
    "$REPO_ROOT/agents/_overlay/people/config/domain_overrides.yaml" \
    "$REPO_ROOT/agents/_overlay/shared/config/domain_overrides.yaml"; do

    [ -f "$overrides" ] || continue
    echo "Config: ${overrides#$REPO_ROOT/}"

    # controller_catalog uses array form: tier_N: [agent-a, agent-b]
    controllers=$(grep -E "^[[:space:]]*tier_[0-9]+:[[:space:]]*\[" "$overrides" 2>/dev/null \
                  | sed -E 's/^[^[]*\[//; s/\].*$//' \
                  | tr ',' '\n' \
                  | tr -d "\"'" \
                  | sed 's/^[[:space:]]*//; s/[[:space:]]*$//')

    if [ -n "$controllers" ]; then
        while IFS= read -r controller; do
            [ -n "$controller" ] || continue
            controller_name="${controller#*:}"
            agent_file="$REPO_ROOT/agents/$controller_name.md"
            if [ ! -f "$agent_file" ]; then
                echo "  MISSING: $controller (expected: agents/$controller_name.md)"
            fi
        done <<< "$controllers"
    fi
done

echo ""
echo "=== REVIEW COMPLETE ==="

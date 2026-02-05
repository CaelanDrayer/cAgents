#!/bin/bash
# Review config YAML files for issues

echo "=== CONFIG YAML REVIEW ==="
echo ""

# Find all config YAML files
config_files=$(find /home/PathingIT/cAgents/{core,shared,make,grow,operate,people,serve}/config -type f -name "*.yaml" 2>/dev/null | sort)

echo "Config files found: $(echo "$config_files" | wc -l)"
echo ""

# Check for valid YAML syntax
echo "=== CHECKING YAML SYNTAX ==="
syntax_errors=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Try to parse with Python
        python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null
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

for domain in make grow operate people serve; do
    planner_config="/home/PathingIT/cAgents/$domain/config/planner_config.yaml"
    
    if [ -f "$planner_config" ]; then
        echo "Domain: $domain"
        
        # Extract controller names from catalog
        controllers=$(python3 -c "
import yaml
try:
    with open('$planner_config') as f:
        config = yaml.safe_load(f)
        catalog = config.get('controller_catalog', {})
        for tier, controllers in catalog.items():
            if isinstance(controllers, list):
                for ctrl in controllers:
                    if isinstance(ctrl, dict) and 'controller' in ctrl:
                        print(ctrl['controller'])
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
" 2>&1)
        
        if [ -n "$controllers" ]; then
            # Check if controller agents exist
            while IFS= read -r controller; do
                if [ -n "$controller" ]; then
                    # Remove domain prefix if present
                    controller_name="${controller#*:}"
                    
                    # Check for agent file
                    agent_file="/home/PathingIT/cAgents/$domain/agents/$controller_name.md"
                    agent_dir="/home/PathingIT/cAgents/$domain/agents/$controller_name/SKILL.md"
                    
                    if [ ! -f "$agent_file" ] && [ ! -f "$agent_dir" ]; then
                        echo "  MISSING: $controller (expected: $agent_file or $agent_dir)"
                    fi
                fi
            done <<< "$controllers"
        fi
    fi
done

echo ""
echo "=== REVIEW COMPLETE ==="

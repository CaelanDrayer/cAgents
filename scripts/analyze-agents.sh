#!/bin/bash
# Deep agent analysis

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== DEEP AGENT ANALYSIS ==="
echo ""

# Find all SKILL.md files (primary agent files)
# v12.68.0: agent definitions are flat — agents/<name>.md (Claude Code
# discovers plugin agents with a non-recursive scan of agents/).
skill_files=$(find "$PROJECT_ROOT/agents" -maxdepth 1 -name "*.md" -type f 2>/dev/null | sort)

echo "Agent files found: $(echo "$skill_files" | wc -l)"
echo ""

# Extract agent metadata
echo "=== ANALYZING AGENT METADATA ==="

declare -A agent_names
declare -A agent_tiers
declare -A agent_domains
duplicate_names=0
tier_mismatches=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Extract frontmatter
        if grep -q "^---$" "$file"; then
            frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | head -n -1 | tail -n +2)
            
            # Extract fields
            name=$(echo "$frontmatter" | grep "^name:" | sed 's/^name: *//' | tr -d '"' | tr -d "'")
            tier=$(echo "$frontmatter" | grep "^tier:" | sed 's/^tier: *//' | tr -d '"' | tr -d "'")
            domain=$(echo "$frontmatter" | grep "^domain:" | sed 's/^domain: *//' | tr -d '"' | tr -d "'")
            
            # Check for duplicates
            if [ -n "$name" ]; then
                if [ -n "${agent_names[$name]}" ]; then
                    echo "DUPLICATE NAME: $name"
                    echo "  First: ${agent_names[$name]}"
                    echo "  Second: $file"
                    ((duplicate_names++))
                else
                    agent_names[$name]="$file"
                fi
            fi
            
            # Check tier assignments
            if [ -n "$tier" ] && [ -n "$name" ]; then
                # Check if tier matches expected patterns
                case "$tier" in
                    controller|execution|support|infrastructure)
                        # Valid tiers
                        ;;
                    *)
                        echo "UNUSUAL TIER: $name has tier=$tier (file: $file)"
                        ((tier_mismatches++))
                        ;;
                esac
                
                # Check if controller tier but in wrong domain structure
                if [ "$tier" = "controller" ]; then
                    # Controllers should have certain patterns
                    if [[ "$name" != *"-manager"* ]] && [[ "$name" != *"-lead"* ]] && \
                       [[ "$name" != *"-director"* ]] && [[ "$name" != "cto" ]] && \
                       [[ "$name" != "cfo" ]] && [[ "$name" != "ceo" ]] && \
                       [[ "$name" != "coo" ]] && [[ "$name" != "cro" ]] && \
                       [[ "$name" != "architect"* ]] && [[ "$name" != "strategist"* ]] && \
                       [[ "$name" != *"universal"* ]]; then
                        echo "UNUSUAL CONTROLLER NAME: $name (usually controllers end in -manager/-lead/-director or are C-level)"
                    fi
                fi
            fi
        fi
    fi
done <<< "$skill_files"

echo ""
echo "Duplicate names: $duplicate_names"
echo "Tier mismatches: $tier_mismatches"
echo ""

# Check for agents in plugin.json but not in filesystem
echo "=== CHECKING PLUGIN MANIFESTS ==="

for domain in core shared make grow operate people serve; do
    manifest="$PROJECT_ROOT/$domain/.claude-plugin/plugin.json"
    
    if [ -f "$manifest" ]; then
        echo "Domain: $domain"
        
        # Extract agent paths from manifest
        agents=$(python3 -c "
import json, sys
try:
    with open('$manifest') as f:
        data = json.load(f)
        skills = data.get('skills', {})
        for skill_name, skill_data in skills.items():
            if isinstance(skill_data, dict):
                instructions = skill_data.get('instructions', '')
                if instructions:
                    print(instructions)
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
" 2>&1)
        
        missing=0
        while IFS= read -r path; do
            if [ -n "$path" ]; then
                full_path="$PROJECT_ROOT/$domain/$path"
                if [ ! -f "$full_path" ]; then
                    echo "  MISSING: $path (referenced in plugin.json)"
                    ((missing++))
                fi
            fi
        done <<< "$agents"
        
        if [ $missing -eq 0 ]; then
            echo "  All agents found"
        fi
    fi
done

echo ""
echo "=== ANALYSIS COMPLETE ==="

#!/bin/bash
# Review hook implementations

echo "=== HOOK REVIEW ==="
echo ""

# Check .claude/settings.json for registered hooks
settings_file="/home/PathingIT/cAgents/.claude/settings.json"

if [ -f "$settings_file" ]; then
    echo "=== CHECKING REGISTERED HOOKS ==="
    
    # Extract hook commands from settings.json
    hooks=$(python3 -c "
import json, sys
try:
    with open('$settings_file') as f:
        settings = json.load(f)
        hooks_config = settings.get('hooks', {})
        
        for hook_type, hook_list in hooks_config.items():
            if isinstance(hook_list, list):
                for hook_entry in hook_list:
                    if isinstance(hook_entry, dict):
                        hook_defs = hook_entry.get('hooks', [])
                        for hook_def in hook_defs:
                            if isinstance(hook_def, dict) and 'command' in hook_def:
                                print(f'{hook_type}|{hook_def[\"command\"]}')
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
" 2>&1)
    
    if [ -n "$hooks" ]; then
        while IFS='|' read -r hook_type command; do
            if [ -n "$command" ]; then
                # Resolve $CLAUDE_PROJECT_DIR
                resolved_command="${command//\$CLAUDE_PROJECT_DIR/\/home\/PathingIT\/cAgents}"
                
                # Extract executable path (first word)
                executable=$(echo "$resolved_command" | awk '{print $1}')
                
                if [ ! -f "$executable" ] && [ ! -x "$executable" ]; then
                    echo "MISSING: $hook_type -> $command"
                    echo "  Expected: $executable"
                fi
            fi
        done <<< "$hooks"
    fi
else
    echo "settings.json not found"
fi

echo ""

# Check hook files exist and are executable
echo "=== CHECKING HOOK FILES ==="

hook_files=$(find /home/PathingIT/cAgents/hooks -type f \( -name "*.sh" -o -name "*.js" -o -name "*.cjs" \) 2>/dev/null)
claude_hooks=$(find /home/PathingIT/cAgents/.claude/hooks -type f \( -name "*.sh" -o -name "*.js" -o -name "*.cjs" \) 2>/dev/null)

all_hooks="$hook_files"$'\n'"$claude_hooks"

not_executable=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        if [ ! -x "$file" ]; then
            echo "NOT EXECUTABLE: $file"
            ((not_executable++))
            # Fix it
            chmod +x "$file"
            echo "  FIXED: made executable"
        fi
    fi
done <<< "$all_hooks"

echo "Fixed $not_executable non-executable hooks"
echo ""

# Check for syntax errors in shell hooks
echo "=== CHECKING SHELL HOOK SYNTAX ==="
syntax_errors=0

shell_hooks=$(find /home/PathingIT/cAgents/hooks /home/PathingIT/cAgents/.claude/hooks -type f -name "*.sh" 2>/dev/null)

while IFS= read -r file; do
    if [ -f "$file" ]; then
        bash -n "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "SYNTAX ERROR: $file"
            ((syntax_errors++))
        fi
    fi
done <<< "$shell_hooks"

echo "Syntax errors: $syntax_errors"
echo ""

# Check for syntax errors in Node.js hooks
echo "=== CHECKING NODE HOOK SYNTAX ==="
node_errors=0

node_hooks=$(find /home/PathingIT/cAgents/hooks /home/PathingIT/cAgents/.claude/hooks -type f \( -name "*.js" -o -name "*.cjs" \) 2>/dev/null)

while IFS= read -r file; do
    if [ -f "$file" ]; then
        node --check "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "SYNTAX ERROR: $file"
            ((node_errors++))
        fi
    fi
done <<< "$node_hooks"

echo "Syntax errors: $node_errors"
echo ""

echo "=== REVIEW COMPLETE ==="

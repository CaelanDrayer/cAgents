#!/bin/bash
# Review scripts for issues

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== SCRIPTS REVIEW ==="
echo ""

# Find all scripts
script_files=$(find "$REPO_ROOT/scripts" -type f \( -name "*.sh" -o -name "*.js" \) 2>/dev/null | sort)

echo "Script files found: $(echo "$script_files" | wc -l)"
echo ""

# Check executable permissions
echo "=== CHECKING EXECUTABILITY ==="
not_executable=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        if [ ! -x "$file" ]; then
            echo "NOT EXECUTABLE: $file"
            ((not_executable++))
            chmod +x "$file"
            echo "  FIXED: made executable"
        fi
    fi
done <<< "$script_files"

echo "Fixed $not_executable scripts"
echo ""

# Check shell script syntax
echo "=== CHECKING SHELL SCRIPT SYNTAX ==="
syntax_errors=0

shell_scripts=$(find "$REPO_ROOT/scripts" -type f -name "*.sh" 2>/dev/null)

while IFS= read -r file; do
    if [ -f "$file" ]; then
        bash -n "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "SYNTAX ERROR: $file"
            ((syntax_errors++))
        fi
    fi
done <<< "$shell_scripts"

echo "Syntax errors: $syntax_errors"
echo ""

# Check Node.js script syntax
echo "=== CHECKING NODE SCRIPT SYNTAX ==="
node_errors=0

node_scripts=$(find "$REPO_ROOT/scripts" -type f -name "*.js" 2>/dev/null)

while IFS= read -r file; do
    if [ -f "$file" ]; then
        node --check "$file" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo "SYNTAX ERROR: $file"
            ((node_errors++))
        fi
    fi
done <<< "$node_scripts"

echo "Syntax errors: $node_errors"
echo ""

# Check for common issues
echo "=== CHECKING FOR COMMON ISSUES ==="

# Check for hardcoded paths that should use variables
hardcoded=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Check for $REPO_ROOT hardcoded (should use $CLAUDE_PROJECT_DIR or relative)
        if grep -q "$REPO_ROOT" "$file" 2>/dev/null; then
            # Exclude this review script itself
            if [[ "$file" != *"review-scripts.sh"* ]] && [[ "$file" != *"review-agents.sh"* ]] && [[ "$file" != *"review-configs.sh"* ]] && [[ "$file" != *"review-hooks.sh"* ]]; then
                echo "HARDCODED PATH: $file contains $REPO_ROOT"
                ((hardcoded++))
            fi
        fi
    fi
done <<< "$script_files"

echo "Scripts with hardcoded paths: $hardcoded"
echo ""

echo "=== REVIEW COMPLETE ==="

#!/bin/bash
# cAgents Install Script
# Sets up permissions and validates the installation
# Version: 1.0.0

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory (cAgents root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CAGENTS_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}cAgents Installation Script${NC}"
echo "==============================="
echo ""

# Function to print status
print_status() {
    local status="$1"
    local message="$2"
    if [[ "$status" == "ok" ]]; then
        echo -e "  ${GREEN}✓${NC} $message"
    elif [[ "$status" == "fix" ]]; then
        echo -e "  ${YELLOW}→${NC} $message"
    elif [[ "$status" == "error" ]]; then
        echo -e "  ${RED}✗${NC} $message"
    else
        echo "  $message"
    fi
}

# Step 1: Fix library permissions
echo "Step 1: Setting library permissions..."
if [[ -d "$CAGENTS_ROOT/scripts/lib" ]]; then
    chmod 644 "$CAGENTS_ROOT/scripts/lib"/*.sh 2>/dev/null || true
    print_status "ok" "Library scripts are now readable (scripts/lib/*.sh)"
else
    print_status "error" "Library directory not found: scripts/lib"
fi

# Step 2: Fix CJS hook file permissions (V9.5+: CJS-only hooks in .claude/hooks/)
echo ""
echo "Step 2: Setting CJS hook permissions..."
hook_count=0
if [[ -d "$CAGENTS_ROOT/.claude/hooks" ]]; then
    while IFS= read -r -d '' hook; do
        chmod 644 "$hook" 2>/dev/null || true
        ((hook_count++))
    done < <(find "$CAGENTS_ROOT/.claude/hooks" -name "*.cjs" -print0)
    print_status "ok" "CJS hook files are readable ($hook_count files in .claude/hooks/)"
else
    print_status "error" "Hooks directory not found: .claude/hooks/"
fi

# Step 3: Create Agent_Memory directory structure
echo ""
echo "Step 3: Creating Agent_Memory directory structure..."
mkdir -p "$CAGENTS_ROOT/Agent_Memory/_system/domains"
mkdir -p "$CAGENTS_ROOT/Agent_Memory/_system/config"
mkdir -p "$CAGENTS_ROOT/Agent_Memory/_system/trigger"
mkdir -p "$CAGENTS_ROOT/Agent_Memory/_knowledge"
mkdir -p "$CAGENTS_ROOT/Agent_Memory/_archive"
print_status "ok" "Agent_Memory directories created"

# Step 4: Verify settings.json hook configuration
echo ""
echo "Step 4: Verifying hook configuration..."
if [[ -f "$CAGENTS_ROOT/.claude/settings.json" ]]; then
    # Verify hooks use ${CLAUDE_PLUGIN_ROOT} (the official Claude Code plugin variable)
    if grep -q 'CLAUDE_PLUGIN_ROOT' "$CAGENTS_ROOT/.claude/settings.json"; then
        print_status "ok" "Hook commands use \${CLAUDE_PLUGIN_ROOT} (portable)"
    else
        print_status "error" "Hook commands missing \${CLAUDE_PLUGIN_ROOT} -- hooks may not resolve correctly"
    fi
    print_status "ok" ".claude/settings.json found (hook registration)"
else
    print_status "error" ".claude/settings.json not found - hooks will not run"
fi

# Step 5: Test a CJS hook (V9.5+: all hooks invoked via run-hook.cjs launcher)
echo ""
echo "Step 5: Testing CJS hook execution..."
run_hook="$CAGENTS_ROOT/.claude/hooks/run-hook.cjs"
if [[ -f "$run_hook" ]]; then
    test_output=$(echo '{}' | node "$run_hook" verify-completion 2>&1) || true
    if echo "$test_output" | grep -q '"continue"'; then
        print_status "ok" "CJS hooks execute correctly via run-hook.cjs"
    else
        print_status "error" "CJS hook execution returned unexpected output"
        echo "    Output: $test_output"
    fi
else
    print_status "error" "Hook launcher not found: .claude/hooks/run-hook.cjs"
fi

# Summary
echo ""
echo "==============================="
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run 'claude' to start Claude Code"
echo "  2. Use '/trigger <request>' to start workflows"
echo "  3. See CLAUDE.md for full documentation"
echo ""

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

# Step 2: Fix hook script permissions (make executable)
echo ""
echo "Step 2: Setting hook script permissions..."
hook_count=0
if [[ -d "$CAGENTS_ROOT/hooks" ]]; then
    while IFS= read -r -d '' hook; do
        chmod 755 "$hook" 2>/dev/null || true
        ((hook_count++))
    done < <(find "$CAGENTS_ROOT/hooks" -name "*.sh" -print0)
    print_status "ok" "Hook scripts are now executable ($hook_count scripts)"
else
    print_status "error" "Hooks directory not found: hooks/"
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

# Step 4: Verify hooks.json exists
echo ""
echo "Step 4: Verifying hooks configuration..."
if [[ -f "$CAGENTS_ROOT/hooks/hooks.json" ]]; then
    print_status "ok" "hooks/hooks.json found"
else
    print_status "error" "hooks/hooks.json not found - hooks will not run"
fi

# Step 5: Test a hook script
echo ""
echo "Step 5: Testing hook execution..."
test_hook="$CAGENTS_ROOT/hooks/workflow/stop-workflow.sh"
if [[ -x "$test_hook" ]]; then
    # Run hook with test input
    test_output=$(echo '{"instruction_id":"install_test","reason":"user_requested","message":"","force":false}' | bash "$test_hook" 2>&1) || true
    if echo "$test_output" | grep -q '"decision"'; then
        print_status "ok" "Hook scripts execute correctly"
    else
        print_status "error" "Hook execution returned unexpected output"
        echo "    Output: $test_output"
    fi
else
    print_status "error" "Test hook not executable: $test_hook"
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

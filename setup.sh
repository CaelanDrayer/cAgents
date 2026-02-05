#!/bin/bash
# cAgents Setup Script
# Configures hooks based on Node.js availability
#
# Usage: ./setup.sh [--force-shell-only]
#
# This script detects if Node.js is available and configures
# the appropriate hooks in .claude/settings.json

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (works even if called from different location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$SCRIPT_DIR/.claude"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
SETTINGS_FULL="$CLAUDE_DIR/settings.full.json"
SETTINGS_SHELL_ONLY="$CLAUDE_DIR/settings.shell-only.json"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}cAgents Setup${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Parse arguments
FORCE_SHELL_ONLY=false
if [ "$1" = "--force-shell-only" ]; then
    FORCE_SHELL_ONLY=true
fi

# Function to detect Node.js
detect_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version 2>/dev/null || echo "unknown")
        echo "$NODE_VERSION"
        return 0
    else
        return 1
    fi
}

# Function to backup existing settings
backup_settings() {
    if [ -f "$SETTINGS_FILE" ]; then
        BACKUP_FILE="$CLAUDE_DIR/settings.backup.$(date +%Y%m%d_%H%M%S).json"
        cp "$SETTINGS_FILE" "$BACKUP_FILE"
        echo -e "${YELLOW}Backed up existing settings to: $(basename "$BACKUP_FILE")${NC}"
    fi
}

# Function to copy full settings
use_full_settings() {
    if [ -f "$SETTINGS_FULL" ]; then
        cp "$SETTINGS_FULL" "$SETTINGS_FILE"
    else
        # Settings file is already the full version, just ensure it exists
        if [ ! -f "$SETTINGS_FILE" ]; then
            echo -e "${RED}Error: No settings template found${NC}"
            exit 1
        fi
    fi
}

# Function to copy shell-only settings
use_shell_only_settings() {
    if [ -f "$SETTINGS_SHELL_ONLY" ]; then
        cp "$SETTINGS_SHELL_ONLY" "$SETTINGS_FILE"
    else
        echo -e "${RED}Error: Shell-only settings template not found${NC}"
        echo -e "${YELLOW}Expected: $SETTINGS_SHELL_ONLY${NC}"
        exit 1
    fi
}

# Main logic
echo "Checking Node.js availability..."
echo ""

if [ "$FORCE_SHELL_ONLY" = true ]; then
    echo -e "${YELLOW}Force shell-only mode requested${NC}"
    backup_settings
    use_shell_only_settings
    echo ""
    echo -e "${GREEN}Configuration complete (shell-only mode)${NC}"
    echo ""
    echo "Enabled hooks (shell scripts only):"
    echo "  - Session lifecycle (start, end)"
    echo "  - Workflow events (stop, complete, user prompt)"
    echo "  - Tool validation (pre-bash, pre-write)"
    echo ""
    echo -e "${YELLOW}Disabled hooks (require Node.js):${NC}"
    echo "  - Session catchup (resume incomplete sessions)"
    echo "  - Verify completion (completion validation)"
    echo "  - Secret detection (block secrets in writes)"
    echo "  - Pre-compact save (state preservation)"
    echo "  - Notifications (status logging)"
    echo ""
    echo -e "${BLUE}To enable all hooks, install Node.js and run: ./setup.sh${NC}"
    exit 0
fi

if NODE_VERSION=$(detect_nodejs); then
    echo -e "${GREEN}Node.js detected: $NODE_VERSION${NC}"
    echo ""

    # Check if we need to do anything
    if [ -f "$SETTINGS_FILE" ]; then
        # Check if current settings include Node.js hooks
        if grep -q "node.*\.cjs" "$SETTINGS_FILE" 2>/dev/null; then
            echo -e "${GREEN}Full hooks already configured.${NC}"
            echo ""
            echo "All hooks enabled:"
            echo "  - Shell hooks: 9 hooks (session, workflow, tools)"
            echo "  - Node.js hooks: 6 hooks (catchup, completion, secrets, compact, notifications, context-overflow)"
            echo ""
            echo -e "${GREEN}cAgents is ready to use!${NC}"
            exit 0
        fi
    fi

    # Save current full settings as template if not exists
    if [ -f "$SETTINGS_FILE" ] && [ ! -f "$SETTINGS_FULL" ]; then
        # If current settings don't have Node.js hooks, we need the full template
        if ! grep -q "node.*\.cjs" "$SETTINGS_FILE" 2>/dev/null; then
            echo -e "${YELLOW}Note: Current settings appear to be shell-only${NC}"
        fi
    fi

    backup_settings
    use_full_settings

    echo -e "${GREEN}Configuration complete (full mode)${NC}"
    echo ""
    echo "All hooks enabled:"
    echo "  - Shell hooks: 9 hooks (session, workflow, tools)"
    echo "  - Node.js hooks: 6 hooks (catchup, completion, secrets, compact, notifications, context-overflow)"
    echo ""
    echo -e "${GREEN}cAgents is ready to use!${NC}"

else
    echo -e "${YELLOW}Node.js not found${NC}"
    echo ""
    echo "Node.js is required for advanced cAgents features:"
    echo "  - Session catchup (resume incomplete sessions)"
    echo "  - Verify completion (completion validation)"
    echo "  - Secret detection (block secrets in writes)"
    echo "  - Pre-compact save (state preservation)"
    echo "  - Notifications (status logging)"
    echo ""

    backup_settings
    use_shell_only_settings

    echo -e "${GREEN}Configuration complete (shell-only mode)${NC}"
    echo ""
    echo "Enabled hooks (shell scripts only):"
    echo "  - Session lifecycle (start, end)"
    echo "  - Workflow events (stop, complete, user prompt)"
    echo "  - Tool validation (pre-bash, pre-write)"
    echo ""
    echo -e "${YELLOW}To enable all hooks:${NC}"
    echo "  1. Install Node.js: https://nodejs.org/"
    echo "  2. Run: ./setup.sh"
    echo ""
fi

echo -e "${BLUE}======================================${NC}"

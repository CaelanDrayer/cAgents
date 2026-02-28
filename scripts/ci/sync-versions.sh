#!/bin/bash
# Sync version from package.json (source of truth) to all 14 locations
# Usage: scripts/ci/sync-versions.sh [version]
# If version is provided, updates package.json first, then syncs everywhere

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

# Get or set version
if [ -n "$1" ]; then
    NEW_VERSION="$1"
    # Update package.json first
    sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" package.json
    echo "Set package.json version to $NEW_VERSION"
else
    NEW_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
fi

echo "Syncing version $NEW_VERSION to all 14 locations..."
echo ""

UPDATED=0

sync_json() {
    local file="$1"
    local label="$2"
    if [ -f "$file" ]; then
        # Update the first "version" field that isn't $schema
        sed -i "0,/\"version\": \"[^\"]*\"/{/\\\$schema/!s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/}" "$file"
        echo "  Updated $label"
        UPDATED=$((UPDATED + 1))
    else
        echo "  Skip   $label (not found)"
    fi
}

sync_claude_md() {
    if [ -f "CLAUDE.md" ]; then
        # Update "**Version**: X.Y.Z" pattern
        sed -i "s/\*\*Version\*\*: [0-9]\+\.[0-9]\+\.[0-9]\+/**Version**: $NEW_VERSION/g" CLAUDE.md
        # Update bare "Version: X.Y.Z" pattern
        sed -i "s/Version: [0-9]\+\.[0-9]\+\.[0-9]\+/Version: $NEW_VERSION/g" CLAUDE.md
        echo "  Updated CLAUDE.md"
        UPDATED=$((UPDATED + 1))
    fi
}

sync_settings() {
    if [ -f ".claude/settings.json" ]; then
        sed -i "s/\"CAGENTS_VERSION\": \"[^\"]*\"/\"CAGENTS_VERSION\": \"$NEW_VERSION\"/" .claude/settings.json
        echo "  Updated .claude/settings.json"
        UPDATED=$((UPDATED + 1))
    fi
}

# 1. package.json (already set)
echo "  Source  package.json: $NEW_VERSION"
UPDATED=$((UPDATED + 1))

# 2-3. Root plugin files
sync_json ".claude-plugin/plugin.json" ".claude-plugin/plugin.json"
sync_json ".claude-plugin/marketplace.json" ".claude-plugin/marketplace.json"

# 4. CLAUDE.md
sync_claude_md

# 5-13. Domain plugin.json files
for domain in engineering creative business growth people service core leadership shared; do
    sync_json "${domain}/.claude-plugin/plugin.json" "${domain}/plugin.json"
done

# 14. Settings
sync_settings

echo ""
echo "Updated $UPDATED locations to version $NEW_VERSION"
echo "Run scripts/ci/validate-versions.sh to verify"

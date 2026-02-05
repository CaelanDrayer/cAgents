#!/bin/bash
# Validate version consistency across cAgents files
# Exit with error if versions don't match

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔍 Validating version consistency..."
echo ""

# Extract versions
PKG_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
PLUGIN_VERSION=$(grep -m1 '"version"' .claude-plugin/plugin.json | sed 's/.*"version": "\(.*\)".*/\1/')
MARKETPLACE_VERSION=$(grep '"version"' .claude-plugin/marketplace.json | grep -v schema | sed 's/.*"version": "\(.*\)".*/\1/')

echo "package.json:              $PKG_VERSION"
echo ".claude-plugin/plugin.json: $PLUGIN_VERSION"
echo ".claude-plugin/marketplace.json: $MARKETPLACE_VERSION"
echo ""

# Check consistency
if [ "$PKG_VERSION" != "$PLUGIN_VERSION" ]; then
    echo "❌ ERROR: Version mismatch between package.json ($PKG_VERSION) and plugin.json ($PLUGIN_VERSION)"
    exit 1
fi

if [ "$PKG_VERSION" != "$MARKETPLACE_VERSION" ]; then
    echo "❌ ERROR: Version mismatch between package.json ($PKG_VERSION) and marketplace.json ($MARKETPLACE_VERSION)"
    exit 1
fi

echo "✅ All versions match: $PKG_VERSION"
exit 0

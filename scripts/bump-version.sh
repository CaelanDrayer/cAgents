#!/bin/bash
# Bump version across all cAgents version fields
# Usage: ./scripts/bump-version.sh <major|minor|patch>

set -e

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <major|minor|patch>"
    exit 1
fi

BUMP_TYPE=$1
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Extract current version from package.json
CURRENT_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "Current version: $CURRENT_VERSION"

# Parse version
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Bump version
case "$BUMP_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
    *)
        echo "Invalid bump type: $BUMP_TYPE (must be major, minor, or patch)"
        exit 1
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
echo "New version: $NEW_VERSION"
echo ""

# Update files
echo "Updating version in files..."

# Update package.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
echo "✓ package.json"

# Update .claude-plugin/plugin.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" .claude-plugin/plugin.json
echo "✓ .claude-plugin/plugin.json"

# Update .claude-plugin/marketplace.json
sed -i.bak "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" .claude-plugin/marketplace.json
echo "✓ .claude-plugin/marketplace.json"

# Clean up backup files
rm -f package.json.bak .claude-plugin/plugin.json.bak .claude-plugin/marketplace.json.bak

echo ""
echo "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"
echo ""
echo "Next steps:"
echo "1. Review changes: git diff"
echo "2. Stage changes: git add package.json .claude-plugin/*.json"
echo "3. Commit: git commit -m \"chore: bump version to $NEW_VERSION\""

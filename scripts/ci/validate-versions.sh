#!/bin/bash
# Validate version consistency across ALL 14 cAgents locations
# Exit with error if versions don't match

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

echo "Validating version consistency across 14 locations..."
echo ""

# Source of truth
PKG_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "Source of truth (package.json): $PKG_VERSION"
echo ""

ERRORS=0
CHECKED=0

check_version() {
    local file="$1"
    local label="$2"
    CHECKED=$((CHECKED + 1))

    if [ ! -f "$file" ]; then
        echo "  SKIP  $label ($file not found)"
        return
    fi

    local version=""
    case "$file" in
        *.json)
            version=$(grep -m1 '"version"' "$file" | grep -v schema | sed 's/.*"version": "\(.*\)".*/\1/')
            ;;
        *.md)
            # Match "Version: X.Y.Z" or "**Version**: X.Y.Z" in CLAUDE.md
            version=$(grep -m1 -oP '(?:Version[*]*: )\K[0-9]+\.[0-9]+\.[0-9]+' "$file" 2>/dev/null || echo "")
            ;;
    esac

    if [ -z "$version" ]; then
        echo "  WARN  $label - version not found in $file"
        return
    fi

    if [ "$version" = "$PKG_VERSION" ]; then
        echo "  OK    $label: $version"
    else
        echo "  FAIL  $label: $version (expected $PKG_VERSION)"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "Checking 14 locations:"
echo ""

# 1. package.json (source of truth)
check_version "package.json" "1. package.json"

# 2-3. Root plugin files
check_version ".claude-plugin/plugin.json" "2. .claude-plugin/plugin.json"
check_version ".claude-plugin/marketplace.json" "3. .claude-plugin/marketplace.json"

# 4. CLAUDE.md
check_version "CLAUDE.md" "4. CLAUDE.md"

# 5-13. Domain plugin.json files (9 domains)
check_version "engineering/.claude-plugin/plugin.json" "5. engineering/plugin.json"
check_version "creative/.claude-plugin/plugin.json" "6. creative/plugin.json"
check_version "business/.claude-plugin/plugin.json" "7. business/plugin.json"
check_version "growth/.claude-plugin/plugin.json" "8. growth/plugin.json"
check_version "people/.claude-plugin/plugin.json" "9. people/plugin.json"
check_version "service/.claude-plugin/plugin.json" "10. service/plugin.json"
check_version "core/.claude-plugin/plugin.json" "11. core/plugin.json"
check_version "leadership/.claude-plugin/plugin.json" "12. leadership/plugin.json"
check_version "shared/.claude-plugin/plugin.json" "13. shared/plugin.json"

# 14. Settings (env var)
if [ -f ".claude/settings.json" ]; then
    SETTINGS_VERSION=$(grep -oP '"CAGENTS_VERSION":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' .claude/settings.json 2>/dev/null || echo "")
    CHECKED=$((CHECKED + 1))
    if [ -n "$SETTINGS_VERSION" ]; then
        if [ "$SETTINGS_VERSION" = "$PKG_VERSION" ]; then
            echo "  OK    14. .claude/settings.json (CAGENTS_VERSION): $SETTINGS_VERSION"
        else
            echo "  FAIL  14. .claude/settings.json (CAGENTS_VERSION): $SETTINGS_VERSION (expected $PKG_VERSION)"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo "  SKIP  14. .claude/settings.json (CAGENTS_VERSION not found)"
    fi
fi

echo ""
echo "Checked $CHECKED locations, $ERRORS mismatches"

if [ "$ERRORS" -gt 0 ]; then
    echo "FAIL: Version sync errors found. Run scripts/ci/sync-versions.sh to fix."
    exit 1
fi

echo "PASS: All versions in sync at $PKG_VERSION"
exit 0

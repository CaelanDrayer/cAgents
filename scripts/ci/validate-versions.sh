#!/bin/bash
# Validate version consistency across the 18 canonical cAgents locations.
# See .claude/rules/core/version-registry.md for the registry.
# Paired with scripts/sync-versions.sh — both must track the same 18 slots.

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

echo "Validating version consistency across 18 canonical locations..."
echo ""

# Source of truth
PKG_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "Source of truth (package.json): $PKG_VERSION"
echo ""

ERRORS=0
CHECKED=0
SKIPPED=0

check_version() {
    local file="$1"
    local label="$2"
    CHECKED=$((CHECKED + 1))

    if [ ! -f "$file" ]; then
        echo "  SKIP  $label ($file not found)"
        SKIPPED=$((SKIPPED + 1))
        return
    fi

    local version=""
    case "$file" in
        *.json)
            version=$(grep -m1 '"version"' "$file" | grep -v schema | sed 's/.*"version": "\(.*\)".*/\1/')
            ;;
        *.md)
            # SKILL.md frontmatter: `  version: "X.Y.Z"` (2-space indent, quoted)
            # CLAUDE.md / docs/README.md: "Version: X.Y.Z" or "**Version**: X.Y.Z"
            # docs/RELEASE_NOTES.md: "**Current Version**: X.Y.Z"
            # README.md / CHANGELOG.md: handled by special-case grep below
            version=$(grep -m1 -oP '(?:version: "|Version[*]*: |Current Version[*]*: )\K[0-9]+\.[0-9]+\.[0-9]+' "$file" 2>/dev/null || echo "")
            ;;
        *.cjs)
            # session-catchup.cjs: `cAgents V{version} session initialized`
            version=$(grep -oP 'cAgents V\K[0-9]+\.[0-9]+\.[0-9]+(?= session initialized)' "$file" 2>/dev/null | head -1 || echo "")
            ;;
        *.sh)
            # cagents-ci.sh / validate-agents.sh: `# Version: {version}` header
            version=$(grep -oP '# Version: \K[0-9]+\.[0-9]+\.[0-9]+' "$file" 2>/dev/null | head -1 || echo "")
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

echo "Checking 18 canonical locations (per .claude/rules/core/version-registry.md):"
echo ""

# 1. package.json (source of truth)
check_version "package.json" "1. package.json"

# 2-3. Root plugin manifests
check_version ".claude-plugin/plugin.json" "2. .claude-plugin/plugin.json"
check_version ".claude-plugin/marketplace.json" "3. .claude-plugin/marketplace.json"

# 4. CLAUDE.md Quick Reference
check_version "CLAUDE.md" "4. CLAUDE.md"

# 5. .claude/settings.json CAGENTS_VERSION + $comment
if [ -f ".claude/settings.json" ]; then
    CHECKED=$((CHECKED + 1))
    SETTINGS_VERSION=$(grep -oP '"CAGENTS_VERSION":\s*"\K[0-9]+\.[0-9]+\.[0-9]+' .claude/settings.json 2>/dev/null || echo "")
    if [ -n "$SETTINGS_VERSION" ]; then
        if [ "$SETTINGS_VERSION" = "$PKG_VERSION" ]; then
            echo "  OK    5. .claude/settings.json (CAGENTS_VERSION): $SETTINGS_VERSION"
        else
            echo "  FAIL  5. .claude/settings.json (CAGENTS_VERSION): $SETTINGS_VERSION (expected $PKG_VERSION)"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo "  WARN  5. .claude/settings.json (CAGENTS_VERSION not found)"
    fi
else
    echo "  SKIP  5. .claude/settings.json (not found)"
    SKIPPED=$((SKIPPED + 1))
    CHECKED=$((CHECKED + 1))
fi

# 6-11. Skill SKILL.md frontmatter versions (6 active skills in V11.0)
check_version ".claude/skills/run/SKILL.md"      "6. .claude/skills/run/SKILL.md"
check_version ".claude/skills/org/SKILL.md"      "7. .claude/skills/org/SKILL.md"
check_version ".claude/skills/team/SKILL.md"     "8. .claude/skills/team/SKILL.md"
check_version ".claude/skills/designer/SKILL.md" "9. .claude/skills/designer/SKILL.md"
check_version ".claude/skills/improve/SKILL.md"  "10. .claude/skills/improve/SKILL.md"
check_version ".claude/skills/helper/SKILL.md"   "11. .claude/skills/helper/SKILL.md"

# 12. session-catchup.cjs version string
check_version ".claude/hooks/session-catchup.cjs" "12. .claude/hooks/session-catchup.cjs"

# 13. cagents-ci.sh version header
check_version "scripts/ci/cagents-ci.sh" "13. scripts/ci/cagents-ci.sh"

# 14. validate-agents.sh version header
check_version "scripts/ci/validate-agents.sh" "14. scripts/ci/validate-agents.sh"

# 15. README.md Version History line
if [ -f "README.md" ]; then
    CHECKED=$((CHECKED + 1))
    README_VERSION=$(grep -m1 -oP '\*\*V\K[0-9]+\.[0-9]+\.[0-9]+(?=\*\* — Current release)' README.md 2>/dev/null || echo "")
    if [ -n "$README_VERSION" ]; then
        if [ "$README_VERSION" = "$PKG_VERSION" ]; then
            echo "  OK    15. README.md: $README_VERSION"
        else
            echo "  FAIL  15. README.md: $README_VERSION (expected $PKG_VERSION)"
            ERRORS=$((ERRORS + 1))
        fi
    else
        echo "  WARN  15. README.md (Version History line not found)"
    fi
else
    echo "  SKIP  15. README.md (not found)"
    SKIPPED=$((SKIPPED + 1))
    CHECKED=$((CHECKED + 1))
fi

# 16. docs/README.md Version header
check_version "docs/README.md" "16. docs/README.md"

# 17. docs/RELEASE_NOTES.md Current Version header
check_version "docs/RELEASE_NOTES.md" "17. docs/RELEASE_NOTES.md"

# 18. CHANGELOG.md - assert that ## [VERSION] header exists
if [ -f "CHANGELOG.md" ]; then
    CHECKED=$((CHECKED + 1))
    if grep -qE "^## \[$PKG_VERSION\]" CHANGELOG.md; then
        echo "  OK    18. CHANGELOG.md: ## [$PKG_VERSION] entry present"
    else
        echo "  FAIL  18. CHANGELOG.md: missing ## [$PKG_VERSION] entry"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  SKIP  18. CHANGELOG.md (not found)"
    SKIPPED=$((SKIPPED + 1))
    CHECKED=$((CHECKED + 1))
fi

echo ""
echo "Checked $CHECKED/18 locations, $ERRORS mismatches, $SKIPPED skipped"

if [ "$ERRORS" -gt 0 ]; then
    echo "FAIL: Version sync errors found. Run scripts/sync-versions.sh <version> to fix."
    exit 1
fi

if [ "$SKIPPED" -gt 0 ]; then
    echo "WARN: $SKIPPED location(s) skipped (file not found). Investigate before release."
fi

echo "PASS: All versions in sync at $PKG_VERSION"
exit 0

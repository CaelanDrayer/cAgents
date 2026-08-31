#!/bin/bash
# Validate version consistency across the 16 canonical cAgents locations.
# See .claude/rules/core/version-registry.md for the registry.
# Paired with scripts/sync-versions.sh — both must track the same 16 slots.

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_DIR"

echo "Validating version consistency across 16 canonical locations..."
echo ""

# Source of truth
PKG_VERSION=$(grep -m1 '"version"' package.json | sed 's/.*"version": "\(.*\)".*/\1/')
# Regex-safe form (dots escaped) for the anchored heading/bullet assertions below.
PKG_VERSION_RE="${PKG_VERSION//./\\.}"
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

echo "Checking 16 canonical locations (per .claude/rules/core/version-registry.md):"
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

# 6-9. Skill SKILL.md frontmatter versions (4 active skills as of v12.2.0;
# /org removed in v12.2.0 and absorbed into /team strategic mode;
# /improve removed in v12.1.2 and folded into /run, since renamed to /act)
check_version ".claude/skills/act/SKILL.md"      "6. .claude/skills/act/SKILL.md"
check_version ".claude/skills/team/SKILL.md"     "7. .claude/skills/team/SKILL.md"
check_version ".claude/skills/designer/SKILL.md" "8. .claude/skills/designer/SKILL.md"
check_version ".claude/skills/helper/SKILL.md"   "9. .claude/skills/helper/SKILL.md"

# 10. session-catchup.cjs version string
check_version ".claude/hooks/session-catchup.cjs" "10. .claude/hooks/session-catchup.cjs"

# 11. cagents-ci.sh version header
check_version "scripts/ci/cagents-ci.sh" "11. scripts/ci/cagents-ci.sh"

# 12. validate-agents.sh version header
check_version "scripts/ci/validate-agents.sh" "12. scripts/ci/validate-agents.sh"

# 13. README.md Version History line
if [ -f "README.md" ]; then
    CHECKED=$((CHECKED + 1))
    README_VERSION=$(grep -m1 -oP '\*\*V\K[0-9]+\.[0-9]+\.[0-9]+(?=\*\* — Current release)' README.md 2>/dev/null || echo "")
    if [ -n "$README_VERSION" ]; then
        if [ "$README_VERSION" = "$PKG_VERSION" ]; then
            echo "  OK    13. README.md: $README_VERSION"
            # Freshness assertion layered on slot 13 (not a new slot; CHECKED unchanged).
            # The version token alone proves nothing: sync-versions.sh rewrites it with
            # `sed -i` on the existing bullet, so a bump can carry the PREVIOUS release's
            # prose forward under a new number — and consume the predecessor's bullet in
            # the process. That went unnoticed for 3 bumps (v12.66.0/1/2 all shipped
            # v12.19.0's prose). Two mechanical signals, no prose linting:
            #   a) the previous release's bullet must still be present, and
            #   b) the current bullet's prose must not be byte-identical to it.
            PREV_VERSION=$(grep -oP '^## \[\K[0-9]+\.[0-9]+\.[0-9]+' CHANGELOG.md 2>/dev/null | grep -vx "$PKG_VERSION" | head -1)
            if [ -n "$PREV_VERSION" ]; then
                PREV_VERSION_RE="${PREV_VERSION//./\\.}"
                CUR_BULLET=$(grep -m1 -oP "^- \*\*V${PKG_VERSION_RE}\*\* — \K.*" README.md 2>/dev/null || echo "")
                PREV_BULLET=$(grep -m1 -oP "^- \*\*V${PREV_VERSION_RE}\*\* — \K.*" README.md 2>/dev/null || echo "")
                if [ -z "$PREV_BULLET" ]; then
                    echo "  FAIL  13. README.md: no Version History bullet for previous release V$PREV_VERSION (an in-place version-token rewrite consumes the predecessor's bullet — add a NEW bullet instead)"
                    ERRORS=$((ERRORS + 1))
                elif [ "${CUR_BULLET#Current release. }" = "${PREV_BULLET#Current release. }" ]; then
                    echo "  FAIL  13. README.md: V$PKG_VERSION bullet prose is byte-identical to V$PREV_VERSION's (version token rewritten, prose frozen)"
                    ERRORS=$((ERRORS + 1))
                else
                    echo "  OK    13. README.md: V$PKG_VERSION bullet carries new prose (V$PREV_VERSION bullet retained)"
                fi
            fi
        else
            echo "  FAIL  13. README.md: $README_VERSION (expected $PKG_VERSION)"
            ERRORS=$((ERRORS + 1))
        fi
    else
        # FAIL, not WARN: the `— Current release` marker is the anchor the whole
        # freshness block above hangs off. If it is absent, neither the version
        # match nor the two freshness arms run at all — the gate would silently
        # disable itself, which is the exact blindness this slot exists to close.
        echo "  FAIL  13. README.md: no Version History bullet matching '- **V<version>** — Current release' (the anchor is load-bearing; without it slot 13 and its freshness assertions cannot run)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  SKIP  13. README.md (not found)"
    SKIPPED=$((SKIPPED + 1))
    CHECKED=$((CHECKED + 1))
fi

# 14. docs/README.md Version header
check_version "docs/README.md" "14. docs/README.md"

# 15. docs/RELEASE_NOTES.md Current Version header
check_version "docs/RELEASE_NOTES.md" "15. docs/RELEASE_NOTES.md"

# Documentation assertion layered on slot 15 (not a new slot; CHECKED unchanged).
# The `**Current Version**:` header is sed-rewritten by sync-versions.sh, so the
# version string can be present while the release itself is undocumented. Require
# the section heading, matching CHANGELOG.md's `## [VERSION]` assertion at slot 16.
if [ -f "docs/RELEASE_NOTES.md" ]; then
    if grep -qE "^## V${PKG_VERSION_RE}([[:space:]]|$)" docs/RELEASE_NOTES.md; then
        echo "  OK    15. docs/RELEASE_NOTES.md: ## V$PKG_VERSION section present"
    else
        echo "  FAIL  15. docs/RELEASE_NOTES.md: missing '## V$PKG_VERSION' section heading (the header version alone is not documentation)"
        ERRORS=$((ERRORS + 1))
    fi
fi

# 16. CHANGELOG.md - assert that ## [VERSION] header exists
if [ -f "CHANGELOG.md" ]; then
    CHECKED=$((CHECKED + 1))
    if grep -qE "^## \[$PKG_VERSION\]" CHANGELOG.md; then
        echo "  OK    16. CHANGELOG.md: ## [$PKG_VERSION] entry present"
    else
        echo "  FAIL  16. CHANGELOG.md: missing ## [$PKG_VERSION] entry"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "  SKIP  16. CHANGELOG.md (not found)"
    SKIPPED=$((SKIPPED + 1))
    CHECKED=$((CHECKED + 1))
fi

echo ""
echo "Checked $CHECKED/16 locations, $ERRORS mismatches, $SKIPPED skipped"

if [ "$ERRORS" -gt 0 ]; then
    echo "FAIL: Version sync errors found. Run scripts/sync-versions.sh <version> to fix."
    exit 1
fi

if [ "$SKIPPED" -gt 0 ]; then
    echo "WARN: $SKIPPED location(s) skipped (file not found). Investigate before release."
fi

echo "PASS: All versions in sync at $PKG_VERSION"
exit 0

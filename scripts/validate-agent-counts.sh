#!/bin/bash
# Validate agent count accuracy across cAgents files
# Exit with error if counts don't match actual files

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "🔍 Validating agent counts..."
echo ""

# Count actual agents (SKILL.md files only, excluding resources/)
count_agents() {
    local dir=$1
    find "$dir" -type f -name "SKILL.md" 2>/dev/null | wc -l
}

# Count by domain
CORE_COUNT=$(count_agents "core/agents")
SHARED_COUNT=$(count_agents "shared/agents")
MAKE_COUNT=$(count_agents "make/agents")
GROW_COUNT=$(count_agents "grow/agents")
OPERATE_COUNT=$(count_agents "operate/agents")
PEOPLE_COUNT=$(count_agents "people/agents")
SERVE_COUNT=$(count_agents "serve/agents")

ACTUAL_TOTAL=$((CORE_COUNT + SHARED_COUNT + MAKE_COUNT + GROW_COUNT + OPERATE_COUNT + PEOPLE_COUNT + SERVE_COUNT))

echo "=== Actual Agent Counts ==="
echo "Core:    $CORE_COUNT"
echo "Shared:  $SHARED_COUNT"
echo "Make:    $MAKE_COUNT"
echo "Grow:    $GROW_COUNT"
echo "Operate: $OPERATE_COUNT"
echo "People:  $PEOPLE_COUNT"
echo "Serve:   $SERVE_COUNT"
echo "TOTAL:   $ACTUAL_TOTAL"
echo ""

# Extract documented counts from package.json
PKG_TOTAL=$(grep -A1 '"agents":' package.json | grep '"total"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_CORE=$(grep -A2 '"agents":' package.json | grep '"core"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_SHARED=$(grep -A3 '"agents":' package.json | grep '"shared"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_MAKE=$(grep -A1 '"breakdown":' package.json | grep '"make"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_GROW=$(grep -A2 '"breakdown":' package.json | grep '"grow"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_OPERATE=$(grep -A3 '"breakdown":' package.json | grep '"operate"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_PEOPLE=$(grep -A4 '"breakdown":' package.json | grep '"people"' | sed 's/.*: \([0-9]*\).*/\1/')
PKG_SERVE=$(grep -A5 '"breakdown":' package.json | grep '"serve"' | sed 's/.*: \([0-9]*\).*/\1/')

echo "=== Documented Counts (package.json) ==="
echo "Core:    $PKG_CORE"
echo "Shared:  $PKG_SHARED"
echo "Make:    $PKG_MAKE"
echo "Grow:    $PKG_GROW"
echo "Operate: $PKG_OPERATE"
echo "People:  $PKG_PEOPLE"
echo "Serve:   $PKG_SERVE"
echo "TOTAL:   $PKG_TOTAL"
echo ""

# Check mismatches
ERRORS=0

if [ "$ACTUAL_TOTAL" -ne "$PKG_TOTAL" ]; then
    echo "❌ ERROR: Total count mismatch (actual: $ACTUAL_TOTAL, documented: $PKG_TOTAL)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$CORE_COUNT" -ne "$PKG_CORE" ]; then
    echo "❌ ERROR: Core count mismatch (actual: $CORE_COUNT, documented: $PKG_CORE)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$SHARED_COUNT" -ne "$PKG_SHARED" ]; then
    echo "❌ ERROR: Shared count mismatch (actual: $SHARED_COUNT, documented: $PKG_SHARED)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$MAKE_COUNT" -ne "$PKG_MAKE" ]; then
    echo "❌ ERROR: Make count mismatch (actual: $MAKE_COUNT, documented: $PKG_MAKE)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$GROW_COUNT" -ne "$PKG_GROW" ]; then
    echo "❌ ERROR: Grow count mismatch (actual: $GROW_COUNT, documented: $PKG_GROW)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$OPERATE_COUNT" -ne "$PKG_OPERATE" ]; then
    echo "❌ ERROR: Operate count mismatch (actual: $OPERATE_COUNT, documented: $PKG_OPERATE)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$PEOPLE_COUNT" -ne "$PKG_PEOPLE" ]; then
    echo "❌ ERROR: People count mismatch (actual: $PEOPLE_COUNT, documented: $PKG_PEOPLE)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$SERVE_COUNT" -ne "$PKG_SERVE" ]; then
    echo "❌ ERROR: Serve count mismatch (actual: $SERVE_COUNT, documented: $PKG_SERVE)"
    ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo "Found $ERRORS count mismatch(es). Please update package.json."
    exit 1
fi

echo "✅ All agent counts match!"
exit 0

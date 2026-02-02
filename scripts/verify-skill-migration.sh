#!/bin/bash
# Verification script for SKILL.md agent migrations
# Usage: ./scripts/verify-skill-migration.sh <agent-name>

set -e

AGENT=$1
if [ -z "$AGENT" ]; then
    echo "Usage: $0 <agent-name>"
    echo "Example: $0 trigger"
    exit 1
fi

# Find agent location (core, shared, or domain)
AGENT_DIR=""
for dir in core shared make grow operate people serve; do
    if [ -d "$dir/agents/$AGENT" ]; then
        AGENT_DIR="$dir/agents/$AGENT"
        break
    fi
done

if [ -z "$AGENT_DIR" ]; then
    echo "❌ Agent directory not found: $AGENT"
    exit 1
fi

echo "Verifying SKILL.md migration for: $AGENT"
echo "Location: $AGENT_DIR"
echo ""

# Check 1: SKILL.md exists
echo "1. Checking SKILL.md existence..."
if [ -f "$AGENT_DIR/SKILL.md" ]; then
    echo "   ✅ SKILL.md exists"
else
    echo "   ❌ SKILL.md not found"
    exit 1
fi

# Check 2: Frontmatter validation
echo "2. Validating frontmatter..."
if grep -q "^name: $AGENT$" "$AGENT_DIR/SKILL.md"; then
    echo "   ✅ name field correct"
else
    echo "   ❌ name field missing or incorrect"
    exit 1
fi

if grep -q "^tier:" "$AGENT_DIR/SKILL.md"; then
    echo "   ✅ tier field present"
else
    echo "   ❌ tier field missing"
    exit 1
fi

if grep -q "^domain:" "$AGENT_DIR/SKILL.md"; then
    echo "   ✅ domain field present"
else
    echo "   ❌ domain field missing"
    exit 1
fi

if grep -q "^description:" "$AGENT_DIR/SKILL.md"; then
    echo "   ✅ description field present"
else
    echo "   ❌ description field missing"
    exit 1
fi

# Check 3: Resources directory
echo "3. Checking resources directory..."
if [ -d "$AGENT_DIR/resources" ]; then
    RESOURCE_COUNT=$(ls -1 "$AGENT_DIR/resources"/*.md 2>/dev/null | wc -l)
    echo "   ✅ resources/ directory exists ($RESOURCE_COUNT files)"
else
    echo "   ⚠️  resources/ directory not found (optional)"
fi

# Check 4: @path references
echo "4. Verifying @path references..."
if grep -q "@resources/" "$AGENT_DIR/SKILL.md"; then
    while IFS= read -r ref; do
        file=$(echo "$ref" | sed 's/.*@resources\/\([^ ]*\).*/\1/')
        if [ -f "$AGENT_DIR/resources/$file" ]; then
            echo "   ✅ @resources/$file exists"
        else
            echo "   ❌ @resources/$file NOT FOUND"
            exit 1
        fi
    done < <(grep "@resources/" "$AGENT_DIR/SKILL.md")
else
    echo "   ℹ️  No @path references found"
fi

# Check 5: Old .md file deleted
echo "5. Checking old single-file agent deleted..."
OLD_FILE=$(dirname "$AGENT_DIR")/$AGENT.md
if [ -f "$OLD_FILE" ]; then
    echo "   ❌ Old file still exists: $OLD_FILE"
    exit 1
else
    echo "   ✅ Old single-file agent deleted"
fi

# Check 6: Line count
echo "6. Checking file size..."
LINES=$(wc -l < "$AGENT_DIR/SKILL.md")
if [ "$LINES" -lt 150 ]; then
    echo "   ✅ SKILL.md compact ($LINES lines)"
else
    echo "   ⚠️  SKILL.md large ($LINES lines, consider splitting)"
fi

# Check 7: Token estimate
echo "7. Estimating token savings..."
SKILL_WORDS=$(wc -w < "$AGENT_DIR/SKILL.md")
SKILL_TOKENS=$((SKILL_WORDS * 13 / 10))

if [ -d "$AGENT_DIR/resources" ]; then
    RESOURCE_WORDS=$(find "$AGENT_DIR/resources" -name "*.md" -exec wc -w {} \; | awk '{sum+=$1} END {print sum}')
    TOTAL_WORDS=$((SKILL_WORDS + RESOURCE_WORDS))
    TOTAL_TOKENS=$((TOTAL_WORDS * 13 / 10))
    SAVINGS_PCT=$(( (TOTAL_TOKENS - SKILL_TOKENS) * 100 / TOTAL_TOKENS ))
    echo "   SKILL: $SKILL_WORDS words (~$SKILL_TOKENS tokens)"
    echo "   Total: $TOTAL_WORDS words (~$TOTAL_TOKENS tokens)"
    echo "   ✅ Savings: $SAVINGS_PCT% (baseline load reduction)"
else
    echo "   SKILL: $SKILL_WORDS words (~$SKILL_TOKENS tokens)"
    echo "   ℹ️  No resources directory for comparison"
fi

echo ""
echo "✅ All checks passed for: $AGENT"

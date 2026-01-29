#!/bin/bash
# SKILL.md Migration Script
# Usage: ./scripts/migrate_agent.sh make architect

set -e

DOMAIN="$1"
AGENT="$2"

if [ -z "$DOMAIN" ] || [ -z "$AGENT" ]; then
    echo "Usage: $0 <domain> <agent-name>"
    echo "Example: $0 make architect"
    exit 1
fi

AGENT_DIR="$DOMAIN/agents"
OLD_FILE="$AGENT_DIR/$AGENT.md"
NEW_DIR="$AGENT_DIR/$AGENT"
SKILL_FILE="$NEW_DIR/SKILL.md"
RESOURCES_DIR="$NEW_DIR/resources"

echo "=== SKILL.md Migration Tool ==="
echo "Domain: $DOMAIN"
echo "Agent: $AGENT"
echo ""

# Check if old file exists
if [ ! -f "$OLD_FILE" ]; then
    echo "ERROR: $OLD_FILE does not exist"
    exit 1
fi

# Check if already migrated
if [ -f "$OLD_FILE.migrated" ]; then
    echo "WARNING: $OLD_FILE.migrated already exists. Agent may already be migrated."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create directory structure
echo "1. Creating directory structure..."
mkdir -p "$RESOURCES_DIR"

# Display file stats
echo ""
echo "2. Analyzing original file..."
LINES=$(wc -l < "$OLD_FILE")
BYTES=$(wc -c < "$OLD_FILE")
EST_TOKENS=$((BYTES / 5))
echo "   Lines: $LINES"
echo "   Bytes: $BYTES"
echo "   Estimated tokens: $EST_TOKENS"

# Check if SKILL.md already exists
if [ -f "$SKILL_FILE" ]; then
    echo ""
    echo "3. SKILL.md already exists:"
    SKILL_BYTES=$(wc -c < "$SKILL_FILE")
    SKILL_TOKENS=$((SKILL_BYTES / 5))
    echo "   Size: $SKILL_BYTES bytes (~$SKILL_TOKENS tokens)"
    echo "   Savings: ~$((EST_TOKENS - SKILL_TOKENS)) tokens ($((100 - (SKILL_TOKENS * 100 / EST_TOKENS)))%)"
else
    echo ""
    echo "3. SKILL.md does not exist yet. Manual creation needed."
fi

# Check resources
echo ""
echo "4. Checking resources directory..."
if [ -d "$RESOURCES_DIR" ]; then
    RESOURCE_COUNT=$(ls -1 "$RESOURCES_DIR" | wc -l)
    RESOURCE_BYTES=$(du -sb "$RESOURCES_DIR" | cut -f1)
    echo "   Files: $RESOURCE_COUNT"
    echo "   Total size: $RESOURCE_BYTES bytes"
    if [ $RESOURCE_COUNT -gt 0 ]; then
        echo "   Files:"
        ls -lh "$RESOURCES_DIR" | tail -n +2 | awk '{print "     - " $9 " (" $5 ")"}'
    fi
else
    echo "   Resources directory does not exist"
fi

# Recommendation
echo ""
echo "5. Recommendation:"
if [ -f "$SKILL_FILE" ] && [ -d "$RESOURCES_DIR" ] && [ $RESOURCE_COUNT -gt 2 ]; then
    echo "   ✅ Migration appears complete"
    echo "   Next step: Rename old file"
    echo ""
    read -p "   Rename $OLD_FILE to $OLD_FILE.migrated? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        mv "$OLD_FILE" "$OLD_FILE.migrated"
        echo "   ✅ Renamed successfully"
        echo ""
        echo "Migration complete! Verify with:"
        echo "  cat $SKILL_FILE"
        echo "  ls -lh $RESOURCES_DIR"
    fi
else
    echo "   ⚠️  Migration incomplete"
    echo "   Required:"
    [ ! -f "$SKILL_FILE" ] && echo "     - Create $SKILL_FILE (200-300 tokens)"
    [ ! -d "$RESOURCES_DIR" ] && echo "     - Create $RESOURCES_DIR directory"
    [ $RESOURCE_COUNT -lt 3 ] && echo "     - Extract content to resources/ (3-5 files recommended)"
    echo ""
    echo "   Manual steps needed:"
    echo "     1. Create streamlined SKILL.md (200-300 tokens)"
    echo "     2. Extract detailed content to resources/:"
    echo "        - example-interactions.md"
    echo "        - detailed-capabilities.md"
    echo "        - collaboration-patterns.md"
    echo "        - anti-patterns.md or best-practices.md"
    echo "     3. Add @path references in SKILL.md"
    echo "     4. Run this script again to rename old file"
fi

echo ""
echo "=== Migration Report ==="
echo "Original file: $OLD_FILE ($BYTES bytes, ~$EST_TOKENS tokens)"
if [ -f "$SKILL_FILE" ]; then
    SKILL_BYTES=$(wc -c < "$SKILL_FILE")
    SKILL_TOKENS=$((SKILL_BYTES / 5))
    SAVINGS=$((EST_TOKENS - SKILL_TOKENS))
    SAVINGS_PCT=$((100 - (SKILL_TOKENS * 100 / EST_TOKENS)))
    echo "SKILL.md: $SKILL_BYTES bytes (~$SKILL_TOKENS tokens)"
    echo "Token savings: ~$SAVINGS tokens ($SAVINGS_PCT%)"
fi
if [ -d "$RESOURCES_DIR" ]; then
    RESOURCE_BYTES=$(du -sb "$RESOURCES_DIR" 2>/dev/null | cut -f1 || echo "0")
    RESOURCE_TOKENS=$((RESOURCE_BYTES / 5))
    echo "Resources (tier 3): $RESOURCE_BYTES bytes (~$RESOURCE_TOKENS tokens, on-demand)"
fi

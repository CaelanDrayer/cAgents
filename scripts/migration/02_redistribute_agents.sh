#!/bin/bash
#
# Migration Script 2: Redistribute Agents to Super-Domains
# Moves agents from 17+ old domains to 5 super-domains
#

set -e  # Exit on error

echo "=== Phase 2.2: Redistributing Agents to Super-Domains ==="

PROJECT_ROOT="/home/PathingIT/cAgents"
cd "$PROJECT_ROOT"

echo "Agent Distribution Mapping:"
echo ""
echo "  MAKE    ← engineering, creative, planning"
echo "  GROW    ← marketing, sales, revenue"
echo "  OPERATE ← finance, finance-operations, business"
echo "  PEOPLE  ← people-culture, hr"
echo "  SERVE   ← customer-experience, legal-compliance, legal, support"
echo ""

# MAKE super-domain (~63 agents)
echo "Redistributing to MAKE..."
for source in engineering creative planning; do
    if [ -d "$source/agents" ]; then
        echo "  Copying $source agents..."
        cp -r "$source/agents/"*.md make/agents/ 2>/dev/null || true
    fi
done

# GROW super-domain (~40 agents)
echo "Redistributing to GROW..."
for source in marketing sales revenue; do
    if [ -d "$source/agents" ]; then
        echo "  Copying $source agents..."
        cp -r "$source/agents/"*.md grow/agents/ 2>/dev/null || true
    fi
done

# OPERATE super-domain (~32 agents)
echo "Redistributing to OPERATE..."
for source in finance finance-operations business; do
    if [ -d "$source/agents" ]; then
        echo "  Copying $source agents..."
        cp -r "$source/agents/"*.md operate/agents/ 2>/dev/null || true
    fi
done

# PEOPLE super-domain (~19 agents)
echo "Redistributing to PEOPLE..."
for source in people-culture hr; do
    if [ -d "$source/agents" ]; then
        echo "  Copying $source agents..."
        cp -r "$source/agents/"*.md people/agents/ 2>/dev/null || true
    fi
done

# SERVE super-domain (~32 agents)
echo "Redistributing to SERVE..."
for source in customer-experience legal-compliance legal support; do
    if [ -d "$source/agents" ]; then
        echo "  Copying $source agents..."
        cp -r "$source/agents/"*.md serve/agents/ 2>/dev/null || true
    fi
done

echo ""
echo "Agent counts per super-domain:"
echo "  MAKE:    $(ls make/agents/*.md 2>/dev/null | wc -l) agents"
echo "  GROW:    $(ls grow/agents/*.md 2>/dev/null | wc -l) agents"
echo "  OPERATE: $(ls operate/agents/*.md 2>/dev/null | wc -l) agents"
echo "  PEOPLE:  $(ls people/agents/*.md 2>/dev/null | wc -l) agents"
echo "  SERVE:   $(ls serve/agents/*.md 2>/dev/null | wc -l) agents"
echo ""
echo "  TOTAL:   $(($(ls make/agents/*.md 2>/dev/null | wc -l) + $(ls grow/agents/*.md 2>/dev/null | wc -l) + $(ls operate/agents/*.md 2>/dev/null | wc -l) + $(ls people/agents/*.md 2>/dev/null | wc -l) + $(ls serve/agents/*.md 2>/dev/null | wc -l))) agents"
echo ""
echo "Next: Run 03_update_frontmatter.py to update agent domain fields"

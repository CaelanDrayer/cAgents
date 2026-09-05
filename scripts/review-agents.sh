#!/bin/bash
# Comprehensive agent review script

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== AGENT REVIEW PHASE 2 ==="
echo ""

# Find all agent files
# v12.68.0: agent definitions are flat — agents/<name>.md.
agent_files=$(find "$REPO_ROOT/agents" -maxdepth 1 -type f -name "*.md" 2>/dev/null | sort)

echo "Total agent files found: $(echo "$agent_files" | wc -l)"
echo ""

# Check for frontmatter issues
echo "=== CHECKING FRONTMATTER ==="
missing_name=0
missing_tier=0
missing_archetype=0
missing_description=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Check if file has frontmatter
        if ! grep -q "^---$" "$file"; then
            echo "WARN: No frontmatter in $file"
            continue
        fi

        # Extract frontmatter
        frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | head -n -1 | tail -n +2)

        # Check required fields
        if ! echo "$frontmatter" | grep -q "^name:"; then
            echo "MISSING name: $file"
            ((missing_name++))
        fi

        # tier lives inside the metadata: block (v11.1.0 schema)
        if ! echo "$frontmatter" | grep -qE "^  tier:"; then
            echo "MISSING metadata.tier: $file"
            ((missing_tier++))
        fi

        # archetype replaced domain at top level in v11.1.0; a top-level
        # domain: is FORBIDDEN, so flag its presence, not its absence.
        if ! echo "$frontmatter" | grep -q "^archetype:"; then
            echo "MISSING archetype: $file"
            ((missing_archetype++))
        fi
        if echo "$frontmatter" | grep -q "^domain:"; then
            echo "FORBIDDEN top-level domain: $file"
            ((missing_archetype++))
        fi

        if ! echo "$frontmatter" | grep -q "^description:"; then
            echo "MISSING description: $file"
            ((missing_description++))
        fi
    fi
done <<< "$agent_files"

echo ""
echo "Summary:"
echo "  Missing name: $missing_name"
echo "  Missing metadata.tier: $missing_tier"
echo "  Missing archetype (or forbidden domain): $missing_archetype"
echo "  Missing description: $missing_description"
echo ""

# Check for broken @path references
echo "=== CHECKING @PATH REFERENCES ==="
broken_refs=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Find @path references
        refs=$(grep -o '@resources/[^) ]*' "$file" 2>/dev/null || true)

        if [ -n "$refs" ]; then
            dir=$(dirname "$file")
            while IFS= read -r ref; do
                # Remove @
                ref_path="${ref#@}"
                full_path="$dir/$ref_path"

                if [ ! -f "$full_path" ]; then
                    echo "BROKEN: $file -> $ref (expected: $full_path)"
                    ((broken_refs++))
                fi
            done <<< "$refs"
        fi
    fi
done <<< "$agent_files"

echo "Total broken @path references: $broken_refs"
echo ""

# Check for directory structure agents
echo "=== CHECKING DIRECTORY STRUCTURE ==="
dir_agents=$(find "$REPO_ROOT/agents" -maxdepth 1 -type f -name "*.md" 2>/dev/null | wc -l)
echo "Agent directories found: $dir_agents"
echo ""

# Check for small/empty files
echo "=== CHECKING FILE SIZES ==="
small_files=0

while IFS= read -r file; do
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        if [ "$lines" -lt 20 ]; then
            echo "SMALL (<20 lines): $file ($lines lines)"
            ((small_files++))
        fi
    fi
done <<< "$agent_files"

echo "Total small files: $small_files"
echo ""

echo "=== REVIEW COMPLETE ==="

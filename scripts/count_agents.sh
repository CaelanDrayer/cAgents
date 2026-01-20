#!/bin/bash
# Count agents in each domain

echo "=== AGENT COUNTS BY DOMAIN ==="
for dir in make grow operate people serve engineering revenue creative finance-operations people-culture customer-experience legal-compliance business hr legal marketing sales software support planning; do
    if [ -d "$dir/agents" ]; then
        count=$(find "$dir/agents" -name "*.md" 2>/dev/null | wc -l)
        echo "$dir: $count"
    fi
done

echo ""
echo "=== TOTALS ==="
echo "NEW Super-domains (make, grow, operate, people, serve):"
total_new=0
for dir in make grow operate people serve; do
    if [ -d "$dir/agents" ]; then
        count=$(find "$dir/agents" -name "*.md" 2>/dev/null | wc -l)
        total_new=$((total_new + count))
    fi
done
echo "  Total: $total_new"

echo ""
echo "LEGACY Domains (engineering, revenue, creative, etc.):"
total_legacy=0
for dir in engineering revenue creative finance-operations people-culture customer-experience legal-compliance business hr legal marketing sales software support planning; do
    if [ -d "$dir/agents" ]; then
        count=$(find "$dir/agents" -name "*.md" 2>/dev/null | wc -l)
        total_legacy=$((total_legacy + count))
    fi
done
echo "  Total: $total_legacy"

echo ""
echo "Core + Shared:"
core_count=$(find core/agents -name "*.md" 2>/dev/null | wc -l)
shared_count=$(find shared/agents -name "*.md" 2>/dev/null | wc -l)
echo "  Core: $core_count"
echo "  Shared: $shared_count"

echo ""
echo "GRAND TOTAL: $((total_new + total_legacy + core_count + shared_count))"

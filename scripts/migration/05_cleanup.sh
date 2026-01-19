#!/bin/bash
#
# Migration Script 5: Cleanup Old Structure
# Removes 17 old domain directories and old config files
#

set -e  # Exit on error

echo "=== Phase 2.4: Cleaning Up Old Structure ==="

PROJECT_ROOT="/home/PathingIT/cAgents"
cd "$PROJECT_ROOT"

echo ""
echo "⚠  WARNING: This will delete old domain directories and configs!"
echo "   Make sure migration is complete and validated before running."
echo ""
read -p "Continue with cleanup? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Deleting old domain directories..."

# List of old domains to delete
OLD_DOMAINS=(
    "engineering"
    "creative"
    "planning"
    "marketing"
    "sales"
    "revenue"
    "finance"
    "finance-operations"
    "business"
    "people-culture"
    "hr"
    "customer-experience"
    "legal-compliance"
    "legal"
    "support"
    "software"
    "operations"
)

deleted_count=0

for domain in "${OLD_DOMAINS[@]}"; do
    if [ -d "$domain" ]; then
        echo "  Deleting $domain/..."
        rm -rf "$domain"
        deleted_count=$((deleted_count + 1))
    fi
done

echo "  ✓ Deleted $deleted_count domain directories"

echo ""
echo "Deleting old domain configs..."

# Delete old domain config directories
old_config_count=0
for domain in "${OLD_DOMAINS[@]}"; do
    config_dir="Agent_Memory/_system/domains/$domain"
    if [ -d "$config_dir" ]; then
        rm -rf "$config_dir"
        old_config_count=$((old_config_count + 1))
    fi
done

echo "  ✓ Deleted $old_config_count old config directories"

echo ""
echo "Cleanup Summary:"
echo "  Domain directories deleted: $deleted_count"
echo "  Config directories deleted: $old_config_count"
echo "  Total files eliminated: ~$((deleted_count * 5 + old_config_count * 5))"
echo ""
echo "Migration cleanup complete!"
echo ""
echo "Next: Run post-migration validation (Phase 3)"

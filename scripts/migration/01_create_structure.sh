#!/bin/bash
#
# Migration Script 1: Create Super-Domain Structure
# Creates 5 super-domain directories with subdirectories
#

set -e  # Exit on error

echo "=== Phase 2.1: Creating Super-Domain Structure ==="

PROJECT_ROOT="/home/PathingIT/cAgents"
cd "$PROJECT_ROOT"

# Define super-domains
SUPER_DOMAINS=("make" "grow" "operate" "people" "serve")

echo "Creating 5 super-domain directories..."

for domain in "${SUPER_DOMAINS[@]}"; do
    echo "  Creating $domain/..."

    # Create directory structure
    mkdir -p "$domain/agents"
    mkdir -p "$domain/config"
    mkdir -p "$domain/.claude-plugin"

    echo "    ✓ $domain/agents/"
    echo "    ✓ $domain/config/"
    echo "    ✓ $domain/.claude-plugin/"
done

echo ""
echo "Super-domain structure created successfully!"
echo "Directories created: 5 super-domains × 3 subdirectories = 15 directories"
echo ""
echo "Next: Run 02_redistribute_agents.sh to move agents to super-domains"

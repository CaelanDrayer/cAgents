#!/usr/bin/env bash
# cAgents v11.1.0 Stage F — cagents-memory → cagents-memory rename + sed sweep
# Run AFTER scripts/migrate-v11.1.0-execute.sh and verifying npm test passes.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=========================================="
echo "Stage F: cagents-memory → cagents-memory rename"
echo "=========================================="

# Step 1: rename the folder via git
if [ -d "cagents-memory" ]; then
  git mv cagents-memory cagents-memory 2>/dev/null || mv cagents-memory cagents-memory
  echo "  Renamed cagents-memory → cagents-memory"
else
  echo "  cagents-memory/ not found (already renamed?)"
fi

# Step 2: sed-sweep all string references in tracked files (excluding archive/, node_modules/, .git/)
echo ""
echo "Sweeping 'cagents-memory' string references..."
files=$(rg -l "cagents-memory" -g '!archive/' -g '!node_modules/' -g '!.git/' -g '!cagents-memory-staging/' -g '!*.lock' || true)
if [ -n "$files" ]; then
  count=$(echo "$files" | wc -l)
  echo "  Files with references: $count"
  echo "$files" | xargs sed -i 's|cagents-memory|cagents-memory|g'
  echo "  Sweep complete."
else
  echo "  No files found with cagents-memory references."
fi

# Step 3: Verify
echo ""
echo "Post-sweep verification:"
remaining=$(rg -c "cagents-memory" -g '!archive/' -g '!node_modules/' -g '!.git/' -g '!cagents-memory-staging/' --no-filename 2>/dev/null | awk '{s+=$1} END {print s+0}')
echo "  Remaining 'cagents-memory' references in tracked files: $remaining"
if [ "$remaining" -gt 0 ]; then
  echo "  Files still containing references:"
  rg -l "cagents-memory" -g '!archive/' -g '!node_modules/' -g '!.git/' -g '!cagents-memory-staging/' | head -10
fi

echo ""
echo "Stage F complete."
echo "Next: run npm test, then commit."

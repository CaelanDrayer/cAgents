#!/bin/bash
# Sync version across all cAgents manifest files
# Usage: ./scripts/sync-versions.sh <new-version>
#
# Updates version in:
#   .claude-plugin/plugin.json
#   .claude-plugin/marketplace.json
#   core/.claude-plugin/plugin.json
#   make/.claude-plugin/plugin.json
#   grow/.claude-plugin/plugin.json
#   operate/.claude-plugin/plugin.json
#   people/.claude-plugin/plugin.json
#   serve/.claude-plugin/plugin.json
#   shared/.claude-plugin/plugin.json

set -euo pipefail

VERSION="${1:?Usage: sync-versions.sh <version>}"

# Validate version format (major.minor.patch)
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Error: Version must be in format major.minor.patch (e.g., 9.0.0)"
  exit 1
fi

# Root directory (script location parent)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# All manifest files to update
MANIFESTS=(
  "$ROOT/.claude-plugin/plugin.json"
  "$ROOT/.claude-plugin/marketplace.json"
  "$ROOT/core/.claude-plugin/plugin.json"
  "$ROOT/make/.claude-plugin/plugin.json"
  "$ROOT/grow/.claude-plugin/plugin.json"
  "$ROOT/operate/.claude-plugin/plugin.json"
  "$ROOT/people/.claude-plugin/plugin.json"
  "$ROOT/serve/.claude-plugin/plugin.json"
  "$ROOT/shared/.claude-plugin/plugin.json"
)

UPDATED=0
FAILED=0

for manifest in "${MANIFESTS[@]}"; do
  if [ ! -f "$manifest" ]; then
    echo "SKIP: $manifest (not found)"
    continue
  fi

  # Use sed to replace version strings in JSON
  # Matches "version": "x.y.z" patterns
  if sed -i "s/\"version\": *\"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/g" "$manifest"; then
    rel="${manifest#$ROOT/}"
    echo "  OK: $rel"
    UPDATED=$((UPDATED + 1))
  else
    rel="${manifest#$ROOT/}"
    echo "FAIL: $rel"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo "Version sync complete: $UPDATED updated, $FAILED failed"
echo "New version: $VERSION"

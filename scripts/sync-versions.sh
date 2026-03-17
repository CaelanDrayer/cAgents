#!/bin/bash
# Sync version across all cAgents manifest files
# Usage: ./scripts/sync-versions.sh <new-version>
#
# Updates version in all 14 locations (see .claude/rules/core/version-registry.md):
#   .claude-plugin/plugin.json, .claude-plugin/marketplace.json, package.json,
#   CLAUDE.md, .claude/settings.json, and 9 domain plugin.json files (core,
#   engineering, creative, business, growth, people, service, leadership, shared)

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
  "$ROOT/package.json"
  "$ROOT/core/.claude-plugin/plugin.json"
  "$ROOT/engineering/.claude-plugin/plugin.json"
  "$ROOT/creative/.claude-plugin/plugin.json"
  "$ROOT/business/.claude-plugin/plugin.json"
  "$ROOT/growth/.claude-plugin/plugin.json"
  "$ROOT/people/.claude-plugin/plugin.json"
  "$ROOT/service/.claude-plugin/plugin.json"
  "$ROOT/leadership/.claude-plugin/plugin.json"
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

# Update settings.json CAGENTS_VERSION and $comment version
SETTINGS="$ROOT/.claude/settings.json"
if [ -f "$SETTINGS" ]; then
  if sed -i "s/\"CAGENTS_VERSION\": *\"[0-9]*\.[0-9]*\.[0-9]*\"/\"CAGENTS_VERSION\": \"$VERSION\"/" "$SETTINGS" && \
     sed -i "s/cAgents V[0-9]*\.[0-9]*\.[0-9]*/cAgents V$VERSION/" "$SETTINGS"; then
    echo "  OK: .claude/settings.json"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: .claude/settings.json"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: .claude/settings.json (not found)"
fi

# Update CLAUDE.md Quick Reference version line
CLAUDEMD="$ROOT/CLAUDE.md"
if [ -f "$CLAUDEMD" ]; then
  if sed -i "s/\*\*Version\*\*: [0-9]*\.[0-9]*\.[0-9]*/\*\*Version\*\*: $VERSION/" "$CLAUDEMD"; then
    echo "  OK: CLAUDE.md"
    UPDATED=$((UPDATED + 1))
  else
    echo "FAIL: CLAUDE.md"
    FAILED=$((FAILED + 1))
  fi
else
  echo "SKIP: CLAUDE.md (not found)"
fi

echo ""
echo "Version sync complete: $UPDATED updated, $FAILED failed"
echo "New version: $VERSION"

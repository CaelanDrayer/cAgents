#!/bin/bash
# cAgents Update Check
# Checks if a newer version is available on GitHub
# Called by session-catchup.cjs on session start
# Caches results for 12 hours to avoid excessive API calls

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE_DIR="${HOME}/.cache/cagents"
CACHE_FILE="${CACHE_DIR}/update-check.json"
CACHE_TTL=43200  # 12 hours in seconds
CURRENT_VERSION=$(node -p "require('${ROOT}/package.json').version" 2>/dev/null || echo "unknown")

mkdir -p "$CACHE_DIR"

# Check cache
if [ -f "$CACHE_FILE" ]; then
  CACHE_AGE=$(( $(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0) ))
  if [ "$CACHE_AGE" -lt "$CACHE_TTL" ]; then
    # Cache is fresh, read cached result
    LATEST=$(node -p "JSON.parse(require('fs').readFileSync('${CACHE_FILE}','utf8')).latest || ''" 2>/dev/null || echo "")
    if [ -n "$LATEST" ] && [ "$LATEST" != "$CURRENT_VERSION" ]; then
      echo "cAgents update available: v${CURRENT_VERSION} -> v${LATEST}. Run: cd ${ROOT} && git pull"
    fi
    exit 0
  fi
fi

# Cache is stale or missing -- check GitHub (non-blocking)
LATEST=$(curl -sf --max-time 5 "https://raw.githubusercontent.com/CaelanDrayer/cAgents/main/package.json" 2>/dev/null | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).version" 2>/dev/null || echo "")

if [ -z "$LATEST" ]; then
  # Network error or parse error -- skip silently
  exit 0
fi

# Cache the result
echo "{\"latest\": \"${LATEST}\", \"current\": \"${CURRENT_VERSION}\", \"checked_at\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$CACHE_FILE"

if [ "$LATEST" != "$CURRENT_VERSION" ]; then
  echo "cAgents update available: v${CURRENT_VERSION} -> v${LATEST}. Run: cd ${ROOT} && git pull"
fi

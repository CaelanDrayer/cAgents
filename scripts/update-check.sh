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

# is_newer REMOTE LOCAL: exit 0 only when REMOTE > LOCAL as numeric semver
# (MAJOR.MINOR.PATCH, so 12.10.0 > 12.9.0). Any other form, or "unknown",
# exits 1, so a downgrade, an equal version or bad input prints nothing.
is_newer() {
  node -e '
    const m = (s) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(s);
    const r = m(process.argv[1]), l = m(process.argv[2]);
    if (!r || !l) process.exit(1);
    for (let i = 1; i <= 3; i++) {
      const a = Number(r[i]), b = Number(l[i]);
      if (a !== b) process.exit(a > b ? 0 : 1);
    }
    process.exit(1);
  ' "$1" "$2" 2>/dev/null
}

# Check cache
if [ -f "$CACHE_FILE" ]; then
  CACHE_AGE=$(( $(date +%s) - $(stat -c %Y "$CACHE_FILE" 2>/dev/null || stat -f %m "$CACHE_FILE" 2>/dev/null || echo 0) ))
  if [ "$CACHE_AGE" -lt "$CACHE_TTL" ]; then
    # Cache is fresh: compare the cached remote against the CURRENT local
    # version (not the version cached with it), so a local upgrade clears it.
    LATEST=$(node -p "JSON.parse(require('fs').readFileSync('${CACHE_FILE}','utf8')).latest || ''" 2>/dev/null || echo "")
    if [ -n "$LATEST" ] && is_newer "$LATEST" "$CURRENT_VERSION"; then
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

if is_newer "$LATEST" "$CURRENT_VERSION"; then
  echo "cAgents update available: v${CURRENT_VERSION} -> v${LATEST}. Run: cd ${ROOT} && git pull"
fi

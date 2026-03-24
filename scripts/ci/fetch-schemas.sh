#!/usr/bin/env bash
# fetch-schemas.sh — Copy AgentPath JSON Schema files into cAgents for contract testing
set -euo pipefail

SCHEMA_SRC="${AGENTPATH_SCHEMA_DIR:-../agentpath/packages/shared/dist/schemas/}"
SCHEMA_DEST="tests/schemas"

# Resolve relative to script's repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# Resolve source dir (handle relative paths from repo root)
if [[ "$SCHEMA_SRC" != /* ]]; then
  SCHEMA_SRC="$REPO_ROOT/$SCHEMA_SRC"
fi

if [[ ! -d "$SCHEMA_SRC" ]]; then
  echo "WARNING: AgentPath schema directory not found: $SCHEMA_SRC — contract tests will be skipped" >&2
  exit 0
fi

# Create destination
mkdir -p "$SCHEMA_DEST"

# Copy schema files
copied=0
failed=0

for f in "$SCHEMA_SRC"/*.schema.json; do
  [[ -e "$f" ]] || continue
  cp "$f" "$SCHEMA_DEST/"
  basename="$(basename "$f")"

  # Validate JSON
  if node -e "JSON.parse(require('fs').readFileSync('$SCHEMA_DEST/$basename','utf8'))" 2>/dev/null; then
    copied=$((copied + 1))
  else
    echo "WARNING: Invalid JSON in $basename" >&2
    rm -f "$SCHEMA_DEST/$basename"
    failed=$((failed + 1))
  fi
done

if [[ $copied -eq 0 ]]; then
  echo "WARNING: No schema files found in $SCHEMA_SRC — contract tests will be skipped" >&2
  exit 0
fi

echo "$copied schema files copied to $SCHEMA_DEST"
[[ $failed -gt 0 ]] && echo "$failed files skipped (invalid JSON)"
exit 0

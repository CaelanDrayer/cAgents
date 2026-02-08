#!/bin/bash
# Universal Node.js hook dispatcher
# Usage: hook-dispatch-node.sh <relative-hook-path>
set -o pipefail
trap 'echo "{\"continue\":true}"; exit 0' ERR
ROOT="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
if [ -z "$ROOT" ] || [ "$ROOT" = "/" ]; then echo '{"continue":true}'; exit 0; fi
HOOK="$ROOT/$1"
if [ -f "$HOOK" ]; then
  # Disable ERR trap for hook execution so non-zero exits are handled here
  # instead of producing extra JSON output from the ERR trap
  trap - ERR
  node "$HOOK"
  rc=$?
  trap 'echo "{\"continue\":true}"; exit 0' ERR
  # Exit 0: hook already emitted JSON (allow or deny via permissionDecision).
  # Exit 2: blocking error; stderr is used by Claude Code, skip fallback JSON.
  # Other non-zero: unexpected error; emit fallback JSON to keep Claude Code happy.
  if [ $rc -ne 0 ] && [ $rc -ne 2 ]; then echo '{"continue":true}'; fi
  exit $rc
else
  echo '{"continue":true}'
fi

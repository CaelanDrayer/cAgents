#!/bin/bash
# Universal Node.js hook dispatcher
# Usage: hook-dispatch-node.sh <relative-hook-path>
set -o pipefail
trap 'echo "{\"continue\":true}"; exit 0' ERR
ROOT="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
if [ -z "$ROOT" ] || [ "$ROOT" = "/" ]; then echo '{"continue":true}'; exit 0; fi
HOOK="$ROOT/$1"
if [ -f "$HOOK" ]; then
  # Disable ERR trap for hook execution so non-zero exits (e.g. exit 2 for
  # PreToolUse deny) are handled here instead of producing extra JSON output
  trap - ERR
  node "$HOOK"
  rc=$?
  trap 'echo "{\"continue\":true}"; exit 0' ERR
  # Exit code 2 means hook intentionally blocked (PreToolUse deny) -
  # the hook already emitted its own JSON, so do NOT emit a fallback.
  if [ $rc -ne 0 ] && [ $rc -ne 2 ]; then echo '{"continue":true}'; fi
  exit $rc
else
  echo '{"continue":true}'
fi

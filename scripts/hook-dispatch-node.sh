#!/bin/bash
# Universal Node.js hook dispatcher
# Usage: hook-dispatch-node.sh <relative-hook-path>
set -o pipefail
trap 'echo "{\"continue\":true}"; exit 0' ERR
ROOT="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
if [ -z "$ROOT" ] || [ "$ROOT" = "/" ]; then echo '{"continue":true}'; exit 0; fi
HOOK="$ROOT/$1"
if [ -f "$HOOK" ]; then node "$HOOK" || echo '{"continue":true}'; else echo '{"continue":true}'; fi

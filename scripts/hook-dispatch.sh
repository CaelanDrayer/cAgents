#!/bin/bash
# Universal shell hook dispatcher
# Usage: hook-dispatch.sh <relative-hook-path>
# Called from settings.json to simplify registration
set -o pipefail
ROOT="${CLAUDE_PLUGIN_ROOT:-${CLAUDE_PROJECT_DIR:-$(pwd)}}"
if [ -z "$ROOT" ] || [ "$ROOT" = "/" ]; then echo '{"continue":true}'; exit 0; fi
HOOK="$ROOT/$1"
if [ -f "$HOOK" ]; then "$HOOK"; else echo '{"continue":true}'; fi

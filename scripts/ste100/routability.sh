#!/usr/bin/env bash
# Deterministic agent-routability scorer + golden-baseline gate (WI-007).
#
#   routability.sh [golden.json]      -> "<case_id>\t<request>\t<selected_agent>" per case
#   routability.sh --check [golden]   -> DRIFT lines + summary; exit 1 on drift
#   routability.sh --derive           -> candidate case list as JSON (bootstrap path)
#
# Golden path precedence: $1 > $ROUTABILITY_GOLDEN > repo default.
# Output is byte-identical regardless of cwd: the repo root is resolved from this
# script's own location, never from $PWD.
set -euo pipefail
export LC_ALL=C

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export ROUTABILITY_REPO_ROOT="$REPO_ROOT"

exec node "$REPO_ROOT/scripts/ste100/routability.mjs" "$@"

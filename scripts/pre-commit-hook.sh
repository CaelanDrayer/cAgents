#!/usr/bin/env bash
# pre-commit-hook.sh — Git pre-commit hook for cAgents
#
# Runs lint-agents.sh and sync-agents.sh before each commit.
#
# Install:
#   bash scripts/pre-commit-hook.sh --install
#
# Or manually:
#   cp scripts/pre-commit-hook.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SCRIPT_DIR}/.."

# ── Install mode ────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--install" ]]; then
  TARGET="$ROOT/.git/hooks/pre-commit"
  if [[ ! -d "$ROOT/.git/hooks" ]]; then
    echo "ERROR: .git/hooks directory not found. Is this a git repository?" >&2
    exit 1
  fi
  if [[ -f "$TARGET" ]]; then
    echo "Backing up existing pre-commit hook to .git/hooks/pre-commit.bak"
    cp "$TARGET" "$TARGET.bak"
  fi
  cp "${BASH_SOURCE[0]}" "$TARGET"
  chmod +x "$TARGET"
  echo "✓ Pre-commit hook installed at .git/hooks/pre-commit"
  echo "  Runs: lint-agents.sh (if present), sync-agents.sh (if present)"
  exit 0
fi

# ── Hook execution (called by git) ──────────────────────────────────────────
# Resolve root relative to hook location (.git/hooks/pre-commit -> repo root)
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Handle both: called as scripts/pre-commit-hook.sh OR as .git/hooks/pre-commit
if [[ "$HOOK_DIR" == *"/.git/hooks" ]]; then
  ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
elif [[ "$HOOK_DIR" == *"/scripts" ]]; then
  ROOT="$(cd "$HOOK_DIR/.." && pwd)"
else
  ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

LINT_SCRIPT="$ROOT/scripts/lint-agents.sh"
SYNC_SCRIPT="$ROOT/scripts/sync-agents.sh"

echo "[pre-commit] cAgents pre-commit checks"

# ── Step 1: Lint agents ──────────────────────────────────────────────────────
if [[ -f "$LINT_SCRIPT" ]]; then
  echo "[pre-commit] Running lint-agents.sh --quiet ..."
  if ! bash "$LINT_SCRIPT" --quiet; then
    echo ""
    echo "ERROR: lint-agents.sh found issues. Fix them before committing." >&2
    echo "       Run 'bash scripts/lint-agents.sh' for details." >&2
    exit 1
  fi
  echo "[pre-commit] ✓ lint-agents.sh passed"
else
  echo "[pre-commit] ⚠ lint-agents.sh not found — skipping agent lint"
fi

# ── Step 2: Sync agents ──────────────────────────────────────────────────────
if [[ -f "$SYNC_SCRIPT" ]]; then
  echo "[pre-commit] Running sync-agents.sh ..."
  if ! bash "$SYNC_SCRIPT"; then
    echo ""
    echo "ERROR: sync-agents.sh failed. See output above." >&2
    exit 1
  fi
  echo "[pre-commit] ✓ sync-agents.sh completed"

  # Stage plugin.json if it was modified by sync-agents.sh
  PLUGIN_JSON="$ROOT/.claude-plugin/plugin.json"
  if [[ -f "$PLUGIN_JSON" ]]; then
    if ! git -C "$ROOT" diff --quiet -- ".claude-plugin/plugin.json" 2>/dev/null; then
      echo "[pre-commit] Staging updated .claude-plugin/plugin.json"
      git -C "$ROOT" add ".claude-plugin/plugin.json"
    fi
  fi
  # Also stage domain plugin.json files if they changed
  while IFS= read -r changed_file; do
    if [[ "$changed_file" == *".claude-plugin/plugin.json" ]]; then
      echo "[pre-commit] Staging $changed_file"
      git -C "$ROOT" add "$changed_file"
    fi
  done < <(git -C "$ROOT" diff --name-only 2>/dev/null)
else
  echo "[pre-commit] ⚠ sync-agents.sh not found — skipping plugin.json sync"
fi

echo "[pre-commit] ✓ All checks passed"
exit 0

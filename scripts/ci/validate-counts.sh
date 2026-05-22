#!/usr/bin/env bash
# scripts/ci/validate-counts.sh
#
# Counts-derivation CI guard (P1-5).
#
# Derives canonical counts from disk and compares against documented values
# in CLAUDE.md, README.md, .claude/settings.json, .claude/rules/core/hooks.md,
# .claude/rules/core/version-registry.md, docs/agents/index.md, and
# docs/12-FACTOR-COMPLIANCE.md. Exits 0 if all counts match, exits 1 with the
# offending file + claimed-vs-derived diff on first mismatch.
#
# Usage:
#   bash scripts/ci/validate-counts.sh           # full check
#   bash scripts/ci/validate-counts.sh --derive-only   # print counts and exit 0
#
# Version: cAgents v12.7.0

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# ---- Derivation -------------------------------------------------------------
# Active agent entries in plugin.json (post-v12.4.0 P2 compression: 144).
ACTIVE_AGENTS=$(jq -r '.agents | length' .claude-plugin/plugin.json)

# Per-archetype SKILL.md counts (excluding _deprecated/ buckets).
declare -A ARCH_COUNTS
for arch in developer operator advisor analyst creator writer strategist core leadership; do
  if [ -d "$arch" ]; then
    ARCH_COUNTS[$arch]=$(find "$arch" -name "SKILL.md" -not -path "*/_deprecated/*" 2>/dev/null | wc -l | tr -d ' ')
  else
    ARCH_COUNTS[$arch]=0
  fi
done

# Hook file count (.cjs files including utilities and launcher).
# Count working-tree files — this matches what the user sees on disk.
HOOK_FILES=$(ls .claude/hooks/*.cjs 2>/dev/null | wc -l | tr -d ' ')

# Unique registered hook names referenced in working-tree .claude/settings.json.
REGISTERED_HOOKS=$(jq -r '[.. | objects | .command? // empty] | map(select(. != null)) | .[]' .claude/settings.json \
  | grep -E "run-hook" \
  | sed -E 's/.*run-hook\.cjs[^a-z]*([a-z-]+).*/\1/' \
  | sort -u | wc -l | tr -d ' ')

# Distinct hook event types in .claude/settings.json.
EVENT_TYPES=$(jq -r '.hooks | keys | length' .claude/settings.json)

# Version-registry table rows (lines matching `| <N> | ...`).
REGISTRY_SLOTS=$(grep -cE "^\| [0-9]+ \|" .claude/rules/core/version-registry.md)

# Print derived values in a parseable form.
print_derived() {
  echo "active_agents=$ACTIVE_AGENTS"
  for arch in developer operator advisor analyst creator writer strategist core leadership; do
    echo "archetype_${arch}=${ARCH_COUNTS[$arch]}"
  done
  echo "hook_files=$HOOK_FILES"
  echo "registered_hooks=$REGISTERED_HOOKS"
  echo "event_types=$EVENT_TYPES"
  echo "registry_slots=$REGISTRY_SLOTS"
}

if [ "${1:-}" = "--derive-only" ]; then
  print_derived
  exit 0
fi

# ---- Comparison -------------------------------------------------------------
# Each check: search a file for a pattern that should contain the derived
# count. If the pattern is NOT found, report mismatch with the offending file.
# Anti-pattern files (CHANGELOG.md, RELEASE_NOTES*.md, docs/MIGRATION-V*,
# archive/, cagents-memory/_archive/) are excluded.
MISMATCHES=0

report_mismatch() {
  local file="$1"
  local claim="$2"
  local derived="$3"
  echo "MISMATCH: $file claims '$claim' but disk says '$derived'" >&2
  MISMATCHES=$((MISMATCHES + 1))
}

# Check 1: CLAUDE.md must say "144 agents" matching derived ACTIVE_AGENTS.
# This is the load-bearing count appearing in the Project Overview, Quick
# Reference, and Plugin Architecture sections.
if ! grep -qE "\b${ACTIVE_AGENTS} agents\b" CLAUDE.md; then
  report_mismatch "CLAUDE.md" "agent count" "$ACTIVE_AGENTS"
fi

# Check 2: README.md should agree if it claims a total agent count.
if grep -qE "\b[0-9]+ agents\b" README.md 2>/dev/null; then
  if ! grep -qE "\b${ACTIVE_AGENTS} agents\b" README.md; then
    actual=$(grep -oE "\b[0-9]+ agents\b" README.md | head -1)
    report_mismatch "README.md" "$actual" "$ACTIVE_AGENTS agents"
  fi
fi

# Check 3: .claude/settings.json $comment field hook counts.
# Pattern: "31 .cjs files = 28 unique registered hooks ... 17 event types"
SETTINGS_COMMENT=$(jq -r '."$comment" // empty' .claude/settings.json)
if [ -n "$SETTINGS_COMMENT" ]; then
  if ! echo "$SETTINGS_COMMENT" | grep -qE "\b${HOOK_FILES}\b.*\b${REGISTERED_HOOKS}\b"; then
    report_mismatch ".claude/settings.json" "\$comment hook counts" \
      "$HOOK_FILES files / $REGISTERED_HOOKS unique"
  fi
fi

# Check 4: .claude/rules/core/hooks.md mentions both 31 .cjs and 28 unique.
if ! grep -qE "${HOOK_FILES} .cjs files? .*${REGISTERED_HOOKS} unique" .claude/rules/core/hooks.md; then
  # Fallback: looser check
  if ! grep -qE "\b${HOOK_FILES}\b" .claude/rules/core/hooks.md \
       || ! grep -qE "\b${REGISTERED_HOOKS}\b" .claude/rules/core/hooks.md; then
    report_mismatch ".claude/rules/core/hooks.md" "hook counts" \
      "$HOOK_FILES files / $REGISTERED_HOOKS unique"
  fi
fi

# Check 5: hooks.md mentions event-type count.
if ! grep -qE "\b${EVENT_TYPES}\b" .claude/rules/core/hooks.md; then
  report_mismatch ".claude/rules/core/hooks.md" "event-type count" \
    "$EVENT_TYPES events"
fi

# Check 6: version-registry.md slot count (must say "16 total" or "16 locations").
if ! grep -qE "\b${REGISTRY_SLOTS}\b (total|locations|registry|slots)" .claude/rules/core/version-registry.md; then
  if ! grep -qE "## Version Locations \(${REGISTRY_SLOTS} total\)" .claude/rules/core/version-registry.md; then
    report_mismatch ".claude/rules/core/version-registry.md" "slot count" \
      "$REGISTRY_SLOTS slots"
  fi
fi

# Check 7: docs/agents/index.md per-archetype counts.
# The legacy domain sections (Engineering/Creative/Business/etc.) are NOT
# checked — they're routing-overlay groupings. Only the canonical 9-archetype
# summary line is validated.
if [ -f docs/agents/index.md ]; then
  for arch in developer operator advisor analyst creator writer strategist core leadership; do
    count=${ARCH_COUNTS[$arch]}
    # Check summary line which should list "{archetype} {count}"
    if ! grep -qE "${arch} ${count}" docs/agents/index.md 2>/dev/null; then
      # Allow non-summary mentions; only report if the 9-archetype summary doesn't match
      if grep -qE "9 builder-role archetypes \(" docs/agents/index.md && \
         ! grep -qE "${arch} ${count}" docs/agents/index.md; then
        report_mismatch "docs/agents/index.md" "${arch} count" "${arch} ${count}"
      fi
    fi
  done

  # Specifically: People section must say "0 — config-only" (people/ has no SKILL.md).
  if grep -qE "^## People \([0-9]+ agents?\)" docs/agents/index.md; then
    report_mismatch "docs/agents/index.md" "People (N agents)" \
      "0 — config-only (people/ has no SKILL.md files)"
  fi
fi

# Check 8: docs/12-FACTOR-COMPLIANCE.md total agent count.
if [ -f docs/12-FACTOR-COMPLIANCE.md ]; then
  # The doc should mention "144 agents" matching ACTIVE_AGENTS.
  # We're permissive: it may say "144 agents across 9 archetypes" or similar.
  if grep -qE "[0-9]+ agents across" docs/12-FACTOR-COMPLIANCE.md && \
     ! grep -qE "\b${ACTIVE_AGENTS} agents\b" docs/12-FACTOR-COMPLIANCE.md; then
    actual=$(grep -oE "[0-9]+ agents across" docs/12-FACTOR-COMPLIANCE.md | head -1 | grep -oE "[0-9]+")
    report_mismatch "docs/12-FACTOR-COMPLIANCE.md" "$actual agents" \
      "$ACTIVE_AGENTS agents (post-v12.4.0)"
  fi
fi

# ---- Result ----------------------------------------------------------------
if [ "$MISMATCHES" -gt 0 ]; then
  echo "" >&2
  echo "validate-counts.sh: $MISMATCHES mismatch(es) found. Derived counts:" >&2
  print_derived | sed 's/^/  /' >&2
  exit 1
fi

# Success: optionally print derived counts.
if [ "${VERBOSE:-0}" = "1" ]; then
  print_derived
fi

exit 0

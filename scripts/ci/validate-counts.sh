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
# Version: cAgents v12.31.0 (all counts are derived dynamically from disk;
#          this stamp is informational, not load-bearing)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

# ---- Derivation -------------------------------------------------------------
# Active agent entries in plugin.json (derived dynamically; currently 57 after the
# post-v12.20.0 catalog consolidation — do NOT hardcode, jq reads it live).
ACTIVE_AGENTS=$(jq -r '.agents | length' .claude-plugin/plugin.json)

# Per-archetype SKILL.md counts (excluding _deprecated/ buckets).
declare -A ARCH_COUNTS
for arch in developer operator advisor analyst creator writer strategist core leadership; do
  if [ -d "agents/$arch" ]; then
    ARCH_COUNTS[$arch]=$(find "agents/$arch" -name "SKILL.md" -not -path "*/_deprecated/*" 2>/dev/null | wc -l | tr -d ' ')
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

# Total .md files under .claude/rules (the CLAUDE.md "rules total" claim).
# Exclude .claude/rules/examples/** — the example store is a distinct concept
# (curated few-shot exemplars: ex-*.md + README + _index.yaml), NOT rule files,
# and must not inflate the "40 rules" invariant.
RULES_MD=$(find .claude/rules -name '*.md' -type f -not -path '*/examples/*' | wc -l | tr -d ' ')

# Playbook .md files (currently 8 pat-* + README = 9) — the CLAUDE.md playbooks claim.
PLAYBOOK_FILES=$(ls .claude/rules/playbooks/*.md 2>/dev/null | wc -l | tr -d ' ')

# Pre-execution validation checks (### Check N headings in the checklist).
# This is the count cited as "Pre-Execution (N checks)" in controllers.md.
PREEXEC_CHECKS=$(grep -cE "^### Check [0-9]" .claude/rules/core/resources/controller-validation-checklist.md)

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
  echo "rules_md=$RULES_MD"
  echo "playbook_files=$PLAYBOOK_FILES"
  echo "preexec_checks=$PREEXEC_CHECKS"
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

# Check 1: CLAUDE.md must say "<ACTIVE_AGENTS> agents" (derived from plugin.json;
# currently 57) matching derived ACTIVE_AGENTS. This is the load-bearing count
# appearing in the Project Overview, Quick Reference, and Plugin Architecture sections.
#
# Test-friendly override: CAGENTS_VALIDATE_COUNTS_CLAUDE_MD lets the
# doc-counts-match-disk.test.js mutation test point Check 1 at a temp-dir
# copy of CLAUDE.md, eliminating the parallel-test race against
# claude-md-counts-current.test.js / claude-md-domain-overrides-count.test.js
# / claude-md-no-stale-version-highlights.test.js which read the real
# CLAUDE.md while the mutation test would otherwise rewrite it in place.
# Production callers do NOT set this env var; the default path (CLAUDE.md
# in REPO_ROOT) is unchanged. See WI-1 in v12.12.1.
CLAUDE_MD_PATH="${CAGENTS_VALIDATE_COUNTS_CLAUDE_MD:-CLAUDE.md}"
if ! grep -qE "\b${ACTIVE_AGENTS} agents\b" "$CLAUDE_MD_PATH"; then
  report_mismatch "$CLAUDE_MD_PATH" "agent count" "$ACTIVE_AGENTS"
fi

# Check 2: README.md should agree if it claims a total agent count.
if grep -qE "\b[0-9]+ agents\b" README.md 2>/dev/null; then
  if ! grep -qE "\b${ACTIVE_AGENTS} agents\b" README.md; then
    actual=$(grep -oE "\b[0-9]+ agents\b" README.md | head -1)
    report_mismatch "README.md" "$actual" "$ACTIVE_AGENTS agents"
  fi
fi

# Check 2b (F-14 hardening): ABSENCE check for stale agent-TOTAL phrasings in
# README's live sections. Check 2 above is a PRESENCE check — it passes as long
# as the correct count appears once, so stale DUPLICATE totals (e.g.
# "238 specialized agents") slipped through historically while CI stayed green.
# Here we scan only the portion of README BEFORE "## Version History" (release
# notes there legitimately cite past totals such as 251->238) and FAIL if any
# agent-total phrasing cites a number other than ACTIVE_AGENTS. Deliberately
# targeted to the three agent-total phrasings README uses — does NOT touch
# hook/slot/routing-overlay numbers (those are guarded elsewhere / are not
# agent totals), keeping it non-brittle.
readme_live="$(sed '/^## Version History/,$d' README.md)"
stale_totals="$(printf '%s\n' "$readme_live" \
  | grep -oE "[0-9]+ (specialized agents|across 9 archetypes|specialists)" \
  | grep -vE "^${ACTIVE_AGENTS} " || true)"
if [ -n "$stale_totals" ]; then
  while IFS= read -r phrase; do
    [ -z "$phrase" ] && continue
    report_mismatch "README.md (live section, F-14 absence check)" "$phrase" \
      "$ACTIVE_AGENTS (agent total)"
  done <<< "$stale_totals"
fi

# Check 3: .claude/settings.json $comment field hook counts.
# Pattern: "32 .cjs files = 24 unique registered hooks ... 18 event types"
SETTINGS_COMMENT=$(jq -r '."$comment" // empty' .claude/settings.json)
if [ -n "$SETTINGS_COMMENT" ]; then
  if ! echo "$SETTINGS_COMMENT" | grep -qE "\b${HOOK_FILES}\b.*\b${REGISTERED_HOOKS}\b"; then
    report_mismatch ".claude/settings.json" "\$comment hook counts" \
      "$HOOK_FILES files / $REGISTERED_HOOKS unique"
  fi
fi

# Check 4: .claude/rules/core/hooks.md mentions both 32 .cjs and 24 unique.
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
  # The doc should mention "<ACTIVE_AGENTS> agents" (currently 57) matching ACTIVE_AGENTS.
  # We're permissive: it may say "144 agents across 9 archetypes" or similar.
  if grep -qE "[0-9]+ agents across" docs/12-FACTOR-COMPLIANCE.md && \
     ! grep -qE "\b${ACTIVE_AGENTS} agents\b" docs/12-FACTOR-COMPLIANCE.md; then
    actual=$(grep -oE "[0-9]+ agents across" docs/12-FACTOR-COMPLIANCE.md | head -1 | grep -oE "[0-9]+")
    report_mismatch "docs/12-FACTOR-COMPLIANCE.md" "$actual agents" \
      "$ACTIVE_AGENTS agents (post-v12.4.0)"
  fi
fi

# Check 9 (F1-5): CLAUDE.md rules-file total must match disk.
# Closes the counts-guard coverage hole — CLAUDE.md cites the rules total in
# two places (the rules-tree summary "Total: N .md" and the directory-structure
# comment "Modular rules (N files...)"). Both must agree with the derived count.
if ! grep -qE "Total: ${RULES_MD} \.md" "$CLAUDE_MD_PATH"; then
  actual=$(grep -oE "Total: [0-9]+ \.md" "$CLAUDE_MD_PATH" | head -1)
  report_mismatch "$CLAUDE_MD_PATH" "${actual:-rules total}" "Total: $RULES_MD .md"
fi
if ! grep -qE "Modular rules \(${RULES_MD} files" "$CLAUDE_MD_PATH"; then
  actual=$(grep -oE "Modular rules \([0-9]+ files" "$CLAUDE_MD_PATH" | head -1)
  report_mismatch "$CLAUDE_MD_PATH" "${actual:-Modular rules (N files}" \
    "Modular rules ($RULES_MD files"
fi

# Check 10 (F1-5): CLAUDE.md playbooks count must match disk.
# CLAUDE.md describes the playbooks dir as "pat-* reusable patterns (... N files)".
if ! grep -qE "pat-\* reusable patterns \(.*${PLAYBOOK_FILES} files\)" "$CLAUDE_MD_PATH"; then
  actual=$(grep -oE "pat-\* reusable patterns \([^)]*\)" "$CLAUDE_MD_PATH" | head -1)
  report_mismatch "$CLAUDE_MD_PATH" "${actual:-playbooks count}" \
    "pat-* reusable patterns (... $PLAYBOOK_FILES files)"
fi

# Check 11 (F8-1): controllers.md pre-execution check count must match the
# number of "### Check N" headings in the checklist resource.
# (Markdown bold `**Pre-Execution**` may sit between the label and the count,
# so match flexibly up to the opening paren.)
if ! grep -qE "Pre-Execution[^(]*\(${PREEXEC_CHECKS} checks\)" .claude/rules/core/controllers.md; then
  actual=$(grep -oE "Pre-Execution[^(]*\([0-9]+ checks\)" .claude/rules/core/controllers.md | head -1)
  report_mismatch ".claude/rules/core/controllers.md" "${actual:-Pre-Execution (N checks)}" \
    "Pre-Execution ($PREEXEC_CHECKS checks)"
fi

# Check 12 (T4, action-report): docs/ live-section ABSENCE check for a STALE
# CURRENT agent total. Checks 7/8 above are presence-only and scoped to two
# specific docs, so a stale current count ("144 agents") in another docs/ live
# section slipped through while CI stayed green. This generalizes the Check 2b
# README absence pattern to docs/.
#
# The canonical ways docs state the LIVE catalog size are:
#   - "<N> [specialized ]agents across 9 [builder-role ]archetypes"
#   - "Total: <N> agents"
# Legitimate HISTORICAL mentions use different phrasings that these anchors
# never match ("consolidation from 144", "240 -> 144 agents", "was 144
# post-v12.4.0", "~95 of 144 agents"), so history is not flagged. Release-notes,
# changelog, and migration files are excluded wholesale (they legitimately cite
# past totals). FAIL if any current-total phrasing cites a number other than
# ACTIVE_AGENTS.
#
# Test-friendly override: CAGENTS_VALIDATE_COUNTS_DOCS_DIR lets the
# doc-counts-match-disk.test.js mutation test point Check 12 at a temp-dir copy
# of docs/, eliminating any in-place mutation of the real tree (mirrors the
# CAGENTS_VALIDATE_COUNTS_CLAUDE_MD pattern from Check 1). Production callers do
# NOT set it; the default scan path (docs/ in REPO_ROOT) is unchanged.
DOCS_DIR="${CAGENTS_VALIDATE_COUNTS_DOCS_DIR:-docs}"
docs_stale_current="$(grep -rnE "([0-9]+ (specialized )?agents across 9|Total: [0-9]+ agents)" "$DOCS_DIR/" 2>/dev/null \
  | grep -vE "(CHANGELOG|RELEASE_NOTES|MIGRATION|migration/)" \
  | grep -oE "([0-9]+ (specialized )?agents across 9|Total: [0-9]+ agents)" \
  | grep -vE "(^${ACTIVE_AGENTS} |: ${ACTIVE_AGENTS} )" || true)"
if [ -n "$docs_stale_current" ]; then
  while IFS= read -r phrase; do
    [ -z "$phrase" ] && continue
    report_mismatch "docs/ (live section, current-total absence check)" "$phrase" \
      "$ACTIVE_AGENTS (agent total)"
  done <<< "$docs_stale_current"
fi

# Check 13 (P2 / A7-03): CLAUDE.md ABSENCE check for a STALE CURRENT agent total.
# Check 1 above is presence-only — it passes as long as the correct "57 agents"
# appears once, so a stale DUPLICATE current-total in CLAUDE.md (the historical
# "Total agents: 251 -> 240" drift class flagged by A7-03) slipped through while CI
# stayed green. This mirrors the Check 2b (README) and Check 12 (docs/) absence
# guards, applied to the most-read file.
#
# Canonical CLAUDE.md current-total phrasings:
#   "<N> agents across 9 [builder-role ]archetypes"  /  "<N> total across 9 archetypes"
#   "Total: <N> agents"  /  "Total agents: <N>"
# Legitimate HISTORICAL mentions carry an "N -> M" transition arrow ("251 -> 240",
# "240 -> 144"), excluded line-wise. FAIL if any current-total phrasing cites a
# number other than ACTIVE_AGENTS. Honors the CAGENTS_VALIDATE_COUNTS_CLAUDE_MD
# override (same temp-file path as Check 1) so the mutation test stays race-free.
claude_stale_total="$(grep -E "([0-9]+ agents across 9|[0-9]+ total across 9 archetypes|Total: [0-9]+ agents|Total agents: [0-9]+)" "$CLAUDE_MD_PATH" 2>/dev/null \
  | grep -vE "(->|→)" \
  | grep -oE "([0-9]+ agents across 9|[0-9]+ total across 9 archetypes|Total: [0-9]+ agents|Total agents: [0-9]+)" \
  | grep -vE "(^${ACTIVE_AGENTS} |: ${ACTIVE_AGENTS}\b)" || true)"
if [ -n "$claude_stale_total" ]; then
  while IFS= read -r phrase; do
    [ -z "$phrase" ] && continue
    report_mismatch "$CLAUDE_MD_PATH (CLAUDE.md agent-total absence check)" "$phrase" \
      "$ACTIVE_AGENTS (agent total)"
  done <<< "$claude_stale_total"
fi

# Check 14 (WI-6): AGENTS.md agent-total + per-archetype counts must match disk.
# AGENTS.md is the multi-tool routing guide at the repo root. Its "Agent Catalog"
# header states the total ("58 agents across 9 archetypes") and each archetype
# line states a per-archetype count ("`developer/` (8)"). Both are compared
# against the canonical values already derived above: ACTIVE_AGENTS (from
# plugin.json) for the total, and ARCH_COUNTS (find-based SKILL.md counts,
# _deprecated excluded) for each archetype — so AGENTS.md is tied to BOTH
# plugin.json and the on-disk SKILL.md tree. Presence checks, mirroring Check 7
# (docs/agents/index.md). Guarded by [ -f AGENTS.md ] so it no-ops if the file
# is ever removed.
if [ -f AGENTS.md ]; then
  # Total: AGENTS.md must state "<ACTIVE_AGENTS> agents".
  if ! grep -qE "\b${ACTIVE_AGENTS} agents\b" AGENTS.md; then
    actual=$(grep -oE "\b[0-9]+ agents\b" AGENTS.md | head -1)
    report_mismatch "AGENTS.md" "${actual:-agent total}" "$ACTIVE_AGENTS agents"
  fi
  # Per-archetype: AGENTS.md must state "`<arch>/` (<count>)" for each archetype.
  for arch in developer operator advisor analyst creator writer strategist core leadership; do
    count=${ARCH_COUNTS[$arch]}
    if ! grep -qE "\`${arch}/\` \(${count}\)" AGENTS.md; then
      actual=$(grep -oE "\`${arch}/\` \([0-9]+\)" AGENTS.md | head -1)
      report_mismatch "AGENTS.md" "${actual:-${arch} count}" "\`${arch}/\` (${count})"
    fi
  done
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

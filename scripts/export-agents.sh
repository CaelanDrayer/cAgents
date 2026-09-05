#!/usr/bin/env bash
# export-agents.sh - Convert cAgents SKILL.md files to formats for other AI tools
# V10.18.0
#
# Usage:
#   ./scripts/export-agents.sh --format cursor|markdown|bundle --output dist/
#   ./scripts/export-agents.sh --format cursor --output dist/cursor --domain developer
#   ./scripts/export-agents.sh --format markdown --output dist/md --tier execution
#   ./scripts/export-agents.sh --list  # List all agents without exporting
#
# Formats:
#   cursor   - Cursor rules (.mdc files) with frontmatter stripped
#   markdown - Generic markdown (agency-agents compatible) with unified format
#   bundle   - Bare agent bundle (all agents concatenated per archetype)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Defaults
FORMAT=""
OUTPUT_DIR=""
DOMAIN_FILTER=""
TIER_FILTER=""
LIST_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --format) FORMAT="$2"; shift 2 ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    --domain) DOMAIN_FILTER="$2"; shift 2 ;;
    --tier)   TIER_FILTER="$2"; shift 2 ;;
    --list)   LIST_ONLY=true; shift ;;
    -h|--help)
      echo "Usage: $0 --format cursor|markdown|bundle --output <dir> [--domain <domain>] [--tier <tier>]"
      echo "       $0 --list"
      echo ""
      echo "Formats:"
      echo "  cursor   - Cursor rules (.mdc files)"
      echo "  markdown - Generic markdown (agency-agents compatible)"
      echo "  bundle   - Bare agent bundle per archetype"
      echo ""
      echo "Options:"
      echo "  --domain <name>    Filter by archetype (developer, operator, analyst, ...)"
      echo "  --tier <tier>      Filter by tier (controller, execution, support)"
      echo "  --list             List all agents without exporting"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate arguments
if ! $LIST_ONLY; then
  if [[ -z "$FORMAT" ]]; then
    echo "Error: --format is required (cursor|markdown|bundle)" >&2
    exit 1
  fi
  if [[ -z "$OUTPUT_DIR" ]]; then
    echo "Error: --output is required" >&2
    exit 1
  fi
  if [[ "$FORMAT" != "cursor" && "$FORMAT" != "markdown" && "$FORMAT" != "bundle" ]]; then
    echo "Error: --format must be cursor, markdown, or bundle" >&2
    exit 1
  fi
fi

# v12.68.0: agent definitions are flat — agents/<name>.md (Claude Code discovers
# plugin agents with a non-recursive scan of agents/). Grouping is by the
# `archetype:` frontmatter field, which replaced the per-domain directories.
ARCHETYPES=(developer operator advisor analyst creator writer strategist core leadership)

# Grouping key for an agent: `archetype:` (v11.1.0+), falling back to the
# legacy top-level `domain:` so an old-schema file still groups somewhere.
extract_group() {
  local file="$1" value
  value=$(extract_field "$file" "archetype")
  [[ -z "$value" ]] && value=$(extract_field "$file" "domain")
  echo "$value"
}

# Find all agent definition files
find_agents() {
  find "$PROJECT_ROOT/agents" -maxdepth 1 -name "*.md" -type f 2>/dev/null | sort
}

# Extract frontmatter field value
# Checks top-level AND inside metadata: block (Agent Skills spec migration)
extract_field() {
  local file="$1"
  local field="$2"
  local fm
  fm=$(awk '/^---$/{n++; next} n==1{print}' "$file")
  # Try top-level first: ^field:
  local val
  val=$(echo "$fm" | grep "^${field}:" | head -1 | sed "s/^${field}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//')
  if [[ -z "$val" ]]; then
    # Try inside metadata: block (2-space indent): ^  field:
    val=$(echo "$fm" | grep "^  ${field}:" | head -1 | sed "s/^  ${field}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//')
  fi
  echo "$val"
}

# Extract body (everything after second ---)
extract_body() {
  local file="$1"
  awk 'BEGIN{n=0} /^---$/{n++; next} n>=2{print}' "$file"
}

# Strip cAgents-specific frontmatter fields, keep universal ones
# After migration, cAgents fields live inside metadata: - strip the whole block
strip_frontmatter() {
  local file="$1"
  awk '/^---$/{n++; if(n==1){print; next} if(n==2){print; next}} n==1{
    # Skip top-level cAgents-specific fields (pre-migration compat)
    if ($0 ~ /^(tier|domain|coordination_style|typical_questions|permissionMode|maxTurns|disallowedTools|related-agents|not-my-scope|related_agents|layer|color|memory|vibe|effort|capabilities):/) next
    # Skip metadata: block (post-migration: metadata and all its indented content)
    if ($0 ~ /^metadata:/) { skip_meta=1; next }
    if (skip_meta && $0 ~ /^  /) { next }
    if (skip_meta && $0 !~ /^  /) { skip_meta=0 }
    # Keep universal fields (name, description, allowed-tools, license, compatibility)
    print
  } n>=2{print}' "$file"
}

# List mode
if $LIST_ONLY; then
  echo "# cAgents Agent Catalog"
  echo ""
  printf "%-30s %-15s %-12s %s\n" "NAME" "DOMAIN" "TIER" "DESCRIPTION"
  printf "%-30s %-15s %-12s %s\n" "----" "------" "----" "-----------"
  while IFS= read -r file; do
    name=$(extract_field "$file" "name")
    domain=$(extract_group "$file")
    tier=$(extract_field "$file" "tier")
    desc=$(extract_field "$file" "description" | cut -c1-60)
    printf "%-30s %-15s %-12s %s\n" "$name" "$domain" "$tier" "$desc"
  done < <(find_agents)
  echo ""
  echo "Total: $(find_agents | wc -l) agents"
  exit 0
fi

# Apply filters
filter_agent() {
  local file="$1"
  if [[ -n "$DOMAIN_FILTER" ]]; then
    local domain=$(extract_group "$file")
    [[ "$domain" == "$DOMAIN_FILTER" ]] || return 1
  fi
  if [[ -n "$TIER_FILTER" ]]; then
    local tier=$(extract_field "$file" "tier")
    [[ "$tier" == "$TIER_FILTER" ]] || return 1
  fi
  return 0
}

# Export functions
export_cursor() {
  local file="$1"
  local name=$(extract_field "$file" "name")
  local domain=$(extract_group "$file")
  local desc=$(extract_field "$file" "description")
  local body=$(extract_body "$file")

  local out_dir="$OUTPUT_DIR/$domain"
  mkdir -p "$out_dir"
  local out_file="$out_dir/${name}.mdc"

  cat > "$out_file" << EOF
---
description: ${desc}
globs:
alwaysApply: false
---

${body}
EOF
  echo "  -> $out_file"
}

export_markdown() {
  local file="$1"
  local name=$(extract_field "$file" "name")
  local domain=$(extract_group "$file")
  local tier=$(extract_field "$file" "tier")
  local desc=$(extract_field "$file" "description")
  local vibe=$(extract_field "$file" "vibe")
  local body=$(extract_body "$file")

  local out_dir="$OUTPUT_DIR/$domain"
  mkdir -p "$out_dir"
  local out_file="$out_dir/${name}.md"

  {
    echo "# ${name}"
    echo ""
    if [[ -n "$desc" ]]; then
      echo "> ${desc}"
      echo ""
    fi
    if [[ -n "$vibe" ]]; then
      echo "_${vibe}_"
      echo ""
    fi
    echo "**Domain**: ${domain} | **Role**: ${tier}"
    echo ""
    echo "$body"
  } > "$out_file"
  echo "  -> $out_file"
}

export_bundle() {
  local file="$1"
  local domain=$(extract_group "$file")
  local name=$(extract_field "$file" "name")

  local out_dir="$OUTPUT_DIR"
  mkdir -p "$out_dir"
  local out_file="$out_dir/${domain}-agents.md"

  {
    echo ""
    echo "---"
    echo ""
    strip_frontmatter "$file"
  } >> "$out_file"
}

# Main export
mkdir -p "$OUTPUT_DIR"
count=0

echo "Exporting agents (format: $FORMAT) to $OUTPUT_DIR/"
echo ""

# For bundle format, initialize domain files
if [[ "$FORMAT" == "bundle" ]]; then
  for domain in "${ARCHETYPES[@]}"; do
    local_file="$OUTPUT_DIR/${domain}-agents.md"
    if [[ -n "$DOMAIN_FILTER" && "$domain" != "$DOMAIN_FILTER" ]]; then
      continue
    fi
    echo "# ${domain^} Archetype Agents" > "$local_file"
    echo "" >> "$local_file"
    echo "Auto-generated bundle of all ${domain} archetype agent definitions." >> "$local_file"
  done
fi

while IFS= read -r file; do
  if filter_agent "$file"; then
    case "$FORMAT" in
      cursor)   export_cursor "$file" ;;
      markdown) export_markdown "$file" ;;
      bundle)   export_bundle "$file" ;;
    esac
    # NOTE: `((count++))` returns the PRE-increment value, so the first
    # increment (0) is a non-zero exit status and `set -e` would abort the
    # loop after exactly one agent. Use arithmetic assignment instead.
    count=$((count + 1))
  fi
done < <(find_agents)

echo ""
echo "Exported $count agents in $FORMAT format to $OUTPUT_DIR/"

#!/usr/bin/env bash
# generate-catalog.sh - Generate agent_catalog.csv from all SKILL.md files
# Part of cAgents V10.6.0
# Usage: bash scripts/generate-catalog.sh [--output path/to/output.csv]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

OUTPUT_FILE="${ROOT_DIR}/agent_catalog.csv"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      OUTPUT_FILE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: bash scripts/generate-catalog.sh [--output path/to/output.csv]"
      echo ""
      echo "Generates a CSV catalog of all cAgents agents from SKILL.md frontmatter."
      echo "Default output: agent_catalog.csv in project root."
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# CSV header
echo "name,domain,tier,model,description,capabilities,tools,related-agents,not-my-scope,maxTurns,permissionMode" > "$OUTPUT_FILE"

AGENT_COUNT=0
DOMAINS=("core" "engineering" "creative" "business" "people" "service" "leadership" "shared" "growth")

for domain_dir in "${DOMAINS[@]}"; do
  DOMAIN_PATH="${ROOT_DIR}/${domain_dir}/agents"
  if [[ ! -d "$DOMAIN_PATH" ]]; then
    continue
  fi

  for agent_dir in "$DOMAIN_PATH"/*/; do
    SKILL_FILE="${agent_dir}SKILL.md"
    if [[ ! -f "$SKILL_FILE" ]]; then
      continue
    fi

    # Extract frontmatter (between first pair of ---)
    frontmatter=$(sed -n '/^---$/,/^---$/p' "$SKILL_FILE" | sed '1d;$d')

    # Extract fields from frontmatter
    # Checks top-level AND inside metadata: block (Agent Skills spec migration)
    extract_field() {
      local field="$1"
      local fm="$2"
      # Try top-level first
      local val
      val=$(echo "$fm" | { grep -E "^${field}:" || true; } | head -1 | sed "s/^${field}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//' | tr -d '\r')
      if [[ -z "$val" ]]; then
        # Try inside metadata: block (2-space indent)
        val=$(echo "$fm" | { grep -E "^  ${field}:" || true; } | head -1 | sed "s/^  ${field}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//' | tr -d '\r')
      fi
      echo "$val"
    }

    extract_array() {
      local field="$1"
      local fm="$2"
      local val
      # Try top-level first
      val=$(echo "$fm" | { grep -E "^${field}:" || true; } | head -1 | sed "s/^${field}:[[:space:]]*//" | tr -d '\r')
      if [[ -z "$val" ]]; then
        # Try inside metadata: block
        val=$(echo "$fm" | { grep -E "^  ${field}:" || true; } | head -1 | sed "s/^  ${field}:[[:space:]]*//" | tr -d '\r')
      fi
      # Remove brackets and clean up
      echo "$val" | sed 's/^\[//' | sed 's/\]$//' | sed 's/"//g' | sed "s/'//g" | tr -s ' '
    }

    name=$(extract_field "name" "$frontmatter")
    domain=$(extract_field "domain" "$frontmatter")
    tier=$(extract_field "tier" "$frontmatter")
    model=$(extract_field "model" "$frontmatter")
    description=$(extract_field "description" "$frontmatter")
    tools=$(extract_array "tools" "$frontmatter")
    related=$(extract_array "related-agents" "$frontmatter")
    not_scope=$(extract_array "not-my-scope" "$frontmatter")
    max_turns=$(extract_field "maxTurns" "$frontmatter")
    perm_mode=$(extract_field "permissionMode" "$frontmatter")

    # Extract capabilities (multi-line YAML list - may be inside metadata: block)
    capabilities=$(echo "$frontmatter" | sed -n '/^\s*capabilities:/,/^\s*[a-z]/p' | { grep '^\s*-' || true; } | sed 's/^\s*-\s*//' | tr '\n' ';' | sed 's/;$//')

    # Default domain from directory if not in frontmatter
    if [[ -z "$domain" ]]; then
      domain="$domain_dir"
    fi

    # Escape double quotes in description for CSV
    description=$(echo "$description" | sed 's/"/""/g')

    # Write CSV row (quote fields that may contain commas)
    echo "\"${name}\",\"${domain}\",\"${tier}\",\"${model}\",\"${description}\",\"${capabilities}\",\"${tools}\",\"${related}\",\"${not_scope}\",\"${max_turns}\",\"${perm_mode}\"" >> "$OUTPUT_FILE"

    AGENT_COUNT=$((AGENT_COUNT + 1))
  done
done

echo "Generated ${OUTPUT_FILE} with ${AGENT_COUNT} agents"

# Summary by domain
echo ""
echo "Agents by domain:"
tail -n +2 "$OUTPUT_FILE" | cut -d',' -f2 | sed 's/"//g' | sort | uniq -c | sort -rn

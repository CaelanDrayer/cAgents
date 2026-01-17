#!/bin/bash
# cAgents Manifest Generator
# Generates consolidated manifests from agent discovery
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/agent-discovery.sh"

# Configuration
readonly CAGENTS_ROOT="${CAGENTS_ROOT:-$(pwd)}"

#######################################
# Generate root manifest (all domains)
# Arguments:
#   $1 - Output file (optional)
#######################################
generate_root_manifest() {
  local output="${1:-$CAGENTS_ROOT/.claude-plugin/plugin.generated.json}"

  info "Generating root manifest..."

  local agents commands
  agents=$(discover_agents "$CAGENTS_ROOT")
  commands=$(discover_commands "$CAGENTS_ROOT")

  local agent_count command_count
  agent_count=$(echo "$agents" | grep -c . || echo "0")
  command_count=$(echo "$commands" | grep -c . || echo "0")

  # Build arrays
  local agents_json commands_json
  agents_json=$(echo "$agents" | while read -r file; do
    [[ -n "$file" ]] && echo "\"$(echo "$file" | sed "s|$CAGENTS_ROOT/|./|")\""
  done | paste -sd, -)

  commands_json=$(echo "$commands" | while read -r file; do
    [[ -n "$file" ]] && echo "\"$(echo "$file" | sed "s|$CAGENTS_ROOT/|./|")\""
  done | paste -sd, -)

  mkdir -p "$(dirname "$output")"

  cat > "$output" <<EOF
{
  "name": "cagents",
  "version": "7.0.2",
  "description": "cAgents V7.0 - Auto-generated consolidated manifest. $agent_count agents, $command_count commands.",
  "generated_at": "$(timestamp)",
  "generator": "manifest-generator.sh v1.0.0",
  "discovery": {
    "method": "file_structure",
    "patterns": ["*/agents/*.md", "*/commands/*.md"]
  },
  "commands": [${commands_json}],
  "agents": [${agents_json}]
}
EOF

  success "Generated root manifest: $output"
  info "  Agents: $agent_count"
  info "  Commands: $command_count"
}

#######################################
# Generate domain-specific manifest
# Arguments:
#   $1 - Domain name
#   $2 - Output file (optional)
#######################################
generate_domain_manifest() {
  local domain="$1"
  local output="${2:-$CAGENTS_ROOT/$domain/.claude-plugin/plugin.generated.json}"
  local domain_dir="$CAGENTS_ROOT/$domain"

  if [[ ! -d "$domain_dir" ]]; then
    die "Domain directory not found: $domain_dir"
  fi

  info "Generating manifest for domain: $domain"

  local agents commands
  agents=$(get_agents_by_domain "$domain" "$CAGENTS_ROOT")
  commands=$(find "$domain_dir" -type f -name "*.md" -path "*/commands/*" 2>/dev/null | sort)

  local agent_count command_count
  agent_count=$(echo "$agents" | grep -c . || echo "0")
  command_count=$(echo "$commands" | grep -c . || echo "0")

  # Build arrays
  local agents_json commands_json
  agents_json=$(echo "$agents" | while read -r file; do
    [[ -n "$file" ]] && echo "\"$(echo "$file" | sed "s|$domain_dir/|./|")\""
  done | paste -sd, -)

  commands_json=$(echo "$commands" | while read -r file; do
    [[ -n "$file" ]] && echo "\"$(echo "$file" | sed "s|$domain_dir/|./|")\""
  done | paste -sd, -)

  mkdir -p "$(dirname "$output")"

  cat > "$output" <<EOF
{
  "name": "@cagents/$domain",
  "version": "7.0.2",
  "description": "cAgents $domain domain - Auto-generated manifest. $agent_count agents.",
  "generated_at": "$(timestamp)",
  "generator": "manifest-generator.sh v1.0.0",
  "domain": "$domain",
  "commands": [${commands_json:-}],
  "agents": [${agents_json:-}]
}
EOF

  success "Generated $domain manifest: $output"
  info "  Agents: $agent_count"
  info "  Commands: $command_count"
}

#######################################
# Generate all manifests
#######################################
generate_all_manifests() {
  info "Generating all manifests..."
  echo ""

  # Root manifest
  generate_root_manifest
  echo ""

  # Domain manifests
  for domain in $(list_domains "$CAGENTS_ROOT"); do
    generate_domain_manifest "$domain"
    echo ""
  done

  success "All manifests generated!"
}

#######################################
# Compare generated vs existing manifests
#######################################
compare_manifests() {
  info "Comparing generated vs existing manifests..."

  local root_existing="$CAGENTS_ROOT/.claude-plugin/plugin.json"
  local root_generated="$CAGENTS_ROOT/.claude-plugin/plugin.generated.json"

  if [[ -f "$root_existing" ]] && [[ -f "$root_generated" ]]; then
    local existing_agents generated_agents
    existing_agents=$(jq '.agents | length' "$root_existing" 2>/dev/null || echo "?")
    generated_agents=$(jq '.agents | length' "$root_generated" 2>/dev/null || echo "?")

    echo "Root manifest:"
    echo "  Existing: $existing_agents agents"
    echo "  Generated: $generated_agents agents"
  fi
}

#######################################
# Main function
#######################################
main() {
  local command="${1:-help}"
  shift || true

  case "$command" in
    root)
      generate_root_manifest "$@"
      ;;
    domain)
      generate_domain_manifest "$@"
      ;;
    all)
      generate_all_manifests
      ;;
    compare)
      compare_manifests
      ;;
    help|--help|-h)
      echo "Usage: manifest-generator.sh <command> [args]"
      echo ""
      echo "Commands:"
      echo "  root [output]        - Generate root manifest"
      echo "  domain <name> [out]  - Generate domain manifest"
      echo "  all                  - Generate all manifests"
      echo "  compare              - Compare generated vs existing"
      echo ""
      echo "Examples:"
      echo "  manifest-generator.sh root"
      echo "  manifest-generator.sh domain engineering"
      echo "  manifest-generator.sh all"
      ;;
    *)
      die "Unknown command: $command"
      ;;
  esac
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi

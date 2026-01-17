#!/bin/bash
# cAgents Agent Discovery Utility
# Discovers agents by file structure instead of explicit manifest lists
# Version: 1.0.0

set -euo pipefail

# Source libraries
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$SCRIPT_DIR")/lib"

source "$LIB_DIR/core.sh"
source "$LIB_DIR/files.sh"
source "$LIB_DIR/json.sh"

# Configuration
readonly CAGENTS_ROOT="${CAGENTS_ROOT:-$(pwd)}"

#######################################
# Discover all agent files
# Arguments:
#   $1 - Base directory (optional, defaults to cwd)
# Outputs:
#   List of agent files (relative paths)
#######################################
discover_agents() {
  local base_dir="${1:-$CAGENTS_ROOT}"

  # Find all .md files in */agents/ directories
  find "$base_dir" -type f -name "*.md" -path "*/agents/*" 2>/dev/null | \
    grep -v "_archive" | \
    grep -v "node_modules" | \
    sort
}

#######################################
# Discover all command files
# Arguments:
#   $1 - Base directory (optional)
# Outputs:
#   List of command files (relative paths)
#######################################
discover_commands() {
  local base_dir="${1:-$CAGENTS_ROOT}"

  # Find all .md files in */commands/ directories
  find "$base_dir" -type f -name "*.md" -path "*/commands/*" 2>/dev/null | \
    grep -v "_archive" | \
    grep -v "node_modules" | \
    sort
}

#######################################
# Get agents by domain
# Arguments:
#   $1 - Domain name
#   $2 - Base directory (optional)
# Outputs:
#   List of agent files for domain
#######################################
get_agents_by_domain() {
  local domain="$1"
  local base_dir="${2:-$CAGENTS_ROOT}"

  find "$base_dir/$domain" -type f -name "*.md" -path "*/agents/*" 2>/dev/null | \
    sort
}

#######################################
# Get agents by tier
# Arguments:
#   $1 - Tier (controller, execution, support)
#   $2 - Base directory (optional)
# Outputs:
#   List of agent files matching tier
#######################################
get_agents_by_tier() {
  local tier="$1"
  local base_dir="${2:-$CAGENTS_ROOT}"

  # Search for tier in agent frontmatter
  for file in $(discover_agents "$base_dir"); do
    if grep -q "^tier: $tier" "$file" 2>/dev/null; then
      echo "$file"
    fi
  done
}

#######################################
# Count agents by category
# Arguments:
#   $1 - Base directory (optional)
# Outputs:
#   JSON with counts
#######################################
count_agents() {
  local base_dir="${1:-$CAGENTS_ROOT}"

  local total controllers execution support commands
  total=$(discover_agents "$base_dir" | wc -l | tr -d ' ')
  controllers=$(get_agents_by_tier "controller" "$base_dir" | wc -l | tr -d ' ')
  execution=$(get_agents_by_tier "execution" "$base_dir" | wc -l | tr -d ' ')
  support=$(get_agents_by_tier "support" "$base_dir" | wc -l | tr -d ' ')
  commands=$(discover_commands "$base_dir" | wc -l | tr -d ' ')

  json_build \
    --total "$total" \
    --controllers "$controllers" \
    --execution "$execution" \
    --support "$support" \
    --commands "$commands"
}

#######################################
# List domains
# Arguments:
#   $1 - Base directory (optional)
# Outputs:
#   List of domains (directories with agents subdirectory)
#######################################
list_domains() {
  local base_dir="${1:-$CAGENTS_ROOT}"

  # Find directories that contain an agents subdirectory
  for dir in "$base_dir"/*; do
    if [[ -d "$dir/agents" ]]; then
      basename "$dir"
    fi
  done | sort
}

#######################################
# Get agent metadata from frontmatter
# Arguments:
#   $1 - Agent file path
# Outputs:
#   JSON with agent metadata
#######################################
get_agent_metadata() {
  local file="$1"

  if [[ ! -f "$file" ]]; then
    echo '{"error":"file_not_found"}'
    return 1
  fi

  # Extract frontmatter fields
  local name tier domain version description

  name=$(sed -n '/^---$/,/^---$/{ /^name:/{ s/^name: *//; s/^"//; s/"$//; p; } }' "$file" | head -1)
  tier=$(sed -n '/^---$/,/^---$/{ /^tier:/{ s/^tier: *//; s/^"//; s/"$//; p; } }' "$file" | head -1)
  domain=$(sed -n '/^---$/,/^---$/{ /^domain:/{ s/^domain: *//; s/^"//; s/"$//; p; } }' "$file" | head -1)
  version=$(sed -n '/^---$/,/^---$/{ /^version:/{ s/^version: *//; s/^"//; s/"$//; p; } }' "$file" | head -1)
  description=$(sed -n '/^---$/,/^---$/{ /^description:/{ s/^description: *//; s/^"//; s/"$//; p; } }' "$file" | head -1)

  json_build \
    --name "${name:-unknown}" \
    --tier "${tier:-unknown}" \
    --domain "${domain:-unknown}" \
    --version "${version:-1.0}" \
    --description "${description:-}"
}

#######################################
# Generate manifest from discovery
# Arguments:
#   $1 - Output file
#   $2 - Domain filter (optional, "all" for all domains)
#   $3 - Base directory (optional)
# Returns:
#   0 on success
#######################################
generate_manifest() {
  local output_file="$1"
  local domain_filter="${2:-all}"
  local base_dir="${3:-$CAGENTS_ROOT}"

  info "Generating manifest: $output_file (domain: $domain_filter)"

  local agents commands

  if [[ "$domain_filter" == "all" ]]; then
    agents=$(discover_agents "$base_dir")
    commands=$(discover_commands "$base_dir")
  else
    agents=$(get_agents_by_domain "$domain_filter" "$base_dir")
    commands=$(find "$base_dir/$domain_filter" -type f -name "*.md" -path "*/commands/*" 2>/dev/null | sort)
  fi

  # Build JSON arrays
  local agents_json="["
  local first=true
  for agent in $agents; do
    local rel_path
    rel_path="./${agent#$base_dir/}"
    if [[ "$first" == "true" ]]; then
      agents_json="$agents_json\"$rel_path\""
      first=false
    else
      agents_json="$agents_json,\"$rel_path\""
    fi
  done
  agents_json="$agents_json]"

  local commands_json="["
  first=true
  for cmd in $commands; do
    local rel_path
    rel_path="./${cmd#$base_dir/}"
    if [[ "$first" == "true" ]]; then
      commands_json="$commands_json\"$rel_path\""
      first=false
    else
      commands_json="$commands_json,\"$rel_path\""
    fi
  done
  commands_json="$commands_json]"

  # Write manifest
  cat > "$output_file" <<EOF
{
  "name": "cagents-${domain_filter}",
  "version": "7.0.2",
  "description": "Auto-generated manifest for ${domain_filter}",
  "generated_at": "$(timestamp)",
  "generator": "agent-discovery.sh",
  "commands": $commands_json,
  "agents": $agents_json
}
EOF

  success "Generated manifest with $(echo "$agents" | wc -w) agents and $(echo "$commands" | wc -w) commands"
}

#######################################
# Validate all agent files
# Arguments:
#   $1 - Base directory (optional)
# Outputs:
#   Validation results
#######################################
validate_agents() {
  local base_dir="${1:-$CAGENTS_ROOT}"
  local errors=0
  local warnings=0

  info "Validating agents in: $base_dir"

  for file in $(discover_agents "$base_dir"); do
    # Check frontmatter
    local marker_count
    marker_count=$(grep -c "^---$" "$file" 2>/dev/null || echo "0")

    if [[ "$marker_count" -lt 2 ]]; then
      warn "Missing frontmatter: $file"
      ((warnings++))
      continue
    fi

    # Check required fields
    if ! grep -q "^name:" "$file" 2>/dev/null; then
      warn "Missing name field: $file"
      ((warnings++))
    fi

    if ! grep -q "^tier:" "$file" 2>/dev/null; then
      warn "Missing tier field (V7.0 required): $file"
      ((errors++))
    fi
  done

  echo ""
  if [[ $errors -gt 0 ]]; then
    warn "Validation completed with $errors errors and $warnings warnings"
    return 1
  else
    success "Validation completed with $warnings warnings"
    return 0
  fi
}

#######################################
# Main function - CLI interface
#######################################
main() {
  local command="${1:-help}"
  shift || true

  case "$command" in
    agents)
      discover_agents "$@"
      ;;
    commands)
      discover_commands "$@"
      ;;
    domains)
      list_domains "$@"
      ;;
    count)
      count_agents "$@"
      ;;
    metadata)
      get_agent_metadata "$@"
      ;;
    generate)
      generate_manifest "$@"
      ;;
    validate)
      validate_agents "$@"
      ;;
    help|--help|-h)
      echo "Usage: agent-discovery.sh <command> [args]"
      echo ""
      echo "Commands:"
      echo "  agents [dir]         - List all agent files"
      echo "  commands [dir]       - List all command files"
      echo "  domains [dir]        - List all domains"
      echo "  count [dir]          - Count agents by category"
      echo "  metadata <file>      - Get agent metadata from frontmatter"
      echo "  generate <out> [domain] [dir] - Generate manifest"
      echo "  validate [dir]       - Validate all agent files"
      echo ""
      echo "Examples:"
      echo "  agent-discovery.sh agents"
      echo "  agent-discovery.sh count"
      echo "  agent-discovery.sh generate /tmp/manifest.json all"
      echo "  agent-discovery.sh validate"
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

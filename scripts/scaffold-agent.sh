#!/usr/bin/env bash
# scaffold-agent.sh <archetype> <agent-name> <tier> [branch]
# Creates a new flat agent definition (agents/<name>.md) from template.

set -euo pipefail

if [[ $# -lt 3 || $# -gt 4 ]]; then
  echo "Usage: $0 <archetype> <agent-name> <tier> [branch]" >&2
  echo "  archetype: developer|operator|advisor|analyst|creator|writer|strategist|core|leadership" >&2
  echo "  tier: controller | execution | support" >&2
  echo "  branch: required for developer/operator/advisor (3-level archetypes)" >&2
  exit 1
fi

ARCHETYPE="$1"
AGENT_NAME="$2"
TIER="$3"
BRANCH="${4:-}"

# Validate tier
if [[ "$TIER" != "controller" && "$TIER" != "execution" && "$TIER" != "support" ]]; then
  echo "Error: tier must be one of: controller, execution, support" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Title-case the agent name (replace hyphens with spaces, capitalize each word)
AGENT_TITLE="$(echo "$AGENT_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')"

# v12.68.0: agent definitions are FLAT - agents/<name>.md - because Claude Code
# discovers plugin agents with a non-recursive scan of agents/. Tier-3 resources
# live in the sibling agents/<name>/resources/ directory.
AGENT_FILE="$ROOT/agents/$AGENT_NAME.md"
AGENT_DIR="$ROOT/agents/$AGENT_NAME"

if [[ -e "$AGENT_FILE" ]]; then
  echo "Error: Agent already exists: agents/$AGENT_NAME.md" >&2
  exit 1
fi

mkdir -p "$AGENT_DIR/resources"

{
  echo "---"
  echo "name: ${AGENT_NAME}"
  echo "archetype: ${ARCHETYPE}"
  # branch: is required for the 3-level archetypes only, so emit the line only
  # when one was supplied (an empty line here would break the YAML).
  if [[ -n "$BRANCH" ]]; then
    echo "branch: ${BRANCH}"
  fi
  cat <<EOF
description: "TODO: Add description"
metadata:
  version: "1.0.0"
  tier: ${TIER}
  model: sonnet
  capabilities: []
  vibe: "TODO: Add vibe"
allowed-tools: "Read Grep Glob Write Edit Bash"
---

# ${AGENT_TITLE}

TODO: Add agent content.
EOF
} > "$AGENT_FILE"

echo "Created agents/$AGENT_NAME.md (resources: agents/$AGENT_NAME/resources/)"
echo ""
echo "Next steps:"
echo "  1. Update description and vibe in the frontmatter"
echo "  2. Add capabilities to the metadata"
echo "  3. Fill in the agent body content"
echo "  4. Verify: bash scripts/ci/validate-agents.sh --file agents/$AGENT_NAME.md"
echo ""
echo "No registration step: the flat agents/ scan IS the registry."

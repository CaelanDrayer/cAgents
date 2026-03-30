#!/usr/bin/env bash
# scaffold-agent.sh <domain> <agent-name> <tier>
# Creates a new agent SKILL.md from template.

set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <domain> <agent-name> <tier>" >&2
  echo "  tier: controller | execution | support" >&2
  exit 1
fi

DOMAIN="$1"
AGENT_NAME="$2"
TIER="$3"

# Validate tier
if [[ "$TIER" != "controller" && "$TIER" != "execution" && "$TIER" != "support" ]]; then
  echo "Error: tier must be one of: controller, execution, support" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Title-case the agent name (replace hyphens with spaces, capitalize each word)
AGENT_TITLE="$(echo "$AGENT_NAME" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')"

AGENT_DIR="$ROOT/$DOMAIN/agents/$AGENT_NAME"

if [[ -d "$AGENT_DIR" ]]; then
  echo "Error: Agent directory already exists: $DOMAIN/agents/$AGENT_NAME" >&2
  exit 1
fi

mkdir -p "$AGENT_DIR"

cat > "$AGENT_DIR/SKILL.md" <<EOF
---
name: ${AGENT_NAME}
description: "TODO: Add description"
metadata:
  tier: ${TIER}
  domain: ${DOMAIN}
  capabilities: []
  vibe: "TODO: Add vibe"
allowed-tools: "Read Grep Glob Write Edit Bash"
---

# ${AGENT_TITLE}

TODO: Add agent content.
EOF

echo "Created $DOMAIN/agents/$AGENT_NAME/SKILL.md"
echo ""
echo "Next steps:"
echo "  1. Update description and vibe in the frontmatter"
echo "  2. Add capabilities to the metadata"
echo "  3. Fill in the agent body content"
echo "  4. Register the agent in $DOMAIN/.claude-plugin/plugin.json (if it exists)"

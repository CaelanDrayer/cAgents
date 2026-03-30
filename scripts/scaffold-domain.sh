#!/usr/bin/env bash
# scaffold-domain.sh <domain-name>
# Creates a new domain with all required files and directories.

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <domain-name>" >&2
  exit 1
fi

DOMAIN="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Title-case the domain name for display
DOMAIN_TITLE="$(echo "$DOMAIN" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')"

echo "Scaffolding domain: $DOMAIN"

# Create directories
mkdir -p "$ROOT/$DOMAIN/config"
mkdir -p "$ROOT/$DOMAIN/agents/${DOMAIN}-coordinator"

echo "  Created $DOMAIN/"
echo "  Created $DOMAIN/config/"
echo "  Created $DOMAIN/agents/${DOMAIN}-coordinator/"

# Create domain_overrides.yaml
cat > "$ROOT/$DOMAIN/config/domain_overrides.yaml" <<EOF
domain: ${DOMAIN}
controller_catalog:
  tier_2:
    primary: "${DOMAIN}-coordinator"
  tier_3:
    primary: "${DOMAIN}-coordinator"
    supporting: []
  tier_4:
    primary: "${DOMAIN}-coordinator"
    supporting: []
router_keywords: []
specialist_routing: {}
EOF

echo "  Created $DOMAIN/config/domain_overrides.yaml"

# Create coordinator SKILL.md
cat > "$ROOT/$DOMAIN/agents/${DOMAIN}-coordinator/SKILL.md" <<EOF
---
name: ${DOMAIN}-coordinator
description: "Coordinates ${DOMAIN} domain tasks via question-based delegation"
metadata:
  tier: controller
  domain: ${DOMAIN}
  coordination_style: question_based
  typical_questions:
    - "What specific ${DOMAIN} area does this involve?"
    - "What is the current state?"
    - "What approach is appropriate?"
  vibe: "Coordinates ${DOMAIN} expertise effectively"
allowed-tools: "Read Grep Glob Write Edit Bash Task"
---

# ${DOMAIN_TITLE} Coordinator

Controller agent for the ${DOMAIN} domain.

## Delegation Protocol

Use question-based delegation to coordinate ${DOMAIN} specialists:

1. Break the request into specific questions
2. Delegate each question to the appropriate execution agent via Task tool
3. Synthesize answers into a coherent solution
4. Coordinate implementation across agents

## CRITICAL: Never Do Direct Work

This is a controller agent. All implementation work MUST be delegated to execution agents via the Task tool. Never implement directly.
EOF

echo "  Created $DOMAIN/agents/${DOMAIN}-coordinator/SKILL.md"
echo ""
echo "Domain '$DOMAIN' scaffolded successfully."
echo ""
echo "Next steps:"
echo "  1. Add router_keywords to $DOMAIN/config/domain_overrides.yaml"
echo "  2. Create execution agents with: ./scripts/scaffold-agent.sh $DOMAIN <agent-name> execution"
echo "  3. Register agents in the root .claude-plugin/plugin.json"

#!/bin/bash
# Generate plugin.json manifest for a domain
# Usage: ./generate_plugin_manifest.sh {domain}

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 {domain}"
  echo "Example: $0 engineering"
  exit 1
fi

if [ ! -d "$DOMAIN/agents" ]; then
  echo "❌ Error: $DOMAIN/agents directory not found"
  exit 1
fi

echo "Generating plugin.json for domain: $DOMAIN"

# Count agents
AGENT_COUNT=$(find "$DOMAIN/agents" -name "*.md" -type f | wc -l)
echo "Found $AGENT_COUNT agents"

# Generate agents list
AGENTS=""
for agent_file in "$DOMAIN/agents"/*.md; do
  if [ -f "$agent_file" ]; then
    agent_name=$(basename "$agent_file" .md)
    AGENTS="$AGENTS    \"$DOMAIN:$agent_name\",\n"
  fi
done

# Remove trailing comma
AGENTS=$(echo -e "$AGENTS" | sed '$ s/,$//')

# Generate plugin.json
cat > "$DOMAIN/.claude-plugin/plugin.json" <<EOF
{
  "name": "$DOMAIN",
  "version": "7.0.1",
  "description": "$DOMAIN agents for cAgents V7.0",
  "type": "domain",
  "author": "cAgents",

  "agents": [
$AGENTS
  ],

  "dependencies": []
}
EOF

echo "✓ Generated $DOMAIN/.claude-plugin/plugin.json ($AGENT_COUNT agents)"

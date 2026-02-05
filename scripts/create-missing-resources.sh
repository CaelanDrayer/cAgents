#!/bin/bash
# Create missing resource files referenced by @path

missing_files=(
  "/home/PathingIT/cAgents/grow/agents/marketing-strategist/resources/strategy-framework.md"
  "/home/PathingIT/cAgents/grow/agents/marketing-strategist/resources/competitive-analysis.md"
  "/home/PathingIT/cAgents/grow/agents/marketing-strategist/resources/gtm-template.md"
  "/home/PathingIT/cAgents/make/agents/architect/resources/examples.md"
  "/home/PathingIT/cAgents/make/agents/backend-developer/resources/database-optimization.md"
  "/home/PathingIT/cAgents/make/agents/backend-developer/resources/examples.md"
  "/home/PathingIT/cAgents/make/agents/devops-lead/resources/infrastructure-patterns.md"
  "/home/PathingIT/cAgents/make/agents/devops-lead/resources/deployment-strategies.md"
  "/home/PathingIT/cAgents/make/agents/devops-lead/resources/monitoring-setup.md"
  "/home/PathingIT/cAgents/make/agents/frontend-developer/resources/component-patterns.md"
  "/home/PathingIT/cAgents/make/agents/frontend-developer/resources/accessibility-guide.md"
  "/home/PathingIT/cAgents/make/agents/frontend-developer/resources/performance-tips.md"
  "/home/PathingIT/cAgents/people/agents/hr-business-partner/resources/org-planning.md"
  "/home/PathingIT/cAgents/people/agents/hr-business-partner/resources/change-management.md"
  "/home/PathingIT/cAgents/people/agents/hr-business-partner/resources/talent-review.md"
)

for file in "${missing_files[@]}"; do
  dir=$(dirname "$file")
  filename=$(basename "$file" .md)
  
  # Create directory if needed
  mkdir -p "$dir"
  
  # Create placeholder file
  cat > "$file" << RESOURCE_EOF
# ${filename//-/ }

Resource documentation for $(basename $(dirname $(dirname "$file"))).

## Overview

This resource provides detailed guidance and examples for the $(basename $(dirname $(dirname "$file"))) agent.

## Content

[To be populated with specific guidance, templates, and examples]

## Usage

Referenced via \`@path\` from the agent's SKILL.md file.

---

**Status**: Placeholder - needs content expansion
RESOURCE_EOF

  echo "Created: $file"
done

echo ""
echo "Resource file creation complete"

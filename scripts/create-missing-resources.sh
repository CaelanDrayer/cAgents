#!/bin/bash
# Create missing resource files referenced by @path

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

missing_files=(
  "$PROJECT_ROOT/grow/agents/marketing-strategist/resources/strategy-framework.md"
  "$PROJECT_ROOT/grow/agents/marketing-strategist/resources/competitive-analysis.md"
  "$PROJECT_ROOT/grow/agents/marketing-strategist/resources/gtm-template.md"
  "$PROJECT_ROOT/make/agents/architect/resources/examples.md"
  "$PROJECT_ROOT/make/agents/backend-developer/resources/database-optimization.md"
  "$PROJECT_ROOT/make/agents/backend-developer/resources/examples.md"
  "$PROJECT_ROOT/make/agents/devops-lead/resources/infrastructure-patterns.md"
  "$PROJECT_ROOT/make/agents/devops-lead/resources/deployment-strategies.md"
  "$PROJECT_ROOT/make/agents/devops-lead/resources/monitoring-setup.md"
  "$PROJECT_ROOT/make/agents/frontend-developer/resources/component-patterns.md"
  "$PROJECT_ROOT/make/agents/frontend-developer/resources/accessibility-guide.md"
  "$PROJECT_ROOT/make/agents/frontend-developer/resources/performance-tips.md"
  "$PROJECT_ROOT/people/agents/hr-business-partner/resources/org-planning.md"
  "$PROJECT_ROOT/people/agents/hr-business-partner/resources/change-management.md"
  "$PROJECT_ROOT/people/agents/hr-business-partner/resources/talent-review.md"
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

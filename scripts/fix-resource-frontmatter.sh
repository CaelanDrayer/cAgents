#!/bin/bash
# Remove invalid frontmatter from resource files

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# List of files with invalid frontmatter (resource files that shouldn't have it)
files_to_fix=(
"$PROJECT_ROOT/growth/agents/content-marketing-manager/resources/content-templates.md"
"$PROJECT_ROOT/developer/fullstack/architect/resources/adr-template.md"
"$PROJECT_ROOT/developer/fullstack/architect/resources/example-interactions.md"
"$PROJECT_ROOT/developer/backend/backend-developer/resources/example-interactions.md"
"$PROJECT_ROOT/developer/infrastructure/devops-engineer/resources/container-orchestration.md"
"$PROJECT_ROOT/developer/infrastructure/devops-engineer/resources/iac-patterns.md"
"$PROJECT_ROOT/developer/frontend/frontend-lead/resources/example-interactions.md"
"$PROJECT_ROOT/developer/quality/qa-lead/resources/examples.md"
"$PROJECT_ROOT/developer/quality/code-reviewer/resources/report-template.md"
"$PROJECT_ROOT/engineering/agents/security-specialist/resources/example-interactions.md"
"$PROJECT_ROOT/engineering/agents/security-specialist/resources/owasp-top10.md"
"$PROJECT_ROOT/engineering/agents/security-specialist/resources/review-checklist.md"
"$PROJECT_ROOT/engineering/agents/security-specialist/resources/secure-coding.md"
"$PROJECT_ROOT/developer/fullstack/senior-developer/resources/example-interactions.md"
"$PROJECT_ROOT/developer/fullstack/tech-lead/resources/decision-frameworks.md"
"$PROJECT_ROOT/developer/fullstack/tech-lead/resources/example-interactions.md"
)

for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        # Check if file has frontmatter with missing fields
        if grep -q "^---$" "$file"; then
            # Check if it's missing required fields (likely invalid frontmatter)
            frontmatter=$(sed -n '/^---$/,/^---$/p' "$file" | head -n -1 | tail -n +2)

            if ! echo "$frontmatter" | grep -q "^name:" || \
               ! echo "$frontmatter" | grep -q "^tier:" || \
               ! echo "$frontmatter" | grep -q "^domain:"; then
                echo "Removing invalid frontmatter from: $file"

                # Remove frontmatter (everything between first two ---)
                sed -i '/^---$/,/^---$/{//!d}; /^---$/d' "$file"
            fi
        fi
    else
        echo "File not found: $file"
    fi
done

echo "Frontmatter cleanup complete"

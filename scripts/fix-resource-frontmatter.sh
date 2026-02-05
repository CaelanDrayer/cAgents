#!/bin/bash
# Remove invalid frontmatter from resource files

# List of files with invalid frontmatter (resource files that shouldn't have it)
files_to_fix=(
"/home/PathingIT/cAgents/grow/agents/content-marketing-manager/resources/content-templates.md"
"/home/PathingIT/cAgents/make/agents/architect/resources/adr-template.md"
"/home/PathingIT/cAgents/make/agents/architect/resources/example-interactions.md"
"/home/PathingIT/cAgents/make/agents/backend-developer/resources/example-interactions.md"
"/home/PathingIT/cAgents/make/agents/devops/resources/container-orchestration.md"
"/home/PathingIT/cAgents/make/agents/devops/resources/iac-patterns.md"
"/home/PathingIT/cAgents/make/agents/frontend-lead/resources/example-interactions.md"
"/home/PathingIT/cAgents/make/agents/qa-lead/resources/examples.md"
"/home/PathingIT/cAgents/make/agents/reviewer/resources/report-template.md"
"/home/PathingIT/cAgents/make/agents/security-specialist/resources/example-interactions.md"
"/home/PathingIT/cAgents/make/agents/security-specialist/resources/owasp-top10.md"
"/home/PathingIT/cAgents/make/agents/security-specialist/resources/review-checklist.md"
"/home/PathingIT/cAgents/make/agents/security-specialist/resources/secure-coding.md"
"/home/PathingIT/cAgents/make/agents/senior-developer/resources/example-interactions.md"
"/home/PathingIT/cAgents/make/agents/tech-lead/resources/decision-frameworks.md"
"/home/PathingIT/cAgents/make/agents/tech-lead/resources/example-interactions.md"
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

#!/usr/bin/env python3
"""Add missing coordination_style and typical_questions to controllers."""

import re
from pathlib import Path


# Domain-specific typical questions
DOMAIN_QUESTIONS = {
    'make': [
        "What is the current implementation of this feature?",
        "What are the technical constraints we need to consider?",
        "What are the key risks and dependencies?",
    ],
    'grow': [
        "What are the current campaign/sales metrics?",
        "What is the target audience and positioning?",
        "What are the conversion bottlenecks?",
    ],
    'operate': [
        "What are the current operational metrics?",
        "What are the efficiency bottlenecks?",
        "What are the compliance requirements?",
    ],
    'people': [
        "What are the current team dynamics and gaps?",
        "What are the cultural considerations?",
        "What are the retention and engagement metrics?",
    ],
    'serve': [
        "What are the customer pain points?",
        "What are the service level requirements?",
        "What are the support/legal constraints?",
    ],
}


def get_domain_from_path(file_path):
    """Extract super-domain from file path."""
    parts = file_path.parts
    for i, part in enumerate(parts):
        if part in ['make', 'grow', 'operate', 'people', 'serve', 'shared']:
            return part
    return None


def add_controller_fields(file_path):
    """Add coordination_style and typical_questions to controller."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file has frontmatter
    if not content.startswith('---'):
        return False, "No frontmatter"

    # Parse frontmatter
    parts = content.split('---', 2)
    if len(parts) < 3:
        return False, "Invalid frontmatter"

    frontmatter = parts[1]
    body = parts[2]

    # Check if this is a controller
    tier_match = re.search(r"^tier:\s*(.+)", frontmatter, re.MULTILINE)
    if not tier_match or tier_match.group(1).strip() != 'controller':
        return False, "Not a controller"

    # Check if fields already exist
    has_coordination_style = bool(re.search(r'^coordination_style:', frontmatter, re.MULTILINE))
    has_typical_questions = bool(re.search(r'^typical_questions:', frontmatter, re.MULTILINE))

    if has_coordination_style and has_typical_questions:
        return False, "Already has fields"

    # Get domain for questions
    domain = get_domain_from_path(file_path)
    questions = DOMAIN_QUESTIONS.get(domain, DOMAIN_QUESTIONS['make'])  # Default to make questions

    # Build new fields
    new_fields = ""

    if not has_coordination_style:
        new_fields += "coordination_style: question_based\n"

    if not has_typical_questions:
        new_fields += "typical_questions:\n"
        for question in questions:
            new_fields += f"  - \"{question}\"\n"

    # Add fields after tier (find the line with tier and add after it)
    lines = frontmatter.split('\n')
    new_lines = []
    tier_found = False

    for line in lines:
        new_lines.append(line)
        if not tier_found and line.strip().startswith('tier:'):
            tier_found = True
            # Add new fields after tier line
            for field_line in new_fields.rstrip().split('\n'):
                new_lines.append(field_line)

    new_frontmatter = '\n'.join(new_lines)

    # Write updated content
    new_content = f"---{new_frontmatter}---{body}"
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True, "Added fields"


def main():
    """Add controller fields to all controllers."""
    project_root = Path(__file__).parent.parent.parent

    # Find all agent files
    agent_files = []
    for pattern in ['core/agents/*.md', 'shared/agents/*.md', '*/agents/*.md']:
        agent_files.extend(project_root.glob(pattern))

    print(f"Found {len(agent_files)} agent files")
    print("Adding controller fields...")
    print()

    fixed_count = 0
    skipped_count = 0

    for agent_file in sorted(agent_files):
        success, message = add_controller_fields(agent_file)

        if success:
            print(f"  ✓ {agent_file.name}: {message}")
            fixed_count += 1
        elif message == "Not a controller" or message == "Already has fields":
            skipped_count += 1

    print()
    print(f"Fixed: {fixed_count} controllers")
    print(f"Skipped: {skipped_count} agents (not controllers or already have fields)")


if __name__ == '__main__':
    main()

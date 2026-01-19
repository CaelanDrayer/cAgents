#!/usr/bin/env python3
"""Add missing domain field to core agents."""

import re
from pathlib import Path


CORE_AGENTS_MISSING_DOMAIN = [
    'universal-executor-enhanced.md',
    'optimizer.md',
    'universal-executor.md',
    'universal-self-correct.md',
]


def add_domain_field(file_path):
    """Add domain: infrastructure to agent frontmatter."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if file has frontmatter
    if not content.startswith('---'):
        print(f"  ⚠ {file_path.name}: No frontmatter found")
        return False

    # Parse frontmatter
    parts = content.split('---', 2)
    if len(parts) < 3:
        print(f"  ⚠ {file_path.name}: Invalid frontmatter")
        return False

    frontmatter = parts[1]
    body = parts[2]

    # Check if domain already exists
    if re.search(r'^domain:', frontmatter, re.MULTILINE):
        print(f"  ⚠ {file_path.name}: Already has domain field")
        return False

    # Add domain field after tier field
    if 'tier:' in frontmatter:
        # Add domain after tier
        new_frontmatter = re.sub(
            r'(tier:\s*\w+)',
            r'\1\ndomain: infrastructure',
            frontmatter,
            count=1
        )
    else:
        # Add domain after name
        new_frontmatter = re.sub(
            r'(name:\s*[\w-]+)',
            r'\1\ndomain: infrastructure',
            frontmatter,
            count=1
        )

    # Write updated content
    new_content = f"---{new_frontmatter}---{body}"
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  ✓ {file_path.name}: Added domain: infrastructure")
    return True


def main():
    """Add domain field to core agents."""
    project_root = Path(__file__).parent.parent.parent
    core_agents_dir = project_root / 'core' / 'agents'

    print("Adding domain: infrastructure to core agents")
    print()

    fixed_count = 0

    for agent_name in CORE_AGENTS_MISSING_DOMAIN:
        agent_path = core_agents_dir / agent_name

        if not agent_path.exists():
            print(f"  ⚠ {agent_name}: Not found")
            continue

        if add_domain_field(agent_path):
            fixed_count += 1

    print()
    print(f"Total fixed: {fixed_count} agents")


if __name__ == '__main__':
    main()

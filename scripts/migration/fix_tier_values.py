#!/usr/bin/env python3
"""Fix tier values across all agents to match V7.0.3 standard."""

import re
from pathlib import Path


# Tier value mappings
TIER_MAPPINGS = {
    'core': 'infrastructure',  # Core agents are infrastructure
    '2': 'controller',  # Tier 2 agents are controllers
    'cross-cutting': 'support',  # Cross-cutting agents are support
    'orchestration': 'support',  # Orchestration agents (reviewer) are support
    'strategic': 'controller',  # Strategic agents are controllers
}


def fix_tier_value(file_path):
    """Fix tier value in agent frontmatter."""
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

    # Find tier value
    tier_match = re.search(r"^tier:\s*['\"]?([^'\"\n]+)['\"]?", frontmatter, re.MULTILINE)

    if not tier_match:
        print(f"  ⚠ {file_path.name}: No tier field found")
        return False

    current_tier = tier_match.group(1).strip()

    # Check if tier needs fixing
    if current_tier in TIER_MAPPINGS:
        new_tier = TIER_MAPPINGS[current_tier]

        # Replace tier value (handle both quoted and unquoted)
        new_frontmatter = re.sub(
            r"^tier:\s*['\"]?" + re.escape(current_tier) + r"['\"]?",
            f"tier: {new_tier}",
            frontmatter,
            count=1,
            flags=re.MULTILINE
        )

        # Write updated content
        new_content = f"---{new_frontmatter}---{body}"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

        print(f"  ✓ {file_path.name}: tier '{current_tier}' → '{new_tier}'")
        return True

    elif current_tier in ['controller', 'execution', 'support', 'infrastructure']:
        # Already valid
        return False
    else:
        print(f"  ⚠ {file_path.name}: Unknown tier '{current_tier}'")
        return False


def main():
    """Fix tier values in all agent files."""
    project_root = Path(__file__).parent.parent.parent

    # Find all agent files
    agent_files = []
    for pattern in ['core/agents/*.md', 'shared/agents/*.md', '*/agents/*.md']:
        agent_files.extend(project_root.glob(pattern))

    print(f"Found {len(agent_files)} agent files")
    print()

    fixed_count = 0

    # Group by tier mapping
    for old_tier, new_tier in TIER_MAPPINGS.items():
        print(f"Fixing tier: '{old_tier}' → '{new_tier}'")
        tier_fixed = 0

        for agent_file in sorted(agent_files):
            if fix_tier_value(agent_file):
                tier_fixed += 1
                fixed_count += 1

        print(f"  Fixed {tier_fixed} agents")
        print()

    print(f"Total fixed: {fixed_count} agents")


if __name__ == '__main__':
    main()

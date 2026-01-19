#!/usr/bin/env python3
"""
Migration Script 3: Update Agent Frontmatter
Updates domain field in all agent frontmatter to match new super-domains
"""

import re
import sys
from pathlib import Path


def update_frontmatter(filepath: Path, new_domain: str) -> bool:
    """Update domain field in agent frontmatter"""

    with open(filepath, 'r') as f:
        content = f.read()

    # Match YAML frontmatter
    match = re.match(r'^(---\s*\n)(.*?)(\n---\s*\n)(.*)$', content, re.DOTALL)
    if not match:
        print(f"  ⚠ No frontmatter found in {filepath.name}")
        return False

    frontmatter_start = match.group(1)
    frontmatter_content = match.group(2)
    frontmatter_end = match.group(3)
    body = match.group(4)

    # Update domain field
    updated_frontmatter = re.sub(
        r'^domain:\s*.*$',
        f'domain: {new_domain}',
        frontmatter_content,
        flags=re.MULTILINE
    )

    # If domain field doesn't exist, add it after name field
    if 'domain:' not in updated_frontmatter:
        updated_frontmatter = re.sub(
            r'^(name:\s*.*$)',
            r'\1\ndomain: ' + new_domain,
            updated_frontmatter,
            flags=re.MULTILINE
        )

    # Reconstruct file
    new_content = frontmatter_start + updated_frontmatter + frontmatter_end + body

    # Write back
    with open(filepath, 'w') as f:
        f.write(new_content)

    return True


def main():
    project_root = Path("/home/PathingIT/cAgents")
    super_domains = ['make', 'grow', 'operate', 'people', 'serve']

    print("=== Phase 2.2 (cont): Updating Agent Frontmatter ===")
    print()

    total_updated = 0

    for domain in super_domains:
        agents_dir = project_root / domain / "agents"

        if not agents_dir.exists():
            print(f"⚠ {domain}/agents/ not found, skipping")
            continue

        agents = list(agents_dir.glob("*.md"))
        print(f"Updating {len(agents)} agents in {domain}/...")

        updated = 0
        for agent_file in agents:
            if update_frontmatter(agent_file, domain):
                updated += 1

        print(f"  ✓ Updated {updated} agents")
        total_updated += updated

    print()
    print(f"Total agents updated: {total_updated}")
    print()
    print("Next: Run 04_consolidate_configs.py to create super-domain configs")


if __name__ == "__main__":
    main()

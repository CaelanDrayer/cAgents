#!/usr/bin/env python3
"""Fix filename/name mismatches in agent frontmatter."""

import re
from pathlib import Path


FILENAME_FIXES = {
    'genre-specialist-scifi.md': 'genre-specialist-scifi',
    'genre-specialist-fantasy.md': 'genre-specialist-fantasy',
}


def fix_agent_name(file_path, correct_name):
    """Update agent name in frontmatter to match filename."""
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

    # Update name field
    new_frontmatter = re.sub(
        r"^name:\s*.+",
        f"name: {correct_name}",
        frontmatter,
        count=1,
        flags=re.MULTILINE
    )

    if new_frontmatter == frontmatter:
        print(f"  ⚠ {file_path.name}: No name field found")
        return False

    # Write updated content
    new_content = f"---{new_frontmatter}---{body}"
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    print(f"  ✓ {file_path.name}: Updated name to '{correct_name}'")
    return True


def main():
    """Fix all filename mismatches."""
    project_root = Path(__file__).parent.parent.parent

    print("Fixing filename/name mismatches")
    print()

    fixed_count = 0

    # Find files with mismatches
    for filename, correct_name in FILENAME_FIXES.items():
        # Search in all agent directories
        found_paths = list(project_root.glob(f"*/agents/{filename}"))

        if not found_paths:
            print(f"  ⚠ {filename}: Not found")
            continue

        for file_path in found_paths:
            if fix_agent_name(file_path, correct_name):
                fixed_count += 1

    print()
    print(f"Total fixed: {fixed_count} agents")


if __name__ == '__main__':
    main()

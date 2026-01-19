#!/usr/bin/env python3
"""Populate controller catalogs in planner configs."""

import re
import yaml
from pathlib import Path


def get_controllers_for_domain(domain_dir):
    """Get list of controller agents in a domain."""
    agents_dir = domain_dir / 'agents'

    if not agents_dir.exists():
        return []

    controllers = []

    for agent_file in agents_dir.glob('*.md'):
        with open(agent_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse frontmatter
        if not content.startswith('---'):
            continue

        parts = content.split('---', 2)
        if len(parts) < 3:
            continue

        frontmatter = parts[1]

        # Check if tier is controller
        tier_match = re.search(r'^tier:\s*(.+)', frontmatter, re.MULTILINE)
        if tier_match and tier_match.group(1).strip() == 'controller':
            # Get agent name
            name_match = re.search(r'^name:\s*(.+)', frontmatter, re.MULTILINE)
            if name_match:
                controllers.append(name_match.group(1).strip())

    return sorted(controllers)


def update_planner_config(config_path, controllers):
    """Update planner config with controller catalog."""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # Update controller catalog
    if 'controller_catalog' not in config:
        config['controller_catalog'] = {}

    config['controller_catalog']['tier_2'] = controllers[:5] if len(controllers) > 5 else controllers
    config['controller_catalog']['tier_3'] = {
        'primary': controllers[:2] if len(controllers) > 2 else controllers[:1],
        'supporting': controllers[2:5] if len(controllers) > 5 else controllers[1:3] if len(controllers) > 1 else [],
    }

    # Write back
    with open(config_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    return len(controllers)


def main():
    """Populate controller catalogs for all super-domains."""
    project_root = Path(__file__).parent.parent.parent

    super_domains = ['make', 'grow', 'operate', 'people', 'serve']

    print("Populating controller catalogs")
    print("=" * 60)
    print()

    for domain in super_domains:
        domain_dir = project_root / domain
        config_path = domain_dir / 'config' / 'planner_config.yaml'

        if not config_path.exists():
            print(f"⚠ {domain}: No planner config found")
            continue

        # Get controllers
        controllers = get_controllers_for_domain(domain_dir)

        if not controllers:
            print(f"⚠ {domain}: No controllers found")
            continue

        # Update config
        controller_count = update_planner_config(config_path, controllers)

        print(f"✓ {domain}: Added {controller_count} controllers")
        print(f"  Tier 2: {', '.join(controllers[:5])}")
        print()

    print("=" * 60)
    print("✓ Controller catalogs populated")


if __name__ == '__main__':
    main()

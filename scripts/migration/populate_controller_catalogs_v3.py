#!/usr/bin/env python3
"""Populate controller catalogs with smart prioritization."""

import re
import yaml
from pathlib import Path


# Priority order for controllers by super-domain
CONTROLLER_PRIORITIES = {
    'make': [
        'engineering-manager',  # Primary for tier 2 engineering work
        'architect',
        'product-owner',
        'tech-lead',
        'backend-lead',
        'frontend-lead',
        'devops-lead',
        'qa-lead',
        'security-lead',
        'data-lead',
        'cto',
        'vp-engineering',
    ],
    'grow': [
        'campaign-manager',
        'marketing-strategist',
        'sales-strategist',
        'product-marketing-manager',
        'creative-director',
        'cro',
    ],
    'operate': [
        'operations-manager',
        'business-analyst',
        'change-manager',
        'supply-chain-manager',
        'cfo',
        'coo',
    ],
    'people': [
        'chro',
        'talent-acquisition-manager',
        'compensation-analyst',
    ],
    'serve': [
        'support-operations-manager',
        'customer-success-manager',
        'general-counsel',
        'legal-operations-manager',
    ],
}


def get_controller_definitions(domain_dir, super_domain):
    """Get list of controller definitions from a domain."""
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

            # Get coordination_style (should be question_based)
            coord_match = re.search(r'^coordination_style:\s*(.+)', frontmatter, re.MULTILINE)

            if name_match:
                controller_def = {
                    'name': name_match.group(1).strip(),
                    'domain': super_domain,
                    'coordination_style': coord_match.group(1).strip() if coord_match else 'question_based',
                }
                controllers.append(controller_def)

    # Sort by priority if defined, otherwise alphabetically
    priority_list = CONTROLLER_PRIORITIES.get(super_domain, [])

    def priority_key(controller):
        name = controller['name']
        if name in priority_list:
            return (0, priority_list.index(name))  # Prioritized
        else:
            return (1, name)  # Alphabetical

    return sorted(controllers, key=priority_key)


def update_planner_config(config_path, controllers, super_domain):
    """Update planner config with controller catalog."""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.safe_load(f)

    # Update controller catalog
    if 'controller_catalog' not in config:
        config['controller_catalog'] = {}

    # Tier 2: Select up to 5 controllers (prioritized)
    config['controller_catalog']['tier_2'] = controllers[:5] if len(controllers) > 5 else controllers

    # Tier 3: Primary (1-2) and supporting (2-4)
    tier_3_config = {}
    if len(controllers) > 0:
        tier_3_config['primary'] = controllers[:2] if len(controllers) > 2 else controllers[:1]

    if len(controllers) > 2:
        tier_3_config['supporting'] = controllers[2:5] if len(controllers) > 5 else controllers[2:]
    else:
        tier_3_config['supporting'] = []

    config['controller_catalog']['tier_3'] = tier_3_config

    # Write back
    with open(config_path, 'w', encoding='utf-8') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False)

    return len(controllers)


def main():
    """Populate controller catalogs for all super-domains."""
    project_root = Path(__file__).parent.parent.parent

    super_domains = ['make', 'grow', 'operate', 'people', 'serve']

    print("Populating controller catalogs (V3 - with smart prioritization)")
    print("=" * 60)
    print()

    for domain in super_domains:
        domain_dir = project_root / domain
        config_path = domain_dir / 'config' / 'planner_config.yaml'

        if not config_path.exists():
            print(f"⚠ {domain}: No planner config found")
            continue

        # Get controller definitions
        controllers = get_controller_definitions(domain_dir, domain)

        if not controllers:
            print(f"⚠ {domain}: No controllers found")
            continue

        # Update config
        controller_count = update_planner_config(config_path, controllers, domain)

        print(f"✓ {domain}: Added {controller_count} controllers")
        print(f"  Tier 2: {', '.join([c['name'] for c in controllers[:5]])}")
        print()

    print("=" * 60)
    print("✓ Controller catalogs populated with smart prioritization")


if __name__ == '__main__':
    main()

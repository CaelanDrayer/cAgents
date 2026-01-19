#!/usr/bin/env python3
"""
Migration Script 4: Consolidate Domain Configs
Creates 25 super-domain config files by consolidating old domain configs
"""

import yaml
from pathlib import Path
from typing import Dict, List, Any


# Super-domain to old-domain mapping
DOMAIN_MAPPING = {
    'make': ['engineering', 'creative', 'planning'],
    'grow': ['marketing', 'sales', 'revenue'],
    'operate': ['finance', 'finance-operations', 'business'],
    'people': ['people-culture', 'hr'],
    'serve': ['customer-experience', 'legal-compliance', 'legal', 'support'],
}


def load_old_config(project_root: Path, old_domain: str, config_type: str) -> Dict:
    """Load an old domain config file"""
    config_path = project_root / "Agent_Memory" / "_system" / "domains" / old_domain / f"{config_type}.yaml"

    if not config_path.exists():
        return {}

    with open(config_path) as f:
        return yaml.safe_load(f) or {}


def create_planner_config(super_domain: str, old_domains: List[str], project_root: Path) -> Dict:
    """Create consolidated planner_config.yaml for super-domain"""

    config = {
        'super_domain': super_domain,
        'description': f"Planning configuration for {super_domain.upper()} super-domain",
        'controller_catalog': {
            'tier_2': [],
            'tier_3': {
                'primary': [],
                'supporting': []
            }
        },
        'objectives_templates': {},
        'success_criteria_patterns': {}
    }

    # Consolidate controllers from old domains
    for old_domain in old_domains:
        old_config = load_old_config(project_root, old_domain, 'planner_config')

        if not old_config:
            continue

        # Merge tier 2 controllers
        old_tier_2 = old_config.get('controller_catalog', {}).get('tier_2', [])
        for controller in old_tier_2:
            # Update domain field
            controller['domain'] = super_domain
            config['controller_catalog']['tier_2'].append(controller)

        # Merge tier 3 controllers
        old_tier_3 = old_config.get('controller_catalog', {}).get('tier_3', {})
        config['controller_catalog']['tier_3']['primary'].extend(
            old_tier_3.get('primary', [])
        )
        config['controller_catalog']['tier_3']['supporting'].extend(
            old_tier_3.get('supporting', [])
        )

        # Merge templates
        config['objectives_templates'].update(
            old_config.get('objectives_templates', {})
        )
        config['success_criteria_patterns'].update(
            old_config.get('success_criteria_patterns', {})
        )

    # Remove duplicates
    seen_names = set()
    unique_tier_2 = []
    for controller in config['controller_catalog']['tier_2']:
        if controller['name'] not in seen_names:
            seen_names.add(controller['name'])
            unique_tier_2.append(controller)

    config['controller_catalog']['tier_2'] = unique_tier_2

    return config


def create_router_config(super_domain: str, old_domains: List[str], project_root: Path) -> Dict:
    """Create consolidated router_config.yaml for super-domain"""

    config = {
        'super_domain': super_domain,
        'description': f"Routing configuration for {super_domain.upper()} super-domain",
        'tier_classification': {
            'tier_1': {},
            'tier_2': {},
            'tier_3': {},
            'tier_4': {}
        },
        'keywords': [],
        'complexity_indicators': []
    }

    # Consolidate routing patterns
    for old_domain in old_domains:
        old_config = load_old_config(project_root, old_domain, 'router_config')

        if not old_config:
            continue

        # Merge keywords
        config['keywords'].extend(old_config.get('keywords', []))

        # Merge complexity indicators
        config['complexity_indicators'].extend(
            old_config.get('complexity_indicators', [])
        )

        # Merge tier classification
        for tier in ['tier_1', 'tier_2', 'tier_3', 'tier_4']:
            old_tier_config = old_config.get('tier_classification', {}).get(tier, {})
            config['tier_classification'][tier].update(old_tier_config)

    # Remove duplicates
    config['keywords'] = list(set(config['keywords']))

    return config


def create_executor_config(super_domain: str, old_domains: List[str], project_root: Path) -> Dict:
    """Create consolidated executor_config.yaml for super-domain"""

    config = {
        'super_domain': super_domain,
        'description': f"Execution monitoring for {super_domain.upper()} super-domain",
        'monitoring_patterns': {
            'controller_tracking': {},
            'progress_indicators': [],
            'completion_criteria': []
        }
    }

    # Consolidate executor patterns
    for old_domain in old_domains:
        old_config = load_old_config(project_root, old_domain, 'executor_config')

        if not old_config:
            continue

        # Merge monitoring patterns
        old_patterns = old_config.get('monitoring_patterns', {})
        config['monitoring_patterns']['controller_tracking'].update(
            old_patterns.get('controller_tracking', {})
        )
        config['monitoring_patterns']['progress_indicators'].extend(
            old_patterns.get('progress_indicators', [])
        )
        config['monitoring_patterns']['completion_criteria'].extend(
            old_patterns.get('completion_criteria', [])
        )

    return config


def create_validator_config(super_domain: str, old_domains: List[str], project_root: Path) -> Dict:
    """Create consolidated validator_config.yaml for super-domain"""

    config = {
        'super_domain': super_domain,
        'description': f"Validation rules for {super_domain.upper()} super-domain",
        'quality_gates': {
            'coordination_quality': {},
            'output_quality': {},
            'regression_checks': []
        }
    }

    # Consolidate validation patterns
    for old_domain in old_domains:
        old_config = load_old_config(project_root, old_domain, 'validator_config')

        if not old_config:
            continue

        # Merge quality gates
        old_gates = old_config.get('quality_gates', {})
        config['quality_gates']['coordination_quality'].update(
            old_gates.get('coordination_quality', {})
        )
        config['quality_gates']['output_quality'].update(
            old_gates.get('output_quality', {})
        )
        config['quality_gates']['regression_checks'].extend(
            old_gates.get('regression_checks', [])
        )

    return config


def create_self_correct_config(super_domain: str, old_domains: List[str], project_root: Path) -> Dict:
    """Create consolidated self_correct_config.yaml for super-domain"""

    config = {
        'super_domain': super_domain,
        'description': f"Self-correction patterns for {super_domain.upper()} super-domain",
        'recovery_patterns': {
            'coordination_failures': [],
            'execution_failures': [],
            'validation_failures': []
        }
    }

    # Consolidate recovery patterns
    for old_domain in old_domains:
        old_config = load_old_config(project_root, old_domain, 'self_correct_config')

        if not old_config:
            continue

        # Merge recovery patterns
        old_patterns = old_config.get('recovery_patterns', {})
        config['recovery_patterns']['coordination_failures'].extend(
            old_patterns.get('coordination_failures', [])
        )
        config['recovery_patterns']['execution_failures'].extend(
            old_patterns.get('execution_failures', [])
        )
        config['recovery_patterns']['validation_failures'].extend(
            old_patterns.get('validation_failures', [])
        )

    return config


def main():
    project_root = Path("/home/PathingIT/cAgents")

    print("=== Phase 2.3: Consolidating Domain Configs ===")
    print()

    config_types = [
        ('router_config', create_router_config),
        ('planner_config', create_planner_config),
        ('executor_config', create_executor_config),
        ('validator_config', create_validator_config),
        ('self_correct_config', create_self_correct_config),
    ]

    total_created = 0

    for super_domain, old_domains in DOMAIN_MAPPING.items():
        print(f"Creating configs for {super_domain.upper()} (from {', '.join(old_domains)})...")

        config_dir = project_root / super_domain / "config"
        config_dir.mkdir(parents=True, exist_ok=True)

        for config_name, create_func in config_types:
            config = create_func(super_domain, old_domains, project_root)

            # Write config file
            config_path = config_dir / f"{config_name}.yaml"
            with open(config_path, 'w') as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)

            total_created += 1
            print(f"  ✓ {config_name}.yaml")

    print()
    print(f"Total configs created: {total_created}")
    print(f"Expected: 25 (5 super-domains × 5 configs)")
    print()
    print("Next: Run 05_cleanup.sh to remove old domain directories")


if __name__ == "__main__":
    main()

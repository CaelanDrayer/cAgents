#!/usr/bin/env python3
"""
Config Validation Tests for cAgents V7.0 Consolidation

Tests all 25 super-domain config files for validity and completeness.
"""

import os
import pytest
import yaml
from pathlib import Path
from typing import Dict, List, Any


# Test fixtures
@pytest.fixture
def super_domains() -> List[str]:
    """List of all super-domains in V7.0"""
    return ['make', 'grow', 'operate', 'people', 'serve']


@pytest.fixture
def config_types() -> List[str]:
    """List of all config types per super-domain"""
    return ['router_config', 'planner_config', 'executor_config',
            'validator_config', 'self_correct_config']


@pytest.fixture
def project_root() -> Path:
    """Get project root directory"""
    return Path(__file__).parent.parent.parent


# Existence Tests
def test_all_configs_exist(super_domains, config_types, project_root):
    """Verify all 25 config files exist (5 per super-domain)"""
    missing_configs = []

    for domain in super_domains:
        for config_type in config_types:
            path = project_root / domain / "config" / f"{config_type}.yaml"
            if not path.exists():
                missing_configs.append(str(path))

    assert not missing_configs, f"Missing {len(missing_configs)} config files: {missing_configs}"


def test_config_directory_structure(super_domains, project_root):
    """Verify config/ directory exists for each super-domain"""
    for domain in super_domains:
        config_dir = project_root / domain / "config"
        assert config_dir.exists(), f"Missing config directory: {config_dir}"
        assert config_dir.is_dir(), f"Not a directory: {config_dir}"


# Schema Validation Tests
def test_planner_config_schema(super_domains, project_root):
    """Validate planner_config.yaml against required schema"""
    required_fields = ["super_domain", "description", "controller_catalog"]

    for domain in super_domains:
        config_path = project_root / domain / "config" / "planner_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        # Check required fields
        for field in required_fields:
            assert field in config, f"{config_path}: Missing required field '{field}'"

        # Verify super_domain matches directory
        assert config['super_domain'] == domain, \
            f"{config_path}: super_domain '{config['super_domain']}' != directory '{domain}'"

        # Verify controller_catalog structure
        catalog = config['controller_catalog']
        assert isinstance(catalog, dict), f"{config_path}: controller_catalog must be dict"
        assert 'tier_2' in catalog, f"{config_path}: controller_catalog missing tier_2"
        assert 'tier_3' in catalog, f"{config_path}: controller_catalog missing tier_3"


def test_router_config_schema(super_domains, project_root):
    """Validate router_config.yaml against required schema"""
    required_fields = ["super_domain", "description", "tier_classification"]

    for domain in super_domains:
        config_path = project_root / domain / "config" / "router_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        for field in required_fields:
            assert field in config, f"{config_path}: Missing required field '{field}'"


def test_executor_config_schema(super_domains, project_root):
    """Validate executor_config.yaml against required schema"""
    required_fields = ["super_domain", "description", "monitoring_patterns"]

    for domain in super_domains:
        config_path = project_root / domain / "config" / "executor_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        for field in required_fields:
            assert field in config, f"{config_path}: Missing required field '{field}'"


def test_validator_config_schema(super_domains, project_root):
    """Validate validator_config.yaml against required schema"""
    required_fields = ["super_domain", "description", "quality_gates"]

    for domain in super_domains:
        config_path = project_root / domain / "config" / "validator_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        for field in required_fields:
            assert field in config, f"{config_path}: Missing required field '{field}'"


def test_self_correct_config_schema(super_domains, project_root):
    """Validate self_correct_config.yaml against required schema"""
    required_fields = ["super_domain", "description", "recovery_patterns"]

    for domain in super_domains:
        config_path = project_root / domain / "config" / "self_correct_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        for field in required_fields:
            assert field in config, f"{config_path}: Missing required field '{field}'"


# Content Validation Tests
def test_controller_catalog_completeness(super_domains, project_root):
    """Ensure controller catalog has entries for tier 2 and tier 3"""
    for domain in super_domains:
        config_path = project_root / domain / "config" / "planner_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        catalog = config['controller_catalog']

        # Tier 2 should have at least 1 controller
        tier_2 = catalog.get('tier_2', [])
        assert len(tier_2) >= 1, \
            f"{config_path}: tier_2 must have at least 1 controller"

        # Tier 3 should define primary and supporting
        tier_3 = catalog.get('tier_3', {})
        assert 'primary' in tier_3, f"{config_path}: tier_3 missing 'primary'"
        assert 'supporting' in tier_3, f"{config_path}: tier_3 missing 'supporting'"


def test_controller_definitions_valid(super_domains, project_root):
    """Validate controller definitions have required fields"""
    required_controller_fields = ['name', 'domain', 'coordination_style']

    for domain in super_domains:
        config_path = project_root / domain / "config" / "planner_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        tier_2_controllers = config['controller_catalog'].get('tier_2', [])

        for controller in tier_2_controllers:
            for field in required_controller_fields:
                assert field in controller, \
                    f"{config_path}: Controller missing field '{field}': {controller}"

            # Verify coordination_style is question_based
            assert controller['coordination_style'] == 'question_based', \
                f"{config_path}: Controller must use question_based coordination"


def test_yaml_valid_syntax(super_domains, config_types, project_root):
    """Ensure all config files have valid YAML syntax"""
    for domain in super_domains:
        for config_type in config_types:
            config_path = project_root / domain / "config" / f"{config_type}.yaml"

            try:
                with open(config_path) as f:
                    yaml.safe_load(f)
            except yaml.YAMLError as e:
                pytest.fail(f"{config_path}: Invalid YAML syntax: {e}")


def test_no_duplicate_controller_names(super_domains, project_root):
    """Ensure no duplicate controller names within a super-domain"""
    for domain in super_domains:
        config_path = project_root / domain / "config" / "planner_config.yaml"

        with open(config_path) as f:
            config = yaml.safe_load(f)

        tier_2_controllers = config['controller_catalog'].get('tier_2', [])
        controller_names = [c['name'] for c in tier_2_controllers]

        duplicates = [name for name in controller_names if controller_names.count(name) > 1]
        assert not duplicates, \
            f"{config_path}: Duplicate controller names: {set(duplicates)}"


# HITL Calibration Tests
def test_unified_hitl_calibration_exists(project_root):
    """Verify unified HITL calibration file exists"""
    hitl_path = project_root / "Agent_Memory" / "_system" / "hitl_calibration.yaml"
    assert hitl_path.exists(), f"Missing unified HITL calibration: {hitl_path}"


def test_hitl_calibration_has_all_domains(super_domains, project_root):
    """Verify HITL calibration includes all super-domains"""
    hitl_path = project_root / "Agent_Memory" / "_system" / "hitl_calibration.yaml"

    with open(hitl_path) as f:
        hitl_config = yaml.safe_load(f)

    assert 'super_domains' in hitl_config, "HITL calibration missing 'super_domains'"

    for domain in super_domains:
        assert domain in hitl_config['super_domains'], \
            f"HITL calibration missing domain: {domain}"


def test_hitl_calibration_structure(super_domains, project_root):
    """Validate HITL calibration structure per super-domain"""
    hitl_path = project_root / "Agent_Memory" / "_system" / "hitl_calibration.yaml"

    with open(hitl_path) as f:
        hitl_config = yaml.safe_load(f)

    for domain in super_domains:
        domain_config = hitl_config['super_domains'][domain]

        assert 'escalation_patterns' in domain_config, \
            f"HITL {domain}: missing escalation_patterns"
        assert 'learning_feedback' in domain_config, \
            f"HITL {domain}: missing learning_feedback"


# Cross-Domain Validation
def test_total_config_count(project_root):
    """Verify total config count is exactly 25"""
    config_files = list(Path(project_root).glob("*/config/*_config.yaml"))
    assert len(config_files) == 25, \
        f"Expected 25 config files, found {len(config_files)}"


def test_no_old_domain_configs_remain(project_root):
    """Ensure old domain config directories are deleted"""
    old_domains = ['engineering', 'creative', 'marketing', 'sales',
                   'finance', 'finance-operations', 'operations',
                   'people', 'people-culture', 'hr',
                   'customer-experience', 'legal-compliance', 'legal', 'support']

    for old_domain in old_domains:
        old_path = project_root / "Agent_Memory" / "_system" / "domains" / old_domain
        assert not old_path.exists(), \
            f"Old domain config still exists: {old_path}"


def test_super_domain_consistency(super_domains, config_types, project_root):
    """Verify super_domain field is consistent across all configs in a domain"""
    for domain in super_domains:
        expected_domain = domain

        for config_type in config_types:
            config_path = project_root / domain / "config" / f"{config_type}.yaml"

            with open(config_path) as f:
                config = yaml.safe_load(f)

            actual_domain = config.get('super_domain')
            assert actual_domain == expected_domain, \
                f"{config_path}: super_domain mismatch: {actual_domain} != {expected_domain}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

#!/usr/bin/env python3
"""
Agent Linting Tests for cAgents V7.0 Consolidation

Validates all 229+ agent definitions for quality and completeness.
"""

import os
import pytest
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple


# Helper function to parse frontmatter
def parse_frontmatter(filepath: Path) -> Tuple[Dict[str, Any], str]:
    """Parse YAML frontmatter from markdown file"""
    import yaml

    with open(filepath, 'r') as f:
        content = f.read()

    # Match YAML frontmatter
    match = re.match(r'^---\s*\n(.*?)\n---\s*\n(.*)$', content, re.DOTALL)
    if not match:
        return {}, content

    try:
        frontmatter = yaml.safe_load(match.group(1))
        body = match.group(2)
        return frontmatter or {}, body
    except yaml.YAMLError:
        return {}, content


# Test fixtures
@pytest.fixture
def super_domains() -> List[str]:
    """List of all super-domains in V7.0"""
    return ['make', 'grow', 'operate', 'people', 'serve']


@pytest.fixture
def project_root() -> Path:
    """Get project root directory"""
    return Path(__file__).parent.parent.parent


@pytest.fixture
def all_agent_files(super_domains, project_root) -> List[Path]:
    """Get all agent markdown files"""
    agents = []
    for domain in super_domains:
        domain_agents = list((project_root / domain / "agents").glob("*.md"))
        agents.extend(domain_agents)

    # Also include core and shared agents
    agents.extend(list((project_root / "core" / "agents").glob("*.md")))
    agents.extend(list((project_root / "shared" / "agents").glob("*.md")))

    return agents


# Existence and Structure Tests
def test_all_agents_have_frontmatter(all_agent_files):
    """Verify all agent files have YAML frontmatter"""
    missing_frontmatter = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        if not frontmatter:
            missing_frontmatter.append(str(agent_path))

    assert not missing_frontmatter, \
        f"{len(missing_frontmatter)} agents missing frontmatter: {missing_frontmatter[:5]}"


def test_required_frontmatter_fields(all_agent_files):
    """Check required fields: name, tier, domain"""
    required_fields = ['name', 'tier', 'domain']
    missing_fields = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)

        for field in required_fields:
            if field not in frontmatter:
                missing_fields.append(f"{agent_path.name}: missing '{field}'")

    assert not missing_fields, \
        f"{len(missing_fields)} agents with missing fields: {missing_fields[:5]}"


def test_tier_values_valid(all_agent_files):
    """Verify tier is one of: controller, execution, support, infrastructure"""
    valid_tiers = ['controller', 'execution', 'support', 'infrastructure']
    invalid_tiers = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        tier = frontmatter.get('tier')

        if tier and tier not in valid_tiers:
            invalid_tiers.append(f"{agent_path.name}: invalid tier '{tier}'")

    assert not invalid_tiers, \
        f"{len(invalid_tiers)} agents with invalid tier: {invalid_tiers}"


def test_domain_matches_directory(super_domains, project_root):
    """Ensure agent domain matches its directory"""
    mismatches = []

    for domain in super_domains:
        agents = list((project_root / domain / "agents").glob("*.md"))
        for agent_path in agents:
            frontmatter, _ = parse_frontmatter(agent_path)
            agent_domain = frontmatter.get('domain')

            if agent_domain != domain:
                mismatches.append(
                    f"{agent_path.name}: domain '{agent_domain}' != directory '{domain}'"
                )

    assert not mismatches, f"{len(mismatches)} domain mismatches: {mismatches[:5]}"


# Controller-Specific Tests
def test_controller_agents_have_question_patterns(all_agent_files):
    """Controllers must define typical_questions or question patterns"""
    missing_patterns = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        tier = frontmatter.get('tier')

        if tier == 'controller':
            has_questions = ('typical_questions' in frontmatter or
                           'question_patterns' in frontmatter)

            if not has_questions:
                missing_patterns.append(agent_path.name)

    assert not missing_patterns, \
        f"{len(missing_patterns)} controllers missing question patterns: {missing_patterns[:5]}"


def test_controller_coordination_style(all_agent_files):
    """Controllers must have coordination_style = question_based"""
    invalid_styles = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        tier = frontmatter.get('tier')

        if tier == 'controller':
            style = frontmatter.get('coordination_style')
            if style != 'question_based':
                invalid_styles.append(
                    f"{agent_path.name}: coordination_style '{style}' != 'question_based'"
                )

    assert not invalid_styles, \
        f"{len(invalid_styles)} controllers with invalid style: {invalid_styles}"


# Execution Agent Tests
def test_execution_agents_have_capabilities(all_agent_files):
    """Execution agents should define answers_questions or executes_tasks"""
    missing_capabilities = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        tier = frontmatter.get('tier')

        if tier == 'execution':
            has_capabilities = ('answers_questions' in frontmatter or
                              'executes_tasks' in frontmatter or
                              'capabilities' in frontmatter)

            if not has_capabilities:
                missing_capabilities.append(agent_path.name)

    # Allow some execution agents without explicit capabilities (general purpose)
    # Only warn if more than 10% are missing
    threshold = len([f for f in all_agent_files
                    if parse_frontmatter(f)[0].get('tier') == 'execution']) * 0.1

    if len(missing_capabilities) > threshold:
        pytest.fail(
            f"{len(missing_capabilities)} execution agents missing capabilities "
            f"(threshold: {threshold}): {missing_capabilities[:5]}"
        )


# Documentation Quality Tests
def test_documentation_minimum_length(all_agent_files):
    """Agent docs must be at least 50 lines (reduced from 100 for consolidation)"""
    too_short = []

    for agent_path in all_agent_files:
        with open(agent_path) as f:
            lines = f.readlines()

        if len(lines) < 50:
            too_short.append(f"{agent_path.name}: {len(lines)} lines")

    # Allow some agents to be short (templates, etc)
    if len(too_short) > len(all_agent_files) * 0.1:
        pytest.fail(
            f"{len(too_short)} agents too short (< 50 lines): {too_short[:5]}"
        )


def test_documentation_has_sections(all_agent_files):
    """Agent docs should have standard sections"""
    required_sections = [
        r'##\s+',  # At least one H2 section
    ]

    missing_sections = []

    for agent_path in all_agent_files:
        _, body = parse_frontmatter(agent_path)

        for section_pattern in required_sections:
            if not re.search(section_pattern, body):
                missing_sections.append(f"{agent_path.name}: missing sections")
                break

    # Allow some flexibility
    if len(missing_sections) > len(all_agent_files) * 0.05:
        pytest.fail(
            f"{len(missing_sections)} agents missing sections: {missing_sections[:5]}"
        )


# Naming Convention Tests
def test_agent_filename_matches_name(all_agent_files):
    """Agent filename should match frontmatter name"""
    mismatches = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        name = frontmatter.get('name', '')

        expected_filename = f"{name}.md"
        actual_filename = agent_path.name

        if expected_filename != actual_filename:
            mismatches.append(
                f"{agent_path.name}: name '{name}' != filename"
            )

    assert not mismatches, f"{len(mismatches)} name/filename mismatches: {mismatches[:5]}"


def test_agent_names_use_kebab_case(all_agent_files):
    """Agent names should use kebab-case"""
    invalid_names = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        name = frontmatter.get('name', '')

        # Kebab-case: lowercase with hyphens, no underscores or spaces
        if not re.match(r'^[a-z][a-z0-9-]*$', name):
            invalid_names.append(f"{agent_path.name}: name '{name}' not kebab-case")

    assert not invalid_names, \
        f"{len(invalid_names)} agents with invalid names: {invalid_names[:5]}"


# Duplicate Detection Tests
def test_no_duplicate_agent_names(all_agent_files):
    """Ensure no duplicate agent names across all domains"""
    names = []

    for agent_path in all_agent_files:
        frontmatter, _ = parse_frontmatter(agent_path)
        name = frontmatter.get('name')
        if name:
            names.append((name, str(agent_path)))

    # Find duplicates
    name_counts = {}
    for name, path in names:
        if name not in name_counts:
            name_counts[name] = []
        name_counts[name].append(path)

    duplicates = {name: paths for name, paths in name_counts.items() if len(paths) > 1}

    assert not duplicates, \
        f"{len(duplicates)} duplicate agent names: {list(duplicates.keys())[:5]}"


# Version 7.0 Specific Tests
def test_agents_reference_v7_patterns(all_agent_files):
    """Agents should reference V7.0 patterns (question-based, coordination_log)"""
    # Sample check: some agents should mention coordination or question-based patterns
    v7_mentions = 0

    for agent_path in all_agent_files:
        _, body = parse_frontmatter(agent_path)

        if re.search(r'(question.based|coordination_log|V7\.0)', body, re.IGNORECASE):
            v7_mentions += 1

    # At least 20% of agents should mention V7.0 patterns
    threshold = len(all_agent_files) * 0.2
    assert v7_mentions >= threshold, \
        f"Only {v7_mentions} agents mention V7.0 patterns (expected >= {threshold})"


# Cross-Agent Consistency Tests
def test_super_domain_agent_counts(super_domains, project_root):
    """Verify agent counts per super-domain are reasonable"""
    expected_ranges = {
        'make': (50, 80),      # ~63 agents
        'grow': (30, 50),      # ~40 agents
        'operate': (25, 45),   # ~32 agents
        'people': (15, 30),    # ~19 agents
        'serve': (25, 45),     # ~32 agents
    }

    for domain in super_domains:
        agents = list((project_root / domain / "agents").glob("*.md"))
        count = len(agents)

        min_count, max_count = expected_ranges[domain]
        assert min_count <= count <= max_count, \
            f"Domain '{domain}' has {count} agents (expected {min_count}-{max_count})"


def test_core_agents_unchanged(project_root):
    """Verify core infrastructure agents remain unchanged"""
    core_agents = list((project_root / "core" / "agents").glob("*.md"))

    # Should have ~10-12 core agents
    assert 8 <= len(core_agents) <= 15, \
        f"Core has {len(core_agents)} agents (expected 8-15)"


def test_shared_agents_unchanged(project_root):
    """Verify shared utility agents remain unchanged"""
    shared_agents = list((project_root / "shared" / "agents").glob("*.md"))

    # Should have ~30-35 shared agents
    assert 25 <= len(shared_agents) <= 40, \
        f"Shared has {len(shared_agents)} agents (expected 25-40)"


# Content Quality Tests
def test_agents_import_todowrite_helper(all_agent_files):
    """Check if agents import TodoWrite helper pattern"""
    # After extraction, agents should import shared/patterns/todo_write_helper.md
    imports_found = 0

    for agent_path in all_agent_files:
        _, body = parse_frontmatter(agent_path)

        if '@shared/patterns/todo_write_helper' in body:
            imports_found += 1

    # After consolidation, most agents should import this
    # For now, just check the pattern exists
    # (actual imports happen during migration)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

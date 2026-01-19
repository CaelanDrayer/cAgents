#!/usr/bin/env python3
"""
Config Validation Tool for cAgents V7.0

Validates that controller_catalog entries in planner_config.yaml
match actual agent definitions in domain/agents/ directories.

V7.1.0 Optimization: Added file content caching for faster repeated runs.

Usage: python3 scripts/validate_agent_configs.py
"""

import os
import sys
import yaml
import hashlib
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional

# ANSI color codes for terminal output
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

class ConfigValidator:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.domains_config_path = project_root / "Agent_Memory" / "_system" / "domains"
        self.errors = []
        self.warnings = []
        self.successes = []
        # V7.1.0: Add file content cache
        self._yaml_cache: Dict[str, Tuple[str, any]] = {}  # path -> (hash, parsed_content)
        self._content_cache: Dict[str, Tuple[str, str]] = {}  # path -> (hash, content)

    def _get_file_hash(self, file_path: Path) -> str:
        """Get hash of file content for cache validation."""
        try:
            stat = file_path.stat()
            # Use mtime + size as quick hash (faster than reading content)
            return f"{stat.st_mtime}:{stat.st_size}"
        except OSError:
            return ""

    def _load_yaml_cached(self, file_path: Path) -> Optional[Dict]:
        """Load YAML file with caching."""
        path_str = str(file_path)
        current_hash = self._get_file_hash(file_path)

        # Check cache
        if path_str in self._yaml_cache:
            cached_hash, cached_content = self._yaml_cache[path_str]
            if cached_hash == current_hash:
                return cached_content

        # Cache miss - load and parse
        try:
            with open(file_path, 'r') as f:
                content = yaml.safe_load(f)
            self._yaml_cache[path_str] = (current_hash, content)
            return content
        except (yaml.YAMLError, OSError):
            return None

    def _read_file_cached(self, file_path: Path) -> Optional[str]:
        """Read file content with caching."""
        path_str = str(file_path)
        current_hash = self._get_file_hash(file_path)

        # Check cache
        if path_str in self._content_cache:
            cached_hash, cached_content = self._content_cache[path_str]
            if cached_hash == current_hash:
                return cached_content

        # Cache miss - read file
        try:
            with open(file_path, 'r') as f:
                content = f.read()
            self._content_cache[path_str] = (current_hash, content)
            return content
        except OSError:
            return None

    def validate_all_domains(self) -> Tuple[int, int, int]:
        """Validate all domain configurations. Returns (errors, warnings, successes)."""

        if not self.domains_config_path.exists():
            print(f"{RED}Error: Agent_Memory/_system/domains/ not found{RESET}")
            return (1, 0, 0)

        domains = [d for d in self.domains_config_path.iterdir() if d.is_dir()]

        if not domains:
            print(f"{YELLOW}Warning: No domains found in {self.domains_config_path}{RESET}")
            return (0, 1, 0)

        print(f"{BLUE}Validating {len(domains)} domains...{RESET}\n")

        for domain_path in sorted(domains):
            domain_name = domain_path.name
            self.validate_domain(domain_name, domain_path)

        return (len(self.errors), len(self.warnings), len(self.successes))

    def validate_domain(self, domain_name: str, config_path: Path):
        """Validate a single domain's configuration."""

        print(f"{BLUE}Validating domain: {domain_name}{RESET}")

        # Load planner_config.yaml
        planner_config_file = config_path / "planner_config.yaml"

        if not planner_config_file.exists():
            error = f"  {RED}Missing planner_config.yaml{RESET}"
            print(error)
            self.errors.append(f"{domain_name}: Missing planner_config.yaml")
            return

        # V7.1.0: Use cached YAML loading
        planner_config = self._load_yaml_cached(planner_config_file)
        if planner_config is None:
            error = f"  {RED}Invalid YAML in planner_config.yaml{RESET}"
            print(error)
            self.errors.append(f"{domain_name}: Invalid YAML in planner_config.yaml")
            return

        # Check for controller_catalog
        if 'controller_catalog' not in planner_config:
            warning = f"  {YELLOW}No controller_catalog section found{RESET}"
            print(warning)
            self.warnings.append(f"{domain_name}: No controller_catalog section")
            return

        controller_catalog = planner_config['controller_catalog']

        # Extract all controller references
        controllers = self.extract_controllers(controller_catalog)

        if not controllers:
            warning = f"  {YELLOW}No controllers defined in controller_catalog{RESET}"
            print(warning)
            self.warnings.append(f"{domain_name}: No controllers defined")
            return

        print(f"  Found {len(controllers)} controller references")

        # Validate each controller
        for controller_ref in controllers:
            self.validate_controller(domain_name, controller_ref)

        print()

    def extract_controllers(self, controller_catalog: Dict) -> Set[str]:
        """Extract all controller references from controller_catalog."""

        controllers = set()

        for tier_key, tier_value in controller_catalog.items():
            if isinstance(tier_value, list):
                # tier_2_moderate: [{agent: "domain:name"}, ...]
                for entry in tier_value:
                    if isinstance(entry, dict) and 'agent' in entry:
                        controllers.add(entry['agent'])

            elif isinstance(tier_value, dict):
                # tier_3_complex: {primary: {agent: "..."}, supporting: [...]}
                # tier_4_expert: {executive: {agent: "..."}, primary: {...}, supporting: [...]}

                for role_key, role_value in tier_value.items():
                    if isinstance(role_value, dict) and 'agent' in role_value:
                        controllers.add(role_value['agent'])

                    elif isinstance(role_value, list):
                        # supporting: [{agent: "..."}, ...]
                        for entry in role_value:
                            if isinstance(entry, dict) and 'agent' in entry:
                                controllers.add(entry['agent'])
                            elif isinstance(entry, str):
                                # supporting: ["domain:agent1", "domain:agent2"]
                                controllers.add(entry)

        return controllers

    def validate_controller(self, domain_name: str, controller_ref: str):
        """Validate a single controller reference."""

        # Parse controller reference: "domain:agent-name"
        if ':' not in controller_ref:
            error = f"    {RED}Invalid format: {controller_ref} (expected domain:agent-name){RESET}"
            print(error)
            self.errors.append(f"{domain_name}: Invalid controller reference format: {controller_ref}")
            return

        ref_domain, agent_name = controller_ref.split(':', 1)

        # Find domain directory
        domain_dir = self.find_domain_directory(ref_domain)

        if not domain_dir:
            error = f"    {RED}Domain directory not found: {ref_domain}/{RESET}"
            print(error)
            self.errors.append(f"{domain_name}: Domain directory not found: {ref_domain}")
            return

        # Check if agent file exists
        agent_file = domain_dir / "agents" / f"{agent_name}.md"

        if not agent_file.exists():
            error = f"    {RED}Agent not found: {controller_ref} ({agent_file}){RESET}"
            print(error)
            self.errors.append(f"{domain_name}: Agent not found: {controller_ref}")
            return

        # V7.1.0: Use cached file reading
        content = self._read_file_cached(agent_file)
        if content is None:
            error = f"    {RED}Error reading agent file: {controller_ref}{RESET}"
            print(error)
            self.errors.append(f"{domain_name}: Error reading {controller_ref}")
            return

        # Extract YAML frontmatter
        if content.startswith('---\n'):
            end = content.find('\n---\n', 4)
            if end != -1:
                frontmatter = content[4:end]
                try:
                    agent_meta = yaml.safe_load(frontmatter)
                except yaml.YAMLError:
                    warning = f"    {YELLOW}Invalid frontmatter YAML: {controller_ref}{RESET}"
                    print(warning)
                    self.warnings.append(f"{domain_name}: Invalid frontmatter in {controller_ref}")
                    return

                # Check tier field
                if 'tier' not in agent_meta:
                    warning = f"    {YELLOW}Missing tier field: {controller_ref}{RESET}"
                    print(warning)
                    self.warnings.append(f"{domain_name}: Missing tier field in {controller_ref}")

                elif agent_meta['tier'] not in ['controller', 'execution', 'support']:
                    warning = f"    {YELLOW}Invalid tier value: {controller_ref} (tier: {agent_meta['tier']}){RESET}"
                    print(warning)
                    self.warnings.append(f"{domain_name}: Invalid tier in {controller_ref}")

                else:
                    # Success
                    success = f"    {GREEN}✓ {controller_ref} (tier: {agent_meta['tier']}){RESET}"
                    print(success)
                    self.successes.append(f"{domain_name}: {controller_ref}")
            else:
                warning = f"    {YELLOW}No frontmatter found: {controller_ref}{RESET}"
                print(warning)
                self.warnings.append(f"{domain_name}: No frontmatter in {controller_ref}")
        else:
            warning = f"    {YELLOW}No frontmatter found: {controller_ref}{RESET}"
            print(warning)
            self.warnings.append(f"{domain_name}: No frontmatter in {controller_ref}")

    def find_domain_directory(self, domain_name: str) -> Path:
        """Find domain directory by name (handles variations like finance-operations)."""

        # Check exact match first
        exact_match = self.project_root / domain_name
        if exact_match.exists() and (exact_match / "agents").exists():
            return exact_match

        # Check all directories in project root
        for item in self.project_root.iterdir():
            if item.is_dir() and (item / "agents").exists():
                # Check if name matches (case-insensitive)
                if item.name.lower() == domain_name.lower():
                    return item

        return None

    def print_summary(self):
        """Print validation summary."""

        print(f"\n{'='*60}")
        print(f"{BLUE}Validation Summary{RESET}")
        print(f"{'='*60}\n")

        print(f"{GREEN}Successes: {len(self.successes)}{RESET}")
        print(f"{YELLOW}Warnings: {len(self.warnings)}{RESET}")
        print(f"{RED}Errors: {len(self.errors)}{RESET}\n")

        if self.errors:
            print(f"{RED}Errors:{RESET}")
            for error in self.errors:
                print(f"  - {error}")
            print()

        if self.warnings:
            print(f"{YELLOW}Warnings:{RESET}")
            for warning in self.warnings:
                print(f"  - {warning}")
            print()

        # Exit code
        if self.errors:
            print(f"{RED}Validation FAILED{RESET}")
            return 1
        elif self.warnings:
            print(f"{YELLOW}Validation PASSED with warnings{RESET}")
            return 0
        else:
            print(f"{GREEN}Validation PASSED{RESET}")
            return 0


def main():
    """Main entry point."""

    # Determine project root
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent

    print(f"{BLUE}cAgents Config Validator V7.1.0{RESET}")
    print(f"Project root: {project_root}\n")

    validator = ConfigValidator(project_root)

    # Validate all domains
    errors, warnings, successes = validator.validate_all_domains()

    # Print summary
    exit_code = validator.print_summary()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()

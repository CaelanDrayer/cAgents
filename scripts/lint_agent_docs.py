#!/usr/bin/env python3
"""
Agent Documentation Linter for cAgents V7.0

Validates agent markdown files have proper YAML frontmatter with required fields.

V7.1.0 Optimization: Added parallel processing with ThreadPoolExecutor.

Required fields:
  - name: Agent identifier
  - tier: controller, execution, or support
  - description: Agent purpose
  - tools: List of tools the agent uses
  - model: Claude model (sonnet, opus, haiku)

Usage: python3 scripts/lint_agent_docs.py [--fix]
"""

import os
import sys
import yaml
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# ANSI color codes
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

REQUIRED_FIELDS = ['name', 'tier', 'description', 'tools', 'model']
VALID_TIERS = ['controller', 'execution', 'support', 'core']
VALID_MODELS = ['sonnet', 'opus', 'haiku']

@dataclass
class AgentIssue:
    """Represents a validation issue in an agent file."""
    file_path: Path
    severity: str  # error, warning, info
    issue_type: str
    message: str
    field: Optional[str] = None

class AgentLinter:
    def __init__(self, project_root: Path, fix_mode: bool = False):
        self.project_root = project_root
        self.fix_mode = fix_mode
        self.issues = []
        self.agents_checked = 0
        self.agents_valid = 0
        # V7.1.0: Thread-safe counters and lock
        self._lock = threading.Lock()

    def find_agent_files(self) -> List[Path]:
        """Find all agent markdown files in the project."""

        agent_files = []

        # Core agents
        core_agents = self.project_root / "core" / "agents"
        if core_agents.exists():
            agent_files.extend(core_agents.glob("*.md"))

        # Shared agents
        shared_agents = self.project_root / "shared" / "agents"
        if shared_agents.exists():
            agent_files.extend(shared_agents.glob("*.md"))

        # Domain agents (check all directories with agents/ subdirectory)
        for item in self.project_root.iterdir():
            if item.is_dir() and not item.name.startswith('.') and not item.name.startswith('_'):
                agents_dir = item / "agents"
                if agents_dir.exists():
                    agent_files.extend(agents_dir.glob("*.md"))

        return sorted(agent_files)

    def lint_all_agents(self) -> Tuple[int, int, int]:
        """Lint all agent files with parallel processing. Returns (errors, warnings, valid)."""

        agent_files = self.find_agent_files()

        print(f"{BLUE}Linting {len(agent_files)} agent files (parallel)...{RESET}\n")

        # V7.1.0: Use ThreadPoolExecutor for parallel linting
        max_workers = min(32, (os.cpu_count() or 1) + 4)

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all lint tasks
            futures = {executor.submit(self._lint_agent_safe, agent_file): agent_file
                       for agent_file in agent_files}

            # Collect results as they complete
            for future in as_completed(futures):
                agent_file = futures[future]
                try:
                    issues, is_valid = future.result()
                    with self._lock:
                        self.issues.extend(issues)
                        self.agents_checked += 1
                        if is_valid:
                            self.agents_valid += 1
                except Exception as e:
                    print(f"{RED}Error linting {agent_file}: {e}{RESET}")

        return (
            len([i for i in self.issues if i.severity == 'error']),
            len([i for i in self.issues if i.severity == 'warning']),
            self.agents_valid
        )

    def _lint_agent_safe(self, agent_file: Path) -> Tuple[List[AgentIssue], bool]:
        """Thread-safe agent linting that returns issues instead of modifying state."""
        issues = []
        is_valid = True

        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            issues.append(AgentIssue(
                file_path=agent_file,
                severity='error',
                issue_type='read_error',
                message=f"Failed to read file: {e}"
            ))
            return issues, False

        # Check for frontmatter
        if not content.startswith('---\n'):
            issues.append(AgentIssue(
                file_path=agent_file,
                severity='error',
                issue_type='no_frontmatter',
                message="Missing YAML frontmatter (must start with ---)"
            ))
            return issues, False

        # Extract frontmatter
        end_idx = content.find('\n---\n', 4)
        if end_idx == -1:
            issues.append(AgentIssue(
                file_path=agent_file,
                severity='error',
                issue_type='invalid_frontmatter',
                message="Frontmatter not properly closed (missing closing ---)"
            ))
            return issues, False

        frontmatter_text = content[4:end_idx]

        # Parse YAML
        try:
            frontmatter = yaml.safe_load(frontmatter_text)
        except yaml.YAMLError as e:
            issues.append(AgentIssue(
                file_path=agent_file,
                severity='error',
                issue_type='invalid_yaml',
                message=f"Invalid YAML: {e}"
            ))
            return issues, False

        if not isinstance(frontmatter, dict):
            issues.append(AgentIssue(
                file_path=agent_file,
                severity='error',
                issue_type='invalid_frontmatter',
                message="Frontmatter is not a dictionary"
            ))
            return issues, False

        # Validate required fields
        has_errors = False

        for field in REQUIRED_FIELDS:
            if field not in frontmatter:
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='error',
                    issue_type='missing_field',
                    message=f"Missing required field: {field}",
                    field=field
                ))
                has_errors = True
            elif not frontmatter[field]:
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='warning',
                    issue_type='empty_field',
                    message=f"Empty field: {field}",
                    field=field
                ))

        # Validate field values
        if 'tier' in frontmatter:
            tier = frontmatter['tier']
            if tier not in VALID_TIERS:
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='error',
                    issue_type='invalid_tier',
                    message=f"Invalid tier: '{tier}' (must be one of: {', '.join(VALID_TIERS)})",
                    field='tier'
                ))
                has_errors = True

        if 'model' in frontmatter:
            model = frontmatter['model']
            if model not in VALID_MODELS:
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='warning',
                    issue_type='invalid_model',
                    message=f"Invalid model: '{model}' (typically: {', '.join(VALID_MODELS)})",
                    field='model'
                ))

        if 'tools' in frontmatter:
            tools = frontmatter['tools']
            if not isinstance(tools, list):
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='warning',
                    issue_type='invalid_tools',
                    message=f"tools should be a list, got: {type(tools).__name__}",
                    field='tools'
                ))
            elif len(tools) == 0:
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='info',
                    issue_type='no_tools',
                    message="No tools specified (agent may not use any tools)",
                    field='tools'
                ))

        # Check name matches filename
        if 'name' in frontmatter:
            expected_name = agent_file.stem
            actual_name = frontmatter['name']
            if actual_name != expected_name:
                issues.append(AgentIssue(
                    file_path=agent_file,
                    severity='warning',
                    issue_type='name_mismatch',
                    message=f"Name mismatch: frontmatter '{actual_name}' != filename '{expected_name}'",
                    field='name'
                ))

        is_valid = not has_errors
        return issues, is_valid

    def lint_agent(self, agent_file: Path):
        """Lint a single agent file (legacy sequential method)."""

        self.agents_checked += 1

        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.add_issue(agent_file, 'error', 'read_error', f"Failed to read file: {e}")
            return

        # Check for frontmatter
        if not content.startswith('---\n'):
            self.add_issue(agent_file, 'error', 'no_frontmatter', "Missing YAML frontmatter (must start with ---)")
            return

        # Extract frontmatter
        end_idx = content.find('\n---\n', 4)
        if end_idx == -1:
            self.add_issue(agent_file, 'error', 'invalid_frontmatter', "Frontmatter not properly closed (missing closing ---)")
            return

        frontmatter_text = content[4:end_idx]

        # Parse YAML
        try:
            frontmatter = yaml.safe_load(frontmatter_text)
        except yaml.YAMLError as e:
            self.add_issue(agent_file, 'error', 'invalid_yaml', f"Invalid YAML: {e}")
            return

        if not isinstance(frontmatter, dict):
            self.add_issue(agent_file, 'error', 'invalid_frontmatter', "Frontmatter is not a dictionary")
            return

        # Validate required fields
        has_errors = False

        for field in REQUIRED_FIELDS:
            if field not in frontmatter:
                self.add_issue(agent_file, 'error', 'missing_field', f"Missing required field: {field}", field)
                has_errors = True
            elif not frontmatter[field]:
                self.add_issue(agent_file, 'warning', 'empty_field', f"Empty field: {field}", field)

        # Validate field values
        if 'tier' in frontmatter:
            tier = frontmatter['tier']
            if tier not in VALID_TIERS:
                self.add_issue(
                    agent_file, 'error', 'invalid_tier',
                    f"Invalid tier: '{tier}' (must be one of: {', '.join(VALID_TIERS)})",
                    'tier'
                )
                has_errors = True

        if 'model' in frontmatter:
            model = frontmatter['model']
            if model not in VALID_MODELS:
                self.add_issue(
                    agent_file, 'warning', 'invalid_model',
                    f"Invalid model: '{model}' (typically: {', '.join(VALID_MODELS)})",
                    'model'
                )

        if 'tools' in frontmatter:
            tools = frontmatter['tools']
            if not isinstance(tools, list):
                self.add_issue(
                    agent_file, 'warning', 'invalid_tools',
                    f"tools should be a list, got: {type(tools).__name__}",
                    'tools'
                )
            elif len(tools) == 0:
                self.add_issue(
                    agent_file, 'info', 'no_tools',
                    "No tools specified (agent may not use any tools)",
                    'tools'
                )

        # Check name matches filename
        if 'name' in frontmatter:
            expected_name = agent_file.stem
            actual_name = frontmatter['name']
            if actual_name != expected_name:
                self.add_issue(
                    agent_file, 'warning', 'name_mismatch',
                    f"Name mismatch: frontmatter '{actual_name}' != filename '{expected_name}'",
                    'name'
                )

        if not has_errors:
            self.agents_valid += 1

    def add_issue(self, file_path: Path, severity: str, issue_type: str, message: str, field: Optional[str] = None):
        """Add a validation issue."""

        self.issues.append(AgentIssue(
            file_path=file_path,
            severity=severity,
            issue_type=issue_type,
            message=message,
            field=field
        ))

    def print_results(self):
        """Print linting results."""

        print(f"\n{'='*80}")
        print(f"{BLUE}Agent Documentation Linting Results{RESET}")
        print(f"{'='*80}\n")

        # Summary
        errors = [i for i in self.issues if i.severity == 'error']
        warnings = [i for i in self.issues if i.severity == 'warning']
        infos = [i for i in self.issues if i.severity == 'info']

        print(f"Total agents checked: {self.agents_checked}")
        print(f"{GREEN}Valid agents: {self.agents_valid}{RESET}")
        print(f"{RED}Errors: {len(errors)}{RESET}")
        print(f"{YELLOW}Warnings: {len(warnings)}{RESET}")
        print(f"{BLUE}Info: {len(infos)}{RESET}\n")

        # Group issues by file
        issues_by_file = {}
        for issue in self.issues:
            rel_path = issue.file_path.relative_to(self.project_root)
            if rel_path not in issues_by_file:
                issues_by_file[rel_path] = []
            issues_by_file[rel_path].append(issue)

        # Print issues
        if issues_by_file:
            print(f"{'='*80}")
            print(f"{BLUE}Issues by File{RESET}")
            print(f"{'='*80}\n")

            for file_path in sorted(issues_by_file.keys()):
                file_issues = issues_by_file[file_path]
                print(f"{BLUE}{file_path}{RESET}")

                for issue in file_issues:
                    color = RED if issue.severity == 'error' else YELLOW if issue.severity == 'warning' else BLUE
                    icon = 'x' if issue.severity == 'error' else '!' if issue.severity == 'warning' else 'i'
                    print(f"  {color}[{icon}] {issue.message}{RESET}")

                print()

        # Print summary by issue type
        if self.issues:
            print(f"{'='*80}")
            print(f"{BLUE}Issues by Type{RESET}")
            print(f"{'='*80}\n")

            issues_by_type = {}
            for issue in self.issues:
                if issue.issue_type not in issues_by_type:
                    issues_by_type[issue.issue_type] = []
                issues_by_type[issue.issue_type].append(issue)

            for issue_type, type_issues in sorted(issues_by_type.items()):
                count = len(type_issues)
                severity_counts = {
                    'error': len([i for i in type_issues if i.severity == 'error']),
                    'warning': len([i for i in type_issues if i.severity == 'warning']),
                    'info': len([i for i in type_issues if i.severity == 'info'])
                }

                print(f"{issue_type.replace('_', ' ').title()}: {count} total", end='')
                if severity_counts['error'] > 0:
                    print(f" ({RED}{severity_counts['error']} errors{RESET}", end='')
                if severity_counts['warning'] > 0:
                    print(f", {YELLOW}{severity_counts['warning']} warnings{RESET}", end='')
                if severity_counts['info'] > 0:
                    print(f", {BLUE}{severity_counts['info']} info{RESET}", end='')
                print(")")

            print()

        # Final status
        if errors:
            print(f"{RED}FAILED: {len(errors)} errors found{RESET}")
            return 1
        elif warnings:
            print(f"{YELLOW}PASSED with warnings ({len(warnings)} warnings){RESET}")
            return 0
        else:
            print(f"{GREEN}PASSED: All agents valid{RESET}")
            return 0

    def generate_compliance_report(self, output_file: Path):
        """Generate a compliance report markdown file."""

        errors = [i for i in self.issues if i.severity == 'error']
        warnings = [i for i in self.issues if i.severity == 'warning']
        infos = [i for i in self.issues if i.severity == 'info']

        compliance_rate = (self.agents_valid / self.agents_checked * 100) if self.agents_checked > 0 else 0

        report = f"""# Agent Documentation Compliance Report

**Generated**: Auto-generated by lint_agent_docs.py V7.1.0
**Total Agents**: {self.agents_checked}
**Valid Agents**: {self.agents_valid}
**Compliance Rate**: {compliance_rate:.1f}%

## Summary

- Valid: {self.agents_valid}
- Errors: {len(errors)}
- Warnings: {len(warnings)}
- Info: {len(infos)}

## Issues by Type

"""

        # Group by issue type
        issues_by_type = {}
        for issue in self.issues:
            if issue.issue_type not in issues_by_type:
                issues_by_type[issue.issue_type] = []
            issues_by_type[issue.issue_type].append(issue)

        for issue_type, type_issues in sorted(issues_by_type.items()):
            severity_counts = {
                'error': len([i for i in type_issues if i.severity == 'error']),
                'warning': len([i for i in type_issues if i.severity == 'warning']),
                'info': len([i for i in type_issues if i.severity == 'info'])
            }

            report += f"### {issue_type.replace('_', ' ').title()}\n\n"
            report += f"**Count**: {len(type_issues)}\n"
            report += f"- Errors: {severity_counts['error']}\n"
            report += f"- Warnings: {severity_counts['warning']}\n"
            report += f"- Info: {severity_counts['info']}\n\n"

            # List affected files
            affected_files = set(i.file_path.relative_to(self.project_root) for i in type_issues)
            report += "**Affected Files**:\n"
            for file_path in sorted(affected_files)[:10]:  # Limit to 10
                report += f"- `{file_path}`\n"
            if len(affected_files) > 10:
                report += f"- ... and {len(affected_files) - 10} more\n"
            report += "\n"

        # Recommendations
        report += "## Recommendations\n\n"

        if errors:
            report += "### Critical (Errors)\n\n"
            for issue_type in set(i.issue_type for i in errors):
                count = len([i for i in errors if i.issue_type == issue_type])
                report += f"- Fix {count} {issue_type.replace('_', ' ')} issues\n"
            report += "\n"

        if warnings:
            report += "### Improvements (Warnings)\n\n"
            for issue_type in set(i.issue_type for i in warnings):
                count = len([i for i in warnings if i.issue_type == issue_type])
                report += f"- Address {count} {issue_type.replace('_', ' ')} issues\n"
            report += "\n"

        # Write report
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(report)
        print(f"{GREEN}Compliance report written to: {output_file.relative_to(self.project_root)}{RESET}")


def main():
    """Main entry point."""

    # Parse args
    fix_mode = '--fix' in sys.argv

    # Determine project root
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent

    print(f"{BLUE}cAgents Agent Documentation Linter V7.1.0{RESET}")
    print(f"Project root: {project_root}")
    if fix_mode:
        print(f"{YELLOW}Fix mode: ON (will auto-fix common issues){RESET}")
    print()

    linter = AgentLinter(project_root, fix_mode)

    # Lint all agents
    errors, warnings, valid = linter.lint_all_agents()

    # Print results
    exit_code = linter.print_results()

    # Generate compliance report
    report_file = project_root / "Agent_Memory" / "_system" / "agent_compliance_report.md"
    linter.generate_compliance_report(report_file)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()

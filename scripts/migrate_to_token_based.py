#!/usr/bin/env python3
"""
Migrate all domain planner configs from time-based to token-based measurements.
This script automates the conversion of estimated_effort to token_budget across all domains.
"""

import os
import re
import yaml
from pathlib import Path

# Token estimation mapping (rough guide)
TIME_TO_TOKEN_MAP = {
    # Hours to tokens (approximate)
    "15-30 minutes": "5000-10000",
    "20-30 minutes": "7000-10000",
    "30-60 minutes": "10000-20000",
    "30 minutes": "10000",
    "1 hour": "15000",
    "1-2 hours": "15000-30000",
    "2-3 hours": "30000-45000",
    "2-4 hours": "30000-60000",
    "3-4 hours": "45000-60000",
    "4-6 hours": "60000-90000",
    "1-2 days": "150000-300000",
}

def convert_time_to_tokens(time_str):
    """Convert time string to token estimate."""
    if time_str in TIME_TO_TOKEN_MAP:
        return TIME_TO_TOKEN_MAP[time_str]

    # Try to extract numbers and convert
    if "minute" in time_str:
        match = re.search(r'(\d+)-?(\d+)?', time_str)
        if match:
            min_val = int(match.group(1))
            max_val = int(match.group(2)) if match.group(2) else min_val
            # Rough conversion: 1 minute ≈ 300 tokens
            return f"{min_val * 300}-{max_val * 300}"

    if "hour" in time_str:
        match = re.search(r'(\d+)-?(\d+)?', time_str)
        if match:
            min_val = int(match.group(1))
            max_val = int(match.group(2)) if match.group(2) else min_val
            # Rough conversion: 1 hour ≈ 15K tokens
            return f"{min_val * 15000}-{max_val * 15000}"

    # Default fallback
    return "20000-50000"

def calculate_complexity_score(token_str):
    """Calculate complexity score based on token budget."""
    # Extract max token value
    match = re.search(r'(\d+)$', token_str.replace('-', ' '))
    if match:
        max_tokens = int(match.group(1))
        if max_tokens < 20000:
            return "2-3"
        elif max_tokens < 100000:
            return "4-6"
        elif max_tokens < 500000:
            return "7-9"
        else:
            return "10"
    return "5"

def migrate_planner_config(file_path):
    """Migrate a single planner config file."""
    print(f"Migrating: {file_path}")

    with open(file_path, 'r') as f:
        content = f.read()

    # Backup original
    backup_path = file_path.replace('.yaml', '_time_based_backup.yaml')
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"  Backed up to: {backup_path}")

    # Replace estimated_effort with token_budget
    lines = content.split('\n')
    new_lines = []

    for line in lines:
        # Skip lines with estimated_effort
        if 'estimated_effort:' in line or 'estimated_hours:' in line:
            indent = len(line) - len(line.lstrip())
            time_match = re.search(r'["\'](.*?)["\']', line)
            if time_match:
                time_val = time_match.group(1)
                token_val = convert_time_to_tokens(time_val)
                complexity = calculate_complexity_score(token_val)

                new_lines.append(' ' * indent + f'token_budget: {token_val}')
                new_lines.append(' ' * indent + f'token_complexity_score: {complexity}')
                continue

        # Replace time-related terms in comments
        line = re.sub(r'estimated effort', 'token budget', line, flags=re.IGNORECASE)
        line = re.sub(r'duration', 'token consumption', line, flags=re.IGNORECASE)

        # Replace planning_time with planning_token_budget
        if 'planning_time:' in line:
            line = line.replace('planning_time:', 'planning_token_budget:')
            # Convert values
            line = re.sub(r'"< 30 seconds"', '1000', line)
            line = re.sub(r'"1-3 minutes"', '5000', line)
            line = re.sub(r'"3-7 minutes"', '15000', line)
            line = re.sub(r'"5-10 minutes"', '30000', line)

        new_lines.append(line)

    # Write updated content
    with open(file_path, 'w') as f:
        f.write('\n'.join(new_lines))

    print(f"  ✓ Migrated successfully")

def main():
    """Main migration function."""
    base_path = Path("/home/PathingIT/cAgents/Agent_Memory/_system/domains")
    domains = ["software", "business", "creative", "planning", "sales", "marketing",
               "finance", "operations", "hr", "legal", "support"]

    print("=" * 60)
    print("Token-Based Migration Script")
    print("=" * 60)
    print(f"Migrating {len(domains)} domain planner configs...")
    print()

    migrated = 0
    errors = 0

    for domain in domains:
        planner_path = base_path / domain / "planner_config.yaml"
        if planner_path.exists():
            try:
                migrate_planner_config(str(planner_path))
                migrated += 1
            except Exception as e:
                print(f"  ✗ Error: {e}")
                errors += 1
        else:
            print(f"Warning: {planner_path} not found")

    print()
    print("=" * 60)
    print(f"Migration Complete")
    print(f"  Migrated: {migrated}")
    print(f"  Errors: {errors}")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Review the migrated files")
    print("2. Test with a sample workflow")
    print("3. Update documentation")
    print("4. Deploy to production")

if __name__ == "__main__":
    main()

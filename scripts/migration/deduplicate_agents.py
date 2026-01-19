#!/usr/bin/env python3
"""Deduplicate agent files - remove duplicate agent names."""

from pathlib import Path
import shutil


# Deduplication strategy
DEDUPLICATION_RULES = {
    # Cross-domain agents: Keep in shared/, delete from super-domains
    'customer-success-manager': {
        'keep': 'shared/agents/customer-success-manager.md',
        'delete': ['grow/agents/', 'operate/agents/', 'serve/agents/'],
    },
    'account-manager': {
        'keep': 'shared/agents/account-manager.md',
        'delete': ['grow/agents/', 'operate/agents/', 'serve/agents/'],
    },
    'customer-advocacy-manager': {
        'keep': 'shared/agents/customer-advocacy-manager.md',
        'delete': ['serve/agents/'],
    },
    'competitive-intelligence-analyst': {
        'keep': 'shared/agents/competitive-intelligence-analyst.md',
        'delete': ['grow/agents/'],
    },

    # Domain-specific duplicates: Keep in super-domain, delete from shared
    'portfolio-manager': {
        'keep': 'make/agents/portfolio-manager.md',
        'delete': ['shared/agents/'],
    },
    'resource-planner': {
        'keep': 'make/agents/resource-planner.md',
        'delete': ['shared/agents/'],
    },
    'agile-coach': {
        'keep': 'make/agents/agile-coach.md',
        'delete': ['shared/agents/'],
    },
    'roadmap-planner': {
        'keep': 'make/agents/roadmap-planner.md',
        'delete': ['shared/agents/'],
    },
    'strategic-planner': {
        'keep': 'make/agents/strategic-planner.md',
        'delete': ['shared/agents/'],
    },
    'data-analyst': {
        'keep': 'make/agents/data-analyst.md',
        'delete': ['shared/agents/'],
    },
    'okr-specialist': {
        'keep': 'make/agents/okr-specialist.md',
        'delete': ['shared/agents/'],
    },
    'ceo': {
        'keep': 'make/agents/ceo.md',
        'delete': ['shared/agents/'],
    },
    'cfo': {
        'keep': 'make/agents/cfo.md',
        'delete': ['shared/agents/'],
    },
    'cpo': {
        'keep': 'make/agents/cpo.md',
        'delete': ['shared/agents/'],
    },
    'coo': {
        'keep': 'make/agents/coo.md',
        'delete': ['shared/agents/'],
    },
    'cso': {
        'keep': 'operate/agents/cso.md',
        'delete': ['shared/agents/'],
    },
    'change-manager': {
        'keep': 'operate/agents/change-manager.md',
        'delete': ['shared/agents/'],
    },
    'operations-manager': {
        'keep': 'operate/agents/operations-manager.md',
        'delete': ['shared/agents/'],
    },
    'business-analyst': {
        'keep': 'operate/agents/business-analyst.md',
        'delete': ['shared/agents/'],
    },
    'risk-manager': {
        'keep': 'operate/agents/risk-manager.md',
        'delete': ['shared/agents/'],
    },
    'process-improvement-specialist': {
        'keep': 'operate/agents/process-improvement-specialist.md',
        'delete': ['shared/agents/'],
    },

    # Multiple super-domain duplicates: Keep in primary, delete from others
    'program-manager': {
        'keep': 'make/agents/program-manager.md',
        'delete': ['operate/agents/', 'shared/agents/'],
    },
    'project-manager': {
        'keep': 'make/agents/project-manager.md',
        'delete': ['operate/agents/', 'shared/agents/'],
    },

    # Backup/deprecated files: Delete entirely
    'reviewer': {
        'keep': 'make/agents/reviewer.md',
        'delete': ['make/agents/reviewer-v1-backup.md'],  # Full path for backup
    },
    'universal-executor': {
        'keep': 'core/agents/universal-executor.md',
        'delete': ['core/agents/universal-executor-enhanced.md'],  # Full path for enhanced
    },
}


def deduplicate_agents(project_root, dry_run=False):
    """Remove duplicate agent files according to deduplication rules."""
    deleted_count = 0
    errors = []

    for agent_name, rules in DEDUPLICATION_RULES.items():
        keep_path = project_root / rules['keep']

        # Verify keep file exists
        if not keep_path.exists():
            errors.append(f"  ⚠ {agent_name}: Keep file not found: {rules['keep']}")
            continue

        print(f"\n{agent_name}:")
        print(f"  ✓ Keeping: {rules['keep']}")

        # Delete duplicates
        for delete_pattern in rules['delete']:
            if delete_pattern.endswith('.md'):
                # Full path specified
                delete_path = project_root / delete_pattern
                if delete_path.exists():
                    if dry_run:
                        print(f"  🔸 Would delete: {delete_pattern}")
                    else:
                        delete_path.unlink()
                        print(f"  ✗ Deleted: {delete_pattern}")
                        deleted_count += 1
            else:
                # Directory pattern - append agent filename
                delete_path = project_root / delete_pattern / f"{agent_name}.md"
                if delete_path.exists():
                    if dry_run:
                        print(f"  🔸 Would delete: {delete_pattern}{agent_name}.md")
                    else:
                        delete_path.unlink()
                        print(f"  ✗ Deleted: {delete_pattern}{agent_name}.md")
                        deleted_count += 1

    return deleted_count, errors


def main():
    """Deduplicate all agents."""
    project_root = Path(__file__).parent.parent.parent

    print("=" * 60)
    print("Agent Deduplication")
    print("=" * 60)

    # First do a dry run
    print("\n--- DRY RUN (preview) ---")
    deleted_count, errors = deduplicate_agents(project_root, dry_run=True)

    if errors:
        print("\n⚠ Errors found:")
        for error in errors:
            print(error)
        print("\nFix errors before proceeding.")
        return

    print(f"\n--- Would delete {deleted_count} duplicate files ---")
    print("\nProceeding with actual deletion...")

    # Actual deletion
    deleted_count, errors = deduplicate_agents(project_root, dry_run=False)

    print("\n" + "=" * 60)
    print(f"✓ Deduplication complete: {deleted_count} files deleted")
    print("=" * 60)


if __name__ == '__main__':
    main()

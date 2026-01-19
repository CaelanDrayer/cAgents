#!/usr/bin/env python3
"""
Post-Release Cleanup Automation Script for cAgents V7.1.0

Automates cleanup tasks after a release:
1. Moves release documentation from root to archive
2. Archives old migration scripts
3. Identifies files that should be relocated

Usage:
    python3 scripts/utils/post_release_cleanup.py           # Dry-run mode
    python3 scripts/utils/post_release_cleanup.py --apply   # Apply changes
    python3 scripts/utils/post_release_cleanup.py --help    # Show help
"""

import os
import sys
import shutil
import argparse
import re
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Tuple, Optional

# ANSI color codes
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

# Patterns for release documentation
RELEASE_DOC_PATTERNS = [
    r'^RELEASE_NOTES.*\.md$',
    r'^V\d+\.\d+\.\d+.*\.md$',
    r'^.*COMPLETION.*SUMMARY.*\.md$',
    r'^.*COMPREHENSIVE.*REVIEW.*\.md$',
    r'^.*CONSOLIDATION.*\.md$',
    r'^TEST_RESULTS.*\.md$',
]

# Files that must stay in root
PROTECTED_FILES = [
    'CLAUDE.md',
    'README.md',
    'workflow_agent_interactions.md',
    '.gitignore',
    'package.json',
]

# Directories that contain migration scripts
MIGRATION_DIRS = ['scripts/migration']


class PostReleaseCleanup:
    def __init__(self, project_root: Path, apply: bool = False, verbose: bool = True):
        self.project_root = project_root
        self.apply = apply
        self.verbose = verbose
        self.actions_planned = []
        self.actions_completed = []
        self.errors = []

    def run(self) -> int:
        """Execute the cleanup process. Returns exit code."""
        print(f"\n{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Post-Release Cleanup for cAgents{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")

        if self.apply:
            print(f"{YELLOW}Mode: APPLY (changes will be made){RESET}\n")
        else:
            print(f"{BLUE}Mode: DRY-RUN (no changes will be made){RESET}\n")

        # Step 1: Find release docs in root
        self._scan_release_docs()

        # Step 2: Find old migration scripts
        self._scan_migration_scripts()

        # Step 3: Print summary
        self._print_summary()

        # Step 4: Apply changes if requested
        if self.apply and self.actions_planned:
            self._apply_changes()

        # Return exit code
        if self.errors:
            return 1
        return 0

    def _scan_release_docs(self):
        """Scan root directory for release documentation files."""
        print(f"{BLUE}Scanning root for release documentation...{RESET}")

        for item in self.project_root.iterdir():
            if not item.is_file():
                continue

            if item.name in PROTECTED_FILES:
                continue

            # Check if matches release doc patterns
            for pattern in RELEASE_DOC_PATTERNS:
                if re.match(pattern, item.name, re.IGNORECASE):
                    # Determine destination
                    dest = self._determine_destination(item)
                    self.actions_planned.append({
                        'action': 'move',
                        'source': item,
                        'destination': dest,
                        'reason': f'Matches pattern: {pattern}'
                    })
                    if self.verbose:
                        print(f"  {YELLOW}[MOVE]{RESET} {item.name} -> {dest.relative_to(self.project_root)}")
                    break

        print()

    def _determine_destination(self, file_path: Path) -> Path:
        """Determine where a release doc should be moved."""
        filename = file_path.name

        # Check for version-specific files
        version_match = re.search(r'V(\d+\.\d+\.\d+)', filename)
        if version_match:
            version = version_match.group(1)
            return self.project_root / 'archive' / 'docs' / 'releases' / f'v{version}' / filename

        # General archive
        return self.project_root / 'archive' / 'docs' / filename

    def _scan_migration_scripts(self):
        """Scan for old migration scripts that should be archived."""
        print(f"{BLUE}Scanning for migration scripts...{RESET}")

        for migration_dir in MIGRATION_DIRS:
            dir_path = self.project_root / migration_dir
            if not dir_path.exists():
                if self.verbose:
                    print(f"  {BLUE}[SKIP]{RESET} {migration_dir} (not found)")
                continue

            # Get all files in migration directory
            files = list(dir_path.iterdir())
            if not files:
                if self.verbose:
                    print(f"  {BLUE}[SKIP]{RESET} {migration_dir} (empty)")
                continue

            # Calculate age threshold (30 days)
            age_threshold = datetime.now() - timedelta(days=30)

            # Get newest file modification time
            newest_mtime = max(f.stat().st_mtime for f in files if f.is_file())
            newest_date = datetime.fromtimestamp(newest_mtime)

            # If all files are older than threshold, archive the whole directory
            if newest_date < age_threshold:
                # Determine archive name based on content
                archive_name = self._infer_migration_name(dir_path)
                dest = self.project_root / 'archive' / 'scripts' / archive_name

                for file in files:
                    if file.is_file():
                        self.actions_planned.append({
                            'action': 'move',
                            'source': file,
                            'destination': dest / file.name,
                            'reason': f'Migration complete (last modified: {newest_date.strftime("%Y-%m-%d")})'
                        })

                # Plan to remove empty directory
                self.actions_planned.append({
                    'action': 'rmdir',
                    'source': dir_path,
                    'destination': None,
                    'reason': 'Empty after archiving scripts'
                })

                if self.verbose:
                    print(f"  {YELLOW}[ARCHIVE]{RESET} {migration_dir}/ ({len(files)} files) -> archive/scripts/{archive_name}/")
            else:
                if self.verbose:
                    print(f"  {BLUE}[SKIP]{RESET} {migration_dir}/ (recently modified: {newest_date.strftime('%Y-%m-%d')})")

        print()

    def _infer_migration_name(self, dir_path: Path) -> str:
        """Infer archive name from migration directory contents."""
        # Look for version patterns in filenames
        for file in dir_path.iterdir():
            if file.is_file():
                # Check for version in filename
                match = re.search(r'v(\d+)\.?(\d+)?\.?(\d+)?', file.name, re.IGNORECASE)
                if match:
                    version = f"v{match.group(1)}"
                    if match.group(2):
                        version += match.group(2)
                    if match.group(3):
                        version += match.group(3)
                    return f"{version}_migration"

        # Default based on current directory structure
        return f"{dir_path.name}_archived"

    def _print_summary(self):
        """Print summary of planned actions."""
        print(f"{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Summary{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")

        if not self.actions_planned:
            print(f"{GREEN}No cleanup actions needed. Everything is organized!{RESET}\n")
            return

        # Group by action type
        moves = [a for a in self.actions_planned if a['action'] == 'move']
        rmdirs = [a for a in self.actions_planned if a['action'] == 'rmdir']

        print(f"Planned actions:")
        print(f"  - Move files: {len(moves)}")
        print(f"  - Remove directories: {len(rmdirs)}")
        print()

        if not self.apply:
            print(f"{YELLOW}Run with --apply to execute these changes.{RESET}\n")

    def _apply_changes(self):
        """Apply the planned changes."""
        print(f"{BLUE}{'='*60}{RESET}")
        print(f"{BLUE}Applying Changes{RESET}")
        print(f"{BLUE}{'='*60}{RESET}\n")

        for action in self.actions_planned:
            try:
                if action['action'] == 'move':
                    self._do_move(action['source'], action['destination'])
                elif action['action'] == 'rmdir':
                    self._do_rmdir(action['source'])

                self.actions_completed.append(action)

            except Exception as e:
                self.errors.append({
                    'action': action,
                    'error': str(e)
                })
                print(f"{RED}[ERROR]{RESET} {action['source']}: {e}")

        print()
        print(f"{GREEN}Completed: {len(self.actions_completed)} actions{RESET}")
        if self.errors:
            print(f"{RED}Errors: {len(self.errors)}{RESET}")

    def _do_move(self, source: Path, destination: Path):
        """Move a file to its destination."""
        # Ensure destination directory exists
        destination.parent.mkdir(parents=True, exist_ok=True)

        # Move the file
        shutil.move(str(source), str(destination))

        print(f"{GREEN}[MOVED]{RESET} {source.name} -> {destination.relative_to(self.project_root)}")

    def _do_rmdir(self, directory: Path):
        """Remove an empty directory."""
        if directory.exists() and not any(directory.iterdir()):
            directory.rmdir()
            print(f"{GREEN}[REMOVED]{RESET} {directory.relative_to(self.project_root)}/")
        else:
            print(f"{YELLOW}[SKIP]{RESET} {directory.relative_to(self.project_root)}/ (not empty)")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Post-release cleanup automation for cAgents',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
    python3 scripts/utils/post_release_cleanup.py           # Dry-run
    python3 scripts/utils/post_release_cleanup.py --apply   # Apply changes
    python3 scripts/utils/post_release_cleanup.py -q        # Quiet mode
        '''
    )

    parser.add_argument(
        '--apply', '-a',
        action='store_true',
        help='Apply changes (default is dry-run mode)'
    )

    parser.add_argument(
        '--quiet', '-q',
        action='store_true',
        help='Reduce output verbosity'
    )

    args = parser.parse_args()

    # Determine project root
    script_path = Path(__file__).resolve()
    project_root = script_path.parent.parent.parent

    # Verify we're in the right place
    if not (project_root / 'CLAUDE.md').exists():
        print(f"{RED}Error: Not in cAgents project root{RESET}")
        print(f"Expected: {project_root}")
        sys.exit(1)

    # Run cleanup
    cleanup = PostReleaseCleanup(
        project_root=project_root,
        apply=args.apply,
        verbose=not args.quiet
    )

    exit_code = cleanup.run()
    sys.exit(exit_code)


if __name__ == '__main__':
    main()

#!/usr/bin/env bash
# routing-test.sh — Automated routing keyword-domain mapping smoke tests
# Validates router.keywords in each domain_overrides.yaml for correctness
#
# Usage: bash scripts/routing-test.sh [--quiet] [--fail-on-conflicts]
#   --quiet             Only print summary and conflicts
#   --fail-on-conflicts Exit 1 if keyword conflicts are found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SCRIPT_DIR}/.."
QUIET=false
FAIL_ON_CONFLICTS=false

for arg in "$@"; do
  case "$arg" in
    --quiet)            QUIET=true ;;
    --fail-on-conflicts) FAIL_ON_CONFLICTS=true ;;
  esac
done

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}Routing Test Results${RESET}"
echo "===================="
echo ""

# Run all validation via Python for reliable YAML parsing
python3 - "$ROOT" "$QUIET" "$FAIL_ON_CONFLICTS" <<'PYEOF'
import sys, yaml, os, json, re
from collections import defaultdict

root = sys.argv[1]
quiet = sys.argv[2] == "True"
fail_on_conflicts = sys.argv[3] == "True"

# Color codes
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN = '\033[0;32m'
CYAN = '\033[0;36m'
BOLD = '\033[1m'
RESET = '\033[0m'

all_keywords = {}       # keyword -> list of domains
domain_keywords = {}    # domain -> list of keywords
domain_issues = {}      # domain -> list of (severity, message)
total_keywords = 0
domains_skipped = []

# Load keywords from each domain
for entry in sorted(os.scandir(root), key=lambda e: e.name):
    if not entry.is_dir():
        continue
    config_path = os.path.join(entry.path, 'config', 'domain_overrides.yaml')
    if not os.path.exists(config_path):
        continue

    domain = entry.name
    # Skip non-domain dirs
    if domain in ('scripts', 'docs', '.claude', 'core', 'tests', 'archive'):
        continue

    with open(config_path) as f:
        d = yaml.safe_load(f) or {}

    router = d.get('router') or {}
    keywords = router.get('keywords') or []

    if not keywords:
        domains_skipped.append(domain)
        domain_keywords[domain] = []
        domain_issues[domain] = [('WARN', 'no router keywords (not routable)')]
        continue

    issues = []
    valid_keywords = []

    for kw in keywords:
        kw_str = str(kw).strip()
        total_keywords += 1

        # Test 1: keyword is lowercase
        if kw_str != kw_str.lower():
            issues.append(('ERROR', f'keyword not lowercase: "{kw_str}"'))

        # Test 2: no single-character keywords
        if len(kw_str) <= 1:
            issues.append(('ERROR', f'single-character keyword: "{kw_str}"'))

        valid_keywords.append(kw_str)

        # Track for cross-domain conflict detection
        if kw_str not in all_keywords:
            all_keywords[kw_str] = []
        all_keywords[kw_str].append(domain)

    domain_keywords[domain] = valid_keywords
    domain_issues[domain] = issues

    # Test 3: minimum keyword count
    if len(valid_keywords) < 20:
        domain_issues[domain].append(('WARN', f'only {len(valid_keywords)} keywords (minimum is 20)'))

# Find cross-domain conflicts
conflicts = {kw: domains for kw, domains in all_keywords.items() if len(domains) > 1}

# Print per-domain results
if not quiet:
    print(f"{'Domain':<15} {'Keywords':>8}  Status")
    print("-" * 45)
    for domain in sorted(domain_keywords.keys()):
        kws = domain_keywords[domain]
        issues = domain_issues.get(domain, [])
        errors = [m for s, m in issues if s == 'ERROR']
        warns = [m for s, m in issues if s == 'WARN']

        # Count keyword conflicts for this domain
        domain_conflicts = sum(1 for kw in kws if kw in conflicts)

        status = f"{GREEN}OK{RESET}"
        if errors:
            status = f"{RED}ERROR{RESET}"
        elif warns or domain_conflicts > 0:
            status = f"{YELLOW}WARN{RESET}"

        conflict_note = f"  ({domain_conflicts} conflicts)" if domain_conflicts > 0 else ""
        print(f"  {domain:<13} {len(kws):>8}  {status}{conflict_note}")

        for sev, msg in issues:
            color = RED if sev == 'ERROR' else YELLOW
            print(f"               {color}{'✗' if sev == 'ERROR' else '⚠'} {msg}{RESET}")

    print("")

# Print conflict report
print(f"{'Keywords tested':<25} {total_keywords}")
print(f"{'Unique keywords':<25} {len(all_keywords)}")
print(f"{'Conflicting keywords':<25} {len(conflicts)}")
print("")

if conflicts:
    print(f"{YELLOW}Conflicts found:{RESET}")
    for kw in sorted(conflicts.keys()):
        domains_list = ', '.join(conflicts[kw])
        print(f"  {YELLOW}⚠{RESET}  \"{kw}\" -> {domains_list}")
    print("")
else:
    print(f"{GREEN}✓ No keyword conflicts found{RESET}")
    print("")

# Print domains with no keywords
if domains_skipped:
    print(f"{YELLOW}⚠ Domains with no router keywords (not directly routable):{RESET}")
    for d in sorted(domains_skipped):
        print(f"  - {d}")
    print("")

# Summary
all_errors = sum(1 for d in domain_issues.values() for s, m in d if s == 'ERROR')
all_warns = sum(1 for d in domain_issues.values() for s, m in d if s == 'WARN')

print("---")
if all_errors > 0:
    print(f"{RED}FAIL{RESET}: {all_errors} error(s) found")
    sys.exit(1)
elif all_warns > 0 or (conflicts and fail_on_conflicts):
    print(f"{YELLOW}WARN{RESET}: {all_warns} warning(s) found, {len(conflicts)} conflict(s)")
    if fail_on_conflicts and conflicts:
        sys.exit(1)
    sys.exit(0)
else:
    print(f"{GREEN}PASS{RESET}: All routing tests passed")
    sys.exit(0)
PYEOF

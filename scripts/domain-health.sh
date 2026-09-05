#!/usr/bin/env bash
# domain-health.sh — Per-domain config health dashboard
# Checks each domain's domain_overrides.yaml for completeness and consistency
#
# Usage: bash scripts/domain-health.sh [--quiet]
#   --quiet: Only print WARN/ERROR lines (suppress HEALTHY)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="${SCRIPT_DIR}/.."
QUIET=false

for arg in "$@"; do
  [[ "$arg" == "--quiet" ]] && QUIET=true
done

echo ""
echo "Domain Health Check"
echo "==================="
echo ""

python3 - "$ROOT" "$QUIET" <<'PYEOF'
import sys, yaml, os, json
from collections import defaultdict

root = sys.argv[1]
quiet = sys.argv[2] == "True"

# ANSI colors
RED    = '\033[0;31m'
YELLOW = '\033[1;33m'
GREEN  = '\033[0;32m'
BOLD   = '\033[1m'
RESET  = '\033[0m'

total = 0
healthy = 0
warn_count = 0
error_count = 0

def check_domain(domain):
    global total, healthy, warn_count, error_count
    total += 1

    config_path = os.path.join(root, domain, 'config', 'domain_overrides.yaml')
    # v12.68.0: one global flat catalog, agents/<name>.md.
    agents_dir  = os.path.join(root, 'agents')

    if not os.path.exists(config_path):
        print(f"{RED}{domain:<13}{RESET} ERROR (no domain_overrides.yaml)")
        error_count += 1
        return

    with open(config_path) as f:
        d = yaml.safe_load(f) or {}

    issues = []
    warnings = []
    info = {}

    # The leadership catalog is the C-suite roster consumed by /team strategic
    # mode. It is deliberately NOT directly routable (see CLAUDE.md: "Leadership
    # 9 (C-suite, /team strategic mode, not directly routable)"), so it carries
    # an executive tier_4 catalog and no router keywords by design.
    executive_only = domain.rstrip('/').endswith('leadership')

    # Check 1: controller_catalog has tier_2 (tier_4 for the executive catalog)
    planner = d.get('planner') or {}
    cc      = planner.get('controller_catalog') or {}
    tier2   = cc.get('tier_2') or []
    tier4   = cc.get('tier_4') or []
    if executive_only:
        if not tier4:
            issues.append("executive controller_catalog missing tier_4")
            info['controller'] = 'NONE'
        else:
            info['controller'] = tier4[0] if isinstance(tier4, list) else str(tier4)
    elif not tier2:
        issues.append("controller_catalog missing tier_2")
        info['controller'] = 'NONE'
    else:
        info['controller'] = tier2[0] if isinstance(tier2, list) else str(tier2)

    # Check 2: router keywords count
    router   = d.get('router') or {}
    keywords = router.get('keywords') or []
    kw_count = len(keywords)
    info['keywords'] = kw_count
    if executive_only:
        pass  # not directly routable -- zero keywords is correct
    elif kw_count == 0:
        issues.append("no router keywords")
    elif kw_count < 20:
        warnings.append(f"only {kw_count} router keywords (need >= 20)")

    # Check 3: catalog agents have SKILL.md (search all domains for C-suite agents)
    all_catalog_agents = set()
    for tier_name, agents in cc.items():
        if isinstance(agents, list):
            all_catalog_agents.update(agents)
        elif isinstance(agents, str):
            all_catalog_agents.add(agents)

    # Collect specialist_routing agents (referenced, not orphans)
    all_routing_agents = set()
    for spec_name, spec in planner.get('specialist_routing', {}).items():
        for a in (spec.get('agents') or []):
            all_routing_agents.add(a)

    all_referenced = all_catalog_agents | all_routing_agents

    missing_agents = []
    for agent in sorted(all_catalog_agents):
        if not os.path.exists(os.path.join(agents_dir, agent + '.md')):
            missing_agents.append(agent)
    if missing_agents:
        warnings.append(f"catalog agents missing from agents/: {', '.join(missing_agents)}")

    # Check 4: orphan agents (SKILL.md exists but not referenced anywhere)
    # The per-domain count is the size of THAT domain's catalog. Counting the
    # global agents/ dir would report the same 60 for every domain, and the
    # orphan notion is meaningless per-domain now that the catalog is shared.
    agent_count = len(all_catalog_agents)
    orphans = []
    info['agent_count'] = agent_count

    if orphans:
        preview = ', '.join(orphans[:5])
        suffix  = f'...' if len(orphans) > 5 else ''
        warnings.append(f"{len(orphans)} orphan agents (not in catalog/routing): {preview}{suffix}")

    # Print result
    label = f"{domain}:"
    ctrl  = info.get('controller', '?')
    kw    = info.get('keywords', 0)
    ac    = info.get('agent_count', 0)

    if issues:
        error_count += 1
        print(f"{RED}{label:<13}{RESET} ERROR  ({ac} agents, {kw} keywords, controller: {ctrl})")
        for msg in issues:
            print(f"               {RED}✗ {msg}{RESET}")
        for msg in warnings:
            print(f"               {YELLOW}⚠ {msg}{RESET}")
    elif warnings:
        warn_count += 1
        print(f"{YELLOW}{label:<13}{RESET} WARN   ({ac} agents, {kw} keywords, controller: {ctrl})")
        for msg in warnings:
            print(f"               {YELLOW}⚠ {msg}{RESET}")
    else:
        healthy += 1
        if not quiet:
            print(f"{GREEN}{label:<13}{RESET} HEALTHY ({ac} agents, {kw} keywords, controller: {ctrl})")

# v12.8.0 moved the surviving domain_overrides.yaml files under agents/
# (agents/{core,leadership}/config and agents/_overlay/{people,shared}/config).
# Scan those roots rather than the repo-root domain dirs, which are long gone.
domains = []
for base in ('agents', os.path.join('agents', '_overlay')):
    base_path = os.path.join(root, base)
    if not os.path.isdir(base_path):
        continue
    for entry in sorted(os.scandir(base_path), key=lambda e: e.name):
        if not entry.is_dir() or entry.name.startswith('.'):
            continue
        if os.path.exists(os.path.join(entry.path, 'config', 'domain_overrides.yaml')):
            domains.append(os.path.relpath(entry.path, root))

for domain in domains:
    check_domain(domain)

print()
print("---")
print(f"Domains checked: {total}  |  {GREEN}Healthy: {healthy}{RESET}  |  {YELLOW}Warn: {warn_count}{RESET}  |  {RED}Error: {error_count}{RESET}")
print()

sys.exit(1 if error_count > 0 else 0)
PYEOF

# Migration Guide: v9.x to v10.0.0

## Overview

cAgents v10.0.0 restructures the 5 super-domains (Make, Grow, Operate, People, Serve) into 8 focused business domains (Engineering, Creative, Business, People, Service, Leadership, Shared, Core). Agent count drops from 239 to 206 through consolidation of overlapping roles.

## Domain Mapping

| v9 Super-Domain | v10 Domain(s) | Notes |
|-----------------|---------------|-------|
| Make (engineering) | **engineering/** | 33 agents (was part of make/) |
| Make (creative) | **creative/** | 24 agents (was part of make/) |
| Make (game dev) | Split: **engineering/** (programming) + **creative/** (art/audio) + **business/** (design/production) | Game dev agents distributed by function |
| Grow | **business/** | Marketing/sales agents consolidated into business/ |
| Operate | **business/** | Finance/ops agents consolidated into business/ |
| People | **people/** | Unchanged directory, minor agent count adjustment |
| Serve | **service/** | Renamed from serve/ to service/ |
| (new) | **leadership/** | 10 C-suite agents (CEO, CTO, CFO, etc.) extracted from domains |
| (new) | **growth/** | Legacy redirect to business/ (empty agents array) |

## Config Changes

### Old (v9): planner_config.yaml per domain
```
make/config/planner_config.yaml     # 111 agents, huge file
grow/config/planner_config.yaml     # 38 agents
operate/config/planner_config.yaml  # 13 agents
```

### New (v10): domain_overrides.yaml per domain
```
engineering/config/domain_overrides.yaml   # controller_catalog + router.keywords
creative/config/domain_overrides.yaml
business/config/domain_overrides.yaml
people/config/domain_overrides.yaml
service/config/domain_overrides.yaml
leadership/config/domain_overrides.yaml    # tier_4 only (C-suite)
shared/config/domain_overrides.yaml        # empty catalog (invoked by controllers)
growth/config/domain_overrides.yaml        # redirect note
```

## Pipeline Changes

### Progressive Pipeline (New in v10)
v9 ran all 6 pipeline agents for every request. v10 adds complexity scoring with 3 pipeline paths:

| Path | Threshold | Agents Run | Use Case |
|------|-----------|------------|----------|
| Minimal | < 0.25 | orchestrator + controller + validator | Simple fixes, typos |
| Medium | 0.25 - 0.65 | orchestrator + planner + controller + validator | Moderate features |
| Full | >= 0.65 | All 6 agents (orchestrator through validator) | Complex systems |

Complexity is determined by a 9-signal scoring system evaluating: component count, domain breadth, requirement ambiguity, dependency depth, risk level, stakeholder count, iteration likelihood, timeline constraints, and novelty.

## Agent Renames and Removals

### Renamed Agents
| v9 Name | v10 Name | Domain |
|---------|----------|--------|
| cx-director | support-director | service/ |
| culture-champion | culture-and-engagement-manager | people/ |
| growth-hacker | growth-marketer | business/ |

### Removed (Consolidated)
- Duplicate analytics agents merged into domain-specific analysts
- Redundant coordinator roles absorbed by controllers
- Legacy shell-based agents replaced by CJS equivalents

### New Agents
- **cpo** (leadership/) - Chief Product Officer
- **cso** (leadership/) - Chief Security Officer

## Plugin.json Changes

### Root Manifest
- Agent paths changed from `make/agents/...` to `developer/{branch}/...`, `writer/...`, etc.
- All domain plugin.json files updated with new paths
- Agent count: 239 -> 206 (33 removed through consolidation)

### Version Sync
14 files must stay in sync. Use `bash scripts/sync-versions.sh` or `bash scripts/ci/validate-versions.sh` to check.

## Breaking Changes

1. **Domain directory names**: `make/` -> `engineering/`, `creative/`; `grow/` -> `business/`; `operate/` -> `business/`; `serve/` -> `service/`
2. **Config format**: `planner_config.yaml` -> `domain_overrides.yaml` with different structure
3. **Controller catalog**: Moved from centralized per-super-domain to per-domain `domain_overrides.yaml`
4. **Agent references**: Any hardcoded `cagents:make:backend-developer` must become `cagents:backend-developer` (domain prefix removed)
5. **C-suite agents**: Now in `leadership/` directory, not scattered across domains

## Test Verification

Run the full test suite to verify migration:
```bash
npm test                                    # 265 Vitest tests
bash scripts/ci/validate-agents.sh          # Agent schema validation
bash scripts/ci/validate-versions.sh        # Version consistency
bash scripts/ci/check-quality.sh            # Full quality gates
```

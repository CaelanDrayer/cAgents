# Domain Structure (v12.6.0)

## 9 Builder-Role Archetypes (141 agents, post-v12.7.0 LP-12 + LP-13 consolidation; was 144 post-v12.4.0; canonical archetype tree since v11.1.0)

| Archetype | Directory | Agents | Description |
|-----------|-----------|-------:|-------------|
| Developer | `developer/` | 26 | Backend, frontend, fullstack, infrastructure, quality (5 branches) |
| Operator | `operator/` | 36 | Support, business-ops, people-ops, marketing-sales, content (5 branches) |
| Advisor | `advisor/` | 12 | Legal, health, education, personal (4 branches) |
| Analyst | `analyst/` | 19 | Data, BI, research, social-science |
| Creator | `creator/` | 5 | Visual artists, designers, audiovisual creators |
| Writer | `writer/` | 8 | Copy, narrative, technical, editorial |
| Strategist | `strategist/` | 8 | Product owners, portfolio managers, planners |
| Core | `core/` | 15 | Pipeline infrastructure (trigger, orchestrator, planner, reviewer, validator, etc.) |
| Leadership | `leadership/` | 12 | C-suite executives (used by /team strategic mode, not directly routable) |

## Legacy Domain Routing Overlay (config-only)

The router and planner still consume `controller_catalog` + `router_keywords` from a routing overlay. Two legacy domain directories survive on disk as routing-config-only overlays (no SKILL.md files): `people/` and `shared/`. The other 11 historical domain dirs (`engineering/`, `creative/`, `business/`, `growth/`, `service/`, `science/`, `health/`, `education/`, `personal/`, `arts/`, `trades/`) were deleted in v12 W4.2 and their router keywords + controller catalogs were consolidated into `cagents-memory/_system/config/routing.yaml`.

## Domain Configuration

Each domain has:
```
{domain}/
  config/
    domain_overrides.yaml    # Controller catalog + router keywords
  agents/
    {agent-name}/
      SKILL.md               # Agent definition with YAML frontmatter
  .claude-plugin/
    plugin.json              # Domain manifest
```

### domain_overrides.yaml Structure
```yaml
domain: engineering
description: "Software engineering, infrastructure, security, QA"

planner:
  controller_catalog:
    tier_2: [tech-lead]
    tier_3: [tech-lead, architect, security-lead]
    tier_4: [cto, tech-lead, architect, infrastructure-lead]

router:
  keywords:
    - fix
    - bug
    - implement
    - code
```

## Routing

Requests are routed to domains based on keyword matching from `router.keywords` in each domain's `domain_overrides.yaml`. The router evaluates the user's request against all domain keyword lists and selects the best match.

### Non-Routable Archetypes
- **Leadership**: C-suite agents invoked by `/team` strategic mode (auto-enabled when `router.domain_count >= 2`; pre-v12.2.0 this was the now-removed `/org` skill), not directly by `/run`
- **Shared/People (legacy overlays)**: Routing-config dirs only — no SKILL.md files; their controllers/agents now live in other archetypes
- **Core**: Infrastructure agents used internally by the pipeline

## Controller Selection

Within a domain, the controller is selected based on complexity tier:
- **Tier 2**: First controller in tier_2 list
- **Tier 3**: Primary from tier_3 + supporting controllers
- **Tier 4**: Executive lead from tier_4 + primary + supporting

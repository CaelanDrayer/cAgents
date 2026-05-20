# Domain Structure (v10)

## 15 Domains (243 agents)

| Domain | Directory | Agents | Description |
|--------|-----------|--------|-------------|
| Engineering | `engineering/` | 31 | Software engineering, infrastructure, security, QA, game programming |
| Creative | `creative/` | 30 | Creative writing, narrative design, literary criticism, game art, audio |
| Business | `business/` | 28 | Strategy, product, operations, finance |
| Growth | `growth/` | 34 | Marketing, sales, revenue operations |
| People | `people/` | 17 | HR, talent acquisition, culture, workforce planning |
| Service | `service/` | 28 | Customer support, CX, legal, compliance, governance |
| Leadership | `leadership/` | 11 | C-suite executives + general-counsel (used by /org, not directly routable) |
| Core | `core/` | 17 | Infrastructure (trigger, orchestrator, planner, validator, generic-coordinator, etc.) |
| Shared | `shared/` | 12 | Cross-domain intelligence (BI, data science, market research, social science) |
| Science | `science/` | 10 | STEM research, scientific analysis |
| Health | `health/` | 5 | Medical, wellness, fitness, nutrition (uses generic-coordinator from core) |
| Education | `education/` | 5 | Teaching, tutoring, academic support (uses generic-coordinator from core) |
| Personal | `personal/` | 5 | Career, life coaching, personal finance (uses generic-coordinator from core) |
| Arts | `arts/` | 5 | Visual arts, music, film, performing arts (uses generic-coordinator from core) |
| Trades | `trades/` | 5 | Culinary, construction, automotive, agriculture (uses generic-coordinator from core) |

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
    tier_2: [engineering-manager]
    tier_3: [engineering-manager, architect, security-lead]
    tier_4: [cto, engineering-manager, architect, infrastructure-lead]

router:
  keywords:
    - fix
    - bug
    - implement
    - code
```

## Routing

Requests are routed to domains based on keyword matching from `router.keywords` in each domain's `domain_overrides.yaml`. The universal-router evaluates the user's request against all domain keyword lists and selects the best match.

### Non-Routable Domains
- **Leadership**: C-suite agents invoked by `/org`, not directly by `/run`
- **Shared**: Cross-domain agents invoked by controllers, not by direct routing
- **Core**: Infrastructure agents used internally by the pipeline

## Controller Selection

Within a domain, the controller is selected based on complexity tier:
- **Tier 2**: First controller in tier_2 list
- **Tier 3**: Primary from tier_3 + supporting controllers
- **Tier 4**: Executive lead from tier_4 + primary + supporting

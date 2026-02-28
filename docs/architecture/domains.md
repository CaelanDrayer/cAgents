# Domain Structure (v10)

## 8 Business Domains

| Domain | Directory | Agents | Description |
|--------|-----------|--------|-------------|
| Engineering | `engineering/` | 33 | Software engineering, infrastructure, security, QA, game programming |
| Creative | `creative/` | 24 | Creative writing, narrative design, game art, audio, animation |
| Business | `business/` | 69 | Strategy, product, operations, finance, marketing, sales |
| People | `people/` | 19 | HR, talent acquisition, culture, workforce planning |
| Service | `service/` | 32 | Customer support, CX, legal, compliance, governance |
| Leadership | `leadership/` | 10 | C-suite executives (CEO, CTO, CFO, CMO, CRO, COO, CCO, CPO, CHRO, CSO) |
| Core | `core/` | 15 | Infrastructure (trigger, orchestrator, planner, validator, etc.) |
| Shared | `shared/` | 4 | Cross-domain intelligence (BI, data science, market research) |

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
    tier_4: [cto, engineering-manager, architect, devops-lead]

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

## Legacy Domains

The `growth/` directory exists as a legacy redirect. Its agents were consolidated into `business/` during the v10 restructure. The `make/`, `grow/`, `operate/`, and `serve/` directories may still exist with legacy content but are not actively used.

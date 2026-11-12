# Domain Configuration

## Location

The routing and controller data for domains lives in two kinds of file.

| Domains | File |
|---------|------|
| engineering, creative, business, growth, service, science, health, education, personal, arts, trades | `cagents-memory/_system/config/routing.yaml`, under `domains.<name>` |
| people | `agents/_overlay/people/config/domain_overrides.yaml` |
| shared | `agents/_overlay/shared/config/domain_overrides.yaml` |
| core (pipeline agents) | `agents/core/config/domain_overrides.yaml` |
| leadership (C-suite) | `agents/leadership/config/domain_overrides.yaml` |

The 11 domains in `routing.yaml` had their own directories before v12.0.0. Those directories were deleted. Their data moved into `routing.yaml` with the same schema, nested under `domains.<name>`.

`agents/_overlay/people/` and `agents/_overlay/shared/` are not orphans. The planner still reads their config files. Do not delete them.

## Structure

The example below is the `engineering` entry in `routing.yaml`, shortened.

```yaml
domains:
  engineering:
    description: "Software engineering, infrastructure, security, QA, and game programming"
    planner:
      controller_catalog:
        tier_2: [tech-lead, qa-lead]
        tier_3: [tech-lead, architect, security-engineer, data-lead]
        tier_4: [cto, tech-lead, architect, devops-engineer]
      specialist_routing:
        security:
          keywords: [security, vulnerability, penetration, OWASP, CVE, threat]
          agents: [security-engineer]
          description: "Security assessment, vulnerability analysis, and threat modeling"
```

A `domain_overrides.yaml` file has the same fields at the top level, plus a `domain:` key:

```yaml
domain: people
description: "Human resources, talent acquisition, culture, and people operations"

planner:
  controller_catalog:
    tier_2: [hr-manager]
    tier_3: [hr-manager]
    tier_4: [chro, hr-manager]
```

## Fields

### domain

The domain identifier. It is the key under `domains:` in `routing.yaml`, or the `domain:` value in a `domain_overrides.yaml` file.

### description

A short description of the domain scope.

### planner.controller_catalog

Maps complexity tiers to controller agents. The planner uses this map to select the controllers for a request.

- `tier_2`: One controller for moderate requests.
- `tier_3`: A primary controller plus supporting controllers for complex requests.
- `tier_4`: An executive plus a primary controller plus supporting controllers for expert-level requests.

### planner.specialist_routing

Maps topic keywords to the specialist agents that a controller can delegate to.

### router.keywords

Keywords that route a request to this domain. The router matches the request text against these keywords.

## Special Domains

### Leadership

The C-suite agents are not directly routable. `/team` strategic mode uses them.

```yaml
planner:
  controller_catalog:
    tier_4: [ceo, cto, cfo, cmo, cro, coo, cco, cpo, chro]
router:
  keywords: []
```

### Core

The core file holds the routing table for the pipeline agents (`orchestrator`, `planner`, `execution-monitor`, `validator`, `self-correct`). Users do not route requests to it.

## Validation

`bash scripts/ci/validate-agents.sh` checks the 4 `domain_overrides.yaml` files: the 2 legacy overlays and the 2 archetype roots.

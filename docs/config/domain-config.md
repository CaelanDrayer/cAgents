# Domain Configuration

## Location

`{domain}/config/domain_overrides.yaml`

## Structure

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
    - api
    - database
```

## Fields

### domain
Domain identifier matching the directory name.

### description
Human-readable description of the domain scope.

### planner.controller_catalog
Maps complexity tiers to controller agents. The planner uses this to select the right controller(s) for a request.

- `tier_2`: Single controller for moderate requests
- `tier_3`: Primary + supporting controllers for complex requests
- `tier_4`: Executive + primary + supporting for expert-level requests

### router.keywords
Keywords that trigger routing to this domain. The universal-router matches user request text against these keywords.

## Special Domains

### Leadership
```yaml
planner:
  controller_catalog:
    tier_4: [ceo, cto, cfo, cmo, cro, coo, cco, cpo, chro, cso]
router:
  keywords: []  # Not directly routable
```

### Shared
```yaml
planner:
  controller_catalog: {}  # Invoked by controllers, not routed
router:
  keywords: []
```

## All Domain Configs

| Domain | File |
|--------|------|
| Engineering | `engineering/config/domain_overrides.yaml` |
| Creative | `creative/config/domain_overrides.yaml` |
| Business | `business/config/domain_overrides.yaml` |
| Growth | `growth/config/domain_overrides.yaml` |
| People | `people/config/domain_overrides.yaml` |
| Service | `service/config/domain_overrides.yaml` |
| Leadership | `leadership/config/domain_overrides.yaml` |
| Shared | `shared/config/domain_overrides.yaml` |

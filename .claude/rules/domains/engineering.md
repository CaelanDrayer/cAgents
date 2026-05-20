---
paths:
  - "engineering/**"
  - "core/**"
  - "shared/**"
---

# Engineering Domain Guidelines

> **Overlay status (V11.1.0+)**: This file describes a legacy *domain*
> overlay used for routing keywords and controller catalogs. The canonical
> agent organization is the 9-archetype tree (`developer/`, `operator/`,
> `advisor/`, `analyst/`, `creator/`, `writer/`, `strategist/`, `core/`,
> `leadership/`). Domain-keyworded requests still resolve through this
> overlay, but new agents live under archetype roots. See
> `.claude/rules/core/skill-format.md` for the canonical schema.


Domain-specific patterns for engineering workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **tech-lead**: Bug fixes, feature additions, moderate refactoring
- **architect**: System design questions, architectural decisions

**Tier 3** (Complex):
- **Primary**: tech-lead (day-to-day coordination)
- **Supporting**: architect (design), security-specialist (security review)

**Tier 4** (Expert):
- **Executive**: cto (strategic oversight)
- **Primary**: tech-lead (coordination)
- **Supporting**: architect, infrastructure-lead, security-specialist, qa-lead

## Typical Questions

Engineering controllers typically ask:

**Implementation Analysis**:
- "What is the current implementation of [feature]?"
- "What are the technical constraints we need to consider?"
- "What dependencies does this change affect?"

**Architecture & Design**:
- "What architectural pattern should we use for [feature]?"
- "How should this integrate with existing systems?"
- "What are the scalability implications?"

**Security & Quality**:
- "What security considerations are relevant?"
- "What testing strategy should we use?"
- "What are the potential failure modes?"

## Execution Agents

Common engineering execution agents:
- **backend-developer**: API endpoints, database, business logic
- **frontend-developer**: UI components, state management, styling
- **infrastructure-lead**: Deployment, infrastructure, CI/CD
- **qa-lead**: Testing strategy, test implementation, quality assurance
- **security-specialist**: Security review, vulnerability assessment
- **architect**: System design, architectural decisions
- **dba**: Database schema, query optimization

## Config Location

`cagents-memory/_system/config/routing.yaml` (under `domains.engineering`; consolidated in v12 W4.2 — the legacy `engineering/config/domain_overrides.yaml` path no longer exists)

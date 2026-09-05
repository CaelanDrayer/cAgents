---
paths:
  - "agents/architect.md"
  - "agents/architect/**"
  - "agents/backend-developer.md"
  - "agents/backend-developer/**"
  - "agents/data-lead.md"
  - "agents/data-lead/**"
  - "agents/devops-engineer.md"
  - "agents/devops-engineer/**"
  - "agents/frontend-developer.md"
  - "agents/frontend-developer/**"
  - "agents/qa-lead.md"
  - "agents/qa-lead/**"
  - "agents/security-engineer.md"
  - "agents/security-engineer/**"
  - "agents/tech-lead.md"
  - "agents/tech-lead/**"
  - "agents/core/**"
  - "agents/coord-log-writer.md"
  - "agents/coordinator.md"
  - "agents/execution-monitor.md"
  - "agents/execution-monitor/**"
  - "agents/hitl.md"
  - "agents/hitl/**"
  - "agents/optimizer.md"
  - "agents/optimizer/**"
  - "agents/orchestrator.md"
  - "agents/orchestrator/**"
  - "agents/planner.md"
  - "agents/planner/**"
  - "agents/reviewer.md"
  - "agents/reviewer/**"
  - "agents/router.md"
  - "agents/router/**"
  - "agents/self-correct.md"
  - "agents/self-correct/**"
  - "agents/task-state.md"
  - "agents/task-state/**"
  - "agents/team-bootstrap.md"
  - "agents/team-bootstrap/**"
  - "agents/team-lead.md"
  - "agents/team-lead/**"
  - "agents/trigger.md"
  - "agents/trigger/**"
  - "agents/validator.md"
  - "agents/validator/**"
  - "agents/wave-reviewer.md"
  - "agents/wave-reviewer/**"
  - "agents/_overlay/shared/**"
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
- **Supporting**: architect (design), security-engineer (security review)

**Tier 4** (Expert):
- **Executive**: cto (strategic oversight)
- **Primary**: tech-lead (coordination)
- **Supporting**: architect, devops-engineer, security-engineer, qa-lead

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
- **backend-developer**: API endpoints, database, business logic, schema and query optimization
- **frontend-developer**: UI components, state management, styling
- **devops-engineer**: Deployment, infrastructure, CI/CD
- **qa-lead**: Testing strategy, test implementation, quality assurance
- **security-engineer**: Security review, vulnerability assessment
- **architect**: System design, architectural decisions

## Config Location

`cagents-memory/_system/config/routing.yaml` (under `domains.engineering`; consolidated in v12 W4.2 — the legacy `engineering/config/domain_overrides.yaml` path no longer exists)

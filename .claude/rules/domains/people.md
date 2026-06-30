---
paths:
  - "people/**"
---

# People Domain Guidelines

> **Overlay status (V11.1.0+)**: This file describes a legacy *domain*
> overlay used for routing keywords and controller catalogs. The canonical
> agent organization is the 9-archetype tree (`developer/`, `operator/`,
> `advisor/`, `analyst/`, `creator/`, `writer/`, `strategist/`, `core/`,
> `leadership/`). Domain-keyworded requests still resolve through this
> overlay, but new agents live under archetype roots. See
> `.claude/rules/core/skill-format.md` for the canonical schema.


Domain-specific patterns for HR and talent workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **hr-manager**: HR operations, employee relations, recruiting, hiring

**Tier 3** (Complex):
- **Primary**: hr-manager (HR coordination)
- **Supporting**: chro (org strategy and culture)

**Tier 4** (Expert):
- **Executive**: chro (HR strategy)
- **Primary**: hr-manager (coordination)

## Typical Questions

People controllers typically ask:

**Talent Acquisition**:
- "What are the role requirements and qualifications?"
- "What is the current talent pipeline status?"
- "What sourcing channels should we use?"

**Employee Experience**:
- "What is the current employee engagement level?"
- "What are the retention risks?"
- "What development opportunities are needed?"

**Culture & Change**:
- "How does this align with company culture?"
- "What change management is needed?"
- "How should we communicate this initiative?"

## Execution Agents

Common people agents (v12 collapsed the people-ops specialists into the controllers below):
- **hr-manager**: Sourcing, screening, employee relations, learning, compensation
- **chro**: Culture, engagement, organizational design, change management

## Config Location

`agents/_overlay/people/config/domain_overrides.yaml`

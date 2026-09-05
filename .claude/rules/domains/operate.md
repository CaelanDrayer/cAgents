---
paths:
  - "agents/operations-manager.md"
  - "agents/operations-manager/**"
---

# Operations & Finance Guidelines

> **Overlay status (V11.1.0+)**: This file describes a legacy *domain*
> overlay used for routing keywords and controller catalogs. The canonical
> agent organization is the 9-archetype tree (`developer/`, `operator/`,
> `advisor/`, `analyst/`, `creator/`, `writer/`, `strategist/`, `core/`,
> `leadership/`). Domain-keyworded requests still resolve through this
> overlay, but new agents live under archetype roots. See
> `.claude/rules/core/skill-format.md` for the canonical schema.


Operations and finance agents are part of the **business** domain in v10.0.0. This rules file provides specialized patterns for operations and finance workflows.

## Controller Selection

For operations/finance requests within the business domain:

**Tier 2**: operations-manager
**Tier 3**: + strategic-planner, general-counsel
**Tier 4**: cfo + coo + operations-manager

## Typical Questions

**Financial Analysis**:
- "What is the current budget status and variance?"
- "What are the cost drivers for this initiative?"
- "What is the ROI projection for this investment?"

**Operational Efficiency**:
- "What is the current process flow and cycle time?"
- "Where are the bottlenecks in operations?"
- "What automation opportunities exist?"

**Risk & Compliance**:
- "What compliance requirements apply?"
- "What are the operational risks?"
- "What controls are needed?"

## Config Location

`cagents-memory/_system/config/routing.yaml` (under `domains.business`; consolidated in v12 W4.2 — the legacy `business/config/domain_overrides.yaml` path no longer exists)

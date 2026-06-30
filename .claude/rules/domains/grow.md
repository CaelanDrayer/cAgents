---
paths:
  - "agents/operator/marketing-sales/**"
  - "agents/strategist/**"
---

# Business Domain Guidelines

> **Overlay status (V11.1.0+)**: This file describes a legacy *domain*
> overlay used for routing keywords and controller catalogs. The canonical
> agent organization is the 9-archetype tree (`developer/`, `operator/`,
> `advisor/`, `analyst/`, `creator/`, `writer/`, `strategist/`, `core/`,
> `leadership/`). Domain-keyworded requests still resolve through this
> overlay, but new agents live under archetype roots. See
> `.claude/rules/core/skill-format.md` for the canonical schema.


Domain-specific patterns for strategy, product, operations, finance, marketing, and sales workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **operations-manager**: Process optimization, operational workflows
- **marketing-strategist**: Marketing strategy, campaigns, product marketing, SEO (v12: absorbed campaign-manager, product-marketing-manager, seo-strategist)

**Tier 3** (Complex):
- **Primary**: strategic-planner (business strategy coordination)
- **Supporting**: marketing-strategist (marketing), sales-strategist (sales)

**Tier 4** (Expert):
- **Executive**: cpo (product oversight), cfo (financial oversight)
- **Primary**: strategic-planner (coordination)
- **Supporting**: operations-manager, marketing-strategist

## Typical Questions

Business controllers typically ask:

**Strategy & Product**:
- "What is the current market positioning?"
- "What are the strategic priorities for this initiative?"
- "What product roadmap considerations apply?"

**Financial Analysis**:
- "What is the budget impact of this initiative?"
- "What are the cost drivers and ROI projections?"
- "What financial constraints apply?"

**Marketing & Sales**:
- "Who is the target audience for this initiative?"
- "What channels are most effective for this segment?"
- "What are the conversion bottlenecks?"

**Operations**:
- "What is the current process flow and cycle time?"
- "Where are the bottlenecks in operations?"
- "What automation opportunities exist?"

## Execution Agents

Common business execution agents:
- **editor**: Sales copy, marketing content, ad copy
- **marketing-analyst**: Campaign metrics, market analysis, SEO and keyword research
- **sales-strategist**: Sales process, deal strategy
- **operations-manager**: Process optimization, budgeting, financial reporting
- **product-owner**: Product requirements, backlog management
- **market-research-analyst**: Requirements and business analysis

## Config Location

`cagents-memory/_system/config/routing.yaml` (under `domains.business` and `domains.growth`; consolidated in v12 W4.2 — the legacy `business/config/domain_overrides.yaml` and `growth/config/domain_overrides.yaml` paths no longer exist)

---
paths:
  - "business/**"
  - "growth/**"
---

# Business Domain Guidelines

Domain-specific patterns for strategy, product, operations, finance, marketing, and sales workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **operations-manager**: Process optimization, operational workflows
- **campaign-manager**: Campaign execution, marketing tactics

**Tier 3** (Complex):
- **Primary**: strategic-planner (business strategy coordination)
- **Supporting**: marketing-strategist (marketing), sales-strategist (sales), finance-manager (financial)

**Tier 4** (Expert):
- **Executive**: cpo (product oversight), cfo (financial oversight)
- **Primary**: strategic-planner (coordination)
- **Supporting**: operations-manager, marketing-strategist, finance-manager

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
- **copywriter**: Sales copy, marketing content, ad copy
- **marketing-analyst**: Campaign metrics, market analysis
- **sales-strategist**: Sales process, deal strategy
- **finance-manager**: Budgeting, financial reporting
- **operations-manager**: Process optimization
- **product-owner**: Product requirements, backlog management
- **business-analyst**: Requirements analysis, process mapping
- **seo-specialist**: Search optimization, keyword research

## Config Location

`business/config/domain_overrides.yaml`

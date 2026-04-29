---
paths:
  - "operator/business-ops/operations-*/**"
  - "operator/business-ops/finance-*/**"
  - "operator/business-ops/procurement-*/**"
  - "operator/business-ops/supply-chain-*/**"
  - "operator/business-ops/quality-manager*/**"
  - "operator/business-ops/facilities-*/**"
  - "operator/business-ops/risk-*/**"
  - "operator/business-ops/process-*/**"
---

# Operations & Finance Guidelines

Operations and finance agents are part of the **business** domain in v10.0.0. This rules file provides specialized patterns for operations and finance workflows.

## Controller Selection

For operations/finance requests within the business domain:

**Tier 2**: operations-manager, finance-manager
**Tier 3**: + strategic-planner, compliance-officer
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

`business/config/domain_overrides.yaml`

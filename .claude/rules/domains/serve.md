---
paths:
  - "agents/operator/support/**"
  - "agents/advisor/legal/**"
---

# Service Domain Guidelines

> **Overlay status (V11.1.0+)**: This file describes a legacy *domain*
> overlay used for routing keywords and controller catalogs. The canonical
> agent organization is the 9-archetype tree (`developer/`, `operator/`,
> `advisor/`, `analyst/`, `creator/`, `writer/`, `strategist/`, `core/`,
> `leadership/`). Domain-keyworded requests still resolve through this
> overlay, but new agents live under archetype roots. See
> `.claude/rules/core/skill-format.md` for the canonical schema.


Domain-specific patterns for customer experience, legal, and compliance workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **support-director**: Customer relationships, account management, support operations
- **general-counsel**: Legal review, contract management

**Tier 3** (Complex):
- **Primary**: support-director (customer experience coordination)
- **Supporting**: general-counsel (legal and compliance)

**Tier 4** (Expert):
- **Executive**: general-counsel (legal oversight)
- **Primary**: support-director (coordination)

## Typical Questions

Serve controllers typically ask:

**Customer Experience**:
- "What is the current customer satisfaction level?"
- "What are the top customer pain points?"
- "How can we improve the customer journey?"

**Legal & Compliance**:
- "What legal considerations apply to this matter?"
- "What contractual obligations exist?"
- "What regulatory requirements must we meet?"

**Support Operations**:
- "What is the current support ticket volume and trends?"
- "What are the common support issues?"
- "How can we reduce time to resolution?"

## Execution Agents

Common serve execution agents:
- **support-director**: Ticket resolution, escalation, support metrics, journey mapping
- **general-counsel**: Legal research, document review, compliance, contract drafting
- **technical-writer**: Knowledge base and help content

## Config Location

`cagents-memory/_system/config/routing.yaml` (under `domains.service`; consolidated in v12 W4.2 — the legacy `service/config/domain_overrides.yaml` path no longer exists)

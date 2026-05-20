---
paths:
  - "service/**"
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
- **customer-success-manager**: Customer relationships, account management
- **general-counsel**: Legal review, contract management
- **account-manager**: Account planning, retention
- **support-operations-manager**: Support process optimization

**Tier 3** (Complex):
- **Primary**: support-director (customer experience coordination)
- **Supporting**: general-counsel (legal), compliance-officer (compliance), legal-operations-manager, relationship-manager

**Tier 4** (Expert):
- **Executive**: general-counsel (legal oversight)
- **Primary**: support-director (coordination)
- **Supporting**: compliance-officer, customer-advocacy-manager

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
- **customer-support-rep**: Ticket resolution, customer assistance
- **legal-analyst**: Legal research, document review
- **compliance-specialist**: Compliance monitoring, audit support
- **contracts-manager**: Contract drafting, negotiation
- **support-analyst**: Support metrics, journey mapping
- **escalation-manager**: Complex issue resolution

## Config Location

`cagents-memory/_system/config/routing.yaml` (under `domains.service`; consolidated in v12 W4.2 — the legacy `service/config/domain_overrides.yaml` path no longer exists)

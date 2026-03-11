---
paths:
  - "service/**"
---

# Service Domain Guidelines

Domain-specific patterns for customer experience, legal, and compliance workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **customer-success-manager**: Customer relationships, account management
- **general-counsel**: Legal review, contract management
- **account-manager**: Account planning, retention
- **support-operations-manager**: Support process optimization

**Tier 3** (Complex):
- **Primary**: vp-customer-support (customer experience coordination)
- **Supporting**: general-counsel (legal), compliance-officer (compliance), legal-operations-manager, relationship-manager

**Tier 4** (Expert):
- **Executive**: general-counsel (legal oversight)
- **Primary**: vp-customer-support (coordination)
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
- **contract-manager**: Contract drafting, negotiation
- **customer-experience-analyst**: CX metrics, journey mapping
- **escalation-specialist**: Complex issue resolution

## Config Location

`service/config/domain_overrides.yaml`

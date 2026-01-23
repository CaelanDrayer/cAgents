# Serve Domain Guidelines

Domain-specific patterns for customer experience, legal, and compliance workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **customer-success-manager**: Customer relationships, account management
- **legal-counsel**: Legal review, contract management

**Tier 3** (Complex):
- **Primary**: cx-director (customer experience coordination)
- **Supporting**: customer-success-manager (accounts), legal-counsel (legal)

**Tier 4** (Expert):
- **Executive**: general-counsel (legal oversight)
- **Primary**: cx-director (coordination)
- **Supporting**: customer-success-manager, legal-counsel, compliance-director

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

`Agent_Memory/_system/domains/serve/*.yaml`

# Operate Domain Guidelines

Domain-specific patterns for finance and operations workflows.

## Controller Selection

**Tier 2** (Moderate complexity):
- **operations-manager**: Process optimization, operational workflows
- **finance-manager**: Budgeting, financial reporting

**Tier 3** (Complex):
- **Primary**: operations-manager (operations coordination)
- **Supporting**: finance-manager (financial), compliance-officer (compliance)

**Tier 4** (Expert):
- **Executive**: cfo (financial oversight), coo (operations oversight)
- **Primary**: operations-manager (coordination)
- **Supporting**: finance-manager, compliance-officer, risk-manager

## Typical Questions

Operate controllers typically ask:

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

## Execution Agents

Common operate execution agents:
- **financial-analyst**: Financial modeling, analysis
- **accountant**: Bookkeeping, financial records
- **operations-analyst**: Process analysis, efficiency studies
- **procurement-specialist**: Vendor management, purchasing
- **compliance-analyst**: Regulatory compliance, audit prep
- **risk-analyst**: Risk assessment, mitigation planning

## Config Location

`Agent_Memory/_system/domains/operate/*.yaml`

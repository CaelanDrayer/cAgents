# Finance Domain (@cagents/finance)

Comprehensive financial planning, analysis, accounting, and treasury management domain for cAgents.

## Overview

The Finance domain provides 22 specialized agents covering all aspects of corporate finance - from day-to-day accounting operations to strategic financial planning and investor relations.

## Agent Structure

### Workflow Agents (5)
Core workflow orchestration for finance tasks:

- **router** - Classifies finance task complexity (tier 0-4) and assigns templates
- **planner** - Decomposes finance tasks with fiscal timelines and stakeholder coordination
- **executor** - Coordinates finance team agents and aggregates deliverables
- **validator** - Quality gate for deliverables (completeness, GAAP, data accuracy)
- **self-correct** - Adaptive recovery for finance deliverables

### Executive Leadership (1)
- **cfo** - Chief Financial Officer: Strategic financial leadership, capital allocation, investor relations, risk management

### Team Agents (16)

#### Financial Planning & Analysis
- **financial-analyst** - Financial analysis, metric calculation, trend analysis, KPI dashboards
- **fp-and-a-manager** - Strategic planning, forecast coordination, executive reporting, driver-based modeling
- **budget-analyst** - Budget preparation, variance analysis, budget tracking, departmental support

#### Accounting Operations
- **accounting-manager** - General ledger, financial reporting, accounting policy, close coordination
- **accounts-payable-specialist** - Vendor payments, expense processing, AP reconciliation
- **accounts-receivable-specialist** - Customer invoicing, collections, AR reconciliation, cash application
- **payroll-specialist** - Payroll processing, benefits administration, tax withholding, compliance
- **financial-controller** - Financial close leadership, internal controls, GAAP compliance, SOX oversight

#### Treasury & Cash Management
- **treasury-manager** - Cash management, liquidity planning, banking relationships, debt management, FX

#### Tax & Compliance
- **tax-specialist** - Tax planning, compliance, filing, credits and deductions optimization
- **financial-auditor** - Internal audit, control testing, SOX compliance, audit findings

#### Specialized Finance
- **cost-analyst** - Cost allocation, profitability analysis, product costing, margin analysis
- **credit-analyst** - Credit assessment, risk evaluation, collection strategy, credit policy
- **investor-relations-manager** - Investor communications, earnings reports, analyst relations
- **financial-systems-analyst** - ERP systems, reporting tools, data integration, automation
- **revenue-recognition-specialist** - Revenue accounting, ASC 606 compliance, contract analysis, deferred revenue

## Workflow Templates

The Finance Router assigns tasks to these templates based on deliverable type:

### budget_plan
- **Use for**: Annual budgets, departmental budgets, project budgets
- **Deliverables**: Budget spreadsheet, variance analysis, assumptions documentation
- **Agents**: Budget Analyst, FP&A Manager, Accounting Manager

### financial_forecast
- **Use for**: Revenue forecasts, expense projections, multi-year financial models
- **Deliverables**: Forecast models, scenario analysis, sensitivity tables
- **Agents**: FP&A Manager, Financial Analyst, Cost Analyst

### financial_analysis
- **Use for**: ROI analysis, profitability analysis, financial metrics, KPI reports
- **Deliverables**: Analysis reports, dashboards, executive summaries
- **Agents**: Financial Analyst, Cost Analyst, FP&A Manager

### cash_flow_plan
- **Use for**: Cash flow projections, liquidity management, working capital analysis
- **Deliverables**: Cash flow statements, liquidity forecasts, working capital reports
- **Agents**: Treasury Manager, FP&A Manager, Accounting Manager

### audit_plan
- **Use for**: Internal audits, compliance reviews, control testing
- **Deliverables**: Audit reports, findings documentation, remediation plans
- **Agents**: Financial Auditor, Financial Controller, CFO

### financial_close
- **Use for**: Month-end close, quarter-end close, year-end close
- **Deliverables**: Financial statements, reconciliations, journal entries
- **Agents**: Accounting Manager, Financial Controller, AP, AR, Payroll specialists

## Detection Keywords

The Trigger agent routes to Finance domain when detecting these keywords:

**Budget & Planning**: budget, expense, cost, spending, allocation, forecast, projection, model, scenario
**Revenue & Earnings**: revenue, sales, income, earnings, top-line
**Financial Analysis**: ROI, NPV, IRR, payback, profitability, margin, EBITDA, EPS
**Financial Statements**: P&L, income statement, balance sheet, cash flow statement
**Accounting**: GAAP, IFRS, accrual, depreciation, amortization, journal entry
**Treasury**: cash, liquidity, working capital, AR, AP, cashflow
**Tax**: tax, deduction, credit, compliance, filing, IRS
**Audit**: audit, control, compliance, SOX, internal control
**Specialized**: cost allocation, revenue recognition, investor relations, credit analysis

## Example Use Cases

### Annual Budget
```
User: "Create the FY2026 annual budget"
Router: Tier 3, budget_plan template
Planner: 4 phases - data collection, analysis, consolidation, review
Executor: Coordinates Budget Analyst, FP&A Manager, dept heads
Deliverables: Consolidated budget model, variance vs. targets, assumptions doc
```

### Quarterly Forecast
```
User: "Update Q2 forecast based on Q1 actuals"
Router: Tier 2, financial_forecast template
Planner: 3 phases - actuals review, assumption update, model update
Executor: FP&A Manager updates forecast, Financial Analyst provides analysis
Deliverables: Updated forecast, variance to prior forecast, scenario analysis
```

### Product Profitability Analysis
```
User: "Analyze profitability by product line"
Router: Tier 2, financial_analysis template
Planner: 3 phases - cost allocation, revenue analysis, margin calculation
Executor: Cost Analyst allocates costs, Financial Analyst builds report
Deliverables: Product P&L, margin analysis, recommendations
```

### Month-End Close
```
User: "Close the books for January 2026"
Router: Tier 3, financial_close template
Planner: 5 phases - pre-close, transaction processing, reconciliation, reporting, review
Executor: Accounting Manager coordinates AP, AR, Payroll specialists
Deliverables: Financial statements, account reconciliations, close checklist
```

### Cash Flow Forecast
```
User: "Build 13-week cash flow forecast"
Router: Tier 2, cash_flow_plan template
Planner: 4 phases - baseline, inflows, outflows, net position
Executor: Treasury Manager builds forecast, AR/AP specialists provide inputs
Deliverables: Weekly cash forecast, liquidity metrics, contingency plan
```

### Tax Planning
```
User: "Develop tax strategy to minimize liability"
Router: Tier 3, financial_analysis template
Planner: Tax planning phases - current position, opportunities, recommendations
Executor: Tax Specialist analyzes, consults CFO
Deliverables: Tax strategy memo, estimated savings, implementation plan
```

## Complexity Tiers

| Tier | Type | Example | Workflow |
|------|------|---------|----------|
| 0 | Trivial | "What is EBITDA?" | Direct answer |
| 1 | Simple | "Calculate ROI for project X" | Execute → Validate |
| 2 | Moderate | "Create Q4 budget forecast" | Plan → Execute → Validate |
| 3 | Complex | "Annual financial close" | Full team coordination |
| 4 | Expert | "5-year strategic financial plan" | Full team + CFO + HITL |

## Key Financial Metrics

### Profitability
- Revenue growth (YoY, QoQ)
- Gross margin %
- EBITDA and EBITDA margin %
- Net income and EPS

### Efficiency
- Days sales outstanding (DSO)
- Days payable outstanding (DPO)
- Inventory turns
- Operating expense ratio

### Liquidity
- Current ratio
- Quick ratio
- Cash runway (months)
- Free cash flow

### Leverage
- Debt/equity ratio
- Interest coverage ratio
- Debt service coverage ratio

## Installation

```bash
# Install Finance domain plugin
claude /plugin install @cagents/finance

# Or install from local development
cd cAgents/finance
claude --plugin-dir .
```

## Usage

```bash
# Trigger automatically routes finance tasks
/trigger Create FY2026 annual budget
/trigger Update Q2 revenue forecast
/trigger Analyze product line profitability
/trigger Close the books for January
/trigger Build 13-week cash flow forecast
```

## Integration with Other Domains

### With Software Domain
- Financial systems implementation projects
- ERP development and customization
- Reporting automation and BI tools

### With Business Domain
- Strategic planning with financial modeling
- Business case development with ROI analysis
- Market analysis with financial impact assessment

### With Core
- Universal Trigger for domain routing
- Orchestrator for phase management
- HITL for complex financial decisions

## Dependencies

- **Core Domain** (@cagents/core): Required for workflow orchestration
- **No external dependencies**: File-based, self-contained

## Architecture

- **Agent_Memory/**: All state persists in file-based memory system
- **Templates**: Pre-defined workflow patterns for common finance deliverables
- **Collaboration**: Finance agents coordinate through file-based communication
- **GAAP Compliance**: Built-in compliance with accounting standards
- **Scalable**: Can handle simple calculations to complex multi-year strategic plans

## Version

**1.0.0** - Initial release

## License

MIT

## Author

CaelanDrayer

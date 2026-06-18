> Sub-resource for mode `finance` — relocated verbatim from `agents/operator/business-ops/finance-manager/resources/best-practices.md` (zero-loss consolidation).

# Best Practices: Finance Manager

> Design principles, patterns, and frameworks that guide high-quality financial planning, budget management, cost analysis, and financial reporting work.

## Design Principles

- **Accuracy Before Speed**: Financial figures that are fast but wrong destroy trust and lead to bad decisions — establish data integrity first, then optimize reporting velocity.
- **Variance Deserves Explanation, Not Just Documentation**: Every significant budget variance must be explained with root cause, not just flagged — unexplained variance is unmanaged variance.
- **Forward-Looking Bias**: The most valuable financial work is forecasting and scenario modeling, not historical reporting — focus energy on enabling future decisions.
- **Cash Is King**: Profitability on paper means nothing if cash runs out — track cash flow with the same rigor as P&L, especially in high-growth or capital-intensive environments.
- **Zero-Based Thinking Annually**: Require every budget line to re-justify its existence each cycle rather than applying inflation multiples to last year — prevents embedded waste from compounding.
- **Stakeholder Fluency**: Translate financial complexity into business language — CFOs and PMs need different formats from the same underlying data.
- **Control Without Bureaucracy**: Financial controls must prevent errors and fraud without creating approval friction that slows the business. Right-size controls to risk level.

## Key Patterns & Frameworks

- **Zero-Based Budgeting (ZBB)**: Build the budget from scratch each cycle, requiring every line to be justified from zero. Apply annually for cost centers with significant discretionary spend.
- **Rolling Forecast**: Continuously updated 12-18 month financial projection replacing or supplementing annual budgets. Keeps forecasts current as business conditions change.
- **Variance Analysis Framework**: Budget vs. Actual → Identify variances → Root cause (volume vs. price vs. mix vs. timing) → Corrective action. Apply monthly to every material budget line.
- **Break-Even Analysis**: Fixed costs ÷ (Unit price - Variable cost) = Break-even units. Apply to new products, initiatives, or business models to identify minimum scale for viability.
- **NPV / IRR Analysis**: Net Present Value and Internal Rate of Return for investment decisions. Apply to CapEx proposals, new programs, or build-vs-buy decisions.
- **Payback Period**: Time to recover initial investment from net cash flows. Apply alongside NPV for stakeholder communication about investment risk.
- **Contribution Margin Analysis**: Revenue minus variable costs at product or segment level. Apply to understand which products/customers drive profitability before fixed cost allocation.
- **Cost Allocation Methods**: Direct, step-down, and reciprocal allocation approaches for attributing shared costs to cost centers or products. Select method based on accuracy need vs. administrative cost.
- **Sensitivity Analysis**: Model financial outcomes under varying assumptions (best case, base case, worst case). Apply to any forecast or investment decision with material uncertainty.
- **Driver-Based Forecasting**: Build financial models from operational drivers (headcount, transactions, utilization) rather than historical trend lines. Produces forecasts that reflect business dynamics.

## Domain Concepts & Terminology

### Financial Statements
- **Income Statement (P&L)**: Revenue → Gross Profit → EBITDA → Net Income — measures profitability over a period
- **Balance Sheet**: Assets = Liabilities + Equity — snapshot of financial position at a point in time
- **Cash Flow Statement**: Operating, investing, and financing cash flows — tracks actual cash generation and usage
- **EBITDA**: Earnings Before Interest, Taxes, Depreciation, and Amortization — common measure of operating performance
- **Working Capital**: Current assets minus current liabilities — measures short-term financial health

### Budgeting & Forecasting
- **Budget**: Planned financial performance for the period; approved baseline for variance measurement
- **Forecast**: Current best estimate of financial performance for the remaining period; updated as conditions change
- **Rolling Forecast**: Continuous 12-18 month projection extending forward as each month closes
- **CapEx (Capital Expenditure)**: Investment in long-term assets (equipment, software, infrastructure) capitalized on the balance sheet
- **OpEx (Operating Expenditure)**: Day-to-day operational costs expensed in the period incurred
- **Headcount Plan**: Approved staffing levels by role and period; primary driver of personnel cost forecasts

### Cost Analysis
- **Fixed Costs**: Costs that don't change with production volume (rent, salaries, depreciation)
- **Variable Costs**: Costs that scale directly with output or revenue (materials, commissions, transaction fees)
- **Semi-Variable Costs**: Costs with a fixed base and variable component (utilities, staffing with overtime)
- **Cost Center**: Organizational unit that incurs costs without directly generating revenue
- **Profit Center**: Organizational unit with both revenue and cost responsibility
- **Gross Margin**: (Revenue - COGS) ÷ Revenue — measures production efficiency before operating expenses

### Investment Analysis
- **NPV (Net Present Value)**: Sum of discounted future cash flows minus initial investment — positive NPV indicates value creation
- **IRR (Internal Rate of Return)**: Discount rate at which NPV equals zero — hurdle rate comparison benchmark
- **Payback Period**: Time required for cumulative cash inflows to equal the initial investment
- **ROI (Return on Investment)**: (Net Benefit ÷ Cost) × 100 — simple return measure for comparing investments
- **WACC (Weighted Average Cost of Capital)**: Blended cost of debt and equity funding — used as the discount rate in NPV calculations

## Anti-Patterns to Avoid

- **Budget Theater**: Going through annual budgeting motions that everyone knows will change immediately after Q1 closes. Fix: adopt rolling forecasts that reflect current reality; reserve annual budgets for board-level commitments.
- **Sandbagging**: Managers consistently under-forecasting to create easy-to-beat targets. Fix: track forecast accuracy by manager; build incentives for accurate forecasting, not just attainment.
- **Variance Without Root Cause**: Monthly reports show red/green budget vs. actual without explaining why. Fix: require root cause categorization (volume, price, timing, one-time) for every material variance.
- **Spreadsheet Hell**: Critical financial models maintained in disconnected spreadsheets with manual data entry and no audit trail. Fix: invest in connected planning tools with data governance and version control.
- **Allocations Without Logic**: Shared costs distributed across business units using headcount or revenue proxies that don't reflect actual consumption. Fix: use activity-based costing or driver-based allocation where cost behavior is understood.
- **Cash Blind**: Focus exclusively on P&L without tracking cash generation and working capital. Fix: add cash flow forecasting to every monthly financial review.
- **Over-Controlling Small Spend**: Requiring multiple approvals for small purchases while large commitments sail through. Fix: right-size approval thresholds to actual risk — low-value, recurring spend should be streamlined.

## Quality Indicators

- **Forecast Accuracy**: Variance between rolling forecast and actual outcome (target: within ±5% for 3-month forward periods).
- **Budget-to-Actual Variance Explained**: % of material variances with documented root cause (target: 100% for variances >5% or $X threshold).
- **Financial Close Cycle Time**: Days from period end to final financial statements (target: hard close within 5 business days).
- **Cost Coverage Ratio**: % of budget lines with documented owner and justification (target: 100% going into budget cycle).
- **Receivables Days (DSO)**: Average days outstanding for accounts receivable — rising DSO signals collection issues that compress cash.
- **Expense Report Compliance Rate**: % of expense reports submitted on time with required documentation (target: >95%).
- **Finance Stakeholder Satisfaction**: Business unit leaders' rating of finance partner responsiveness and insight quality.

## Collaboration Touchpoints

- **With Operations Manager**: Quality looks like operational KPIs linked to financial drivers, budget models built on operational assumptions, and cost reduction opportunities identified through operational data.
- **With Strategic Planner**: Quality looks like scenario models supporting strategic options, long-range financial planning integrated with strategy cycles, and investment cases structured for board-level decisions.
- **With Procurement Specialist**: Quality looks like spend analytics by category and vendor, savings targets set with realistic baselines, and contract value tracked against budget commitments.
- **With Resource Planner**: Quality looks like headcount plans translated into personnel cost forecasts, hiring timing coordinated with budget availability, and utilization data informing staffing decisions.

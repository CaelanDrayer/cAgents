# Best Practices: Compensation Analyst

> Design principles, patterns, and frameworks that guide high-quality compensation analysis and pay structure work.

## Design Principles

- **Market-Anchored Pay**: Ground all compensation decisions in current market data from reputable surveys (Radford, Mercer, Payscale, Levels.fyi); internal opinion cannot substitute for market truth.
- **Pay Equity by Design**: Build equity analysis into every compensation process — annual review, offer approvals, and promotions — not just as a periodic audit.
- **Total Rewards Lens**: Evaluate compensation holistically (base + bonus + equity + benefits); optimizing base in isolation creates false precision.
- **Transparency Proportional to Maturity**: Be as transparent as the organization can operationally support; pay transparency done poorly damages trust more than opacity.
- **Consistency Before Exceptions**: Establish clear comp philosophy and ranges before making exceptions; exceptions erode frameworks over time.
- **Philosophy Drives Structure**: Comp philosophy (market position, pay mix, equity approach) must precede salary range design — never reverse this order.
- **Data Quality Over Quantity**: Three high-quality survey data points beat ten unreliable ones; validate survey methodology before trusting benchmarks.

## Key Patterns & Frameworks

- **Job Architecture Model**: Hierarchical framework of job families, functions, levels, and grades that provides the spine for all compensation structures. Define before building ranges.
- **Market Pricing Process**: Match each job to survey benchmarks by job content (not title), blend multiple survey sources, and apply geographic differentials before computing ranges.
- **Pay Band Design (Min-Mid-Max)**: Structure ranges around the market midpoint (50th percentile target = 1.0 compa-ratio) with range spread of 50-80% depending on level.
- **Compa-Ratio Analysis**: Measure each employee's pay relative to range midpoint (salary ÷ midpoint); flag outliers below 0.85 (compression risk) or above 1.15 (flight risk from frozen pay).
- **Pay Equity Regression Model**: Control for legitimate factors (level, function, geography, tenure, performance) to isolate unexplained pay differences by gender/race; target <5% unexplained gap.
- **Annual Merit Cycle Design**: Structure merit increases as a matrix of performance rating × compa-ratio position; higher merit for high performers in lower range position.
- **Offer Approval Framework**: Define approval tiers by offer deviation from range midpoint (±10% auto-approve, ±20% manager approval, >20% exec approval).
- **Equity Refresh Model**: Schedule systematic equity grants for retention and performance; model dilution impact before grant dates.
- **Bonus Plan Design**: Define target bonus percent by level, funding mechanism (company performance multiplier), and individual performance modifier to create a fair, motivating plan.

## Domain Concepts & Terminology

### Pay Structure
- **Compensation Philosophy**: Statement of how the org positions pay relative to market (50th percentile base, 75th total comp, etc.)
- **Pay Band / Salary Range**: Min-midpoint-max structure for a job grade; range spread = (max-min)/min
- **Job Grade / Level**: Standardized level within job architecture (IC3, IC4, M1, M2, etc.)
- **Midpoint**: Target market rate; the anchor of a pay range (typically 50th percentile)
- **Compa-Ratio**: Employee salary ÷ range midpoint; 1.0 = perfectly at market
- **Range Penetration**: (Salary - Min) / (Max - Min); measures how deep into the range an employee sits

### Market Data
- **Survey Aging**: Adjusting prior-year survey data forward using compensation trend factors (typically 3-5% annually)
- **Geographic Differential**: Location-based pay adjustment; e.g., San Francisco = 120% of national median
- **P25/P50/P75/P90**: Percentile positions in market data; most companies target P50 base, P75 total comp
- **Leveling Match**: Aligning internal job to the correct survey benchmark based on scope and impact, not title
- **Blend/Composite**: Weighted average across multiple survey sources to reduce single-source bias

### Variable Compensation
- **Annual Incentive Plan (AIP)**: Performance-based cash bonus; typically expressed as % of base salary
- **Target Bonus**: Expected bonus at 100% goal achievement
- **Threshold / Target / Stretch**: Minimum / expected / maximum bonus payout levels
- **Funding Mechanism**: Company performance metric that scales the bonus pool (revenue, EBITDA, etc.)
- **Individual Performance Modifier**: Multiplier applied to target bonus based on individual rating

### Equity Compensation
- **Stock Options / ISO / NSO**: Right to purchase stock at grant price; ISO = tax-advantaged for employees
- **RSU (Restricted Stock Unit)**: Grant of shares vesting over time (typically 4 years, 1-year cliff)
- **Cliff Vesting**: No vesting until 1-year anniversary, then accelerated or monthly thereafter
- **409A Valuation**: IRS-required fair market value assessment for private company option pricing
- **Dilution**: Reduction in existing shareholder ownership percentage from new share issuance
- **Refresher Grant**: Equity grant for retention of current employees outside of new hire grants

### Pay Equity
- **Unexplained Pay Gap**: Pay differential not accounted for by legitimate business factors
- **Regression Analysis**: Statistical method to control for job-relevant variables and isolate demographic pay gaps
- **Pay Transparency**: Disclosure of pay ranges to candidates (often legally required) and employees

## Anti-Patterns to Avoid

- **Title-Based Market Matching**: Matching jobs by title rather than content leads to mispositioning; "Senior Engineer" means different things at different companies.
- **Outdated Survey Data**: Using last year's benchmarks without aging or updating survey participation causes ranges to fall behind market quickly.
- **Comp-as-Reward-Only**: Using off-cycle equity grants or bonuses as the primary recognition mechanism depletes budget without building systematic motivation.
- **Ignoring Internal Equity**: Optimizing each new hire offer for market competitiveness without checking compression against existing team members creates retention risk.
- **One-Size Bonus Plans**: Applying the same bonus structure across all functions ignores meaningful differences in how roles drive business value.
- **Pay Transparency Without Infrastructure**: Announcing ranges without training managers on how to discuss pay creates confusion and damages trust.
- **Equity Without Dilution Modeling**: Granting equity without modeling total dilution impact on cap table is financially irresponsible to existing shareholders.

## Quality Indicators

- **Compa-Ratio Distribution**: 80%+ of employees between 0.85-1.15 compa-ratio; <5% below 0.80 (compression)
- **Pay Equity Gap**: Unexplained pay gap <5% by gender, <3% by race after regression analysis
- **Offer Acceptance Rate**: 80%+ for offers within range; <60% signals market misalignment
- **Market Data Coverage**: 90%+ of roles have valid survey matches (3+ data points per benchmark)
- **Merit Cycle Completion**: 100% of eligible employees receive merit decisions within cycle window
- **Audit Trail Quality**: Every offer and adjustment has documented justification and approval records
- **Annual Survey Participation**: Active participation in 2+ primary surveys to receive peer group data

## Collaboration Touchpoints

- **With Benefits Administrator**: Model total rewards competitiveness including benefits value; align on annual total comp benchmarking and new hire offer total package.
- **With HR Analyst**: Partner on pay equity analyses, compa-ratio reporting, and merit cycle dashboards; analyst builds the data infrastructure, compensation analyst interprets and acts.
- **With Talent Acquisition Manager**: Set offer approval thresholds, advise on competitive offer construction for hard-to-fill roles, and flag when candidate expectations exceed range midpoints.
- **With HR Business Partner**: Advise on compensation strategy for specific business units; provide market data to support org design and leveling decisions.
- **With Finance**: Coordinate merit budget planning, bonus accruals, and equity expense forecasting; compensation decisions have direct P&L impact.

# Best Practices: Pricing Analyst

> Design principles, patterns, and frameworks that guide high-quality pricing strategy, package design, and discount optimization work.

## Design Principles

- **Value-Based Before Cost-Based**: Price to the value the customer receives, not the cost it took to build — cost-plus pricing leaves money on the table
- **Pricing is a Product Decision**: Packaging and pricing choices shape which customers you attract, how they use the product, and which segments you win
- **Anchoring Shapes Perception**: Presenting a high-anchor option first makes subsequent options appear more reasonable — use pricing architecture intentionally
- **Willingness to Pay Varies by Segment**: Different customer segments will pay different amounts for the same product based on their value realization — segment-differentiated pricing unlocks more revenue
- **Discount Policy is Strategy**: Uncontrolled discounting trains buyers to expect it, compresses margins, and destroys pricing integrity across all deals
- **Small Price Changes Have Large Revenue Impact**: A 5% price increase on a product with 70% gross margins has 3× the bottom-line impact of reducing COGS by 5%
- **Price Tests Beat Price Opinions**: Executive opinions about the right price are less reliable than controlled market tests with real buyers

## Key Patterns & Frameworks

- **Van Westendorp Price Sensitivity Meter**: Four survey questions identifying the too-expensive, too-cheap, acceptable, and ideal price points for a product — produces a defensible price range
- **Conjoint Analysis**: Survey methodology that measures willingness-to-pay for specific product features and packaging options by having respondents make trade-off choices
- **Competitive Price Positioning Matrix**: Plot your price relative to competitors on a quality/value map — defines whether you're positioned as premium, competitive, or value
- **Price Elasticity Model**: Estimates how demand changes with price changes; elastic products lose significant volume when priced up; inelastic products can be priced up without volume loss
- **Good/Better/Best Tier Architecture**: Three-tier packaging designed to anchor buyers toward the middle tier — Good (entry), Better (recommended), Best (premium) with deliberate feature allocation between tiers
- **Value Metric Selection**: The unit of value that the pricing model should track (e.g., per user, per API call, per GB, per revenue %) — drives upsell motion and aligns cost with value delivery
- **Deal Desk Framework**: Approval tiers for discounts based on ARR size, segment, strategic account status, and competitive situation — prevents ad hoc discounting without governance
- **LTV Impact Modeling**: Modeling how pricing changes affect LTV by simulating changes in acquisition rate, churn rate, and expansion revenue — connects pricing to long-term business outcomes
- **Promotional Pricing Guidelines**: Defined criteria for when time-limited discounts are appropriate (new product launch, market penetration, competitive displacement) vs. standard business (never)
- **Price Change Communication Playbook**: Internal sales briefing, customer communication timeline, grandfathering policy for existing customers, and FAQs — manages pricing changes without churn or sales friction

## Domain Concepts & Terminology

### Pricing Models
- **Value-Based Pricing**: Setting price based on the economic value the customer receives, not the cost to produce
- **Cost-Plus Pricing**: Adding a margin to the cost of goods sold — simple but ignores customer willingness to pay
- **Competitive Pricing**: Setting price relative to competitors' prices — common but surrenders pricing power
- **Penetration Pricing**: Setting an artificially low price to gain market share quickly — effective for market entry, unsustainable long-term
- **Freemium**: A permanently free tier that creates product adoption and drives conversion to paid higher tiers

### SaaS-Specific Models
- **Per-Seat / Per-User**: Pricing based on the number of users — easy to understand, scales with organizational adoption
- **Usage-Based / Consumption**: Pricing based on actual product usage (API calls, data processed, events) — aligns cost with value but creates revenue unpredictability
- **Flat-Rate**: Fixed monthly/annual price regardless of usage or users — simple but doesn't capture expansion revenue
- **Tiered Packaging**: Multiple plan options (Starter/Growth/Enterprise) with different feature sets and price points

### Economics
- **Price Elasticity**: The sensitivity of demand to price changes; elasticity = % change in quantity ÷ % change in price
- **Willingness to Pay (WTP)**: The maximum price a buyer will accept before choosing an alternative or not buying
- **Price Anchoring**: The cognitive bias by which a first-presented price strongly influences perception of subsequent prices
- **Price-to-Value Gap**: The gap between perceived value and current price — positive gap means you're leaving money on the table
- **Discount Rate**: The percentage reduction from list price applied during a deal negotiation
- **ARR (Annual Recurring Revenue)**: Primary revenue metric for subscription businesses; pricing changes directly affect ARR

## Anti-Patterns to Avoid

- **Rounding to Market**: Setting prices to match or slightly undercut competitors cedes pricing power and signals lack of confidence in differentiated value
- **Feature-Driven Tiers Without Value Logic**: Splitting features into tiers based on build cost rather than customer value leads to packaging that doesn't align with what customers are willing to pay for
- **No Discount Policy**: Allowing sales reps to discount freely based on individual judgment creates margin compression and teaches buyers that list price is fictional
- **Ignoring Small Segments with High WTP**: Focusing pricing strategy only on the largest segments misses niche, high-willingness-to-pay segments that could improve overall revenue mix
- **Pricing by Executive Instinct**: Using "gut feel" or sales manager opinion to set prices without market research generates prices that are either too high (lost deals) or too low (lost margin)
- **Static Pricing**: Setting prices and not revisiting them as the product's value delivery, competitive context, and customer segments evolve
- **List Price Divorce from Value**: When list price bears no relationship to delivered value, the entire sales negotiation becomes a discount conversation rather than a value conversation

## Quality Indicators

- **Win Rate by Price Point**: Are you losing more deals above or below a specific price threshold — signals where the willingness-to-pay cliff is
- **Average Selling Price (ASP) Trend**: Rising ASP indicates pricing strategy is capturing more value; declining ASP without explanation indicates discount creep
- **Discount Depth Distribution**: Histogram of discount sizes applied across all deals — identifies whether outlier discounts are becoming the norm
- **Tier Distribution**: How customers distribute across pricing tiers — if >80% are on the lowest tier, packaging design may not be creating sufficient value at mid-tier
- **Expansion Revenue Rate**: Rate at which existing customers expand spend — a signal of value metric alignment and tier upgrade path effectiveness
- **Price Testing Coverage**: What percentage of key pricing decisions have been validated with market research or A/B testing vs. assumption?
- **Gross Margin by Segment**: Whether pricing adequately compensates for segment-specific costs (support burden, implementation complexity)

## Collaboration Touchpoints

- **With Sales Strategist**: Pricing strategy must align with the overall sales motion — enterprise vs. SMB vs. PLG pricing architectures require different approaches
- **With Product Marketing Manager**: Packaging tiers and feature allocation across plans require joint design; PMM understands what features customers value most
- **With Revenue Operations Manager**: Deal desk approval workflows, discount tracking, and pricing data quality in the CRM require shared ownership
- **With Finance Manager**: Pricing changes must be modeled for revenue and margin impact; finance validates the financial model and owns the forecast implications
- **With Sales Ops Specialist**: CPQ (Configure-Price-Quote) system configuration, price book management, and discount approval workflows are operationalized by sales ops based on pricing analyst specifications

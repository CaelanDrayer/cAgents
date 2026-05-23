# Best Practices: Growth Marketer

> Design principles, patterns, and frameworks that guide high-quality growth experimentation, funnel optimization, and retention improvement work.

## Design Principles

- **Experimentation is the Core Competency**: Growth marketing is a scientific process — hypothesize, test, measure, iterate; conviction without evidence is just opinion
- **Compound Small Wins**: A portfolio of 5–10% improvements compounds significantly over a year — don't wait for the breakthrough
- **Acquisition Means Nothing Without Retention**: Pouring users into a leaky bucket accelerates burn; fix retention before scaling acquisition
- **The North Star Metric Organizes Everything**: One metric that best captures delivered customer value should guide prioritization of all growth activities
- **Speed is a Competitive Advantage**: Running 10 experiments in the time a competitor runs 2 generates a learning advantage that compounds
- **Model Before You Build**: Estimate the growth impact of an initiative before investing engineering or design resources — most ideas can be rejected with math alone
- **Viral Mechanics are Designed, Not Discovered**: Network effects and referral loops are engineered deliberately, not accidentally stumbled upon

## Key Patterns & Frameworks

- **AARRR Pirate Metrics**: Acquisition → Activation → Retention → Revenue → Referral — Dave McClure's framework for organizing growth activities across the full lifecycle
- **North Star Metric Framework**: Identify the single metric that best captures the value your product delivers to users (e.g., Airbnb: nights booked; Facebook: monthly active users); align all teams to move it
- **ICE Prioritization**: Impact × Confidence × Ease — score each growth experiment idea to sequence the backlog rationally
- **Growth Loop Architecture**: Map how one cohort of users generates the next (content loop, viral loop, paid loop, product loop) — identify which loops are most efficient and invest in compounding them
- **Viral Coefficient (K-Factor)**: K = invitations sent per user × conversion rate of invitations; K > 1 means organic growth; design referral mechanics explicitly to push K toward 1
- **Activation Funnel Analysis**: Map the exact steps from sign-up to first value realization; identify the step with highest drop-off and run experiments to improve it
- **Cohort Retention Analysis**: Track retention curves by acquisition cohort; identify which cohorts retain best (to find PMF signals) and where the retention cliff occurs
- **GrowthHackers Experiment Framework**: Hypothesis → Expected result → Test design → Minimum detectable effect → Run → Analysis → Decision (scale/kill/iterate)
- **Product-Led Growth (PLG) Motion**: Free or freemium tier creates self-serve activation; product delivers early value that converts free users to paid; usage expands to generate expansion revenue
- **Referral Program Design**: Incentive structure (dual-sided vs. one-sided), referral mechanism (link, code, invite), timing of reward (on sign-up vs. on conversion), and fraud prevention — designed as a system, not a feature

## Domain Concepts & Terminology

### Growth Metrics
- **North Star Metric (NSM)**: The single metric that best represents product value delivered to users
- **Activation Rate**: Percentage of new users who complete the actions that predict long-term retention (the "aha moment")
- **D7/D30/D90 Retention**: Percentage of users who return to the product 7, 30, or 90 days after first use
- **Churn Rate**: Percentage of users or revenue lost in a given period
- **LTV (Lifetime Value)**: Total revenue expected from an average customer over their entire relationship
- **CAC (Customer Acquisition Cost)**: Total acquisition spend divided by new customers acquired
- **LTV:CAC Ratio**: Core unit economics health metric; sustainable growth requires LTV > 3× CAC
- **Payback Period**: Time required to recover CAC through customer revenue

### Experimentation
- **A/B Test**: Controlled experiment comparing two variants to isolate the effect of a specific change
- **Statistical Significance**: Confidence (typically 95%) that the observed difference is not due to random variation
- **Minimum Detectable Effect (MDE)**: The smallest improvement you want to be able to detect — determines required sample size
- **Holdout Group**: A percentage of users not exposed to an experiment, maintained as a pure control

### Viral & Referral
- **K-Factor**: Viral coefficient — the average number of new users each existing user generates through referral
- **Viral Loop**: A product experience where each user's actions naturally invite or expose new potential users
- **Referral Program**: Structured incentive for existing users to invite others — typically dual-sided (both referrer and referee benefit)
- **Network Effect**: Product becomes more valuable as more users join (communications platforms, marketplaces)

### Product-Led Growth
- **Freemium**: A permanently free tier that provides value while creating upgrade motivation
- **Self-Serve**: Users can sign up, activate, and start getting value without a sales interaction
- **Time to Value (TTV)**: How quickly a new user achieves their first meaningful outcome — shorter TTV correlates with higher activation and retention
- **Product Qualified Lead (PQL)**: A free or trial user who has hit usage thresholds that predict conversion to paid

## Anti-Patterns to Avoid

- **Growth Without Retention**: Scaling acquisition before fixing retention burns budget and generates churn, not growth
- **HiPPO-Driven Experiments**: Running tests chosen by executive preference rather than data-backed hypothesis wastes experiment budget and time
- **Short-Cutting Statistical Rigor**: Calling experiments early because results "look good" leads to false positive rates that generate misleading learnings
- **Single-Channel Dependency**: Concentrating growth on one channel (e.g., paid Facebook) creates catastrophic fragility when the channel changes
- **Vanity Metric Growth**: Optimizing registered users or downloads instead of active users and revenue obscures real growth health
- **Feature-First PLG**: Building a freemium tier without designing an activation flow guarantees low conversion from free to paid
- **Ignoring Cohort Quality**: Acquisition channels that generate high volume but low-quality users damage retention metrics and LTV — measure cohort quality, not just volume

## Quality Indicators

- **Experiment Velocity**: Number of growth experiments completed per month — a learning throughput metric
- **Activation Rate Trend**: Is the percentage of new users reaching the activation milestone improving?
- **D30 Retention Trend**: Is the 30-day retention curve improving across successive acquisition cohorts?
- **LTV:CAC Ratio**: Sustainable unit economics require LTV > 3× CAC; declining ratio is an early warning signal
- **Revenue Growth Rate**: Month-over-month compounding growth in revenue — the ultimate growth metric
- **K-Factor**: Is the viral coefficient moving toward or above 1?
- **North Star Metric Velocity**: Is the NSM accelerating, flat, or decelerating — and can you attribute movement to specific experiments?

## Collaboration Touchpoints

- **With Marketing Analyst**: Growth experimentation requires rigorous statistical analysis; co-own the measurement framework, experiment tracking, and cohort analysis
- **With Conversion Rate Optimizer**: Funnel optimization experiments often sit at the boundary of growth and CRO; share experiment roadmaps to avoid duplication and find compound opportunities
- **With Product Marketing Manager**: Activation and onboarding improvements require product-level changes; growth insights on activation drop-off should inform product roadmap priorities
- **With Demand Generation Manager**: Acquisition-side growth experiments and paid demand gen share budget and audience; coordinate channel tests and CAC optimization efforts
- **With Marketing Strategist**: Growth strategy should ladder up to the overall marketing strategy — align on North Star Metric, target segments, and channel investment priorities

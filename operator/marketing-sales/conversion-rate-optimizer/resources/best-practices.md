# Best Practices: Conversion Rate Optimizer

> Design principles, patterns, and frameworks that guide high-quality conversion rate optimization, A/B testing, and funnel analysis work.

## Design Principles

- **Hypothesis Before Test**: Every experiment must have a clearly stated hypothesis with a predicted direction and mechanism
- **Statistical Rigor Non-Negotiable**: Never call a winner before reaching statistical significance and minimum sample size
- **Test One Variable at a Time**: Multivariate tests require exponentially more traffic; default to A/B for most programs
- **Segment Before Optimizing**: A 2% overall lift might mask a 10% gain for one segment and a 4% loss for another
- **Friction Reduction is the Default Playbook**: Most conversion improvements come from removing barriers, not adding persuasion
- **Qualitative + Quantitative**: Data shows you where the problem is; user research tells you why
- **Small Wins Compound**: A 5% lift here and a 7% lift there compound into significant revenue impact over a year

## Key Patterns & Frameworks

- **CRO Research Stack**: Quantitative analysis (analytics, heatmaps, funnel reports) + qualitative research (session recordings, user interviews, surveys) + UX evaluation (heuristic audit) — triangulate before hypothesizing
- **Hypothesis Template**: "Because we observed [data/insight], we believe that [change] will cause [outcome] for [audience segment], which we'll measure by [metric]"
- **A/B Test Prioritization Matrix**: Score each test by Potential impact × Importance of the page × Ease of implementation (PIE) to sequence the roadmap
- **ICE Framework**: Impact, Confidence, Ease — alternative prioritization scoring for experiment backlog management
- **Landing Page Anatomy**: Headline → Subheadline → Hero image → Value proposition → Social proof → Benefits → CTA — each element has a conversion role
- **LIFT Model**: Value Proposition, Relevance, Clarity, Anxiety, Distraction, Urgency — six conversion factors to evaluate on any page
- **Funnel Drop-Off Analysis**: Visualizing step-by-step conversion rates to identify where the highest-volume loss occurs before running tests
- **Heatmap Analysis Protocol**: Systematically reviewing click maps, scroll maps, and movement maps to find engagement and friction patterns
- **Session Recording Review**: Structured process for watching user sessions to identify rage clicks, dead clicks, and navigation confusion
- **Statistical Significance Calculator Usage**: Sample size planning before test launch to determine how long the test must run — prevents premature calls
- **Post-Test Documentation**: Recording hypothesis, variant designs, results, statistical confidence, segment breakdowns, and learnings for institutional knowledge

## Domain Concepts & Terminology

### Testing
- **A/B Test**: Controlled experiment comparing two versions (control and variant) to determine which produces higher conversion
- **Multivariate Test (MVT)**: Testing multiple variables simultaneously to find optimal combinations; requires much more traffic
- **Split URL Test**: Directing users to two different URLs rather than testing variations on a single page
- **Control**: The original, unchanged version in an experiment — the baseline
- **Variant / Challenger**: The modified version being tested against the control
- **Statistical Significance**: Confidence level (typically 95%) that the observed difference is not due to random chance
- **P-value**: Probability of observing the result if the null hypothesis (no difference) were true; target p < 0.05
- **Confidence Interval**: The range within which the true conversion rate improvement is likely to fall
- **Sample Size**: Minimum number of visitors per variant needed to detect the expected lift with the chosen significance level
- **Novelty Effect**: Temporary lift in the variant caused by user curiosity rather than genuine improvement; often fades after 1–2 weeks

### Funnel & Page Analysis
- **Conversion Rate (CR)**: Percentage of visitors who complete a desired action
- **Micro-Conversion**: A smaller action (email signup, add to cart) that precedes and predicts the primary conversion
- **Drop-Off Rate**: Percentage of users who exit at each step in a multi-step funnel
- **Form Abandonment Rate**: Percentage of users who start but don't complete a form
- **Bounce Rate**: Percentage of single-page sessions — a signal of relevance mismatch or friction on entry
- **Session Recordings**: Playback of individual user sessions showing mouse movement, clicks, and scrolling behavior
- **Heatmaps**: Aggregated visual representations of where users click, scroll, and focus attention on a page

### CRO Tools & Techniques
- **CTA (Call to Action)**: The button, link, or form that triggers the desired conversion action
- **Social Proof**: Testimonials, reviews, case studies, logos, and usage numbers that build trust
- **Value Proposition**: The clear statement of what you offer, who it's for, and why it's better than alternatives
- **Above the Fold**: The page area visible without scrolling — highest-engagement zone that must communicate core value
- **Urgency/Scarcity**: Legitimate time or availability constraints that motivate immediate action

## Anti-Patterns to Avoid

- **Peeking at Results**: Stopping a test early because it "looks like" a winner leads to false positive rates above 50%
- **Ignoring Segment-Level Results**: A test that's flat overall may be a big win for mobile users and a big loss for desktop — always segment
- **Testing Cosmetic Changes First**: Minor color or copy tweaks rarely move conversion enough to matter; test structural and offer-level hypotheses first
- **HiPPO-Driven Testing**: Highest Paid Person's Opinion should not determine the test roadmap; data and user research should
- **Running Too Many Tests Simultaneously**: Overlapping tests pollute each other's results unless properly isolated
- **No Holdout Groups for Personalization**: Without holdout groups, you can't measure the true lift from personalization rules
- **Ignoring Mobile Separately**: Desktop and mobile users have fundamentally different behaviors; test separately or segment results by device

## Quality Indicators

- **Test Velocity**: Number of tests completed per month — a throughput metric for the CRO program
- **Win Rate**: Percentage of tests where the variant outperforms control (typical: 20–30% of well-hypothesized tests win)
- **Average Lift per Win**: Average conversion rate improvement across winning tests
- **Statistical Rigor Score**: Percentage of tests that ran to full sample size before calling a result
- **Hypothesis Documentation Rate**: Percentage of tests with a fully documented hypothesis, not just a design change
- **Revenue Impact Attribution**: Estimated annualized revenue contribution from CRO program wins
- **Funnel Coverage**: What percentage of the identified drop-off points in the funnel have been tested against?

## Collaboration Touchpoints

- **With Growth Marketer**: Share experiment results and roadmap priorities; coordinate on acquisition-side tests that impact landing page performance downstream
- **With Digital Marketing Manager**: Align on which landing pages receive the most paid traffic — those are highest-priority for CRO investment
- **With Marketing Analyst**: Rely on them for funnel analysis, segmentation, and statistical modeling that informs the test roadmap
- **With UX Designer**: Qualitative user research and UX heuristics surface hypotheses that data alone can't generate; co-develop test designs
- **With Copywriter**: Many high-impact tests center on headline, CTA, and value proposition copy — collaborate on variant language before designing the test

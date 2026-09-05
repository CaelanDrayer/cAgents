# Best Practices: Market Research Analyst

> Design principles, patterns, and frameworks that guide high-quality market research, customer insight, and market sizing work.

## Design Principles

- **Question Before Method**: Define the research question and decision it informs before choosing a method — the method serves the question, not the other way around
- **Triangulation**: Combine primary and secondary research, qualitative and quantitative data — conclusions supported by multiple independent sources are defensible conclusions
- **Actionability Over Comprehensiveness**: A 10-page brief with 5 clear recommendations beats a 100-page report with 200 observations and no synthesis
- **Rigor Without Paralysis**: Apply statistical rigor to quantitative work, but don't delay decisions waiting for perfect sample sizes — communicate confidence levels and their implications
- **Separate Discovery from Validation**: Use qualitative research to generate hypotheses, quantitative research to test them — conflating the two produces unreliable findings
- **Represent the Market, Not the Room**: Research findings should reflect the target market, not the loudest voices in sales calls or executive opinions — design sampling to reduce selection bias
- **Insight Has a Shelf Life**: Market conditions evolve; date-stamp findings prominently and flag when key assumptions need refreshing

## Key Patterns & Frameworks

- **Jobs-to-be-Done (JTBD)**: Frame research around the progress customers are trying to make in their lives, not their demographics — reveals the true competitive set and unmet needs
- **TAM/SAM/SOM Market Sizing**: Total Addressable Market (universe of demand), Serviceable Addressable Market (realistic reach), Serviceable Obtainable Market (near-term capture) — always show both top-down and bottom-up estimates
- **Customer Segmentation Model**: Divide the market into groups with distinct needs, behaviors, and willingness to pay; segments should be measurable, substantial, accessible, and actionable
- **Buyer Persona Development**: Synthesize qualitative and quantitative research into 3-5 archetypes representing distinct customer segments — personas are tools for alignment, not decoration
- **Survey Design (Likert + MaxDiff)**: Use Likert scales for attitude measurement, MaxDiff (Best-Worst Scaling) for relative importance ranking — MaxDiff eliminates acquiescence bias that plagues Likert-only surveys
- **Kano Model**: Classify product features as must-haves (threshold), performance features (linear satisfaction), or delighters (excitement) — guides prioritization beyond simple feature ranking
- **Conjoint Analysis**: Decompose customer trade-off preferences by presenting paired or ranked alternatives — quantifies willingness to pay for specific feature combinations
- **Customer Journey Mapping**: Visualize end-to-end customer experience from awareness through renewal, identifying friction points and unmet needs at each stage
- **Net Promoter Score (NPS) Closed-Loop**: Collect NPS, follow up with detractors to diagnose root causes, track change over time — NPS alone without follow-up is a vanity metric
- **Ethnographic Research / Contextual Inquiry**: Observe customers in their natural environment performing the target task — reveals workarounds and pain points customers can't articulate in surveys

## Domain Concepts & Terminology

### Market Sizing
- **TAM (Total Addressable Market)**: The total revenue opportunity if a company captured 100% of the market with no constraints
- **SAM (Serviceable Addressable Market)**: The portion of TAM reachable given the company's current business model and geographic/segment focus
- **SOM (Serviceable Obtainable Market)**: The realistic near-term market share capture, accounting for competition and go-to-market capacity
- **Top-Down Sizing**: Start with total industry revenue (analyst reports, public data) and apply segment filters to arrive at TAM — quick but dependent on source quality
- **Bottom-Up Sizing**: Build from unit economics (# of potential buyers × average contract value) — more credible but requires good estimates of buyer universe

### Research Design
- **Primary Research**: Data collected directly from subjects (surveys, interviews, focus groups, observations) — gives control over questions but requires time and budget
- **Secondary Research**: Analysis of existing data (analyst reports, government data, competitor filings, academic papers) — faster and cheaper but may not answer the specific question
- **Qualitative Research**: Exploratory, non-numerical inquiry (interviews, focus groups, ethnography) to understand motivations, context, and meaning
- **Quantitative Research**: Numerical, statistically analyzable data (surveys, behavioral data, transactional data) to measure prevalence and test hypotheses
- **Sampling Frame**: The list or population from which survey respondents are drawn; a poorly defined sampling frame is the most common source of non-representative findings
- **Sample Size**: The number of respondents needed to detect an effect with a given confidence level and margin of error — calculate before fielding, not after
- **Response Bias**: Systematic distortion of survey results because certain types of people are more likely to respond than others
- **Social Desirability Bias**: Respondents answer to appear favorable rather than honestly — mitigate with anonymous surveys and indirect questioning techniques

### Survey Methodology
- **Likert Scale**: Ordinal rating scale (1-5 or 1-7) measuring agreement or frequency — treat as ordinal, not interval data unless testing confirms interval properties
- **MaxDiff (Best-Worst Scaling)**: Respondents choose best and worst items from subsets — produces interval-level importance scores without acquiescence bias
- **Conjoint Analysis**: Respondents rank or choose between product configurations — decomposes attribute importance and estimates willingness to pay
- **Net Promoter Score (NPS)**: "How likely are you to recommend?" on a 0-10 scale; Promoters (9-10) minus Detractors (0-6) — a relationship health metric, not a feature evaluation tool
- **CSAT (Customer Satisfaction Score)**: Post-interaction satisfaction rating — transactional, not relational; complements NPS
- **Screener Questions**: Filter survey respondents to ensure they meet the target profile before asking substantive questions
- **Cognitive Pretesting**: Test survey questions with 5-10 respondents using think-aloud protocol to catch confusing wording before full launch

### Customer Segmentation
- **Firmographic Segmentation**: B2B segmentation by company attributes (industry, size, revenue, geography)
- **Psychographic Segmentation**: Segmentation by attitudes, values, and motivations — more predictive of behavior than demographics alone
- **Behavioral Segmentation**: Grouping by observed behaviors (purchase frequency, feature usage, engagement) — closest to actual business outcomes
- **Willingness to Pay (WTP)**: The maximum a customer would pay for a product/service — quantify via Van Westendorp, Gabor-Granger, or conjoint methods

## Anti-Patterns to Avoid

- **Leading Questions**: Phrasing survey questions to suggest a desired answer ("How much do you love our new feature?") — introduces response bias that invalidates findings
- **Confirmation Research**: Designing a study to validate a decision already made rather than to genuinely test a hypothesis — stakeholders often want validation; analysts must resist and deliver objectivity
- **HIPPO Validation**: Conducting research primarily to confirm the Highest Paid Person's Opinion — document when research findings contradict stakeholder assumptions and escalate if findings are suppressed
- **Single-Method Mono-Research**: Drawing major strategic conclusions from a single survey or focus group — all methods have limitations; triangulate across methods before making high-stakes recommendations
- **False Precision in Market Sizing**: Stating "the market is $2.347B" based on a chain of assumptions — use ranges with documented assumptions; false precision erodes credibility when assumptions are questioned
- **Persona Proliferation**: Creating 15 buyer personas when 3-4 would serve decision-making — too many personas dilute focus; each persona needs a distinct strategic implication to justify its existence
- **Ignoring Non-Responders**: Treating survey completers as representative of all invitees — low response rates introduce non-response bias; weight results or report confidence intervals accordingly

## Quality Indicators

- **Research Question Clarity**: Every research engagement has a written primary research question and the specific decision it will inform — no question, no engagement
- **Methodology Fitness**: The chosen method is the most efficient way to answer the research question; method selection is documented and justified
- **Sample Representativeness**: Sample demographics / firmographics match the target market profile within acceptable tolerances; deviations are reported
- **Insight-to-Recommendation Ratio**: Every key finding has at least one specific, actionable recommendation — findings without recommendations are observations, not insights
- **Stakeholder Decision Influence**: The percentage of strategic decisions in a quarter that cite market research as an input — tracks whether research is being used
- **Replication Consistency**: Repeated studies on the same question under similar conditions produce results within expected statistical variation — tests for methodological reliability
- **Time-to-Insight**: Calendar days from research brief to final deliverable — measures whether research tempo keeps pace with business decision cycles

## Collaboration Touchpoints

- **With Competitive Intelligence Analyst**: Primary customer research often surfaces competitive insight (why customers chose a competitor, what they value about alternatives) — share bidirectionally to prevent duplicated effort and build a fuller market picture
- **With Product Management**: Customer interviews and usage research should connect directly to the product roadmap; establish a recurring research review cadence so insights don't age out before they're acted on
- **With Marketing Strategy**: Market sizing and segmentation findings directly inform GTM strategy, channel prioritization, and messaging; co-develop persona frameworks to ensure alignment between research segments and marketing execution
- **With Sales / Revenue Leadership**: Win/loss data and buyer persona research should equip sales with a clearer understanding of buyer motivations — translate findings into talk tracks and qualification criteria, not just slide decks

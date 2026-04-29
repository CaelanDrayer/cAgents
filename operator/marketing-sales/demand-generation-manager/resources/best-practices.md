# Best Practices: Demand Generation Manager

> Design principles, patterns, and frameworks that guide high-quality demand generation, pipeline creation, and lead nurture work.

## Design Principles

- **Pipeline Quality Over Lead Volume**: A smaller number of well-qualified MQLs creates more value than a large volume of irrelevant contacts
- **Inbound and Outbound are Complementary**: Best demand gen programs run both in parallel, with inbound building authority and outbound attacking target accounts
- **Nurture is Not Batch-and-Blast**: Effective nurture sequences are triggered by behavior, not scheduled calendar sends
- **Sales and Marketing Alignment is Structural**: MQL definitions, SLAs, and feedback loops must be contractual agreements, not hopes
- **Attribution as Accountability**: If you can't attribute pipeline to programs, you can't justify or optimize budget
- **Always Be Testing**: Every campaign element is a hypothesis — treat demand gen as a continuous experimentation engine
- **Content is the Engine**: Without relevant content at each stage, nurture programs have nothing meaningful to deliver

## Key Patterns & Frameworks

- **Demand Gen Funnel**: Target Universe → Awareness → MQL → SAL (Sales Accepted Lead) → SQL → Opportunity → Closed/Won — define and measure conversion rates at each stage
- **ABM (Account-Based Marketing) Tiers**: Tier 1 (named accounts, 1:1 programs), Tier 2 (select accounts, 1:few programs), Tier 3 (broad target segments, 1:many programs) — different resource investments per tier
- **Lead Scoring Model**: Fit score (firmographic match to ICP) × Behavior score (engagement signals like page visits, content downloads, email clicks) = MQL threshold
- **Intent Data Integration**: Using third-party intent signals (G2, Bombora, 6sense) to identify accounts actively researching solutions in your category
- **Nurture Stream Architecture**: Multiple parallel tracks (new lead onboarding, re-engagement, competitive, industry vertical) with branching logic based on persona and behavior
- **SLA Framework**: Marketing-to-sales SLA defining MQL response time (e.g., < 2 hours for TOFU leads, < 1 hour for BOFU) and feedback mechanism for rejected leads
- **Multi-Touch Attribution Model**: Assigning revenue credit to multiple marketing touchpoints in the buyer journey to see total program contribution
- **Demand Generation Calendar**: Annual planning of programs, events, content launches, and campaigns by quarter, aligned to company revenue targets
- **Pipeline Coverage Model**: Required pipeline value as a multiplier of quota (typically 3–4×) to determine the demand gen targets needed
- **Campaign Velocity Analysis**: Measuring days from first touch to MQL, MQL to SQL, SQL to close — identifying where nurture acceleration can shorten the cycle

## Domain Concepts & Terminology

### Funnel Metrics
- **MQL (Marketing Qualified Lead)**: A lead that meets a defined scoring threshold indicating readiness for sales contact
- **SAL (Sales Accepted Lead)**: An MQL that sales has reviewed and accepted as worth pursuing
- **SQL (Sales Qualified Lead)**: An opportunity where sales has confirmed BANT or equivalent qualification criteria
- **CAC (Customer Acquisition Cost)**: Total sales and marketing spend divided by number of new customers acquired — the cost efficiency metric
- **Pipeline Contribution**: The dollar value of opportunities sourced or influenced by marketing programs
- **Lead Velocity Rate (LVR)**: Month-over-month growth in qualified leads — a leading indicator of future revenue growth

### Lead Generation
- **Gated Content**: Assets (whitepapers, tools, webinars) requiring contact information to access — generates net new leads
- **Intent Data**: Third-party signals showing which companies are actively researching solutions in your category
- **Progressive Profiling**: Collecting additional contact data across multiple form interactions rather than a single long form
- **Lead Enrichment**: Automatically appending firmographic and technographic data to raw lead records
- **Lookalike Modeling**: Using your best customer characteristics to identify and target similar prospects in paid channels

### ABM
- **Target Account List (TAL)**: The defined list of companies that marketing and sales will focus coordinated efforts on
- **Account Tiering**: Segmenting target accounts by strategic importance and investment level (T1/T2/T3)
- **Account Engagement Score**: Aggregate measure of all contacts' engagement activity within a target account
- **Buying Committee**: The group of stakeholders involved in evaluating and approving a purchase at an account
- **Intent Signal**: A behavioral data point indicating that an account is actively researching a problem your product solves

### Nurture
- **Drip Campaign**: Automated email sequence delivered at scheduled intervals, independent of recipient behavior
- **Behavioral Trigger**: An automated email or action triggered by a specific prospect behavior (visited pricing page, downloaded asset)
- **Lead Nurture**: The process of building relationships with prospects who aren't ready to buy yet through relevant content and communication
- **Re-engagement Campaign**: A sequence designed to reactivate dormant leads who have stopped engaging with marketing content

## Anti-Patterns to Avoid

- **Vanity Lead Volume**: Chasing lead volume metrics without qualifying for ICP fit floods sales with low-quality leads and breaks the marketing-sales relationship
- **No MQL Definition Agreement**: When marketing and sales don't agree on what constitutes a qualified lead, rejected MQL rates skyrocket and blame cycles begin
- **Single-Channel Demand Gen**: Over-relying on one channel (e.g., paid search) creates fragility — channel disruptions (algorithm changes, cost spikes) cripple pipeline
- **Nurture as Newsletter**: Sending the same content to all leads regardless of stage, behavior, or persona is not nurture — it's broadcast
- **Ignoring Lead Decay**: Without re-engagement campaigns, lead databases age and decay, inflating apparent list size while reducing deliverable population
- **First-Touch Attribution Only**: Assigning all pipeline credit to the first marketing touch ignores the nurture investment that actually converts prospects
- **Disconnected CRM and MAP**: Marketing automation and CRM that don't sync cleanly create attribution gaps, duplicate records, and broken handoff workflows

## Quality Indicators

- **MQL-to-SQL Conversion Rate**: Healthy benchmark is 20–40%; below 15% indicates lead quality or handoff problems
- **Pipeline Coverage Ratio**: Marketing-sourced pipeline as a multiple of the pipeline target (aim for 2–3× of quota contribution target)
- **Time from MQL to Sales Contact**: Should align with the defined SLA; drift beyond 24 hours indicates process breakdown
- **Marketing-Sourced Pipeline %**: What percentage of total company pipeline was first-touched or influenced by marketing programs?
- **Cost Per MQL by Channel**: Relative efficiency of each demand gen channel — drives budget allocation optimization
- **Nurture Email Engagement Rate**: Open and click rates within active nurture sequences; declining rates signal content relevance issues
- **Intent Data Activation Rate**: What percentage of accounts showing strong intent signals are receiving targeted outreach within 48 hours?

## Collaboration Touchpoints

- **With Sales Development Rep**: SDRs are the primary consumer of MQLs; weekly feedback on lead quality, ICP fit, and conversion rates is essential for scoring model calibration
- **With Campaign Manager**: Demand gen programs are often the execution layer of broader campaigns — align on messaging, offers, and targeting before launching
- **With Marketing Ops Specialist**: Nurture automation, lead routing, and attribution reporting all live in the marketing tech stack — co-own program configuration and data hygiene
- **With Marketing Analyst**: Pipeline attribution modeling, cohort analysis, and channel efficiency reporting require joint analysis to produce actionable insights
- **With Content Marketing Manager**: Demand gen programs need a constant supply of relevant content for nurture and gated offers — quarterly content planning should be joint
